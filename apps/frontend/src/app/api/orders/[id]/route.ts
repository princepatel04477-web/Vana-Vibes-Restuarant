import { NextRequest, NextResponse } from 'next/server';
import { fetchFromBackend } from '@/lib/backend-api';

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  try {
    const res = await fetchFromBackend(`/api/v1/orders/${id}`);
    if (!res.ok) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    const order = await res.json();
    return NextResponse.json({ order });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Backend unreachable' },
      { status: 503 }
    );
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  try {
    let reason = 'Customer requested cancellation';
    try {
      const body = await request.json();
      if (body?.reason) reason = body.reason;
    } catch {
      // body is optional
    }

    const res = await fetchFromBackend(`/api/v1/orders/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });

    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json(
        {
          success: false,
          error: data.message || data.detail || 'Cannot cancel this order.',
        },
        { status: res.status }
      );
    }

    return NextResponse.json({
      success: true,
      message: data.message || `Order ${id} has been cancelled`,
      order: data.order,
    });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Backend unreachable',
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  try {
    const body = await request.json();
    const { status, reason } = body;

    if (!status) {
      return NextResponse.json({ error: 'Status is required' }, { status: 400 });
    }

    let res: Response;
    if (status === 'CANCELLED') {
      res = await fetchFromBackend(`/api/v1/orders/${id}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ reason: reason || 'Customer cancelled' }),
      });
    } else {
      res = await fetchFromBackend(`/api/v1/orders/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
    }

    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json(
        { error: data.message || data.detail || 'Failed to update order status' },
        { status: res.status }
      );
    }

    return NextResponse.json({
      success: true,
      message: data.message || `Order ${id} status updated to ${status}`,
      order: data.order || data,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to update order' },
      { status: 500 }
    );
  }
}

