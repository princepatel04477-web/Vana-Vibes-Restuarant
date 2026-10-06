'use client';

import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { useCart } from '@/context/CartContext';
import { MENU_CATEGORIES, MENU_ITEMS } from '@/data/vaan-vibes-menu';
import { MenuItem } from '@/types/cafe';
import {
  Search,
  X,
  ArrowRight,
  Sparkles,
  Plus,
  Minus,
  UtensilsCrossed,
  SlidersHorizontal,
} from 'lucide-react';
import { ItemCustomizationModal } from './ItemCustomizationModal';

export function SearchModal() {
  const {
    isSearchOpen,
    setIsSearchOpen,
    searchQuery,
    setSearchQuery,
    setActiveCategory,
    addItem,
    updateQuantity,
    cart,
    getItemQuantityInCart,
  } = useCart();

  const [localQuery, setLocalQuery] = useState(searchQuery);
  const [selectedItemForCustomize, setSelectedItemForCustomize] = useState<MenuItem | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  // Sync with context search query when opened
  useEffect(() => {
    if (isSearchOpen) {
      previousActiveElementRef.current = document.activeElement as HTMLElement;
      setLocalQuery(searchQuery);

      // Auto-focus input on opening
      const timer = setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      }, 50);

      // Lock body scroll on mobile
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      return () => {
        clearTimeout(timer);
        document.body.style.overflow = originalOverflow;
      };
    } else {
      // Restore focus to search trigger on close
      if (previousActiveElementRef.current && typeof previousActiveElementRef.current.focus === 'function') {
        previousActiveElementRef.current.focus();
      }
    }
  }, [isSearchOpen, searchQuery]);

  // Handle Escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isSearchOpen) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchOpen]);

  const handleClose = useCallback(() => {
    setIsSearchOpen(false);
  }, [setIsSearchOpen]);

  const handleClear = useCallback(() => {
    setLocalQuery('');
    setSearchQuery('');
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [setSearchQuery]);

  // Execute search: applies query to context, closes modal, scrolls to results
  const executeSearch = useCallback(
    (queryToExecute?: string) => {
      const q = typeof queryToExecute === 'string' ? queryToExecute : localQuery;
      setSearchQuery(q.trim());
      setIsSearchOpen(false);

      // Scroll to menu content
      const menuAnchor = document.querySelector('main');
      if (menuAnchor) {
        menuAnchor.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    },
    [localQuery, setSearchQuery, setIsSearchOpen]
  );

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeSearch();
  };

  // Jump to specific category section
  const handleSelectSection = (slug: string) => {
    setActiveCategory(slug);
    setSearchQuery('');
    setLocalQuery('');
    setIsSearchOpen(false);

    // Scroll category pill into center
    const pill = document.querySelector(`[data-category-slug="${slug}"]`);
    if (pill) {
      pill.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
    const menuAnchor = document.querySelector('main');
    if (menuAnchor) {
      menuAnchor.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Computed matching food categories
  const matchingCategories = useMemo(() => {
    if (!localQuery.trim()) return [];
    const q = localQuery.toLowerCase().trim();

    return MENU_CATEGORIES.filter((cat) => {
      if (cat.id === 'all') return false;
      const catName = cat.name.toLowerCase();
      const catSlug = cat.slug.toLowerCase();

      if (catName.includes(q) || catSlug.includes(q) || q.includes(catName)) {
        return true;
      }

      return MENU_ITEMS.some(
        (item) =>
          item.category === cat.slug &&
          (item.name.toLowerCase().includes(q) ||
            (item.description && item.description.toLowerCase().includes(q)))
      );
    });
  }, [localQuery]);

  // Computed matching dishes
  const matchingItems = useMemo(() => {
    if (!localQuery.trim()) return [];
    const q = localQuery.toLowerCase().trim();
    const words = q.split(/\s+/).filter(Boolean);

    return MENU_ITEMS.filter((item) => {
      const name = item.name.toLowerCase();
      const cat = item.category.toLowerCase();
      const catName = (
        MENU_CATEGORIES.find((c) => c.slug === item.category)?.name || ''
      ).toLowerCase();
      const desc = (item.description || '').toLowerCase();

      if (name.includes(q) || cat.includes(q) || catName.includes(q) || desc.includes(q)) {
        return true;
      }

      return words.every(
        (w) =>
          name.includes(w) ||
          cat.includes(w) ||
          catName.includes(w) ||
          desc.includes(w)
      );
    });
  }, [localQuery]);

  // Quick popular picks when search is clean/empty
  const popularPicks = useMemo(() => {
    return MENU_ITEMS.filter((i) => i.popular).slice(0, 4);
  }, []);

  if (!isSearchOpen) return null;

  return (
    <>
      {/* Search Backdrop Overlay */}
      <div
        className="fixed inset-0 z-50 bg-brand-green/60 backdrop-blur-md transition-opacity duration-200 animate-in fade-in"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Search Modal Container */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search Vaan Vibes Menu"
        className="fixed inset-x-0 top-0 sm:top-6 z-50 max-w-2xl mx-auto px-3 sm:px-4 w-full flex flex-col items-center pointer-events-none"
      >
        <div className="w-full bg-white rounded-2xl shadow-2xl border border-brand-beige-dark overflow-hidden flex flex-col max-h-[calc(100dvh-1rem)] sm:max-h-[85dvh] pointer-events-auto animate-in fade-in-0 slide-in-from-top-3 duration-250 ease-out">
          {/* Top Search Input Bar with Icon, Clear, Arrow, and Close */}
          <form
            role="search"
            onSubmit={handleFormSubmit}
            className="p-2 sm:p-2.5 bg-brand-beige-light border-b border-brand-beige-dark/70 flex items-center gap-1.5 sm:gap-2 shrink-0 pt-[max(0.625rem,env(safe-area-inset-top,0px))]"
          >
            {/* Visual Input Field with Icon */}
            <div className="relative flex-1 flex items-center bg-white rounded-xl border border-brand-beige-dark focus-within:ring-2 focus-within:ring-brand-green focus-within:border-brand-green shadow-2xs transition-all">
              <div className="pl-3 sm:pl-3.5 pr-2 flex items-center pointer-events-none text-brand-green/60 shrink-0">
                <Search className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              </div>

              <input
                ref={inputRef}
                type="text"
                value={localQuery}
                onChange={(e) => setLocalQuery(e.target.value)}
                placeholder="Search coffee, pizza, pasta, toasties, shakes..."
                aria-label="Search coffee, drinks and food"
                autoComplete="off"
                spellCheck="false"
                className="w-full py-2.5 sm:py-3 pr-2 text-xs sm:text-sm text-brand-green placeholder:text-brand-green/40 bg-transparent focus:outline-none placeholder:truncate"
              />

              {/* Clear button (visible when query exists) */}
              {localQuery.length > 0 && (
                <button
                  type="button"
                  onClick={handleClear}
                  aria-label="Clear search query"
                  title="Clear"
                  className="p-1.5 mr-1 text-brand-green/50 hover:text-brand-green hover:bg-brand-beige rounded-lg transition-colors flex items-center justify-center shrink-0 min-h-[32px] min-w-[32px]"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Explicit Arrow / Apply Search Button (crucial for mobile & accessibility) */}
            <button
              type="submit"
              aria-label="Search"
              title="Apply Search"
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-brand-green hover:bg-brand-green-hover text-brand-gold flex items-center justify-center transition-all active:scale-95 shrink-0 shadow-xs cursor-pointer min-h-[40px] min-w-[40px]"
            >
              <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 text-brand-gold" />
            </button>

            {/* Explicit Close Button */}
            <button
              type="button"
              onClick={handleClose}
              aria-label="Close search"
              title="Close"
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white hover:bg-brand-beige text-brand-green border border-brand-beige-dark/80 flex items-center justify-center transition-all active:scale-95 shrink-0 min-h-[38px] min-w-[38px]"
            >
              <X className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            </button>
          </form>

          {/* Search Content Area (Results / Sections / Empty State) */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4 text-brand-green">
            {/* Suggested Food Sections */}
            {matchingCategories.length > 0 && (
              <div className="space-y-2 pb-1">
                <div className="flex items-center justify-between text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-brand-green/70 px-1">
                  <span>Suggested Food Sections ({matchingCategories.length})</span>
                  <span className="text-[9px] font-medium text-brand-green/50 lowercase">jump to section</span>
                </div>
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  {matchingCategories.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => handleSelectSection(cat.slug)}
                      className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl bg-brand-beige-light hover:bg-brand-green text-brand-green hover:text-brand-beige border border-brand-beige-dark hover:border-brand-green text-xs font-bold transition-all group active:scale-98"
                    >
                      <span className="text-sm shrink-0">{cat.icon}</span>
                      <span>{cat.name}</span>
                      <ArrowRight className="w-3 h-3 opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Matching Dishes List */}
            {localQuery.trim().length > 0 ? (
              matchingItems.length > 0 ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-brand-green/70 px-1">
                    <span>Matching Dishes ({matchingItems.length})</span>
                    <button
                      type="button"
                      onClick={() => executeSearch()}
                      className="text-brand-green font-bold hover:underline lowercase text-[10px]"
                    >
                      view all in menu &rarr;
                    </button>
                  </div>

                  <div className="divide-y divide-brand-beige-dark/50 rounded-xl border border-brand-beige-dark bg-white overflow-hidden shadow-2xs">
                    {matchingItems.map((item, idx) => {
                      const qty = getItemQuantityInCart(item.id);
                      const cartItem = cart.find((ci) => ci.menuItemId === item.id);
                      const hasOptions =
                        (item.options && item.options.length > 0) ||
                        (item.addOns && item.addOns.length > 0);

                      return (
                        <div
                          key={item.id}
                          style={{ animationDelay: `${Math.min(idx * 35, 250)}ms` }}
                          className="p-3 flex items-center justify-between gap-3 hover:bg-brand-beige-light/60 transition-colors animate-in fade-in slide-in-from-bottom-1 duration-200 fill-mode-both"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {/* Veg dot */}
                              <span className="w-3.5 h-3.5 rounded border border-emerald-600 p-0.5 flex items-center justify-center bg-emerald-50 shrink-0">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                              </span>
                              <h4 className="font-extrabold text-xs sm:text-sm text-brand-green truncate">
                                {item.name}
                              </h4>
                              {item.popular && (
                                <span className="text-[9px] uppercase font-black px-1.5 py-0.2 rounded-full bg-brand-gold/20 text-brand-gold flex items-center gap-0.5 shrink-0">
                                  <Sparkles className="w-2.5 h-2.5" /> Popular
                                </span>
                              )}
                            </div>
                            {item.description && (
                              <p className="text-[11px] text-brand-green/60 line-clamp-1 mt-0.5">
                                {item.description}
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-1">
                              <span className="font-mono font-black text-xs sm:text-sm text-brand-green">
                                ₹{item.price}/-
                              </span>
                              <span className="text-[10px] text-brand-green/50 uppercase font-semibold">
                                • {item.category.replace('-', ' ')}
                              </span>
                            </div>
                          </div>

                          {/* Quick Add or Quantity controls right in search */}
                          <div className="shrink-0">
                            {qty > 0 ? (
                              <div className="flex items-center gap-1 bg-brand-green text-brand-beige px-2 py-1 rounded-full shadow-2xs">
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (cartItem) {
                                      updateQuantity(cartItem.id, cartItem.quantity - 1);
                                    }
                                  }}
                                  className="w-6 h-6 rounded-full bg-brand-green-light flex items-center justify-center hover:bg-brand-green-deep transition-colors"
                                  aria-label="Decrease quantity"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <span className="font-mono font-bold text-xs w-4 text-center">
                                  {qty}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (hasOptions) {
                                      setSelectedItemForCustomize(item);
                                    } else if (cartItem) {
                                      updateQuantity(cartItem.id, cartItem.quantity + 1);
                                    } else {
                                      addItem(item, 1);
                                    }
                                  }}
                                  className="w-6 h-6 rounded-full bg-brand-green-light flex items-center justify-center hover:bg-brand-green-deep transition-colors"
                                  aria-label="Increase quantity"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  if (hasOptions) {
                                    setSelectedItemForCustomize(item);
                                  } else {
                                    addItem(item, 1);
                                  }
                                }}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-brand-beige text-brand-green hover:bg-brand-green hover:text-brand-beige font-bold text-xs border border-brand-beige-dark transition-all active:scale-95 shadow-2xs min-h-[34px]"
                              >
                                {hasOptions ? (
                                  <>
                                    <SlidersHorizontal className="w-3 h-3" />
                                    <span>Customize</span>
                                  </>
                                ) : (
                                  <>
                                    <Plus className="w-3 h-3" />
                                    <span>Add</span>
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                /* No Results State (Friendly empty state matching Requirement 21) */
                <div className="py-10 text-center space-y-3 px-4">
                  <div className="w-12 h-12 rounded-full bg-brand-beige-light border border-brand-beige-dark flex items-center justify-center mx-auto text-brand-green/50">
                    <UtensilsCrossed className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-extrabold text-sm sm:text-base text-brand-green">
                      No results found for &ldquo;{localQuery}&rdquo;
                    </p>
                    <p className="text-xs text-brand-green/60 max-w-xs mx-auto leading-relaxed">
                      Try another keyword like coffee, pasta, pizza, shake, or toastie.
                    </p>
                  </div>
                  {/* Quick popular suggestion buttons */}
                  <div className="pt-2 flex flex-wrap justify-center gap-1.5">
                    {['Hot Coffee', 'Pizza', 'Pasta', 'Frappe', 'Toastie'].map((term) => (
                      <button
                        key={term}
                        type="button"
                        onClick={() => {
                          setLocalQuery(term);
                          if (inputRef.current) inputRef.current.focus();
                        }}
                        className="px-2.5 py-1 rounded-full bg-brand-beige-light hover:bg-brand-green hover:text-brand-beige text-brand-green text-xs font-semibold border border-brand-beige-dark transition-all"
                      >
                        {term}
                      </button>
                    ))}
                  </div>
                </div>
              )
            ) : (
              /* Initial State (Before User Types): Popular Dishes & Quick Sections */
              <div className="space-y-3.5 py-1">
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-brand-green/70 px-1">
                    <Sparkles className="w-3 h-3 text-brand-gold" />
                    <span>Popular Recommendations</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {popularPicks.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setLocalQuery(item.name);
                          executeSearch(item.name);
                        }}
                        className="p-2.5 rounded-xl bg-brand-beige-light/70 hover:bg-brand-green hover:text-brand-beige border border-brand-beige-dark/70 text-left transition-all group flex items-center justify-between"
                      >
                        <div className="min-w-0 pr-2">
                          <p className="font-bold text-xs truncate group-hover:text-brand-beige">
                            {item.name}
                          </p>
                          <p className="text-[10px] text-brand-green/60 group-hover:text-brand-beige/70 font-mono">
                            ₹{item.price}/-
                          </p>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-brand-green/70 px-1">
                    Explore Quick Sections
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {MENU_CATEGORIES.filter((c) => c.id !== 'all')
                      .slice(0, 8)
                      .map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => handleSelectSection(cat.slug)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white hover:bg-brand-green hover:text-brand-beige text-brand-green text-xs font-semibold border border-brand-beige-dark transition-all"
                        >
                          <span className="text-xs">{cat.icon}</span>
                          <span>{cat.name}</span>
                        </button>
                      ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Bar: Action Helper */}
          {localQuery.trim().length > 0 && matchingItems.length > 0 && (
            <div className="p-2.5 sm:p-3 bg-brand-beige-light border-t border-brand-beige-dark/70 flex items-center justify-between gap-3 shrink-0 pb-[calc(0.625rem+env(safe-area-inset-bottom,0px))]">
              <span className="text-[11px] text-brand-green/70 hidden sm:inline">
                Press <kbd className="px-1.5 py-0.5 bg-white rounded border border-brand-beige-dark font-mono text-[10px]">Enter</kbd> or tap arrow to view results
              </span>
              <button
                type="button"
                onClick={() => executeSearch()}
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-brand-green hover:bg-brand-green-hover text-brand-beige font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all active:scale-98 min-h-[38px]"
              >
                <span>View All {matchingItems.length} Dishes</span>
                <ArrowRight className="w-3.5 h-3.5 text-brand-gold" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Item Customization Modal if triggered from search */}
      {selectedItemForCustomize && (
        <ItemCustomizationModal
          item={selectedItemForCustomize}
          onClose={() => setSelectedItemForCustomize(null)}
        />
      )}
    </>
  );
}
