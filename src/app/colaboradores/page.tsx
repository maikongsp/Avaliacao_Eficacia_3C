'use client';
import { useEffect, useState, useCallback } from 'react';
import { Search, Filter, ChevronDown, CheckCircle2, XCircle, AlertCircle, Target } from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface Employee {
  id: number;
  name: string;
  registration: string;
  position: string;
  section: string;
  unit_name: string;
  unit_id: number;
  admission_date: string;
  employment_type: string;
  eval_count: number;
  last_eval_date: string | null;
  has_gap: number;
  plan_count: number;
}

interface Unit { id: number; name: string; }

const sel = 'w-full border border-red-100 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-300 appearance-none';

export default function ColaboradoresPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState({
    search:      '',
    unit_id:     '',
    eval_status: '',   // '' | 'avaliado' | 'pendente'
    plano:       '',   // '' | 'com_plano' | 'sem_plano'
    gap:         '',   // '' | 'com_gap'  | 'sem_gap'
  });

  // Load unit list once
  useEffect(() => {
    fetch('/api/unidades').then(r => r.json()).then(setUnits).catch(() => {});
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    const p = new URLSearchParams();
    if (filters.search)      p.set('q', filters.search);
    if (filters.unit_id)     p.set('unit_id', filters.unit_id);
    if (filters.eval_status) p.set('eval_status', filters.eval_status);
    if (filters.plano)       p.set('plano', filters.plano);
    if (filters.gap)         p.set('gap', filters.gap);
    fetch(`/api/colaboradores?${p}`)
      .then(r => r.json())
      .then(d => { setEmployees(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [filters]);

  // Debounce search, immediate for selects
  useEffect(() => {
    const t = setTimeout(load, filters.search ? 400 : 0);
    return () => clearTimeout(t);
  }, [load, filters.search]);

  function setF(key: keyof typeof filters, val: string) {
    setFilters(f => ({ ...f, [key]: val }));
  }

  const hasActiveFilter = Object.values(filters).some(Boolean);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold text-brand-800">Colaboradores</h2>
          <p className="text-sm text-brand-muted mt-0.5">
            {loading ? 'Carregando...' : `${employees.length} colaborador(es) encontrado(s)`}
          </p>
        </div>
        {hasActiveFilter && (
          <button
            onClick={() => setFilters({ search: '', unit_id: '', eval_status: '', plano: '', gap: '' })}
            className="text-xs text-brand-600 border border-brand-200 rounded-xl px-3 py-2 hover:bg-brand-50 font-medium transition-colors shrink-0"
          >
            Limpar filtros
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-red-100 p-4 shadow-card">
        <p className="text-xs font-semibold text-brand-muted uppercase tracking-wide mb-3 flex items-center gap-1.5">
          <Filter size={13} /> Filtros
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">

          {/* Busca */}
          <div className="relative lg:col-span-2">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-400" />
            <input
              value={filters.search}
              onChange={e => setF('search', e.target.value)}
              placeholder="Buscar por nome ou matrícula..."
              className="w-full border border-red-100 rounded-xl pl-8 pr-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-300"
            />
          </div>

          {/* Unidade */}
          <div className="relative">
            <select value={filters.unit_id} onChange={e => setF('unit_id', e.target.value)} className={sel}>
              <option value="">Todas as unidades</option>
              {units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>

          {/* Avaliação */}
          <div className="relative">
            <select value={filters.eval_status} onChange={e => setF('eval_status', e.target.value)} className={sel}>
              <option value="">Todas as avaliações</option>
              <option value="avaliado">Com avaliação</option>
              <option value="pendente">Sem avaliação</option>
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>

          {/* GAP */}
          <div className="relative">
            <select value={filters.gap} onChange={e => setF('gap', e.target.value)} className={sel}>
              <option value="">Todos os GAPs</option>
              <option value="com_gap">Com GAP</option>
              <option value="sem_gap">Sem GAP</option>
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>

          {/* Plano de ação */}
          <div className="relative lg:col-start-4">
            <select value={filters.plano} onChange={e => setF('plano', e.target.value)} className={sel}>
              <option value="">Todos os planos</option>
              <option value="com_plano">Com plano de ação</option>
              <option value="sem_plano">Sem plano de ação</option>
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>

        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-red-100 overflow-hidden shadow-card">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin h-8 w-8 border-4 border-brand-500 border-t-transparent rounded-full" />
          </div>
        ) : employees.length === 0 ? (
          <div className="py-16 text-center text-gray-400">Nenhum colaborador encontrado.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[820px]">
              <thead className="bg-brand-50 border-b border-red-100">
                <tr>
                  {['Nome', 'Matrícula', 'Cargo / Seção', 'Unidade', 'Avaliações', 'Último GAP', 'Planos', 'Admissão'].map(h => (
                    <th key={h} className="text-left text-brand-muted font-semibold text-[11px] uppercase tracking-wide px-4 py-3 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {employees.map(e => (
                  <tr key={e.id} className="border-b border-red-50 hover:bg-brand-50/40 transition-colors">

                    <td className="px-4 py-3">
                      <p className="font-semibold text-brand-dark">{e.name}</p>
                      {e.employment_type && (
                        <p className="text-[11px] text-gray-400 mt-0.5">{e.employment_type}</p>
                      )}
                    </td>

                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{e.registration || '—'}</td>

                    <td className="px-4 py-3">
                      <p className="text-gray-700">{e.position || '—'}</p>
                      {e.section && <p className="text-[11px] text-gray-400 mt-0.5">{e.section}</p>}
                    </td>

                    <td className="px-4 py-3">
                      <span className="bg-brand-50 text-brand-700 text-xs px-2 py-0.5 rounded-full border border-brand-100">
                        {e.unit_name || '—'}
                      </span>
                    </td>

                    {/* Avaliações */}
                    <td className="px-4 py-3">
                      {e.eval_count > 0 ? (
                        <div>
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                            <CheckCircle2 size={11} />
                            {e.eval_count} avaliação{e.eval_count !== 1 ? 'ões' : ''}
                          </span>
                          {e.last_eval_date && (
                            <p className="text-[10px] text-gray-400 mt-0.5">{formatDate(e.last_eval_date)}</p>
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-400 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded-full">
                          <XCircle size={11} />
                          Pendente
                        </span>
                      )}
                    </td>

                    {/* GAP */}
                    <td className="px-4 py-3">
                      {e.eval_count === 0 ? (
                        <span className="text-gray-300 text-xs">—</span>
                      ) : e.has_gap ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                          <AlertCircle size={11} />
                          Com GAP
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                          <CheckCircle2 size={11} />
                          Sem GAP
                        </span>
                      )}
                    </td>

                    {/* Planos */}
                    <td className="px-4 py-3">
                      {e.plan_count > 0 ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-700 bg-brand-50 border border-brand-200 px-2 py-0.5 rounded-full">
                          <Target size={11} />
                          {e.plan_count} plano{e.plan_count !== 1 ? 's' : ''}
                        </span>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>

                    <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                      {formatDate(e.admission_date)}
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
