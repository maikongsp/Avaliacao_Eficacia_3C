'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Search } from 'lucide-react';
import { formatDate, formatPct } from '@/lib/utils';
import { levelLabel, type SkillLevel } from '@/lib/ranges';

interface Evaluation {
  id: number;
  evaluator_email: string;
  evaluation_date: string;
  training: string;
  category: string;
  unit: string;
  collaborators: number;
  avg_pct: number;
  met: number;
}

const LEVEL_BADGE: Record<string, string> = {
  REATIVO:         'bg-red-50 text-brand-700 border border-brand-200',
  DEPENDENTE:      'bg-yellow-50 text-yellow-700 border border-yellow-200',
  INDEPENDENTE:    'bg-green-50 text-green-800 border border-green-200',
  INTERDEPENDENTE: 'bg-green-100 text-green-900 border border-green-300',
};

export default function AvaliacoesPage() {
  const [rows, setRows] = useState<Evaluation[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/avaliacoes')
      .then(r => r.json())
      .then(d => { setRows(d); setLoading(false); });
  }, []);

  const filtered = rows.filter(r =>
    r.training.toLowerCase().includes(search.toLowerCase()) ||
    r.unit.toLowerCase().includes(search.toLowerCase()) ||
    r.evaluator_email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold text-brand-800">Avaliações</h2>
          <p className="text-sm text-brand-muted mt-0.5">{rows.length} avaliação(ões) registrada(s)</p>
        </div>
        <Link
          href="/avaliacoes/nova"
          className="flex items-center gap-2 bg-brand-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-brand-700 transition-colors shadow-sm"
        >
          <Plus size={16} /> Nova Avaliação
        </Link>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Pesquisar por treinamento, unidade ou avaliador..."
          className="w-full pl-9 pr-4 py-2.5 border border-red-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 bg-white"
        />
      </div>

      <div className="bg-white rounded-2xl border border-red-100 overflow-hidden shadow-card">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin h-8 w-8 border-4 border-brand-500 border-t-transparent rounded-full" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-gray-400">Nenhuma avaliação encontrada.</p>
            <Link href="/avaliacoes/nova" className="mt-3 inline-block text-sm text-brand-600 hover:underline">
              Criar primeira avaliação
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead className="bg-brand-50 border-b border-red-100">
              <tr>
                {['#', 'Treinamento', 'Categoria', 'Unidade', 'Data', 'Colaboradores', '% Acerto', 'Atingiram Nível', ''].map(h => (
                  <th key={h} className="text-left text-brand-muted font-semibold text-[11px] uppercase tracking-wide px-4 py-3 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(row => {
                const pct = row.avg_pct ?? 0;
                const metRate = row.collaborators > 0 ? row.met / row.collaborators : 0;
                return (
                  <tr key={row.id} className="border-b border-red-50 hover:bg-brand-50/50 transition-colors">
                    <td className="px-4 py-3 text-gray-400 font-mono text-xs">#{row.id}</td>
                    <td className="px-4 py-3 font-medium text-gray-800 max-w-xs truncate">{row.training}</td>
                    <td className="px-4 py-3 text-gray-500">{row.category}</td>
                    <td className="px-4 py-3 text-gray-600">{row.unit}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatDate(row.evaluation_date)}</td>
                    <td className="px-4 py-3 text-center text-gray-600">{row.collaborators}</td>
                    <td className="px-4 py-3 text-center font-semibold">
                      <span className={pct >= 70 ? 'text-green-600' : pct >= 50 ? 'text-brand-500' : 'text-red-500'}>
                        {pct}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${metRate >= 1 ? 'bg-green-100 text-green-700' : metRate >= 0.5 ? 'bg-brand-100 text-brand-700' : 'bg-red-100 text-red-700'}`}>
                        {row.met}/{row.collaborators}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/avaliacoes/${row.id}`} className="text-brand-600 hover:text-brand-800 text-xs font-medium">
                        Ver →
                      </Link>
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
