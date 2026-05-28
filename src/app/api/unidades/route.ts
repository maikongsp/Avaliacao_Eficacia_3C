export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  const db = getDb();
  const rows = db.prepare('SELECT id, name FROM units ORDER BY name').all() as { id: number; name: string }[];
  return NextResponse.json(rows);
}
