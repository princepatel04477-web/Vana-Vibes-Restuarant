import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/v1/[...route]/route';
import { CafeStore } from '@/lib/cafe-store';
import { calculateBillBreakdown } from '@/utils/billing';

const espresso = {
  id: 'line-1',
  menuItemId: 'hc-01',
  name: 'Espresso',
  category: 'hot-coffee',
  price: 140,
  quantity: 2,
};

async function call(handler: typeof GET, path: string, body?: unknown) {
  const request = new NextRequest(`http://localhost/api/v1/${path}`, {
    method: handler === GET ? 'GET' : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const res = await handler(request, { params: Promise.resolve({ route: path.split('/') }) });
  const text = await res.text();
  return { status: res.status, data: text ? JSON.parse(text) : null };
}

describe('Flat ₹ bill discount', () => {
  it('takes a fixed amount off the subtotal', () => {
    const result = calculateBillBreakdown(460, 50, 0, 'AMOUNT');
    expect(result.discountType).toBe('AMOUNT');
    expect(result.discountAmount).toBe(50);
    expect(result.discountPercentage).toBe(10.87);
    expect(result.total).toBe(410);
  });

  it('never discounts more than the subtotal or below zero', () => {
    expect(calculateBillBreakdown(200, 500, 0, 'AMOUNT').discountAmount).toBe(200);
    expect(calculateBillBreakdown(200, 500, 0, 'AMOUNT').total).toBe(0);
    expect(calculateBillBreakdown(200, -20, 0, 'AMOUNT').discountAmount).toBe(0);
  });

  it('still defaults to a percentage discount', () => {
    expect(calculateBillBreakdown(460, 10).discountAmount).toBe(46);
    expect(calculateBillBreakdown(460, 10).discountType).toBe('PERCENT');
  });
});

describe('Settling a table from the floor plan', () => {
  beforeEach(async () => {
    await CafeStore.resetAllData();
  });

  it('applies a % discount and closes the whole session in one step', async () => {
    const first = await CafeStore.addStaffOrder('T04', { items: [espresso] });
    const second = await CafeStore.addStaffOrder('T04', { items: [{ ...espresso, quantity: 1 }] });

    const res = await CafeStore.settlePayment(first.order!.id, 'CARD', { discountType: 'PERCENT', discountValue: 10 });
    expect(res.success).toBe(true);

    for (const id of [first.order!.id, second.order!.id]) {
      const o = await CafeStore.getOrderById(id);
      expect(o?.paymentStatus).toBe('PAID');
      expect(o?.sessionStatus).toBe('CLOSED');
      expect(o?.paymentMethod).toBe('CARD');
      expect(o?.billGenerated).toBe(true);
    }
    const bill = await CafeStore.getBill(first.order!.id);
    expect(bill?.subtotal).toBe(420);
    expect(bill?.discountAmount).toBe(42);
    expect(bill?.total).toBe(378);
    expect((await CafeStore.getTable('T04'))?.status).toBe('AVAILABLE');
  });

  it('applies a flat ₹ discount and keeps it on the saved bill', async () => {
    const order = await CafeStore.addStaffOrder('T02', { items: [espresso] });
    await CafeStore.settlePayment(order.order!.id, 'CASH', { discountType: 'AMOUNT', discountValue: 30 });

    const bill = await CafeStore.getBill(order.order!.id);
    expect(bill?.discountType).toBe('AMOUNT');
    expect(bill?.discountAmount).toBe(30);
    expect(bill?.total).toBe(250);
  });

  it('can change the discount at payment time after the bill was generated', async () => {
    const order = await CafeStore.addStaffOrder('T06', { items: [espresso] });
    await CafeStore.generateBill(order.order!.id, 0, 20);

    await CafeStore.settlePayment(order.order!.id, 'UPI', { discountType: 'PERCENT', discountValue: 5 });
    const bill = await CafeStore.getBill(order.order!.id);
    expect(bill?.discountAmount).toBe(14);
    expect(bill?.extraCharge).toBe(20); // kept from bill generation
    expect(bill?.total).toBe(286);
  });

  it('settling without a discount keeps the one saved when the bill was generated', async () => {
    const order = await CafeStore.addStaffOrder('T07', { items: [espresso] });
    await CafeStore.generateBill(order.order!.id, 50, 0, 'AMOUNT');
    await CafeStore.settlePayment(order.order!.id, 'CASH');
    expect((await CafeStore.getBill(order.order!.id))?.total).toBe(230);
  });

  it('does not settle the same bill twice', async () => {
    const order = await CafeStore.addStaffOrder('T08', { items: [espresso] });
    await CafeStore.settlePayment(order.order!.id, 'CASH');
    const again = await CafeStore.settlePayment(order.order!.id, 'UPI');
    expect(again.success).toBe(false);
    expect(again.alreadySettled).toBe(true);
    expect((await CafeStore.getOrderById(order.order!.id))?.paymentMethod).toBe('CASH');
  });

  it('settle route applies the discount sent with it and reports the payment method in the ledger', async () => {
    const order = await CafeStore.addStaffOrder('T09', { items: [espresso] });
    const id = order.order!.id;

    const settled = await call(POST, `billing/${id}/settle`, {
      paymentMethod: 'UPI',
      discount_type: 'AMOUNT',
      discount_value: 80,
    });
    expect(settled.status).toBe(200);
    expect(settled.data).toMatchObject({ paymentStatus: 'PAID', paymentMethod: 'UPI', discountAmount: 80, total: 200 });

    const ledger = await call(GET, 'billing/ledger');
    expect(ledger.data.find((r: { orderId: string }) => r.orderId === id)?.paymentMethod).toBe('UPI');

    const again = await call(POST, `billing/${id}/settle`, { paymentMethod: 'CASH' });
    expect(again.status).toBe(409);
  });

  it('generate route accepts a flat ₹ discount', async () => {
    const order = await CafeStore.addStaffOrder('T10', { items: [espresso] });
    const res = await call(POST, `billing/${order.order!.id}/generate`, { discount_type: 'AMOUNT', discount_value: 40 });
    expect(res.status).toBe(200);
    expect(res.data).toMatchObject({ discountType: 'AMOUNT', discountAmount: 40, total: 240, sessionStatus: 'BILL_GENERATED' });
  });
});
