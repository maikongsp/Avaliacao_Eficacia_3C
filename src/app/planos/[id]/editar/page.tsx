'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, User, AlertTriangle } from 'lucide-react';

const STATUS_OPTS = ['ABERTO', 'EM_ANDAMENTO', 'CONCLUIDO', 'CANCELADO'];
const PRIORITY_OPTS = ['BAIXA', 'MEDIA', 'ALTA', 'CRITICA'];
const PRIORITY_LABELS: Record<string, string> = {
  BAIXA: 'Baixa', MEDIA: 'Média', ALTA: 'Alta', CRITICA: 'Crítica',
};
const STATUS_LABELS: Record<string, string> = {
  ABERTO: 'Aberto', EM_ANDAMENTO: 'Em Andamento', CONCLUIDO: 'Concluído', CANCELADO: 'Cancelado',
};

interface Plan {
  id: number;
  evaluation_id: number;
  eval_collaborator_id: number | null;
  employee_name: string | null;
  training_name: string;
  unit_name: string;
  what: string;
  why: string | null;
  how: string;
  responsible: string;
  due_date: string;
  where_field: string | null;
  resources: string | null;
  status: string;
  priority: string;
  notes: string | null;
}

export default function EditarPlanoPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    what: '', why: '', how: '',
    responsible: '', due_date: '',
    where_field: '', resources: '',
    status: 'ABERTO', priority: 'ALTA', notes: '',
  });

  useEffect(() => {
    fetch(`/api/planos/${params.id}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then((data: Plan) => {
        setPlan(data);
        setForm({
          what:        data.what        ?? '',
          why:         data.why         ?? '',
          how:         data.how         ?? '',
          responsible: data.responsible ?? '',
          due_date:    data.due_date    ?? '',
          where_field: data.where_field ?? '',
          resources:   data.resources   ?? '',
          status:      data.status      ?? 'ABERTO',
          priority:    data.priority    ?? 'ALTA',
          notes:       data.notes       ?? '',
        });
        setLoading(false);
      })
      .catch(() => { setError('Plano não encontrado.'); setLoading(false); });
  }, [params.id]);

  const field = (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [key]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.what || !form.how || !form.responsible || !form.due_date) {
      setError('Preencha os campos obrigatórios: O Quê, Como, Responsável e Prazo.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/planos/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      router.push('/planos');
    } catch {
      setError('Erro ao salvar. Tente novamente.');
      setSaving(false);
    }
  }

  const inputCls = 'w-full border border-red-100 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-400';
  const labelCls = 'block text-xs font-semibold text-brand-muted uppercase tracking-wide mb-1';

  if (loading) return (
    <div className="flex justify-center py-16">
      <div className="animate-spin h-8 w-8 border-4 border-brand-500 border-t-transparent rounded-full" />
    </div>
  );

  if (!plan) return (
    <div className="text-center py-16">
      <p className="text-gray-500">{error || 'Plano não encontrado.'}</p>
      <Link href="/planos" className="mt-2 inline-block text-brand-600 hover:underline text-sm">← Voltar</Link>
    </div>
  );

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/planos" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h2 className="font-display text-xl font-bold text-brand-800">Editar Plano de Ação</h2>
          <p className="text-sm text-brand-muted">Metodologia 5W2H — #{plan.id}</p>
        </div>
      </div>

      {/* Context (read-only) */}
      <div className="bg-red-50 border border-red-200 rounded-2xl p-4 space-y-2">
        <div className="flex items-start gap-3">
          <AlertTriangle size={17} className="text-red-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-bold text-red-800">{plan.training_name}</p>
            <p className="text-xs text-red-600">{plan.unit_name}</p>
          </div>
        </div>
        {plan.employee_name && (
          <div className="flex items-center gap-2 bg-white/70 rounded-xl px-4 py-2">
            <User size={14} className="text-brand-500 shrink-0" />
            <p className="text-sm font-semibold text-brand-dark">{plan.employee_name}</p>
          </div>
        )}
      </div>

      <form onSubmit={submit} className="space-y-5">
        {/* 5W2H definition */}
        <div className="bg-white rounded-2xl border border-red-100 p-5 shadow-card space-y-5">
          <h3 className="font-display font-bold text-brand-800 text-sm border-b border-red-50 pb-3">
            Definição da Ação
          </h3>

          <div>
            <label className={labelCls}>O Quê <span className="text-red-500">*</span></label>
            <textarea value={form.what} onChange={field('what')} required rows={2} className={inputCls}
              placeholder="Descreva a ação que será executada..." />
          </div>

          <div>
            <label className={labelCls}>Por Quê</label>
            <textarea value={form.why} onChange={field('why')} rows={3} className={inputCls}
              placeholder="Justificativa — qual gap esta ação visa corrigir..." />
          </div>

          <div>
            <label className={labelCls}>Como <span className="text-red-500">*</span></label>
            <textarea value={form.how} onChange={field('how')} required rows={2} className={inputCls}
              placeholder="Descreva como a ação será realizada..." />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Onde</label>
              <input value={form.where_field} onChange={field('where_field')} type="text" className={inputCls}
                placeholder="Local da ação..." />
            </div>
            <div>
              <label className={labelCls}>Quanto / Recursos</label>
              <input value={form.resources} onChange={field('resources')} type="text" className={inputCls}
                placeholder="Recursos necessários..." />
            </div>
          </div>
        </div>

        {/* Responsibility, deadline, status */}
        <div className="bg-white rounded-2xl border border-red-100 p-5 shadow-card space-y-5">
          <h3 className="font-display font-bold text-brand-800 text-sm border-b border-red-50 pb-3">
            Responsabilidade, Prazo e Status
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Responsável (Quem) <span className="text-red-500">*</span></label>
              <input value={form.responsible} onChange={field('responsible')} required type="text" className={inputCls}
                placeholder="Nome do gestor/responsável..." />
            </div>
            <div>
              <label className={labelCls}>Prazo (Quando) <span className="text-red-500">*</span></label>
              <input value={form.due_date} onChange={field('due_date')} required type="date" className={inputCls} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Prioridade</label>
              <select value={form.priority} onChange={field('priority')} className={inputCls}>
                {PRIORITY_OPTS.map(p => <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Status</label>
              <select value={form.status} onChange={field('status')} className={inputCls}>
                {STATUS_OPTS.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className={labelCls}>Observações</label>
            <textarea value={form.notes} onChange={field('notes')} rows={2} className={inputCls}
              placeholder="Notas adicionais..." />
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2">{error}</p>
        )}

        <div className="flex justify-end gap-3">
          <Link href="/planos"
            className="px-5 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
            Cancelar
          </Link>
          <button type="submit" disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition-colors disabled:opacity-60 shadow-sm">
            <Save size={16} />
            {saving ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </div>
      </form>
    </div>
  );
}
