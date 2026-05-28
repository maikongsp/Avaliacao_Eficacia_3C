'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle, XCircle, MinusCircle, AlertTriangle, Plus } from 'lucide-react';
import { formatDate, formatPct } from '@/lib/utils';
import { levelLabel, metDesiredLevel, type SkillLevel } from '@/lib/ranges';

const LEVEL_BADGE: Record<string, string> = {
  REATIVO: 'bg-red-100 text-red-700 border-red-200',
  DEPENDENTE: 'bg-brand-100 text-brand-700 border-brand-200',
  INDEPENDENTE: 'bg-blue-100 text-blue-700 border-blue-200',
  INTERDEPENDENTE: 'bg-green-100 text-green-700 border-green-200',
};

interface Answer {
  id: number;
  collaborator_id: number;
  question_id: number;
  question_text: string;
  answer: 'CONFORME' | 'NAO_CONFORME' | 'NA';
}

interface Collaborator {
  id: number;
  employee_name: string;
  desired_level: SkillLevel;
  achieved_level: SkillLevel;
  total_questions: number;
  correct_answers: number;
  percentage: number;
  gap: number;
  is_effective: number;
  ineffective_reason: string;
  position?: string;
  registration?: string;
}

interface Evaluation {
  id: number;
  evaluator_email: string;
  evaluator_name: string;
  evaluation_date: string;
  training_date: string;
  training: string;
  training_full: string;
  category: string;
  unit: string;
}

