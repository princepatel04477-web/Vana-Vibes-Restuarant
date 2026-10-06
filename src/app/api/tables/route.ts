import { NextResponse } from 'next/server';
import { CafeStore } from '@/lib/cafe-store';

export async function GET() {
  const tables = CafeStore.getAllTables();
  return NextResponse.json({
    cafe: CafeStore.getCafeDetails(),
    tables,
  });
}
