import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST, PUT, PATCH, DELETE } from '@/app/api/v1/[...route]/route';
import { CafeStore } from '@/lib/cafe-store';
import { createToken } from '@/lib/server-backend';

const adminToken = createToken({ sub: 'u-admin-9054032800', role: 'ADMIN' });
const chefToken = createToken({ sub: 'u-chef-legacy', role: 'CHEF' });

type Handler = typeof GET;

async function call(handler: Handler, path: string, body?: unknown, token: string | null = adminToken) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const request = new NextRequest(`http://localhost/api/v1/${path}`, {
    method: handler === GET ? 'GET' : 'POST',
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const pathOnly = path.split('?')[0];
  const res = await handler(request, { params: Promise.resolve({ route: pathOnly.split('/') }) });
  const text = await res.text();
  return { status: res.status, data: text ? JSON.parse(text) : null };
}

const waterBottle = { name: 'Water Bottle', category: 'non-coffee', price: 20, isVeg: true };

describe('Admin menu changes are saved on the server', () => {
  beforeEach(async () => {
    global.__VAAN_VIBES_MEMORY_DB__ = undefined;
    await CafeStore.resetAllData();
  });

  it('a new dish shows up in the menu, search and the add-items flow', async () => {
    const created = await call(POST, 'menu', waterBottle);
    expect(created.status).toBe(201);
    expect(created.data).toMatchObject({ id: 'water-bottle', name: 'Water Bottle', price: 20, isAvailable: true });

    const menu = await call(GET, 'menu');
    expect(menu.data.some((m: { id: string }) => m.id === 'water-bottle')).toBe(true);

    const search = await call(GET, 'menu?search=water%20bot');
    expect(search.data.map((m: { name: string }) => m.name)).toEqual(['Water Bottle']);

    const added = await call(POST, 'tables/T04/orders', { items: [{ menuItemId: 'water-bottle', quantity: 3 }] });
    expect(added.status).toBe(201);
    expect(added.data.total).toBe(60);
  });

  it('a new dish can be ordered from a table QR code', async () => {
    await call(POST, 'menu', waterBottle);
    const table = (await CafeStore.getTable('T02'))!;
    const res = await CafeStore.createOrder({
      tableId: 'T02',
      token: table.token,
      sessionToken: '',
      customerName: 'Asha',
      customerMobile: '9876543210',
      items: [{ id: 'l1', menuItemId: 'water-bottle', name: 'Water Bottle', category: 'non-coffee', price: 1, quantity: 2 }],
    });
    expect(res.success).toBe(true);
    expect(res.order?.subtotal).toBe(40);
  });

  it('rejects duplicates and invalid fields with field errors', async () => {
    await call(POST, 'menu', waterBottle);
    const dup = await call(POST, 'menu', { ...waterBottle, name: ' water bottle ' });
    expect(dup.status).toBe(422);
    expect(dup.data.fieldErrors.name).toContain('already on the menu');

    const bad = await call(POST, 'menu', { name: '', category: 'nope', price: 0 });
    expect(bad.status).toBe(422);
    expect(Object.keys(bad.data.fieldErrors).sort()).toEqual(['category', 'name', 'price']);
  });

  it('only admins can change the menu', async () => {
    expect((await call(POST, 'menu', waterBottle, null)).status).toBe(401);
    expect((await call(POST, 'menu', waterBottle, chefToken)).status).toBe(403);
  });

  it('edit, availability and delete are saved', async () => {
    await call(POST, 'menu', waterBottle);

    const edited = await call(PUT, 'menu/water-bottle', { price: 25 });
    expect(edited.data.price).toBe(25);

    const hidden = await call(PATCH, 'menu/water-bottle/availability', { isAvailable: false });
    expect(hidden.data.isAvailable).toBe(false);
    const blocked = await call(POST, 'tables/T04/orders', { items: [{ menuItemId: 'water-bottle' }] });
    expect(blocked.status).toBe(400);

    expect((await call(DELETE, 'menu/water-bottle')).status).toBe(200);
    const menu = await call(GET, 'menu');
    expect(menu.data.some((m: { id: string }) => m.id === 'water-bottle')).toBe(false);
  });

  it('categories can be added, and are only deleted when empty', async () => {
    const cat = await call(POST, 'categories', { name: 'Beverages', icon: '🥤' });
    expect(cat.status).toBe(201);
    expect(cat.data.slug).toBe('beverages');
    expect((await call(POST, 'categories', { name: 'beverages' })).status).toBe(409);

    await call(POST, 'menu', { ...waterBottle, category: 'beverages' });
    expect((await call(DELETE, 'categories/beverages')).status).toBe(409);

    await call(DELETE, 'menu/water-bottle');
    expect((await call(DELETE, 'categories/beverages')).status).toBe(200);
  });
});

describe('Billing routes used by the bill window', () => {
  beforeEach(async () => {
    global.__VAAN_VIBES_MEMORY_DB__ = undefined;
    await CafeStore.resetAllData();
  });

  const espresso = { id: 'l1', menuItemId: 'hc-01', name: 'Espresso', category: 'hot-coffee', price: 140, quantity: 2 };

  it('viewing a bill does not close the session or free the table', async () => {
    const { order } = await CafeStore.addStaffOrder('T07', { items: [espresso] });
    const view = await call(GET, `billing/${order!.id}`);
    expect(view.status).toBe(200);
    expect(view.data.sessionStatus).toBe('OPEN');
    expect((await CafeStore.getTable('T07'))?.status).toBe('OCCUPIED');
    expect((await CafeStore.getOrderById(order!.id))?.billGenerated).toBe(false);
  });

  it('session view, generate and settle all work', async () => {
    const first = await CafeStore.addStaffOrder('T08', { items: [espresso] });
    await CafeStore.addStaffOrder('T08', { items: [{ ...espresso, quantity: 1 }] });
    const sessionId = first.order!.sessionToken;

    const view = await call(GET, `billing/sessions/${sessionId}`);
    expect(view.status).toBe(200);
    expect(view.data.subtotal).toBe(420);

    const generated = await call(POST, `billing/sessions/${sessionId}/generate`, { discountPercentage: 10, extraCharge: 15.5 });
    expect(generated.status).toBe(200);
    expect(generated.data).toMatchObject({
      sessionStatus: 'BILL_GENERATED',
      discountAmount: 42,
      extraCharge: 15.5,
      total: 394, // 420 - 42 + 15.5 = 393.5, rounded
      billNumber: `BILL-${first.order!.id.replace('VV-', '')}-${new Date().getFullYear()}`,
    });
    expect((await CafeStore.getTable('T08'))?.status).toBe('AVAILABLE');

    const settled = await call(POST, `billing/sessions/${sessionId}/settle`, { paymentMethod: 'UPI' });
    expect(settled.status).toBe(200);
    expect(settled.data).toMatchObject({ paymentStatus: 'PAID', paymentMethod: 'UPI', total: 394 });

    const after = await call(GET, `billing/sessions/${sessionId}`);
    expect(after.data.paymentStatus).toBe('PAID');
  });

  it('cancelled orders are not charged', async () => {
    const first = await CafeStore.addStaffOrder('T09', { items: [espresso] });
    const second = await CafeStore.addStaffOrder('T09', { items: [{ ...espresso, quantity: 1 }] });
    await CafeStore.updateOrderStatus(second.order!.id, 'CANCELLED');
    const bill = await call(GET, `billing/${first.order!.id}`);
    expect(bill.data.subtotal).toBe(280);
    expect(bill.data.items).toHaveLength(1);
  });

  it('unknown bills return a clear 404', async () => {
    expect((await call(GET, 'billing/sessions/sess_nope')).status).toBe(404);
    expect((await call(POST, 'billing/VV-9999/generate', {})).status).toBe(404);
  });
});