export default function EvaluationDetailPage({ params }: { params: { id: string } }) {
  const [data, setData] = useState<{ evaluation: Evaluation; collaborators: Collaborator[]; answers: Answer[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [plansCount, setPlansCount] = useState(0);

  useEffect(() => {
    fetch(`/api/avaliacoes/${params.id}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => { setError('Avaliação não encontrada.'); setLoading(false); });
  }, [params.id]);

  useEffect(() => {
    if (!data) return;
    fetch(`/api/planos?evaluation_id=${params.id}`)
      .then(r => r.json())
      .then(rows => setPlansCount(Array.isArray(rows) ? rows.length : 0))
      .catch(() => {});
  }, [data, params.id]);

  if (loading) return (
    <div className="flex justify-center py-16">
      <div className="animate-spin h-8 w-8 border-4 border-brand-500 border-t-transparent rounded-full" />
    </div>
  );

  if (error || !data) return (
    <div className="text-center py-16">
      <p className="text-gray-500">{error || 'Erro ao carregar.'}</p>
      <Link href="/avaliacoes" className="mt-2 inline-block text-brand-600 hover:underline text-sm">← Voltar</Link>
    </div>
  );

  const { evaluation: ev, collaborators, answers } = data;
  const metCount = collaborators.filter(c => metDesiredLevel(c.desired_level, c.achieved_level)).length;

  const answersForCollab = (cid: number) => answers.filter(a => a.collaborator_id === cid);

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/avaliacoes" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h2 className="text-xl font-bold text-gray-900">{ev.training}</h2>
          <p className="text-sm text-gray-500">{ev.category} · {ev.unit}</p>
        </div>
      </div>

      {/* Header info */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-gray-400 text-xs mb-0.5">Avaliador</p>
            <p className="font-medium">{ev.evaluator_name || ev.evaluator_email}</p>
          </div>
          <div>
            <p className="text-gray-400 text-xs mb-0.5">Data do Treinamento</p>
            <p className="font-medium">{formatDate(ev.training_date)}</p>
          </div>
          <div>
            <p className="text-gray-400 text-xs mb-0.5">Data da Avaliação</p>
            <p className="font-medium">{formatDate(ev.evaluation_date)}</p>
          </div>
          <div>
            <p className="text-gray-400 text-xs mb-0.5">Resultado Geral</p>
            <p className="font-semibold text-lg">
              <span className={metCount === collaborators.length ? 'text-green-600' : metCount > 0 ? 'text-brand-500' : 'text-red-500'}>
                {metCount}/{collaborators.length}
              </span>
              <span className="text-xs font-normal text-gray-400 ml-1">atingiram o nível</span>
            </p>
          </div>
        </div>
      </div>

      {/* Action plan banner */}
      {collaborators.some(c => c.gap > 0) && (
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <AlertTriangle size={18} className="text-orange-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-orange-800 text-sm">
                {collaborators.filter(c => c.gap > 0).length} colaborador(es) com GAP identificado
              </p>
              <p className="text-xs text-orange-600 mt-0.5">
                {plansCount > 0
                  ? `${plansCount} plano(s) de ação criado(s) para esta avaliação`
                  : 'Nenhum plano de ação criado ainda'}
              </p>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            {plansCount > 0 && (
              <Link
                href="/planos"
                className="text-xs text-orange-700 border border-orange-300 rounded-xl px-3 py-2 hover:bg-orange-100 font-medium transition-colors"
              >
                Ver planos
              </Link>
            )}
            <Link
              href={`/planos/nova?avaliacao=${ev.id}`}
              className="flex items-center gap-1.5 text-xs bg-brand-600 text-white rounded-xl px-3 py-2 hover:bg-brand-700 font-semibold transition-colors"
            >
              <Plus size={13} />
              Criar Plano de Ação
            </Link>
          </div>
        </div>
      )}

      {/* Results table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">Resultados por Colaborador</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Colaborador</th>
                <th className="text-center px-4 py-3 text-gray-500 font-medium">Nível Desejado</th>
                <th className="text-center px-4 py-3 text-gray-500 font-medium">Nível Alcançado</th>
                <th className="text-center px-4 py-3 text-gray-500 font-medium">Questões</th>
                <th className="text-center px-4 py-3 text-gray-500 font-medium">% Acerto</th>
                <th className="text-center px-4 py-3 text-gray-500 font-medium">GAP</th>
                <th className="text-center px-4 py-3 text-gray-500 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {collaborators.map(c => {
                const met = metDesiredLevel(c.desired_level, c.achieved_level);
                return (
                  <tr key={c.id} className="border-b border-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800">{c.employee_name}</p>
                      {c.position && <p className="text-xs text-gray-400">{c.position}</p>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${LEVEL_BADGE[c.desired_level] ?? 'bg-gray-100 text-gray-600'}`}>
                        {levelLabel(c.desired_level)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${LEVEL_BADGE[c.achieved_level] ?? 'bg-gray-100 text-gray-600'}`}>
                        {levelLabel(c.achieved_level)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600">{c.correct_answers}/{c.total_questions}</td>
                    <td className="px-4 py-3 text-center font-semibold">
                      <span className={c.percentage >= 0.7 ? 'text-green-600' : c.percentage >= 0.5 ? 'text-brand-500' : 'text-red-500'}>
                        {formatPct(c.percentage)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-500">
                      {c.gap > 0 ? (
                        <span className="text-red-500 font-medium">{formatPct(c.gap)}</span>
                      ) : (
                        <span className="text-green-500">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {met ? (
                        <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                          <CheckCircle size={11} /> Atingiu
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-red-700 bg-red-50 px-2 py-0.5 rounded-full">
                          <XCircle size={11} /> Não atingiu
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detailed answers per collaborator */}
      {collaborators.map(c => {
        const cAnswers = answersForCollab(c.id);
        return (
          <div key={c.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
              <p className="font-medium text-gray-800">{c.employee_name}</p>
              <div className="flex items-center gap-3 text-xs">
                <span className="text-gray-500">Eficácia do treinamento:</span>
                <span className={c.is_effective ? 'text-green-600 font-medium' : 'text-red-500 font-medium'}>
                  {c.is_effective ? 'Eficaz' : 'Não eficaz'}
                </span>
              </div>
            </div>
            {!c.is_effective && c.ineffective_reason && (
              <div className="px-5 py-2 bg-red-50 border-b border-red-100 text-xs text-red-700">
                Motivo: {c.ineffective_reason}
              </div>
            )}
            <div className="divide-y divide-gray-50">
              {cAnswers.map(a => (
                <div key={a.id} className="px-5 py-3 flex items-start gap-3">
                  <div className="mt-0.5">
                    {a.answer === 'CONFORME' ? (
                      <CheckCircle size={16} className="text-green-500 shrink-0" />
                    ) : a.answer === 'NAO_CONFORME' ? (
                      <XCircle size={16} className="text-red-500 shrink-0" />
                    ) : (
                      <MinusCircle size={16} className="text-gray-300 shrink-0" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-700 leading-relaxed">{a.question_text}</p>
                  </div>
                  <div className="shrink-0">
                    <span className={`text-xs font-medium ${a.answer === 'CONFORME' ? 'text-green-600' : a.answer === 'NAO_CONFORME' ? 'text-red-500' : 'text-gray-400'}`}>
                      {a.answer === 'CONFORME' ? 'Conforme' : a.answer === 'NAO_CONFORME' ? 'Não Conforme' : 'N/A'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
