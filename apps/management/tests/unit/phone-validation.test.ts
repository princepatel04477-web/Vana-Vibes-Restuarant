import { describe, it, expect } from 'vitest';
import { CafeStore } from '../../src/lib/cafe-store';

describe('Customer Phone Validation and Order Integrity', () => {
  it('rejects customer phone numbers with fewer than 10 digits', () => {
    const res = CafeStore.createOrder({
      tableId: 'T01',
      token: CafeStore.getAllTables()[0].token,
      sessionToken: 'sess_test',
      customerName: 'Aarav Patel',
      customerMobile: '987654321', // 9 digits
      items: [
        {
          id: 'test-item-1',
          menuItemId: 'hc-01',
          name: 'Espresso',
          category: 'hot-coffee',
          price: 140,
          quantity: 1,
        },
      ],
    });

    expect(res.success).toBe(false);
    expect(res.error).toBe('Phone number must contain exactly 10 digits');
  });

  it('rejects customer phone numbers with more than 10 digits', () => {
    const res = CafeStore.createOrder({
      tableId: 'T01',
      token: CafeStore.getAllTables()[0].token,
      sessionToken: 'sess_test',
      customerName: 'Aarav Patel',
      customerMobile: '98765432101', // 11 digits
      items: [
        {
          id: 'test-item-1',
          menuItemId: 'hc-01',
          name: 'Espresso',
          category: 'hot-coffee',
          price: 140,
          quantity: 1,
        },
      ],
    });

    expect(res.success).toBe(false);
    expect(res.error).toBe('Phone number must contain exactly 10 digits');
  });

  it('rejects customer phone numbers with alphabets or symbols', () => {
    const res = CafeStore.createOrder({
      tableId: 'T01',
      token: CafeStore.getAllTables()[0].token,
      sessionToken: 'sess_test',
      customerName: 'Aarav Patel',
      customerMobile: '+9198765432', // '+' symbol
      items: [
        {
          id: 'test-item-1',
          menuItemId: 'hc-01',
          name: 'Espresso',
          category: 'hot-coffee',
          price: 140,
          quantity: 1,
        },
      ],
    });

    expect(res.success).toBe(false);
    expect(res.error).toBe('Phone number must contain exactly 10 digits');
  });

  it('accepts strictly 10 numeric digits', () => {
    const res = CafeStore.createOrder({
      tableId: 'T01',
      token: CafeStore.getAllTables()[0].token,
      sessionToken: 'sess_test',
      customerName: 'Aarav Patel',
      customerMobile: '9876543210', // exactly 10 digits
      items: [
        {
          id: 'test-item-1',
          menuItemId: 'hc-01',
          name: 'Espresso',
          category: 'hot-coffee',
          price: 140,
          quantity: 1,
        },
      ],
    });

    expect(res.success).toBe(true);
    expect(res.order?.customerMobile).toBe('9876543210');
  });
});
