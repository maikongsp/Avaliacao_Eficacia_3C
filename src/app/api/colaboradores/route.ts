export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { seedDatabase } from '@/lib/seed';

export async function GET(req: NextRequest) {
  const db = await getDb();
  await seedDatabase(db);

  const { searchParams } = req.nextUrl;
  const search      = searchParams.get('q') ?? '';
  const unitId      = searchParams.get('unit_id') ?? '';
  const evalStatus  = searchParams.get('eval_status') ?? '';
  const planoFilter = searchParams.get('plano') ?? '';
  const gapFilter   = searchParams.get('gap') ?? '';

  const inner: string[] = [];
  const innerParams: (string | number)[] = [];

  if (search) {
    inner.push('(e.name LIKE ? OR e.registration LIKE ?)');
    innerParams.push(`%${search}%`, `%${search}%`);
  }
  if (unitId) {
    inner.push('e.unit_id = ?');
    innerParams.push(Number(unitId));
  }

  const innerWhere = inner.length ? `AND ${inner.join(' AND ')}` : '';

  const outer: string[] = [];
  if (evalStatus === 'avaliado')   outer.push('eval_count > 0');
  if (evalStatus === 'pendente')   outer.push('eval_count = 0');
  if (planoFilter === 'com_plano') outer.push('plan_count > 0');
  if (planoFilter === 'sem_plano') outer.push('plan_count = 0');
  if (gapFilter === 'com_gap')     outer.push('has_gap = 1');
  if (gapFilter === 'sem_gap')     outer.push('has_gap = 0');

  const outerWhere = outer.length ? `WHERE ${outer.join(' AND ')}` : '';

  const sql = `
    SELECT * FROM (
      SELECT
        e.id,
        e.name,
        e.registration,
        e.position,
        e.section,
        e.admission_date,
        e.employment_type,
        u.name  AS unit_name,
        u.id    AS unit_id,
        COUNT(DISTINCT ec.evaluation_id)                                        AS eval_count,
        MAX(ev.evaluation_date)                                                 AS last_eval_date,
        CASE WHEN SUM(CASE WHEN ec.gap > 0 THEN 1 ELSE 0 END) > 0 THEN 1 ELSE 0 END AS has_gap,
        (
          SELECT COUNT(DISTINCT ap.id)
          FROM action_plans ap
          WHERE ap.evaluation_id IN (
            SELECT DISTINCT evaluation_id FROM eval_collaborators WHERE employee_id = e.id
          )
        ) AS plan_count
      FROM employees e
      LEFT JOIN units u ON u.id = e.unit_id
      LEFT JOIN eval_collaborators ec ON ec.employee_id = e.id
      LEFT JOIN evaluations ev ON ev.id = ec.evaluation_id
      WHERE 1=1 ${innerWhere}
      GROUP BY e.id, e.name, e.registration, e.position, e.section, e.admission_date, e.employment_type, u.name, u.id
    ) sub
    ${outerWhere}
    ORDER BY sub.name
    LIMIT 500
  `;

  const rows = await db.all(sql, innerParams);
  return NextResponse.json(rows);
}
