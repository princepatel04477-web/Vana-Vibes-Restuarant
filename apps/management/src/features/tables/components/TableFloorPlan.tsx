'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { TableInfo, Order, TableStatus } from '@/types/cafe';
import { BillModal } from '@/features/billing/components/BillModal';
import { KotPrintModal } from '@/features/orders/components/KotPrintModal';
import { tablesApi } from '@/api/tables';
import { QrCodePreview } from '@/components/ui/QrCodePreview';
import {
  Users,
  Clock,
  Receipt,
  Utensils,
  Plus,
  ArrowRightLeft,
  X,
  Printer,
  Copy,
  Check,
  CheckCircle2,
  RefreshCw,
  Search,
} from 'lucide-react';

interface Props {
  tables: TableInfo[];
  orders: Order[];
  onRefresh: () => void;
  onOpenSwipeModal: (sourceId?: string) => void;
  onOpenAddModal: () => void;
  qrBaseUrl: string;
}

export type TableVisualState = 'AVAILABLE' | 'OCCUPIED' | 'KITCHEN' | 'BILLED';

export function TableFloorPlan({
  tables,
  orders,
  onRefresh,
  onOpenSwipeModal,
  onOpenAddModal,
  qrBaseUrl,
}: Props) {
  const [selectedSection, setSelectedSection] = useState<string>('A/C');
  const [statusFilter, setStatusFilter] = useState<'ALL' | TableVisualState>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTableModal, setActiveTableModal] = useState<TableInfo | null>(null);
  const [billModalOrderId, setBillModalOrderId] = useState<string | null>(null);
  const [kotModalOrder, setKotModalOrder] = useState<Order | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [standeeModalTable, setStandeeModalTable] = useState<TableInfo | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(0);

  useEffect(() => {
    setCurrentTime(Date.now());
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Group orders by table ID
  const tableOrdersMap = useMemo(() => {
    const map = new Map<string, Order[]>();
    for (const order of orders) {
      if (!order.tableId) continue;
      const list = map.get(order.tableId) || [];
      list.push(order);
      map.set(order.tableId, list);
    }
    return map;
  }, [orders]);

  // Determine computed status for each table
  const getTableState = useCallback(
    (table: TableInfo): TableVisualState => {
      const tOrders = tableOrdersMap.get(table.id) || [];
      const activeOrders = tOrders.filter((o) => o.paymentStatus !== 'PAID');

      if (activeOrders.some((o) => o.billGenerated || o.sessionStatus === 'BILL_GENERATED')) {
        return 'BILLED';
      }
      if (
        activeOrders.some((o) =>
          ['ORDER_PLACED', 'ACCEPTED', 'PREPARING', 'IN_KITCHEN'].includes(o.status)
        )
      ) {
        return 'KITCHEN';
      }
      if (table.status === 'OCCUPIED' || activeOrders.length > 0) {
        return 'OCCUPIED';
      }
      return 'AVAILABLE';
    },
    [tableOrdersMap]
  );

  // Distinct sections
  const sections = useMemo(() => {
    const set = new Set<string>();
    for (const t of tables) {
      set.add(t.section || (t.tableNumber <= 28 ? 'A/C' : 'Non-A/C'));
    }
    return ['A/C', ...Array.from(set).filter((s) => s !== 'A/C')];
  }, [tables]);

  // Filtered tables
  const filteredTables = useMemo(() => {
    return tables.filter((t) => {
      const tSection = t.section || (t.tableNumber <= 28 ? 'A/C' : 'Non-A/C');
      if (selectedSection !== 'ALL' && tSection !== selectedSection) {
        return false;
      }

      const st = getTableState(t);
      if (statusFilter !== 'ALL' && st !== statusFilter) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const numMatch = t.tableNumber.toString().includes(q);
        const nameMatch = t.name.toLowerCase().includes(q);
        return numMatch || nameMatch;
      }

      return true;
    });
  }, [tables, selectedSection, statusFilter, searchQuery, getTableState]);

  // Statistics for the current section or all tables
  const stats = useMemo(() => {
    const scopedTables =
      selectedSection === 'ALL'
        ? tables
        : tables.filter(
            (t) => (t.section || (t.tableNumber <= 28 ? 'A/C' : 'Non-A/C')) === selectedSection
          );

    let available = 0;
    let occupied = 0;
    let kitchen = 0;
    let billed = 0;

    for (const t of scopedTables) {
      const st = getTableState(t);
      if (st === 'AVAILABLE') available++;
      else if (st === 'OCCUPIED') occupied++;
      else if (st === 'KITCHEN') kitchen++;
      else if (st === 'BILLED') billed++;
    }

    return {
      total: scopedTables.length,
      available,
      occupied,
      kitchen,
      billed,
    };
  }, [tables, selectedSection, getTableState]);

  const handleTableClick = (table: TableInfo) => {
    setActiveTableModal(table);
  };

  const handleToggleTableOccupied = async (table: TableInfo) => {
    try {
      setIsUpdatingStatus(true);
      const nextStatus: TableStatus = table.status === 'AVAILABLE' ? 'OCCUPIED' : 'AVAILABLE';
      await tablesApi.updateStatus(table.id, nextStatus);
      setActiveTableModal((prev) => (prev ? { ...prev, status: nextStatus } : null));
      onRefresh();
    } catch (err) {
      console.error('Failed to update table status:', err);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleClearTable = async (table: TableInfo) => {
    try {
      setIsUpdatingStatus(true);
      await tablesApi.clearTable(table.id);
      setActiveTableModal(null);
      onRefresh();
    } catch (err) {
      console.error('Failed to clear table:', err);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleCopyCustomerLink = (table: TableInfo) => {
    const url = `${qrBaseUrl.replace(/\/+$/, '')}/cafe/van-vibes?table=${table.id}&token=${table.token}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Get active order details for modal
  const selectedTableOrders = activeTableModal
    ? (tableOrdersMap.get(activeTableModal.id) || []).filter((o) => o.paymentStatus !== 'PAID')
    : [];

  const activeBillOrder = selectedTableOrders[0];
  const totalAmount = selectedTableOrders.reduce((sum, o) => sum + (o.total || 0), 0);

  return (
    <div className="space-y-5">
      {/* 1. Header Toolbar & Section Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-brand-beige-dark/60 pb-4">
        {/* Section Title & Area Switcher */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-white p-1 rounded-xl border border-brand-beige-dark shadow-2xs">
            <button
              type="button"
              onClick={() => setSelectedSection('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-colors cursor-pointer ${
                selectedSection === 'ALL'
                  ? 'bg-brand-green text-brand-beige shadow-xs'
                  : 'text-brand-green/70 hover:text-brand-green hover:bg-brand-beige-light'
              }`}
            >
              All Areas
            </button>
            {sections.map((sec) => (
              <button
                key={sec}
                type="button"
                onClick={() => setSelectedSection(sec)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-colors cursor-pointer ${
                  selectedSection === sec
                    ? 'bg-brand-green text-brand-beige shadow-xs'
                    : 'text-brand-green/70 hover:text-brand-green hover:bg-brand-beige-light'
                }`}
              >
                {sec}
              </button>
            ))}
          </div>

          <span className="text-xs font-black text-brand-green/40 px-1 hidden sm:inline">•</span>

          {/* Search Table */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-brand-green/40 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Find table..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-white border border-brand-beige-dark rounded-xl text-xs text-brand-green placeholder:text-brand-green/40 focus:outline-none focus:ring-1 focus:ring-brand-green w-32 sm:w-40"
            />
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={onRefresh}
            className="p-2 rounded-xl bg-white border border-brand-beige-dark hover:bg-brand-beige text-brand-green transition-colors cursor-pointer"
            title="Refresh floor plan"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => onOpenSwipeModal()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-brand-beige-dark hover:bg-brand-beige text-brand-green text-xs font-bold transition-colors cursor-pointer"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>Transfer Table</span>
          </button>

          <button
            type="button"
            onClick={onOpenAddModal}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-brand-green text-brand-beige text-xs font-black hover:bg-brand-green-dark transition-all cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Table</span>
          </button>
        </div>
      </div>

      {/* 2. Interactive KPI Ribbon & Filter Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
        <button
          type="button"
          onClick={() => setStatusFilter('ALL')}
          className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
            statusFilter === 'ALL'
              ? 'bg-brand-green text-brand-beige border-brand-green shadow-xs'
              : 'bg-white border-brand-beige-dark hover:border-brand-green/30 text-brand-green'
          }`}
        >
          <div className="text-[10px] uppercase font-bold tracking-wider opacity-80">All Tables</div>
          <div className="text-xl font-black mt-0.5">{stats.total}</div>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('AVAILABLE')}
          className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
            statusFilter === 'AVAILABLE'
              ? 'bg-slate-700 text-white border-slate-700 shadow-xs'
              : 'bg-white border-brand-beige-dark hover:border-slate-300 text-slate-800'
          }`}
        >
          <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500">⚪ Vacant</div>
          <div className="text-xl font-black mt-0.5 text-slate-800">{stats.available}</div>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('OCCUPIED')}
          className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
            statusFilter === 'OCCUPIED'
              ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
              : 'bg-sky-50/80 border-sky-200 hover:border-sky-300 text-sky-900'
          }`}
        >
          <div className="text-[10px] uppercase font-bold tracking-wider text-sky-700">🔵 Seated</div>
          <div className="text-xl font-black mt-0.5 text-sky-950">{stats.occupied}</div>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('KITCHEN')}
          className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
            statusFilter === 'KITCHEN'
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
              : 'bg-emerald-50/80 border-emerald-200 hover:border-emerald-300 text-emerald-900'
          }`}
        >
          <div className="text-[10px] uppercase font-bold tracking-wider text-emerald-700">🟢 In Kitchen</div>
          <div className="text-xl font-black mt-0.5 text-emerald-950">{stats.kitchen}</div>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('BILLED')}
          className={`p-3 rounded-2xl border text-left transition-all cursor-pointer col-span-2 sm:col-span-1 ${
            statusFilter === 'BILLED'
              ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
              : 'bg-amber-50/80 border-amber-200 hover:border-amber-300 text-amber-900'
          }`}
        >
          <div className="text-[10px] uppercase font-bold tracking-wider text-amber-700">🟡 Billed</div>
          <div className="text-xl font-black mt-0.5 text-amber-950">{stats.billed}</div>
        </button>
      </div>

      {/* 3. Section Banner & Visual Legend */}
      <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
        <h2 className="text-lg font-black text-brand-green tracking-tight">
          {selectedSection === 'ALL' ? 'All Dining Sections' : `${selectedSection} Section`}
        </h2>

        {/* Legend */}
        <div className="flex items-center gap-3 text-[11px] font-bold text-brand-green/80 flex-wrap">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-white border border-slate-300 shadow-2xs inline-block" />
            Available
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-sky-200 border border-sky-300 shadow-2xs inline-block" />
            Seated
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-emerald-200 border border-emerald-300 shadow-2xs inline-block" />
            In Kitchen / KOT
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-amber-200 border border-amber-300 shadow-2xs inline-block" />
            Billed / Settle Pending
          </span>
        </div>
      </div>

      {/* 4. The All Table Floor Plan Grid (Matching Image 2) */}
      <div className="bg-slate-50/70 p-4 sm:p-6 rounded-3xl border border-brand-beige-dark/60 shadow-inner">
        {filteredTables.length === 0 ? (
          <div className="py-12 text-center text-brand-green/60">
            <Utensils className="w-10 h-10 mx-auto text-brand-green/30 mb-2" />
            <p className="font-bold text-sm">No dining tables found for this view.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-11 gap-3 sm:gap-3.5">
            {filteredTables.map((table) => {
              const state = getTableState(table);
              const tOrders = tableOrdersMap.get(table.id) || [];
              const activeOrders = tOrders.filter((o) => o.paymentStatus !== 'PAID');
              const itemCount = activeOrders.reduce(
                (sum, o) => sum + o.items.reduce((iSum, it) => iSum + it.quantity, 0),
                0
              );

              // Duration calculation
              let elapsedMinutes: number | null = null;
              if (currentTime > 0) {
                if (table.seatedAt) {
                  elapsedMinutes = Math.max(
                    1,
                    Math.round((currentTime - new Date(table.seatedAt).getTime()) / (60 * 1000))
                  );
                } else if (activeOrders[0]?.createdAt) {
                  elapsedMinutes = Math.max(
                    1,
                    Math.round(
                      (currentTime - new Date(activeOrders[0].createdAt).getTime()) / (60 * 1000)
                    )
                  );
                }
              }

              // Card styling matching Image 2
              let cardBg = 'bg-white hover:bg-slate-50 border-slate-200/90 text-slate-800 shadow-2xs';
              if (state === 'OCCUPIED') {
                cardBg =
                  'bg-sky-200 hover:bg-sky-300/90 border-sky-300 text-sky-950 font-semibold shadow-xs ring-1 ring-sky-300/60';
              } else if (state === 'KITCHEN') {
                cardBg =
                  'bg-emerald-200 hover:bg-emerald-300/90 border-emerald-300 text-emerald-950 font-semibold shadow-xs ring-1 ring-emerald-300/60';
              } else if (state === 'BILLED') {
                cardBg =
                  'bg-amber-200 hover:bg-amber-300/90 border-amber-300 text-amber-950 font-semibold shadow-xs ring-1 ring-amber-300/60';
              }

              return (
                <div
                  key={table.id}
                  onClick={() => handleTableClick(table)}
                  className={`relative rounded-2xl border p-3 flex flex-col items-center justify-between min-h-[92px] sm:min-h-[104px] cursor-pointer transition-all hover:scale-105 hover:shadow-md select-none ${cardBg}`}
                >
                  {/* Top: Table Label */}
                  <div className="text-center w-full">
                    <span className="text-xs sm:text-sm font-extrabold tracking-tight block">
                      Table {table.tableNumber}
                    </span>
                    <span className="text-[10px] opacity-70 block font-medium">
                      {table.capacity} Seats
                    </span>
                  </div>

                  {/* Bottom: Pill Badges (Matching Image 2 circular indicators) */}
                  <div className="flex items-center justify-center gap-1.5 mt-2 flex-wrap">
                    {/* Badge 1: Order / Item Count or Guest Count */}
                    {(state === 'OCCUPIED' || state === 'KITCHEN' || state === 'BILLED') && (
                      <span
                        className="w-5 h-5 rounded-full bg-white/90 text-slate-800 text-[10px] font-black flex items-center justify-center shadow-xs border border-black/10"
                        title={itemCount > 0 ? `${itemCount} items ordered` : 'Table Seated'}
                      >
                        {itemCount > 0 ? itemCount : '1'}
                      </span>
                    )}

                    {/* Badge 2: Elapsed Timer */}
                    {elapsedMinutes !== null && (
                      <span
                        className="h-5 px-1.5 rounded-full bg-white/90 text-slate-800 text-[9px] font-black flex items-center gap-0.5 shadow-xs border border-black/10"
                        title={`Seated for ${elapsedMinutes} minutes`}
                      >
                        <Clock className="w-2.5 h-2.5" />
                        {elapsedMinutes}m
                      </span>
                    )}

                    {/* Badge 3: Rupee Bill Icon for Billed status */}
                    {state === 'BILLED' && (
                      <span
                        className="w-5 h-5 rounded-full bg-white/90 text-amber-800 text-[10px] font-black flex items-center justify-center shadow-xs border border-black/10"
                        title="Bill Generated"
                      >
                        ₹
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. Interactive Table Action Modal */}
      {activeTableModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setActiveTableModal(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-brand-beige-dark max-h-[90vh] overflow-y-auto space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-brand-beige-dark">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-brand-green text-brand-beige flex items-center justify-center font-black text-lg shadow-sm">
                  {activeTableModal.tableNumber.toString().padStart(2, '0')}
                </div>
                <div>
                  <h3 className="text-lg font-black text-brand-green leading-tight">
                    Table {activeTableModal.tableNumber}
                  </h3>
                  <p className="text-xs text-brand-green/70">
                    {activeTableModal.section || 'A/C Hall'} • {activeTableModal.capacity} Seats •{' '}
                    <span className="font-bold">
                      {getTableState(activeTableModal) === 'AVAILABLE'
                        ? 'Vacant'
                        : getTableState(activeTableModal)}
                    </span>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveTableModal(null)}
                className="p-1.5 rounded-xl hover:bg-brand-beige text-brand-green/60 hover:text-brand-green cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* If Table is AVAILABLE: Quick Seating & POS actions */}
            {getTableState(activeTableModal) === 'AVAILABLE' ? (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs">
                  <p className="font-extrabold text-sm mb-1">Table is currently Vacant & Ready</p>
                  <p className="opacity-80">
                    Seat walk-in customers or share the table QR code for self-ordering.
                  </p>
                </div>

                {/* Table Actions */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    disabled={isUpdatingStatus}
                    onClick={() => handleToggleTableOccupied(activeTableModal)}
                    className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-brand-green text-brand-beige text-xs font-black hover:bg-brand-green-dark transition-all cursor-pointer shadow-xs"
                  >
                    <Users className="w-4 h-4" />
                    <span>Seat Walk-In Guests</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setStandeeModalTable(activeTableModal);
                    }}
                    className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-white border border-brand-beige-dark hover:bg-brand-beige text-brand-green text-xs font-bold transition-all cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    <span>View QR Standee</span>
                  </button>
                </div>

                {/* Copy QR Link */}
                <div className="p-3 bg-brand-beige-light rounded-2xl border border-brand-beige-dark flex items-center justify-between gap-2">
                  <div className="truncate text-[11px] font-mono text-brand-green/70">
                    {qrBaseUrl.replace(/\/+$/, '')}/cafe/van-vibes?table={activeTableModal.id}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyCustomerLink(activeTableModal)}
                    className="px-3 py-1.5 rounded-xl bg-white border border-brand-beige-dark text-xs font-bold text-brand-green hover:bg-brand-beige flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    {copiedLink ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" /> Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" /> Copy Link
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              /* If Table is OCCUPIED / KITCHEN / BILLED: Live Order Details & Settlement */
              <div className="space-y-4">
                {/* Active Session Info Banner */}
                <div className="p-3.5 rounded-2xl bg-brand-beige-light border border-brand-beige-dark flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-brand-green/60 tracking-wider">
                      Customer
                    </span>
                    <p className="text-xs font-black text-brand-green mt-0.5">
                      {selectedTableOrders[0]?.customerName || 'Dine-In Customer'}{' '}
                      {selectedTableOrders[0]?.customerMobile && (
                        <span className="font-normal opacity-70">
                          ({selectedTableOrders[0].customerMobile})
                        </span>
                      )}
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-brand-green/60 tracking-wider">
                      Running Total
                    </span>
                    <p className="text-sm font-black text-brand-green mt-0.5">
                      ₹{totalAmount.toFixed(2)}
                    </p>
                  </div>
                </div>

                {/* Active Orders List */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-brand-green">
                    <span>Active Orders & Dishes</span>
                    <span>{selectedTableOrders.length} order(s)</span>
                  </div>

                  <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                    {selectedTableOrders.map((ord) => (
                      <div
                        key={ord.id}
                        className="p-3 rounded-2xl bg-white border border-brand-beige-dark text-xs space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-brand-green font-mono">
                            #{ord.id}
                          </span>
                          <span
                            className={`text-[10px] uppercase font-black px-2 py-0.5 rounded border ${
                              ord.status === 'PREPARING' || ord.status === 'IN_KITCHEN'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : ord.billGenerated
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : 'bg-sky-50 text-sky-800 border-sky-200'
                            }`}
                          >
                            {ord.status}
                          </span>
                        </div>

                        {/* Order items */}
                        <div className="space-y-1 pt-1 border-t border-brand-beige-dark/40">
                          {ord.items.map((it, idx) => (
                            <div key={idx} className="flex items-center justify-between text-[11px]">
                              <span>
                                <span className="font-bold text-brand-green">{it.quantity}x</span>{' '}
                                {it.name}
                              </span>
                              <span className="font-semibold text-brand-green/80">
                                ₹{it.price * it.quantity}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Table Management Action Buttons */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-brand-beige-dark">
                  {/* Settle Bill Button */}
                  <button
                    type="button"
                    onClick={() => {
                      if (activeBillOrder) {
                        setBillModalOrderId(activeBillOrder.id);
                      }
                    }}
                    className="flex items-center justify-center gap-1.5 p-3 rounded-2xl bg-brand-green text-brand-beige text-xs font-black hover:bg-brand-green-dark transition-all cursor-pointer shadow-xs"
                  >
                    <Receipt className="w-3.5 h-3.5" />
                    <span>Generate / Settle Bill</span>
                  </button>

                  {/* Print KOT */}
                  <button
                    type="button"
                    onClick={() => {
                      if (activeBillOrder) {
                        setKotModalOrder(activeBillOrder);
                      }
                    }}
                    className="flex items-center justify-center gap-1.5 p-3 rounded-2xl bg-white border border-brand-beige-dark hover:bg-brand-beige text-brand-green text-xs font-bold transition-all cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print KOT</span>
                  </button>

                  {/* Swipe / Transfer Table */}
                  <button
                    type="button"
                    onClick={() => {
                      const id = activeTableModal.id;
                      setActiveTableModal(null);
                      onOpenSwipeModal(id);
                    }}
                    className="flex items-center justify-center gap-1.5 p-3 rounded-2xl bg-white border border-brand-beige-dark hover:bg-brand-beige text-brand-green text-xs font-bold transition-all cursor-pointer"
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5" />
                    <span>Transfer Table</span>
                  </button>

                  {/* Clear Table Button */}
                  <button
                    type="button"
                    disabled={isUpdatingStatus}
                    onClick={() => handleClearTable(activeTableModal)}
                    className="flex items-center justify-center gap-1.5 p-3 rounded-2xl bg-red-50 border border-red-200 text-red-700 hover:bg-red-100 text-xs font-bold transition-all cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-red-600" />
                    <span>Free Table</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Standee Preview Modal */}
      {standeeModalTable && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
          onClick={() => setStandeeModalTable(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-sm w-full p-6 text-center shadow-2xl border border-brand-beige-dark space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-brand-beige-dark">
              <h4 className="font-black text-brand-green text-base">
                Table {standeeModalTable.tableNumber} Standee
              </h4>
              <button
                type="button"
                onClick={() => setStandeeModalTable(null)}
                className="p-1 rounded-lg hover:bg-brand-beige text-brand-green/60"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="w-48 h-48 mx-auto p-3 bg-brand-beige-light rounded-2xl border border-brand-beige-dark flex items-center justify-center">
              <QrCodePreview
                value={`${qrBaseUrl.replace(/\/+$/, '')}/cafe/van-vibes?table=${standeeModalTable.id}&token=${standeeModalTable.token}`}
                tableNumber={standeeModalTable.tableNumber}
                size={220}
              />
            </div>

            <p className="text-xs text-brand-green/70">
              Scan to view cafe menu & place dine-in orders instantly.
            </p>

            <button
              type="button"
              onClick={() => {
                window.print();
              }}
              className="w-full py-2.5 rounded-xl bg-brand-green text-brand-beige font-black text-xs hover:bg-brand-green-dark transition-all cursor-pointer shadow-xs flex items-center justify-center gap-2"
            >
              <Printer className="w-4 h-4" />
              <span>Print Standee</span>
            </button>
          </div>
        </div>
      )}

      {/* Embedded Bill Settlement Modal */}
      {billModalOrderId && (
        <BillModal
          orderId={billModalOrderId}
          onClose={() => setBillModalOrderId(null)}
          onSettled={() => {
            setBillModalOrderId(null);
            setActiveTableModal(null);
            onRefresh();
          }}
        />
      )}

      {/* Embedded KOT Print Modal */}
      {kotModalOrder && (
        <KotPrintModal
          isOpen={true}
          order={kotModalOrder}
          onClose={() => setKotModalOrder(null)}
        />
      )}
    </div>
  );
}
