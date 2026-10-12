'use client';

import React, { useMemo, useState } from 'react';
import { DiscountType, Order } from '@/types/cafe';
import { billingApi } from '@/api/billing';
import { calculateBillBreakdown } from '@/utils/billing';
import { AlertCircle, AlertTriangle, Banknote, CreditCard, Smartphone, Tag, Wallet, X } from 'lucide-react';

const PAYMENT_METHODS = [
  { id: 'CASH', label: 'Cash', icon: Banknote },
  { id: 'UPI', label: 'UPI', icon: Smartphone },
  { id: 'CARD', label: 'Card', icon: CreditCard },
] as const;

type PaymentMethod = (typeof PAYMENT_METHODS)[number]['id'];

const QUICK_PERCENTS = [5, 10, 15, 20];
const KITCHEN_STATUSES = ['PLACED', 'ORDER_PLACED', 'ACCEPTED', 'PREPARING', 'IN_KITCHEN'];

interface Props {
  /** Unpaid orders of one dining session at this table. */
  sessionOrders: Order[];
  onSettled: () => void;
}

/** Discount the session was already billed with, as the value staff typed (% or ₹). */
function savedDiscountInput(order: Order | undefined): string {
  if (!order) return '';
  const value = order.discountType === 'AMOUNT' ? order.discountAmount : order.discountPercentage;
  return value ? value.toString() : '';
}

/**
 * Bill & settle a table's dining session in one place: apply a % or flat ₹ discount,
 * pick how the guest paid, and close the bill. The server recomputes the totals on settle.
 */
