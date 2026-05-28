'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { ClipboardList, Users, TrendingUp, AlertCircle, Plus, ArrowRight } from 'lucide-react';
import { formatDate, formatPct } from '@/lib/utils';
import { levelLabel } from '@/lib/ranges';

const LEVEL_COLORS: Record<string, string> = {
  REATIVO:         '#AA272F',  // vermelho oficial 3corações
  DEPENDENTE:      '#FDC82F',  // amarelo oficial 3corações
  INDEPENDENTE:    '#427730',  // verde oficial 3corações
  INTERDEPENDENTE: '#2D5E1E',  // verde escuro
};

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
      <div className={`p-2.5 rounded-xl ${c.bg} ${c.icon} shrink-0`}>
        <Icon size={20} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold text-brand-dark mt-0.5">{value}</p>
        {sub && <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); });
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin h-8 w-8 border-4 border-brand-500 border-t-transparent rounded-full" />
    </div>
  );

  if (!data) return null;

  const pieData = data.byLevel.map(l => ({
    name: levelLabel(l.level),
    value: l.count,
    color: LEVEL_COLORS[l.level] ?? '#94a3b8',
  }));

  const catData = data.byCategory.map(c => ({
    name: c.category.replace('Técnico da Função - ', 'T.F. '),
    pct: Math.round(c.avg_pct * 100),
    met: c.met,
    total: c.total,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold text-brand-800">Dashboard</h2>
          <p className="text-sm text-brand-muted mt-0.5">Visão geral das avaliações de treinamento</p>
        </div>
        <Link
          href="/avaliacoes/nova"
          className="flex items-center gap-2 bg-brand-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-brand-700 transition-colors shadow-sm hover:shadow-md"
        >
          <Plus size={16} />
          Nova Avaliação
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        <StatCard icon={ClipboardList} label="Total de Avaliações" value={data.totalEvals} color="red" />
        <StatCard icon={Users} label="Colaboradores Avaliados" value={data.totalCollabs} color="coffee" />
        <StatCard
          icon={TrendingUp} label="Atingiram Nível Desejado"
          value={`${data.metLevel} (${formatPct(data.metPct)})`}
          color="green"
          sub={`Média de acerto: ${formatPct(data.avgPct)}`}
        />
        <StatCard
          icon={AlertCircle} label="GAP Médio"
          value={formatPct(data.avgGap)}
          color={data.avgGap > 0.3 ? 'red' : 'yellow'}
          sub="Distância ao nível desejado"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* By Category */}
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

        {/* Levels Pie */}
        <div className="bg-white rounded-2xl border border-red-100 p-5 shadow-card">
          <h3 className="font-display text-sm font-bold text-brand-800 mb-4">Distribuição de Níveis Alcançados</h3>
          {pieData.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Sem dados ainda</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* By Unit */}
      {data.byUnit.length > 0 && (
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
                {data.byUnit.map(u => (
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
        {data.recent.length === 0 ? (
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
                {data.recent.map((r) => (
                  <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-2 pr-4">
                      <Link href={`/avaliacoes/${r.id}`} className="text-brand-700 hover:underline font-medium">
                        {r.training}
                      </Link>
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
