'use client';

import React, { useState } from 'react';
import { MenuItem } from '@/types/cafe';
import { useCart } from '@/context/CartContext';
import { X, Plus, Minus, Check } from 'lucide-react';

interface Props {
  item: MenuItem | null;
  onClose: () => void;
}

export function ItemCustomizationModal({ item, onClose }: Props) {
  const { addItem } = useCart();

  const [quantity, setQuantity] = useState(1);
  const [selectedOptions, setSelectedOptions] = useState<{ [key: string]: string }>(() => {
    const initial: { [key: string]: string } = {};
    if (item?.options) {
      for (const opt of item.options) {
        if (opt.choices.length > 0) {
          initial[opt.name] = opt.choices[0].name;
        }
      }
    }
    return initial;
  });

  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([]);
  const [specialInstructions, setSpecialInstructions] = useState('');

  if (!item) return null;

  // Compute live price with add-ons
  let calculatedPrice = item.price;
  if (selectedAddOns.length > 0 && item.addOns) {
    for (const addOnName of selectedAddOns) {
      const match = item.addOns.find((a) => a.name === addOnName);
      if (match) calculatedPrice += match.price;
    }
  }

  const handleAddOnToggle = (addOnName: string) => {
    setSelectedAddOns((prev) =>
      prev.includes(addOnName) ? prev.filter((a) => a !== addOnName) : [...prev, addOnName]
    );
  };

  const handleAddToCart = () => {
    addItem(
      item,
      quantity,
      Object.keys(selectedOptions).length > 0 ? selectedOptions : undefined,
      selectedAddOns.length > 0 ? selectedAddOns : undefined,
      specialInstructions.trim() || undefined
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-brand-green-deep/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-brand-beige-dark overflow-hidden flex flex-col max-h-[90dvh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-4 sm:px-5 py-3 sm:py-4 bg-brand-beige border-b border-brand-beige-muted/60 flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full border border-emerald-600 p-0.5 flex items-center justify-center shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
              </span>
              <h3 className="font-extrabold text-base sm:text-lg text-brand-green">{item.name}</h3>
            </div>
            <p className="text-[11px] sm:text-xs text-brand-green/70 mt-0.5">Customize your order to perfection</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/80 hover:bg-white text-brand-green flex items-center justify-center transition-all shadow-xs shrink-0 min-h-[36px]"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 sm:p-5 space-y-4 sm:space-y-5 overflow-y-auto">
          {item.description && (
            <p className="text-xs text-brand-green/70 bg-brand-beige-light p-3 rounded-xl border border-brand-beige-dark/50">
              {item.description}
            </p>
          )}

          {/* Options (Radio choice) */}
          {item.options &&
            item.options.map((opt) => (
              <div key={opt.name} className="space-y-2">
                <label className="text-xs font-bold text-brand-green tracking-wide uppercase">
                  {opt.name} <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-1 xs:grid-cols-2 gap-2">
                  {opt.choices.map((choice) => {
                    const isSelected = selectedOptions[opt.name] === choice.name;
                    return (
                      <button
                        type="button"
                        key={choice.name}
                        onClick={() =>
                          setSelectedOptions((prev) => ({ ...prev, [opt.name]: choice.name }))
                        }
                        className={`flex items-center justify-between px-3 py-2.5 rounded-xl border text-xs font-semibold transition-all min-h-[40px] ${
                          isSelected
                            ? 'bg-brand-green text-brand-beige border-brand-green shadow-xs'
                            : 'bg-brand-beige-light text-brand-green border-brand-beige-dark hover:border-brand-green/40'
                        }`}
                      >
                        <span className="truncate mr-1">{choice.name}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-brand-gold shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

          {/* Add-Ons (Checkbox choices) */}
          {item.addOns && item.addOns.length > 0 && (
            <div className="space-y-2">
              <label className="text-xs font-bold text-brand-green tracking-wide uppercase">
                Add-Ons & Extras (Optional)
              </label>
              <div className="space-y-1.5">
                {item.addOns.map((addon) => {
                  const isChecked = selectedAddOns.includes(addon.name);
                  return (
                    <button
                      type="button"
                      key={addon.name}
                      onClick={() => handleAddOnToggle(addon.name)}
                      className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-xs font-medium transition-all min-h-[40px] ${
                        isChecked
                          ? 'bg-brand-green/5 border-brand-green text-brand-green font-bold'
                          : 'bg-white border-brand-beige-dark text-brand-green/80 hover:bg-brand-beige-light'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                            isChecked
                              ? 'bg-brand-green border-brand-green text-white'
                              : 'border-brand-beige-dark bg-white'
                          }`}
                        >
                          {isChecked && <Check className="w-3 h-3" />}
                        </div>
                        <span className="text-left">{addon.name}</span>
                      </div>
                      <span className="font-mono text-brand-green font-bold shrink-0 ml-2">+₹{addon.price}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Item Special Instructions */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-brand-green tracking-wide uppercase">
              Special Instructions for Chef / Barista
            </label>
            <input
              type="text"
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              placeholder="e.g. Less spicy, no onions, extra crispy..."
              maxLength={120}
              className="w-full px-3.5 py-2.5 rounded-xl bg-brand-beige-light border border-brand-beige-dark text-brand-green placeholder:text-brand-green/40 text-xs focus:outline-none focus:ring-2 focus:ring-brand-green min-h-[40px]"
            />
          </div>

          {/* Quantity Controls */}
          <div className="flex items-center justify-between pt-2 border-t border-brand-beige-muted/60">
            <span className="text-xs font-bold text-brand-green uppercase">Quantity</span>
            <div className="flex items-center gap-3 bg-brand-beige px-3 py-1 rounded-full border border-brand-beige-dark">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="w-7 h-7 rounded-full bg-white text-brand-green flex items-center justify-center font-bold hover:bg-brand-beige-light transition-all shadow-xs"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="font-mono font-bold text-sm text-brand-green w-5 text-center">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.min(20, q + 1))}
                className="w-7 h-7 rounded-full bg-brand-green text-brand-beige flex items-center justify-center font-bold hover:bg-brand-green-hover transition-all shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Modal Action Bar */}
        <div className="p-3.5 sm:p-4 bg-brand-beige-light border-t border-brand-beige-muted/60 shrink-0 pb-[calc(0.875rem+env(safe-area-inset-bottom,0px))]">
          <button
            type="button"
            onClick={handleAddToCart}
            className="w-full py-3 px-4 rounded-xl bg-brand-green hover:bg-brand-green-hover text-brand-beige font-bold text-sm flex items-center justify-between shadow-md active:scale-[0.99] transition-all min-h-[48px]"
          >
            <span>Add to Cart</span>
            <span className="font-mono font-black text-brand-gold">
              ₹{(calculatedPrice * quantity).toFixed(0)}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
