import { BillData, CafeDetails, CartItem, Order, OrderStatus, PaymentStatus, TableInfo } from '@/types/cafe';
import { MENU_ITEMS } from '@/data/vaan-vibes-menu';
import { ordersApi } from '@/api/orders';
import { tablesApi } from '@/api/tables';
import { billingApi } from '@/api/billing';
import { wsManager } from '@/services/websocket/WebSocketManager';

export const CAFE_INFO: CafeDetails = {
  id: 'van-vibes',
  name: 'Vaan Vibes Cafe & Restro',
  hindiName: 'वन VIBES',
  tagline: 'Cafe & Restro • Taste the Vibe',
  address: 'Main Promenade, Serenita Arts Quarter, Surat, Gujarat - 395007',
  phone: '+91 98765 43210',
  gstin: '24AAAAA0000A1Z5',
  currency: '₹',
  taxRate: 0.05, // 5% GST
};

// Initial tables with pre-generated secure tokens
const INITIAL_TABLES: TableInfo[] = Array.from({ length: 12 }, (_, i) => {
  const num = i + 1;
  const pad = num.toString().padStart(2, '0');
  const id = `T${pad}`;
  const token = `vv_sec_${id.toLowerCase()}_${(num * 7393 + 19283).toString(16)}`;
  return {
    id,
    tableNumber: num,
    name: `Table ${pad}`,
    token,
    qrCodeUrl: `/cafe/van-vibes/menu?table=${id}&token=${token}`,
    capacity: num <= 4 ? 2 : num <= 8 ? 4 : 6,
    status: num === 3 || num === 7 ? 'OCCUPIED' : 'AVAILABLE',
  };
});

