'use client';
import { useEffect, useState, useCallback, Suspense } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Search, ChevronDown, AlertCircle, Clock, CheckCircle2, XCircle, Filter, User, Lock } from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface Plan {
  id: number;
  evaluation_id: number;
  eval_collaborator_id: number | null;
  employee_name: string | null;
  training_name: string;
  unit_name: string;
  collaborators_with_gap: number;
  avg_gap: number;
  what: string;
  responsible: string;
  due_date: string;
  status: string;
  priority: string;
  created_at: string;
}

const STATUS_LABEL: Record<string, string> = {
  ABERTO: 'Aberto', EM_ANDAMENTO: 'Em Andamento', CONCLUIDO: 'Concluído', CANCELADO: 'Cancelado',
};
const STATUS_STYLE: Record<string, string> = {
  ABERTO:      'bg-blue-50 text-blue-700 border-blue-200',
  EM_ANDAMENTO:'bg-yellow-50 text-yellow-700 border-yellow-200',
  CONCLUIDO:   'bg-green-50 text-green-700 border-green-200',
  CANCELADO:   'bg-gray-100 text-gray-500 border-gray-200',
};
const STATUS_ICON: Record<string, React.ReactNode> = {
  ABERTO:      <AlertCircle size={12} />,
  EM_ANDAMENTO:<Clock size={12} />,
  CONCLUIDO:   <CheckCircle2 size={12} />,
  CANCELADO:   <XCircle size={12} />,
};

const PRIORITY_STYLE: Record<string, string> = {
  BAIXA:  'bg-gray-100 text-gray-600',
  MEDIA:  'bg-blue-50 text-blue-700',
  ALTA:   'bg-orange-50 text-orange-700',
  CRITICA:'bg-red-100 text-brand-700',
};
const PRIORITY_LABEL: Record<string, string> = {
  BAIXA: 'Baixa', MEDIA: 'Média', ALTA: 'Alta', CRITICA: 'Crítica',
};

const STATUS_NEXT: Record<string, string> = {
  ABERTO: 'EM_ANDAMENTO', EM_ANDAMENTO: 'CONCLUIDO',
};

function KpiCard({ value, label, icon: Icon, color }: { value: number; label: string; icon: React.ElementType; color: string }) {
  return (
    <div className={`bg-white rounded-2xl border p-4 shadow-card flex items-center gap-3 ${color}`}>
      <Icon size={20} />
      <div>
        <p className="text-2xl font-bold text-brand-dark">{value}</p>
        <p className="text-[11px] text-brand-muted font-medium uppercase tracking-wide">{label}</p>
      </div>
    </div>
  );
}

