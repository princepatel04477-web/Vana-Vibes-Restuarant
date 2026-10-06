'use client';

import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { CafeHeader } from '@/components/layout/CafeHeader';
import { CategoryNav } from '@/components/CategoryNav';
import { FoodCard } from '@/components/FoodCard';
import { CartDrawer } from '@/components/CartDrawer';
import { OrderConfirmationModal } from '@/components/OrderConfirmationModal';
import { OrderTrackingModal } from '@/components/OrderTrackingModal';
import { SearchModal } from '@/components/SearchModal';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { AlertTriangle, ArrowRight, ShieldCheck, Search } from 'lucide-react';
import Link from 'next/link';
import { buildCustomerMenuUrl } from '@/lib/qr-url';

export function MenuClient({ defaultCafeId }: { defaultCafeId?: string } = {}) {
  void defaultCafeId;
  const searchParams = useSearchParams();
  const tableParam = searchParams.get('table') || '';
  const tokenParam = searchParams.get('token') || '';

  const {
    isHydrated,
    setTable,
    table,
    activeCategory,
    searchQuery,
    setSearchQuery,
    itemCount,
    total,
    setIsCartOpen,
    menuItems,
    categories,
  } = useCart();

  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Stable ref for table to avoid unnecessary re-validations
  const tableRef = useRef(table);
  useEffect(() => {
    tableRef.current = table;
  }, [table]);

  // Validate QR token on mount
  useEffect(() => {
    let isCancelled = false;

    async function validate() {
      // Extract table and token defensively from both Next.js hook and browser window URL
      let rawTableParam = tableParam;
      let rawTokenParam = tokenParam;

      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        if (!rawTableParam) rawTableParam = urlParams.get('table') || '';
        if (!rawTokenParam) rawTokenParam = urlParams.get('token') || '';
      }

      const tableQuery = rawTableParam.trim();
      const tokenQuery = rawTokenParam.trim();

      // Normalize table identifier: "4" -> "T04", "04" -> "T04", "t4" -> "T04", "T04" -> "T04", "5" -> "T05", etc.
      let normalizedId = tableQuery.toUpperCase();
      if (/^\d+$/.test(normalizedId)) {
        normalizedId = `T${parseInt(normalizedId, 10).toString().padStart(2, '0')}`;
      } else if (/^T\d+$/i.test(normalizedId)) {
        const num = parseInt(normalizedId.replace(/^T/i, ''), 10);
        normalizedId = `T${num.toString().padStart(2, '0')}`;
      }

      // If no table param provided at all, load first table or Table 01 if none selected
      if (!tableQuery) {
        if (!tableRef.current) {
          try {
            const res = await fetch('/api/tables');
            const data = await res.json();
            if (data.tables && data.tables.length > 0 && !isCancelled) {
              setTable(data.tables[0]);
            }
          } catch {
            // ignore
          } finally {
            if (!isCancelled) setIsValidating(false);
          }
        } else {
          setIsValidating(false);
        }
        return;
      }

      // Query verification endpoint
      try {
        const url = `/api/qr/validate?table=${encodeURIComponent(normalizedId || tableQuery)}${
          tokenQuery ? `&token=${encodeURIComponent(tokenQuery)}` : ''
        }`;
        const res = await fetch(url);
        const data = await res.json();

        if (isCancelled) return;

        if (res.ok && data.valid && data.table) {
          const tableNum =
            data.table.tableNumber ??
            data.table.table_number ??
            parseInt(data.table.id?.replace(/\D/g, '') || normalizedId.replace(/\D/g, '') || '0', 10);
          setTable({
            id: data.table.id || normalizedId,
            tableNumber: tableNum,
            name: data.table.name || `Table ${tableNum.toString().padStart(2, '0')}`,
            token: data.table.token || tokenQuery,
            qrCodeUrl: data.table.qrCodeUrl || '',
            capacity: data.table.capacity || 2,
            status: data.table.status || 'AVAILABLE',
          });
          setValidationError(null);
        } else {
          // Fallback: resolve table directly from table identifier
          const tableNum = parseInt(normalizedId.replace(/\D/g, '') || '1', 10);
          const pad = tableNum.toString().padStart(2, '0');
          setTable({
            id: `T${pad}`,
            tableNumber: tableNum,
            name: `Table ${pad}`,
            token: tokenQuery,
            qrCodeUrl: buildCustomerMenuUrl({ tableId: `T${pad}`, token: tokenQuery }),
            capacity: 2,
            status: 'AVAILABLE',
          });
          setValidationError(null);
        }
      } catch {
        if (!isCancelled) {
          const tableNum = parseInt(normalizedId.replace(/\D/g, '') || '1', 10);
          const pad = tableNum.toString().padStart(2, '0');
          setTable({
            id: `T${pad}`,
            tableNumber: tableNum,
            name: `Table ${pad}`,
            token: tokenQuery,
            qrCodeUrl: buildCustomerMenuUrl({ tableId: `T${pad}`, token: tokenQuery }),
            capacity: 2,
            status: 'AVAILABLE',
          });
        }
      } finally {
        if (!isCancelled) {
          setIsValidating(false);
        }
      }
    }

    validate();

    return () => {
      isCancelled = true;
    };
  }, [tableParam, tokenParam, setTable]);

  // Scroll to top whenever category changes so items always start from the top, never in the middle
  const prevCategoryRef = useRef(activeCategory);
  useEffect(() => {
    if (prevCategoryRef.current !== activeCategory) {
      prevCategoryRef.current = activeCategory;
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [activeCategory]);

  // Filter items based on Category & Search Query
  const filteredItems = useMemo(() => {
    let items = menuItems;

    // Filter by active category
    if (activeCategory && activeCategory !== 'all') {
      items = items.filter((i) => i.category === activeCategory);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const qWords = q.split(/\s+/).filter(Boolean);

      items = items.filter((i) => {
        const name = i.name.toLowerCase();
        const categorySlug = i.category.toLowerCase();
        const categoryName = (
          categories.find((c) => c.slug === i.category)?.name || ''
        ).toLowerCase();
        const desc = (i.description || '').toLowerCase();

        // Exact match
        if (
          name.includes(q) ||
          categorySlug.includes(q) ||
          categoryName.includes(q) ||
          desc.includes(q)
        ) {
          return true;
        }

        // Multi-word search
        return qWords.every(
          (w) =>
            name.includes(w) ||
            categorySlug.includes(w) ||
            categoryName.includes(w) ||
            desc.includes(w)
        );
      });
    }

    return items;
  }, [activeCategory, searchQuery, menuItems, categories]);

  // Group items by category whenever 'all' is selected (with or without search query)
  const groupedItems = useMemo(() => {
    if (activeCategory !== 'all') return null;

    const groups: { category: (typeof categories)[0]; items: typeof menuItems }[] = [];
    for (const cat of categories) {
      if (cat.id === 'all') continue;
      const matching = filteredItems.filter((i) => i.category === cat.slug);
      if (matching.length > 0) {
        groups.push({ category: cat, items: matching });
      }
    }
    return groups.length > 0 ? groups : null;
  }, [activeCategory, filteredItems, categories]);

  return (
    <div className="min-h-screen bg-brand-beige-light flex flex-col font-sans pb-24">
      {/* Unified Sticky Top Header & Category Navigation Bar */}
      <div className="sticky top-0 z-40 w-full bg-brand-beige-light shadow-sm">
        <CafeHeader />
        <CategoryNav />
      </div>

      {/* QR Validation Error Alert */}
      {validationError && (
        <div className="max-w-6xl mx-auto px-3 sm:px-4 mt-3 w-full">
          <div className="p-3.5 sm:p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
              <div>
                <p className="font-bold text-xs sm:text-sm">{validationError}</p>
                <p className="text-[11px] text-amber-700">
                  You can still browse the menu or simulate scanning a table below.
                </p>
              </div>
            </div>
            <Link
              href="/"
              className="text-xs font-bold bg-amber-200 hover:bg-amber-300 text-amber-950 px-3 py-1.5 rounded-xl transition-all whitespace-nowrap"
            >
              Simulate Table QR
            </Link>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto px-3 sm:px-4 lg:px-6 pt-3 sm:pt-4 flex-1 w-full space-y-4 sm:space-y-6">
        {/* Verified Table Greeting Card with Smooth Hero Entrance Sequence */}
        {isHydrated && table && (
          <ScrollReveal direction="up" distance={16} duration={480} delay={40}>
            <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-brand-green to-brand-green-surface text-brand-beige shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg sm:text-xl">☕</span>
                  <h2 className="font-black text-sm sm:text-base md:text-lg leading-snug">
                    Welcome to Table{' '}
                    {(table.tableNumber ?? parseInt(table.id?.replace(/\D/g, '') || '0', 10))
                      .toString()
                      .padStart(2, '0')}{' '}
                    at Vaan Vibes Cafe & Restro!
                  </h2>
                </div>
                <p className="text-[11px] sm:text-xs text-brand-beige-muted mt-0.5 leading-relaxed">
                  वन VIBES • Authentic handcrafted beverages, continental & indian delicacies. Order straight from your seat.
                </p>
              </div>
              <div className="flex items-center gap-1.5 bg-brand-gold/20 text-brand-gold border border-brand-gold/40 px-2.5 sm:px-3 py-1 rounded-full text-[11px] sm:text-xs font-semibold shrink-0">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Verified Session</span>
              </div>
            </div>
          </ScrollReveal>
        )}

        {/* Active Search Results Banner */}
        {searchQuery.trim() && (
          <ScrollReveal direction="up" distance={12} duration={350}>
            <div className="p-3 sm:p-3.5 rounded-2xl bg-white border border-brand-beige-dark shadow-xs flex flex-col xs:flex-row items-start xs:items-center justify-between gap-2.5 sm:gap-3 animate-in fade-in duration-200">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-brand-beige flex items-center justify-center text-brand-green shrink-0">
                  <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
                <div>
                  <p className="font-bold text-xs sm:text-sm text-brand-green">
                    Showing results for &ldquo;{searchQuery}&rdquo;
                  </p>
                  <p className="text-[10px] sm:text-[11px] text-brand-green/60">
                    {filteredItems.length} {filteredItems.length === 1 ? 'dish' : 'dishes'} found
                    {groupedItems && ` across ${groupedItems.length} food ${groupedItems.length === 1 ? 'section' : 'sections'}`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSearchQuery('')}
                className="text-xs font-bold text-brand-green hover:text-brand-green-hover bg-brand-beige-light hover:bg-brand-beige px-3 py-1.5 rounded-xl border border-brand-beige-dark transition-all shrink-0 min-h-[36px]"
              >
                Clear Search
              </button>
            </div>
          </ScrollReveal>
        )}

        {/* Non-blocking verification status banner */}
        {isHydrated && isValidating && !table && (
          <div className="py-2 px-3 rounded-xl bg-brand-green/10 text-brand-green text-xs flex items-center justify-center gap-2 animate-pulse">
            <div className="w-3.5 h-3.5 rounded-full border-2 border-brand-green border-t-transparent animate-spin" />
            <span className="font-semibold text-[11px]">Verifying table & connecting session...</span>
          </div>
        )}

        {filteredItems.length === 0 ? (
          /* Empty Search State */
          <div className="py-16 text-center space-y-2 px-4">
            <p className="font-extrabold text-base text-brand-green">No matching items found</p>
            <p className="text-xs text-brand-green/60 max-w-sm mx-auto">
              Try searching with another keyword or pick a category from the navigation bar.
            </p>
          </div>
        ) : groupedItems ? (
          /* Grouped Categorized View (when 'All' is selected) */
          <div className="space-y-6 sm:space-y-8">
            {groupedItems.map((group) => (
              <section key={group.category.id} className="space-y-2.5 sm:space-y-3">
                {/* Section heading appears slightly before cards */}
                <ScrollReveal direction="up" distance={12} duration={350} delay={0}>
                  <div className="flex items-center gap-2 pb-1 border-b border-brand-beige-dark/60">
                    <span className="text-base sm:text-lg">{group.category.icon}</span>
                    <h3 className="font-extrabold text-sm sm:text-base md:text-lg text-brand-green">
                      {group.category.name}
                    </h3>
                    <span className="text-xs text-brand-green/50 font-semibold font-mono">
                      ({group.items.length})
                    </span>
                  </div>
                </ScrollReveal>

                {/* Staggered Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  {group.items.map((item, idx) => (
                    <FoodCard key={item.id} item={item} index={idx} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          /* Filtered Grid View */
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-brand-green/60 px-1">
              <span>Showing {filteredItems.length} delicious items</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {filteredItems.map((item, idx) => (
                <FoodCard key={item.id} item={item} index={idx} />
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Floating Sticky Cart Bar (Always accessible on mobile & tablet) */}
      {isHydrated && itemCount > 0 && (
        <div className="fixed bottom-3 sm:bottom-4 inset-x-0 z-40 px-3 sm:px-4 max-w-lg mx-auto pointer-events-none pb-[env(safe-area-inset-bottom,0px)]">
          <button
            type="button"
            onClick={() => setIsCartOpen(true)}
            className="w-full py-2.5 sm:py-3 px-4 sm:px-5 rounded-2xl bg-brand-green hover:bg-brand-green-hover text-brand-beige flex items-center justify-between shadow-2xl border border-brand-gold/40 pointer-events-auto active:scale-[0.99] transition-all min-h-[48px]"
          >
            <div className="flex items-center gap-2 sm:gap-2.5">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-brand-beige text-brand-green flex items-center justify-center font-bold text-xs shrink-0">
                {itemCount}
              </div>
              <div className="text-left">
                <p className="font-extrabold text-xs sm:text-sm text-brand-beige">View Your Order</p>
                <p className="text-[10px] sm:text-[11px] text-brand-beige-muted">
                  {itemCount} {itemCount === 1 ? 'item' : 'items'} in cart
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="font-mono font-black text-sm sm:text-base text-brand-gold">
                ₹{total.toFixed(0)}
              </span>
              <div className="w-6 h-6 rounded-full bg-brand-gold text-brand-green flex items-center justify-center shrink-0">
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>
          </button>
        </div>
      )}

      {/* Modals & Drawers */}
      <SearchModal />
      <CartDrawer />
      <OrderConfirmationModal />
      <OrderTrackingModal />
    </div>
  );
}
