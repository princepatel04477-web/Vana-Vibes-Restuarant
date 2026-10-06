import { describe, it, expect } from 'vitest';
import { CafeStore, CAFE_INFO } from '@/lib/cafe-store';
import { MENU_CATEGORIES, MENU_ITEMS } from '@/data/vaan-vibes-menu';

describe('Vaan Vibes QR Code & Table Security', () => {
  it('should have 12 configured tables with secure tokens', () => {
    const tables = CafeStore.getAllTables();
    expect(tables.length).toBe(12);

    for (const table of tables) {
      expect(table.id).toMatch(/^T\d{2}$/);
      expect(table.token).toContain('vv_sec_');
      expect(table.qrCodeUrl).toContain(`table=${table.id}`);
      expect(table.qrCodeUrl).toContain(`token=${table.token}`);
    }
  });

  it('should validate official table and token', () => {
    const table01 = CafeStore.getTable('T01');
    expect(table01).toBeDefined();

    if (table01) {
      const validation = CafeStore.validateTableQR('T01', table01.token);
      expect(validation.valid).toBe(true);
      expect(validation.table?.id).toBe('T01');
    }
  });

  it('should reject tampered or invalid QR tokens to prevent unauthorized table orders', () => {
    const tamperedValidation = CafeStore.validateTableQR('T12', 'forged_fake_token_123');
    expect(tamperedValidation.valid).toBe(false);
    expect(tamperedValidation.error).toContain('Invalid or forged QR code');
  });

  it('should reject non-existent tables', () => {
    const nonExistent = CafeStore.validateTableQR('T99', 'token_does_not_matter');
    expect(nonExistent.valid).toBe(false);
    expect(nonExistent.error).toContain('does not exist');
  });
});

describe('Vaan Vibes PDF Menu Source of Truth', () => {
  it('should contain all 19 categories extracted from PDF', () => {
    // 19 categories + 'all' filter
    expect(MENU_CATEGORIES.length).toBe(20);

    const categorySlugs = MENU_CATEGORIES.map((c) => c.slug);
    expect(categorySlugs).toContain('hot-coffee');
    expect(categorySlugs).toContain('iced-coffee');
    expect(categorySlugs).toContain('non-coffee');
    expect(categorySlugs).toContain('manual-brew');
    expect(categorySlugs).toContain('shake');
    expect(categorySlugs).toContain('frappe');
    expect(categorySlugs).toContain('toastie');
    expect(categorySlugs).toContain('appetizers');
    expect(categorySlugs).toContain('pasta');
    expect(categorySlugs).toContain('pizza');
    expect(categorySlugs).toContain('rice');
    expect(categorySlugs).toContain('soup');
    expect(categorySlugs).toContain('starters');
    expect(categorySlugs).toContain('asian-indo');
    expect(categorySlugs).toContain('sizzlers');
    expect(categorySlugs).toContain('signature-punjabi');
    expect(categorySlugs).toContain('bread');
    expect(categorySlugs).toContain('extra');
    expect(categorySlugs).toContain('dessert');
  });

  it('should accurately verify specific PDF menu items and exact prices', () => {
    // Page 2: Hot Coffee
    const espresso = MENU_ITEMS.find((i) => i.name === 'Espresso');
    expect(espresso).toBeDefined();
    expect(espresso?.price).toBe(140);

    const mocha = MENU_ITEMS.find((i) => i.name === 'Mocha');
    expect(mocha?.price).toBe(180);

    // Page 3: Pasta & Pizza
    const alfredo = MENU_ITEMS.find((i) => i.name === 'Alfredo');
    expect(alfredo?.price).toBe(395);
    expect(alfredo?.options?.[0].name).toBe('Choice of Pasta');

    const margherita = MENU_ITEMS.find((i) => i.name === 'Margherita Pizza');
    expect(margherita?.price).toBe(430);
    expect(margherita?.addOns?.[0].price).toBe(100); // Cheese burst +100

    // Page 4: Sizzlers & Punjabi
    const mexicanSizzler = MENU_ITEMS.find((i) => i.name === 'Mexican Sizzler');
    expect(mexicanSizzler?.price).toBe(795);

    const butterNaan = MENU_ITEMS.find((i) => i.name === 'Butter Naan');
    expect(butterNaan?.price).toBe(85);

    // Page 5: Dessert
    const cheesecake = MENU_ITEMS.find((i) => i.name === 'Cheesecake');
    expect(cheesecake?.price).toBe(280);
    expect(cheesecake?.addOns?.length).toBeGreaterThan(0);
  });
});

