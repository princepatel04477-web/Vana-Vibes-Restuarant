'use client';

import React, { useRef, useState, useEffect, useMemo } from 'react';
import { MENU_CATEGORIES, MENU_ITEMS } from '@/data/vaan-vibes-menu';
import { useCart } from '@/context/CartContext';
import { Search, X, ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';

export function CategoryNav() {
  const { activeCategory, setActiveCategory, searchQuery, setSearchQuery, setIsSearchOpen } = useCart();
  const scrollRef = useRef<HTMLDivElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 10);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (el) {
      el.addEventListener('scroll', checkScroll, { passive: true });
      window.addEventListener('resize', checkScroll);
      return () => {
        el.removeEventListener('scroll', checkScroll);
        window.removeEventListener('resize', checkScroll);
      };
    }
  }, []);

  // Close suggestions dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const offset = direction === 'left' ? -250 : 250;
      scrollRef.current.scrollBy({ left: offset, behavior: 'smooth' });
      setTimeout(checkScroll, 320);
    }
  };

  // Compute matching food sections (categories) for suggestions
  const suggestedCategories = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();

    return MENU_CATEGORIES.filter((cat) => {
      if (cat.id === 'all') return false;
      const catName = cat.name.toLowerCase();
      const catSlug = cat.slug.toLowerCase();

      // Direct category name/slug match
      if (catName.includes(q) || catSlug.includes(q) || q.includes(catName)) {
        return true;
      }

      // Any items in this category match the query
      return MENU_ITEMS.some(
        (item) =>
          item.category === cat.slug &&
          (item.name.toLowerCase().includes(q) ||
            (item.description && item.description.toLowerCase().includes(q)))
      );
    });
  }, [searchQuery]);

  const handleSelectSection = (slug: string) => {
    setActiveCategory(slug);
    setSearchQuery('');
    setIsFocused(false);

    // Smoothly scroll category pill into center
    const pill = document.querySelector(`[data-category-slug="${slug}"]`);
    if (pill) {
      pill.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  };

  const getCategoryCount = (slug: string) => {
    return MENU_ITEMS.filter((i) => i.category === slug).length;
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsFocused(false);
    const menuAnchor = document.querySelector('main');
    if (menuAnchor) {
      menuAnchor.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="sticky top-[52px] sm:top-[57px] z-30 bg-brand-beige-light/95 backdrop-blur-md border-b border-brand-beige-muted/60 py-2.5 sm:py-3 px-3 sm:px-4 shadow-sm transition-all">
      <div className="max-w-6xl mx-auto space-y-2 sm:space-y-2.5">
        {/* Search Bar with Interactive Food Section Suggestions & Arrow Button */}
        <div ref={searchContainerRef} className="relative w-full">
          <form
            role="search"
            onSubmit={handleSearchSubmit}
            className="relative w-full flex items-center gap-1.5 sm:gap-2"
          >
            <div className="relative flex-1 flex items-center">
              <div className="absolute inset-y-0 left-0 pl-3 sm:pl-3.5 flex items-center pointer-events-none text-brand-green/50">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onFocus={() => {
                  setIsFocused(true);
                }}
                onClick={() => {
                  // Open focused search modal for mobile or desktop immersion
                  setIsSearchOpen(true);
                }}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsFocused(true);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setIsFocused(false);
                }}
                placeholder="Search coffee, pizza, pasta, toasties, shakes..."
                aria-label="Search coffee, drinks and dishes"
                className="w-full pl-9 sm:pl-10 pr-9 py-2 sm:py-2.5 rounded-xl bg-white border border-brand-beige-dark text-brand-green placeholder:text-brand-green/40 placeholder:truncate text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-brand-green shadow-xs transition-all min-h-[40px] cursor-pointer"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setIsFocused(false);
                  }}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-brand-green/50 hover:text-brand-green transition-colors min-h-[40px] px-1"
                  aria-label="Clear search query"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Explicit Arrow / Apply Search Button */}
            <button
              type="button"
              onClick={() => setIsSearchOpen(true)}
              aria-label="Open search mode"
              title="Search menu"
              className="w-10 h-10 rounded-xl bg-brand-green hover:bg-brand-green-hover text-brand-gold flex items-center justify-center transition-all active:scale-95 shadow-xs shrink-0 cursor-pointer min-h-[40px] min-w-[40px]"
            >
              <ArrowRight className="w-4 h-4 text-brand-gold" />
            </button>
          </form>

          {/* Food Section Suggestions Dropdown */}
          {isFocused && searchQuery.trim().length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-brand-beige-dark overflow-hidden z-50 animate-in fade-in-50 zoom-in-98 duration-150 max-h-[75vh] sm:max-h-[80vh] flex flex-col">
              {suggestedCategories.length > 0 ? (
                <div className="p-2.5 sm:p-3 bg-brand-beige-light/50 space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[10px] sm:text-[11px] uppercase font-black tracking-wider text-brand-green">
                      Suggested Food Sections ({suggestedCategories.length})
                    </span>
                    <span className="text-[9px] sm:text-[10px] text-brand-green/60 font-medium">
                      Click section to browse
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 sm:gap-2">
                    {suggestedCategories.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => handleSelectSection(cat.slug)}
                        className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-white hover:bg-brand-green text-brand-green hover:text-brand-beige border border-brand-beige-dark hover:border-brand-green shadow-xs font-bold text-xs transition-all group active:scale-98 max-w-full"
                      >
                        <span className="text-sm sm:text-base shrink-0">{cat.icon}</span>
                        <span className="truncate">{cat.name} Section</span>
                        <span className="text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded-full bg-brand-beige text-brand-green group-hover:bg-brand-green-light group-hover:text-brand-beige font-mono font-bold shrink-0">
                          {getCategoryCount(cat.slug)}
                        </span>
                        <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="py-6 text-center text-xs text-brand-green/60 px-4">
                  No food sections found matching &ldquo;{searchQuery}&rdquo;
                </div>
              )}
            </div>
          )}
        </div>

        {/* Categories Horizontal Carousel (Non-overlapping Flex Layout) */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Scroll Left Button */}
          <button
            type="button"
            onClick={() => scroll('left')}
            disabled={!canScrollLeft}
            className={`shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white hover:bg-brand-green text-brand-green hover:text-brand-beige border border-brand-beige-dark shadow-xs flex items-center justify-center transition-all ${
              !canScrollLeft
                ? 'opacity-30 cursor-not-allowed'
                : 'opacity-90 hover:opacity-100 active:scale-95'
            }`}
            aria-label="Scroll left"
            title="Scroll categories left"
          >
            <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>

          {/* Carousel Track (flex-1 - zero overlap with buttons) */}
          <div
            ref={scrollRef}
            className="flex-1 flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar scroll-smooth py-1"
          >
            {MENU_CATEGORIES.map((cat) => {
              const isActive = activeCategory === cat.slug;
              return (
                <button
                  key={cat.id}
                  data-category-slug={cat.slug}
                  onClick={() => {
                    setActiveCategory(cat.slug);
                    if (searchQuery) setSearchQuery('');
                  }}
                  className={`flex items-center gap-1 sm:gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-semibold whitespace-nowrap transition-all select-none shadow-xs shrink-0 ${
                    isActive
                      ? 'bg-brand-green text-brand-beige shadow-sm scale-105'
                      : 'bg-white text-brand-green hover:bg-brand-beige border border-brand-beige-dark/70 hover:border-brand-green/40'
                  }`}
                >
                  <span className="text-xs sm:text-sm">{cat.icon}</span>
                  <span>{cat.name}</span>
                </button>
              );
            })}
          </div>

          {/* Scroll Right Button */}
          <button
            type="button"
            onClick={() => scroll('right')}
            disabled={!canScrollRight}
            className={`shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white hover:bg-brand-green text-brand-green hover:text-brand-beige border border-brand-beige-dark shadow-xs flex items-center justify-center transition-all ${
              !canScrollRight
                ? 'opacity-30 cursor-not-allowed'
                : 'opacity-90 hover:opacity-100 active:scale-95'
            }`}
            aria-label="Scroll right"
            title="Scroll categories right"
          >
            <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
