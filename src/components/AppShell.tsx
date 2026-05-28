'use client';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import Image from 'next/image';
import { Sidebar } from './Sidebar';

export function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Fecha o drawer sempre que muda de rota
  useEffect(() => { setOpen(false); }, [pathname]);

  // Bloqueia scroll do body quando drawer está aberto
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <div className="flex h-screen overflow-hidden">

      {/* ── Overlay mobile ── */}
      {open && (
        <div
          className="fixed inset-0 z-20 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}

      {/* ── Sidebar ── */}
      <div
        className={[
          'fixed inset-y-0 left-0 z-30 flex-shrink-0',
          'transition-transform duration-300 ease-in-out',
          'lg:relative lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
      >
        <Sidebar onClose={() => setOpen(false)} />
      </div>

      {/* ── Conteúdo principal ── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Top bar */}
        <header className="shrink-0 bg-white border-b border-red-100 px-4 sm:px-6 h-14 flex items-center justify-between shadow-[0_1px_6px_0_rgba(170,39,47,0.07)]">
          <div className="flex items-center gap-3">
            {/* Hambúrguer — só aparece em mobile/tablet */}
            <button
              onClick={() => setOpen(true)}
              className="lg:hidden -ml-1 p-2 rounded-lg text-brand-600 hover:bg-brand-50 transition-colors"
              aria-label="Abrir menu"
            >
              <Menu size={22} />
            </button>

            {/* Brand mark */}
            <div className="flex items-center gap-2.5">
              <Image
                src="/images/logo-grupo-transparent.png"
                alt="Grupo 3Corações"
                width={30}
                height={30}
                priority
              />
              <span className="hidden sm:inline text-gray-200 text-sm">|</span>
              <span className="hidden sm:inline text-xs text-gray-500 font-medium">
                Avaliação de Desempenho de Treinamento
              </span>
            </div>
          </div>

          {/* Direita */}
          <span className="hidden md:inline-flex items-center gap-1.5 bg-brand-50 text-brand-700 text-[11px] font-semibold px-3 py-1 rounded-full border border-brand-100">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-600 inline-block" />
            Diretoria Industrial · GENTE &amp; GESTÃO
          </span>
        </header>

        {/* Página */}
        <main className="flex-1 overflow-y-auto bg-brand-cream scrollbar-brand">
          <div className="p-4 sm:p-6 max-w-screen-xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
