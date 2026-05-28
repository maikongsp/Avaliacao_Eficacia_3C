'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ClipboardList, Users, BarChart2, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

function ThreeHearts({ size = 20 }: { size?: number }) {
  return (
    <svg width={size * 3.2} height={size} viewBox="0 0 64 20" fill="none">
      {[0, 22, 44].map((ox) => (
        <path
          key={ox}
          d={`M${ox + 10} 18 C${ox + 10} 18 ${ox + 1} 12 ${ox + 1} 6.5 A4.5 4.5 0 0 1 ${ox + 10} 4.43 A4.5 4.5 0 0 1 ${ox + 19} 6.5 C${ox + 19} 12 ${ox + 10} 18 ${ox + 10} 18 Z`}
          fill="white"
          fillOpacity="0.92"
        />
      ))}
    </svg>
  );
}

const nav = [
  { href: '/',                label: 'Dashboard',      icon: LayoutDashboard },
  { href: '/avaliacoes',      label: 'Avaliações',     icon: ClipboardList   },
  { href: '/avaliacoes/nova', label: 'Nova Avaliação', icon: Plus            },
  { href: '/colaboradores',   label: 'Colaboradores',  icon: Users           },
  { href: '/relatorios',      label: 'Relatórios',     icon: BarChart2       },
];

export function Sidebar() {
  const path = usePathname();
  return (
    <aside className="w-60 flex flex-col shrink-0 brand-gradient shadow-sidebar relative overflow-hidden">
      {/* Decorative hearts pattern overlay */}
      <div className="absolute inset-0 hearts-pattern pointer-events-none opacity-30" />

      {/* Logo / Brand area */}
      <div className="relative px-6 pt-7 pb-5">
        {/* Three hearts */}
        <ThreeHearts size={18} />

        {/* Brand name */}
        <div className="mt-3">
          <p className="text-white font-display text-lg font-bold leading-none tracking-wide">
            3Corações
          </p>
          <p className="text-red-200 text-[11px] mt-1 tracking-widest uppercase font-medium">
            Grupo Empresarial
          </p>
        </div>

        {/* Yellow accent line */}
        <div className="mt-4 h-px bg-gradient-to-r from-brand-yellow via-brand-yellow/40 to-transparent" />

        {/* System title */}
        <p className="mt-3 text-white/80 text-[11px] leading-snug font-medium">
          Gestão de Avaliação de Treinamento
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2 relative space-y-0.5">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = path === href || (href !== '/' && path.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                active
                  ? 'bg-white text-brand-700 shadow-sm'
                  : 'text-red-100 hover:bg-white/12 hover:text-white'
              )}
            >
              <Icon
                size={17}
                strokeWidth={active ? 2.5 : 1.8}
                className={active ? 'text-brand-600' : ''}
              />
              {label}
              {active && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-brand-yellow" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Slogan */}
      <div className="relative px-6 pt-4 pb-3 border-t border-white/10">
        <p className="text-brand-yellow/90 text-[10px] italic font-display leading-snug">
          "O prazer está nas coisas simples!"
        </p>
      </div>

      {/* Developer credit — fixed at very bottom */}
      <div className="relative px-6 py-3 border-t border-white/10 bg-black/20">
        <p className="text-white/40 text-[9.5px] leading-snug">
          Desenvolvido por
        </p>
        <p className="text-white/70 text-[10px] font-semibold leading-snug">
          Ana Clara Costa Santos
        </p>
      </div>
    </aside>
  );
}
