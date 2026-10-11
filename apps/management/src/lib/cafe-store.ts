import { BillData, CafeDetails, CartItem, MenuItem, Order, OrderStatus, PaymentStatus, TableInfo, TableStatus } from '@/types/cafe';
import { calculateBillBreakdown } from '@/utils/billing';
import { buildCustomerMenuUrl } from './qr-url';
import { StoreRepo, setInitialTablesFactory, withRead, withWrite } from './db/repo';
import { buildMenu } from './menu-store';

export const CAFE_INFO: CafeDetails = {
  id: 'van-vibes',
  name: 'Vaan Vibes Cafe & Restro',
  hindiName: 'वन VIBES',
  tagline: 'Cafe & Restro • Taste the Vibe',
  address: 'Titanium The Business Hub, G-17, Bhimrad Rd, opp. Aakash Empire, beside White Temple, Surat, Gujarat 395007',
  phone: '+91 9904990790',
  gstin: '',
  currency: '₹',
  taxRate: 0, // No GST
};

// The restaurant's dining tables (A/C section): Tables 01-18, without Table 13.
export const TABLE_NUMBERS = Array.from({ length: 18 }, (_, i) => i + 1).filter((n) => n !== 13);
export const TOTAL_TABLES = TABLE_NUMBERS.length;

function buildTable(tableNumber: number, capacity: number, section: string): TableInfo {
  const pad = tableNumber.toString().padStart(2, '0');
  const id = `T${pad}`;
  const token = `vv_sec_${id.toLowerCase()}_${(tableNumber * 7393 + 19283).toString(16)}`;
  return {
    id,
    tableNumber,
    name: `Table ${pad}`,
    token,
    qrCodeUrl: buildCustomerMenuUrl({ tableId: id, token }),
    capacity,
    status: 'AVAILABLE',
    section,
  };
}

function createInitialTables(): TableInfo[] {
  return TABLE_NUMBERS.map((num) => buildTable(num, num <= 6 ? 2 : 4, 'A/C'));
}

setInitialTablesFactory(createInitialTables);

function findTable(tables: TableInfo[], tableId: string): TableInfo | undefined {
  return tables.find(
    (t) => t.id.toLowerCase() === tableId.toLowerCase() || t.tableNumber.toString() === tableId
  );
}

async function loadTable(repo: StoreRepo, tableId: string): Promise<TableInfo | undefined> {
  return findTable(await repo.listTables(), tableId);
}

function checkTableQR(
  table: TableInfo | undefined,
  tableId: string,
  token: string
): { valid: boolean; table?: TableInfo; error?: string } {
  if (!tableId || !token) {
    return { valid: false, error: 'Missing table identifier or QR security token' };
  }
  if (!table) {
    return { valid: false, error: `Table '${tableId}' does not exist in this cafe` };
  }
  // Verify token matches server's secret token or table security prefix
  const matchesPrefix = token.startsWith(`vv_sec_${table.id.toLowerCase()}`);
  if (table.token !== token && !matchesPrefix && token !== 'demo') {
    return { valid: false, error: 'Invalid or forged QR code token. Please scan the official table standee.' };
  }
  return { valid: true, table };
}

async function loadMenuItems(repo: StoreRepo): Promise<MenuItem[]> {
  return buildMenu(await repo.listMenuEntries()).items;
}

/** Cancelled orders stay in the session's history but are never charged. */
function billableSubtotal(sessionOrders: Order[]): number {
  return sessionOrders.filter((o) => o.status !== 'CANCELLED').reduce((sum, o) => sum + o.subtotal, 0);
}

