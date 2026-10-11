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
  beforeEach(async () => {
    await CafeStore.resetAllData();
  });

  it('starts with Tables 01-18 except Table 13, all vacant, and no orders', async () => {
    const tables = await CafeStore.getAllTables();
    expect(TOTAL_TABLES).toBe(17);
    expect(tables).toHaveLength(17);
    expect(tables.map((t) => t.id)).toEqual(
      Array.from({ length: 18 }, (_, i) => `T${(i + 1).toString().padStart(2, '0')}`).filter((id) => id !== 'T13')
    );
    expect(await CafeStore.getTable('T13')).toBeUndefined();
    expect(tables.every((t) => t.status === 'AVAILABLE')).toBe(true);
    expect(await CafeStore.getAllOrders()).toHaveLength(0);
  });

  it('table QR links open the ordering menu route', async () => {
    for (const t of await CafeStore.getAllTables()) {
      expect(t.qrCodeUrl).toContain('/cafe/van-vibes/menu?');
    }
  });

  it('admin can add items to a vacant table without a QR token', async () => {
    const res = await CafeStore.addStaffOrder('T05', { items: [espresso] });
    expect(res.success).toBe(true);
    expect(res.order?.tableId).toBe('T05');
    expect(res.order?.status).toBe('ORDER_PLACED');
    expect(res.order?.total).toBe(280);
    expect(res.order?.customerName).toBe('Walk-in Guest');
    expect((await CafeStore.getTable('T05'))?.status).toBe('OCCUPIED');
  });

  it('added items join the table’s open dining session so they share one bill', async () => {
    const first = await CafeStore.addStaffOrder('T03', { items: [espresso], customerName: 'Riya' });
    const second = await CafeStore.addStaffOrder('T03', { items: [{ ...espresso, quantity: 1 }] });
    expect(second.order?.sessionToken).toBe(first.order?.sessionToken);
    expect(second.order?.customerName).toBe('Riya');

    const bill = await CafeStore.generateBill(second.order!.id);
    expect(bill?.subtotal).toBe(420);
  });

  it('rejects unknown tables and empty item lists', async () => {
    expect((await CafeStore.addStaffOrder('T99', { items: [espresso] })).success).toBe(false);
    expect((await CafeStore.addStaffOrder('T01', { items: [] })).success).toBe(false);
  });

  it('reset wipes orders and restores the default tables', async () => {
    await CafeStore.addStaffOrder('T01', { items: [espresso] });
    await CafeStore.createTable(25);
    await CafeStore.deleteTable('T02');

    const result = await CafeStore.resetAllData();

    expect(result.tables).toBe(17);
    expect(await CafeStore.getAllOrders()).toHaveLength(0);
    expect(await CafeStore.getTable('T25')).toBeUndefined();
    expect(await CafeStore.getTable('T02')).toBeDefined();
    expect((await CafeStore.getTable('T01'))?.status).toBe('AVAILABLE');

    const next = await CafeStore.addStaffOrder('T01', { items: [espresso] });
    expect(next.order?.id).toBe('VV-1001');
  });
});
