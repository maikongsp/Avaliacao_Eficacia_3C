export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const db = await getDb();
  const row = await db.get('SELECT * FROM action_plans WHERE id = ?', [Number(params.id)]);
  if (!row) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });
  return NextResponse.json(row);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const db = await getDb();
  const body = await req.json();
  const allowed = ['status', 'priority', 'notes', 'due_date', 'responsible', 'what', 'how', 'where_field', 'resources', 'why'];
  const sets: string[] = [];
  const vals: (string | number | null)[] = [];

  for (const key of allowed) {
    if (key in body) {
      sets.push(`${key} = ?`);
      vals.push(body[key]);
    }
  }
  if (sets.length === 0) return NextResponse.json({ error: 'Nenhum campo enviado' }, { status: 400 });

  sets.push('updated_at = CURRENT_TIMESTAMP');
  vals.push(Number(params.id));

  await db.run(`UPDATE action_plans SET ${sets.join(', ')} WHERE id = ?`, vals);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const db = await getDb();
  await db.run('DELETE FROM action_plans WHERE id = ?', [Number(params.id)]);
  return NextResponse.json({ ok: true });
}
