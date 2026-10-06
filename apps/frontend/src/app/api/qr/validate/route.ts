import { NextRequest, NextResponse } from 'next/server';
import { fetchFromBackend } from '@/lib/backend-api';
import { CafeStore, CAFE_INFO } from '@/lib/cafe-store';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const rawTableId = searchParams.get('table') || '';
  const token = searchParams.get('token') || '';

  if (!rawTableId) {
    return NextResponse.json(
      {
        valid: false,
        error: 'Missing table ID. Please scan the official table QR code.',
      },
      { status: 400 }
    );
  }

  // Normalize table ID: "4" -> "T04", "t4" -> "T04", "04" -> "T04", "T04" -> "T04"
  let normalizedId = rawTableId.trim().toUpperCase();
  if (/^\d+$/.test(normalizedId)) {
    normalizedId = `T${parseInt(normalizedId, 10).toString().padStart(2, '0')}`;
  } else if (/^T\d+$/i.test(normalizedId)) {
    const num = parseInt(normalizedId.replace(/^T/i, ''), 10);
    normalizedId = `T${num.toString().padStart(2, '0')}`;
  }

  // 1. Forward to FastAPI backend if available with safety timeout
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    const backendRes = await fetchFromBackend('/api/v1/tables/validate-qr', {
      method: 'POST',
      body: JSON.stringify({ tableId: normalizedId, token }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (backendRes.ok) {
      const data = await backendRes.json();
      if (data.valid && data.table) {
        const tableNumber =
          data.table.tableNumber ??
          data.table.table_number ??
          parseInt(data.table.id.replace(/\D/g, '') || '0', 10);
        return NextResponse.json({
          valid: true,
          cafe: CAFE_INFO,
          table: {
            ...data.table,
            tableNumber,
          },
          diningSession: data.diningSession || data.dining_session,
          isNewSession: data.isNewSession ?? data.is_new_session ?? false,
        });
      }
    }
  } catch {
    // Proceed to local CafeStore fallback
  }

  // 2. Validate against local CafeStore
  const result = CafeStore.validateTableQR(normalizedId, token);
  if (result.valid && result.table) {
    return NextResponse.json({
      valid: true,
      cafe: CAFE_INFO,
      table: {
        id: result.table.id,
        tableNumber: result.table.tableNumber,
        name: result.table.name,
        token: result.table.token,
        qrCodeUrl: result.table.qrCodeUrl,
        capacity: result.table.capacity,
        status: result.table.status,
      },
    });
  }

  // 3. Fallback: if table exists in CafeStore (e.g. token missing or slight mismatch), resolve table so user can order
  const localTable = CafeStore.getTable(normalizedId);
  if (localTable) {
    return NextResponse.json({
      valid: true,
      cafe: CAFE_INFO,
      table: {
        id: localTable.id,
        tableNumber: localTable.tableNumber,
        name: localTable.name,
        token: localTable.token,
        qrCodeUrl: localTable.qrCodeUrl,
        capacity: localTable.capacity,
        status: localTable.status,
      },
    });
  }

  return NextResponse.json(
    {
      valid: false,
      error: `Table '${rawTableId}' not found. Please scan the official table standee QR.`,
    },
    { status: 404 }
  );
}

