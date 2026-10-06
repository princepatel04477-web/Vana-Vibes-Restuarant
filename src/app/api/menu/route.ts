import { NextResponse } from 'next/server';
import { MENU_CATEGORIES, MENU_ITEMS } from '@/data/vaan-vibes-menu';
import { CAFE_INFO } from '@/lib/cafe-store';

export async function GET() {
  return NextResponse.json({
    cafe: CAFE_INFO,
    categories: MENU_CATEGORIES,
    items: MENU_ITEMS,
    totalItems: MENU_ITEMS.length,
    source: 'Vaan Vibes Menu PDF',
  });
}