function PlanosContent() {
  const searchParams = useSearchParams();
  const initCollabId = searchParams.get('eval_collaborator_id') ?? '';

  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<number | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ id: number; error: string } | null>(null);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleting, setDeleting] = useState(false);

  const [filters, setFilters] = useState({ search: '', unit: '', responsible: '', status: '', collabId: initCollabId });
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.unit) params.set('unit', filters.unit);
    if (filters.responsible) params.set('responsible', filters.responsible);
    if (filters.status) params.set('status', filters.status);
    if (filters.collabId) params.set('eval_collaborator_id', filters.collabId);
    fetch(`/api/planos?${params}`)
      .then(r => r.json())
      .then(d => { setPlans(d); setLoading(false); });
  }, [filters.unit, filters.responsible, filters.status, filters.collabId]);

  useEffect(() => { load(); }, [load]);

  const filtered = plans.filter(p =>
    !filters.search ||
    p.training_name.toLowerCase().includes(filters.search.toLowerCase()) ||
    p.unit_name.toLowerCase().includes(filters.search.toLowerCase()) ||
    p.responsible.toLowerCase().includes(filters.search.toLowerCase()) ||
    p.what.toLowerCase().includes(filters.search.toLowerCase()) ||
    (p.employee_name ?? '').toLowerCase().includes(filters.search.toLowerCase())
  );

  // KPIs
  const kpis = {
    total:       plans.length,
    aberto:      plans.filter(p => p.status === 'ABERTO').length,
    andamento:   plans.filter(p => p.status === 'EM_ANDAMENTO').length,
    concluido:   plans.filter(p => p.status === 'CONCLUIDO').length,
  };

  // Unique units + responsibles for filter dropdowns
  const units   = Array.from(new Set(plans.map(p => p.unit_name))).sort();
  const resps   = Array.from(new Set(plans.map(p => p.responsible))).sort();

  async function advanceStatus(plan: Plan) {
    const next = STATUS_NEXT[plan.status];
    if (!next) return;
    setUpdating(plan.id);
    await fetch(`/api/planos/${plan.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next }),
    });
    load();
    setUpdating(null);
  }

  async function confirmDelete() {
    if (!deleteModal || !deletePassword) return;
    setDeleting(true);
    const res = await fetch(`/api/planos/${deleteModal.id}`, {
      method: 'DELETE',
      headers: { 'x-admin-password': deletePassword },
    });
    if (!res.ok) {
      const data = await res.json();
      setDeleteModal({ ...deleteModal, error: data.error || 'Senha incorreta' });
      setDeleting(false);
      return;
    }
    setDeleteModal(null);
    setDeletePassword('');
    setDeleting(false);
    load();
  }

  const sel = 'w-full border border-red-100 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-300';

  const isOverdue = (p: Plan) =>
    p.status !== 'CONCLUIDO' && p.status !== 'CANCELADO' && new Date(p.due_date) < new Date();

  return (
    <div className="space-y-6">
      {/* Delete password modal — rendered via portal to escape overflow/stacking context */}
      {mounted && deleteModal && createPortal(
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center shrink-0">
                <Lock size={18} className="text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Excluir Plano de Ação</h3>
                <p className="text-sm text-gray-500 mt-1">Esta ação não pode ser desfeita. Digite a senha de administrador para confirmar.</p>
              </div>
            </div>
            <input
              type="password"
              value={deletePassword}
              onChange={e => setDeletePassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && confirmDelete()}
              placeholder="Senha de administrador"
              autoFocus
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
            />
            {deleteModal.error && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-1.5">{deleteModal.error}</p>
            )}
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => { setDeleteModal(null); setDeletePassword(''); }}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting || !deletePassword}
                className="px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-xl hover:bg-red-700 disabled:opacity-60 transition-colors"
              >
                {deleting ? 'Excluindo...' : 'Confirmar Exclusão'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold text-brand-800">Planos de Ação</h2>
          <p className="text-sm text-brand-muted mt-0.5">Gestão de ações corretivas por gap de treinamento</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard value={kpis.total}    label="Total"        icon={Filter}       color="border-red-100 text-brand-600" />
        <KpiCard value={kpis.aberto}   label="Em Aberto"    icon={AlertCircle}  color="border-blue-100 text-blue-600" />
        <KpiCard value={kpis.andamento} label="Em Andamento" icon={Clock}        color="border-yellow-100 text-yellow-600" />
        <KpiCard value={kpis.concluido} label="Concluídos"   icon={CheckCircle2} color="border-green-100 text-green-700" />
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-2xl border border-red-100 p-4 shadow-card">
        <p className="text-xs font-semibold text-brand-muted uppercase tracking-wide mb-3 flex items-center gap-1.5">
          <Filter size={13} /> Filtros
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Busca livre */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-400" />
            <input
              value={filters.search}
              onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
              placeholder="Buscar..."
              className="w-full border border-red-100 rounded-xl pl-8 pr-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-300"
            />
          </div>

          {/* Unidade */}
          <div className="relative">
            <select
              value={filters.unit}
              onChange={e => setFilters(f => ({ ...f, unit: e.target.value }))}
              className={sel}
            >
              <option value="">Todas as unidades</option>
              {units.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>

          {/* Responsável */}
          <div className="relative">
            <select
              value={filters.responsible}
              onChange={e => setFilters(f => ({ ...f, responsible: e.target.value }))}
              className={sel}
            >
              <option value="">Todos os responsáveis</option>
              {resps.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>

          {/* Status */}
          <div className="relative">
            <select
              value={filters.status}
              onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
              className={sel}
            >
              <option value="">Todos os status</option>
              <option value="ABERTO">Aberto</option>
              <option value="EM_ANDAMENTO">Em Andamento</option>
              <option value="CONCLUIDO">Concluído</option>
              <option value="CANCELADO">Cancelado</option>
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Lista */}
      <div className="bg-white rounded-2xl border border-red-100 overflow-hidden shadow-card">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin h-8 w-8 border-4 border-brand-500 border-t-transparent rounded-full" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <p className="text-gray-400">Nenhum plano de ação encontrado.</p>
            <Link href="/avaliacoes" className="inline-block text-sm text-brand-600 hover:underline">
              Criar a partir de uma avaliação com GAP
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead className="bg-brand-50 border-b border-red-100">
                <tr>
                  {['Colaborador / Treinamento', 'Unidade', 'Responsável', 'Prazo', 'Prioridade', 'Status', ''].map(h => (
                    <th key={h} className="text-left text-brand-muted font-semibold text-[11px] uppercase tracking-wide px-4 py-3 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(plan => {
                  const overdue = isOverdue(plan);
                  const nextStatus = STATUS_NEXT[plan.status];
                  return (
                    <tr key={plan.id} className="border-b border-red-50 hover:bg-brand-50/40 transition-colors">
                      <td className="px-4 py-3 max-w-xs">
                        {plan.employee_name && (
                          <div className="flex items-center gap-1.5 mb-1">
                            <User size={11} className="text-brand-500 shrink-0" />
                            <p className="text-xs font-semibold text-brand-700">{plan.employee_name}</p>
                          </div>
                        )}
                        <p className="font-semibold text-brand-dark truncate text-sm" title={plan.training_name}>
                          {plan.training_name}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5 truncate" title={plan.what}>
                          {plan.what}
                        </p>
                        <Link
                          href={`/avaliacoes/${plan.evaluation_id}`}
                          className="text-[10px] text-brand-600 hover:underline mt-0.5 inline-block"
                        >
                          Ver avaliação →
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{plan.unit_name}</td>
                      <td className="px-4 py-3 font-medium text-gray-700 whitespace-nowrap">{plan.responsible}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={overdue ? 'text-red-600 font-semibold' : 'text-gray-600'}>
                          {formatDate(plan.due_date)}
                        </span>
                        {overdue && (
                          <span className="ml-1 text-[10px] text-red-500 font-medium">VENCIDO</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${PRIORITY_STYLE[plan.priority] ?? 'bg-gray-100 text-gray-600'}`}>
                          {PRIORITY_LABEL[plan.priority]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${STATUS_STYLE[plan.status] ?? 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                          {STATUS_ICON[plan.status]}
                          {STATUS_LABEL[plan.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 justify-end">
                          {nextStatus && (
                            <button
                              onClick={() => advanceStatus(plan)}
                              disabled={updating === plan.id}
                              className="text-[11px] font-semibold text-brand-600 hover:text-brand-800 border border-brand-200 rounded-lg px-2.5 py-1 hover:bg-brand-50 transition-colors disabled:opacity-50 whitespace-nowrap"
                            >
                              {updating === plan.id ? '...' : STATUS_LABEL[nextStatus]}
                            </button>
                          )}
                          <Link
                            href={`/planos/${plan.id}/editar`}
                            className="text-[11px] text-gray-400 hover:text-gray-600 border border-gray-200 rounded-lg px-2.5 py-1 hover:bg-gray-50 transition-colors"
                          >
                            Editar
                          </Link>
                          <button
                            onClick={() => { setDeleteModal({ id: plan.id, error: '' }); setDeletePassword(''); }}
                            className="text-[11px] text-red-400 hover:text-red-600 border border-red-100 rounded-lg px-2.5 py-1 hover:bg-red-50 transition-colors"
                          >
                            Excluir
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PlanosPage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center py-16">
        <div className="animate-spin h-8 w-8 border-4 border-brand-500 border-t-transparent rounded-full" />
      </div>
    }>
      <PlanosContent />
    </Suspense>
  );
}
