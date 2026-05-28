import type { Metadata } from 'next';
import './globals.css';
import { Sidebar } from '@/components/Sidebar';

export const metadata: Metadata = {
  title: 'Avaliação de Treinamento — 3Corações',
  description: 'Sistema de avaliação de eficácia de treinamentos — Grupo 3Corações',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <div className="flex h-screen overflow-hidden">
          <Sidebar />

          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Top bar */}
            <header className="shrink-0 bg-white border-b border-red-100 px-6 py-0 flex items-center justify-between h-14 shadow-[0_1px_6px_0_rgba(170,39,47,0.07)]">
              {/* Left: brand mark */}
              <div className="flex items-center gap-3">
                <div className="flex gap-0.5">
                  {[0, 1, 2].map(i => (
                    <svg key={i} viewBox="0 0 20 18" className="w-3.5 h-3.5" fill="#AA272F">
                      <path d="M10 17S1 11 1 5.5A4.5 4.5 0 0 1 10 3.428 4.5 4.5 0 0 1 19 5.5C19 11 10 17 10 17z"/>
                    </svg>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-display text-sm font-bold text-brand-700 tracking-wide">
                    3Corações
                  </span>
                  <span className="text-gray-200 text-sm">|</span>
                  <span className="text-xs text-gray-500 font-medium">
                    Avaliação de Desempenho de Treinamento
                  </span>
                </div>
              </div>

              {/* Right: unit label + yellow badge */}
              <div className="flex items-center gap-3">
                <span className="hidden sm:inline-flex items-center gap-1.5 bg-brand-50 text-brand-700 text-[11px] font-semibold px-3 py-1 rounded-full border border-brand-100">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-600 inline-block" />
                  Diretoria Industrial · GENTE &amp; GESTÃO
                </span>
              </div>
            </header>

            {/* Main content */}
            <main className="flex-1 overflow-y-auto bg-brand-cream scrollbar-brand">
              <div className="p-6 max-w-screen-xl mx-auto">
                {children}
              </div>
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
