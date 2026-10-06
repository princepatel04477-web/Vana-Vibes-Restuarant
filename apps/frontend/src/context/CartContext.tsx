'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef, useSyncExternalStore } from 'react';
import { MenuCategory, CartItem, CustomerDetails, MenuItem, Order, TableInfo } from '@/types/cafe';
import { MENU_ITEMS, MENU_CATEGORIES } from '@/data/vaan-vibes-menu';
import { envConfig } from '@/config/env';

const emptySubscribe = () => () => {};

interface CartContextType {
  isHydrated: boolean;
  cart: CartItem[];
  table: TableInfo | null;
  sessionToken: string;
  customerDetails: CustomerDetails;
  activeOrders: Order[];
  previousOrders: Order[];
  isCartOpen: boolean;
  isCheckoutOpen: boolean;
  isOrdersOpen: boolean;
  isSearchOpen: boolean;
  activeCategory: string;
  searchQuery: string;
  isPlacingOrder: boolean;
  orderError: string | null;

  menuItems: MenuItem[];
  categories: MenuCategory[];
  refetchMenu: () => Promise<void>;

  setTable: (table: TableInfo) => void;
  addItem: (
    item: MenuItem,
    quantity?: number,
    selectedOptions?: { [key: string]: string },
    selectedAddOns?: string[],
    specialInstructions?: string
  ) => void;
  updateQuantity: (cartItemId: string, quantity: number) => void;
  removeItem: (cartItemId: string) => void;
  clearCart: () => void;
  setCustomerDetails: React.Dispatch<React.SetStateAction<CustomerDetails>>;
  setIsCartOpen: (open: boolean) => void;
  setIsCheckoutOpen: (open: boolean) => void;
  setIsOrdersOpen: (open: boolean) => void;
  setIsSearchOpen: (open: boolean) => void;
  setActiveCategory: (category: string) => void;
  setSearchQuery: (query: string) => void;

  itemCount: number;
  subtotal: number;
  tax: number;
  total: number;

  placeOrder: () => Promise<{ success: boolean; order?: Order; error?: string; fieldErrors?: Record<string, string> }>;
  fetchOrders: () => Promise<void>;
  getItemQuantityInCart: (menuItemId: string) => number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

function areOrdersEqual(a: Order[], b: Order[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const o1 = a[i];
    const o2 = b[i];
    if (
      o1.id !== o2.id ||
      o1.status !== o2.status ||
      o1.paymentStatus !== o2.paymentStatus ||
      o1.billGenerated !== o2.billGenerated ||
      o1.total !== o2.total ||
      o1.updatedAt !== o2.updatedAt
    ) {
      return false;
    }
  }
  return true;
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const isHydrated = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const [cart, setCart] = useState<CartItem[]>([]);
  const [table, setTableState] = useState<TableInfo | null>(null);
  const [sessionToken, setSessionToken] = useState<string>('');
  const [customerDetails, setCustomerDetails] = useState<CustomerDetails>({
    name: '',
    mobile: '',
    specialInstructions: '',
  });

  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [previousOrders, setPreviousOrders] = useState<Order[]>([]);

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isOrdersOpen, setIsOrdersOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);

  const isInitialMount = useRef(true);

