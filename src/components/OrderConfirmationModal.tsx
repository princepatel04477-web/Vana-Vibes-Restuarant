'use client';

import React, { useState } from 'react';
import { useCart } from '@/context/CartContext';
import { X, CheckCircle2, AlertCircle, ArrowLeft, Loader2, User, Phone, MessageSquare } from 'lucide-react';

export function OrderConfirmationModal() {
  const {
    cart,
    table,
    customerDetails,
    setCustomerDetails,
    isCheckoutOpen,
    setIsCheckoutOpen,
    setIsCartOpen,
    subtotal,
    tax,
    total,
    placeOrder,
    isPlacingOrder,
    orderError,
  } = useCart();

  const [step, setStep] = useState<'details' | 'summary'>('details');
  const [formError, setFormError] = useState<string | null>(null);

  if (!isCheckoutOpen) return null;

  const validateAndProceed = () => {
    setFormError(null);
    if (!customerDetails.name || customerDetails.name.trim().length < 2) {
      setFormError('Please enter your full name (minimum 2 characters).');
      return;
    }

    const cleanMobile = customerDetails.mobile.replace(/\D/g, '');
    if (cleanMobile.length !== 10) {
      setFormError('Please enter a valid 10-digit Indian mobile number.');
      return;
    }

    setStep('summary');
  };

  const handleConfirmOrder = async () => {
    const res = await placeOrder();
    if (res.success) {
      setStep('details');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-brand-green-deep/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-brand-beige-dark overflow-hidden flex flex-col max-h-[92dvh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-4 sm:px-5 py-3 sm:py-4 bg-brand-green text-brand-beige border-b border-brand-green-light flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 sm:gap-2.5">
            {step === 'summary' && (
              <button
                type="button"
                onClick={() => setStep('details')}
                className="w-7 h-7 rounded-full bg-brand-green-light hover:bg-brand-green-surface flex items-center justify-center text-brand-beige transition-colors mr-1 shrink-0"
                aria-label="Back to details"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div>
              <h3 className="font-extrabold text-base sm:text-lg text-brand-beige">
                {step === 'details' ? 'Customer Details' : 'Confirm Your Order'}
              </h3>
              <p className="text-[11px] sm:text-xs text-brand-beige-muted">
                {table ? `Table ${table.tableNumber.toString().padStart(2, '0')}` : 'Dine-In Order'} • Vaan Vibes Cafe & Restro
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsCheckoutOpen(false)}
            className="w-8 h-8 rounded-full bg-brand-green-light hover:bg-brand-green-surface text-brand-beige flex items-center justify-center transition-all shrink-0 min-h-[36px]"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="flex border-b border-brand-beige-dark/60 bg-brand-beige-light shrink-0">
          <div
            className={`flex-1 py-2 text-center text-xs font-bold border-b-2 transition-all ${
              step === 'details'
                ? 'border-brand-green text-brand-green bg-white'
                : 'border-transparent text-brand-green/50'
            }`}
          >
            1. Details
          </div>
          <div
            className={`flex-1 py-2 text-center text-xs font-bold border-b-2 transition-all ${
              step === 'summary'
                ? 'border-brand-green text-brand-green bg-white'
                : 'border-transparent text-brand-green/50'
            }`}
          >
            2. Review & Place
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-3.5 sm:space-y-4">
          {formError && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {orderError && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{orderError}</span>
            </div>
          )}

          {step === 'details' ? (
            <div className="space-y-3.5 sm:space-y-4">
              {/* Verified Table Banner */}
              <div className="p-3 sm:p-3.5 rounded-xl bg-brand-beige border border-brand-gold/30 flex items-center justify-between gap-2">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-brand-green/60">
                    Table Location
                  </span>
                  <p className="font-extrabold text-xs sm:text-sm text-brand-green">
                    {table ? `Table ${table.tableNumber.toString().padStart(2, '0')} (${table.name})` : 'Dine-In Area'}
                  </p>
                </div>
                <div className="flex items-center gap-1 text-emerald-700 font-bold text-xs bg-white/80 px-2.5 py-1 rounded-full border border-emerald-200 shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>QR Verified</span>
                </div>
              </div>

              {/* Customer Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-brand-green flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-brand-green/70 shrink-0" />
                  <span>Full Name</span>
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={customerDetails.name}
                  onChange={(e) =>
                    setCustomerDetails((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="e.g. Rahul Patel"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-brand-beige-dark text-brand-green text-sm focus:outline-none focus:ring-2 focus:ring-brand-green shadow-xs min-h-[42px]"
                />
              </div>

              {/* Mobile Number */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-brand-green flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-brand-green/70 shrink-0" />
                  <span>Mobile Number (for live order status)</span>
                  <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-xs font-bold text-brand-green/60 select-none">
                    +91
                  </span>
                  <input
                    type="tel"
                    value={customerDetails.mobile}
                    onChange={(e) =>
                      setCustomerDetails((prev) => ({
                        ...prev,
                        mobile: e.target.value.replace(/\D/g, '').slice(0, 10),
                      }))
                    }
                    placeholder="98765 43210"
                    maxLength={10}
                    className="w-full pl-12 pr-3.5 py-2.5 rounded-xl bg-white border border-brand-beige-dark text-brand-green text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-green shadow-xs min-h-[42px]"
                  />
                </div>
                <p className="text-[10px] sm:text-[11px] text-brand-green/50">
                  Required to send order updates & digital invoice receipt.
                </p>
              </div>

              {/* Special Instructions */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-brand-green flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-brand-green/70 shrink-0" />
                  <span>Special Kitchen Instructions (Optional)</span>
                </label>
                <textarea
                  value={customerDetails.specialInstructions || ''}
                  onChange={(e) =>
                    setCustomerDetails((prev) => ({
                      ...prev,
                      specialInstructions: e.target.value,
                    }))
                  }
                  placeholder="e.g. Less spicy in all dishes, serve coffee together with dessert..."
                  rows={2}
                  maxLength={200}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-brand-beige-dark text-brand-green text-xs focus:outline-none focus:ring-2 focus:ring-brand-green shadow-xs"
                />
              </div>
            </div>
          ) : (
            /* Step 2: Summary Review */
            <div className="space-y-3.5 sm:space-y-4">
              {/* Customer & Table Recap */}
              <div className="p-3 sm:p-3.5 rounded-xl bg-brand-beige-light border border-brand-beige-dark text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-brand-green/60">Customer:</span>
                  <span className="font-bold text-brand-green">{customerDetails.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-brand-green/60">Mobile:</span>
                  <span className="font-mono font-bold text-brand-green">+91 {customerDetails.mobile}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-brand-green/60">Table:</span>
                  <span className="font-bold text-brand-green">
                    {table ? `Table ${table.tableNumber.toString().padStart(2, '0')}` : 'General Table'}
                  </span>
                </div>
                {customerDetails.specialInstructions && (
                  <div className="pt-1.5 border-t border-brand-beige-dark/50 text-brand-green/80 italic break-words">
                    Note: &ldquo;{customerDetails.specialInstructions}&rdquo;
                  </div>
                )}
              </div>

              {/* Order Items List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-brand-green/50 px-1">
                  <span>Item Breakdown</span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCheckoutOpen(false);
                      setIsCartOpen(true);
                    }}
                    className="text-brand-green underline hover:text-brand-green-hover min-h-[32px] flex items-center"
                  >
                    Edit Cart
                  </button>
                </div>

                <div className="divide-y divide-brand-beige-dark/50 bg-white rounded-xl border border-brand-beige-dark/70 overflow-hidden">
                  {cart.map((item) => (
                    <div key={item.id} className="p-2.5 sm:p-3 flex items-center justify-between text-xs gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-brand-green leading-snug break-words">
                          {item.name}{' '}
                          <span className="font-mono text-brand-green/60">× {item.quantity}</span>
                        </div>
                        {item.selectedOptions && (
                          <div className="text-[10px] text-brand-green/60 break-words">
                            {Object.values(item.selectedOptions).join(', ')}
                          </div>
                        )}
                        {item.selectedAddOns && item.selectedAddOns.length > 0 && (
                          <div className="text-[10px] text-brand-gold break-words">
                            {item.selectedAddOns.join(', ')}
                          </div>
                        )}
                      </div>
                      <span className="font-mono font-bold text-brand-green shrink-0">
                        ₹{(item.price * item.quantity).toFixed(0)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Financial Totals */}
              <div className="p-3 sm:p-3.5 rounded-xl bg-white border border-brand-beige-dark space-y-1.5 text-xs">
                <div className="flex justify-between text-brand-green/70">
                  <span>Subtotal</span>
                  <span className="font-mono">₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-brand-green/70">
                  <span>GST (5%)</span>
                  <span className="font-mono">₹{tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-extrabold text-sm text-brand-green pt-1.5 border-t border-brand-beige-dark">
                  <span>Grand Total</span>
                  <span className="font-mono text-base">₹{total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div className="p-3.5 sm:p-4 bg-brand-beige-light border-t border-brand-beige-muted/60 flex flex-col-reverse xs:flex-row items-stretch xs:items-center justify-between gap-2.5 sm:gap-3 shrink-0 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
          {step === 'details' ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setIsCheckoutOpen(false);
                  setIsCartOpen(true);
                }}
                className="py-2.5 sm:py-3 px-4 rounded-xl border border-brand-green text-brand-green hover:bg-brand-beige font-bold text-xs transition-colors min-h-[44px] flex items-center justify-center"
              >
                Back to Cart
              </button>
              <button
                type="button"
                onClick={validateAndProceed}
                className="flex-1 py-2.5 sm:py-3 px-4 rounded-xl bg-brand-green hover:bg-brand-green-hover text-brand-beige font-bold text-xs shadow-md transition-all active:scale-95 min-h-[44px] flex items-center justify-center"
              >
                Review Order Summary
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setStep('details')}
                disabled={isPlacingOrder}
                className="py-2.5 sm:py-3 px-4 rounded-xl border border-brand-green text-brand-green hover:bg-brand-beige font-bold text-xs transition-colors disabled:opacity-50 min-h-[44px] flex items-center justify-center"
              >
                Edit Details
              </button>
              <button
                type="button"
                onClick={handleConfirmOrder}
                disabled={isPlacingOrder}
                className="flex-1 py-2.5 sm:py-3 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs sm:text-sm shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-60 min-h-[44px]"
              >
                {isPlacingOrder ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                    <span>Sending to Kitchen...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Confirm & Place Order (₹{total.toFixed(0)})</span>
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
