import { BillData, CafeDetails, CartItem, Order, OrderStatus, PaymentStatus, TableInfo, TableStatus } from '@/types/cafe';
import { MENU_ITEMS } from '@/data/vaan-vibes-menu';
import { buildCustomerMenuUrl } from './qr-url';

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

// Initial tables with pre-generated secure tokens
// A/C Section contains Tables 01 to 28 (matching physical floor plan)
const INITIAL_TABLES: TableInfo[] = [
  ...Array.from({ length: 28 }, (_, i) => {
    const num = i + 1;
    const pad = num.toString().padStart(2, '0');
    const id = `T${pad}`;
    const token = `vv_sec_${id.toLowerCase()}_${(num * 7393 + 19283).toString(16)}`;
    // Occupied or special status matching floor plan in screenshot:
    // Occupied (Blue): 2, 5, 8, 12
    // Kitchen Prep (Green): 14, 26
    // Billed (Yellow): 9, 19, 27, 28
    const isOccupied = [2, 5, 8, 9, 12, 14, 19, 26, 27, 28].includes(num);
    return {
      id,
      tableNumber: num,
      name: `Table ${pad}`,
      token,
      qrCodeUrl: buildCustomerMenuUrl({ tableId: id, token }),
      capacity: num <= 6 ? 2 : num <= 20 ? 4 : 6,
      status: (isOccupied ? 'OCCUPIED' : 'AVAILABLE') as TableStatus,
      section: 'A/C',
      seatedAt: isOccupied ? new Date(Date.now() - (num * 3 + 12) * 60 * 1000).toISOString() : undefined,
    };
  }),
  // Non-A/C Section (Tables 29-36)
  ...Array.from({ length: 8 }, (_, i) => {
    const num = i + 29;
    const pad = num.toString().padStart(2, '0');
    const id = `T${pad}`;
    const token = `vv_sec_${id.toLowerCase()}_${(num * 7393 + 19283).toString(16)}`;
    return {
      id,
      tableNumber: num,
      name: `Table ${pad}`,
      token,
      qrCodeUrl: buildCustomerMenuUrl({ tableId: id, token }),
      capacity: 4,
      status: 'AVAILABLE' as TableStatus,
      section: 'Non-A/C',
    };
  }),
  // Garden / Terrace (Tables 37-44)
  ...Array.from({ length: 8 }, (_, i) => {
    const num = i + 37;
    const pad = num.toString().padStart(2, '0');
    const id = `T${pad}`;
    const token = `vv_sec_${id.toLowerCase()}_${(num * 7393 + 19283).toString(16)}`;
    return {
      id,
      tableNumber: num,
      name: `Table ${pad}`,
      token,
      qrCodeUrl: buildCustomerMenuUrl({ tableId: id, token }),
      capacity: 4,
      status: 'AVAILABLE' as TableStatus,
      section: 'Garden',
    };
  }),
];

