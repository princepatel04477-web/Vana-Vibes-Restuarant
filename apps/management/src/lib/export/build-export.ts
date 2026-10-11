/**
 * Builds data exports from the live store: one Excel workbook (a sheet per category),
 * a single CSV, or a ZIP of CSVs when several categories are picked.
 */
import ExcelJS from 'exceljs';
import { strToU8, zipSync } from 'fflate';
import { CafeStore } from '@/lib/cafe-store';
import { ServerBackend } from '@/lib/server-backend';
import { Order } from '@/types/cafe';

export const EXPORT_CATEGORIES = [
  'orders',
  'order_items',
  'bills',
  'payments',
  'menu_items',
  'tables',
  'staff',
] as const;
export type ExportCategory = (typeof EXPORT_CATEGORIES)[number];

export type ExportFormat = 'xlsx' | 'csv';

export interface ExportFilters {
  orderStatus?: string;
  orderId?: string;
  tableNumber?: number;
  billPaymentStatus?: string;
  billPaymentMethod?: string;
  billNumber?: string;
  menuCategory?: string;
  menuAvailability?: boolean;
  tableStatus?: string;
  staffRole?: string;
}

export interface ExportRequest {
  categories: string[];
  dateRange?: string;
  startDate?: string;
  endDate?: string;
  filters?: ExportFilters;
  format?: ExportFormat;
}

type Cell = string | number | boolean | null | undefined;
interface Sheet {
  key: ExportCategory;
  title: string;
  headers: string[];
  rows: Cell[][];
}

const SHEET_TITLES: Record<ExportCategory, string> = {
  orders: 'Orders',
  order_items: 'Order Items',
  bills: 'Bills',
  payments: 'Payments',
  menu_items: 'Menu Items',
  tables: 'Tables',
  staff: 'Staff',
};

const IST = 'Asia/Kolkata';
const DAY_MS = 24 * 60 * 60 * 1000;

export class ExportError extends Error {}

