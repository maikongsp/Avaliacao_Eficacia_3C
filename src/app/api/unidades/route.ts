export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  const db = await getDb();
  const rows = await db.all<{ id: number; name: string }>('SELECT id, name FROM units ORDER BY name');
  return NextResponse.json(rows);
}
