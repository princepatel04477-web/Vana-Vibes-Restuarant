import { NextRequest, NextResponse } from 'next/server';
import { fetchFromBackend } from '@/lib/backend-api';
import { CafeStore } from '@/lib/cafe-store';

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ orderId: string }> }
) {
  const { orderId } = await context.params;

  // 1. Try FastAPI backend
  try {
    const backendRes = await fetchFromBackend(`/api/v1/billing/${orderId}`);
    if (backendRes.ok) {
      const bill = await backendRes.json();
      return NextResponse.json({ bill });
    }
  } catch {
    // Proceed to local CafeStore
  }

  const bill = CafeStore.generateBill(orderId);

  if (!bill) {
    return NextResponse.json({ error: 'Bill not found for order' }, { status: 404 });
  }

  return NextResponse.json({ bill });
}

