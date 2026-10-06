'use client';

import React from 'react';
import { useCart } from '@/context/CartContext';
import { ShoppingBag, Clock, Sparkles, Search } from 'lucide-react';
import Link from 'next/link';

export function CafeHeader() {
  const { table, itemCount, total, setIsCartOpen, activeOrders, setIsOrdersOpen, setIsSearchOpen } = useCart();

  return (
    <header className="sticky top-0 z-40 bg-brand-green text-brand-beige border-b border-brand-green-light shadow-md">
      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between gap-2 sm:gap-4">
        {/* Logo & Cafe Identity */}
        <Link href="/" className="flex items-center gap-2 sm:gap-3 group shrink-0 min-w-0">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-brand-beige text-brand-green font-black flex items-center justify-center text-base sm:text-xl shadow-sm border border-brand-gold shrink-0">
            व
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
              <span className="font-black text-base sm:text-xl tracking-tight text-brand-beige whitespace-nowrap">
                वन VIBES
              </span>
              <span className="text-[9px] sm:text-[10px] uppercase font-bold tracking-wider sm:tracking-widest px-1 sm:px-1.5 py-0.5 rounded bg-brand-gold text-brand-green whitespace-nowrap">
                Cafe & Restro
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-brand-beige-muted tracking-wide sm:tracking-wider uppercase font-medium truncate max-w-[130px] xs:max-w-[200px] sm:max-w-none">
              Vaan Vibes Cafe & Restro • Taste the Vibe
            </p>
          </div>
        </Link>

        {/* Table Badge & Action Pills */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* Active Table Pill */}
          {table ? (
            <div className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full bg-brand-green-light border border-brand-gold/40 text-brand-beige text-xs sm:text-sm font-semibold shadow-inner shrink-0">
              <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="hidden xs:inline">Table </span>
              <span className="xs:hidden">T-</span>
              <span>{table.tableNumber.toString().padStart(2, '0')}</span>
            </div>
          ) : (
            <div className="px-2 py-1 rounded bg-brand-green-surface text-brand-beige-muted text-[11px] sm:text-xs shrink-0">
              No Table
            </div>
          )}

          {/* Active Orders Tracker Pill */}
          {activeOrders.length > 0 && (
            <button
              onClick={() => setIsOrdersOpen(true)}
              className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full bg-brand-gold/20 text-brand-gold hover:bg-brand-gold/30 border border-brand-gold/40 text-xs sm:text-sm font-medium transition-all shrink-0 min-h-[36px]"
              title="Track Active Orders"
            >
              <Clock className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '6s' }} />
              <span className="hidden md:inline">Active</span>
              <span className="bg-brand-gold text-brand-green font-bold text-xs px-1.5 py-0.2 rounded-full">
                {activeOrders.length}
              </span>
            </button>
          )}

          {/* Staff Portal Link */}
          <Link
            href="/dashboard"
            className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-brand-green-light hover:bg-brand-green-surface text-brand-beige-muted hover:text-brand-beige text-xs font-semibold border border-brand-green-light hover:border-brand-gold/40 transition-all shrink-0 min-h-[36px]"
            title="Restaurant Staff & Admin Portal"
          >
            <span>Staff Portal</span>
          </Link>

          {/* Quick Search Trigger Button */}
          <button
            type="button"
            onClick={() => setIsSearchOpen(true)}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-brand-green-light hover:bg-brand-green-surface text-brand-beige flex items-center justify-center transition-all shrink-0 border border-brand-gold/30 hover:border-brand-gold min-h-[36px] min-w-[36px] active:scale-95"
            aria-label="Search Menu"
            title="Search Coffee, Drinks & Food"
          >
            <Search className="w-4 h-4 text-brand-beige" />
          </button>

          {/* Cart Floating Pill */}
          <button
            onClick={() => setIsCartOpen(true)}
            className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 rounded-full bg-brand-beige text-brand-green hover:bg-brand-beige-dark font-bold text-xs sm:text-sm transition-all shadow-sm active:scale-95 shrink-0 min-h-[36px]"
            aria-label="View Cart"
          >
            <div className="relative">
              <ShoppingBag className="w-4 h-4" />
              {itemCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-brand-terracotta text-white font-black text-[10px] w-4 h-4 rounded-full flex items-center justify-center shadow">
                  {itemCount}
                </span>
              )}
            </div>
            <span className="hidden sm:inline">Cart</span>
            {itemCount > 0 && (
              <span className="text-xs font-mono font-bold border-l border-brand-green/20 pl-1.5 sm:pl-2">
                ₹{total.toFixed(0)}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
