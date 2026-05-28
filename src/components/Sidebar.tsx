'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ClipboardList, UserCheck, BarChart2, Users, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

const nav = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/avaliacoes', label: 'Avaliações', icon: ClipboardList },
  { href: '/avaliacoes/nova', label: 'Nova Avaliação', icon: Plus },
  { href: '/colaboradores', label: 'Colaboradores', icon: Users },
  { href: '/relatorios', label: 'Relatórios', icon: BarChart2 },
];

export function Sidebar() {
  const path = usePathname();
  return (
    <aside className="w-56 bg-orange-700 text-white flex flex-col shrink-0">
      <div className="px-5 py-6 border-b border-orange-600">
        <p className="text-xs font-medium text-orange-200 uppercase tracking-widest">3 Corações</p>
        <h1 className="mt-1 text-base font-bold leading-tight">Avaliação de<br />Treinamento</h1>
      </div>
      <nav className="flex-1 py-4">
        {nav.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 px-5 py-3 text-sm transition-colors',
              path === href
                ? 'bg-orange-600 text-white font-semibold'
                : 'text-orange-100 hover:bg-orange-600 hover:text-white'
            )}
          >
            <Icon size={18} />
            {label}
          </Link>
        ))}
      </nav>
      <div className="px-5 py-4 border-t border-orange-600">
        <p className="text-xs text-orange-300">v1.0 · {new Date().getFullYear()}</p>
      </div>
    </aside>
  );
}
