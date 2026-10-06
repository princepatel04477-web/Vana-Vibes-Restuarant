import { NextRequest, NextResponse } from 'next/server';
import { fetchFromBackend } from '@/lib/backend-api';
import { CafeStore } from '@/lib/cafe-store';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const tableId = searchParams.get('tableId');
  const sessionToken = searchParams.get('sessionToken') || '';
  const all = searchParams.get('all') === 'true';

  try {
    let endpoint = '/api/v1/orders';
    const params = new URLSearchParams();
    if (!all && sessionToken) {
      params.set('session_token', sessionToken);
    }
    if (tableId) {
      params.set('table_id', tableId);
    }
    if (params.toString()) {
      endpoint += `?${params.toString()}`;
    }

    const res = await fetchFromBackend(endpoint);
    if (res.ok) {
      let orders = await res.json();
      if (!all && Array.isArray(orders)) {
        orders = orders.filter(
          (o: { paymentStatus?: string; payment_status?: string; sessionStatus?: string }) =>
            o.paymentStatus !== 'PAID' && o.payment_status !== 'PAID' && o.sessionStatus !== 'CLOSED'
        );
      }
      return NextResponse.json({ orders });
    }
  } catch {
    // Proceed to local fallback
  }

  if (all) {
    const orders = CafeStore.getAllOrders();
    return NextResponse.json({ orders });
  }

  if (tableId) {
    const orders = CafeStore.getOrdersBySession(tableId, sessionToken);
    return NextResponse.json({ orders });
  }

  return NextResponse.json({ orders: [] });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tableId, token, sessionToken, diningSessionId, customerName, customerMobile, specialInstructions, items } = body;

    // 1. Forward to FastAPI backend if available
    try {
      const backendRes = await fetchFromBackend('/api/v1/orders', {
        method: 'POST',
        body: JSON.stringify({
          tableId,
          token,
          sessionToken: sessionToken || '',
          diningSessionId: diningSessionId || undefined,
          customerName,
          customerMobile,
          specialInstructions,
          items,
        }),
      });

      if (backendRes.ok) {
        const backendOrder = await backendRes.json();
        // Sync local cache
        CafeStore.createOrder({
          tableId,
          token,
          sessionToken: backendOrder.sessionToken || backendOrder.diningSessionId || sessionToken,
          customerName,
          customerMobile,
          specialInstructions,
          items,
        });

        return NextResponse.json({
          success: true,
          message: 'Order created successfully!',
          order: backendOrder,
        });
      } else if (backendRes.status >= 400) {
        const errorData = await backendRes.json().catch(() => ({}));
        const message =
          errorData.message ||
          errorData.detail ||
          errorData.error ||
          (backendRes.status === 422 ? 'Validation failed' : 'Failed to place order');
        const fieldErrors =
          errorData.fieldErrors ||
          (Array.isArray(errorData.errors)
            ? Object.fromEntries(
                errorData.errors
                  .filter((e: { field?: string; message?: string }) => e && e.field)
                  .map((e: { field?: string; message?: string }) => [e.field || '', e.message || ''])
              )
            : undefined);

        return NextResponse.json(
          {
            success: false,
            error: message,
            message,
            fieldErrors,
            errors: errorData.errors || [],
          },
          { status: backendRes.status }
        );
      }
    } catch {
      // Backend unavailable; proceed to local store
    }

    // 2. Offline / local fallback to CafeStore
    const result = CafeStore.createOrder({
      tableId,
      token,
      sessionToken,
      customerName,
      customerMobile,
      specialInstructions,
      items,
    });

    if (!result.success || !result.order) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to place order' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Order created successfully!',
      order: result.order,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Invalid request payload';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

