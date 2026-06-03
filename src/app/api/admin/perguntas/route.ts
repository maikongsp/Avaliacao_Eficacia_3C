export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

const ADMIN_PASSWORD = 'Tres@2026';

export async function GET() {
  const db = await getDb();

  const questions = await db.all<{ id: number; text: string; type: string }>(
    'SELECT id, text, type FROM questions ORDER BY type, id'
  );

  const associations = await db.all<{
    question_id: number;
    training_id: number;
    training_name: string;
    sort_order: number;
  }>(`
    SELECT tq.question_id, tq.training_id, t.name AS training_name, tq.sort_order
    FROM training_questions tq
    JOIN trainings t ON t.id = tq.training_id
    ORDER BY t.name
  `);

  const result = questions.map(q => ({
    ...q,
    trainings: associations
      .filter(a => a.question_id === q.id)
      .map(a => ({ id: a.training_id, name: a.training_name, sort_order: a.sort_order })),
  }));

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { password, text, type } = body;

  if (password !== ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Senha de administrador incorreta' }, { status: 401 });
  }

  if (!text?.trim() || !type?.trim()) {
    return NextResponse.json({ error: 'Texto e tipo são obrigatórios' }, { status: 400 });
  }

  const db = await getDb();
  const result = await db.run(
    'INSERT INTO questions (text, type) VALUES (?, ?)',
    [text.trim(), type.trim()]
  );

  return NextResponse.json({ id: result.lastInsertRowid }, { status: 201 });
}
