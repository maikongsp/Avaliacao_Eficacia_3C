'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ClipboardList, UserCheck, BarChart2, Users, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

function TresCorecoesLogo() {
  return (
    <svg viewBox="0 0 120 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full max-w-[140px]">
      {/* Three hearts */}
      {[0, 16, 32].map((x) => (
        <path
          key={x}
          d={`M${x + 6} 10 C${x + 6} 7.5 ${x + 3} 6 ${x + 0.5} 6 C${x - 2} 6 ${x - 4} 8 ${x - 4} 10.5 C${x - 4} 14 ${x + 0} 17 ${x + 6} 21 C${x + 12} 17 ${x + 16} 14 ${x + 16} 10.5 C${x + 16} 8 ${x + 14} 6 ${x + 11.5} 6 C${x + 9} 6 ${x + 6} 7.5 ${x + 6} 10 Z`}
          fill="white"
          fillOpacity="0.9"
          transform="scale(0.6) translate(2, 2)"
        />
      ))}
      {/* 3Corações text */}
      <text x="4" y="32" fill="white" fontSize="11" fontWeight="700" fontFamily="Inter, system-ui" letterSpacing="0.3">
        3Corações
      </text>
    </svg>
  );
}

const nav = [
  { href: '/',                  label: 'Dashboard',      icon: LayoutDashboard },
  { href: '/avaliacoes',        label: 'Avaliações',     icon: ClipboardList   },
  { href: '/avaliacoes/nova',   label: 'Nova Avaliação', icon: Plus            },
  { href: '/colaboradores',     label: 'Colaboradores',  icon: Users           },
  { href: '/relatorios',        label: 'Relatórios',     icon: BarChart2       },
];

export function Sidebar() {
  const path = usePathname();
  return (
    <aside className="w-56 flex flex-col shrink-0 brand-gradient text-white shadow-xl">
      {/* Logo area */}
      <div className="px-5 py-5 border-b border-white/10">
        {/* Hearts row */}
        <div className="flex gap-1 mb-2">
          {[0, 1, 2].map(i => (
            <svg key={i} viewBox="0 0 20 18" className="w-5 h-5" fill="white" fillOpacity={0.85}>
              <path d="M10 17S1 11 1 5.5A4.5 4.5 0 0 1 10 3.428 4.5 4.5 0 0 1 19 5.5C19 11 10 17 10 17z"/>
            </svg>
          ))}
        </div>
        <p className="text-[11px] font-semibold text-red-100 uppercase tracking-widest leading-none">
          3Corações
        </p>
        <p className="text-[11px] text-red-200 mt-0.5 leading-snug">
          Avaliação de Treinamento
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3">
        {nav.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 px-5 py-3 text-sm transition-all',
              path === href
                ? 'bg-white/15 text-white font-semibold border-r-2 border-white'
                : 'text-red-100 hover:bg-white/10 hover:text-white'
            )}
          >
            <Icon size={17} strokeWidth={path === href ? 2.2 : 1.8} />
            {label}
          </Link>
        ))}
      </nav>

      <div className="px-5 py-3 border-t border-white/10">
        <p className="text-[10px] text-red-300">
          Sistema de Gestão de Treinamento
        </p>
        <p className="text-[10px] text-red-300 mt-0.5">v1.0 · {new Date().getFullYear()}</p>
      </div>
    </aside>
  );
}
