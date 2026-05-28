import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(req: NextRequest) {
  const db = getDb();
  const tid = req.nextUrl.searchParams.get('training_id');
  if (!tid) return NextResponse.json({ error: 'training_id required' }, { status: 400 });

  const rows = db.prepare(`
    SELECT tq.sort_order, q.id, q.text, q.type
    FROM training_questions tq
    JOIN questions q ON q.id = tq.question_id
    WHERE tq.training_id = ?
    ORDER BY tq.sort_order
  `).all(Number(tid));

  return NextResponse.json(rows);
}
