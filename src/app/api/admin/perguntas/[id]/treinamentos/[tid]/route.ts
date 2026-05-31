export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

const ADMIN_PASSWORD = 'Tres@2026';

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; tid: string } }
) {
  const password = req.headers.get('x-admin-password');

  if (password !== ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Senha de administrador incorreta' }, { status: 401 });
  }

  const db = await getDb();
  await db.run(
    'DELETE FROM training_questions WHERE question_id = ? AND training_id = ?',
    [Number(params.id), Number(params.tid)]
  );

  return NextResponse.json({ ok: true });
}