/** The bill for a dining session, using the discount and extra charge saved on its orders. */
function buildBill(order: Order, sessionOrders: Order[], menuItems: MenuItem[]): BillData {
  const sorted = [...sessionOrders].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const first = sorted[0] || order;
  const billable = sorted.filter((o) => o.status !== 'CANCELLED');
  const breakdown = calculateBillBreakdown(billableSubtotal(sorted), first.discountPercentage || 0, first.extraCharge || 0);
  const tax = Math.round(breakdown.subtotal * CAFE_INFO.taxRate * 100) / 100;
  const cgst = Math.round((tax / 2) * 100) / 100;
  const sgst = Math.round((tax / 2) * 100) / 100;

  const isPaid = sorted.some((o) => o.paymentStatus === 'PAID' || o.sessionStatus === 'CLOSED');
  const isBilled = sorted.some((o) => o.billGenerated || o.sessionStatus === 'BILL_GENERATED');
  const sessionStatus = isPaid ? 'CLOSED' : isBilled ? 'BILL_GENERATED' : 'OPEN';

  return {
    billNumber: `BILL-${first.id.replace('VV-', '')}-${new Date(first.createdAt).getFullYear()}`,
    orderId: order.id,
    orderIds: billable.map((o) => o.id),
    diningSessionId: order.diningSessionId || order.sessionToken,
    sessionStatus,
    tableStatus: sessionStatus === 'OPEN' ? 'OCCUPIED' : 'AVAILABLE',
    cafe: CAFE_INFO,
    tableNumber: order.tableNumber,
    customerName: first.customerName,
    customerMobile: first.customerMobile,
    specialInstructions: billable.map((o) => o.specialInstructions).filter(Boolean).join(' | ') || undefined,
    items: billable.flatMap((so) =>
      so.items.map((i) => {
        // i.price is what was charged when ordered (add-ons included); add-on prices come from the menu
        const canonical = menuItems.find((m) => m.id === i.menuItemId || m.name === i.name);
        const extrasList = (i.selectedAddOns || []).map((name) => {
          const price = canonical?.addOns?.find((a) => a.name === name)?.price || 0;
          return { name, price, total: price * i.quantity };
        });
        const baseUnitPrice = Math.max(0, i.price - extrasList.reduce((acc, e) => acc + e.price, 0));

        return {
          name: i.name,
          quantity: i.quantity,
          unitPrice: i.price,
          totalPrice: i.price * i.quantity,
          baseUnitPrice,
          baseTotalPrice: baseUnitPrice * i.quantity,
          extras: extrasList.length > 0 ? extrasList : undefined,
          notes: [i.selectedOptions ? Object.values(i.selectedOptions).join(', ') : '']
            .filter(Boolean)
            .join(' | '),
        };
      })
    ),
    subtotal: breakdown.subtotal,
    cgst,
    sgst,
    taxAmount: tax,
    discountPercentage: breakdown.discountPercentage,
    discountAmount: breakdown.discountAmount,
    extraCharge: breakdown.extraCharge,
    amountAfterAdjustments: breakdown.amountAfterAdjustments,
    roundOff: breakdown.roundOff,
    total: breakdown.total + tax,
    paymentStatus: isPaid ? 'PAID' : order.paymentStatus,
    createdAt: first.createdAt,
  };
}

/** Orders of the same dining session as `order` (always including `order` itself). */
async function loadSessionOrders(repo: StoreRepo, order: Order): Promise<Order[]> {
  const sameSession = await repo.listOrders({ tableId: order.tableId, sessionToken: order.sessionToken });
  return sameSession.some((o) => o.id === order.id) ? sameSession : [order, ...sameSession];
}

