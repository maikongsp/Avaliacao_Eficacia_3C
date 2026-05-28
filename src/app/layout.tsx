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
            <header className="shrink-0 bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {/* Three hearts */}
                <div className="flex gap-0.5">
                  {[0,1,2].map(i => (
                    <svg key={i} viewBox="0 0 20 18" className="w-3.5 h-3.5" fill="#C41230">
                      <path d="M10 17S1 11 1 5.5A4.5 4.5 0 0 1 10 3.428 4.5 4.5 0 0 1 19 5.5C19 11 10 17 10 17z"/>
                    </svg>
                  ))}
                </div>
                <span className="text-sm font-bold text-brand-700">3Corações</span>
                <span className="text-gray-300 text-sm mx-1">|</span>
                <span className="text-sm text-gray-500">Gestão de Treinamentos</span>
              </div>
              <div className="text-xs text-gray-400">
                Diretoria Industrial · GENTE & GESTÃO
              </div>
            </header>
            <main className="flex-1 overflow-y-auto bg-gray-50">
              <div className="p-6">{children}</div>
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
