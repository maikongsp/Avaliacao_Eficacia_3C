export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const db = await getDb();
  const id = Number(params.id);

  const evaluation = await db.get(`
    SELECT ev.*, t.name as training, t.full_name as training_full,
           c.name as category, u.name as unit
    FROM evaluations ev
    JOIN trainings t ON t.id = ev.training_id
    JOIN categories c ON c.id = t.category_id
    JOIN units u ON u.id = ev.unit_id
    WHERE ev.id = ?
  `, [id]);

  if (!evaluation) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const collaborators = await db.all(`
    SELECT ec.*, e.registration, e.position, e.section, u.name as unit_name
    FROM eval_collaborators ec
    LEFT JOIN employees e ON e.id = ec.employee_id
    LEFT JOIN units u ON u.id = e.unit_id
    WHERE ec.evaluation_id = ?
    ORDER BY ec.id
  `, [id]);

  const collabIds = (collaborators as { id: number }[]).map(c => c.id);
  const answers = collabIds.length > 0
    ? await db.all(`
        SELECT ea.*, q.type as question_type
        FROM eval_answers ea
        JOIN questions q ON q.id = ea.question_id
        WHERE ea.collaborator_id IN (${collabIds.join(',')})
        ORDER BY ea.collaborator_id, ea.id
      `)
    : [];

  return NextResponse.json({ evaluation, collaborators, answers });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const db = await getDb();
  const id = Number(params.id);
  if (!id) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  await db.transaction(async (tx) => {
    const collabs = await tx.all<{ id: number }>('SELECT id FROM eval_collaborators WHERE evaluation_id = ?', [id]);
    const collabIds = collabs.map(r => r.id);
    if (collabIds.length) {
      await tx.run(`DELETE FROM eval_answers WHERE collaborator_id IN (${collabIds.join(',')})`);
    }
    await tx.run('DELETE FROM eval_collaborators WHERE evaluation_id = ?', [id]);
    await tx.run('DELETE FROM evaluations WHERE id = ?', [id]);
  });

  return NextResponse.json({ ok: true });
}
