'use client';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  LayoutDashboard, ClipboardList, Users, BarChart2,
  Plus, X, Target, DatabaseZap, HelpCircle, Lock,
  LogOut, Shield, UserCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AuthRole, getStoredRole, clearStoredRole, ROLE_LABELS } from '@/lib/auth';

type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
  role?: AuthRole;
};

const nav: NavItem[] = [
  { href: '/',                label: 'Matriz de Habilidades', icon: LayoutDashboard },
  { href: '/avaliacoes',      label: 'Avaliações',     icon: ClipboardList   },
  { href: '/relatorios',      label: 'Relatórios',     icon: BarChart2       },
  { href: '/avaliacoes/nova', label: 'Nova Avaliação', icon: Plus,            role: 'gestor' },
  { href: '/colaboradores',   label: 'Colaboradores',  icon: Users,           role: 'gestor' },
  { href: '/planos',          label: 'Planos de Ação', icon: Target,          role: 'gestor' },
  { href: '/admin/perguntas', label: 'Questões',       icon: HelpCircle,      role: 'admin'  },
  { href: '/admin/hc',        label: 'Atualizar HC',   icon: DatabaseZap,     role: 'admin'  },
];

interface SidebarProps {
  onClose?: () => void;
}

export function Sidebar({ onClose }: SidebarProps) {
  const path = usePathname();
  const [role, setRole] = useState<AuthRole | null>(null);

  useEffect(() => {
    setRole(getStoredRole());
    const handler = () => setRole(getStoredRole());
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  function logout() {
    clearStoredRole();
    setRole(null);
  }

  const roleLabel = role ? ROLE_LABELS[role] : 'Público';
  const RoleIcon  = role === 'admin' ? Shield : role === 'gestor' ? UserCircle2 : null;

  return (
    <aside className="w-64 h-full flex flex-col shrink-0 brand-gradient shadow-sidebar relative overflow-hidden">
      {/* Decorative hearts pattern overlay */}
      <div className="absolute inset-0 hearts-pattern pointer-events-none opacity-30" />

      {/* Logo / Brand area */}
      <div className="relative px-6 pt-6 pb-5">
        {/* Botão fechar — só aparece em mobile */}
        <button
          onClick={onClose}
          className="lg:hidden absolute top-4 right-4 p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
          aria-label="Fechar menu"
        >
          <X size={18} />
        </button>

        {/* Logo oficial */}
        <div className="inline-flex rounded-2xl bg-white p-2 shadow-lg">
          <Image
            src="/images/logo-grupo-transparent.png"
            alt="Grupo 3Corações"
            width={56}
            height={56}
            priority
          />
        </div>

        <div className="mt-3">
          <p className="text-red-200 text-[11px] tracking-widest uppercase font-medium">
            Grupo Empresarial
          </p>
        </div>

        <div className="mt-4 h-px bg-gradient-to-r from-brand-yellow via-brand-yellow/40 to-transparent" />

        <p className="mt-3 text-white/80 text-[11px] leading-snug font-medium">
          Gestão de Avaliação de Eficácia de Treinamentos
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2 relative space-y-0.5 overflow-y-auto">
        {nav.map(({ href, label, icon: Icon, role: required }) => {
          const active = path === href || (href !== '/' && path.startsWith(href));
          const locked = !!required;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-150',
                active
                  ? 'bg-white text-brand-700 shadow-sm'
                  : 'text-red-100 hover:bg-white/12 hover:text-white'
              )}
            >
              <Icon
                size={18}
                strokeWidth={active ? 2.5 : 1.8}
                className={active ? 'text-brand-600' : ''}
              />
              <span className="flex-1">{label}</span>
              {locked && !active && (
                <Lock size={11} className="opacity-40 shrink-0" />
              )}
              {active && (
                <span className="w-1.5 h-1.5 rounded-full bg-brand-yellow shrink-0" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Role indicator */}
      <div className="relative px-4 py-3 border-t border-white/10 space-y-2">
        <div className="flex items-center gap-2 bg-white/10 rounded-xl px-3 py-2">
          {RoleIcon && <RoleIcon size={14} className="text-brand-yellow shrink-0" />}
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-white/50 uppercase tracking-wide font-medium leading-none">Nível de acesso</p>
            <p className="text-xs text-white font-semibold mt-0.5 truncate">{roleLabel}</p>
          </div>
          {role && (
            <button
              onClick={logout}
              title="Sair do nível atual"
              className="p-1 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors shrink-0"
            >
              <LogOut size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Slogan */}
      <div className="relative px-6 pt-3 pb-3 border-t border-white/10">
        <p className="text-brand-yellow/90 text-[10px] italic font-display leading-snug">
          &quot;O prazer está nas coisas simples!&quot;
        </p>
      </div>

      {/* Footer label */}
      <div className="relative px-6 py-3 border-t border-white/10 bg-black/20">
        <p className="text-white/70 text-[10px] font-semibold leading-snug tracking-wide uppercase">Educação Corporativa</p>
      </div>
    </aside>
  );
}
