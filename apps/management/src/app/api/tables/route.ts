import { NextResponse } from 'next/server';
import { fetchFromBackend } from '@/lib/backend-api';

export async function GET() {
  try {
    const [tablesRes, settingsRes] = await Promise.all([
      fetchFromBackend('/api/v1/tables'),
      fetchFromBackend('/api/v1/settings'),
    ]);

    if (!tablesRes.ok) {
      return NextResponse.json({ error: 'Failed to fetch tables' }, { status: 500 });
    }

    const tables = await tablesRes.json();
    const cafe = settingsRes.ok ? await settingsRes.json() : null;

    return NextResponse.json({
      cafe,
      tables,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Backend unreachable' },
      { status: 503 }
    );
  }
}
