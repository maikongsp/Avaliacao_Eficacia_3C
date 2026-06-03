export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import * as XLSX from 'xlsx';

export async function GET() {
  const db = await getDb();

  const evals = await db.all<Record<string, unknown>>(`
    SELECT ev.id, t.name as treinamento, c.name as categoria, u.name as unidade,
           ev.evaluator_email as avaliador_email, ev.evaluator_name as avaliador_nome,
           ev.evaluation_date as data_avaliacao, ev.training_date as data_treinamento,
           COUNT(ec.id) as colaboradores,
           ROUND(AVG(ec.percentage) * 100, 1) as pct_acerto_medio,
           SUM(CASE WHEN ec.gap = 0 THEN 1 ELSE 0 END) as atingiram_nivel
    FROM evaluations ev
    JOIN trainings t  ON t.id  = ev.training_id
    JOIN categories c ON c.id  = t.category_id
    JOIN units u      ON u.id  = ev.unit_id
    LEFT JOIN eval_collaborators ec ON ec.evaluation_id = ev.id
    GROUP BY ev.id, t.name, c.name, u.name, ev.evaluator_email, ev.evaluator_name,
             ev.evaluation_date, ev.training_date
    ORDER BY ev.evaluation_date DESC
  `);

  const collabs = await db.all<Record<string, unknown>>(`
    SELECT ev.id as avaliacao_id, t.name as treinamento, u.name as unidade,
           ec.employee_name as colaborador, ec.desired_level as nivel_desejado,
           ec.achieved_level as nivel_alcancado,
           ROUND(ec.percentage * 100, 1) as pct_acerto,
           ROUND(ec.gap * 100, 1) as gap_pct,
           ec.total_questions as total_questoes,
           ec.correct_answers as respostas_corretas
    FROM eval_collaborators ec
    JOIN evaluations ev ON ev.id = ec.evaluation_id
    JOIN trainings t ON t.id = ev.training_id
    JOIN units u ON u.id = ev.unit_id
    ORDER BY ev.evaluation_date DESC, ec.employee_name
  `);

  const wsEvals = XLSX.utils.json_to_sheet(evals.map(r => ({
    'ID':                r.id,
    'Treinamento':       r.treinamento,
    'Categoria':         r.categoria,
    'Unidade':           r.unidade,
    'Avaliador':         r.avaliador_nome || r.avaliador_email,
    'E-mail Avaliador':  r.avaliador_email,
    'Data Avaliação':    r.data_avaliacao,
    'Data Treinamento':  r.data_treinamento,
    'Colaboradores':     r.colaboradores,
    '% Acerto Médio':    r.pct_acerto_medio,
    'Atingiram Nível':   r.atingiram_nivel,
  })));

  const wsCollabs = XLSX.utils.json_to_sheet(collabs.map(r => ({
    'Avaliação ID':       r.avaliacao_id,
    'Treinamento':        r.treinamento,
    'Unidade':            r.unidade,
    'Colaborador':        r.colaborador,
    'Nível Desejado':     r.nivel_desejado,
    'Nível Alcançado':    r.nivel_alcancado,
    '% Acerto':           r.pct_acerto,
    'GAP (%)':            r.gap_pct,
    'Total Questões':     r.total_questoes,
    'Respostas Corretas': r.respostas_corretas,
  })));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, wsEvals,   'Avaliações');
  XLSX.utils.book_append_sheet(wb, wsCollabs, 'Colaboradores');

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  const date = new Date().toISOString().slice(0, 10);

  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="Avaliacoes_${date}.xlsx"`,
    },
  });
}
