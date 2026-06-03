'use client';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import { ClipboardList, Users, TrendingUp, AlertCircle, Plus, ArrowRight, Filter, X, ChevronDown } from 'lucide-react';
import { formatDate, formatPct } from '@/lib/utils';
import { levelLabel } from '@/lib/ranges';
import { cn } from '@/lib/utils';

const LEVEL_COLORS: Record<string, string> = {
  REATIVO:         '#AA272F',
  DEPENDENTE:      '#FDC82F',
  INDEPENDENTE:    '#427730',
  INTERDEPENDENTE: '#2D5E1E',
};

const LEVEL_LEGEND = [
  { emoji: '🔴', key: 'REATIVO',         label: 'Nível 1 — Reativo',         range: '0% de acertos',          color: 'border-red-200 bg-red-50',    text: 'text-red-800',    desc: 'O colaborador não demonstra a execução segura das etapas do procedimento padrão ou das diretrizes de segurança da tarefa. Necessita de supervisão constante e instruções detalhadas para qualquer execução.' },
  { emoji: '🟡', key: 'DEPENDENTE',      label: 'Nível 2 — Dependente',      range: 'Entre 17 e 40% de acerto', color: 'border-yellow-200 bg-yellow-50', text: 'text-yellow-800', desc: 'O colaborador apresenta desempenho parcial, executando apenas partes do processo com desvios técnicos ou de segurança. Precisa de suporte e supervisão para executar com confiança e precisão.' },
  { emoji: '🟢', key: 'INDEPENDENTE',    label: 'Nível 3 — Independente',    range: 'Entre 53 e 80% de acerto', color: 'border-green-200 bg-green-50',  text: 'text-green-800',  desc: 'O colaborador possui autonomia operacional, sendo capaz de executar o procedimento nos padrões de qualidade e tempo esperados.' },
  { emoji: '🔵', key: 'INTERDEPENDENTE', label: 'Nível 4 — Interdependente', range: '100% de acertos',          color: 'border-blue-200 bg-blue-50',   text: 'text-blue-800',   desc: 'O colaborador demonstra excelência técnica e domínio perfeito do padrão, além de uma visão sistêmica do impacto do seu trabalho no processo. Deve ser avaliado como um possível multiplicador para orientar a equipe.' },
];

interface DashboardData {
  totalEvals: number;
  totalCollabs: number;
  metLevel: number;
  metPct: number;
  avgPct: number;
  avgGap: number;
  byCategory: { category: string; total: number; met: number; avg_pct: number }[];
  byLevel: { level: string; count: number }[];
  byUnit: { unit: string; total: number; avg_pct: number; met: number }[];
  recent: {
    id: number; evaluator_email: string; evaluation_date: string;
    training: string; unit: string; collaborators: number; avg_pct: number; met: number;
  }[];
}

interface Training { id: number; name: string; category: string; }
interface Unit     { id: number; name: string; }

