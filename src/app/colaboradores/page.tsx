'use client';
import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface Employee {
  id: number;
  name: string;
  registration: string;
  position: string;
  section: string;
  unit_name: string;
  admission_date: string;
  employment_type: string;
}

export default function ColaboradoresPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const load = (q: string) => {
    setLoading(true);
    fetch(`/api/colaboradores?q=${encodeURIComponent(q)}`)
      .then(r => r.json())
      .then(d => { setEmployees(d); setLoading(false); });
  };

  useEffect(() => { load(''); }, []);

  useEffect(() => {
    const t = setTimeout(() => load(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Colaboradores</h2>
        <p className="text-sm text-gray-500">Base de headcount — {employees.length} colaborador(es)</p>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nome ou matrícula..."
          className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-orange-500 border-t-transparent rounded-full" />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Nome', 'Matrícula', 'Cargo', 'Seção', 'Unidade', 'Admissão'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-gray-500 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {employees.map(e => (
                <tr key={e.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{e.name}</td>
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs">{e.registration}</td>
                  <td className="px-4 py-3 text-gray-600">{e.position}</td>
                  <td className="px-4 py-3 text-gray-500">{e.section}</td>
                  <td className="px-4 py-3">
                    <span className="bg-orange-50 text-orange-700 text-xs px-2 py-0.5 rounded-full">
                      {e.unit_name}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(e.admission_date)}</td>
                </tr>
              ))}
              {employees.length === 0 && (
                <tr><td colSpan={6} className="text-center py-12 text-gray-400">Nenhum colaborador encontrado.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
