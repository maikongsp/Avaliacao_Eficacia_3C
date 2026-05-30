export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { seedDatabase } from '@/lib/seed';
import { calculateAchievedLevel, calculateGap, type SkillLevel } from '@/lib/ranges';

export async function GET() {
  const db = await getDb();
  await seedDatabase(db);

  const rows = await db.all(`
    SELECT ev.id, ev.evaluator_email, ev.evaluator_name, ev.evaluation_date, ev.training_date, ev.created_at,
           t.name as training, c.name as category,
           u.name as unit,
           COUNT(ec.id) as collaborators,
           ROUND(AVG(ec.percentage) * 100) as avg_pct,
           SUM(CASE WHEN ec.gap = 0 THEN 1 ELSE 0 END) as met
    FROM evaluations ev
    JOIN trainings t ON t.id = ev.training_id
    JOIN categories c ON c.id = t.category_id
    JOIN units u ON u.id = ev.unit_id
    LEFT JOIN eval_collaborators ec ON ec.evaluation_id = ev.id
    GROUP BY ev.id, ev.evaluator_email, ev.evaluator_name, ev.evaluation_date, ev.training_date, ev.created_at,
             t.name, c.name, u.name
    ORDER BY ev.created_at DESC
  `);

  return NextResponse.json(rows);
}

interface AnswerInput {
  question_id: number;
  question_text: string;
  answer: 'CONFORME' | 'NAO_CONFORME' | 'NA';
}

interface CollaboratorInput {
  employee_id?: number;
  employee_name: string;
  desired_level: SkillLevel;
  is_effective: boolean;
  ineffective_reason?: string;
  has_height_work?: boolean;
  has_confined_work?: boolean;
  answers: AnswerInput[];
}

interface EvalPayload {
  evaluator_email: string;
  evaluator_name?: string;
  evaluation_date: string;
  training_date: string;
  training_id: number;
  unit_id: number;
  unit_name?: string;
  collaborators: CollaboratorInput[];
}

export async function POST(req: NextRequest) {
  const db = await getDb();
  const body: EvalPayload = await req.json();

  // Resolve unit_id from unit_name if provided
  if (body.unit_name) {
    const u = await db.get<{ id: number }>('SELECT id FROM units WHERE name = ?', [body.unit_name]);
    if (u) {
      body.unit_id = u.id;
    } else {
      const newUnit = await db.run('INSERT INTO units (name) VALUES (?)', [body.unit_name]);
      body.unit_id = newUnit.lastInsertRowid;
    }
  }

  const evalId = await db.transaction(async (tx) => {
    const evId = (await tx.run(
      `INSERT INTO evaluations (evaluator_email, evaluator_name, evaluation_date, training_date, training_id, unit_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [body.evaluator_email, body.evaluator_name ?? '', body.evaluation_date, body.training_date, body.training_id, body.unit_id]
    )).lastInsertRowid;

    for (const collab of body.collaborators) {
      const scored  = collab.answers.filter(a => a.answer !== 'NA');
      const total   = scored.length;
      const correct = scored.filter(a => a.answer === 'CONFORME').length;
      const pct     = total > 0 ? correct / total : 0;
      const achieved = calculateAchievedLevel(total, correct);
      const gap      = calculateGap(collab.desired_level, achieved, pct);

      const cid = (await tx.run(
        `INSERT INTO eval_collaborators
           (evaluation_id, employee_id, employee_name, desired_level, achieved_level,
            total_questions, correct_answers, percentage, gap,
            is_effective, ineffective_reason, has_height_work, has_confined_work)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [evId, collab.employee_id ?? null, collab.employee_name,
         collab.desired_level, achieved, total, correct, pct, gap,
         collab.is_effective ? 1 : 0, collab.ineffective_reason ?? '',
         collab.has_height_work ? 1 : 0, collab.has_confined_work ? 1 : 0]
      )).lastInsertRowid;

      for (const ans of collab.answers) {
        await tx.run(
          'INSERT INTO eval_answers (collaborator_id, question_id, question_text, answer) VALUES (?, ?, ?, ?)',
          [cid, ans.question_id, ans.question_text, ans.answer]
        );
      }
    }

    return evId;
  });

  return NextResponse.json({ id: evalId });
}
