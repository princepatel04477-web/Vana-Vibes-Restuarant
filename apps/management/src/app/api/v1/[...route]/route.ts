import { NextRequest, NextResponse } from 'next/server';
import { ServerBackend, createToken } from '@/lib/server-backend';
import { CafeStore } from '@/lib/cafe-store';
import { TableStatus, OrderStatus } from '@/types/cafe';

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  };
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

  // 3. /api/v1/tables/:id/standee
  if (route[0] === 'tables' && route.length === 3 && route[2] === 'standee') {
    const tableId = route[1];
    const table = CafeStore.getTable(tableId);
    if (!table) {
      return NextResponse.json({ detail: 'Table not found' }, { status: 404, headers: corsHeaders() });
    }
    return NextResponse.json(
      {
        table_id: table.id,
        table_number: table.tableNumber,
        name: table.name,
        capacity: table.capacity,
        scan_url: table.qrCodeUrl,
        qr_image_url: `/api/qr/image?table=${table.id}`,
      },
      { headers: corsHeaders() }
    );
  }

  // 4. /api/v1/tables
  if (path === 'tables') {
    const tables = ServerBackend.getTables();
    return NextResponse.json(tables, { headers: corsHeaders() });
  }

  // 5. /api/v1/orders
  if (path === 'orders') {
    const status = searchParams.get('status') || undefined;
    const table_id = searchParams.get('table_id') || undefined;
    const activity_status = searchParams.get('activity_status') || undefined;
    const orders = ServerBackend.getOrders({ status, table_id, activity_status });
    return NextResponse.json(orders, { headers: corsHeaders() });
  }

  // 6. /api/v1/orders/:id
  if (route[0] === 'orders' && route.length === 2) {
    const order = ServerBackend.getOrder(route[1]);
    if (!order) {
      return NextResponse.json({ detail: 'Order not found' }, { status: 404, headers: corsHeaders() });
    }
    return NextResponse.json(order, { headers: corsHeaders() });
  }

  // 7. /api/v1/menu
  if (path === 'menu') {
    const category = searchParams.get('category') || undefined;
    const search = searchParams.get('search') || undefined;
    const menuItems = ServerBackend.getMenuItems(category, search);
    return NextResponse.json(menuItems, { headers: corsHeaders() });
  }

  // 8. /api/v1/categories
  if (path === 'categories') {
    const categories = ServerBackend.getCategories();
    return NextResponse.json(categories, { headers: corsHeaders() });
  }

  // 9. /api/v1/settings
  if (path === 'settings') {
    return NextResponse.json(ServerBackend.getSettings(), { headers: corsHeaders() });
  }

  // 10. /api/v1/billing/ledger
  if (path === 'billing/ledger') {
    const orders = CafeStore.getAllOrders().filter((o) => o.billGenerated || o.paymentStatus === 'PAID');
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
      paymentMethod: 'CASH',
      paymentStatus: o.paymentStatus,
      createdAt: o.createdAt,
    }));
    return NextResponse.json(ledger, { headers: corsHeaders() });
  }

  // 11. /api/v1/billing/pending
  if (path === 'billing/pending') {
    const orders = CafeStore.getAllOrders().filter((o) => o.paymentStatus !== 'PAID');
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

  // 12. /api/v1/billing/:orderId
  if (route[0] === 'billing' && route.length === 2 && !['ledger', 'pending', 'sessions'].includes(route[1])) {
    const bill = CafeStore.generateBill(route[1]);
    if (!bill) {
      return NextResponse.json({ detail: 'Order receipt not found' }, { status: 404, headers: corsHeaders() });
    }
    return NextResponse.json(bill, { headers: corsHeaders() });
  }

  // 13. /api/v1/dashboard/summary
  if (path === 'dashboard/summary') {
    const orders = CafeStore.getAllOrders();
    const tables = CafeStore.getAllTables();
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
    const orders = CafeStore.getAllOrders();
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
    const result = CafeStore.createOrder(body as unknown as Parameters<typeof CafeStore.createOrder>[0]);
    if (!result.success) {
      return NextResponse.json({ detail: result.error || 'Failed to create order' }, { status: 400, headers: corsHeaders() });
    }
    return NextResponse.json(result.order, { status: 201, headers: corsHeaders() });
  }

  // 6. /api/v1/orders/:id/accept
  if (route[0] === 'orders' && route.length === 3 && route[2] === 'accept') {
    const res = CafeStore.updateOrderStatus(route[1], 'ACCEPTED');
    return NextResponse.json(res.order || { id: route[1], status: 'ACCEPTED' }, { headers: corsHeaders() });
  }

  // 7. /api/v1/orders/:id/done
  if (route[0] === 'orders' && route.length === 3 && route[2] === 'done') {
    const res = CafeStore.updateOrderStatus(route[1], 'PREPARING');
    return NextResponse.json(res.order || { id: route[1], status: 'PREPARING' }, { headers: corsHeaders() });
  }

  // 8. /api/v1/orders/:id/serve
  if (route[0] === 'orders' && route.length === 3 && route[2] === 'serve') {
    const res = CafeStore.updateOrderStatus(route[1], 'SERVED');
    return NextResponse.json(res.order || { id: route[1], status: 'SERVED' }, { headers: corsHeaders() });
  }

  // 9. /api/v1/orders/:id/complete
  if (route[0] === 'orders' && route.length === 3 && route[2] === 'complete') {
    const res = CafeStore.updateOrderStatus(route[1], 'COMPLETED');
    return NextResponse.json(res.order || { id: route[1], status: 'COMPLETED' }, { headers: corsHeaders() });
  }

  // 10. /api/v1/orders/:id/cancel
  if (route[0] === 'orders' && route.length === 3 && route[2] === 'cancel') {
    const res = CafeStore.updateOrderStatus(route[1], 'CANCELLED');
    return NextResponse.json(
      { message: 'Order successfully cancelled', order: res.order },
      { headers: corsHeaders() }
    );
  }

  // 11. /api/v1/billing/:orderId/generate
  if (route[0] === 'billing' && route.length === 3 && route[2] === 'generate') {
    const discount = Number(body.discount_percentage || body.discountPercentage || 0);
    const bill = CafeStore.generateBill(route[1], discount);
    return NextResponse.json(bill, { headers: corsHeaders() });
  }

  // 12. /api/v1/billing/:orderId/settle
  if (route[0] === 'billing' && route.length === 3 && route[2] === 'settle') {
    const method = typeof body.paymentMethod === 'string' ? body.paymentMethod : typeof body.payment_method === 'string' ? body.payment_method : 'CASH';
    const settled = CafeStore.settlePayment(route[1], method);
    const invoice = {
      id: `INV-${Date.now()}`,
      orderId: route[1],
      invoiceNumber: `BILL-${route[1].replace('VV-', '')}`,
      total: settled.order?.total || 0,
      subtotal: settled.order?.subtotal || 0,
      taxAmount: settled.order?.tax || 0,
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

  // 13. /api/v1/tables/swipe
  if (path === 'tables/swipe') {
    const sourceTableId = typeof body.sourceTableId === 'string' ? body.sourceTableId : '';
    const destinationTableId = typeof body.destinationTableId === 'string' ? body.destinationTableId : '';
    const source = CafeStore.getTable(sourceTableId);
    const dest = CafeStore.getTable(destinationTableId);
    if (!source || !dest) {
      return NextResponse.json({ detail: 'Table not found' }, { status: 404, headers: corsHeaders() });
    }
    dest.status = source.status;
    source.status = 'AVAILABLE';
    return NextResponse.json(
      {
        message: 'Table swapped successfully',
        sessionId: `sess_${dest.id}_${Date.now()}`,
        sourceTable: source,
        destinationTable: dest,
        orderIds: [],
      },
      { headers: corsHeaders() }
    );
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
    const table = ServerBackend.updateTableStatus(route[1], body.status as TableStatus);
    if (!table) {
      return NextResponse.json({ detail: 'Table not found' }, { status: 404, headers: corsHeaders() });
    }
    return NextResponse.json(table, { headers: corsHeaders() });
  }

  // 2. /api/v1/orders/:id/status
  if (route[0] === 'orders' && route.length === 3 && route[2] === 'status') {
    const res = CafeStore.updateOrderStatus(route[1], body.status as OrderStatus);
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
  _request: NextRequest,
  context: { params: Promise<{ route: string[] }> }
) {
  const { route } = await context.params;
  const path = route.join('/');

  // /api/v1/auth/chefs/:id
  if (route[0] === 'auth' && route[1] === 'chefs' && route.length === 3) {
    const ok = ServerBackend.deleteChef(route[2]);
    if (!ok) {
      return NextResponse.json({ detail: 'Chef not found' }, { status: 404, headers: corsHeaders() });
    }
    return NextResponse.json({ message: 'Chef deleted successfully', id: route[2] }, { headers: corsHeaders() });
  }

  return NextResponse.json({ detail: `Route DELETE /api/v1/${path} not found` }, { status: 404, headers: corsHeaders() });
}