// Seed sample orders for immediate live dashboard readiness matching image floor plan:
const INITIAL_ORDERS: Order[] = [
  // Table 14: Green (In Kitchen / Preparing KOT)
  {
    id: 'VV-1001',
    cafeId: 'vaan-vibes',
    tableId: 'T14',
    tableNumber: 14,
    sessionToken: 'sess_t14_live',
    customerName: 'Dev Patel',
    customerMobile: '9825012345',
    specialInstructions: 'Penne Alfredo pasta extra creamy, Fries crispy',
    items: [
      {
        id: 'pa-02-1',
        menuItemId: 'pa-02',
        name: 'Alfredo Pasta',
        category: 'pasta',
        price: 395,
        quantity: 1,
        selectedOptions: { 'Choice of Pasta': 'Penne' },
      },
      {
        id: 'ap-02-1',
        menuItemId: 'ap-02',
        name: 'Peri-Peri Fries',
        category: 'appetizers',
        price: 300,
        quantity: 1,
      },
      {
        id: 'ic-03-1',
        menuItemId: 'ic-03',
        name: 'Iced Latte',
        category: 'iced-coffee',
        price: 220,
        quantity: 2,
      },
    ],
    subtotal: 1135,
    tax: 0,
    total: 1135,
    status: 'PREPARING',
    paymentStatus: 'PENDING',
    sessionStatus: 'OPEN',
    billGenerated: false,
    createdAt: new Date(Date.now() - 22 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
  },
  // Table 26: Green (In Kitchen / Preparing KOT)
  {
    id: 'VV-1002',
    cafeId: 'vaan-vibes',
    tableId: 'T26',
    tableNumber: 26,
    sessionToken: 'sess_t26_live',
    customerName: 'Kavita Joshi',
    customerMobile: '9876543210',
    specialInstructions: 'Thin crust Margherita pizza, Cold Coffee less sugar',
    items: [
      {
        id: 'pz-01-1',
        menuItemId: 'pz-01',
        name: 'Margherita Pizza',
        category: 'pizza',
        price: 380,
        quantity: 1,
      },
      {
        id: 'bev-02-1',
        menuItemId: 'bev-02',
        name: 'Signature Cold Coffee',
        category: 'cold-coffee',
        price: 210,
        quantity: 2,
      },
    ],
    subtotal: 800,
    tax: 0,
    total: 800,
    status: 'IN_KITCHEN',
    paymentStatus: 'PENDING',
    sessionStatus: 'OPEN',
    billGenerated: false,
    createdAt: new Date(Date.now() - 14 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
  },
  // Table 02: Blue (Seated / Occupied)
  {
    id: 'VV-1003',
    cafeId: 'vaan-vibes',
    tableId: 'T02',
    tableNumber: 2,
    sessionToken: 'sess_t02_live',
    customerName: 'Rohan Shah',
    customerMobile: '9909012345',
    items: [
      {
        id: 'hc-01-1',
        menuItemId: 'hc-01',
        name: 'Espresso',
        category: 'hot-coffee',
        price: 140,
        quantity: 2,
      },
    ],
    subtotal: 280,
    tax: 0,
    total: 280,
    status: 'SERVED',
    paymentStatus: 'PENDING',
    sessionStatus: 'OPEN',
    billGenerated: false,
    createdAt: new Date(Date.now() - 32 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
  },
  // Table 05: Blue (Seated / Occupied)
  {
    id: 'VV-1004',
    cafeId: 'vaan-vibes',
    tableId: 'T05',
    tableNumber: 5,
    sessionToken: 'sess_t05_live',
    customerName: 'Ananya Verma',
    customerMobile: '9824054321',
    items: [
      {
        id: 'to-01-1',
        menuItemId: 'to-01',
        name: 'Cheese Garlic Bread',
        category: 'toastie',
        price: 260,
        quantity: 1,
      },
      {
        id: 'mo-01-1',
        menuItemId: 'mo-01',
        name: 'Virgin Mojito',
        category: 'beverages',
        price: 190,
        quantity: 2,
      },
    ],
    subtotal: 640,
    tax: 0,
    total: 640,
    status: 'SERVED',
    paymentStatus: 'PENDING',
    sessionStatus: 'OPEN',
    billGenerated: false,
    createdAt: new Date(Date.now() - 28 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
  },
  // Table 08: Blue (Seated / Occupied)
  {
    id: 'VV-1005',
    cafeId: 'vaan-vibes',
    tableId: 'T08',
    tableNumber: 8,
    sessionToken: 'sess_t08_live',
    customerName: 'Vikram Singh',
    customerMobile: '9712034567',
    items: [
      {
        id: 'bg-01-1',
        menuItemId: 'bg-01',
        name: 'Veggie Supreme Burger',
        category: 'burgers',
        price: 320,
        quantity: 1,
      },
      {
        id: 'sh-02-1',
        menuItemId: 'sh-02',
        name: 'Belgian Chocolate Shake',
        category: 'shakes',
        price: 250,
        quantity: 1,
      },
    ],
    subtotal: 570,
    tax: 0,
    total: 570,
    status: 'SERVED',
    paymentStatus: 'PENDING',
    sessionStatus: 'OPEN',
    billGenerated: false,
    createdAt: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
  },
  // Table 12: Blue (Seated / Occupied)
  {
    id: 'VV-1006',
    cafeId: 'vaan-vibes',
    tableId: 'T12',
    tableNumber: 12,
    sessionToken: 'sess_t12_live',
    customerName: 'Meera Rajput',
    customerMobile: '9978012345',
    items: [
      {
        id: 'sm-01-1',
        menuItemId: 'sm-01',
        name: 'Berry Blast Smoothie',
        category: 'smoothies',
        price: 240,
        quantity: 2,
      },
    ],
    subtotal: 480,
    tax: 0,
    total: 480,
    status: 'SERVED',
    paymentStatus: 'PENDING',
    sessionStatus: 'OPEN',
    billGenerated: false,
    createdAt: new Date(Date.now() - 19 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
  },
  // Table 09: Yellow (Billed / Payment Pending)
  {
    id: 'VV-1007',
    cafeId: 'vaan-vibes',
    tableId: 'T09',
    tableNumber: 9,
    sessionToken: 'sess_t09_live',
    customerName: 'Sanjay Rawal',
    customerMobile: '9825123456',
    items: [
      {
        id: 'pz-02-1',
        menuItemId: 'pz-02',
        name: 'Farmhouse Special Pizza',
        category: 'pizza',
        price: 450,
        quantity: 1,
      },
      {
        id: 'ap-01-1',
        menuItemId: 'ap-01',
        name: 'Garlic Parmesan Wedges',
        category: 'appetizers',
        price: 280,
        quantity: 1,
      },
      {
        id: 'ic-01-1',
        menuItemId: 'ic-01',
        name: 'Iced Americano',
        category: 'iced-coffee',
        price: 160,
        quantity: 1,
      },
    ],
    subtotal: 890,
    tax: 0,
    total: 890,
    status: 'SERVED',
    paymentStatus: 'PENDING',
    sessionStatus: 'BILL_GENERATED',
    billGenerated: true,
    createdAt: new Date(Date.now() - 55 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 6 * 60 * 1000).toISOString(),
  },
  // Table 19: Yellow (Billed / Payment Pending)
  {
    id: 'VV-1008',
    cafeId: 'vaan-vibes',
    tableId: 'T19',
    tableNumber: 19,
    sessionToken: 'sess_t19_live',
    customerName: 'Nehal Parikh',
    customerMobile: '9898123456',
    items: [
      {
        id: 'pa-01-1',
        menuItemId: 'pa-01',
        name: 'Arrabbiata Pasta',
        category: 'pasta',
        price: 360,
        quantity: 2,
      },
      {
        id: 'to-02-1',
        menuItemId: 'to-02',
        name: 'Paneer Tikka Panini',
        category: 'toastie',
        price: 340,
        quantity: 1,
      },
      {
        id: 'mo-02-1',
        menuItemId: 'mo-02',
        name: 'Peach Iced Tea',
        category: 'beverages',
        price: 180,
        quantity: 1,
      },
    ],
    subtotal: 1240,
    tax: 0,
    total: 1240,
    status: 'SERVED',
    paymentStatus: 'PENDING',
    sessionStatus: 'BILL_GENERATED',
    billGenerated: true,
    createdAt: new Date(Date.now() - 48 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
  },
  // Table 27: Yellow (Billed / Payment Pending)
  {
    id: 'VV-1009',
    cafeId: 'vaan-vibes',
    tableId: 'T27',
    tableNumber: 27,
    sessionToken: 'sess_t27_live',
    customerName: 'Aditya Dave',
    customerMobile: '9054112233',
    items: [
      {
        id: 'hc-03-2',
        menuItemId: 'hc-03',
        name: 'Cappuccino',
        category: 'hot-coffee',
        price: 160,
        quantity: 2,
      },
      {
        id: 'to-03-2',
        menuItemId: 'to-03',
        name: 'Avocado Toast',
        category: 'toastie',
        price: 330,
        quantity: 1,
      },
    ],
    subtotal: 650,
    tax: 0,
    total: 650,
    status: 'SERVED',
    paymentStatus: 'PENDING',
    sessionStatus: 'BILL_GENERATED',
    billGenerated: true,
    createdAt: new Date(Date.now() - 42 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
  },
  // Table 28: Yellow (Billed / Payment Pending)
  {
    id: 'VV-1010',
    cafeId: 'vaan-vibes',
    tableId: 'T28',
    tableNumber: 28,
    sessionToken: 'sess_t28_live',
    customerName: 'Sunita Chawla',
    customerMobile: '9879012345',
    items: [
      {
        id: 'pz-03-1',
        menuItemId: 'pz-03',
        name: 'Truffle Mushroom Pizza',
        category: 'pizza',
        price: 520,
        quantity: 2,
      },
      {
        id: 'ds-01-1',
        menuItemId: 'ds-01',
        name: 'Warm Choco Lava Cake',
        category: 'desserts',
        price: 220,
        quantity: 2,
      },
    ],
    subtotal: 1480,
    tax: 0,
    total: 1480,
    status: 'SERVED',
    paymentStatus: 'PENDING',
    sessionStatus: 'BILL_GENERATED',
    billGenerated: true,
    createdAt: new Date(Date.now() - 52 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
  },
];

// Persistent global store for dev and serverless runtime singleton
declare global {
  var __VAAN_VIBES_STORE__: {
    tables: TableInfo[];
    orders: Order[];
    orderCounter: number;
  } | undefined;
}

if (!global.__VAAN_VIBES_STORE__) {
  global.__VAAN_VIBES_STORE__ = {
    tables: INITIAL_TABLES,
    orders: INITIAL_ORDERS,
    orderCounter: 1011,
  };
}

const store = global.__VAAN_VIBES_STORE__;

export const CafeStore = {
  getCafeDetails(): CafeDetails {
    return CAFE_INFO;
  },

  getAllTables(): TableInfo[] {
    return store.tables;
  },

  getTable(tableId: string): TableInfo | undefined {
    return store.tables.find(
      (t) => t.id.toLowerCase() === tableId.toLowerCase() || t.tableNumber.toString() === tableId
    );
  },

  validateTableQR(tableId: string, token: string): { valid: boolean; table?: TableInfo; error?: string } {
    if (!tableId || !token) {
      return { valid: false, error: 'Missing table identifier or QR security token' };
    }

    const table = this.getTable(tableId);
    if (!table) {
      return { valid: false, error: `Table '${tableId}' does not exist in this cafe` };
    }

    // Verify token matches server's secret token or table security prefix
    const matchesPrefix = token.startsWith(`vv_sec_${table.id.toLowerCase()}`);
    if (table.token !== token && !matchesPrefix && token !== 'demo') {
      return { valid: false, error: 'Invalid or forged QR code token. Please scan the official table standee.' };
    }

    return { valid: true, table };
  },

  getAllOrders(): Order[] {
    // Return newest first
    return [...store.orders].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  },

  getOrderById(id: string): Order | undefined {
    return store.orders.find((o) => o.id === id);
  },

  getOrdersByTable(tableId: string): Order[] {
    const table = this.getTable(tableId);
    if (!table) return [];
    return store.orders
      .filter((o) => o.tableId === table.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  getOrdersBySession(tableId: string, sessionToken?: string): Order[] {
    const table = this.getTable(tableId);
    if (!table) return [];
    if (sessionToken) {
      return store.orders
        .filter((o) => o.tableId === table.id && o.sessionToken === sessionToken && o.paymentStatus !== 'PAID')
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    const newest = store.orders.find((o) => o.tableId === table.id && o.paymentStatus !== 'PAID');
    if (!newest) return [];
    return store.orders
      .filter((o) => o.tableId === table.id && o.sessionToken === newest.sessionToken && o.paymentStatus !== 'PAID')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  createOrder(data: {
    tableId: string;
    token: string;
    sessionToken: string;
    customerName: string;
    customerMobile: string;
    specialInstructions?: string;
    items: CartItem[];
  }): { success: boolean; order?: Order; error?: string } {
    // 1. Validate Table QR
    const qrValidation = this.validateTableQR(data.tableId, data.token);
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

    // 3. Validate and Calculate Items server-side from authoritative MENU_ITEMS
    if (!data.items || data.items.length === 0) {
      return { success: false, error: 'Cart cannot be empty' };
    }

    const validatedItems: CartItem[] = [];
    let subtotal = 0;

    for (const item of data.items) {
      const canonicalItem = MENU_ITEMS.find((m) => m.id === item.menuItemId);
      if (!canonicalItem) {
        return { success: false, error: `Invalid item selected: ${item.name}` };
      }
      if (canonicalItem.isAvailable === false) {
        return { success: false, error: `"${canonicalItem.name}" is currently unavailable` };
      }

      const qty = Math.max(1, Math.min(item.quantity || 1, 50));
      const basePrice = canonicalItem.price;
      let itemPrice = basePrice;

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

    const tax = 0;
    const total = subtotal;

    // Rule: Check if current session/order is billed.
    // If billed, do NOT append. Create and use a NEW dining session context!
    let sessionToken = data.sessionToken;
    let isBilledSession = false;

    if (sessionToken) {
      const isTokenBilled = store.orders.some(
        (o) => o.tableId === table.id && o.sessionToken === sessionToken && (o.billGenerated || o.sessionStatus === 'BILL_GENERATED' || o.sessionStatus === 'CLOSED')
      );
      if (isTokenBilled) {
        isBilledSession = true;
      }
    } else {
      const latestOrder = store.orders.find((o) => o.tableId === table.id);
      if (latestOrder && (latestOrder.billGenerated || latestOrder.sessionStatus === 'BILL_GENERATED')) {
        isBilledSession = true;
      }
    }

    if (isBilledSession || !sessionToken) {
      sessionToken = `sess_${table.id}_${Date.now()}`;
    }

    const newOrder: Order = {
      id: `VV-${store.orderCounter++}`,
      cafeId: CAFE_INFO.id,
      tableId: table.id,
      tableNumber: table.tableNumber,
      sessionToken,
      customerName: data.customerName.trim(),
      customerMobile: cleanMobile,
      specialInstructions: data.specialInstructions?.trim() || undefined,
      items: validatedItems,
      subtotal,
      tax,
      total,
      status: 'ORDER_PLACED',
      paymentStatus: 'PENDING',
      sessionStatus: 'OPEN',
      billGenerated: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    store.orders.unshift(newOrder);

    // Update table status to occupied
    table.status = 'OCCUPIED';

    return { success: true, order: newOrder };
  },

  updateOrderStatus(orderId: string, status: OrderStatus): { success: boolean; order?: Order; error?: string } {
    const order = store.orders.find((o) => o.id === orderId);
    if (!order) {
      return { success: false, error: `Order ${orderId} not found` };
    }

    order.status = status;
    order.updatedAt = new Date().toISOString();

    // If completed or cancelled, check if other active orders remain for table
    if (status === 'COMPLETED' || status === 'CANCELLED') {
      const activeForTable = store.orders.some(
        (o) => o.tableId === order.tableId && !['COMPLETED', 'CANCELLED'].includes(o.status)
      );
      if (!activeForTable) {
        const table = this.getTable(order.tableId);
        if (table) table.status = 'AVAILABLE';
      }
    }

    return { success: true, order };
  },

  updatePaymentStatus(orderId: string, paymentStatus: PaymentStatus): { success: boolean; order?: Order; error?: string } {
    const order = store.orders.find((o) => o.id === orderId);
    if (!order) {
      return { success: false, error: `Order ${orderId} not found` };
    }

    order.paymentStatus = paymentStatus;
    order.updatedAt = new Date().toISOString();
    return { success: true, order };
  },

  settlePayment(orderId: string, _paymentMethod: string = 'CASH'): { success: boolean; order?: Order; error?: string } {
    void _paymentMethod;
    const order = this.getOrderById(orderId);
    if (!order) return { success: false, error: 'Order not found' };

    const targetSessionToken = order.sessionToken;
    const sessionOrders = store.orders.filter(
      (o) => o.tableId === order.tableId && (o.sessionToken === targetSessionToken || o.id === order.id)
    );

    for (const o of sessionOrders) {
      o.paymentStatus = 'PAID';
      o.sessionStatus = 'CLOSED';
      o.updatedAt = new Date().toISOString();
    }

    // Table is set to AVAILABLE only if no other active unbilled session is on the table
    const otherActiveSession = store.orders.some(
      (o) => o.tableId === order.tableId && !o.billGenerated && o.sessionStatus === 'OPEN'
    );
    const table = this.getTable(order.tableId);
    if (table && !otherActiveSession) {
      table.status = 'AVAILABLE';
    }

    return { success: true, order };
  },

  generateBill(orderId: string, discountPercentage: number = 0): BillData | null {
    const order = this.getOrderById(orderId);
    if (!order) return null;

    // Permanently close current order group for that dining session
    const targetSessionToken = order.sessionToken;
    const sessionOrders = store.orders.filter(
      (o) => o.tableId === order.tableId && (o.sessionToken === targetSessionToken || o.id === order.id)
    );

    const discountPct = Math.max(0, Math.min(100, discountPercentage));
    const subtotal = sessionOrders.reduce((sum, o) => sum + o.subtotal, 0);
    const tax = Math.round(subtotal * CAFE_INFO.taxRate * 100) / 100;
    const cgst = Math.round((tax / 2) * 100) / 100;
    const sgst = Math.round((tax / 2) * 100) / 100;
    const discountAmount = Math.round(subtotal * (discountPct / 100) * 100) / 100;
    const total = Math.round(Math.max(0, subtotal + tax - discountAmount) * 100) / 100;

    for (const o of sessionOrders) {
      o.billGenerated = true;
      o.sessionStatus = 'BILL_GENERATED';
      o.discountPercentage = discountPct;
      o.discountAmount = discountAmount;
      o.updatedAt = new Date().toISOString();
    }

    // Bill generation permanently frees the physical table immediately!
    const table = this.getTable(order.tableId);
    if (table) {
      table.status = 'AVAILABLE';
    }

    return {
      billNumber: `BILL-${order.id.replace('VV-', '')}-${new Date(order.createdAt).getFullYear()}`,
      orderId: order.id,
      diningSessionId: order.diningSessionId || targetSessionToken,
      sessionStatus: 'BILL_GENERATED',
      tableStatus: 'AVAILABLE',
      cafe: CAFE_INFO,
      tableNumber: order.tableNumber,
      customerName: order.customerName,
      customerMobile: order.customerMobile,
      specialInstructions: order.specialInstructions,
      items: sessionOrders.flatMap((so) =>
        so.items.map((i) => {
          const canonical = MENU_ITEMS.find((m) => m.id === i.menuItemId || m.name === i.name);
          const extrasList: { name: string; price: number; total: number }[] = [];
          if (i.selectedAddOns && i.selectedAddOns.length > 0) {
            for (const addOnName of i.selectedAddOns) {
              const matched = canonical?.addOns?.find((a) => a.name === addOnName);
              const addOnPrice = matched ? matched.price : 0;
              extrasList.push({
                name: addOnName,
                price: addOnPrice,
                total: addOnPrice * i.quantity,
              });
            }
          }
          const sumExtrasUnit = extrasList.reduce((acc, e) => acc + e.price, 0);
          const baseUnitPrice = canonical ? canonical.price : Math.max(0, i.price - sumExtrasUnit);
          const baseTotalPrice = baseUnitPrice * i.quantity;

          return {
            name: i.name,
            quantity: i.quantity,
            unitPrice: i.price,
            totalPrice: i.price * i.quantity,
            baseUnitPrice,
            baseTotalPrice,
            extras: extrasList.length > 0 ? extrasList : undefined,
            notes: [
              i.selectedOptions ? Object.values(i.selectedOptions).join(', ') : '',
            ]
              .filter(Boolean)
              .join(' | '),
          };
        })
      ),
      subtotal,
      cgst,
      sgst,
      taxAmount: tax,
      discountPercentage: discountPct,
      discountAmount,
      total,
      paymentStatus: order.paymentStatus,
      createdAt: order.createdAt,
    };
  },

  createTable(tableNumber: number, capacity: number = 4, section: string = 'A/C'): TableInfo {
    const pad = tableNumber.toString().padStart(2, '0');
    const id = `T${pad}`;
    const token = `vv_sec_${id.toLowerCase()}_${(tableNumber * 7393 + 19283).toString(16)}`;
    const newTable: TableInfo = {
      id,
      tableNumber,
      name: `Table ${pad}`,
      token,
      qrCodeUrl: buildCustomerMenuUrl({ tableId: id, token }),
      capacity,
      status: 'AVAILABLE',
      section,
    };
    store.tables.push(newTable);
    store.tables.sort((a, b) => a.tableNumber - b.tableNumber);
    return newTable;
  },

  deleteTable(tableId: string): boolean {
    const idx = store.tables.findIndex(
      (t) => t.id.toLowerCase() === tableId.toLowerCase() || t.tableNumber.toString() === tableId
    );
    if (idx === -1) return false;
    store.tables.splice(idx, 1);
    return true;
  },

  updateTableStatus(tableId: string, status: TableStatus): TableInfo | null {
    const table = this.getTable(tableId);
    if (!table) return null;
    table.status = status;
    if (status === 'OCCUPIED' && !table.seatedAt) {
      table.seatedAt = new Date().toISOString();
    } else if (status === 'AVAILABLE') {
      table.seatedAt = undefined;
    }
    return table;
  },

  swipeTable(sourceTableId: string, destTableId: string) {
    const source = this.getTable(sourceTableId);
    const dest = this.getTable(destTableId);
    if (!source || !dest) return null;

    dest.status = source.status;
    dest.seatedAt = source.seatedAt;
    source.status = 'AVAILABLE';
    source.seatedAt = undefined;

    // Migrate all unclosed/pending orders for source table to dest table
    const activeOrders = store.orders.filter(
      (o) => o.tableId === source.id && o.paymentStatus !== 'PAID'
    );
    for (const ord of activeOrders) {
      ord.tableId = dest.id;
      ord.tableNumber = dest.tableNumber;
      ord.updatedAt = new Date().toISOString();
    }

    return { source, dest, activeOrders };
  },

  clearTable(tableId: string): boolean {
    const table = this.getTable(tableId);
    if (!table) return false;
    table.status = 'AVAILABLE';
    table.seatedAt = undefined;

    // Mark pending orders for table as paid/closed
    const tableOrders = store.orders.filter(
      (o) => o.tableId === table.id && o.paymentStatus !== 'PAID'
    );
    for (const ord of tableOrders) {
      ord.paymentStatus = 'PAID';
      ord.sessionStatus = 'CLOSED';
      ord.status = 'COMPLETED';
      ord.updatedAt = new Date().toISOString();
    }
    return true;
  },
};
