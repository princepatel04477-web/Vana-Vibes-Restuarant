import { NextRequest, NextResponse } from 'next/server';
import { CafeStore } from '@/lib/cafe-store';
import { OrderStatus, PaymentStatus } from '@/types/cafe';

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const order = CafeStore.getOrderById(id);

  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  return NextResponse.json({ order });
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  try {
    const body = await request.json();
    const { status, paymentStatus, source } = body;

    let updatedOrder;

    if (status) {
      const validStatuses: OrderStatus[] = [
        'ORDER_PLACED',
        'ACCEPTED',
        'PREPARING',
        'READY',
        'SERVED',
        'COMPLETED',
        'CANCELLED',
      ];

      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { error: `Invalid order status: ${status}` },
          { status: 400 }
        );
      }

      const existing = CafeStore.getOrderById(id);
      if (!existing) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
      }

      if (status === 'CANCELLED' && source === 'customer' && existing.status !== 'ORDER_PLACED') {
        return NextResponse.json(
          { error: 'Order cannot be cancelled once accepted by the kitchen' },
          { status: 400 }
        );
      }

      const res = CafeStore.updateOrderStatus(id, status);
      if (!res.success) {
        return NextResponse.json({ error: res.error }, { status: 400 });
      }
      updatedOrder = res.order;
    }

    if (paymentStatus) {
      const validPaymentStatuses: PaymentStatus[] = ['PENDING', 'PAID', 'REFUNDED'];
      if (!validPaymentStatuses.includes(paymentStatus)) {
        return NextResponse.json(
          { error: `Invalid payment status: ${paymentStatus}` },
          { status: 400 }
        );
      }

      const res = CafeStore.updatePaymentStatus(id, paymentStatus);
      if (!res.success) {
        return NextResponse.json({ error: res.error }, { status: 400 });
      }
      updatedOrder = res.order;
    }

    return NextResponse.json({
      success: true,
      order: updatedOrder || CafeStore.getOrderById(id),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error processing update';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
