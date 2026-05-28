'use client';
import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, AlertTriangle, Save } from 'lucide-react';
import { formatPct } from '@/lib/utils';

const STATUS_OPTS = ['ABERTO', 'EM_ANDAMENTO', 'CONCLUIDO', 'CANCELADO'];
const PRIORITY_OPTS = ['BAIXA', 'MEDIA', 'ALTA', 'CRITICA'];
const PRIORITY_LABELS: Record<string, string> = {
  BAIXA: 'Baixa', MEDIA: 'Média', ALTA: 'Alta', CRITICA: 'Crítica',
};
const STATUS_LABELS: Record<string, string> = {
  ABERTO: 'Aberto', EM_ANDAMENTO: 'Em Andamento', CONCLUIDO: 'Concluído', CANCELADO: 'Cancelado',
};

interface EvalSummary {
  id: number;
  training: string;
  unit: string;
  unit_id: number;
  evaluation_date: string;
  collaborators_with_gap: number;
  total: number;
  avg_gap: number;
  gap_names: string;
}

function NovoPlanoContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const evalId = searchParams.get('avaliacao');

  const [evalData, setEvalData] = useState<EvalSummary | null>(null);
  const [loading, setLoading] = useState(!!evalId);
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
    priority: 'MEDIA',
    notes: '',
  });

  useEffect(() => {
    if (!evalId) return;
    fetch(`/api/avaliacoes/${evalId}`)
      .then(r => r.json())
      .then(d => {
        const ev = d.evaluation;
        const collabs: { gap: number; employee_name: string }[] = d.collaborators;
        const withGap = collabs.filter(c => c.gap > 0);
        const avgGap = withGap.length > 0
          ? withGap.reduce((s, c) => s + c.gap, 0) / withGap.length
          : 0;

        setEvalData({
          id: ev.id,
          training: ev.training,
          unit: ev.unit,
          unit_id: 0,
          evaluation_date: ev.evaluation_date,
          collaborators_with_gap: withGap.length,
          total: collabs.length,
          avg_gap: avgGap,
          gap_names: withGap.map(c => c.employee_name).join(', '),
        });

        setForm(f => ({
          ...f,
          why: `GAP identificado em ${withGap.length} colaborador(es): ${withGap.map(c => c.employee_name).join(', ')}. GAP médio: ${formatPct(avgGap)}.`,
        }));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [evalId]);

  const field = (key: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => setForm(f => ({ ...f, [key]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.what || !form.how || !form.responsible || !form.due_date) {
      setError('Preencha os campos obrigatórios: O Quê, Como, Responsável e Prazo.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/planos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          evaluation_id: evalId ? Number(evalId) : 0,
          training_name: evalData?.training ?? 'Sem avaliação',
          unit_name: evalData?.unit ?? '',
          gap_summary: evalData ? `${evalData.collaborators_with_gap} colaborador(es) com GAP` : '',
          collaborators_with_gap: evalData?.collaborators_with_gap ?? 0,
          avg_gap: evalData?.avg_gap ?? 0,
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
        <Link href="/planos" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h2 className="font-display text-xl font-bold text-brand-800">Novo Plano de Ação</h2>
          <p className="text-sm text-brand-muted">Metodologia 5W2H</p>
        </div>
      </div>

      {/* Contexto da avaliação */}
      {loading && (
        <div className="flex justify-center py-6">
          <div className="animate-spin h-6 w-6 border-4 border-brand-500 border-t-transparent rounded-full" />
        </div>
      )}

      {evalData && (
        <div className="bg-brand-50 border border-brand-100 rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle size={18} className="text-brand-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-brand-800">{evalData.training}</p>
              <p className="text-xs text-brand-muted mt-0.5">{evalData.unit}</p>
              <div className="mt-2 flex flex-wrap gap-3 text-xs">
                <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
                  {evalData.collaborators_with_gap} colaborador(es) com GAP
                </span>
                <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">
                  GAP médio: {formatPct(evalData.avg_gap)}
                </span>
              </div>
              {evalData.gap_names && (
                <p className="text-xs text-brand-muted mt-1.5">
                  <span className="font-medium">Com gap:</span> {evalData.gap_names}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <form onSubmit={submit} className="space-y-5">
        <div className="bg-white rounded-2xl border border-red-100 p-5 shadow-card space-y-5">
          <h3 className="font-display font-bold text-brand-800 text-sm border-b border-red-50 pb-3">
            Definição da Ação
          </h3>

          {/* O Quê */}
          <div>
            <label className={labelClass}>O Quê <span className="text-red-500">*</span></label>
            <textarea
              value={form.what} onChange={field('what')} required rows={2}
              placeholder="Descreva a ação que será executada para eliminar o GAP..."
              className={inputClass}
            />
          </div>

          {/* Por Quê */}
          <div>
            <label className={labelClass}>Por Quê</label>
            <textarea
              value={form.why} onChange={field('why')} rows={2}
              placeholder="Justificativa — qual gap esta ação visa corrigir..."
              className={inputClass}
            />
          </div>

          {/* Como */}
          <div>
            <label className={labelClass}>Como <span className="text-red-500">*</span></label>
            <textarea
              value={form.how} onChange={field('how')} required rows={2}
              placeholder="Descreva como a ação será realizada (metodologia, treinamento, etc.)..."
              className={inputClass}
            />
          </div>

          {/* Onde + Recursos */}
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
            {/* Quem */}
            <div>
              <label className={labelClass}>Responsável (Quem) <span className="text-red-500">*</span></label>
              <input
                value={form.responsible} onChange={field('responsible')} required type="text"
                placeholder="Nome do gestor/responsável..."
                className={inputClass}
              />
            </div>
            {/* Quando */}
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

          {/* Observações */}
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
            href="/planos"
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
