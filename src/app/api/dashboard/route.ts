export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { seedDatabase } from '@/lib/seed';

export async function GET(req: NextRequest) {
  const db = await getDb();
  await seedDatabase(db);

  const { searchParams } = new URL(req.url);
  const unitId     = searchParams.get('unit_id')     || '';
  const trainingId = searchParams.get('training_id') || '';

  const conds: string[] = [];
  const p: unknown[] = [];
  if (unitId)     { conds.push('ev.unit_id = ?');     p.push(Number(unitId)); }
  if (trainingId) { conds.push('ev.training_id = ?'); p.push(Number(trainingId)); }

  const ecJoin  = `FROM eval_collaborators ec JOIN evaluations ev ON ev.id = ec.evaluation_id JOIN trainings t ON t.id = ev.training_id`;
  const baseW   = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
  const metCond = `(ec.desired_level = ec.achieved_level
    OR (ec.desired_level = 'REATIVO'         AND ec.achieved_level IN ('REATIVO','DEPENDENTE','INDEPENDENTE','INTERDEPENDENTE'))
    OR (ec.desired_level = 'DEPENDENTE'      AND ec.achieved_level IN ('DEPENDENTE','INDEPENDENTE','INTERDEPENDENTE'))
    OR (ec.desired_level = 'INDEPENDENTE'    AND ec.achieved_level IN ('INDEPENDENTE','INTERDEPENDENTE'))
    OR (ec.desired_level = 'INTERDEPENDENTE' AND ec.achieved_level  = 'INTERDEPENDENTE'))`;
  const metW = conds.length ? `WHERE ${conds.join(' AND ')} AND ${metCond}` : `WHERE ${metCond}`;

  const [totalEvalsRow, totalCollabsRow, metLevelRow, avgPctRow, avgGapRow] = await Promise.all([
    db.get<{ c: number }>(`SELECT COUNT(DISTINCT ev.id) as c ${ecJoin} ${baseW}`, p),
    db.get<{ c: number }>(`SELECT COUNT(ec.id) as c ${ecJoin} ${baseW}`, p),
    db.get<{ c: number }>(`SELECT COUNT(ec.id) as c ${ecJoin} ${metW}`, p),
    db.get<{ v: number | null }>(`SELECT AVG(ec.percentage) as v ${ecJoin} ${baseW}`, p),
    db.get<{ v: number | null }>(`SELECT AVG(ec.gap) as v ${ecJoin} ${baseW}`, p),
  ]);

  const byCategory = await db.all<{ category: string; total: number; met: number; avg_pct: number }>(`
    SELECT c.name as category, COUNT(ec.id) as total,
           SUM(CASE WHEN ec.gap = 0 THEN 1 ELSE 0 END) as met,
           AVG(ec.percentage) as avg_pct
    ${ecJoin}
    JOIN categories c ON c.id = t.category_id
    ${baseW}
    GROUP BY c.id, c.name
  `, p);

  const byLevel = await db.all<{ level: string; count: number }>(`
    SELECT ec.achieved_level as level, COUNT(*) as count
    ${ecJoin}
    ${baseW}
    GROUP BY ec.achieved_level
  `, p);

  const byUnit = await db.all<{ unit: string; total: number; avg_pct: number; met: number }>(`
    SELECT u.name as unit, COUNT(ec.id) as total,
           AVG(ec.percentage) as avg_pct,
           SUM(CASE WHEN ec.gap = 0 THEN 1 ELSE 0 END) as met
    ${ecJoin}
    JOIN units u ON u.id = ev.unit_id
    ${baseW}
    GROUP BY u.id, u.name
    ORDER BY avg_pct DESC
    LIMIT 10
  `, p);

  const recent = await db.all(`
    SELECT ev.id, ev.evaluator_email, ev.evaluation_date,
           t.name as training, u.name as unit,
           COUNT(ec.id) as collaborators,
           AVG(ec.percentage) as avg_pct,
           SUM(CASE WHEN ec.gap = 0 THEN 1 ELSE 0 END) as met
    FROM evaluations ev
    JOIN trainings t ON t.id = ev.training_id
    JOIN units u ON u.id = ev.unit_id
    LEFT JOIN eval_collaborators ec ON ec.evaluation_id = ev.id
    ${baseW}
    GROUP BY ev.id, ev.evaluator_email, ev.evaluation_date, t.name, u.name
    ORDER BY ev.created_at DESC
    LIMIT 5
  `, p);

  const totalEvals   = totalEvalsRow?.c  ?? 0;
  const totalCollabs = totalCollabsRow?.c ?? 0;
  const metLevel     = metLevelRow?.c    ?? 0;
  const avgPct       = avgPctRow?.v      ?? 0;
  const avgGap       = avgGapRow?.v      ?? 0;

  return NextResponse.json({
    totalEvals, totalCollabs, metLevel,
    metPct: totalCollabs > 0 ? metLevel / totalCollabs : 0,
    avgPct, avgGap,
    byCategory, byLevel, byUnit, recent,
  });
}
