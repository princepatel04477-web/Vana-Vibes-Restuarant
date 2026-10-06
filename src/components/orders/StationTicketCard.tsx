'use client';

import React, { useState } from 'react';
import { OrderItem } from '@/types/cafe';
import { Clock, Check, Printer } from 'lucide-react';

interface StationTicketCardProps {
  orderId: string;
  tableNumber: number;
  customerName?: string;
  customerMobile?: string;
  createdAt: string;
  items: OrderItem[];
  stationType: 'BARISTA' | 'CHEF'; // BARISTA = KOT, CHEF = Kitchen KDS
  specialInstructions?: string;
  onDone?: () => void;
  isCompleted?: boolean;
}

export function StationTicketCard({
  orderId,
  tableNumber,
  customerName,
  customerMobile,
  createdAt,
  items,
  stationType,
  specialInstructions,
  onDone,
  isCompleted = false,
}: StationTicketCardProps) {
  // Checkbox state for preparation progress
  const [checkedItems, setCheckedItems] = useState<{ [itemId: string]: boolean }>({});

  const toggleCheck = (id: string) => {
    setCheckedItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const totalUnits = items.reduce((sum, item) => sum + (item.quantity || 1), 0);
  const checkedUnits = items.reduce((sum, item) => {
    return sum + (checkedItems[item.id] ? item.quantity || 1 : 0);
  }, 0);
  const leftUnits = Math.max(0, totalUnits - checkedUnits);
  const allChecked = totalUnits > 0 && checkedUnits >= totalUnits;

  // Elapsed time
  const orderDate = new Date(createdAt);
  const elapsedMinutes = !isNaN(orderDate.getTime())
    ? Math.max(0, Math.floor((Date.now() - orderDate.getTime()) / (1000 * 60)))
    : 0;

  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'width=380,height=600');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>${stationType === 'BARISTA' ? 'KOT' : 'Kitchen KDS'} Ticket - ${orderId}</title>
          <style>
            body { font-family: monospace; padding: 12px; margin: 0; font-size: 13px; color: #000; }
            .header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 8px; margin-bottom: 8px; }
            .title { font-size: 16px; font-weight: bold; }
            .meta { display: flex; justify-content: space-between; margin-bottom: 6px; }
            .items { border-bottom: 1px dashed #000; padding-bottom: 8px; margin-bottom: 8px; }
            .item-row { display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 14px; }
            .note { margin-top: 8px; font-style: italic; font-weight: bold; }
            .footer { text-align: center; font-size: 10px; margin-top: 10px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">VAN VIBES — ${stationType === 'BARISTA' ? 'KOT (BARISTA)' : 'KITCHEN KDS'}</div>
            <div>Order: ${orderId} | Table ${tableNumber}</div>
            <div>Time: ${orderDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
          </div>
          <div class="items">
            ${items
              .map(
                (item) => `
              <div class="item-row">
                <span>[ ] ${item.quantity || 1} x ${item.name}</span>
                <span>${(item.category || '').toUpperCase()}</span>
              </div>
              ${
                item.specialInstructions
                  ? `<div style="font-size:11px; margin-left: 15px;">Note: ${item.specialInstructions}</div>`
                  : ''
              }
            `
              )
              .join('')}
          </div>
          ${specialInstructions ? `<div class="note">Customer Note: ${specialInstructions}</div>` : ''}
          <div class="footer">*** SENT TO PREPARATION ***</div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  return (
    <div
      className={`rounded-2xl border bg-white shadow-xs transition-all overflow-hidden flex flex-col justify-between ${
        allChecked && !isCompleted
          ? 'border-emerald-400 ring-2 ring-emerald-400/20'
          : 'border-brand-beige-dark/90 hover:border-brand-gold/60'
      }`}
    >
      {/* Ticket Header */}
      <div className="p-4 sm:p-5 pb-3 border-b border-brand-beige-dark/40 bg-brand-beige-light/30">
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="font-mono text-base font-black text-brand-green tracking-tight">
            {orderId}
          </span>
          <div className="flex items-center gap-1.5 text-xs text-brand-green/70">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span className="font-mono font-bold">{elapsedMinutes}m ago</span>
          </div>
        </div>

        {/* Incoming Badge */}
        <div className="mb-2">
          <span className="inline-block px-3 py-1 rounded-full text-[10px] uppercase font-black tracking-wider bg-amber-100 text-amber-900 border border-amber-300">
            {isCompleted
              ? 'COMPLETED TICKET'
              : stationType === 'BARISTA'
              ? 'INCOMING KOT'
              : 'INCOMING ORDER'}
          </span>
        </div>

        <div className="text-xs font-bold text-brand-green flex items-center gap-2">
          <span>Table {tableNumber}</span>
          <span className="text-brand-green/40">•</span>
          <span className="text-brand-green/70 truncate">{customerName || 'Guest'}</span>
        </div>
      </div>

      {/* Checklist Header */}
      <div className="p-4 sm:p-5 flex-1 space-y-3">
        <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-wider text-brand-green/60">
          <span>
            {stationType === 'BARISTA' ? 'BARISTA CHECKLIST' : 'CHEF CHECKLIST'} ({items.length}{' '}
            ITEMS)
          </span>
          <span className="font-mono">
            {checkedUnits}/{totalUnits} CHECKED
          </span>
        </div>

        {/* Item Rows with Checkbox */}
        <div className="space-y-2">
          {items.map((item) => {
            const isChecked = !!checkedItems[item.id];
            const qty = item.quantity || 1;
            const categoryLabel = (item.category || (stationType === 'BARISTA' ? 'DRINK' : 'FOOD'))
              .replace(/-/g, ' ')
              .toUpperCase();

            return (
              <div
                key={item.id}
                onClick={() => !isCompleted && toggleCheck(item.id)}
                className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-all cursor-pointer ${
                  isChecked
                    ? 'bg-emerald-50/70 border-emerald-300'
                    : 'bg-white border-brand-beige-dark/60 hover:bg-brand-beige-light/40'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => !isCompleted && toggleCheck(item.id)}
                    aria-label={`Mark ${item.name} prepared`}
                    className="w-4 h-4 rounded border-brand-beige-dark text-brand-gold focus:ring-brand-gold cursor-pointer"
                  />
                  <div className="min-w-0">
                    <span
                      className={`font-black text-xs sm:text-sm text-brand-green block truncate ${
                        isChecked ? 'line-through text-brand-green/50' : ''
                      }`}
                    >
                      {qty} × {item.name}
                    </span>
                    {item.specialInstructions && (
                      <span className="text-[10px] text-amber-700 italic block">
                        Note: {item.specialInstructions}
                      </span>
                    )}
                  </div>
                </div>

                <span className="text-[10px] uppercase font-bold text-brand-green/60 tracking-wider shrink-0 bg-brand-beige/50 px-2 py-0.5 rounded">
                  {categoryLabel}
                </span>
              </div>
            );
          })}
        </div>

        {/* Customer Note if present */}
        {specialInstructions && (
          <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200 text-amber-900 text-xs">
            <span className="font-bold text-[10px] uppercase tracking-wider block text-amber-800">
              CUSTOMER NOTE:
            </span>
            <p className="font-medium italic mt-0.5">{specialInstructions}</p>
          </div>
        )}
      </div>

      {/* Ticket Footer & Actions */}
      <div className="p-4 sm:p-5 pt-3 border-t border-brand-beige-dark/50 bg-brand-beige-light/20 space-y-3">
        <div className="flex items-center justify-between text-xs font-semibold text-brand-green/70">
          <div className="flex items-center gap-1.5">
            <span className="text-base">{stationType === 'BARISTA' ? '☕' : '🍽️'}</span>
            <span>
              {checkedUnits}/{totalUnits} prepared ({leftUnits} left)
            </span>
          </div>
          <span className="font-mono">{totalUnits} units</span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-white hover:bg-brand-beige border border-brand-beige-dark text-xs font-bold text-brand-green shadow-2xs transition-all active:scale-95 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print {stationType === 'BARISTA' ? 'KOT' : 'Ticket'}</span>
          </button>

          {!isCompleted && onDone ? (
            <button
              type="button"
              onClick={onDone}
              className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-black shadow-xs transition-all active:scale-95 cursor-pointer ${
                allChecked
                  ? 'bg-brand-gold hover:bg-brand-gold-light text-brand-green'
                  : 'bg-brand-gold/90 hover:bg-brand-gold text-brand-green'
              }`}
            >
              <Check className="w-3.5 h-3.5" />
              <span>Done</span>
            </button>
          ) : (
            <div className="flex items-center justify-center py-2.5 px-3 rounded-xl bg-emerald-50 text-emerald-800 font-bold text-xs border border-emerald-200">
              Completed
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
