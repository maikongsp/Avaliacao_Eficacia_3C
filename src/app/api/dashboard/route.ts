export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { seedDatabase } from '@/lib/seed';

export async function GET() {
  const db = getDb();
  seedDatabase(db);

  const totalEvals = (db.prepare('SELECT COUNT(*) as c FROM evaluations').get() as { c: number }).c;
  const totalCollabs = (db.prepare('SELECT COUNT(*) as c FROM eval_collaborators').get() as { c: number }).c;
  const metLevel = (db.prepare(`
    SELECT COUNT(*) as c FROM eval_collaborators
    WHERE desired_level = achieved_level
       OR (desired_level = 'REATIVO' AND achieved_level IN ('REATIVO','DEPENDENTE','INDEPENDENTE','INTERDEPENDENTE'))
       OR (desired_level = 'DEPENDENTE' AND achieved_level IN ('DEPENDENTE','INDEPENDENTE','INTERDEPENDENTE'))
       OR (desired_level = 'INDEPENDENTE' AND achieved_level IN ('INDEPENDENTE','INTERDEPENDENTE'))
       OR (desired_level = 'INTERDEPENDENTE' AND achieved_level = 'INTERDEPENDENTE')
  `).get() as { c: number }).c;

  const avgPct = (db.prepare('SELECT AVG(percentage) as v FROM eval_collaborators').get() as { v: number | null }).v ?? 0;
  const avgGap = (db.prepare('SELECT AVG(gap) as v FROM eval_collaborators').get() as { v: number | null }).v ?? 0;

  const byCategory = db.prepare(`
    SELECT c.name as category, COUNT(ec.id) as total,
           SUM(CASE WHEN ec.gap = 0 THEN 1 ELSE 0 END) as met,
           AVG(ec.percentage) as avg_pct
    FROM eval_collaborators ec
    JOIN evaluations ev ON ev.id = ec.evaluation_id
    JOIN trainings t ON t.id = ev.training_id
    JOIN categories c ON c.id = t.category_id
    GROUP BY c.id
  `).all() as { category: string; total: number; met: number; avg_pct: number }[];

  const byLevel = db.prepare(`
    SELECT achieved_level as level, COUNT(*) as count
    FROM eval_collaborators
    GROUP BY achieved_level
  `).all() as { level: string; count: number }[];

  const byUnit = db.prepare(`
    SELECT u.name as unit, COUNT(ec.id) as total,
           AVG(ec.percentage) as avg_pct,
           SUM(CASE WHEN ec.gap = 0 THEN 1 ELSE 0 END) as met
    FROM eval_collaborators ec
    JOIN evaluations ev ON ev.id = ec.evaluation_id
    JOIN units u ON u.id = ev.unit_id
    GROUP BY u.id
    ORDER BY avg_pct DESC
    LIMIT 10
  `).all() as { unit: string; total: number; avg_pct: number; met: number }[];

  const recent = db.prepare(`
    SELECT ev.id, ev.evaluator_email, ev.evaluation_date,
           t.name as training, u.name as unit,
           COUNT(ec.id) as collaborators,
           AVG(ec.percentage) as avg_pct,
           SUM(CASE WHEN ec.gap = 0 THEN 1 ELSE 0 END) as met
    FROM evaluations ev
    JOIN trainings t ON t.id = ev.training_id
    JOIN units u ON u.id = ev.unit_id
    LEFT JOIN eval_collaborators ec ON ec.evaluation_id = ev.id
    GROUP BY ev.id
    ORDER BY ev.created_at DESC
    LIMIT 5
  `).all();

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
