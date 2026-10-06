import { describe, it, expect } from 'vitest';
import { calculatePricing, validateDiscountAuthorization } from '../../src/lib/pricing';

describe('Pricing and Calculation Engine (lib/pricing.ts)', () => {
  it('calculates standard subtotal with 5% GST split into CGST and SGST', () => {
    const result = calculatePricing({
      items: [
        { price: 200, quantity: 2 }, // 400
        { price: 100, quantity: 1, addOnsPrice: 50 }, // 150
      ],
      discount: null,
      taxRate: 0.05,
    });

    expect(result.subtotal).toBe(550);
    expect(result.discountAmount).toBe(0);
    expect(result.taxableAmount).toBe(550);
    expect(result.cgstRate).toBe(0.025);
    expect(result.sgstRate).toBe(0.025);
    expect(result.cgstAmount).toBe(13.75);
    expect(result.sgstAmount).toBe(13.75);
    expect(result.totalTax).toBe(27.5);
    expect(result.preRoundTotal).toBe(577.5);
    expect(result.grandTotal).toBe(578);
    expect(result.roundOff).toBe(0.5);
  });

  it('applies FLAT discount BEFORE GST calculation', () => {
    const result = calculatePricing({
      items: [{ price: 500, quantity: 1 }],
      discount: {
        type: 'FLAT',
        value: 100,
        reason: 'Loyalty coupon',
      },
      taxRate: 0.05,
    });

    expect(result.subtotal).toBe(500);
    expect(result.discountAmount).toBe(100);
    expect(result.discountReason).toBe('Loyalty coupon');
    expect(result.taxableAmount).toBe(400); // 500 - 100
    expect(result.cgstAmount).toBe(10); // 400 * 0.025
    expect(result.sgstAmount).toBe(10); // 400 * 0.025
    expect(result.totalTax).toBe(20);
    expect(result.preRoundTotal).toBe(420);
    expect(result.grandTotal).toBe(420);
    expect(result.roundOff).toBe(0);
  });

  it('applies PERCENT discount BEFORE GST calculation', () => {
    const result = calculatePricing({
      items: [{ price: 1000, quantity: 1 }],
      discount: {
        type: 'PERCENT',
        value: 10,
        reason: 'Staff discount',
      },
      taxRate: 0.05,
    });

    expect(result.subtotal).toBe(1000);
    expect(result.discountAmount).toBe(100); // 10% of 1000
    expect(result.taxableAmount).toBe(900);
    expect(result.cgstAmount).toBe(22.5); // 900 * 0.025
    expect(result.sgstAmount).toBe(22.5); // 900 * 0.025
    expect(result.totalTax).toBe(45);
    expect(result.grandTotal).toBe(945);
  });

  it('throws an error if a discount has no reason', () => {
    expect(() => {
      calculatePricing({
        items: [{ price: 200, quantity: 1 }],
        discount: {
          type: 'FLAT',
          value: 50,
          reason: '   ',
        },
      });
    }).toThrow('Discount reason is required when applying a discount');
  });

  it('caps flat discount to subtotal to prevent negative bill', () => {
    const result = calculatePricing({
      items: [{ price: 100, quantity: 1 }],
      discount: {
        type: 'FLAT',
        value: 200,
        reason: 'Complimentary',
      },
    });

    expect(result.subtotal).toBe(100);
    expect(result.discountAmount).toBe(100);
    expect(result.taxableAmount).toBe(0);
    expect(result.totalTax).toBe(0);
    expect(result.grandTotal).toBe(0);
  });

  describe('validateDiscountAuthorization', () => {
    it('allows owner to apply any discount percentage or flat amount', () => {
      const res1 = validateDiscountAuthorization({
        role: 'owner',
        discountType: 'PERCENT',
        discountValue: 50,
        subtotal: 1000,
      });
      expect(res1.allowed).toBe(true);

      const res2 = validateDiscountAuthorization({
        role: 'ADMIN',
        discountType: 'FLAT',
        discountValue: 900,
        subtotal: 1000,
      });
      expect(res2.allowed).toBe(true);
    });

    it('allows staff to apply discount within limit (default 10%)', () => {
      const res = validateDiscountAuthorization({
        role: 'staff',
        discountType: 'PERCENT',
        discountValue: 10,
        subtotal: 500,
        staffMaxDiscountPercent: 10,
      });
      expect(res.allowed).toBe(true);
    });

    it('blocks staff when discount exceeds limit', () => {
      const resPercent = validateDiscountAuthorization({
        role: 'staff',
        discountType: 'PERCENT',
        discountValue: 15,
        subtotal: 500,
        staffMaxDiscountPercent: 10,
      });
      expect(resPercent.allowed).toBe(false);
      expect(resPercent.error).toContain('Staff discount cannot exceed 10%');

      const resFlat = validateDiscountAuthorization({
        role: 'staff',
        discountType: 'FLAT',
        discountValue: 100, // 20% of 500
        subtotal: 500,
        staffMaxDiscountPercent: 10,
      });
      expect(resFlat.allowed).toBe(false);
      expect(resFlat.error).toContain('Staff discount cannot exceed 10%');
    });
  });
});
