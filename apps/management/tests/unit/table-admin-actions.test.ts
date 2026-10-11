import { describe, it, expect, beforeEach } from 'vitest';
import { CafeStore, TOTAL_TABLES } from '@/lib/cafe-store';

const espresso = {
  id: 'line-1',
  menuItemId: 'hc-01',
  name: 'Espresso',
  category: 'hot-coffee',
  price: 140,
  quantity: 2,
};

describe('Table dashboard admin actions', () => {
  beforeEach(() => {
    CafeStore.resetAllData();
  });

  it('starts with exactly 18 vacant tables and no orders', () => {
    const tables = CafeStore.getAllTables();
    expect(TOTAL_TABLES).toBe(18);
    expect(tables).toHaveLength(18);
    expect(tables.map((t) => t.id)).toEqual(
      Array.from({ length: 18 }, (_, i) => `T${(i + 1).toString().padStart(2, '0')}`)
    );
    expect(tables.every((t) => t.status === 'AVAILABLE')).toBe(true);
    expect(CafeStore.getAllOrders()).toHaveLength(0);
  });

  it('table QR links open the ordering menu route', () => {
    for (const t of CafeStore.getAllTables()) {
      expect(t.qrCodeUrl).toContain('/cafe/van-vibes/menu?');
    }
  });

  it('admin can add items to a vacant table without a QR token', () => {
    const res = CafeStore.addStaffOrder('T05', { items: [espresso] });
    expect(res.success).toBe(true);
    expect(res.order?.tableId).toBe('T05');
    expect(res.order?.status).toBe('ORDER_PLACED');
    expect(res.order?.total).toBe(280);
    expect(res.order?.customerName).toBe('Walk-in Guest');
    expect(CafeStore.getTable('T05')?.status).toBe('OCCUPIED');
  });

  it('added items join the table’s open dining session so they share one bill', () => {
    const first = CafeStore.addStaffOrder('T03', { items: [espresso], customerName: 'Riya' });
    const second = CafeStore.addStaffOrder('T03', { items: [{ ...espresso, quantity: 1 }] });
    expect(second.order?.sessionToken).toBe(first.order?.sessionToken);
    expect(second.order?.customerName).toBe('Riya');

    const bill = CafeStore.generateBill(second.order!.id);
    expect(bill?.subtotal).toBe(420);
  });

  it('rejects unknown tables and empty item lists', () => {
    expect(CafeStore.addStaffOrder('T99', { items: [espresso] }).success).toBe(false);
    expect(CafeStore.addStaffOrder('T01', { items: [] }).success).toBe(false);
  });

  it('reset wipes orders and restores the default tables', () => {
    CafeStore.addStaffOrder('T01', { items: [espresso] });
    CafeStore.createTable(25);
    CafeStore.deleteTable('T02');

    const result = CafeStore.resetAllData();

    expect(result.tables).toBe(18);
    expect(CafeStore.getAllOrders()).toHaveLength(0);
    expect(CafeStore.getTable('T25')).toBeUndefined();
    expect(CafeStore.getTable('T02')).toBeDefined();
    expect(CafeStore.getTable('T01')?.status).toBe('AVAILABLE');

    const next = CafeStore.addStaffOrder('T01', { items: [espresso] });
    expect(next.order?.id).toBe('VV-1001');
  });
});
