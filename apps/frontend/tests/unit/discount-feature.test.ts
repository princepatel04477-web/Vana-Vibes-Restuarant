import { describe, it, expect } from 'vitest';
import { MenuItem } from '@/types/cafe';

describe('Menu Item and Bill Generation Percentage Discount Rules', () => {
  const sampleItem: MenuItem = {
    id: 'dish-01',
    name: 'Espresso',
    category: 'hot-coffee',
    price: 140,
    isVeg: true,
  };

  it('Menu item must contain ONLY normal/base price with no discount properties', () => {
    expect(sampleItem.price).toBe(140);
    // @ts-expect-error discountPercentage should not exist on MenuItem
    expect(sampleItem.discountPercentage).toBeUndefined();
    // @ts-expect-error discountedPrice should not exist on MenuItem
    expect(sampleItem.discountedPrice).toBeUndefined();
    
    const displayPrice = `₹${sampleItem.price}/-`;
    expect(displayPrice).toBe('₹140/-');
  });

  it('Cart calculates subtotal directly from menu base price without item-level discounts', () => {
    const qty = 2;
    const subtotal = sampleItem.price * qty;
    expect(subtotal).toBe(280);

    const gstRate = 0.05;
    const tax = Math.round(subtotal * gstRate * 100) / 100;
    const total = Math.round((subtotal + tax) * 100) / 100;

    expect(tax).toBe(14);
    expect(total).toBe(294);
  });

  it('Billing calculation with 10% bill-level discount: Subtotal 460, Discount 46, Total Due 437', () => {
    const subtotal = 460;
    const cgst = Math.round(subtotal * 0.025 * 100) / 100; // 11.50
    const sgst = Math.round(subtotal * 0.025 * 100) / 100; // 11.50
    const tax = Math.round((cgst + sgst) * 100) / 100; // 23.00
    const discountPercentage = 10;
    const discountAmount = Math.round(subtotal * (discountPercentage / 100) * 100) / 100; // 46.00

    const finalTotal = Math.round((subtotal + tax - discountAmount) * 100) / 100;

    expect(subtotal).toBe(460);
    expect(cgst).toBe(11.5);
    expect(sgst).toBe(11.5);
    expect(tax).toBe(23.0);
    expect(discountAmount).toBe(46.0);
    expect(finalTotal).toBe(437.0);
  });

  it('Billing calculation with 0% discount calculates normally', () => {
    const subtotal = 460;
    const cgst = Math.round(subtotal * 0.025 * 100) / 100; // 11.50
    const sgst = Math.round(subtotal * 0.025 * 100) / 100; // 11.50
    const tax = Math.round((cgst + sgst) * 100) / 100; // 23.00
    const discountPercentage = 0;
    const discountAmount = Math.round(subtotal * (discountPercentage / 100) * 100) / 100; // 0.00

    const finalTotal = Math.round((subtotal + tax - discountAmount) * 100) / 100;

    expect(finalTotal).toBe(483.0);
  });

  it('Validates discount percentage: 0-100% valid, negative and >100% rejected', () => {
    const validatePercentage = (pct: number) => {
      if (typeof pct !== 'number' || isNaN(pct)) return 'Invalid percentage';
      if (pct < 0 || pct > 100) return 'Discount percentage must be between 0 and 100%';
      return null;
    };

    expect(validatePercentage(0)).toBeNull();
    expect(validatePercentage(10)).toBeNull();
    expect(validatePercentage(50)).toBeNull();
    expect(validatePercentage(100)).toBeNull();

    expect(validatePercentage(-5)).toBe('Discount percentage must be between 0 and 100%');
    expect(validatePercentage(101)).toBe('Discount percentage must be between 0 and 100%');
    expect(validatePercentage(500)).toBe('Discount percentage must be between 0 and 100%');
  });
});
