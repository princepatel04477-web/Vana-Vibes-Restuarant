import { describe, it, expect } from 'vitest';
import { CafeStore } from '@/lib/cafe-store';
import { MENU_ITEMS } from '@/data/vaan-vibes-menu';

describe('Menu Item Availability & Store Validation', () => {
  it('rejects ordering when a dish is marked unavailable', () => {
    // Pick the first item and simulate marking it unavailable
    const firstItem = MENU_ITEMS[0];
    const prevAvailable = firstItem.isAvailable;
    firstItem.isAvailable = false;

    const result = CafeStore.createOrder({
      tableId: 'T01',
      token: 'vv_sec_t01_9999',
      sessionToken: 'sess_test',
      customerName: 'Pratham Patel',
      customerMobile: '9876543210',
      items: [
        {
          id: `${firstItem.id}-default`,
          menuItemId: firstItem.id,
          name: firstItem.name,
          category: firstItem.category,
          price: firstItem.price,
          quantity: 1,
        },
      ],
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('is currently unavailable');

    // Restore
    firstItem.isAvailable = prevAvailable;
  });

  it('rejects ordering unknown / deleted item ID', () => {
    const result = CafeStore.createOrder({
      tableId: 'T01',
      token: 'vv_sec_t01_9999',
      sessionToken: 'sess_test',
      customerName: 'Pratham Patel',
      customerMobile: '9876543210',
      items: [
        {
          id: 'non-existent-dish',
          menuItemId: 'deleted-dish-999',
          name: 'Old Dish',
          category: 'starters',
          price: 100,
          quantity: 1,
        },
      ],
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid item selected');
  });
});
