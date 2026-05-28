export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { seedDatabase } from '@/lib/seed';

export async function GET(req: NextRequest) {
  const db = getDb();
  seedDatabase(db);
  const search = req.nextUrl.searchParams.get('q') ?? '';
  const unitId = req.nextUrl.searchParams.get('unit_id');

  let query = `
    SELECT e.id, e.name, e.registration, e.position, e.section, e.admission_date, e.employment_type,
           u.name as unit_name, u.id as unit_id
    FROM employees e
    LEFT JOIN units u ON u.id = e.unit_id
    WHERE 1=1
  `;
  const params: (string | number)[] = [];
  if (search) {
    query += ` AND (e.name LIKE ? OR e.registration LIKE ?)`;
    params.push(`%${search}%`, `%${search}%`);
  }
  if (unitId) {
    query += ` AND e.unit_id = ?`;
    params.push(Number(unitId));
  }
  query += ' ORDER BY e.name LIMIT 100';

  const rows = db.prepare(query).all(...params);
  return NextResponse.json(rows);
}
