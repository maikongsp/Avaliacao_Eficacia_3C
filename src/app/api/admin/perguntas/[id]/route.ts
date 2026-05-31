export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

const ADMIN_PASSWORD = 'Tres@2026';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const { password, text, type } = body;

  if (password !== ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Senha de administrador incorreta' }, { status: 401 });
  }

  if (!text?.trim() || !type?.trim()) {
    return NextResponse.json({ error: 'Texto e tipo são obrigatórios' }, { status: 400 });
  }

  const db = await getDb();
  await db.run(
    'UPDATE questions SET text = ?, type = ? WHERE id = ?',
    [text.trim(), type.trim(), Number(params.id)]
  );

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const password = req.headers.get('x-admin-password');

  if (password !== ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Senha de administrador incorreta' }, { status: 401 });
  }

  const db = await getDb();
  const id = Number(params.id);

  const answerCount = await db.get<{ cnt: number }>(
    'SELECT COUNT(*) AS cnt FROM eval_answers WHERE question_id = ?',
    [id]
  );

  if ((answerCount?.cnt ?? 0) > 0) {
    return NextResponse.json(
      { error: 'Esta questão possui respostas em avaliações e não pode ser excluída.' },
      { status: 409 }
    );
  }

  await db.run('DELETE FROM training_questions WHERE question_id = ?', [id]);
  await db.run('DELETE FROM questions WHERE id = ?', [id]);

  return NextResponse.json({ ok: true });
}
