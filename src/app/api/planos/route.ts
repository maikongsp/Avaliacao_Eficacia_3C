export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { seedDatabase } from '@/lib/seed';

export async function GET(req: NextRequest) {
  const db = await getDb();
  await seedDatabase(db);

  const { searchParams } = new URL(req.url);
  const unit     = searchParams.get('unit') || '';
  const resp     = searchParams.get('responsible') || '';
  const status   = searchParams.get('status') || '';
  const evalId   = searchParams.get('evaluation_id') || '';
  const collabId = searchParams.get('eval_collaborator_id') || '';

  let sql = `
    SELECT ap.*,
           e.evaluation_date,
           e.training_date
    FROM action_plans ap
    JOIN evaluations e ON e.id = ap.evaluation_id
    WHERE 1=1
  `;
  const params: (string | number)[] = [];

  if (unit)     { sql += ' AND ap.unit_name LIKE ?';               params.push(`%${unit}%`); }
  if (resp)     { sql += ' AND ap.responsible LIKE ?';             params.push(`%${resp}%`); }
  if (status)   { sql += ' AND ap.status = ?';                     params.push(status); }
  if (evalId)   { sql += ' AND ap.evaluation_id = ?';              params.push(Number(evalId)); }
  if (collabId) { sql += ' AND ap.eval_collaborator_id = ?';       params.push(Number(collabId)); }

  sql += ' ORDER BY ap.created_at DESC';

  const rows = await db.all(sql, params);
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const db = await getDb();
  const body = await req.json();

  const {
    evaluation_id, eval_collaborator_id, employee_name,
    training_name, unit_id, unit_name,
    gap_summary, collaborators_with_gap, avg_gap,
    what, why, how, responsible, due_date,
    where_field, resources, status, priority, notes,
  } = body;

  if (!evaluation_id || !training_name || !unit_name || !what || !how || !responsible || !due_date) {
    return NextResponse.json({ error: 'Campos obrigatórios ausentes' }, { status: 400 });
  }

  const result = await db.run(`
    INSERT INTO action_plans
      (evaluation_id, eval_collaborator_id, employee_name,
       training_name, unit_id, unit_name, gap_summary,
       collaborators_with_gap, avg_gap, what, why, how, responsible,
       due_date, where_field, resources, status, priority, notes)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `, [
    evaluation_id, eval_collaborator_id ?? null, employee_name ?? null,
    training_name, unit_id ?? null, unit_name,
    gap_summary ?? null, collaborators_with_gap ?? 0, avg_gap ?? 0,
    what, why ?? null, how, responsible, due_date,
    where_field ?? null, resources ?? null,
    status ?? 'ABERTO', priority ?? 'MEDIA', notes ?? null,
  ]);

  return NextResponse.json({ id: result.lastInsertRowid }, { status: 201 });
}
