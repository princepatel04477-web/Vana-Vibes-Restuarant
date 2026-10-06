'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { CartItem, CustomerDetails, MenuItem, Order, TableInfo } from '@/types/cafe';

interface CartContextType {
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

  placeOrder: () => Promise<{ success: boolean; order?: Order; error?: string }>;
  fetchOrders: () => Promise<void>;
  getItemQuantityInCart: (menuItemId: string) => number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
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

  // Initialize session token & load persisted cart
  useEffect(() => {
    try {
      let token = localStorage.getItem('vv_session_token');
      if (!token) {
        token = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        localStorage.setItem('vv_session_token', token);
      }
      setSessionToken(token);

      const savedCart = localStorage.getItem('vv_cart');
      if (savedCart) {
        setCart(JSON.parse(savedCart));
      }

      const savedCustomer = localStorage.getItem('vv_customer');
      if (savedCustomer) {
        setCustomerDetails(JSON.parse(savedCustomer));
      }
    } catch {
      // LocalStorage unavailable in SSR or private mode fallback
    }
  }, []);

  // Save cart changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('vv_cart', JSON.stringify(cart));
    } catch {
      // ignore
    }
  }, [cart]);

  // Save customer details
  useEffect(() => {
    try {
      if (customerDetails.name || customerDetails.mobile) {
        localStorage.setItem('vv_customer', JSON.stringify(customerDetails));
      }
    } catch {
      // ignore
    }
  }, [customerDetails]);

  const setTable = useCallback((tableInfo: TableInfo) => {
    setTableState(tableInfo);
    try {
      localStorage.setItem('vv_table', JSON.stringify(tableInfo));
    } catch {
      // ignore
    }
  }, []);

  // Poll orders for the table & session
  const fetchOrders = useCallback(async () => {
    if (!table?.id) return;
    try {
      const res = await fetch(`/api/orders?tableId=${table.id}&sessionToken=${sessionToken}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.orders) {
        const orders: Order[] = data.orders;
        const active = orders.filter((o) => !['COMPLETED', 'CANCELLED'].includes(o.status));
        const previous = orders.filter((o) => ['COMPLETED', 'CANCELLED'].includes(o.status));
        setActiveOrders(active);
        setPreviousOrders(previous);
      }
    } catch {
      // network hiccup
    }
  }, [table?.id, sessionToken]);

  // Periodic poll for order status updates
  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 4000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  const addItem = useCallback(
    (
      item: MenuItem,
      quantity = 1,
      selectedOptions?: { [key: string]: string },
      selectedAddOns?: string[],
      specialInstructions?: string
    ) => {
      // Calculate unit price with add-ons
      let finalPrice = item.price;
      if (selectedAddOns && selectedAddOns.length > 0 && item.addOns) {
        for (const addOnName of selectedAddOns) {
          const matched = item.addOns.find((a) => a.name === addOnName);
          if (matched) finalPrice += matched.price;
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

  const tax = useMemo(() => Math.round(subtotal * 0.05 * 100) / 100, [subtotal]);

  const total = useMemo(() => Math.round((subtotal + tax) * 100) / 100, [subtotal, tax]);

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

    if (!customerDetails.name || customerDetails.name.trim().length < 2) {
      const err = 'Please enter your full name.';
      setOrderError(err);
      return { success: false, error: err };
    }

    const cleanMobile = customerDetails.mobile.replace(/\D/g, '');
    if (cleanMobile.length < 10) {
      const err = 'Please enter a valid 10-digit mobile number.';
      setOrderError(err);
      return { success: false, error: err };
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
          sessionToken,
          customerName: customerDetails.name.trim(),
          customerMobile: cleanMobile,
          specialInstructions: customerDetails.specialInstructions,
          items: cart,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        const errorMsg = data.error || 'Failed to place order';
        setOrderError(errorMsg);
        setIsPlacingOrder(false);
        return { success: false, error: errorMsg };
      }

      // Order created successfully!
      clearCart();
      setIsCheckoutOpen(false);
      setIsCartOpen(false);
      setIsOrdersOpen(true);
      await fetchOrders();
      setIsPlacingOrder(false);

      return { success: true, order: data.order };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Network error placing order';
      setOrderError(errorMsg);
      setIsPlacingOrder(false);
      return { success: false, error: errorMsg };
    }
  }, [table, cart, customerDetails, sessionToken, clearCart, fetchOrders]);

  return (
    <CartContext.Provider
      value={{
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
      }}
    >
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
