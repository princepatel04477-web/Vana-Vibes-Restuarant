/**
 * Vaan Vibes Cafe - Authoritative Pricing and Bill Calculation Engine
 * 
 * Financial Rules:
 * - Subtotal = sum of all item line totals (unit price * quantity + options/addons)
 * - Discount is applied BEFORE GST.
 *   - Type 'FLAT': Fixed rupee discount (capped at subtotal)
 *   - Type 'PERCENT': Percentage discount (0% - 100%)
 *   - Discount requires a non-empty reason.
 * - Taxable Amount = Math.max(0, Subtotal - Discount Amount)
 * - GST is split evenly between CGST and SGST:
 *   - Default Tax Rate is 5% (2.5% CGST + 2.5% SGST)
 *   - CGST = round2(Taxable Amount * (Tax Rate / 2))
 *   - SGST = round2(Taxable Amount * (Tax Rate / 2))
 *   - Total Tax = CGST + SGST
 * - Pre-round Total = Taxable Amount + Total Tax
 * - Grand Total = Math.round(Pre-round Total) (rounded to nearest whole rupee)
 * - Round Off = Number((Grand Total - Pre-round Total).toFixed(2))
 */

export type DiscountType = 'FLAT' | 'PERCENT';

export interface DiscountInput {
  type: DiscountType;
  value: number;
  reason: string;
}

export interface PricingItemInput {
  price: number;
  quantity: number;
  addOnsPrice?: number;
}

export interface CalculatePricingOptions {
  items: PricingItemInput[];
  discount?: DiscountInput | null;
  taxRate?: number; // default 0.05 (5% GST)
  extraCharges?: number;
}

export interface PricingResult {
  subtotal: number;
  discountType: DiscountType | null;
  discountValue: number;
  discountAmount: number;
  discountReason: string | null;
  taxableAmount: number;
  taxRate: number;
  cgstRate: number;
  cgstAmount: number;
  sgstRate: number;
  sgstAmount: number;
  totalTax: number;
  extraCharges: number;
  preRoundTotal: number;
  roundOff: number;
  grandTotal: number;
}

function round2(val: number): number {
  return Math.round((val + Number.EPSILON) * 100) / 100;
}

/**
 * Calculates item subtotal, discount, CGST, SGST, round off and grand total.
 */
export function calculatePricing({
  items,
  discount = null,
  taxRate = 0.05,
  extraCharges = 0,
}: CalculatePricingOptions): PricingResult {
  // 1. Calculate subtotal
  let rawSubtotal = 0;
  for (const it of items) {
    const itemUnitPrice = Number(it.price) || 0;
    const addOns = Number(it.addOnsPrice) || 0;
    const qty = Math.max(0, Number(it.quantity) || 0);
    rawSubtotal += (itemUnitPrice + addOns) * qty;
  }
  const subtotal = round2(rawSubtotal);

  // 2. Calculate discount (applied before GST)
  let discountAmount = 0;
  let discountType: DiscountType | null = null;
  let discountValue = 0;
  let discountReason: string | null = null;

  if (discount && discount.value > 0) {
    const cleanReason = (discount.reason || '').trim();
    if (!cleanReason) {
      throw new Error('Discount reason is required when applying a discount');
    }
    discountType = discount.type;
    discountReason = cleanReason;

    if (discount.type === 'PERCENT') {
      discountValue = Math.min(100, Math.max(0, Number(discount.value) || 0));
      discountAmount = round2(subtotal * (discountValue / 100));
    } else {
      // FLAT
      discountValue = Math.max(0, Number(discount.value) || 0);
      discountAmount = round2(Math.min(subtotal, discountValue));
    }
  }

  // 3. Taxable Amount (Discounts applied before GST)
  const safeExtra = Math.max(0, Number(extraCharges) || 0);
  const taxableAmount = round2(Math.max(0, subtotal - discountAmount));

  // 4. CGST & SGST (split equally)
  const safeTaxRate = Math.max(0, Number(taxRate) || 0);
  const cgstRate = safeTaxRate / 2;
  const sgstRate = safeTaxRate / 2;

  const cgstAmount = round2(taxableAmount * cgstRate);
  const sgstAmount = round2(taxableAmount * sgstRate);
  const totalTax = round2(cgstAmount + sgstAmount);

  // 5. Pre-round Total & Round Off
  const preRoundTotal = round2(taxableAmount + totalTax + safeExtra);
  const grandTotal = Math.max(0, Math.round(preRoundTotal));
  const roundOff = Number((grandTotal - preRoundTotal).toFixed(2));

  return {
    subtotal,
    discountType,
    discountValue,
    discountAmount,
    discountReason,
    taxableAmount,
    taxRate: safeTaxRate,
    cgstRate,
    cgstAmount,
    sgstRate,
    sgstAmount,
    totalTax,
    extraCharges: safeExtra,
    preRoundTotal,
    roundOff,
    grandTotal,
  };
}

/**
 * Validates whether a staff member is allowed to apply the given discount.
 * Staff discounts are capped by staffMaxDiscountPercent (default 10%). Owners have no cap.
 */
export function validateDiscountAuthorization({
  role,
  discountType,
  discountValue,
  subtotal,
  staffMaxDiscountPercent = 10,
}: {
  role: 'owner' | 'staff' | 'ADMIN' | 'CHEF';
  discountType: DiscountType;
  discountValue: number;
  subtotal: number;
  staffMaxDiscountPercent?: number;
}): { allowed: boolean; error?: string } {
  const isOwner = role === 'owner' || role === 'ADMIN';
  if (isOwner) {
    return { allowed: true };
  }

  // Staff check
  let effectivePercent = 0;
  if (discountType === 'PERCENT') {
    effectivePercent = discountValue;
  } else {
    // FLAT
    if (subtotal <= 0) {
      effectivePercent = 0;
    } else {
      effectivePercent = (discountValue / subtotal) * 100;
    }
  }

  if (effectivePercent > staffMaxDiscountPercent) {
    return {
      allowed: false,
      error: `Staff discount cannot exceed ${staffMaxDiscountPercent}% (attempted ${effectivePercent.toFixed(1)}%). Owner approval required.`,
    };
  }

  return { allowed: true };
}
