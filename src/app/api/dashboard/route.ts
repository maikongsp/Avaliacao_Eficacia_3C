export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { seedDatabase } from '@/lib/seed';

export async function GET() {
  const db = await getDb();
  await seedDatabase(db);

  const totalEvalsRow  = await db.get<{ c: number }>('SELECT COUNT(*) as c FROM evaluations');
  const totalCollabsRow = await db.get<{ c: number }>('SELECT COUNT(*) as c FROM eval_collaborators');
  const metLevelRow = await db.get<{ c: number }>(`
    SELECT COUNT(*) as c FROM eval_collaborators
    WHERE desired_level = achieved_level
       OR (desired_level = 'REATIVO' AND achieved_level IN ('REATIVO','DEPENDENTE','INDEPENDENTE','INTERDEPENDENTE'))
       OR (desired_level = 'DEPENDENTE' AND achieved_level IN ('DEPENDENTE','INDEPENDENTE','INTERDEPENDENTE'))
       OR (desired_level = 'INDEPENDENTE' AND achieved_level IN ('INDEPENDENTE','INTERDEPENDENTE'))
       OR (desired_level = 'INTERDEPENDENTE' AND achieved_level = 'INTERDEPENDENTE')
  `);

  const avgPctRow = await db.get<{ v: number | null }>('SELECT AVG(percentage) as v FROM eval_collaborators');
  const avgGapRow = await db.get<{ v: number | null }>('SELECT AVG(gap) as v FROM eval_collaborators');

  const totalEvals  = totalEvalsRow?.c ?? 0;
  const totalCollabs = totalCollabsRow?.c ?? 0;
  const metLevel    = metLevelRow?.c ?? 0;
  const avgPct      = avgPctRow?.v ?? 0;
  const avgGap      = avgGapRow?.v ?? 0;

  const byCategory = await db.all<{ category: string; total: number; met: number; avg_pct: number }>(`
    SELECT c.name as category, COUNT(ec.id) as total,
           SUM(CASE WHEN ec.gap = 0 THEN 1 ELSE 0 END) as met,
           AVG(ec.percentage) as avg_pct
    FROM eval_collaborators ec
    JOIN evaluations ev ON ev.id = ec.evaluation_id
    JOIN trainings t ON t.id = ev.training_id
    JOIN categories c ON c.id = t.category_id
    GROUP BY c.id, c.name
  `);

  const byLevel = await db.all<{ level: string; count: number }>(`
    SELECT achieved_level as level, COUNT(*) as count
    FROM eval_collaborators
    GROUP BY achieved_level
  `);

  const byUnit = await db.all<{ unit: string; total: number; avg_pct: number; met: number }>(`
    SELECT u.name as unit, COUNT(ec.id) as total,
           AVG(ec.percentage) as avg_pct,
           SUM(CASE WHEN ec.gap = 0 THEN 1 ELSE 0 END) as met
    FROM eval_collaborators ec
    JOIN evaluations ev ON ev.id = ec.evaluation_id
    JOIN units u ON u.id = ev.unit_id
    GROUP BY u.id, u.name
    ORDER BY avg_pct DESC
    LIMIT 10
  `);

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
    GROUP BY ev.id, ev.evaluator_email, ev.evaluation_date, t.name, u.name
    ORDER BY ev.created_at DESC
    LIMIT 5
  `);

  return NextResponse.json({
    totalEvals,
    totalCollabs,
    metLevel,
    metPct: totalCollabs > 0 ? metLevel / totalCollabs : 0,
    avgPct,
    avgGap,
    byCategory,
    byLevel,
    byUnit,
    recent,
  });
}
