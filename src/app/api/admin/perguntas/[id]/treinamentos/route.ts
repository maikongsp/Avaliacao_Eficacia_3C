export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

const ADMIN_PASSWORD = 'Tres@2026';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const { password, training_id, sort_order } = body;

  if (password !== ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Senha de administrador incorreta' }, { status: 401 });
  }

  if (!training_id) {
    return NextResponse.json({ error: 'training_id é obrigatório' }, { status: 400 });
  }

  const db = await getDb();
  const qId = Number(params.id);
  const tId = Number(training_id);

  const existing = await db.get(
    'SELECT 1 FROM training_questions WHERE training_id = ? AND question_id = ?',
    [tId, qId]
  );

  if (existing) {
    return NextResponse.json({ error: 'Esta questão já está vinculada a este treinamento' }, { status: 409 });
  }

  await db.run(
    'INSERT INTO training_questions (training_id, question_id, sort_order) VALUES (?, ?, ?)',
    [tId, qId, Number(sort_order) || 99]
  );

  return NextResponse.json({ ok: true }, { status: 201 });
}
