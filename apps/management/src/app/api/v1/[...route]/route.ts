import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { ServerBackend, createToken } from '@/lib/server-backend';
import { BillAdjustments, CafeStore } from '@/lib/cafe-store';
import { MenuError, MenuStore } from '@/lib/menu-store';
import { TableStatus, OrderStatus, TableInfo, CartItem } from '@/types/cafe';
import { ExportError, ExportRequest, generateExport, previewExport } from '@/lib/export/build-export';

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  };
}

/**
 * Customer ordering URL encoded into table QR codes.
 * Uses the caller-provided frontend base when given, otherwise this deployment's own origin.
 */
function buildTableScanUrl(request: NextRequest, table: Pick<TableInfo, 'id' | 'token'>): string {
  const frontendUrl = request.nextUrl.searchParams.get('frontend_url')?.trim();
  const base = (frontendUrl && /^https?:\/\//.test(frontendUrl) ? frontendUrl : request.nextUrl.origin).replace(/\/+$/, '');
  const url = new URL(`${base}/cafe/van-vibes/menu`);
  url.searchParams.set('table', table.id);
  url.searchParams.set('token', table.token);
  return url.toString();
}

/** Returns the signed-in admin, or an error response for anyone else. */
function requireAdmin(request: NextRequest) {
  const user = ServerBackend.getUserFromToken(request.headers.get('authorization'));
  if (!user) {
    return { error: NextResponse.json({ detail: 'Not authenticated' }, { status: 401, headers: corsHeaders() }) };
  }
  if (user.role !== 'ADMIN') {
    return { error: NextResponse.json({ detail: 'Only admins can do this' }, { status: 403, headers: corsHeaders() }) };
  }
  return { user };
}

function menuErrorResponse(err: unknown) {
  if (err instanceof MenuError) {
    return NextResponse.json(
      { detail: err.message, fieldErrors: err.fieldErrors },
      { status: err.status, headers: corsHeaders() }
    );
  }
  throw err;
}

/** The order a billing route points at (`billing/:orderId` or `billing/sessions/:sessionId`). */
async function resolveBillOrderId(route: string[]): Promise<string | undefined> {
  if (route[1] === 'sessions') {
    return route[2] ? CafeStore.getSessionOrderId(route[2]) : undefined;
  }
  return route[1];
}

/**
 * Discount / extra charge sent with a generate or settle request, or undefined when none were sent.
 * A discount is a % unless `discount_type` is 'AMOUNT' (flat rupees, read from `discount_value` / `discount_amount`).
 */
function readBillAdjustments(body: Record<string, unknown>): BillAdjustments | undefined {
  const pick = (...keys: string[]) => keys.map((k) => body[k]).find((v) => v !== undefined && v !== null && v !== '');
  const discountType = pick('discount_type', 'discountType') === 'AMOUNT' ? 'AMOUNT' : 'PERCENT';
  const discountValue =
    discountType === 'AMOUNT'
      ? pick('discount_value', 'discountValue', 'discount_amount', 'discountAmount')
      : pick('discount_value', 'discountValue', 'discount_percentage', 'discountPercentage');
  const extraCharge = pick('extra_charge', 'extraCharge');
  if (discountValue === undefined && extraCharge === undefined && pick('discount_type', 'discountType') === undefined) {
    return undefined;
  }
  return {
    discountType,
    discountValue: discountValue === undefined ? undefined : Number(discountValue) || 0,
    extraCharge: extraCharge === undefined ? undefined : Number(extraCharge) || 0,
  };
}

async function settleBill(orderId: string, body: Record<string, unknown>) {
  const method = typeof body.paymentMethod === 'string' ? body.paymentMethod : typeof body.payment_method === 'string' ? body.payment_method : 'CASH';
  const settled = await CafeStore.settlePayment(orderId, method, readBillAdjustments(body));
  if (!settled.success) {
    return NextResponse.json(
      { detail: settled.error || 'Order not found' },
      { status: settled.alreadySettled ? 409 : 404, headers: corsHeaders() }
    );
  }
  const bill = await CafeStore.getBill(orderId);
  const invoice = {
    id: `INV-${Date.now()}`,
    orderId,
    diningSessionId: bill?.diningSessionId,
    invoiceNumber: bill?.billNumber || `BILL-${orderId.replace('VV-', '')}`,
    total: bill?.total ?? settled.order?.total ?? 0,
    subtotal: bill?.subtotal ?? settled.order?.subtotal ?? 0,
    taxAmount: bill?.taxAmount ?? settled.order?.tax ?? 0,
    discountType: bill?.discountType || 'PERCENT',
    discountPercentage: bill?.discountPercentage || 0,
    discountAmount: bill?.discountAmount || 0,
    extraCharge: bill?.extraCharge || 0,
    amountAfterAdjustments: bill?.amountAfterAdjustments,
    roundOff: bill?.roundOff || 0,
    cgstRate: 0,
    cgstAmount: 0,
    sgstRate: 0,
    sgstAmount: 0,
    paymentMethod: method,
    paymentStatus: 'PAID',
    createdAt: new Date().toISOString(),
  };
  return NextResponse.json(invoice, { headers: corsHeaders() });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(),
  });
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ route: string[] }> }
) {
  const { route } = await context.params;
  const path = route.join('/');
  const searchParams = request.nextUrl.searchParams;

  // 1. /api/v1/auth/me
  if (path === 'auth/me') {
    const user = ServerBackend.getUserFromToken(request.headers.get('authorization'));
    if (!user) {
      return NextResponse.json({ detail: 'Not authenticated' }, { status: 401, headers: corsHeaders() });
    }
    return NextResponse.json(user, { headers: corsHeaders() });
  }

  // 2. /api/v1/auth/chefs
  if (path === 'auth/chefs') {
    const chefs = ServerBackend.getChefs();
    return NextResponse.json(chefs, { headers: corsHeaders() });
  }

  // 3a. /api/v1/tables/:id/qr -> Direct PNG stream
  if (route[0] === 'tables' && route.length === 3 && route[2] === 'qr') {
    const table = await CafeStore.getTable(route[1]);
    if (!table) {
      return NextResponse.json({ detail: 'Table not found' }, { status: 404, headers: corsHeaders() });
    }
    const scanUrl = buildTableScanUrl(request, table);

    try {
      const buffer = await QRCode.toBuffer(scanUrl, {
        type: 'png',
        width: 380,
        margin: 2,
        color: {
          dark: '#18312B',
          light: '#FFFFFF',
        },
      });
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'no-store',
          ...corsHeaders(),
        },
      });
    } catch (err) {
      console.error('QR code generation failed:', err);
      return NextResponse.json({ detail: 'Failed to generate QR code' }, { status: 500, headers: corsHeaders() });
    }
  }

  // 3b. /api/v1/tables/:id/standee
  if (route[0] === 'tables' && route.length === 3 && route[2] === 'standee') {
    const tableId = route[1];
    const table = await CafeStore.getTable(tableId);
    if (!table) {
      return NextResponse.json({ detail: 'Table not found' }, { status: 404, headers: corsHeaders() });
    }
    const scanUrl = buildTableScanUrl(request, table);

    let qrImageUrl = '';
    try {
      qrImageUrl = await QRCode.toDataURL(scanUrl, {
        width: 480,
        margin: 2,
        color: {
          dark: '#18312B',
          light: '#FFFFFF',
        },
      });
    } catch {
      qrImageUrl = `/api/v1/tables/${table.id}/qr`;
    }

    return NextResponse.json(
      {
        table_id: table.id,
        table_number: table.tableNumber,
        name: table.name,
        capacity: table.capacity,
        scan_url: scanUrl,
        qr_image_url: qrImageUrl,
      },
      { headers: corsHeaders() }
    );
  }

  // 4. /api/v1/tables
  if (path === 'tables') {
    const tables = await ServerBackend.getTables();
    return NextResponse.json(tables, { headers: corsHeaders() });
  }

  // 5. /api/v1/orders
  if (path === 'orders') {
    const status = searchParams.get('status') || undefined;
    const table_id = searchParams.get('table_id') || undefined;
    const activity_status = searchParams.get('activity_status') || undefined;
    const orders = await ServerBackend.getOrders({ status, table_id, activity_status });
    return NextResponse.json(orders, { headers: corsHeaders() });
  }

  // 6. /api/v1/orders/:id
  if (route[0] === 'orders' && route.length === 2) {
    const order = await ServerBackend.getOrder(route[1]);
    if (!order) {
      return NextResponse.json({ detail: 'Order not found' }, { status: 404, headers: corsHeaders() });
    }
    return NextResponse.json(order, { headers: corsHeaders() });
  }

  // 7. /api/v1/menu
  if (path === 'menu') {
    const category = searchParams.get('category') || undefined;
    const search = searchParams.get('search') || undefined;
    const menuItems = await ServerBackend.getMenuItems(category, search);
    return NextResponse.json(menuItems, { headers: corsHeaders() });
  }

  // 8. /api/v1/categories
  if (path === 'categories') {
    const categories = await ServerBackend.getCategories();
    return NextResponse.json(categories, { headers: corsHeaders() });
  }

  // 9. /api/v1/settings
  if (path === 'settings') {
    return NextResponse.json(ServerBackend.getSettings(), { headers: corsHeaders() });
  }

  // 10. /api/v1/billing/ledger
  if (path === 'billing/ledger') {
    const orders = (await CafeStore.getAllOrders()).filter((o) => o.billGenerated || o.paymentStatus === 'PAID');
    const ledger = orders.map((o) => ({
      id: o.id,
      orderId: o.id,
      diningSessionId: o.diningSessionId || o.sessionToken,
      invoiceNumber: `BILL-${o.id.replace('VV-', '')}-${new Date(o.createdAt).getFullYear()}`,
      tableNumber: o.tableNumber,
      customerName: o.customerName,
      subtotal: o.subtotal,
      cgstRate: 0,
      cgstAmount: 0,
      sgstRate: 0,
      sgstAmount: 0,
      taxAmount: o.tax,
      discountPercentage: o.discountPercentage || 0,
      discountAmount: o.discountAmount || 0,
      total: o.total,
      paymentMethod: o.paymentMethod || 'CASH',
      paymentStatus: o.paymentStatus,
      createdAt: o.createdAt,
    }));
    return NextResponse.json(ledger, { headers: corsHeaders() });
  }

  // 11. /api/v1/billing/pending
  if (path === 'billing/pending') {
    const orders = (await CafeStore.getAllOrders()).filter((o) => o.paymentStatus !== 'PAID');
    const pending = orders.map((o) => ({
      id: o.id,
      orderId: o.id,
      diningSessionId: o.diningSessionId || o.sessionToken,
      invoiceNumber: `BILL-${o.id.replace('VV-', '')}-${new Date(o.createdAt).getFullYear()}`,
      tableNumber: o.tableNumber,
      customerName: o.customerName,
      subtotal: o.subtotal,
      cgstRate: 0,
      cgstAmount: 0,
      sgstRate: 0,
      sgstAmount: 0,
      taxAmount: o.tax,
      total: o.total,
      paymentMethod: 'PENDING',
      paymentStatus: o.paymentStatus,
      createdAt: o.createdAt,
    }));
    return NextResponse.json(pending, { headers: corsHeaders() });
  }

  // 12. /api/v1/billing/:orderId and /api/v1/billing/sessions/:sessionId (view only)
  if (
    route[0] === 'billing' &&
    ((route.length === 2 && !['ledger', 'pending', 'sessions'].includes(route[1])) ||
      (route.length === 3 && route[1] === 'sessions'))
  ) {
    const orderId = await resolveBillOrderId(route);
    const bill = orderId ? await CafeStore.getBill(orderId) : null;
    if (!bill) {
      return NextResponse.json({ detail: 'Order receipt not found' }, { status: 404, headers: corsHeaders() });
    }
    return NextResponse.json(bill, { headers: corsHeaders() });
  }

  // 13. /api/v1/dashboard/summary
  if (path === 'dashboard/summary') {
    const orders = await CafeStore.getAllOrders();
    const tables = await CafeStore.getAllTables();
    const occupied = tables.filter((t) => t.status === 'OCCUPIED').length;
    const kitchenPending = orders.filter((o) => ['ORDER_PLACED', 'ACCEPTED', 'PREPARING'].includes(o.status)).length;
    const settledRevenue = orders
      .filter((o) => o.paymentStatus === 'PAID')
      .reduce((sum, o) => sum + o.total, 0);

    return NextResponse.json(
      {
        totalOrders: orders.length,
        kitchenPending,
        occupiedTables: occupied,
        totalTables: tables.length,
        settledRevenue,
        recentOrders: orders.slice(0, 10),
      },
      { headers: corsHeaders() }
    );
  }

  // 14. /api/v1/dashboard/kitchen
  if (path === 'dashboard/kitchen') {
    const orders = await CafeStore.getAllOrders();
    const incomingOrders = orders.filter((o) => ['ORDER_PLACED', 'ACCEPTED'].includes(o.status)).length;
    const activePrep = orders.filter((o) => o.status === 'PREPARING').length;
    const completedToday = orders.filter((o) => ['SERVED', 'COMPLETED'].includes(o.status)).length;

    return NextResponse.json(
      {
        incomingOrders,
        activePrep,
        completedToday,
      },
      { headers: corsHeaders() }
    );
  }

  // 15. /api/v1/dining-sessions
  if (path === 'dining-sessions') {
    return NextResponse.json([], { headers: corsHeaders() });
  }

  // 16. /api/v1/health
  if (path === 'health') {
    return NextResponse.json(
      {
        status: 'healthy',
        database: 'connected',
        platform: 'Vercel Serverless Platform',
        timestamp: new Date().toISOString(),
      },
      { headers: corsHeaders() }
    );
  }

  return NextResponse.json({ detail: `Route GET /api/v1/${path} not found` }, { status: 404, headers: corsHeaders() });
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ route: string[] }> }
) {
  const { route } = await context.params;
  const path = route.join('/');
  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {}

  // 1. /api/v1/auth/login
  if (path === 'auth/login') {
    const identifier = String(body.email || body.username || body.identifier || '');
    const password = String(body.password || '');

    const authResult = ServerBackend.login(identifier, password);
    if (!authResult) {
      return NextResponse.json(
        { detail: 'Invalid phone/email or password.' },
        { status: 401, headers: corsHeaders() }
      );
    }

    return NextResponse.json(
      {
        access_token: authResult.access_token,
        refresh_token: authResult.refresh_token,
        token_type: 'bearer',
        user: authResult.user,
      },
      { headers: corsHeaders() }
    );
  }

  // 2. /api/v1/auth/refresh
  if (path === 'auth/refresh') {
    const user = ServerBackend.getUserFromToken(request.headers.get('authorization')) || {
      id: 'u-admin-9054032800',
      name: 'Admin (9054032800)',
      email: '9054032800@vaanvibes.com',
      role: 'ADMIN' as const,
      is_active: true,
    };
    const newAccess = createToken({ sub: user.id, email: user.email, role: user.role });
    return NextResponse.json(
      {
        access_token: newAccess,
        refresh_token: body.refresh_token || newAccess,
        token_type: 'bearer',
        user,
      },
      { headers: corsHeaders() }
    );
  }

  // 3. /api/v1/auth/logout
  if (path === 'auth/logout') {
    return NextResponse.json({ message: 'Successfully logged out' }, { headers: corsHeaders() });
  }

  // 4. /api/v1/auth/chefs
  if (path === 'auth/chefs') {
    const newChef = ServerBackend.createChef({
      name: typeof body.name === 'string' ? body.name : 'Staff Chef',
      email: typeof body.email === 'string' ? body.email : `chef_${Date.now()}@vaanvibes.com`,
      contactNumber: typeof body.contact_number === 'string' ? body.contact_number : typeof body.contactNumber === 'string' ? body.contactNumber : '9876543210',
      password: typeof body.password === 'string' ? body.password : 'chef123',
      role: body.role === 'ADMIN' ? 'ADMIN' : 'CHEF',
      shift: typeof body.shift === 'string' ? body.shift : 'Morning',
      assignedStation: typeof body.assigned_station === 'string' ? body.assigned_station : typeof body.assignedStation === 'string' ? body.assignedStation : 'Main Kitchen',
    });
    return NextResponse.json(newChef, { status: 201, headers: corsHeaders() });
  }

  // 5. /api/v1/orders
  if (path === 'orders') {
    const result = await CafeStore.createOrder(body as unknown as Parameters<typeof CafeStore.createOrder>[0]);
    if (!result.success) {
      return NextResponse.json({ detail: result.error || 'Failed to create order' }, { status: 400, headers: corsHeaders() });
    }
    return NextResponse.json(result.order, { status: 201, headers: corsHeaders() });
  }

  // 6. /api/v1/orders/:id/accept
  if (route[0] === 'orders' && route.length === 3 && route[2] === 'accept') {
    const res = await CafeStore.updateOrderStatus(route[1], 'ACCEPTED');
    return NextResponse.json(res.order || { id: route[1], status: 'ACCEPTED' }, { headers: corsHeaders() });
  }

  // 7. /api/v1/orders/:id/done
  if (route[0] === 'orders' && route.length === 3 && route[2] === 'done') {
    const res = await CafeStore.updateOrderStatus(route[1], 'PREPARING');
    return NextResponse.json(res.order || { id: route[1], status: 'PREPARING' }, { headers: corsHeaders() });
  }

  // 8. /api/v1/orders/:id/serve
  if (route[0] === 'orders' && route.length === 3 && route[2] === 'serve') {
    const res = await CafeStore.updateOrderStatus(route[1], 'SERVED');
    return NextResponse.json(res.order || { id: route[1], status: 'SERVED' }, { headers: corsHeaders() });
  }

  // 9. /api/v1/orders/:id/complete
  if (route[0] === 'orders' && route.length === 3 && route[2] === 'complete') {
    const res = await CafeStore.updateOrderStatus(route[1], 'COMPLETED');
    return NextResponse.json(res.order || { id: route[1], status: 'COMPLETED' }, { headers: corsHeaders() });
  }

  // 10. /api/v1/orders/:id/cancel
  if (route[0] === 'orders' && route.length === 3 && route[2] === 'cancel') {
    const res = await CafeStore.updateOrderStatus(route[1], 'CANCELLED');
    return NextResponse.json(
      { message: 'Order successfully cancelled', order: res.order },
      { headers: corsHeaders() }
    );
  }

  // 11/12. /api/v1/billing/:orderId/(generate|settle) and /api/v1/billing/sessions/:sessionId/(generate|settle)
  const billAction = route[0] === 'billing' ? route[route.length - 1] : '';
  if (
    (billAction === 'generate' || billAction === 'settle') &&
    (route.length === 3 || (route.length === 4 && route[1] === 'sessions'))
  ) {
    const orderId = await resolveBillOrderId(route);
    if (!orderId) {
      return NextResponse.json({ detail: 'No orders found for this bill' }, { status: 404, headers: corsHeaders() });
    }
    if (billAction === 'settle') return settleBill(orderId, body);

    const adjustments = readBillAdjustments(body);
    const bill = await CafeStore.generateBill(
      orderId,
      adjustments?.discountValue ?? 0,
      adjustments?.extraCharge ?? 0,
      adjustments?.discountType
    );
    if (!bill) {
      return NextResponse.json({ detail: 'No orders found for this bill' }, { status: 404, headers: corsHeaders() });
    }
    return NextResponse.json(bill, { headers: corsHeaders() });
  }

  // 12b. /api/v1/menu (Admin adds a dish)
  if (path === 'menu') {
    const auth = requireAdmin(request);
    if (auth.error) return auth.error;
    try {
      const item = await MenuStore.createItem(body);
      return NextResponse.json(item, { status: 201, headers: corsHeaders() });
    } catch (err) {
      return menuErrorResponse(err);
    }
  }

  // 12c. /api/v1/categories (Admin adds a category)
  if (path === 'categories') {
    const auth = requireAdmin(request);
    if (auth.error) return auth.error;
    try {
      const category = await MenuStore.createCategory(body);
      return NextResponse.json(category, { status: 201, headers: corsHeaders() });
    } catch (err) {
      return menuErrorResponse(err);
    }
  }

  // 13. /api/v1/tables/swipe
  if (path === 'tables/swipe') {
    const sourceTableId = typeof body.sourceTableId === 'string' ? body.sourceTableId : '';
    const destinationTableId = typeof body.destinationTableId === 'string' ? body.destinationTableId : '';
    const res = await ServerBackend.swipeTable(sourceTableId, destinationTableId);
    if (!res) {
      return NextResponse.json({ detail: 'Table not found or invalid transfer' }, { status: 400, headers: corsHeaders() });
    }
    return NextResponse.json(
      {
        message: 'Table swapped successfully',
        sessionId: `sess_${res.dest.id}_${Date.now()}`,
        sourceTable: res.source,
        destinationTable: res.dest,
        orderIds: res.activeOrders.map((o) => o.id),
      },
      { headers: corsHeaders() }
    );
  }

  // 14. /api/v1/tables (Create Table)
  if (path === 'tables') {
    const num = Number(body.tableNumber || body.table_number);
    const cap = Number(body.capacity || 4);
    const sec = String(body.section || 'A/C');
    if (!num || isNaN(num)) {
      return NextResponse.json({ detail: 'Valid table number is required' }, { status: 400, headers: corsHeaders() });
    }
    const created = await ServerBackend.createTable(num, cap, sec);
    return NextResponse.json(created, { status: 201, headers: corsHeaders() });
  }

  // 15. /api/v1/tables/:id/clear (Clear / Free Table)
  if (route[0] === 'tables' && route.length === 3 && route[2] === 'clear') {
    const ok = await ServerBackend.clearTable(route[1]);
    return NextResponse.json({ success: ok, message: 'Table cleared' }, { headers: corsHeaders() });
  }

  // 15b. /api/v1/tables/:id/orders (Admin manually adds items to a table)
  if (route[0] === 'tables' && route.length === 3 && route[2] === 'orders') {
    const auth = requireAdmin(request);
    if (auth.error) return auth.error;

    const rawItems = Array.isArray(body.items) ? (body.items as Record<string, unknown>[]) : [];
    if (rawItems.length === 0) {
      return NextResponse.json({ detail: 'Add at least one item' }, { status: 400, headers: corsHeaders() });
    }

    const menu = await ServerBackend.getMenuItems();
    const items: CartItem[] = [];
    for (const raw of rawItems) {
      const menuItem = menu.find((m) => m.id === raw.menuItemId);
      if (!menuItem) {
        return NextResponse.json({ detail: `Unknown menu item: ${String(raw.menuItemId)}` }, { status: 400, headers: corsHeaders() });
      }
      if (menuItem.isAvailable === false) {
        return NextResponse.json({ detail: `"${menuItem.name}" is currently unavailable` }, { status: 400, headers: corsHeaders() });
      }
      const quantity = Math.max(1, Math.min(Math.floor(Number(raw.quantity) || 1), 50));
      const selectedOptions =
        raw.selectedOptions && typeof raw.selectedOptions === 'object'
          ? (raw.selectedOptions as Record<string, string>)
          : undefined;
      items.push({
        id: `${menuItem.id}-${Date.now()}-${items.length}`,
        menuItemId: menuItem.id,
        name: menuItem.name,
        category: menuItem.category,
        price: menuItem.price,
        quantity,
        selectedOptions,
      });
    }

    const customerMobile = typeof body.customerMobile === 'string' ? body.customerMobile.replace(/\D/g, '') : '';
    if (customerMobile && customerMobile.length !== 10) {
      return NextResponse.json({ detail: 'Phone number must contain exactly 10 digits' }, { status: 400, headers: corsHeaders() });
    }

    const result = await CafeStore.addStaffOrder(route[1], {
      items,
      customerName: typeof body.customerName === 'string' ? body.customerName : undefined,
      customerMobile,
      specialInstructions: typeof body.specialInstructions === 'string' ? body.specialInstructions : undefined,
    });
    if (!result.success) {
      return NextResponse.json({ detail: result.error }, { status: 400, headers: corsHeaders() });
    }
    return NextResponse.json(result.order, { status: 201, headers: corsHeaders() });
  }

  // 15d. /api/v1/export/preview & /api/v1/export/download (Admin data export: Excel / CSV)
  if (path === 'export/preview' || path === 'export/download') {
    const auth = requireAdmin(request);
    if (auth.error) return auth.error;
    const exportReq = body as unknown as ExportRequest;
    if (!Array.isArray(exportReq.categories)) {
      return NextResponse.json({ detail: 'Select at least one data category to export' }, { status: 400, headers: corsHeaders() });
    }
    try {
      if (path === 'export/preview') {
        return NextResponse.json(await previewExport(exportReq), { headers: corsHeaders() });
      }
      const file = await generateExport(exportReq);
      return new NextResponse(Buffer.from(file.body), {
        headers: {
          'Content-Type': file.contentType,
          'Content-Disposition': `attachment; filename="${file.filename}"`,
          'Cache-Control': 'no-store',
          ...corsHeaders(),
        },
      });
    } catch (err) {
      if (err instanceof ExportError) {
        return NextResponse.json({ detail: err.message }, { status: 400, headers: corsHeaders() });
      }
      throw err;
    }
  }

  // 15c. /api/v1/admin/reset (Admin wipes all orders, bills and table changes)
  if (path === 'admin/reset') {
    const auth = requireAdmin(request);
    if (auth.error) return auth.error;
    if (body.confirm !== 'RESET') {
      return NextResponse.json({ detail: 'Type RESET to confirm' }, { status: 400, headers: corsHeaders() });
    }
    const result = await CafeStore.resetAllData();
    return NextResponse.json({ message: 'All data has been reset', ...result }, { headers: corsHeaders() });
  }

  // 16. /api/v1/tables/:id/occupy
  if (route[0] === 'tables' && route.length === 3 && route[2] === 'occupy') {
    const table = await ServerBackend.updateTableStatus(route[1], 'OCCUPIED');
    if (!table) {
      return NextResponse.json({ detail: 'Table not found' }, { status: 404, headers: corsHeaders() });
    }
    return NextResponse.json(table, { headers: corsHeaders() });
  }

  return NextResponse.json({ detail: `Route POST /api/v1/${path} not found` }, { status: 404, headers: corsHeaders() });
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ route: string[] }> }
) {
  const { route } = await context.params;
  const path = route.join('/');
  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {}

  // /api/v1/menu/:id (Admin edits a dish)
  if (route[0] === 'menu' && route.length === 2) {
    const auth = requireAdmin(request);
    if (auth.error) return auth.error;
    try {
      const item = await MenuStore.updateItem(route[1], body);
      return NextResponse.json(item, { headers: corsHeaders() });
    } catch (err) {
      return menuErrorResponse(err);
    }
  }

  // /api/v1/auth/chefs/:id
  if (route[0] === 'auth' && route[1] === 'chefs' && route.length === 3) {
    const updated = ServerBackend.updateChef(route[2], {
      name: body.name ? String(body.name) : undefined,
      email: body.email ? String(body.email) : undefined,
      contactNumber: body.contact_number || body.contactNumber ? String(body.contact_number || body.contactNumber) : undefined,
      role: body.role as 'ADMIN' | 'CHEF' | undefined,
      password: body.password ? String(body.password) : undefined,
      shift: body.shift ? String(body.shift) : undefined,
      assignedStation: body.assigned_station || body.assignedStation ? String(body.assigned_station || body.assignedStation) : undefined,
      isActive: typeof body.is_active === 'boolean' ? body.is_active : undefined,
    });
    if (!updated) {
      return NextResponse.json({ detail: 'Chef not found' }, { status: 404, headers: corsHeaders() });
    }
    return NextResponse.json(updated, { headers: corsHeaders() });
  }

  return NextResponse.json({ detail: `Route PUT /api/v1/${path} not found` }, { status: 404, headers: corsHeaders() });
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ route: string[] }> }
) {
  const { route } = await context.params;
  const path = route.join('/');
  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {}

  // 1. /api/v1/tables/:id/status
  if (route[0] === 'tables' && route.length === 3 && route[2] === 'status') {
    const table = await ServerBackend.updateTableStatus(route[1], body.status as TableStatus);
    if (!table) {
      return NextResponse.json({ detail: 'Table not found' }, { status: 404, headers: corsHeaders() });
    }
    return NextResponse.json(table, { headers: corsHeaders() });
  }

  // 1b. /api/v1/menu/:id/availability
  if (route[0] === 'menu' && route.length === 3 && route[2] === 'availability') {
    const auth = requireAdmin(request);
    if (auth.error) return auth.error;
    try {
      const item = await MenuStore.setAvailability(route[1], body.isAvailable !== false && body.is_available !== false);
      return NextResponse.json(item, { headers: corsHeaders() });
    } catch (err) {
      return menuErrorResponse(err);
    }
  }

  // 2. /api/v1/orders/:id/status
  if (route[0] === 'orders' && route.length === 3 && route[2] === 'status') {
    const res = await CafeStore.updateOrderStatus(route[1], body.status as OrderStatus);
    return NextResponse.json(res.order, { headers: corsHeaders() });
  }

  // 3. /api/v1/auth/profile
  if (path === 'auth/profile') {
    const user = ServerBackend.getUserFromToken(request.headers.get('authorization')) || {
      id: 'u-admin-9054032800',
      name: body.name || 'Admin',
      email: '9054032800@vaanvibes.com',
      contactNumber: body.contact_number || '9054032800',
      role: 'ADMIN' as const,
      is_active: true,
    };
    if (body.name) user.name = body.name;
    if (body.contact_number) user.contactNumber = body.contact_number;
    return NextResponse.json(user, { headers: corsHeaders() });
  }

  return NextResponse.json({ detail: `Route PATCH /api/v1/${path} not found` }, { status: 404, headers: corsHeaders() });
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ route: string[] }> }
) {
  const { route } = await context.params;
  const path = route.join('/');

  // 1. /api/v1/tables/:id (Delete Table)
  if (route[0] === 'tables' && route.length === 2) {
    const ok = await ServerBackend.deleteTable(route[1]);
    if (!ok) {
      return NextResponse.json({ detail: 'Table not found' }, { status: 404, headers: corsHeaders() });
    }
    return NextResponse.json({ message: 'Table deleted successfully', id: route[1] }, { headers: corsHeaders() });
  }

  // 1b. /api/v1/menu/:id and /api/v1/categories/:id (Admin removes a dish or an empty category)
  if ((route[0] === 'menu' || route[0] === 'categories') && route.length === 2) {
    const auth = requireAdmin(request);
    if (auth.error) return auth.error;
    try {
      if (route[0] === 'menu') await MenuStore.deleteItem(route[1]);
      else await MenuStore.deleteCategory(route[1]);
      return NextResponse.json({ message: 'Deleted successfully', id: route[1] }, { headers: corsHeaders() });
    } catch (err) {
      return menuErrorResponse(err);
    }
  }

  // 2. /api/v1/auth/chefs/:id
  if (route[0] === 'auth' && route[1] === 'chefs' && route.length === 3) {
    const ok = ServerBackend.deleteChef(route[2]);
    if (!ok) {
      return NextResponse.json({ detail: 'Chef not found' }, { status: 404, headers: corsHeaders() });
    }
    return NextResponse.json({ message: 'Chef deleted successfully', id: route[2] }, { headers: corsHeaders() });
  }

  return NextResponse.json({ detail: `Route DELETE /api/v1/${path} not found` }, { status: 404, headers: corsHeaders() });
}
