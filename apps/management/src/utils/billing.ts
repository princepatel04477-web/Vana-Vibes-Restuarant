import type { DiscountType } from '@/types/cafe';

export type { DiscountType };

export interface BillBreakdown {
  subtotal: number;
  discountType: DiscountType;
  discountPercentage: number;
  discountAmount: number;
  extraCharge: number;
  amountAfterAdjustments: number;
  roundOff: number;
  total: number;
}

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/**
 * Authoritative financial calculation helper matching backend billing rules:
 * - Subtotal = sum of all line item totals
 * - Discount Amount = Subtotal * Discount Percentage / 100, or a flat ₹ amount (never more than the subtotal)
 * - Amount After Adjustments = Subtotal - Discount Amount + Extra Charges
 * - Grand Total = Round(Amount After Adjustments) to nearest whole rupee
 * - Round Off = Grand Total - Amount After Adjustments
 */
export function calculateBillBreakdown(
  subtotal: number,
  discountValue: number = 0,
  extraCharge: number = 0,
  discountType: DiscountType = 'PERCENT'
): BillBreakdown {
  const sub = round2(subtotal);
  const extra = Math.max(0, round2(extraCharge));

  let discPct: number;
  let discountAmount: number;
  if (discountType === 'AMOUNT') {
    discountAmount = Math.max(0, Math.min(sub, round2(discountValue)));
    discPct = sub > 0 ? round2((discountAmount / sub) * 100) : 0;
  } else {
    discPct = Math.max(0, Math.min(100, round2(discountValue)));
    discountAmount = round2(sub * (discPct / 100));
  }

  const amountAfterAdjustments = round2(sub - discountAmount + extra);
  const grandTotal = Math.round(amountAfterAdjustments);
  const roundOff = round2(grandTotal - amountAfterAdjustments);

  return {
    subtotal: sub,
    discountType,
    discountPercentage: discPct,
    discountAmount,
    extraCharge: extra,
    amountAfterAdjustments,
    roundOff,
    total: grandTotal,
  };
}