export const CafeStore = {
  getCafeDetails(): CafeDetails {
    return CAFE_INFO;
  },

  async getAllTables(): Promise<TableInfo[]> {
    return withRead((repo) => repo.listTables());
  },

  async getTable(tableId: string): Promise<TableInfo | undefined> {
    return withRead((repo) => loadTable(repo, tableId));
  },

  async validateTableQR(tableId: string, token: string): Promise<{ valid: boolean; table?: TableInfo; error?: string }> {
    const table = tableId ? await this.getTable(tableId) : undefined;
    return checkTableQR(table, tableId, token);
  },

  /** Newest first, optionally limited to a date window. */
  async getAllOrders(range?: { from?: Date; to?: Date }): Promise<Order[]> {
    return withRead((repo) => repo.listOrders(range));
  },

  async getOrderById(id: string): Promise<Order | undefined> {
    return withRead((repo) => repo.getOrder(id));
  },

  async getOrdersByTable(tableId: string): Promise<Order[]> {
    return withRead(async (repo) => {
      const table = await loadTable(repo, tableId);
      return table ? repo.listOrders({ tableId: table.id }) : [];
    });
  },

  async getOrdersBySession(tableId: string, sessionToken?: string): Promise<Order[]> {
    return withRead(async (repo) => {
      const table = await loadTable(repo, tableId);
      if (!table) return [];
      if (sessionToken) {
        return repo.listOrders({ tableId: table.id, sessionToken, unpaidOnly: true });
      }
      const [newest] = await repo.listOrders({ tableId: table.id, unpaidOnly: true });
      if (!newest) return [];
      return repo.listOrders({ tableId: table.id, sessionToken: newest.sessionToken, unpaidOnly: true });
    });
  },

  async createOrder(data: {
    tableId: string;
    token: string;
    sessionToken: string;
    customerName: string;
    customerMobile: string;
    specialInstructions?: string;
    items: CartItem[];
  }): Promise<{ success: boolean; order?: Order; error?: string }> {
    return withWrite(async (repo) => {
      // 1. Validate Table QR
      const qrValidation = checkTableQR(await loadTable(repo, data.tableId || ''), data.tableId, data.token);
      if (!qrValidation.valid || !qrValidation.table) {
        return { success: false, error: qrValidation.error || 'Invalid table validation' };
      }

      const table = qrValidation.table;

      // 2. Validate Customer Details
      if (!data.customerName || data.customerName.trim().length < 2) {
        return { success: false, error: 'Please enter your full name (minimum 2 characters)' };
      }
      const cleanMobile = (data.customerMobile || '').trim();
      if (!/^\d{10}$/.test(cleanMobile)) {
        return { success: false, error: 'Phone number must contain exactly 10 digits' };
      }

      // 3. Validate and Calculate Items server-side from the live menu
      if (!data.items || data.items.length === 0) {
        return { success: false, error: 'Cart cannot be empty' };
      }

      const validatedItems: CartItem[] = [];
      let subtotal = 0;
      const menuItems = await loadMenuItems(repo);

      for (const item of data.items) {
        const canonicalItem = menuItems.find((m) => m.id === item.menuItemId);
        if (!canonicalItem) {
          return { success: false, error: `Invalid item selected: ${item.name}` };
        }
        if (canonicalItem.isAvailable === false) {
          return { success: false, error: `"${canonicalItem.name}" is currently unavailable` };
        }

        const qty = Math.max(1, Math.min(item.quantity || 1, 50));
        let itemPrice = canonicalItem.price;

        // Calculate add-on extras if selected
        if (item.selectedAddOns && item.selectedAddOns.length > 0 && canonicalItem.addOns) {
          for (const addOnName of item.selectedAddOns) {
            const matchedAddon = canonicalItem.addOns.find((a) => a.name === addOnName);
            if (matchedAddon) {
              itemPrice += matchedAddon.price;
            }
          }
        }

        subtotal += itemPrice * qty;

        validatedItems.push({
          id: item.id,
          menuItemId: canonicalItem.id,
          name: canonicalItem.name,
          category: canonicalItem.category,
          price: itemPrice,
          quantity: qty,
          selectedOptions: item.selectedOptions,
          selectedAddOns: item.selectedAddOns,
          specialInstructions: item.specialInstructions,
        });
      }

      // Rule: If the current session is billed, do NOT append. Start a new dining session.
      let sessionToken = data.sessionToken;
      if (sessionToken) {
        const sessionOrders = await repo.listOrders({ tableId: table.id, sessionToken });
        const isBilled = sessionOrders.some(
          (o) => o.billGenerated || o.sessionStatus === 'BILL_GENERATED' || o.sessionStatus === 'CLOSED'
        );
        if (isBilled) sessionToken = '';
      }
      if (!sessionToken) {
        sessionToken = `sess_${table.id}_${Date.now()}`;
      }

      const now = new Date().toISOString();
      const newOrder: Order = {
        id: `VV-${await repo.nextOrderNumber()}`,
        cafeId: CAFE_INFO.id,
        tableId: table.id,
        tableNumber: table.tableNumber,
        sessionToken,
        customerName: data.customerName.trim(),
        customerMobile: cleanMobile,
        specialInstructions: data.specialInstructions?.trim() || undefined,
        items: validatedItems,
        subtotal,
        tax: 0,
        total: subtotal,
        status: 'ORDER_PLACED',
        paymentStatus: 'PENDING',
        sessionStatus: 'OPEN',
        billGenerated: false,
        createdAt: now,
        updatedAt: now,
      };

      table.status = 'OCCUPIED';
      if (!table.seatedAt) table.seatedAt = now;

      await repo.saveOrders([newOrder]);
      await repo.saveTables([table]);
      return { success: true, order: newOrder };
    });
  },

  async updateOrderStatus(orderId: string, status: OrderStatus): Promise<{ success: boolean; order?: Order; error?: string }> {
    return withWrite(async (repo) => {
      const order = await repo.getOrder(orderId);
      if (!order) {
        return { success: false, error: `Order ${orderId} not found` };
      }

      order.status = status;
      order.updatedAt = new Date().toISOString();
      await repo.saveOrders([order]);

      // If completed or cancelled, free the table when nothing else is still running on it
      if (status === 'COMPLETED' || status === 'CANCELLED') {
        const openOrders = await repo.listOrders({ tableId: order.tableId, unpaidOnly: true });
        const activeForTable = openOrders.some(
          (o) => o.id !== order.id && !['COMPLETED', 'CANCELLED'].includes(o.status)
        );
        if (!activeForTable) {
          const table = await loadTable(repo, order.tableId);
          if (table) {
            table.status = 'AVAILABLE';
            table.seatedAt = undefined;
            await repo.saveTables([table]);
          }
        }
      }

      return { success: true, order };
    });
  },

  async updatePaymentStatus(orderId: string, paymentStatus: PaymentStatus): Promise<{ success: boolean; order?: Order; error?: string }> {
    return withWrite(async (repo) => {
      const order = await repo.getOrder(orderId);
      if (!order) {
        return { success: false, error: `Order ${orderId} not found` };
      }
      order.paymentStatus = paymentStatus;
      order.updatedAt = new Date().toISOString();
      await repo.saveOrders([order]);
      return { success: true, order };
    });
  },

  async settlePayment(orderId: string, paymentMethod: string = 'CASH'): Promise<{ success: boolean; order?: Order; error?: string }> {
    return withWrite(async (repo) => {
      const order = await repo.getOrder(orderId);
      if (!order) return { success: false, error: 'Order not found' };

      const sessionOrders = await loadSessionOrders(repo, order);
      const now = new Date().toISOString();
      for (const o of sessionOrders) {
        o.paymentStatus = 'PAID';
        o.sessionStatus = 'CLOSED';
        o.paymentMethod = paymentMethod;
        o.paidAt = now;
        o.updatedAt = now;
      }
      await repo.saveOrders(sessionOrders);

      // Table is set to AVAILABLE only if no other active unbilled session is on the table
      const settledIds = new Set(sessionOrders.map((o) => o.id));
      const remaining = await repo.listOrders({ tableId: order.tableId, unpaidOnly: true });
      const otherActiveSession = remaining.some(
        (o) => !settledIds.has(o.id) && !o.billGenerated && o.sessionStatus === 'OPEN'
      );
      const table = await loadTable(repo, order.tableId);
      if (table && !otherActiveSession) {
        table.status = 'AVAILABLE';
        table.seatedAt = undefined;
        await repo.saveTables([table]);
      }

      const settled = sessionOrders.find((o) => o.id === order.id) || order;
      return { success: true, order: settled };
    });
  },

  /** The current bill of an order's dining session, without changing anything. */
  async getBill(orderId: string): Promise<BillData | null> {
    return withRead(async (repo) => {
      const order = await repo.getOrder(orderId);
      if (!order) return null;
      return buildBill(order, await loadSessionOrders(repo, order), await loadMenuItems(repo));
    });
  },

  /** Finalizes the bill for an order's whole dining session and frees the table. */
  async generateBill(orderId: string, discountPercentage: number = 0, extraCharge: number = 0): Promise<BillData | null> {
    return withWrite(async (repo) => {
      const order = await repo.getOrder(orderId);
      if (!order) return null;

      // Permanently close current order group for that dining session
      const sessionOrders = await loadSessionOrders(repo, order);
      const breakdown = calculateBillBreakdown(
        billableSubtotal(sessionOrders),
        Number(discountPercentage) || 0,
        Number(extraCharge) || 0
      );

      const now = new Date().toISOString();
      for (const o of sessionOrders) {
        o.billGenerated = true;
        o.sessionStatus = o.sessionStatus === 'CLOSED' ? 'CLOSED' : 'BILL_GENERATED';
        o.discountPercentage = breakdown.discountPercentage;
        o.discountAmount = breakdown.discountAmount;
        o.extraCharge = breakdown.extraCharge;
        o.amountAfterAdjustments = breakdown.amountAfterAdjustments;
        o.roundOff = breakdown.roundOff;
        o.billedAt = o.billedAt || now;
        o.updatedAt = now;
      }
      await repo.saveOrders(sessionOrders);

      // Bill generation permanently frees the physical table immediately!
      const table = await loadTable(repo, order.tableId);
      if (table) {
        table.status = 'AVAILABLE';
        table.seatedAt = undefined;
        await repo.saveTables([table]);
      }

      return buildBill(order, sessionOrders, await loadMenuItems(repo));
    });
  },

  /** Newest order of a dining session (the session id is the orders' session token). */
  async getSessionOrderId(sessionId: string): Promise<string | undefined> {
    return withRead(async (repo) => {
      const [newest] = await repo.listOrders({ sessionToken: sessionId });
      return newest?.id;
    });
  },

  async createTable(tableNumber: number, capacity: number = 4, section: string = 'A/C'): Promise<TableInfo> {
    return withWrite(async (repo) => {
      const existing = findTable(await repo.listTables(), tableNumber.toString());
      if (existing) return existing;
      const newTable = buildTable(tableNumber, capacity, section);
      await repo.saveTables([newTable]);
      return newTable;
    });
  },

  async deleteTable(tableId: string): Promise<boolean> {
    return withWrite(async (repo) => {
      const table = await loadTable(repo, tableId);
      return table ? repo.deleteTable(table.id) : false;
    });
  },

  async updateTableStatus(tableId: string, status: TableStatus): Promise<TableInfo | null> {
    return withWrite(async (repo) => {
      const table = await loadTable(repo, tableId);
      if (!table) return null;
      table.status = status;
      if (status === 'OCCUPIED' && !table.seatedAt) {
        table.seatedAt = new Date().toISOString();
      } else if (status === 'AVAILABLE') {
        table.seatedAt = undefined;
      }
      await repo.saveTables([table]);
      return table;
    });
  },

  async swipeTable(sourceTableId: string, destTableId: string) {
    return withWrite(async (repo) => {
      const tables = await repo.listTables();
      const source = findTable(tables, sourceTableId);
      const dest = findTable(tables, destTableId);
      if (!source || !dest) return null;

      dest.status = source.status;
      dest.seatedAt = source.seatedAt;
      source.status = 'AVAILABLE';
      source.seatedAt = undefined;

      // Migrate all unpaid orders for source table to dest table
      const activeOrders = await repo.listOrders({ tableId: source.id, unpaidOnly: true });
      const now = new Date().toISOString();
      for (const ord of activeOrders) {
        ord.tableId = dest.id;
        ord.tableNumber = dest.tableNumber;
        ord.updatedAt = now;
      }

      await repo.saveOrders(activeOrders);
      await repo.saveTables([source, dest]);
      return { source, dest, activeOrders };
    });
  },

  async clearTable(tableId: string): Promise<boolean> {
    return withWrite(async (repo) => {
      const table = await loadTable(repo, tableId);
      if (!table) return false;
      table.status = 'AVAILABLE';
      table.seatedAt = undefined;

      // Mark pending orders for table as paid/closed
      const tableOrders = await repo.listOrders({ tableId: table.id, unpaidOnly: true });
      const now = new Date().toISOString();
      for (const ord of tableOrders) {
        ord.paymentStatus = 'PAID';
        ord.sessionStatus = 'CLOSED';
        ord.status = 'COMPLETED';
        ord.updatedAt = now;
      }
      await repo.saveOrders(tableOrders);
      await repo.saveTables([table]);
      return true;
    });
  },

  /**
   * Staff/admin manually adds items to a table (no QR token needed).
   * Items must already be validated and priced by the caller.
   * Appends to the table's open (unbilled) dining session, or starts a new one.
   */
  async addStaffOrder(
    tableId: string,
    data: {
      items: CartItem[];
      customerName?: string;
      customerMobile?: string;
      specialInstructions?: string;
    }
  ): Promise<{ success: boolean; order?: Order; error?: string }> {
    return withWrite(async (repo) => {
      const table = await loadTable(repo, tableId);
      if (!table) {
        return { success: false, error: `Table '${tableId}' does not exist` };
      }
      if (!data.items || data.items.length === 0) {
        return { success: false, error: 'Add at least one item' };
      }

      const unpaid = await repo.listOrders({ tableId: table.id, unpaidOnly: true });
      const openOrder = unpaid.find(
        (o) =>
          !o.billGenerated &&
          o.sessionStatus !== 'BILL_GENERATED' &&
          o.sessionStatus !== 'CLOSED' &&
          o.status !== 'CANCELLED'
      );

      const subtotal = data.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
      const now = new Date().toISOString();

      const newOrder: Order = {
        id: `VV-${await repo.nextOrderNumber()}`,
        cafeId: CAFE_INFO.id,
        tableId: table.id,
        tableNumber: table.tableNumber,
        sessionToken: openOrder?.sessionToken || `sess_${table.id}_${Date.now()}`,
        customerName: data.customerName?.trim() || openOrder?.customerName || 'Walk-in Guest',
        customerMobile: data.customerMobile?.trim() || openOrder?.customerMobile || '',
        specialInstructions: data.specialInstructions?.trim() || undefined,
        items: data.items,
        subtotal,
        tax: 0,
        total: subtotal,
        status: 'ORDER_PLACED',
        paymentStatus: 'PENDING',
        sessionStatus: 'OPEN',
        billGenerated: false,
        createdAt: now,
        updatedAt: now,
      };

      table.status = 'OCCUPIED';
      if (!table.seatedAt) table.seatedAt = now;

      await repo.saveOrders([newOrder]);
      await repo.saveTables([table]);
      return { success: true, order: newOrder };
    });
  },

  /** Wipes all orders, bills and table changes, restoring the 18 default tables. */
  async resetAllData(): Promise<{ tables: number }> {
    return withWrite(async (repo) => {
      const tables = createInitialTables();
      await repo.resetAll(tables);
      return { tables: tables.length };
    });
  },
};
