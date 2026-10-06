'use client';

import React, { useState, useRef } from 'react';
import { useCart } from '@/context/CartContext';
import { X, CheckCircle2, AlertCircle, AlertTriangle, ArrowLeft, Loader2, User, Phone, MessageSquare } from 'lucide-react';

export function OrderConfirmationModal() {
  const {
    cart,
    table,
    customerDetails,
    setCustomerDetails,
    isCheckoutOpen,
    setIsCheckoutOpen,
    setIsCartOpen,
    total,
    placeOrder,
    isPlacingOrder,
    orderError,
  } = useCart();

  const [step, setStep] = useState<'details' | 'summary'>('details');
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; mobile?: string }>({});
  const [generalError, setGeneralError] = useState<string | null>(null);

  const nameInputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);

  if (!isCheckoutOpen) return null;

  const validateField = (field: 'name' | 'mobile', value: string): string | undefined => {
    if (field === 'name') {
      const trimmed = value.trim();
      if (!trimmed) {
        return 'Please enter your full name.';
      }
      if (trimmed.length < 2) {
        return 'Name must be at least 2 characters long.';
      }
    }

    if (field === 'mobile') {
      const clean = value.trim();
      if (!clean) {
        return 'Please enter your phone number.';
      }
      if (!/^\d{10}$/.test(clean)) {
        return 'Phone number must contain exactly 10 digits.';
      }
    }

    return undefined;
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCustomerDetails((prev) => ({ ...prev, name: val }));
    if (fieldErrors.name) {
      const err = validateField('name', val);
      setFieldErrors((prev) => ({ ...prev, name: err }));
    }
  };

  const handleNameBlur = () => {
    const err = validateField('name', customerDetails.name || '');
    setFieldErrors((prev) => ({ ...prev, name: err }));
  };

  const handleMobileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 10);
    setCustomerDetails((prev) => ({ ...prev, mobile: digitsOnly }));
    if (fieldErrors.mobile) {
      const err = validateField('mobile', digitsOnly);
      setFieldErrors((prev) => ({ ...prev, mobile: err }));
    }
  };

  const handleMobileBlur = () => {
    const err = validateField('mobile', customerDetails.mobile || '');
    setFieldErrors((prev) => ({ ...prev, mobile: err }));
  };

  const validateAndProceed = () => {
    setGeneralError(null);
    const nameErr = validateField('name', customerDetails.name || '');
    const mobileErr = validateField('mobile', customerDetails.mobile || '');

    const errors: { name?: string; mobile?: string } = {};
    if (nameErr) errors.name = nameErr;
    if (mobileErr) errors.mobile = mobileErr;

    setFieldErrors(errors);

    if (nameErr) {
      nameInputRef.current?.focus();
      return;
    }
    if (mobileErr) {
      mobileInputRef.current?.focus();
      return;
    }

    setStep('summary');
  };

  const handleConfirmOrder = async () => {
    setGeneralError(null);
    const res = await placeOrder();
    if (res.success) {
      setShowWarningModal(false);
      setStep('details');
      setFieldErrors({});
    } else {
      setShowWarningModal(false);
      if (res.fieldErrors && Object.keys(res.fieldErrors).length > 0) {
        setFieldErrors(res.fieldErrors);
        setStep('details');
        if (res.fieldErrors.name) {
          nameInputRef.current?.focus();
        } else if (res.fieldErrors.mobile) {
          mobileInputRef.current?.focus();
        }
      } else {
        setGeneralError(res.error || 'Failed to place order. Please try again.');
      }
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
                disabled={isPlacingOrder}
                className="w-7 h-7 rounded-full bg-brand-green-light hover:bg-brand-green-surface flex items-center justify-center text-brand-beige transition-colors mr-1 shrink-0 disabled:opacity-50 cursor-pointer"
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
                {table ? `Table ${table.tableNumber}` : 'Dine-In Order'} • Vaan Vibes Cafe & Restro
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsCheckoutOpen(false)}
            disabled={isPlacingOrder}
            className="w-8 h-8 rounded-full bg-brand-green-light hover:bg-brand-green-surface text-brand-beige flex items-center justify-center transition-all shrink-0 min-h-[36px] disabled:opacity-50 cursor-pointer"
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
          {/* General Error Banner */}
          {(generalError || (orderError && !fieldErrors.name && !fieldErrors.mobile)) && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span className="font-semibold">{generalError || orderError}</span>
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
                    {table ? `Table ${table.tableNumber}` : 'Dine-In Area'}
                  </p>
                </div>
                <div className="flex items-center gap-1 text-emerald-700 font-bold text-xs bg-white/80 px-2.5 py-1 rounded-full border border-emerald-200 shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>QR Verified</span>
                </div>
              </div>

              {/* Customer Name Field */}
              <div className="space-y-1.5">
                <label htmlFor="customer-name-input" className="text-xs font-bold text-brand-green flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-brand-green/70 shrink-0" />
                  <span>Full Name</span>
                  <span className="text-red-500 font-bold" aria-hidden="true">*</span>
                </label>
                <input
                  id="customer-name-input"
                  ref={nameInputRef}
                  type="text"
                  value={customerDetails.name}
                  onChange={handleNameChange}
                  onBlur={handleNameBlur}
                  placeholder="e.g. Rahul Patel"
                  aria-required="true"
                  aria-invalid={!!fieldErrors.name}
                  aria-describedby={fieldErrors.name ? 'name-field-error' : undefined}
                  className={`w-full px-3.5 py-2.5 rounded-xl bg-white border text-sm text-brand-green focus:outline-none shadow-xs min-h-[42px] transition-colors ${
                    fieldErrors.name
                      ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100 bg-red-50/10'
                      : 'border-brand-beige-dark focus:border-brand-green focus:ring-2 focus:ring-brand-green/20'
                  }`}
                />
                {fieldErrors.name && (
                  <p id="name-field-error" className="text-xs font-semibold text-red-600 flex items-center gap-1.5 mt-1 animate-in fade-in">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-500" />
                    <span>{fieldErrors.name}</span>
                  </p>
                )}
              </div>

              {/* WhatsApp Number Field */}
              <div className="space-y-1.5">
                <label htmlFor="customer-mobile-input" className="text-xs font-bold text-brand-green flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-brand-green/70 shrink-0" />
                  <span>WhatsApp Number (for digital bill)</span>
                  <span className="text-red-500 font-bold" aria-hidden="true">*</span>
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-xs font-bold text-brand-green/60 select-none pointer-events-none">
                    +91
                  </span>
                  <input
                    id="customer-mobile-input"
                    ref={mobileInputRef}
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel"
                    value={customerDetails.mobile}
                    onChange={handleMobileChange}
                    onBlur={handleMobileBlur}
                    placeholder="9876543210"
                    maxLength={10}
                    aria-required="true"
                    aria-invalid={!!fieldErrors.mobile}
                    aria-describedby={fieldErrors.mobile ? 'mobile-field-error' : 'mobile-field-hint'}
                    className={`w-full pl-12 pr-3.5 py-2.5 rounded-xl bg-white border text-sm font-mono text-brand-green focus:outline-none shadow-xs min-h-[42px] transition-colors ${
                      fieldErrors.mobile
                        ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100 bg-red-50/10'
                        : 'border-brand-beige-dark focus:border-brand-green focus:ring-2 focus:ring-brand-green/20'
                    }`}
                  />
                </div>
                {fieldErrors.mobile ? (
                  <p id="mobile-field-error" className="text-xs font-semibold text-red-600 flex items-center gap-1.5 mt-1 animate-in fade-in">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-500" />
                    <span>{fieldErrors.mobile}</span>
                  </p>
                ) : (
                  <p id="mobile-field-hint" className="text-[10px] sm:text-[11px] text-brand-green/50">
                    Required to send your digital bill receipt on WhatsApp. Enter 10 digits without +91 or spaces.
                  </p>
                )}
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
                    {table ? `Table ${table.tableNumber}` : 'General Table'}
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
                    className="text-brand-green underline hover:text-brand-green-hover min-h-[32px] flex items-center cursor-pointer"
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
                      <div className="flex flex-col items-end shrink-0">
                        <span className="font-mono font-bold text-brand-green">
                          ₹{(item.price * item.quantity).toFixed(0)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Financial Totals */}
              <div className="p-3 sm:p-3.5 rounded-xl bg-white border border-brand-beige-dark text-xs">
                <div className="flex justify-between font-extrabold text-sm text-brand-green">
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
                className="py-2.5 sm:py-3 px-4 rounded-xl border border-brand-green text-brand-green hover:bg-brand-beige font-bold text-xs transition-colors min-h-[44px] flex items-center justify-center cursor-pointer"
              >
                Back to Cart
              </button>
              <button
                type="button"
                onClick={validateAndProceed}
                className="flex-1 py-2.5 sm:py-3 px-4 rounded-xl bg-brand-green hover:bg-brand-green-hover text-brand-beige font-bold text-xs shadow-md transition-all active:scale-95 min-h-[44px] flex items-center justify-center cursor-pointer"
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
                className="py-2.5 sm:py-3 px-4 rounded-xl border border-brand-green text-brand-green hover:bg-brand-beige font-bold text-xs transition-colors disabled:opacity-50 min-h-[44px] flex items-center justify-center cursor-pointer"
              >
                Edit Details
              </button>
              <button
                type="button"
                onClick={() => setShowWarningModal(true)}
                disabled={isPlacingOrder}
                className="flex-1 py-2.5 sm:py-3 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs sm:text-sm shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-60 min-h-[44px] cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Confirm & Place Order (₹{total.toFixed(0)})</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Warning Confirmation Modal */}
      {showWarningModal && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => {
            if (!isPlacingOrder) setShowWarningModal(false);
          }}
        >
          <div
            className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-brand-beige-dark overflow-hidden p-5 sm:p-6 space-y-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Icon & Title */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-black text-lg text-brand-green leading-tight">
                  Confirm & Place Order?
                </h4>
                <p className="text-xs text-brand-green/60 font-mono mt-0.5">
                  {table ? `Table ${table.tableNumber}` : 'Dining Order'} • Vaan Vibes
                </p>
              </div>
            </div>

            {/* Total Display */}
            <div className="p-3.5 rounded-2xl bg-brand-beige-light/70 border border-brand-beige-dark/60 flex items-center justify-between">
              <span className="text-xs font-bold text-brand-green/70 uppercase tracking-wide">
                Order Total
              </span>
              <span className="font-mono font-black text-lg text-brand-green">
                ₹{total.toFixed(2)}
              </span>
            </div>

            {/* Cancellation Notice Warning */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-amber-50/90 border border-amber-200/90 text-amber-950 text-xs space-y-2">
              <p className="font-bold text-amber-900 leading-snug">
                Important: Orders cannot normally be cancelled after they are accepted by the restaurant.
              </p>
              <p className="text-amber-800/90 leading-relaxed text-[11px] sm:text-xs">
                Once the restaurant accepts your order, cancellation may no longer be available. Please review your order carefully before confirming.
              </p>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={isPlacingOrder}
                onClick={() => setShowWarningModal(false)}
                className="flex-1 py-2.5 sm:py-3 px-4 rounded-xl border border-brand-beige-dark font-bold text-xs text-brand-green/80 hover:bg-brand-beige transition-colors disabled:opacity-50 cursor-pointer min-h-[44px]"
              >
                Cancel / Go Back
              </button>
              <button
                type="button"
                disabled={isPlacingOrder}
                onClick={handleConfirmOrder}
                className="flex-1 py-2.5 sm:py-3 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs sm:text-sm shadow-md transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer min-h-[44px]"
              >
                {isPlacingOrder ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                    <span>Sending to Kitchen...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Confirm & Place Order</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
