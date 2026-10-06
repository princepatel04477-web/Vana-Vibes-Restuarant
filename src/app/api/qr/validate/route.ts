import { NextRequest, NextResponse } from 'next/server';
import { CafeStore, CAFE_INFO } from '@/lib/cafe-store';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const tableId = searchParams.get('table') || '';
  const token = searchParams.get('token') || '';

  if (!tableId || !token) {
    return NextResponse.json(
      {
        valid: false,
        error: 'Missing table ID or QR security token. Please scan the official table QR code.',
      },
      { status: 400 }
    );
  }

  const result = CafeStore.validateTableQR(tableId, token);

  if (!result.valid || !result.table) {
    return NextResponse.json(
      {
        valid: false,
        error: result.error || 'Invalid or expired QR code.',
      },
      { status: 403 }
    );
  }

  return NextResponse.json({
    valid: true,
    cafe: CAFE_INFO,
    table: {
      id: result.table.id,
      tableNumber: result.table.tableNumber,
      name: result.table.name,
      capacity: result.table.capacity,
      status: result.table.status,
    },
  });
}
