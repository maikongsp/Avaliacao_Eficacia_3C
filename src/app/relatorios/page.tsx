'use client';
import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, Cell, PieChart, Pie,
} from 'recharts';
import { formatPct } from '@/lib/utils';
import { levelLabel } from '@/lib/ranges';

interface DashData {
  byCategory: { category: string; total: number; met: number; avg_pct: number }[];
  byLevel: { level: string; count: number }[];
  byUnit: { unit: string; total: number; avg_pct: number; met: number }[];
  totalEvals: number;
  totalCollabs: number;
  metPct: number;
  avgGap: number;
}

const LEVEL_COLORS: Record<string, string> = {
  REATIVO: '#ef4444',
  DEPENDENTE: '#f97316',
  INDEPENDENTE: '#3b82f6',
  INTERDEPENDENTE: '#22c55e',
};

export default function RelatoriosPage() {
  const [data, setData] = useState<DashData | null>(null);

  useEffect(() => {
    fetch('/api/dashboard').then(r => r.json()).then(setData);
  }, []);

  if (!data) return (
    <div className="flex justify-center py-16">
      <div className="animate-spin h-8 w-8 border-4 border-brand-500 border-t-transparent rounded-full" />
    </div>
  );

  const catData = data.byCategory.map(c => ({
    name: c.category.replace('Técnico da Função - ', 'T.F. '),
    'Acertos (%)': Math.round(c.avg_pct * 100),
    'Atingiram Nível (%)': c.total > 0 ? Math.round((c.met / c.total) * 100) : 0,
    total: c.total,
  }));

  const unitData = data.byUnit.map(u => ({
    name: u.unit.length > 16 ? u.unit.slice(0, 14) + '…' : u.unit,
    fullName: u.unit,
    pct: Math.round(u.avg_pct * 100),
    met: u.met,
    total: u.total,
  }));

  const pieData = data.byLevel.map(l => ({
    name: levelLabel(l.level),
    value: l.count,
    color: LEVEL_COLORS[l.level] ?? '#94a3b8',
    level: l.level,
  }));

  const gapData = data.byCategory.map(c => ({
    category: c.category.replace('Técnico da Função - ', 'T.F. '),
    gap: c.total > 0 ? Math.round(((c.total - c.met) / c.total) * 100) : 0,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Relatórios</h2>
        <p className="text-sm text-gray-500">Análise consolidada de desempenho em treinamentos</p>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total de Avaliações', value: data.totalEvals },
          { label: 'Colaboradores Avaliados', value: data.totalCollabs },
          { label: 'Atingiram Nível Desejado', value: formatPct(data.metPct) },
          { label: 'GAP Médio', value: formatPct(data.avgGap) },
        ].map(s => (
          <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      {/* By Category */}
      {catData.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-800 mb-4">Desempenho por Categoria de Treinamento</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={catData} layout="vertical" margin={{ left: 10, right: 30 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v: number) => `${v}%`} />
              <Bar dataKey="Acertos (%)" fill="#C41230" radius={[0, 4, 4, 0]} />
              <Bar dataKey="Atingiram Nível (%)" fill="#22c55e" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="flex gap-4 text-xs text-gray-500 mt-2 justify-center">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-brand-500 inline-block" />% Acerto médio</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-green-500 inline-block" />% Atingiram nível</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Level distribution */}
        {pieData.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-800 mb-4">Distribuição de Níveis Alcançados</h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`} labelLine>
                  {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {pieData.map(p => (
                <div key={p.level} className="flex items-center gap-2 text-xs">
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                  <span className="text-gray-600">{p.name}:</span>
                  <span className="font-semibold">{p.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* GAP by category */}
        {gapData.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-800 mb-4">GAP por Categoria (%  abaixo do nível desejado)</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={gapData} margin={{ left: 0, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="category" tick={{ fontSize: 9 }} />
                <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => `${v}%`} />
                <Bar dataKey="gap" name="GAP (%)" fill="#98531a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* By Unit table */}
      {unitData.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-800 mb-4">Ranking por Unidade</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-gray-500">
                  <th className="text-left pb-2 pr-4 font-medium">Unidade</th>
                  <th className="text-center pb-2 pr-4 font-medium">Avaliados</th>
                  <th className="text-center pb-2 pr-4 font-medium">Atingiram Nível</th>
                  <th className="text-center pb-2 font-medium">% Acerto</th>
                  <th className="pb-2 font-medium">Progresso</th>
                </tr>
              </thead>
              <tbody>
                {unitData.sort((a, b) => b.pct - a.pct).map((u, i) => (
                  <tr key={u.name} className="border-b border-gray-50">
                    <td className="py-2 pr-4">
                      <span className="text-xs text-gray-400 mr-2">#{i + 1}</span>
                      <span className="font-medium text-gray-800">{u.fullName}</span>
                    </td>
                    <td className="py-2 pr-4 text-center text-gray-600">{u.total}</td>
                    <td className="py-2 pr-4 text-center text-gray-600">{u.met}/{u.total}</td>
                    <td className="py-2 pr-4 text-center">
                      <span className={`font-semibold ${u.pct >= 70 ? 'text-green-600' : u.pct >= 50 ? 'text-brand-500' : 'text-red-500'}`}>
                        {u.pct}%
                      </span>
                    </td>
                    <td className="py-2">
                      <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${u.pct >= 70 ? 'bg-green-500' : u.pct >= 50 ? 'bg-brand-400' : 'bg-red-400'}`}
                          style={{ width: `${u.pct}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {data.totalEvals === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-gray-400">Nenhuma avaliação registrada ainda.</p>
          <p className="text-sm text-gray-400 mt-1">Os relatórios serão exibidos assim que houver dados.</p>
        </div>
      )}
    </div>
  );
}
