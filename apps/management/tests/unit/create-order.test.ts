import { describe, it, expect } from 'vitest';
import { buildOrder, CreateOrderInputSchema } from '../../src/lib/orders/create-order';

describe('Order Creation & Validation (lib/orders/create-order.ts)', () => {
  it('validates and creates order with correct pricing calculations', () => {
    const input = {
      cafeId: 'van-vibes',
      tableId: 'T01',
      tableNumber: 1,
      customerName: 'Aarav Patel',
      customerMobile: '9876543210',
      items: [
        {
          name: 'Paneer Tikka',
          price: 250,
          quantity: 2,
        },
        {
          name: 'Cold Coffee',
          price: 120,
          quantity: 1,
          addOnsPrice: 30, // 150
        },
      ],
      source: 'Staff',
    };

    const order = buildOrder(input, () => 'VV-9999');

    expect(order.id).toBe('VV-9999');
    expect(order.tableNumber).toBe(1);
    expect(order.subtotal).toBe(650); // 500 + 150
    expect(order.totalTax).toBe(32.5); // 5% of 650
    expect(order.grandTotal).toBe(683); // 682.5 rounded to 683
    expect(order.roundOff).toBe(0.5);
    expect(order.status).toBe('PLACED');
    expect(order.items[0].itemTotal).toBe(500);
    expect(order.items[1].itemTotal).toBe(150);
  });

  it('rejects order with empty items list', () => {
    const input = {
      tableId: 'T01',
      tableNumber: 1,
      customerName: 'Aarav',
      customerMobile: '9876543210',
      items: [],
    };

    expect(() => buildOrder(input)).toThrow();
  });

  it('rejects order with invalid mobile number', () => {
    const input = {
      tableId: 'T01',
      tableNumber: 1,
      customerName: 'Aarav',
      customerMobile: '123',
      items: [{ name: 'Chai', price: 30, quantity: 1 }],
    };

    expect(() => buildOrder(input)).toThrow();
  });
});