/** Formats a timestamp as "YYYY-MM-DD HH:mm:ss" in India time. */
export function formatIst(value?: string): string {
  if (!value) return '';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '';
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: IST,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(d)
      .map((p) => [p.type, p.value])
  );
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`;
}

/** Midnight IST of the given YYYY-MM-DD as a UTC Date. */
function istDayStart(ymd: string): Date {
  return new Date(`${ymd}T00:00:00+05:30`);
}

function istToday(): string {
  return formatIst(new Date().toISOString()).slice(0, 10);
}

export function parseDateRange(
  range = 'last_7_days',
  startDate?: string,
  endDate?: string
): { from?: Date; to?: Date; label: string } {
  const today = istToday();
  const endOfToday = new Date(istDayStart(today).getTime() + DAY_MS - 1);
  const daysBack = (n: number) => istDayStart(formatIst(new Date(Date.now() - n * DAY_MS).toISOString()).slice(0, 10));

  switch (range) {
    case 'last_1_day':
      return { from: daysBack(1), to: endOfToday, label: 'last-1-day' };
    case 'last_7_days':
      return { from: daysBack(7), to: endOfToday, label: 'last-7-days' };
    case 'last_30_days':
      return { from: daysBack(30), to: endOfToday, label: 'last-30-days' };
    case 'all_time':
      return { label: 'all-time' };
    case 'custom': {
      const ymd = /^\d{4}-\d{2}-\d{2}$/;
      if (!startDate || !endDate || !ymd.test(startDate) || !ymd.test(endDate)) {
        throw new ExportError('Start and end dates (YYYY-MM-DD) are required for a custom range');
      }
      if (startDate > endDate) throw new ExportError('Start date cannot be after end date');
      return {
        from: istDayStart(startDate),
        to: new Date(istDayStart(endDate).getTime() + DAY_MS - 1),
        label: `${startDate}-to-${endDate}`,
      };
    }
    default:
      throw new ExportError(`Unsupported date range: ${range}`);
  }
}

// ---------------------------------------------------------------------------
// Row builders
// ---------------------------------------------------------------------------

const ORDER_STATUS_ALIASES: Record<string, string[]> = {
  PLACED: ['ORDER_PLACED', 'PLACED'],
  IN_KITCHEN: ['PREPARING', 'IN_KITCHEN'],
};

function filterOrders(orders: Order[], f: ExportFilters = {}): Order[] {
  return orders.filter((o) => {
    if (f.orderStatus) {
      const wanted = ORDER_STATUS_ALIASES[f.orderStatus] || [f.orderStatus];
      if (!wanted.includes(o.status)) return false;
    }
    if (f.orderId && !o.id.toLowerCase().includes(f.orderId.toLowerCase())) return false;
    if (f.tableNumber && o.tableNumber !== f.tableNumber) return false;
    return true;
  });
}

function billNumberFor(firstOrder: Order): string {
  return `BILL-${firstOrder.id.replace('VV-', '')}-${new Date(firstOrder.createdAt).getFullYear()}`;
}

interface BillGroup {
  billNumber: string;
  orders: Order[];
  first: Order;
  last: Order;
}

/** One bill per dining session that has had a bill generated. */
function groupBills(orders: Order[]): BillGroup[] {
  const sessions = new Map<string, Order[]>();
  for (const o of orders) {
    if (!o.billGenerated) continue;
    const key = `${o.tableId}|${o.sessionToken}`;
    sessions.set(key, [...(sessions.get(key) || []), o]);
  }
  return Array.from(sessions.values())
    .map((list) => {
      const sorted = [...list].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      return {
        billNumber: billNumberFor(sorted[0]),
        orders: sorted,
        first: sorted[0],
        last: sorted[sorted.length - 1],
      };
    })
    .sort((a, b) => b.first.createdAt.localeCompare(a.first.createdAt));
}

function billTotals(group: BillGroup) {
  const subtotal = group.orders.reduce((s, o) => s + (o.subtotal || 0), 0);
  const tax = group.orders.reduce((s, o) => s + (o.tax || 0), 0);
  const discountAmount = group.first.discountAmount || 0;
  return {
    subtotal,
    tax,
    discountPercentage: group.first.discountPercentage || 0,
    discountAmount,
    total: Math.round(Math.max(0, subtotal + tax - discountAmount) * 100) / 100,
  };
}

function filterBills(groups: BillGroup[], f: ExportFilters = {}): BillGroup[] {
  return groups.filter((g) => {
    if (f.billPaymentStatus && g.first.paymentStatus !== f.billPaymentStatus) return false;
    if (f.billPaymentMethod && (g.first.paymentMethod || '') !== f.billPaymentMethod) return false;
    if (f.billNumber && !g.billNumber.toLowerCase().includes(f.billNumber.toLowerCase())) return false;
    if (f.tableNumber && g.first.tableNumber !== f.tableNumber) return false;
    return true;
  });
}

async function buildSheet(
  category: ExportCategory,
  range: { from?: Date; to?: Date },
  filters: ExportFilters,
  cache: { orders?: Order[] }
): Promise<Sheet> {
  const loadOrders = async () => (cache.orders ??= await CafeStore.getAllOrders(range));
  const title = SHEET_TITLES[category];

  switch (category) {
    case 'orders': {
      const orders = filterOrders(await loadOrders(), filters);
      return {
        key: category,
        title,
        headers: [
          'Order ID', 'Date & Time (IST)', 'Table', 'Customer Name', 'Customer Mobile', 'Status',
          'Payment Status', 'Items Count', 'Items Summary', 'Subtotal (₹)', 'Tax (₹)', 'Discount %',
          'Discount (₹)', 'Total (₹)', 'Special Instructions',
        ],
        rows: orders.map((o) => [
          o.id,
          formatIst(o.createdAt),
          o.tableNumber ? `Table ${o.tableNumber}` : o.tableId,
          o.customerName,
          o.customerMobile,
          o.status,
          o.paymentStatus,
          o.items.reduce((s, i) => s + i.quantity, 0),
          o.items.map((i) => `${i.quantity}x ${i.name}`).join('; '),
          o.subtotal,
          o.tax,
          o.discountPercentage || 0,
          o.discountAmount || 0,
          o.total,
          o.specialInstructions || '',
        ]),
      };
    }
    case 'order_items': {
      const orders = filterOrders(await loadOrders(), filters);
      return {
        key: category,
        title,
        headers: [
          'Order ID', 'Date & Time (IST)', 'Table', 'Item Name', 'Category', 'Quantity', 'Unit Price (₹)',
          'Line Total (₹)', 'Options', 'Add-ons', 'Item Notes', 'Order Status',
        ],
        rows: orders.flatMap((o) =>
          o.items.map((i) => [
            o.id,
            formatIst(o.createdAt),
            o.tableNumber ? `Table ${o.tableNumber}` : o.tableId,
            i.name,
            i.category || '',
            i.quantity,
            i.price,
            i.price * i.quantity,
            i.selectedOptions ? Object.entries(i.selectedOptions).map(([k, v]) => `${k}: ${v}`).join('; ') : '',
            (i.selectedAddOns || []).join('; '),
            i.specialInstructions || '',
            o.status,
          ])
        ),
      };
    }
    case 'bills': {
      const bills = filterBills(groupBills(await loadOrders()), filters);
      return {
        key: category,
        title,
        headers: [
          'Bill Number', 'Billed At (IST)', 'Table', 'Customer Name', 'Customer Mobile', 'Order IDs', 'Items',
          'Subtotal (₹)', 'Tax (₹)', 'Discount %', 'Discount (₹)', 'Total (₹)', 'Payment Status', 'Payment Method',
          'Paid At (IST)',
        ],
        rows: bills.map((g) => {
          const t = billTotals(g);
          return [
            g.billNumber,
            formatIst(g.first.billedAt || g.last.updatedAt),
            `Table ${g.first.tableNumber}`,
            g.first.customerName,
            g.first.customerMobile,
            g.orders.map((o) => o.id).join(', '),
            g.orders.flatMap((o) => o.items.map((i) => `${i.quantity}x ${i.name}`)).join('; '),
            t.subtotal,
            t.tax,
            t.discountPercentage,
            t.discountAmount,
            t.total,
            g.first.paymentStatus,
            g.first.paymentMethod || '',
            formatIst(g.first.paidAt),
          ];
        }),
      };
    }
    case 'payments': {
      const paid = filterBills(groupBills(await loadOrders()), filters).filter((g) => g.first.paymentStatus === 'PAID');
      return {
        key: category,
        title,
        headers: ['Bill Number', 'Paid At (IST)', 'Table', 'Customer Name', 'Payment Method', 'Amount (₹)'],
        rows: paid.map((g) => [
          g.billNumber,
          formatIst(g.first.paidAt || g.last.updatedAt),
          `Table ${g.first.tableNumber}`,
          g.first.customerName,
          g.first.paymentMethod || 'CASH',
          billTotals(g).total,
        ]),
      };
    }
    case 'menu_items': {
      const categories = ServerBackend.getCategories();
      const items = ServerBackend.getMenuItems().filter((m) => {
        if (filters.menuCategory && filters.menuCategory.toLowerCase() !== 'all' && m.category !== filters.menuCategory) {
          return false;
        }
        if (filters.menuAvailability !== undefined && (m.isAvailable !== false) !== filters.menuAvailability) {
          return false;
        }
        return true;
      });
      return {
        key: category,
        title,
        headers: ['Item ID', 'Item Name', 'Category', 'Price (₹)', 'Veg', 'Available', 'Popular', 'Add-ons', 'Description'],
        rows: items.map((m) => [
          m.id,
          m.name,
          categories.find((c) => c.slug === m.category)?.name || m.category,
          m.price,
          m.isVeg,
          m.isAvailable !== false,
          Boolean(m.popular),
          (m.addOns || []).map((a) => `${a.name} (₹${a.price})`).join('; '),
          m.description || '',
        ]),
      };
    }
    case 'tables': {
      const tables = (await CafeStore.getAllTables()).filter(
        (t) => !filters.tableStatus || t.status === filters.tableStatus
      );
      return {
        key: category,
        title,
        headers: ['Table ID', 'Table Number', 'Name', 'Section', 'Capacity', 'Status', 'Seated Since (IST)'],
        rows: tables.map((t) => [
          t.id,
          t.tableNumber,
          t.name,
          t.section || '',
          t.capacity,
          t.status,
          formatIst(t.seatedAt),
        ]),
      };
    }
    case 'staff': {
      const staff = ServerBackend.getStaff().filter((u) => !filters.staffRole || u.role === filters.staffRole);
      return {
        key: category,
        title,
        headers: ['Name', 'Email', 'Phone', 'Role', 'Shift', 'Station', 'Active'],
        rows: staff.map((u) => [
          u.name,
          u.email,
          u.contactNumber || '',
          u.role,
          u.shift || '',
          u.assignedStation || '',
          u.is_active !== false,
        ]),
      };
    }
  }
}

async function buildSheets(req: ExportRequest): Promise<{ sheets: Sheet[]; label: string }> {
  const categories = Array.from(new Set(req.categories.map((c) => c.toLowerCase().trim()))).filter(
    (c): c is ExportCategory => (EXPORT_CATEGORIES as readonly string[]).includes(c)
  );
  if (categories.length === 0) {
    throw new ExportError('Select at least one valid data category to export');
  }
  const { from, to, label } = parseDateRange(req.dateRange, req.startDate, req.endDate);
  const cache: { orders?: Order[] } = {};
  const sheets: Sheet[] = [];
  for (const c of categories) {
    sheets.push(await buildSheet(c, { from, to }, req.filters || {}, cache));
  }
  return { sheets, label };
}

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------

/** Neutralises spreadsheet formula injection (e.g. a customer named "=HYPERLINK(...)"). */
function safeText(value: string): string {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

function csvCell(value: Cell): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') return String(value);
  const text = safeText(String(value).trim());
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(sheet: Pick<Sheet, 'headers' | 'rows'>): string {
  const lines = [sheet.headers, ...sheet.rows].map((row) => row.map(csvCell).join(','));
  return `﻿${lines.join('\r\n')}\r\n`;
}

async function toWorkbook(sheets: Sheet[]): Promise<Uint8Array> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Vaan Vibes Management Portal';
  wb.created = new Date();
  for (const s of sheets) {
    const ws = wb.addWorksheet(s.title, { views: [{ state: 'frozen', ySplit: 1 }] });
    ws.addRow(s.headers);
    for (const row of s.rows) {
      ws.addRow(
        row.map((v) => {
          if (v === null || v === undefined) return '';
          if (typeof v === 'boolean') return v ? 'Yes' : 'No';
          return typeof v === 'string' ? safeText(v) : v;
        })
      );
    }
    const header = ws.getRow(1);
    header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF18312B' } };
    ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: s.headers.length } };
    ws.columns.forEach((col, i) => {
      const longest = Math.max(
        s.headers[i].length,
        ...s.rows.slice(0, 500).map((r) => String(r[i] ?? '').length)
      );
      col.width = Math.min(Math.max(longest + 2, 10), 60);
    });
  }
  return new Uint8Array(await wb.xlsx.writeBuffer());
}

export async function previewExport(req: ExportRequest) {
  const { sheets, label } = await buildSheets(req);
  const counts = Object.fromEntries(sheets.map((s) => [s.key, s.rows.length]));
  return {
    counts,
    total_records: sheets.reduce((sum, s) => sum + s.rows.length, 0),
    date_range_label: label,
  };
}

export async function generateExport(
  req: ExportRequest
): Promise<{ body: Uint8Array; contentType: string; filename: string }> {
  const { sheets, label } = await buildSheets(req);

  if ((req.format || 'xlsx') === 'xlsx') {
    return {
      body: await toWorkbook(sheets),
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      filename: `van-vibes-${sheets.length === 1 ? sheets[0].key.replace('_', '-') : 'data'}-${label}.xlsx`,
    };
  }

  if (sheets.length === 1) {
    return {
      body: strToU8(toCsv(sheets[0])),
      contentType: 'text/csv; charset=utf-8',
      filename: `van-vibes-${sheets[0].key.replace('_', '-')}-${label}.csv`,
    };
  }

  const files: Record<string, Uint8Array> = {};
  for (const s of sheets) {
    files[`van-vibes-${s.key.replace('_', '-')}-${label}.csv`] = strToU8(toCsv(s));
  }
  return {
    body: zipSync(files),
    contentType: 'application/zip',
    filename: `van-vibes-export-${label}.zip`,
  };
}
