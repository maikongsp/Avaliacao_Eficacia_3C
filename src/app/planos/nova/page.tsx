'use client';
import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, AlertTriangle, Save, User } from 'lucide-react';
import { formatPct } from '@/lib/utils';
import { levelLabel } from '@/lib/ranges';

const STATUS_OPTS = ['ABERTO', 'EM_ANDAMENTO', 'CONCLUIDO', 'CANCELADO'];
const PRIORITY_OPTS = ['BAIXA', 'MEDIA', 'ALTA', 'CRITICA'];
const PRIORITY_LABELS: Record<string, string> = {
  BAIXA: 'Baixa', MEDIA: 'Média', ALTA: 'Alta', CRITICA: 'Crítica',
};
const STATUS_LABELS: Record<string, string> = {
  ABERTO: 'Aberto', EM_ANDAMENTO: 'Em Andamento', CONCLUIDO: 'Concluído', CANCELADO: 'Cancelado',
};

interface CollabContext {
  eval_collaborator_id: number;
  employee_name: string;
  desired_level: string;
  achieved_level: string;
  gap: number;
  percentage: number;
  training: string;
  unit: string;
  unit_id: number;
  evaluation_id: number;
  training_date: string;
  evaluation_date: string;
}

function NovoPlanoContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const evalId    = searchParams.get('avaliacao');
  const collabId  = searchParams.get('colaborador');  // eval_collaborators.id

  const [collab, setCollab] = useState<CollabContext | null>(null);
  const [loading, setLoading] = useState(!!(evalId && collabId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    what: '',
    why: '',
    how: '',
    responsible: '',
    due_date: '',
    where_field: '',
    resources: '',
    status: 'ABERTO',
    priority: 'ALTA',
    notes: '',
  });

  useEffect(() => {
    if (!evalId || !collabId) return;
    fetch(`/api/avaliacoes/${evalId}`)
      .then(r => r.json())
      .then(d => {
        const ev = d.evaluation;
        const c  = (d.collaborators as { id: number; employee_name: string; desired_level: string; achieved_level: string; gap: number; percentage: number }[])
          .find(x => x.id === Number(collabId));
        if (!c) { setLoading(false); return; }

        const ctx: CollabContext = {
          eval_collaborator_id: c.id,
          employee_name:   c.employee_name,
          desired_level:   c.desired_level,
          achieved_level:  c.achieved_level,
          gap:             c.gap,
          percentage:      c.percentage,
          training:        ev.training,
          unit:            ev.unit,
          unit_id:         ev.unit_id,
          evaluation_id:   ev.id,
          training_date:   ev.training_date,
          evaluation_date: ev.evaluation_date,
        };
        setCollab(ctx);
        setForm(f => ({
          ...f,
          why: `Colaborador ${c.employee_name} não atingiu o nível desejado (${levelLabel(c.desired_level)}) — alcançou ${levelLabel(c.achieved_level)} com ${formatPct(c.percentage)} de acerto. GAP: ${formatPct(c.gap)}.`,
        }));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [evalId, collabId]);

  const field = (key: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => setForm(f => ({ ...f, [key]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.what || !form.how || !form.responsible || !form.due_date) {
      setError('Preencha os campos obrigatórios: O Quê, Como, Responsável e Prazo.');
      return;
    }
    if (!collab && (!evalId)) {
      setError('Plano deve estar vinculado a uma avaliação.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/planos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          evaluation_id:        collab?.evaluation_id ?? Number(evalId) ?? 0,
          eval_collaborator_id: collab?.eval_collaborator_id ?? null,
          employee_name:        collab?.employee_name ?? null,
          training_name:        collab?.training ?? 'Sem treinamento',
          unit_id:              collab?.unit_id ?? null,
          unit_name:            collab?.unit ?? '',
          gap_summary:          collab ? `GAP de ${formatPct(collab.gap)} — nível desejado: ${levelLabel(collab.desired_level)}, alcançado: ${levelLabel(collab.achieved_level)}` : '',
          collaborators_with_gap: collab ? 1 : 0,
          avg_gap:              collab?.gap ?? 0,
          ...form,
        }),
      });
      if (!res.ok) throw new Error('Erro ao salvar');
      router.push('/planos');
    } catch {
      setError('Erro ao salvar o plano. Tente novamente.');
      setSaving(false);
    }
  }

  const inputClass = 'w-full border border-red-100 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-400';
  const labelClass = 'block text-xs font-semibold text-brand-muted uppercase tracking-wide mb-1';

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href={evalId ? `/avaliacoes/${evalId}` : '/planos'} className="text-gray-400 hover:text-gray-600">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h2 className="font-display text-xl font-bold text-brand-800">Novo Plano de Ação</h2>
          <p className="text-sm text-brand-muted">Metodologia 5W2H</p>
        </div>
      </div>

      {loading && (
        <div className="flex justify-center py-6">
          <div className="animate-spin h-6 w-6 border-4 border-brand-500 border-t-transparent rounded-full" />
        </div>
      )}

      {/* Contexto do colaborador */}
      {collab && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 space-y-3">
          <div className="flex items-start gap-3">
            <AlertTriangle size={17} className="text-red-500 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-bold text-red-800">{collab.training}</p>
              <p className="text-xs text-red-600 mt-0.5">{collab.unit}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-white/70 rounded-xl px-4 py-3">
            <User size={16} className="text-brand-500 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-bold text-brand-dark">{collab.employee_name}</p>
              <div className="flex flex-wrap gap-3 mt-1 text-xs">
                <span className="text-gray-500">
                  Nível desejado: <strong className="text-brand-700">{levelLabel(collab.desired_level)}</strong>
                </span>
                <span className="text-gray-500">
                  Alcançado: <strong className="text-red-600">{levelLabel(collab.achieved_level)}</strong>
                </span>
                <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-semibold">
                  GAP {formatPct(collab.gap)}
                </span>
                <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-semibold">
                  Acerto {formatPct(collab.percentage)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={submit} className="space-y-5">
        <div className="bg-white rounded-2xl border border-red-100 p-5 shadow-card space-y-5">
          <h3 className="font-display font-bold text-brand-800 text-sm border-b border-red-50 pb-3">
            Definição da Ação
          </h3>

          <div>
            <label className={labelClass}>O Quê <span className="text-red-500">*</span></label>
            <textarea
              value={form.what} onChange={field('what')} required rows={2}
              placeholder="Descreva a ação que será executada para eliminar o GAP do colaborador..."
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Por Quê</label>
            <textarea
              value={form.why} onChange={field('why')} rows={3}
              placeholder="Justificativa — qual gap esta ação visa corrigir..."
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Como <span className="text-red-500">*</span></label>
            <textarea
              value={form.how} onChange={field('how')} required rows={2}
              placeholder="Descreva como a ação será realizada..."
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Onde</label>
              <input
                value={form.where_field} onChange={field('where_field')} type="text"
                placeholder="Local da ação..."
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Quanto / Recursos</label>
              <input
                value={form.resources} onChange={field('resources')} type="text"
                placeholder="Recursos necessários..."
                className={inputClass}
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-red-100 p-5 shadow-card space-y-5">
          <h3 className="font-display font-bold text-brand-800 text-sm border-b border-red-50 pb-3">
            Responsabilidade e Prazo
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Responsável (Quem) <span className="text-red-500">*</span></label>
              <input
                value={form.responsible} onChange={field('responsible')} required type="text"
                placeholder="Nome do gestor/responsável..."
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Prazo (Quando) <span className="text-red-500">*</span></label>
              <input
                value={form.due_date} onChange={field('due_date')} required type="date"
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Prioridade</label>
              <select value={form.priority} onChange={field('priority')} className={inputClass}>
                {PRIORITY_OPTS.map(p => (
                  <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Status</label>
              <select value={form.status} onChange={field('status')} className={inputClass}>
                {STATUS_OPTS.map(s => (
                  <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className={labelClass}>Observações</label>
            <textarea
              value={form.notes} onChange={field('notes')} rows={2}
              placeholder="Notas adicionais..."
              className={inputClass}
            />
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-3">
          <Link
            href={evalId ? `/avaliacoes/${evalId}` : '/planos'}
            className="px-5 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </Link>
          <button
            type="submit" disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition-colors disabled:opacity-60 shadow-sm"
          >
            <Save size={16} />
            {saving ? 'Salvando...' : 'Salvar Plano'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function NovoPlanoPage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center py-16">
        <div className="animate-spin h-8 w-8 border-4 border-brand-500 border-t-transparent rounded-full" />
      </div>
    }>
      <NovoPlanoContent />
    </Suspense>
  );
}