function StatCard({ icon: Icon, label, value, sub, color = 'red' }: {
  icon: React.ElementType; label: string; value: string | number; sub?: string; color?: string;
}) {
  const colors: Record<string, { bg: string; icon: string; border: string }> = {
    red:    { bg: 'bg-brand-50',  icon: 'text-brand-600', border: 'border-brand-100' },
    green:  { bg: 'bg-green-50',  icon: 'text-green-700', border: 'border-green-100' },
    yellow: { bg: 'bg-yellow-50', icon: 'text-yellow-600', border: 'border-yellow-100' },
    coffee: { bg: 'bg-orange-50', icon: 'text-brand-coffee', border: 'border-orange-100' },
  };
  const c = colors[color] ?? colors.red;
  return (
    <div className={`bg-white rounded-2xl border ${c.border} p-5 flex items-start gap-4 shadow-card hover:shadow-card-hover transition-shadow`}>
      <div className={`p-2.5 rounded-xl ${c.bg} ${c.icon} shrink-0`}><Icon size={20} /></div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold text-brand-dark mt-0.5">{value}</p>
        {sub && <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

const sel = 'w-full border border-red-100 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-300 appearance-none';

export default function DashboardPage() {
  const [data, setData]         = useState<DashboardData | null>(null);
  const [loading, setLoading]   = useState(true);
  const [units, setUnits]       = useState<Unit[]>([]);
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [unitId, setUnitId]     = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [trainingId, setTrainingId] = useState('');

  useEffect(() => {
    fetch('/api/unidades').then(r => r.json()).then(setUnits).catch(() => {});
    fetch('/api/treinamentos').then(r => r.json()).then(setTrainings).catch(() => {});
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    const p = new URLSearchParams();
    if (unitId)     p.set('unit_id',     unitId);
    if (trainingId) p.set('training_id', trainingId);
    fetch(`/api/dashboard?${p}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [unitId, trainingId]);

  useEffect(() => { load(); }, [load]);

  const categories      = Array.from(new Set(trainings.map(t => t.category))).sort();
  const filteredTrainings = catFilter ? trainings.filter(t => t.category === catFilter) : trainings;

  function handleCatChange(cat: string) {
    setCatFilter(cat);
    if (cat && !trainings.filter(t => t.category === cat).find(t => String(t.id) === trainingId)) {
      setTrainingId('');
    }
  }

  const hasFilter = unitId || catFilter || trainingId;
  function clearFilters() { setUnitId(''); setCatFilter(''); setTrainingId(''); }

  if (loading && !data) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin h-8 w-8 border-4 border-brand-500 border-t-transparent rounded-full" />
    </div>
  );

  const pieData = (data?.byLevel ?? []).map(l => ({
    name: levelLabel(l.level),
    value: l.count,
    color: LEVEL_COLORS[l.level] ?? '#94a3b8',
  }));

  const catData = (data?.byCategory ?? []).map(c => ({
    name: c.category.replace('Técnico da Função - ', 'T.F. '),
    pct: Math.round((c.avg_pct ?? 0) * 100),
    met: c.met,
    total: c.total,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold text-brand-800">Matriz de Habilidades</h2>
          <p className="text-sm text-brand-muted mt-0.5">Visão geral das avaliações de treinamento</p>
        </div>
        <Link
          href="/avaliacoes/nova"
          className="flex items-center gap-2 bg-brand-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-brand-700 transition-colors shadow-sm hover:shadow-md"
        >
          <Plus size={16} /> Nova Avaliação
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-red-100 p-4 shadow-card">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-brand-muted uppercase tracking-wide flex items-center gap-1.5">
            <Filter size={12} /> Filtrar dados
          </p>
          {hasFilter && (
            <button onClick={clearFilters} className="text-xs text-brand-600 hover:text-brand-800 flex items-center gap-1 font-medium">
              <X size={12} /> Limpar filtros
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Unidade */}
          <div className="relative">
            <select value={unitId} onChange={e => setUnitId(e.target.value)} className={sel}>
              <option value="">Todas as unidades</option>
              {units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
          {/* Categoria */}
          <div className="relative">
            <select value={catFilter} onChange={e => handleCatChange(e.target.value)} className={sel}>
              <option value="">Todas as categorias</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
          {/* Treinamento */}
          <div className="relative">
            <select value={trainingId} onChange={e => setTrainingId(e.target.value)} className={sel}>
              <option value="">Todos os treinamentos</option>
              {filteredTrainings.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Level legend */}
      <div className="bg-white rounded-2xl border border-red-100 p-5 shadow-card">
        <h3 className="font-display text-sm font-bold text-brand-800 mb-3">Legenda dos Níveis de Habilidade</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {LEVEL_LEGEND.map(l => (
            <div key={l.key} className={cn('border rounded-xl p-3 space-y-1', l.color)}>
              <p className={cn('text-xs font-bold', l.text)}>{l.emoji} {l.label}</p>
              <p className="text-[11px] font-semibold text-gray-500">{l.range}</p>
              <p className="text-[11px] text-gray-600 leading-relaxed">{l.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        <StatCard icon={ClipboardList} label="Total de Avaliações"      value={data?.totalEvals ?? 0}  color="red" />
        <StatCard icon={Users}         label="Colaboradores Avaliados"  value={data?.totalCollabs ?? 0} color="coffee" />
        <StatCard
          icon={TrendingUp} label="Atingiram Nível Desejado"
          value={`${data?.metLevel ?? 0} (${formatPct(data?.metPct ?? 0)})`}
          color="green"
          sub={`Média de acerto: ${formatPct(data?.avgPct ?? 0)}`}
        />
        <StatCard
          icon={AlertCircle} label="GAP Médio"
          value={formatPct(data?.avgGap ?? 0)}
          color={(data?.avgGap ?? 0) > 0.3 ? 'red' : 'yellow'}
          sub="Distância ao nível desejado"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="bg-white rounded-2xl border border-red-100 p-5 shadow-card">
          <h3 className="font-display text-sm font-bold text-brand-800 mb-4">% Acerto por Categoria</h3>
          {catData.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Sem dados ainda</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={catData} layout="vertical" margin={{ left: 20, right: 20 }}>
                <XAxis type="number" domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: number) => `${v}%`} />
                <Bar dataKey="pct" fill="#AA272F" radius={[0, 4, 4, 0]} name="% Acerto" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-red-100 p-5 shadow-card">
          <h3 className="font-display text-sm font-bold text-brand-800 mb-4">Distribuição de Níveis Alcançados</h3>
          {pieData.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Sem dados ainda</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* By Unit */}
      {(data?.byUnit ?? []).length > 0 && (
        <div className="bg-white rounded-2xl border border-red-100 p-4 sm:p-5 shadow-card">
          <h3 className="font-display text-sm font-bold text-brand-800 mb-4">Desempenho por Unidade</h3>
          <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-100">
                  <th className="pb-2 pr-4 font-medium">Unidade</th>
                  <th className="pb-2 pr-4 font-medium text-center">Avaliações</th>
                  <th className="pb-2 pr-4 font-medium text-center">Atingiram nível</th>
                  <th className="pb-2 font-medium text-center">% Acerto médio</th>
                </tr>
              </thead>
              <tbody>
                {(data?.byUnit ?? []).map(u => (
                  <tr key={u.unit} className="border-b border-gray-50">
                    <td className="py-2 pr-4 font-medium text-gray-800">{u.unit}</td>
                    <td className="py-2 pr-4 text-center text-gray-600">{u.total}</td>
                    <td className="py-2 pr-4 text-center text-gray-600">{u.met}/{u.total}</td>
                    <td className="py-2 text-center">
                      <span className={`font-semibold ${u.avg_pct >= 0.7 ? 'text-green-600' : u.avg_pct >= 0.5 ? 'text-brand-500' : 'text-red-500'}`}>
                        {formatPct(u.avg_pct)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent evaluations */}
      <div className="bg-white rounded-2xl border border-red-100 p-4 sm:p-5 shadow-card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-sm font-bold text-brand-800">Avaliações Recentes</h3>
          <Link href="/avaliacoes" className="text-xs text-brand-600 hover:text-brand-700 flex items-center gap-1 font-medium">
            Ver todas <ArrowRight size={12} />
          </Link>
        </div>
        {(data?.recent ?? []).length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">Nenhuma avaliação registrada ainda.</p>
        ) : (
          <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-100">
                  <th className="pb-2 pr-4 font-medium">Treinamento</th>
                  <th className="pb-2 pr-4 font-medium">Unidade</th>
                  <th className="pb-2 pr-4 font-medium">Data</th>
                  <th className="pb-2 pr-4 font-medium text-center">Colaboradores</th>
                  <th className="pb-2 font-medium text-center">% Acerto</th>
                </tr>
              </thead>
              <tbody>
                {(data?.recent ?? []).map(r => (
                  <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-2 pr-4">
                      <Link href={`/avaliacoes/${r.id}`} className="text-brand-700 hover:underline font-medium">{r.training}</Link>
                    </td>
                    <td className="py-2 pr-4 text-gray-600">{r.unit}</td>
                    <td className="py-2 pr-4 text-gray-600">{formatDate(r.evaluation_date)}</td>
                    <td className="py-2 pr-4 text-center text-gray-600">{r.collaborators}</td>
                    <td className="py-2 text-center font-semibold">
                      <span className={r.avg_pct >= 70 ? 'text-green-600' : r.avg_pct >= 50 ? 'text-brand-500' : 'text-red-500'}>
                        {r.avg_pct ?? 0}%
                      </span>
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