// Seed sample orders for immediate live dashboard readiness
const INITIAL_ORDERS: Order[] = [
  {
    id: 'VV-1001',
    cafeId: 'vaan-vibes',
    tableId: 'T07',
    tableNumber: 7,
    sessionToken: 'sess_t07_mock_1',
    customerName: 'Aarav Sharma',
    customerMobile: '9825012345',
    specialInstructions: 'Make coffee extra hot, no sugar in cappuccino',
    items: [
      {
        id: 'hc-03-default',
        menuItemId: 'hc-03',
        name: 'Cappuccino',
        category: 'hot-coffee',
        price: 160,
        unit_price: 160,
        quantity: 2,
        specialInstructions: 'Extra hot',
      },
      {
        id: 'to-03-default',
        menuItemId: 'to-03',
        name: 'Avocado Toast',
        category: 'toastie',
        price: 390,
        unit_price: 390,
        quantity: 1,
      },
    ],
    subtotal: 710,
    tax: 35.5,
    total: 745.5,
    status: 'PREPARING',
    paymentStatus: 'PAID',
    createdAt: new Date(Date.now() - 18 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 6 * 60 * 1000).toISOString(),
  },
  {
    id: 'VV-1002',
    cafeId: 'vaan-vibes',
    tableId: 'T03',
    tableNumber: 3,
    sessionToken: 'sess_t03_mock_2',
    customerName: 'Priya Mehta',
    customerMobile: '9898054321',
    specialInstructions: 'Less spicy in pasta, extra dip for fries',
    items: [
      {
        id: 'pa-02-default',
        menuItemId: 'pa-02',
        name: 'Alfredo Pasta',
        category: 'pasta',
        price: 395,
        unit_price: 395,
        quantity: 1,
        selectedOptions: { 'Choice of Pasta': 'Penne' },
      },
      {
        id: 'ap-02-default',
        menuItemId: 'ap-02',
        name: 'Peri-Peri Fries',
        category: 'appetizers',
        price: 300,
        unit_price: 300,
        quantity: 1,
      },
      {
        id: 'ic-03-default',
        menuItemId: 'ic-03',
        name: 'Iced Caramel Macchiato',
        category: 'iced-coffee',
        price: 240,
        unit_price: 240,
        quantity: 1,
      },
    ],
    subtotal: 935,
    tax: 46.75,
    total: 981.75,
    status: 'ORDER_PLACED',
    paymentStatus: 'PENDING',
    createdAt: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
  },
  {
    id: 'VV-1000',
    cafeId: 'vaan-vibes',
    tableId: 'T01',
    tableNumber: 1,
    sessionToken: 'sess_t01_mock_0',
    customerName: 'Rohan Gupta',
    customerMobile: '9904098765',
    items: [
      {
        id: 'sb-01-default',
        menuItemId: 'sb-01',
        name: 'Sunrise Açai Bowl',
        category: 'smoothie-bowls',
        price: 380,
        unit_price: 380,
        quantity: 1,
      },
      {
        id: 'cc-01-default',
        menuItemId: 'cc-01',
        name: 'Signature Cold Brew',
        category: 'cold-coffee',
        price: 210,
        unit_price: 210,
        quantity: 1,
      },
    ],
    subtotal: 590,
    tax: 29.5,
    total: 619.5,
    status: 'COMPLETED',
    paymentStatus: 'PAID',
    createdAt: new Date(Date.now() - 65 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
  },
];

interface GlobalStore {
  orders: Order[];
  tables: TableInfo[];
  isInitialized: boolean;
}

declare global {
  // eslint-disable-next-line no-var
  var __VAAN_VIBES_STORE__: GlobalStore | undefined;
}

if (!global.__VAAN_VIBES_STORE__) {
  global.__VAAN_VIBES_STORE__ = {
    orders: INITIAL_ORDERS,
    tables: INITIAL_TABLES,
    isInitialized: false,
  };
}

const store = global.__VAAN_VIBES_STORE__!;

// Synchronize store with backend in background
export async function syncStoreWithBackend() {
  try {
    const [fetchedOrders, fetchedTables] = await Promise.all([
      ordersApi.getOrders().catch(() => []),
      tablesApi.getTables().catch(() => []),
    ]);

    if (fetchedOrders && fetchedOrders.length > 0) {
      store.orders = fetchedOrders;
    }
    if (fetchedTables && fetchedTables.length > 0) {
      store.tables = fetchedTables;
    }
    store.isInitialized = true;
  } catch {
    // ignore
  }
}

// Subscribe to real-time events on client
if (typeof window !== 'undefined') {
  syncStoreWithBackend();

  wsManager.on('ORDER_CREATED', (order: Order) => {
    const exists = store.orders.some((o) => o.id === order.id);
    if (!exists) {
      store.orders.unshift(order);
    }
  });

  wsManager.on('ORDER_STATUS_UPDATED', (data: { orderId: string; status: OrderStatus }) => {
    const found = store.orders.find((o) => o.id === data.orderId);
    if (found) {
      found.status = data.status;
      found.updatedAt = new Date().toISOString();
    }
  });

  wsManager.on('TABLE_STATUS_UPDATED', (data: { tableId: string; status: any }) => {
    const found = store.tables.find((t) => t.id === data.tableId);
    if (found) {
      found.status = data.status;
    }
  });
}

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
    const table = this.getTable(tableId);
    if (!table) {
      return { valid: false, error: 'Table does not exist. Please scan the QR standee on your table.' };
    }
    if (table.token !== token) {
      return { valid: false, error: 'Invalid or forged QR code token.' };
    }
    return { valid: true, table };
  },

  getAllOrders(): Order[] {
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

  getOrdersBySession(tableId: string, sessionToken: string): Order[] {
    const table = this.getTable(tableId);
    if (!table) return [];
    return store.orders
      .filter((o) => o.tableId === table.id && (!sessionToken || o.sessionToken === sessionToken))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  createOrder(data: {
    tableId: string;
    token?: string;
    sessionToken: string;
    customerName: string;
    customerMobile: string;
    specialInstructions?: string;
    items: CartItem[];
  }): { success: boolean; order?: Order; error?: string } {
    const table = this.getTable(data.tableId);
    if (!table) {
      return { success: false, error: 'Invalid table ID' };
    }

    if (!data.customerName || data.customerName.trim().length < 2) {
      return { success: false, error: 'Customer name must be at least 2 characters' };
    }

    const cleanMobile = (data.customerMobile || '').replace(/\D/g, '');
    if (cleanMobile.length < 10) {
      return { success: false, error: 'Customer mobile must be a valid 10-digit number' };
    }

    if (!data.items || data.items.length === 0) {
      return { success: false, error: 'Order must contain at least one item' };
    }

    // Calculate subtotal
    const subtotal = data.items.reduce((acc, item) => {
      let itemPrice = item.price;
      const originalItem = MENU_ITEMS.find((m) => m.id === item.menuItemId);
      if (originalItem) {
        let calcPrice = originalItem.price;
        if (item.selectedOptions && originalItem.options) {
          Object.entries(item.selectedOptions).forEach(([optName, choiceName]) => {
            const opt = originalItem.options?.find((o) => o.name === optName);
            const choice = opt?.choices.find((c) => c.name === choiceName);
            if (choice?.extraPrice) calcPrice += choice.extraPrice;
          });
        }
        if (item.selectedAddOns && originalItem.addOns) {
          item.selectedAddOns.forEach((addonName) => {
            const addon = originalItem.addOns?.find((a) => a.name === addonName);
            if (addon?.price) calcPrice += addon.price;
          });
        }
        itemPrice = calcPrice;
      }
      return acc + itemPrice * item.quantity;
    }, 0);

    const tax = Math.round(subtotal * CAFE_INFO.taxRate * 100) / 100;
    const total = Math.round((subtotal + tax) * 100) / 100;

    const orderId = `VV-${1000 + store.orders.length + 1}`;
    const now = new Date().toISOString();

    const orderItems: CartItem[] = data.items.map((i) => {
      const uPrice = i.unit_price ?? i.price ?? 0;
      return {
        ...i,
        unit_price: uPrice,
        unitPrice: uPrice,
        price: uPrice,
      };
    });

    const newOrder: Order = {
      id: orderId,
      cafeId: CAFE_INFO.id,
      tableId: table.id,
      tableNumber: table.tableNumber,
      sessionToken: data.sessionToken || `sess_${Date.now()}`,
      customerName: data.customerName,
      customerMobile: data.customerMobile,
      specialInstructions: data.specialInstructions,
      items: orderItems,
      subtotal,
      tax,
      total,
      status: 'ORDER_PLACED',
      paymentStatus: 'PENDING',
      createdAt: now,
      updatedAt: now,
    };

    store.orders.unshift(newOrder);
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

    if (status === 'COMPLETED' || status === 'CANCELLED') {
      const activeForTable = store.orders.some(
        (o) => o.tableId === order.tableId && !['COMPLETED', 'CANCELLED'].includes(o.status)
      );
      if (!activeForTable) {
        const table = this.getTable(order.tableId);
        if (table) table.status = 'AVAILABLE';
      }
    }

    if (typeof window !== 'undefined') {
      ordersApi.updateStatus(orderId, status).catch(() => {});
    }

    return { success: true, order };
  },

  updatePaymentStatus(orderId: string, paymentStatus: PaymentStatus, method = 'CASH'): { success: boolean; order?: Order; error?: string } {
    const order = store.orders.find((o) => o.id === orderId);
    if (!order) {
      return { success: false, error: `Order ${orderId} not found` };
    }
    order.paymentStatus = paymentStatus;
    order.updatedAt = new Date().toISOString();

    if (typeof window !== 'undefined' && paymentStatus === 'PAID') {
      billingApi.settlePayment(orderId, method).catch(() => {});
    }

    return { success: true, order };
  },

  generateBill(orderId: string): BillData | null {
    const order = this.getOrderById(orderId);
    if (!order) return null;

    const cgst = Math.round((order.tax / 2) * 100) / 100;
    const sgst = Math.round((order.tax / 2) * 100) / 100;

    return {
      billNumber: `BILL-${order.id.replace('VV-', '')}-${new Date(order.createdAt).getFullYear()}`,
      orderId: order.id,
      cafe: CAFE_INFO,
      tableNumber: order.tableNumber,
      customerName: order.customerName,
      customerMobile: order.customerMobile,
      specialInstructions: order.specialInstructions,
      items: order.items.map((i) => {
        const uPrice = i.unitPrice ?? i.unit_price ?? i.price ?? 0;
        const lTotal = i.itemTotal ?? i.lineTotal ?? (uPrice * i.quantity);
        return {
          name: i.name,
          quantity: i.quantity,
          unitPrice: uPrice,
          totalPrice: lTotal,
          notes: [
            i.selectedOptions ? Object.values(i.selectedOptions).join(', ') : '',
            i.selectedAddOns ? i.selectedAddOns.join(', ') : '',
            i.specialInstructions || '',
          ]
            .filter(Boolean)
            .join(' | '),
        };
      }),
      subtotal: order.subtotal,
      cgst,
      sgst,
      taxAmount: order.tax,
      total: order.total,
      paymentStatus: order.paymentStatus,
      createdAt: order.createdAt,
    };
  },
};
