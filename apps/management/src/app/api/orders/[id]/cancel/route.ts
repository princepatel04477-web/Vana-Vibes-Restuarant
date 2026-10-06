import { NextRequest, NextResponse } from 'next/server';
import { fetchFromBackend } from '@/lib/backend-api';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  try {
    let reason = 'Customer requested cancellation';
    let cancellationNote: string | undefined = undefined;
    let cancelledBy = 'customer';
    try {
      const body = await request.json();
      if (body?.reason) reason = body.reason.trim();
      if (body?.cancellation_note || body?.cancellationNote) {
        cancellationNote = (body.cancellation_note || body.cancellationNote).trim();
      }
      if (body?.cancelled_by || body?.cancelledBy) {
        cancelledBy = body.cancelled_by || body.cancelledBy;
      }
    } catch {
      // body is optional
    }

    const res = await fetchFromBackend(`/api/v1/orders/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({
        reason,
        cancellation_note: cancellationNote,
        cancelled_by: cancelledBy,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json(
        {
          success: false,
          error: data.detail || data.message || 'Cannot cancel this order.',
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
