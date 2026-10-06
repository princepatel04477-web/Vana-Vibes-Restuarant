import { NextRequest, NextResponse } from 'next/server';
import { CafeStore } from '@/lib/cafe-store';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const tableId = searchParams.get('tableId');
  const sessionToken = searchParams.get('sessionToken') || '';
  const all = searchParams.get('all') === 'true';

  if (all) {
    const orders = CafeStore.getAllOrders();
    return NextResponse.json({ orders });
  }

  if (tableId) {
    const orders = CafeStore.getOrdersBySession(tableId, sessionToken);
    return NextResponse.json({ orders });
  }

  // Fallback to all orders
  const orders = CafeStore.getAllOrders();
  return NextResponse.json({ orders });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tableId, token, sessionToken, customerName, customerMobile, specialInstructions, items } = body;

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
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Invalid request payload';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
