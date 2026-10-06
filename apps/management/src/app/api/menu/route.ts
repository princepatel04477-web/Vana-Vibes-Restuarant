import { NextResponse } from 'next/server';
import { fetchFromBackend } from '@/lib/backend-api';

export async function GET() {
  try {
    const [categoriesRes, itemsRes, settingsRes] = await Promise.all([
      fetchFromBackend('/api/v1/categories'),
      fetchFromBackend('/api/v1/menu'),
      fetchFromBackend('/api/v1/settings'),
    ]);

    if (!itemsRes.ok) {
      return NextResponse.json({ error: 'Failed to fetch menu from backend' }, { status: 500 });
    }

    const categoriesData = categoriesRes.ok ? await categoriesRes.json() : [];
    const items = await itemsRes.json();
    const cafe = settingsRes.ok ? await settingsRes.json() : null;

    // Add 'all' virtual category at top for frontend tab compatibility
    const categories = [
      { id: 'all', name: 'All Items', slug: 'all', icon: '🍽️', page: 0 },
      ...categoriesData,
    ];

    return NextResponse.json({
      cafe,
      categories,
      items,
      totalItems: items.length,
      source: 'FastAPI Backend & Database',
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Backend unreachable' },
      { status: 503 }
    );
  }
}
