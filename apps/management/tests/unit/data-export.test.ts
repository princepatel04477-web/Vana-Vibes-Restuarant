import { describe, it, expect, beforeEach } from 'vitest';
import ExcelJS from 'exceljs';
import { strFromU8, unzipSync } from 'fflate';
import { CafeStore } from '@/lib/cafe-store';
import { generateExport, parseDateRange, previewExport, toCsv } from '@/lib/export/build-export';

const espresso = { id: 'l1', menuItemId: 'hc-01', name: 'Espresso', category: 'hot-coffee', price: 140, quantity: 2 };

async function seedBilledAndPaidOrder() {
  const { order } = await CafeStore.addStaffOrder('T04', { items: [espresso], customerName: 'Riya' });
  await CafeStore.generateBill(order!.id, 10);
  await CafeStore.settlePayment(order!.id, 'UPI');
  return order!;
}

describe('Data export (Excel / CSV)', () => {
  beforeEach(async () => {
    await CafeStore.resetAllData();
  });

  it('previews row counts per category', async () => {
    await seedBilledAndPaidOrder();
    await CafeStore.addStaffOrder('T05', { items: [espresso] });

    const preview = await previewExport({
      categories: ['orders', 'order_items', 'bills', 'payments', 'tables'],
      dateRange: 'all_time',
    });

    expect(preview.counts).toEqual({ orders: 2, order_items: 2, bills: 1, payments: 1, tables: 18 });
    expect(preview.total_records).toBe(24);
  });

  it('builds one Excel workbook with a sheet per category', async () => {
    const order = await seedBilledAndPaidOrder();

    const file = await generateExport({
      categories: ['orders', 'bills', 'payments'],
      dateRange: 'last_7_days',
      format: 'xlsx',
    });
    expect(file.filename).toMatch(/\.xlsx$/);

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(Buffer.from(file.body) as unknown as ArrayBuffer);
    expect(wb.worksheets.map((w) => w.name)).toEqual(['Orders', 'Bills', 'Payments']);

    const orders = wb.getWorksheet('Orders')!;
    expect(orders.getRow(2).getCell(1).value).toBe(order.id);

    const payments = wb.getWorksheet('Payments')!;
    expect(payments.getRow(2).getCell(5).value).toBe('UPI');
    expect(payments.getRow(2).getCell(6).value).toBe(252); // 280 less 10% discount
  });

  it('exports a single CSV, or a ZIP of CSVs for several categories', async () => {
    await seedBilledAndPaidOrder();

    const single = await generateExport({ categories: ['orders'], dateRange: 'all_time', format: 'csv' });
    expect(single.contentType).toContain('text/csv');
    expect(Array.from(single.body.slice(0, 3))).toEqual([0xef, 0xbb, 0xbf]); // UTF-8 BOM for Excel
    const csv = strFromU8(single.body);
    expect(csv.replace(/^\uFEFF/, '').startsWith('Order ID,')).toBe(true);
    expect(csv).toContain('Riya');

    const zipped = await generateExport({ categories: ['orders', 'tables'], dateRange: 'all_time', format: 'csv' });
    expect(zipped.contentType).toBe('application/zip');
    expect(Object.keys(unzipSync(zipped.body)).sort()).toEqual([
      'van-vibes-orders-all-time.csv',
      'van-vibes-tables-all-time.csv',
    ]);
  });

  it('escapes spreadsheet formulas and quotes commas in CSV', () => {
    const csv = toCsv({ headers: ['Name', 'Note'], rows: [['=HYPERLINK("x")', 'a, b']] });
    expect(csv).toContain(`"'=HYPERLINK(""x"")"`);
    expect(csv).toContain('"a, b"');
  });

  it('respects the date range', async () => {
    await CafeStore.addStaffOrder('T06', { items: [espresso] });
    const old = await previewExport({ categories: ['orders'], dateRange: 'custom', startDate: '2020-01-01', endDate: '2020-01-31' });
    expect(old.counts.orders).toBe(0);
    expect(() => parseDateRange('custom', '2026-02-01', '2026-01-01')).toThrow('Start date cannot be after end date');
  });
});
