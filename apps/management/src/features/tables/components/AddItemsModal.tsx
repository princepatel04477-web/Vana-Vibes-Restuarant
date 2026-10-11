'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { menuApi } from '@/api/menu';
import { tablesApi } from '@/api/tables';
import { MenuCategory, MenuItem, TableInfo } from '@/types/cafe';
import { AlertCircle, Minus, Plus, Search, ShoppingBag, Trash2, X } from 'lucide-react';

interface Props {
  table: TableInfo;
  onClose: () => void;
  onAdded: () => void;
}

interface DraftLine {
  key: string;
  item: MenuItem;
  quantity: number;
  selectedOptions: Record<string, string>;
}

function defaultOptions(item: MenuItem): Record<string, string> {
  const opts: Record<string, string> = {};
  for (const opt of item.options || []) {
    if (opt.choices[0]) opts[opt.name] = opt.choices[0].name;
  }
  return opts;
}

export function AddItemsModal({ table, onClose, onAdded }: Props) {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [isLoadingMenu, setIsLoadingMenu] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerMobile, setCustomerMobile] = useState('');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([menuApi.getMenuItems(), menuApi.getCategories().catch(() => [])])
      .then(([items, cats]) => {
        if (!active) return;
        setMenuItems(items.filter((i) => i.isAvailable !== false));
        setCategories(cats.filter((c) => c.slug !== 'all' && c.id !== 'all'));
      })
      .catch(() => {
        if (active) setError('Could not load the menu. Please try again.');
      })
      .finally(() => {
        if (active) setIsLoadingMenu(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const visibleItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return menuItems.filter((i) => {
      if (activeCategory !== 'all' && i.category !== activeCategory) return false;
      if (q && !i.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [menuItems, activeCategory, search]);

  const total = lines.reduce((sum, l) => sum + l.item.price * l.quantity, 0);
  const itemCount = lines.reduce((sum, l) => sum + l.quantity, 0);

  const addItem = (item: MenuItem) => {
    setError(null);
    setLines((prev) => {
      // Items with choices get their own line so each can have different options
      if (!item.options?.length) {
        const existing = prev.find((l) => l.item.id === item.id);
        if (existing) {
          return prev.map((l) => (l === existing ? { ...l, quantity: Math.min(l.quantity + 1, 50) } : l));
        }
      }
      return [
        ...prev,
        { key: `${item.id}-${Date.now()}`, item, quantity: 1, selectedOptions: defaultOptions(item) },
      ];
    });
  };

  const changeQty = (key: string, delta: number) => {
    setLines((prev) =>
      prev
        .map((l) => (l.key === key ? { ...l, quantity: Math.min(l.quantity + delta, 50) } : l))
        .filter((l) => l.quantity > 0)
    );
  };

  const changeOption = (key: string, optionName: string, choice: string) => {
    setLines((prev) =>
      prev.map((l) =>
        l.key === key ? { ...l, selectedOptions: { ...l.selectedOptions, [optionName]: choice } } : l
      )
    );
  };

  const handleSubmit = async () => {
    if (lines.length === 0) {
      setError('Add at least one item.');
      return;
    }
    const mobileDigits = customerMobile.replace(/\D/g, '');
    if (mobileDigits && mobileDigits.length !== 10) {
      setError('Phone number must be exactly 10 digits (or leave it empty).');
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      await tablesApi.addItems(table.id, {
        items: lines.map((l) => ({
          menuItemId: l.item.id,
          quantity: l.quantity,
          selectedOptions: Object.keys(l.selectedOptions).length ? l.selectedOptions : undefined,
        })),
        customerName: customerName.trim() || undefined,
        customerMobile: mobileDigits || undefined,
        specialInstructions: notes.trim() || undefined,
      });
      onAdded();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add items. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-2.5 sm:p-4 backdrop-blur-xs"
      onClick={() => !isSaving && onClose()}
    >
      <div
        className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl border border-brand-beige-dark max-h-[92vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-brand-beige-dark">
          <div>
            <h3 className="text-base sm:text-lg font-black text-brand-green">
              Add Items · Table {table.tableNumber.toString().padStart(2, '0')}
            </h3>
            <p className="text-[11px] text-brand-green/60">
              Items are sent to the kitchen and added to this table&apos;s running bill.
            </p>
          </div>
          <button
            type="button"
            disabled={isSaving}
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-brand-beige text-brand-green/60 hover:text-brand-green cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto md:overflow-hidden grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_300px] min-h-0">
          {/* Menu picker */}
          <div className="flex flex-col min-h-0 min-w-0 md:border-r border-brand-beige-dark">
            <div className="p-3 space-y-2 border-b border-brand-beige-dark/60">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-brand-green/40 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search dishes..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 bg-white border border-brand-beige-dark rounded-xl text-xs text-brand-green placeholder:text-brand-green/40 focus:outline-none focus:ring-1 focus:ring-brand-green"
                />
              </div>
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {[{ slug: 'all', name: 'All', id: 'all' }, ...categories].map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setActiveCategory(c.slug)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-colors cursor-pointer ${
                      activeCategory === c.slug
                        ? 'bg-brand-green text-brand-beige'
                        : 'bg-brand-beige-light text-brand-green/70 hover:text-brand-green'
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="md:flex-1 md:overflow-y-auto p-3 space-y-1.5">
              {isLoadingMenu ? (
                <p className="text-xs text-brand-green/60 text-center py-8">Loading menu...</p>
              ) : visibleItems.length === 0 ? (
                <p className="text-xs text-brand-green/60 text-center py-8">No dishes match.</p>
              ) : (
                visibleItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => addItem(item)}
                    className="w-full flex items-center justify-between gap-2 p-2.5 rounded-xl border border-brand-beige-dark/70 hover:border-brand-green/40 hover:bg-brand-beige-light text-left transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <span
                        className={`w-2.5 h-2.5 rounded-sm border shrink-0 ${
                          item.isVeg ? 'border-emerald-600 bg-emerald-500' : 'border-red-600 bg-red-500'
                        }`}
                      />
                      <span className="text-xs font-bold text-brand-green truncate">{item.name}</span>
                    </span>
                    <span className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-semibold text-brand-green/80">₹{item.price}</span>
                      <span className="w-6 h-6 rounded-lg bg-brand-green text-brand-beige flex items-center justify-center">
                        <Plus className="w-3.5 h-3.5" />
                      </span>
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Draft order */}
          <div className="flex flex-col min-h-0 bg-brand-beige-light/40">
            <div className="md:flex-1 md:overflow-y-auto p-3 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-black text-brand-green">
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>Selected ({itemCount})</span>
              </div>

              {lines.length === 0 ? (
                <p className="text-[11px] text-brand-green/60 py-4 text-center">Tap a dish to add it.</p>
              ) : (
                lines.map((l) => (
                  <div key={l.key} className="p-2.5 rounded-xl bg-white border border-brand-beige-dark space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-bold text-brand-green">{l.item.name}</span>
                      <span className="text-xs font-semibold text-brand-green/80 shrink-0">
                        ₹{l.item.price * l.quantity}
                      </span>
                    </div>
                    {(l.item.options || []).map((opt) => (
                      <select
                        key={opt.name}
                        value={l.selectedOptions[opt.name] || ''}
                        onChange={(e) => changeOption(l.key, opt.name, e.target.value)}
                        className="w-full px-2 py-1 text-[11px] bg-white border border-brand-beige-dark rounded-lg text-brand-green focus:outline-none"
                        aria-label={opt.name}
                      >
                        {opt.choices.map((c) => (
                          <option key={c.name} value={c.name}>
                            {opt.name}: {c.name}
                          </option>
                        ))}
                      </select>
                    ))}
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => changeQty(l.key, -1)}
                        className="w-6 h-6 rounded-lg border border-brand-beige-dark text-brand-green flex items-center justify-center hover:bg-brand-beige cursor-pointer"
                        aria-label={l.quantity === 1 ? 'Remove' : 'Decrease'}
                      >
                        {l.quantity === 1 ? <Trash2 className="w-3 h-3 text-red-600" /> : <Minus className="w-3 h-3" />}
                      </button>
                      <span className="w-6 text-center text-xs font-black text-brand-green">{l.quantity}</span>
                      <button
                        type="button"
                        onClick={() => changeQty(l.key, 1)}
                        className="w-6 h-6 rounded-lg border border-brand-beige-dark text-brand-green flex items-center justify-center hover:bg-brand-beige cursor-pointer"
                        aria-label="Increase"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))
              )}

              <div className="pt-2 space-y-1.5">
                <input
                  type="text"
                  placeholder="Customer name (optional)"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-2.5 py-2 text-xs bg-white border border-brand-beige-dark rounded-lg text-brand-green placeholder:text-brand-green/40 focus:outline-none focus:ring-1 focus:ring-brand-green"
                />
                <input
                  type="tel"
                  inputMode="numeric"
                  placeholder="Phone (optional, 10 digits)"
                  value={customerMobile}
                  onChange={(e) => setCustomerMobile(e.target.value)}
                  className="w-full px-2.5 py-2 text-xs bg-white border border-brand-beige-dark rounded-lg text-brand-green placeholder:text-brand-green/40 focus:outline-none focus:ring-1 focus:ring-brand-green"
                />
                <input
                  type="text"
                  placeholder="Kitchen note (optional)"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-2.5 py-2 text-xs bg-white border border-brand-beige-dark rounded-lg text-brand-green placeholder:text-brand-green/40 focus:outline-none focus:ring-1 focus:ring-brand-green"
                />
              </div>
            </div>

            <div className="p-3 border-t border-brand-beige-dark space-y-2 bg-white">
              {error && (
                <p className="text-[11px] font-semibold text-red-600 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{error}</span>
                </p>
              )}
              <button
                type="button"
                disabled={isSaving || lines.length === 0}
                onClick={handleSubmit}
                className="w-full py-2.5 rounded-xl bg-brand-green hover:bg-brand-green-hover text-brand-beige text-xs font-black shadow-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isSaving ? 'Adding...' : `Add to Table · ₹${total}`}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
