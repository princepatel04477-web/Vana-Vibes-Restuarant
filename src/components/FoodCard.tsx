'use client';

import React, { useState } from 'react';
import { MenuItem } from '@/types/cafe';
import { useCart } from '@/context/CartContext';
import { Plus, Minus, Sparkles, SlidersHorizontal } from 'lucide-react';
import { ItemCustomizationModal } from './ItemCustomizationModal';
import { ScrollReveal } from './ScrollReveal';

interface Props {
  item: MenuItem;
  index?: number;
}

export function FoodCard({ item, index = 0 }: Props) {
  const { addItem, updateQuantity, cart, getItemQuantityInCart } = useCart();
  const [isCustomizeOpen, setIsCustomizeOpen] = useState(false);

  const quantityInCart = getItemQuantityInCart(item.id);
  const hasOptions = (item.options && item.options.length > 0) || (item.addOns && item.addOns.length > 0);

  // Find existing cart item for quick +/- if standard
  const existingCartItem = cart.find((ci) => ci.menuItemId === item.id);

  const handleInitialAdd = () => {
    if (hasOptions) {
      setIsCustomizeOpen(true);
    } else {
      addItem(item, 1);
    }
  };

  const handleIncrement = () => {
    if (hasOptions) {
      setIsCustomizeOpen(true);
    } else if (existingCartItem) {
      updateQuantity(existingCartItem.id, existingCartItem.quantity + 1);
    } else {
      addItem(item, 1);
    }
  };

  const handleDecrement = () => {
    if (existingCartItem) {
      updateQuantity(existingCartItem.id, existingCartItem.quantity - 1);
    }
  };

  return (
    <>
      <ScrollReveal
        direction="up"
        distance={20}
        duration={420}
        staggerIndex={index % 6}
        staggerBaseDelay={75}
        className="h-full"
      >
        <div className="group relative bg-white rounded-2xl border border-brand-beige-dark/70 hover:border-brand-green/30 p-3.5 sm:p-4 transition-all duration-200 hover:-translate-y-1 hover:shadow-md flex flex-col justify-between overflow-hidden h-full">
        {/* Top Badges */}
        <div className="flex items-start justify-between gap-2 mb-2">
          {/* Veg Dot Symbol */}
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-4 rounded border border-emerald-600 p-0.5 flex items-center justify-center bg-emerald-50 shrink-0">
              <span className="w-2 h-2 rounded-full bg-emerald-600" />
            </span>
            {item.popular && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-brand-gold/15 text-brand-gold text-[10px] font-black uppercase tracking-wider whitespace-nowrap">
                <Sparkles className="w-2.5 h-2.5" /> Popular
              </span>
            )}
          </div>

          {/* Category Tag */}
          <span className="text-[10px] font-semibold text-brand-green/50 uppercase tracking-wider bg-brand-beige-light px-2 py-0.5 rounded whitespace-nowrap">
            {item.category.replace('-', ' ')}
          </span>
        </div>

        {/* Item Details */}
        <div className="space-y-1 mb-3">
          <h3 className="font-bold text-sm sm:text-base text-brand-green group-hover:text-brand-green-hover transition-colors leading-snug">
            {item.name}
          </h3>
          {item.description && (
            <p className="text-xs text-brand-green/70 line-clamp-2 leading-relaxed">
              {item.description}
            </p>
          )}
        </div>

        {/* Options note if available */}
        {hasOptions && (
          <div className="mb-3">
            <button
              onClick={() => setIsCustomizeOpen(true)}
              className="text-[11px] font-medium text-brand-gold hover:text-brand-green flex items-center gap-1 transition-colors min-h-[32px] py-1 text-left"
            >
              <SlidersHorizontal className="w-3 h-3 shrink-0" />
              <span>Customizable choices available</span>
            </button>
          </div>
        )}

        {/* Bottom Price & Add Controls */}
        <div className="pt-2.5 sm:pt-3 border-t border-brand-beige-dark/40 flex items-center justify-between gap-2 sm:gap-3">
          <div className="flex flex-col">
            <span className="text-[9px] sm:text-[10px] uppercase font-bold text-brand-green/40 tracking-wider">
              Price
            </span>
            <span className="font-mono font-black text-base sm:text-lg text-brand-green">
              ₹{item.price}/-
            </span>
          </div>

          {/* Action Button or Quantity Selector */}
          <div>
            {quantityInCart > 0 ? (
              <div className="flex items-center gap-1.5 sm:gap-2 bg-brand-green text-brand-beige px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-full shadow-xs">
                <button
                  type="button"
                  onClick={handleDecrement}
                  className="w-7 h-7 rounded-full bg-brand-green-light hover:bg-brand-green-deep flex items-center justify-center transition-colors"
                  aria-label="Decrease quantity"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="font-mono font-bold text-xs w-4 text-center">
                  {quantityInCart}
                </span>
                <button
                  type="button"
                  onClick={handleIncrement}
                  className="w-7 h-7 rounded-full bg-brand-green-light hover:bg-brand-green-deep flex items-center justify-center transition-colors"
                  aria-label="Increase quantity"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleInitialAdd}
                className="flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-full bg-brand-beige text-brand-green hover:bg-brand-green hover:text-brand-beige font-bold text-xs border border-brand-beige-dark/80 transition-all duration-150 shadow-xs active:scale-95 min-h-[36px]"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            )}
          </div>
        </div>
      </div>
      </ScrollReveal>

      {/* Customization Modal */}
      {isCustomizeOpen && (
        <ItemCustomizationModal item={item} onClose={() => setIsCustomizeOpen(false)} />
      )}
    </>
  );
}
