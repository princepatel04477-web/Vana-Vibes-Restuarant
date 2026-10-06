'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { StationTicketCard } from '@/components/orders/StationTicketCard';
import { Order, OrderStatus } from '@/types/cafe';
import { ordersApi } from '@/api/orders';
import { wsManager } from '@/services/websocket/WebSocketManager';
import { isBeverageOrDessertItem } from '@/lib/order-classification';
import {
  Coffee,
  Bell,
  BellOff,
  Printer,
  Calendar,
  Search,
  Sparkles,
  RefreshCw,
  Clock,
} from 'lucide-react';

export default function KotBeveragePage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [chimeEnabled, setChimeEnabled] = useState(true);
  const [activeTab, setActiveTab] = useState<'live' | 'completed'>('live');
  const [searchQuery, setSearchQuery] = useState('');

  const playChime = useCallback(() => {
    if (!chimeEnabled || typeof window === 'undefined') return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
      osc.frequency.exponentialRampToValueAtTime(880.0, ctx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch {
      // Audio context may be restricted before gesture
    }
  }, [chimeEnabled]);

  const loadOrders = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const all = await ordersApi.getOrders();
      setOrders(all);
    } catch (err) {
      console.error('Failed to load orders for KOT:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();

    const handleNewOrder = (newOrder: Order) => {
      setOrders((prev) => {
        if (prev.some((o) => o.id === newOrder.id)) return prev;
        return [newOrder, ...prev];
      });
      playChime();
    };

    const unsubPlaced = wsManager.on('ORDER_PLACED', handleNewOrder);
    const unsubCreated = wsManager.on('ORDER_CREATED', handleNewOrder);

    const handleStatusTransition = (data: {
      orderId?: string;
      order_id?: string;
      status: OrderStatus;
      updatedAt?: string;
      updated_at?: string;
    }) => {
      const id = data.orderId || data.order_id;
      const st = data.status;
      const upd = data.updatedAt || data.updated_at || new Date().toISOString();
      if (!id) return;
      setOrders((prev) =>
        prev.map((o) => (o.id === id ? { ...o, status: st, updatedAt: upd } : o))
      );
    };

    const unsubAccepted = wsManager.on('ORDER_ACCEPTED', handleStatusTransition);
    const unsubServed = wsManager.on('ORDER_SERVED', handleStatusTransition);
    const unsubCompleted = wsManager.on('ORDER_COMPLETED', handleStatusTransition);
    const unsubUpdated = wsManager.on('ORDER_STATUS_UPDATED', handleStatusTransition);

    const interval = setInterval(loadOrders, 10000);
    return () => {
      clearInterval(interval);
      unsubPlaced();
      unsubCreated();
      unsubAccepted();
      unsubServed();
      unsubCompleted();
      unsubUpdated();
    };
  }, [loadOrders, playChime]);

  const handleMarkDone = async (orderId: string) => {
    try {
      await ordersApi.updateStatus(orderId, 'SERVED');
    } catch {
      // Fallback: try completeOrder or accept
      try {
        await ordersApi.completeOrder(orderId);
      } catch (e) {
        console.error('Failed to mark KOT done:', e);
      }
    }
    loadOrders();
  };

  // Filter orders containing BEVERAGE or DESSERT items
  const beverageOrders = useMemo(() => {
    return orders
      .map((order) => {
        const beverageItems = order.items.filter((item) => isBeverageOrDessertItem(item));
        return {
          ...order,
          items: beverageItems,
        };
      })
      .filter((order) => order.items.length > 0);
  }, [orders]);

  // Separate pending vs completed
  const pendingTickets = beverageOrders.filter(
    (o) => o.status === 'PLACED' || o.status === 'ORDER_PLACED' || o.status === 'ACCEPTED'
  );
  const completedTickets = beverageOrders.filter(
    (o) => o.status === 'SERVED' || o.status === 'COMPLETED'
  );

  const displayedTickets = (activeTab === 'live' ? pendingTickets : completedTickets).filter((o) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      o.id.toLowerCase().includes(q) ||
      `table ${o.tableNumber}`.toLowerCase().includes(q) ||
      (o.customerName && o.customerName.toLowerCase().includes(q)) ||
      o.items.some((i) => i.name.toLowerCase().includes(q))
    );
  });

  const handlePrintAll = () => {
    if (pendingTickets.length === 0) {
      alert('No active KOT tickets to print');
      return;
    }
    window.print();
  };

  return (
    <AppLayout requiredRole="CHEF">
      <div className="space-y-6">
        {/* Banner Strip (Matches User Screenshot 1) */}
        <div className="p-4 sm:p-5 rounded-2xl bg-brand-green text-brand-beige shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-brand-gold text-brand-green flex items-center justify-center text-xl font-black shadow-xs shrink-0">
              <Coffee className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-xl font-black tracking-tight text-brand-beige">
                  Kitchen Order Tickets (KOT)
                </h1>
                <span className="text-[10px] uppercase font-black tracking-wider px-2.5 py-0.5 rounded-full bg-brand-gold text-brand-green">
                  BEVERAGE & DESSERT LINE
                </span>
              </div>
              <p className="text-xs text-brand-beige-muted mt-0.5">
                Barista station display: Coffees, Shakes, Frappes, Manual Brews & Desserts
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap self-end md:self-auto">
            <button
              type="button"
              onClick={handlePrintAll}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-brand-green-light hover:bg-brand-green-surface text-brand-beige text-xs font-bold transition-all border border-brand-green-light hover:border-brand-gold/40 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print All KOTs ({pendingTickets.length})</span>
            </button>

            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-brand-green-light text-brand-beige text-xs font-bold border border-brand-green-light">
              <Calendar className="w-3.5 h-3.5 text-brand-gold" />
              <span>Today</span>
            </div>

            <button
              type="button"
              onClick={() => setChimeEnabled(!chimeEnabled)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                chimeEnabled
                  ? 'bg-brand-gold text-brand-green'
                  : 'bg-brand-green-light text-brand-beige'
              }`}
            >
              {chimeEnabled ? <Bell className="w-3.5 h-3.5" /> : <BellOff className="w-3.5 h-3.5" />}
              <span>{chimeEnabled ? 'Chime ON' : 'Muted'}</span>
            </button>

            <button
              type="button"
              onClick={loadOrders}
              disabled={isRefreshing}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-brand-green-light hover:bg-brand-green-surface text-brand-beige text-xs font-bold transition-all cursor-pointer"
              title="Refresh KOT Tickets"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Tab & Search Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('live')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeTab === 'live'
                  ? 'bg-brand-green text-brand-beige shadow-xs'
                  : 'bg-white text-brand-green/70 hover:bg-brand-beige border border-brand-beige-dark'
              }`}
            >
              Live KOT Tickets ({pendingTickets.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('completed')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeTab === 'completed'
                  ? 'bg-brand-green text-brand-beige shadow-xs'
                  : 'bg-white text-brand-green/70 hover:bg-brand-beige border border-brand-beige-dark'
              }`}
            >
              Completed Tickets ({completedTickets.length})
            </button>
          </div>

          <div className="relative min-w-[260px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-brand-green/40" />
            <input
              type="text"
              placeholder="Search table, order, item..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white rounded-xl border border-brand-beige-dark text-xs focus:outline-none focus:border-brand-gold"
            />
          </div>
        </div>

        {/* Section Header */}
        <div className="flex items-center justify-between pb-1 border-b border-brand-beige-dark">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <h2 className="text-xs font-black uppercase tracking-wider text-brand-green">
              {activeTab === 'live'
                ? 'PENDING BEVERAGE & DESSERT PREPARATION'
                : 'COMPLETED BEVERAGE & DESSERT TICKETS'}
            </h2>
          </div>
          <span className="text-xs font-mono font-bold text-brand-green bg-brand-beige px-2 py-0.5 rounded-full">
            {displayedTickets.length}
          </span>
        </div>

        {/* KOT Tickets Grid */}
        {displayedTickets.length === 0 ? (
          <div className="p-12 rounded-2xl bg-white border border-brand-beige-dark text-center space-y-2">
            <Coffee className="w-10 h-10 text-brand-green/30 mx-auto" />
            <p className="text-sm font-bold text-brand-green">
              {activeTab === 'live'
                ? 'No pending beverage & dessert tickets'
                : 'No completed tickets found'}
            </p>
            <p className="text-xs text-brand-green/60">
              {activeTab === 'live'
                ? 'New drinks, barista orders, and desserts will appear here in real time.'
                : 'Prepared tickets will be recorded here.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {displayedTickets.map((order) => (
              <StationTicketCard
                key={order.id}
                orderId={order.id}
                tableNumber={order.tableNumber}
                customerName={order.customerName}
                customerMobile={order.customerMobile}
                createdAt={order.createdAt}
                items={order.items}
                stationType="BARISTA"
                specialInstructions={order.specialInstructions}
                onDone={() => handleMarkDone(order.id)}
                isCompleted={activeTab === 'completed'}
              />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