export function TableSettlePanel({ sessionOrders, onSettled }: Props) {
  const first = useMemo(
    () => [...sessionOrders].sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0],
    [sessionOrders]
  );
  const subtotal = sessionOrders
    .filter((o) => o.status !== 'CANCELLED')
    .reduce((sum, o) => sum + (o.subtotal || 0), 0);
  const extraCharge = first?.extraCharge || 0;
  const isBilled = sessionOrders.some((o) => o.billGenerated || o.sessionStatus === 'BILL_GENERATED');
  const inKitchenCount = sessionOrders.filter((o) => KITCHEN_STATUSES.includes(o.status)).length;

  const [discountType, setDiscountType] = useState<DiscountType>(first?.discountType || 'PERCENT');
  const [discountInput, setDiscountInput] = useState(() => savedDiscountInput(first));
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [isConfirming, setIsConfirming] = useState(false);
  const [isSettling, setIsSettling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const discountValue = discountInput.trim() === '' ? 0 : Number(discountInput);
  let discountError: string | null = null;
  if (!Number.isFinite(discountValue) || discountValue < 0) {
    discountError = 'Enter a valid discount.';
  } else if (discountType === 'PERCENT' && discountValue > 100) {
    discountError = 'Discount cannot be more than 100%.';
  } else if (discountType === 'AMOUNT' && discountValue > subtotal) {
    discountError = `Discount cannot be more than the bill (₹${subtotal.toFixed(2)}).`;
  }

  const breakdown = calculateBillBreakdown(subtotal, discountError ? 0 : discountValue, extraCharge, discountType);
  const methodLabel = PAYMENT_METHODS.find((m) => m.id === paymentMethod)?.label;

  const changeDiscount = (type: DiscountType, value: string) => {
    setDiscountType(type);
    setDiscountInput(value);
    setIsConfirming(false);
    setError(null);
  };

  const handleSettle = async () => {
    if (!first || discountError) return;
    setIsSettling(true);
    setError(null);
    try {
      await billingApi.settlePayment(first.id, paymentMethod, { discountType, discountValue });
      onSettled();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to settle the bill. Please try again.');
      setIsConfirming(false);
    } finally {
      setIsSettling(false);
    }
  };

  if (!first) return null;

  return (
    <div className="p-4 rounded-2xl bg-brand-beige-light border border-brand-beige-dark space-y-3.5">
      <div className="flex items-center justify-between">
        <h4 className="flex items-center gap-1.5 text-sm font-black text-brand-green">
          <Wallet className="w-4 h-4 text-brand-gold" />
          <span>Bill & Settle</span>
        </h4>
        <span
          className={`text-[10px] uppercase font-black px-2 py-0.5 rounded border ${
            isBilled ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-sky-50 text-sky-800 border-sky-200'
          }`}
        >
          {isBilled ? 'Bill generated' : 'Running'}
        </span>
      </div>

      {inKitchenCount > 0 && (
        <p className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] font-semibold flex items-start gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-600" />
          <span>
            {inKitchenCount} order{inKitchenCount > 1 ? 's are' : ' is'} still in the kitchen. Settle only after
            everything has been served.
          </span>
        </p>
      )}

      {/* Discount */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label htmlFor="table-discount-input" className="flex items-center gap-1.5 text-xs font-black text-brand-green">
            <Tag className="w-3.5 h-3.5 text-brand-gold" />
            <span>Discount</span>
          </label>
          {discountInput.trim() !== '' && (
            <button
              type="button"
              onClick={() => changeDiscount(discountType, '')}
              className="flex items-center gap-0.5 text-[11px] font-bold text-red-600 hover:text-red-700 cursor-pointer"
            >
              <X className="w-3 h-3" />
              <span>Remove</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-white p-0.5 rounded-xl border border-brand-beige-dark shrink-0" role="group" aria-label="Discount type">
            {(['PERCENT', 'AMOUNT'] as const).map((type) => (
              <button
                key={type}
                type="button"
                aria-pressed={discountType === type}
                onClick={() => changeDiscount(type, '')}
                className={`w-9 py-1.5 rounded-lg text-xs font-black transition-colors cursor-pointer ${
                  discountType === type ? 'bg-brand-green text-brand-beige' : 'text-brand-green/70 hover:bg-brand-beige-light'
                }`}
              >
                {type === 'PERCENT' ? '%' : '₹'}
              </button>
            ))}
          </div>
          <input
            id="table-discount-input"
            type="number"
            inputMode="decimal"
            min="0"
            max={discountType === 'PERCENT' ? 100 : subtotal}
            step="any"
            placeholder={discountType === 'PERCENT' ? 'e.g. 10' : 'e.g. 50'}
            value={discountInput}
            onChange={(e) => changeDiscount(discountType, e.target.value)}
            className={`flex-1 min-w-0 px-3 py-2 text-xs font-mono font-bold bg-white border rounded-xl text-brand-green focus:outline-none focus:ring-2 ${
              discountError ? 'border-red-400 focus:ring-red-100' : 'border-brand-beige-dark focus:ring-brand-green/30'
            }`}
          />
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {QUICK_PERCENTS.map((pct) => {
            const active = discountType === 'PERCENT' && discountValue === pct;
            return (
              <button
                key={pct}
                type="button"
                onClick={() => changeDiscount('PERCENT', pct.toString())}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-black border transition-colors cursor-pointer ${
                  active
                    ? 'bg-brand-green text-brand-beige border-brand-green'
                    : 'bg-white text-brand-green border-brand-beige-dark hover:bg-brand-beige'
                }`}
              >
                {pct}%
              </button>
            );
          })}
        </div>

        {discountError && (
          <p className="text-[11px] font-bold text-red-600 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{discountError}</span>
          </p>
        )}
      </div>

      {/* Totals */}
      <div className="pt-2.5 border-t border-brand-beige-dark/70 space-y-1 text-xs text-brand-green">
        <div className="flex justify-between font-bold">
          <span>Subtotal</span>
          <span className="font-mono">₹{breakdown.subtotal.toFixed(2)}</span>
        </div>
        {breakdown.discountAmount > 0 && (
          <div className="flex justify-between font-bold">
            <span>Discount{discountType === 'PERCENT' ? ` (${breakdown.discountPercentage}%)` : ''}</span>
            <span className="font-mono text-emerald-700">-₹{breakdown.discountAmount.toFixed(2)}</span>
          </div>
        )}
        {breakdown.extraCharge > 0 && (
          <div className="flex justify-between font-bold">
            <span>Extra Charges</span>
            <span className="font-mono">+₹{breakdown.extraCharge.toFixed(2)}</span>
          </div>
        )}
        {breakdown.roundOff !== 0 && (
          <div className="flex justify-between font-bold text-brand-green/80">
            <span>Round Off</span>
            <span className="font-mono">
              {breakdown.roundOff > 0 ? '+' : '-'}₹{Math.abs(breakdown.roundOff).toFixed(2)}
            </span>
          </div>
        )}
        <div className="flex justify-between text-sm font-black pt-1.5 border-t border-brand-beige-dark/70">
          <span>Total Due</span>
          <span className="font-mono text-brand-green-deep">₹{breakdown.total.toFixed(2)}</span>
        </div>
      </div>

      {/* Payment method */}
      <div className="space-y-1.5">
        <span className="text-xs font-black text-brand-green block">Payment Method</span>
        <div className="grid grid-cols-3 gap-2" role="group" aria-label="Payment method">
          {PAYMENT_METHODS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              aria-pressed={paymentMethod === id}
              onClick={() => {
                setPaymentMethod(id);
                setIsConfirming(false);
              }}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-black border transition-colors cursor-pointer ${
                paymentMethod === id
                  ? 'bg-brand-green text-brand-beige border-brand-green shadow-xs'
                  : 'bg-white text-brand-green border-brand-beige-dark hover:bg-brand-beige'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-[11px] font-semibold flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </p>
      )}

      {isConfirming ? (
        <div className="p-3 rounded-xl bg-white border border-brand-green/30 space-y-2.5">
          <p className="text-xs font-bold text-brand-green">
            Received <span className="font-mono font-black">₹{breakdown.total.toFixed(2)}</span> by {methodLabel}? This
            closes the bill and frees the table.
          </p>
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              disabled={isSettling}
              onClick={() => setIsConfirming(false)}
              className="px-3.5 py-2 rounded-xl bg-brand-beige hover:bg-brand-beige-dark text-brand-green text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
            >
              Back
            </button>
            <button
              type="button"
              disabled={isSettling}
              onClick={handleSettle}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-xs transition-all active:scale-95 cursor-pointer disabled:opacity-50"
            >
              {isSettling ? 'Settling...' : 'Confirm & Settle'}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={Boolean(discountError)}
          onClick={() => setIsConfirming(true)}
          className="w-full flex items-center justify-center gap-2 p-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-xs transition-all active:scale-98 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Wallet className="w-4 h-4" />
          <span>
            Settle ₹{breakdown.total.toFixed(2)} • {methodLabel}
          </span>
        </button>
      )}
    </div>
  );
}
