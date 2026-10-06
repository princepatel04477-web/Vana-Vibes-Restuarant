import { NextRequest, NextResponse } from 'next/server';
import { CafeStore } from '@/lib/cafe-store';

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ orderId: string }> }
) {
  const { orderId } = await context.params;
  const bill = CafeStore.generateBill(orderId);

  if (!bill) {
    return NextResponse.json({ error: 'Bill not found for order' }, { status: 404 });
  }

  return NextResponse.json({ bill });
}
