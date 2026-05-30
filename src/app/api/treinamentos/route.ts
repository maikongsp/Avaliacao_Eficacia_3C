export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { seedDatabase } from '@/lib/seed';

export async function GET() {
  const db = await getDb();
  await seedDatabase(db);
  const rows = await db.all(`
    SELECT t.id, t.name, t.full_name, t.has_nr11, t.has_nr12, t.has_lockout, t.has_height, t.has_confined,
           c.name as category, c.code as category_code
    FROM trainings t
    JOIN categories c ON c.id = t.category_id
    ORDER BY c.name, t.name
  `);
  return NextResponse.json(rows);
}
