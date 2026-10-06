'use client';

import React from 'react';
import { useCart } from '@/context/CartContext';
import { X, Plus, Minus, Trash2, ArrowRight, ShoppingBag, UtensilsCrossed } from 'lucide-react';

export function CartDrawer() {
  const {
    cart,
    isCartOpen,
    setIsCartOpen,
    setIsCheckoutOpen,
    updateQuantity,
    removeItem,
    clearCart,
    subtotal,
    tax,
    total,
    itemCount,
    table,
  } = useCart();

  if (!isCartOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-brand-green-deep/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full sm:max-w-md bg-white h-full h-[100dvh] shadow-2xl flex flex-col justify-between border-l border-brand-beige-dark animate-in slide-in-from-right duration-250"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="px-4 sm:px-5 py-3 sm:py-4 bg-brand-green text-brand-beige flex items-center justify-between border-b border-brand-green-light shrink-0">
          <div className="flex items-center gap-2 sm:gap-2.5">
            <ShoppingBag className="w-5 h-5 text-brand-gold shrink-0" />
            <div>
              <h2 className="font-extrabold text-base sm:text-lg">My Cart</h2>
              <p className="text-[11px] sm:text-xs text-brand-beige-muted">
                {table ? `Table ${table.tableNumber.toString().padStart(2, '0')}` : 'Dining Order'} • {itemCount} items
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsCartOpen(false)}
            className="w-8 h-8 rounded-full bg-brand-green-light hover:bg-brand-green-surface text-brand-beige flex items-center justify-center transition-all shrink-0 min-h-[36px]"
            aria-label="Close cart"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Cart Item List */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
              <div className="w-16 h-16 rounded-full bg-brand-beige flex items-center justify-center text-brand-green">
                <UtensilsCrossed className="w-8 h-8 opacity-40" />
              </div>
              <div className="space-y-1">
                <p className="font-extrabold text-base text-brand-green">Your cart is empty</p>
                <p className="text-xs text-brand-green/60">
                  Explore our artisanal coffees, fresh toasties, and chef specials!
                </p>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                className="px-5 py-2.5 rounded-full bg-brand-green text-brand-beige font-bold text-xs hover:bg-brand-green-hover transition-all min-h-[40px]"
              >
                Browse Menu
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between px-1 pb-1 border-b border-brand-beige-dark/50">
                <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-brand-green/50">
                  Selected Items ({itemCount})
                </span>
                <button
                  onClick={clearCart}
                  className="text-[11px] font-semibold text-red-600 hover:text-red-700 flex items-center gap-1 transition-colors min-h-[32px]"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Clear Cart
                </button>
              </div>

              {cart.map((item) => (
                <div
                  key={item.id}
                  className="p-3 sm:p-3.5 rounded-xl bg-brand-beige-light border border-brand-beige-dark/70 flex flex-col gap-2 transition-all"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-xs sm:text-sm text-brand-green leading-snug break-words">
                        {item.name}
                      </h4>
                      {/* Options & Addons display */}
                      {item.selectedOptions && (
                        <p className="text-[10px] sm:text-[11px] text-brand-green/60 font-medium break-words">
                          {Object.entries(item.selectedOptions)
                            .map(([k, v]) => `${k}: ${v}`)
                            .join(' • ')}
                        </p>
                      )}
                      {item.selectedAddOns && item.selectedAddOns.length > 0 && (
                        <p className="text-[10px] sm:text-[11px] text-brand-gold font-medium break-words">
                          Extras: {item.selectedAddOns.join(', ')}
                        </p>
                      )}
                      {item.specialInstructions && (
                        <p className="text-[10px] sm:text-[11px] italic text-brand-green/70 break-words">
                          Note: &ldquo;{item.specialInstructions}&rdquo;
                        </p>
                      )}
                    </div>
                    <span className="font-mono font-bold text-xs sm:text-sm text-brand-green whitespace-nowrap shrink-0">
                      ₹{(item.price * item.quantity).toFixed(0)}
                    </span>
                  </div>

                  {/* Quantity and unit price */}
                  <div className="flex items-center justify-between pt-1 border-t border-brand-beige-dark/40">
                    <span className="text-[10px] sm:text-[11px] text-brand-green/50 font-mono">
                      ₹{item.price} each
                    </span>

                    <div className="flex items-center gap-1.5 sm:gap-2 bg-white px-2 py-0.5 rounded-full border border-brand-beige-dark shadow-2xs">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="w-6 h-6 sm:w-7 sm:h-7 rounded-full hover:bg-brand-beige flex items-center justify-center text-brand-green transition-colors"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="font-mono font-bold text-xs w-4 text-center text-brand-green">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="w-6 h-6 sm:w-7 sm:h-7 rounded-full hover:bg-brand-beige flex items-center justify-center text-brand-green transition-colors"
                        aria-label="Increase quantity"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="w-6 h-6 sm:w-7 sm:h-7 ml-0.5 text-red-500 hover:text-red-700 flex items-center justify-center transition-colors"
                        aria-label="Remove item"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Cart Footer & Calculations */}
        {cart.length > 0 && (
          <div className="p-3.5 sm:p-4 bg-white border-t border-brand-beige-dark/70 space-y-2.5 sm:space-y-3 shadow-lg shrink-0 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
            {/* Price Breakdown */}
            <div className="space-y-1 sm:space-y-1.5 text-xs text-brand-green/80">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-mono font-semibold">₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Taxes & GST (5%)</span>
                <span className="font-mono font-semibold">₹{tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-extrabold text-sm sm:text-base text-brand-green pt-1.5 border-t border-brand-beige-dark">
                <span>Total Amount</span>
                <span className="font-mono text-brand-green">₹{total.toFixed(2)}</span>
              </div>
            </div>

            {/* Navigation Actions */}
            <div className="grid grid-cols-1 xs:grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsCartOpen(false)}
                className="py-2.5 sm:py-3 px-3 rounded-xl border border-brand-green text-brand-green hover:bg-brand-beige-light font-bold text-xs text-center transition-all min-h-[44px] flex items-center justify-center"
              >
                Continue Ordering
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsCartOpen(false);
                  setIsCheckoutOpen(true);
                }}
                className="py-2.5 sm:py-3 px-3 rounded-xl bg-brand-green hover:bg-brand-green-hover text-brand-beige font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all min-h-[44px]"
              >
                <span>Proceed to Order</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