describe('Vaan Vibes Order Creation & Billing Calculations', () => {
  it('should calculate server-side totals and 5% GST correctly', () => {
    const table04 = CafeStore.getTable('T04');
    expect(table04).toBeDefined();

    if (table04) {
      const orderRes = CafeStore.createOrder({
        tableId: table04.id,
        token: table04.token,
        sessionToken: 'sess_test_123',
        customerName: 'Kavita Dave',
        customerMobile: '9825123456',
        specialInstructions: 'Make fries extra crispy',
        items: [
          {
            id: 'ap-01-cart',
            menuItemId: 'ap-01', // French Fries = 280
            name: 'French Fries',
            category: 'appetizers',
            price: 280,
            quantity: 2,
          },
          {
            id: 'hc-03-cart',
            menuItemId: 'hc-03', // Cappuccino = 160
            name: 'Cappuccino',
            category: 'hot-coffee',
            price: 160,
            quantity: 1,
          },
        ],
      });

      expect(orderRes.success).toBe(true);
      expect(orderRes.order).toBeDefined();

      const order = orderRes.order!;
      // Subtotal = 280*2 + 160*1 = 560 + 160 = 720
      expect(order.subtotal).toBe(720);
      // 5% GST = 36
      expect(order.tax).toBe(36);
      // Total = 756
      expect(order.total).toBe(756);
      expect(order.status).toBe('ORDER_PLACED');
      expect(order.paymentStatus).toBe('PENDING');

      // Test status progression
      const acceptedRes = CafeStore.updateOrderStatus(order.id, 'ACCEPTED');
      expect(acceptedRes.order?.status).toBe('ACCEPTED');

      const prepRes = CafeStore.updateOrderStatus(order.id, 'PREPARING');
      expect(prepRes.order?.status).toBe('PREPARING');

      const readyRes = CafeStore.updateOrderStatus(order.id, 'READY');
      expect(readyRes.order?.status).toBe('READY');

      const servedRes = CafeStore.updateOrderStatus(order.id, 'SERVED');
      expect(servedRes.order?.status).toBe('SERVED');

      // Test billing generation
      const bill = CafeStore.generateBill(order.id);
      expect(bill).toBeDefined();
      expect(bill?.billNumber).toContain('BILL-');
      expect(bill?.subtotal).toBe(720);
      expect(bill?.cgst).toBe(18); // 2.5% CGST
      expect(bill?.sgst).toBe(18); // 2.5% SGST
      expect(bill?.total).toBe(756);
    }
  });

  it('should reject orders with invalid customer name or mobile number', () => {
    const table02 = CafeStore.getTable('T02');
    if (table02) {
      const invalidName = CafeStore.createOrder({
        tableId: table02.id,
        token: table02.token,
        sessionToken: 'sess_bad',
        customerName: 'A', // too short
        customerMobile: '9825123456',
        items: [{ id: '1', menuItemId: 'hc-01', name: 'Espresso', category: 'hot-coffee', price: 140, quantity: 1 }],
      });
      expect(invalidName.success).toBe(false);

      const invalidMobile = CafeStore.createOrder({
        tableId: table02.id,
        token: table02.token,
        sessionToken: 'sess_bad',
        customerName: 'Valid Name',
        customerMobile: '123', // too short
        items: [{ id: '1', menuItemId: 'hc-01', name: 'Espresso', category: 'hot-coffee', price: 140, quantity: 1 }],
      });
      expect(invalidMobile.success).toBe(false);
    }
  });
});