  // Load persisted state from localStorage safely on mount (client-only)
  useEffect(() => {
    try {
      const savedCart = localStorage.getItem('vv_cart');
      if (savedCart) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setCart(JSON.parse(savedCart));
      }
    } catch {
      // ignore
    }

    try {
      const savedTable = localStorage.getItem('vv_table');
      if (savedTable) {
        setTableState(JSON.parse(savedTable));
      }
    } catch {
      // ignore
    }

    try {
      let token = localStorage.getItem('vv_session_token');
      if (!token) {
        token = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        localStorage.setItem('vv_session_token', token);
      }
      setSessionToken(token);
    } catch {
      // ignore
    }

    try {
      const savedCustomer = localStorage.getItem('vv_customer');
      if (savedCustomer) {
        setCustomerDetails(JSON.parse(savedCustomer));
      }
    } catch {
      // ignore
    }

    isInitialMount.current = false;
  }, []);

  // Save cart changes to localStorage (skip first mount to prevent wiping stored cart)
  useEffect(() => {
    if (isInitialMount.current) return;
    try {
      localStorage.setItem('vv_cart', JSON.stringify(cart));
    } catch {
      // ignore
    }
  }, [cart]);

  // Save customer details
  useEffect(() => {
    if (isInitialMount.current) return;
    try {
      if (customerDetails.name || customerDetails.mobile) {
        localStorage.setItem('vv_customer', JSON.stringify(customerDetails));
      }
    } catch {
      // ignore
    }
  }, [customerDetails]);

  const setTable = useCallback((tableInfo: TableInfo) => {
    setTableState((prev) => {
      if (
        prev &&
        prev.id === tableInfo.id &&
        prev.tableNumber === tableInfo.tableNumber &&
        prev.status === tableInfo.status &&
        prev.token === tableInfo.token
      ) {
        return prev;
      }
      return tableInfo;
    });
    try {
      localStorage.setItem('vv_table', JSON.stringify(tableInfo));
    } catch {
      // ignore
    }
  }, []);

  // Poll orders for the table & session
  const tableId = table?.id;
  const fetchOrders = useCallback(async () => {
    if (!tableId) return;
    try {
      const res = await fetch(`/api/orders?tableId=${tableId}&sessionToken=${sessionToken}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.orders) {
        const orders: Order[] = data.orders;
        const unbilledOrders = orders.filter(
          (o) => !o.billGenerated && o.sessionStatus !== 'BILL_GENERATED' && o.sessionStatus !== 'CLOSED'
        );
        const active = unbilledOrders.filter(
          (o) => !['COMPLETED', 'CANCELLED'].includes(o.status)
        );
        const previous = unbilledOrders.filter(
          (o) => ['COMPLETED', 'CANCELLED'].includes(o.status)
        );
        setActiveOrders((prev) => (areOrdersEqual(prev, active) ? prev : active));
        setPreviousOrders((prev) => (areOrdersEqual(prev, previous) ? prev : previous));
      }
    } catch {
      // network hiccup
    }
  }, [tableId, sessionToken]);

  // Stable ref for fetchOrders so it doesn't trigger WebSocket re-connections
  const fetchOrdersRef = useRef(fetchOrders);
  useEffect(() => {
    fetchOrdersRef.current = fetchOrders;
  }, [fetchOrders]);

  // Periodic poll for order status updates as fallback to WebSocket
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchOrdersRef.current();
    }, 100);
    const interval = setInterval(() => {
      fetchOrdersRef.current();
    }, 15000);
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, []);

  // Dynamic Menu Catalog & Categories from Backend
  const [menuItems, setMenuItems] = useState<MenuItem[]>(MENU_ITEMS);
  const [categories, setCategories] = useState<MenuCategory[]>(MENU_CATEGORIES);

  const refetchMenu = useCallback(async () => {
    try {
      const res = await fetch('/api/menu');
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.items) && data.items.length > 0) {
        setMenuItems((prev) => {
          if (
            prev.length === data.items.length &&
            prev.every(
              (it, idx) =>
                it.id === data.items[idx].id &&
                it.isAvailable === data.items[idx].isAvailable &&
                it.price === data.items[idx].price
            )
          ) {
            return prev;
          }
          return data.items;
        });
      }
      if (Array.isArray(data.categories) && data.categories.length > 0) {
        setCategories((prev) => {
          if (
            prev.length === data.categories.length &&
            prev.every((c, idx) => c.id === data.categories[idx].id)
          ) {
            return prev;
          }
          return data.categories;
        });
      }
    } catch {
      // offline fallback
    }
  }, []);

  // Sync menu on initial mount and whenever browser window regains focus
  useEffect(() => {
    const timer = setTimeout(() => {
      refetchMenu();
    }, 0);

    const handleFocus = () => {
      refetchMenu();
    };
    window.addEventListener('focus', handleFocus);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('focus', handleFocus);
    };
  }, [refetchMenu]);

  // Live WebSocket connection to push real-time availability/edit/delete changes
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let socket: WebSocket | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;
    let isMounted = true;

    const connectWs = () => {
      if (!isMounted) return;

      try {
        const tableQuery = table?.id ? `?table_id=${encodeURIComponent(table.id)}` : '';
        const wsUrl = `${envConfig.getWebSocketUrl()}${tableQuery}`;

        // Prevent opening duplicate sockets if one is already open or connecting
        if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
          return;
        }

        socket = new WebSocket(wsUrl);

        socket.onmessage = (event) => {
          try {
            const parsed = JSON.parse(event.data);
            if (!parsed?.event) return;

            if (parsed.event === 'MENU_AVAILABILITY_CHANGED') {
              const itemId = parsed.data?.itemId || parsed.data?.id;
              const isAvailable = parsed.data?.isAvailable;
              if (itemId !== undefined && isAvailable !== undefined) {
                setMenuItems((prev) =>
                  prev.map((item) => (item.id === itemId ? { ...item, isAvailable } : item))
                );
              }
            } else if (parsed.event === 'MENU_ITEM_UPDATED') {
              const updatedItem = parsed.data;
              if (updatedItem?.id) {
                setMenuItems((prev) =>
                  prev.map((item) => (item.id === updatedItem.id ? { ...item, ...updatedItem } : item))
                );
              }
            } else if (parsed.event === 'MENU_ITEM_DELETED') {
              const itemId = parsed.data?.itemId || parsed.data?.id;
              if (itemId) {
                setMenuItems((prev) => prev.filter((item) => item.id !== itemId));
              }
            } else if (
              parsed.event === 'BILL_GENERATED' ||
              parsed.event === 'PAYMENT_SETTLED' ||
              (parsed.event === 'TABLE_STATUS_UPDATED' && parsed.data?.status === 'AVAILABLE')
            ) {
              const eventTableId = parsed.data?.tableId || parsed.tableId;
              if (!eventTableId || !table?.id || eventTableId === table.id) {
                // Real-time bill generation event: immediately clear all active and previous orders
                setActiveOrders([]);
                setPreviousOrders([]);
                fetchOrdersRef.current();
              }
            } else if (
              parsed.event === 'ORDER_STATUS_UPDATED' ||
              parsed.event === 'ORDER_PLACED' ||
              parsed.event === 'ORDER_ACCEPTED' ||
              parsed.event === 'ORDER_CANCELLED' ||
              parsed.event === 'TABLE_STATUS_UPDATED'
            ) {
              const eventTableId = parsed.data?.tableId || parsed.tableId;
              if (!eventTableId || !table?.id || eventTableId === table.id) {
                fetchOrdersRef.current();
              }
            }
          } catch {
            // ignore non-json
          }
        };

        socket.onclose = () => {
          if (isMounted) {
            reconnectTimeout = setTimeout(connectWs, 3000);
          }
        };

        socket.onerror = () => {
          // Let onclose handle reconnection; do NOT manually close to prevent premature aborts while connecting
        };
      } catch {
        if (isMounted) {
          reconnectTimeout = setTimeout(connectWs, 5000);
        }
      }
    };

    connectWs();

    return () => {
      isMounted = false;
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
        reconnectTimeout = null;
      }
      if (socket) {
        socket.onmessage = null;
        socket.onerror = null;
        socket.onclose = null;
        if (socket.readyState === WebSocket.OPEN) {
          socket.close(1000, 'Unmounted');
        } else if (socket.readyState === WebSocket.CONNECTING) {
          // If still establishing handshake, close cleanly once open to avoid browser abort warning
          const s = socket;
          s.onopen = () => {
            try {
              s.close(1000, 'Unmounted');
            } catch {
              // ignore
            }
          };
        }
        socket = null;
      }
    };
  }, [table?.id]);

  const addItem = useCallback(
    (
      item: MenuItem,
      quantity = 1,
      selectedOptions?: { [key: string]: string },
      selectedAddOns?: string[],
      specialInstructions?: string
    ) => {
      // Guard against adding unavailable items
      if (item.isAvailable === false) {
        return;
      }

      // Calculate unit price with add-ons
      let finalPrice = item.price;
      if (selectedAddOns && selectedAddOns.length > 0 && item.addOns) {
        for (const addOnName of selectedAddOns) {
          const matched = item.addOns.find((a) => a.name === addOnName);
          if (matched) {
            finalPrice += matched.price;
          }
        }
      }

      // Unique key based on menuItemId and selected options
      const optionKey = selectedOptions ? JSON.stringify(selectedOptions) : '';
      const addonKey = selectedAddOns ? selectedAddOns.sort().join(',') : '';
      const cartItemId = `${item.id}-${optionKey}-${addonKey}`;

      setCart((prev) => {
        const existingIndex = prev.findIndex((ci) => ci.id === cartItemId);
        if (existingIndex > -1) {
          const updated = [...prev];
          updated[existingIndex].quantity += quantity;
          return updated;
        }
        return [
          ...prev,
          {
            id: cartItemId,
            menuItemId: item.id,
            name: item.name,
            category: item.category,
            price: finalPrice,
            quantity,
            selectedOptions,
            selectedAddOns,
            specialInstructions,
          },
        ];
      });
    },
    []
  );

  const updateQuantity = useCallback((cartItemId: string, quantity: number) => {
    setCart((prev) => {
      if (quantity <= 0) {
        return prev.filter((item) => item.id !== cartItemId);
      }
      return prev.map((item) => (item.id === cartItemId ? { ...item, quantity } : item));
    });
  }, []);

  const removeItem = useCallback((cartItemId: string) => {
    setCart((prev) => prev.filter((item) => item.id !== cartItemId));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
    try {
      localStorage.removeItem('vv_cart');
    } catch {
      // ignore
    }
  }, []);

  const itemCount = useMemo(() => cart.reduce((acc, item) => acc + item.quantity, 0), [cart]);

  const subtotal = useMemo(
    () => cart.reduce((acc, item) => acc + item.price * item.quantity, 0),
    [cart]
  );

  const tax = 0;

  const total = useMemo(() => Math.round(subtotal * 100) / 100, [subtotal]);

  const getItemQuantityInCart = useCallback(
    (menuItemId: string) => {
      return cart
        .filter((i) => i.menuItemId === menuItemId)
        .reduce((sum, i) => sum + i.quantity, 0);
    },
    [cart]
  );

  const placeOrder = useCallback(async () => {
    if (!table) {
      const err = 'Table session not verified. Please rescan table QR.';
      setOrderError(err);
      return { success: false, error: err };
    }

    if (cart.length === 0) {
      const err = 'Your cart is empty.';
      setOrderError(err);
      return { success: false, error: err };
    }

    const trimmedName = customerDetails.name ? customerDetails.name.trim() : '';
    if (!trimmedName || trimmedName.length < 2) {
      const err = 'Please enter your full name (minimum 2 characters).';
      setOrderError(err);
      return { success: false, error: err, fieldErrors: { name: err } };
    }

    const cleanMobile = (customerDetails.mobile || '').trim();
    if (!/^\d{10}$/.test(cleanMobile)) {
      const err = 'Phone number must contain exactly 10 digits';
      setOrderError(err);
      return { success: false, error: err, fieldErrors: { mobile: err } };
    }

    setIsPlacingOrder(true);
    setOrderError(null);

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableId: table.id,
          token: table.token,
          diningSessionId: table.activeSession?.id,
          sessionToken,
          customerName: trimmedName,
          customerMobile: cleanMobile,
          specialInstructions: customerDetails.specialInstructions,
          items: cart,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        const errorMsg = data.message || data.error || 'Failed to place order';
        const rawFieldErrors =
          data.fieldErrors ||
          (Array.isArray(data.errors)
            ? Object.fromEntries(
                data.errors
                  .filter((e: { field?: string; message?: string }) => e && e.field)
                  .map((e: { field?: string; message?: string }) => [e.field || '', e.message || ''])
              )
            : {});

        const fieldErrors: Record<string, string> = {};
        for (const [key, val] of Object.entries(rawFieldErrors)) {
          if (key === 'customerMobile' || key === 'customer_mobile') {
            fieldErrors['mobile'] = String(val);
          } else if (key === 'customerName' || key === 'customer_name') {
            fieldErrors['name'] = String(val);
          } else {
            fieldErrors[key] = String(val);
          }
        }

        setOrderError(errorMsg);
        setIsPlacingOrder(false);
        return { success: false, error: errorMsg, fieldErrors };
      }

      // Order created successfully!
      if (data.order?.sessionToken && data.order.sessionToken !== sessionToken) {
        setSessionToken(data.order.sessionToken);
        try {
          localStorage.setItem('vv_session_token', data.order.sessionToken);
        } catch {
          // ignore
        }
      }

      clearCart();
      setIsCheckoutOpen(false);
      setIsCartOpen(false);
      setIsOrdersOpen(true);
      await fetchOrders();
      setIsPlacingOrder(false);

      return { success: true, order: data.order };
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error && !err.message.includes('fetch')
          ? err.message
          : 'Unable to connect to the server. Please try again.';
      setOrderError(errorMsg);
      setIsPlacingOrder(false);
      return { success: false, error: errorMsg };
    }
  }, [table, cart, customerDetails, sessionToken, clearCart, fetchOrders]);

  const contextValue = useMemo<CartContextType>(
    () => ({
      isHydrated,
      cart,
      table,
      sessionToken,
      customerDetails,
      activeOrders,
      previousOrders,
      isCartOpen,
      isCheckoutOpen,
      isOrdersOpen,
      isSearchOpen,
      activeCategory,
      searchQuery,
      isPlacingOrder,
      orderError,
      menuItems,
      categories,
      refetchMenu,
      setTable,
      addItem,
      updateQuantity,
      removeItem,
      clearCart,
      setCustomerDetails,
      setIsCartOpen,
      setIsCheckoutOpen,
      setIsOrdersOpen,
      setIsSearchOpen,
      setActiveCategory,
      setSearchQuery,
      itemCount,
      subtotal,
      tax,
      total,
      placeOrder,
      fetchOrders,
      getItemQuantityInCart,
    }),
    [
      isHydrated,
      cart,
      table,
      sessionToken,
      customerDetails,
      activeOrders,
      previousOrders,
      isCartOpen,
      isCheckoutOpen,
      isOrdersOpen,
      isSearchOpen,
      activeCategory,
      searchQuery,
      isPlacingOrder,
      orderError,
      menuItems,
      categories,
      refetchMenu,
      setTable,
      addItem,
      updateQuantity,
      removeItem,
      clearCart,
      setCustomerDetails,
      itemCount,
      subtotal,
      tax,
      total,
      placeOrder,
      fetchOrders,
      getItemQuantityInCart,
    ]
  );

  return (
    <CartContext.Provider value={contextValue}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
