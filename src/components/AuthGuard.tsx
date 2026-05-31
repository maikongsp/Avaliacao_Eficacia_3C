'use client';
import { useEffect, useState } from 'react';
import { Lock, Shield } from 'lucide-react';
import { AuthRole, hasRole, tryGrant } from '@/lib/auth';

interface AuthGuardProps {
  required: AuthRole;
  children: React.ReactNode;
}

export function AuthGuard({ required, children }: AuthGuardProps) {
  const [mounted, setMounted]       = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [password, setPassword]     = useState('');
  const [error, setError]           = useState('');

  useEffect(() => {
    setMounted(true);
    setAuthorized(hasRole(required));
  }, [required]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const role = tryGrant(password, required);
    if (role) {
      setAuthorized(true);
    } else {
      setError('Senha incorreta. Tente novamente.');
    }
  }

  if (!mounted) return (
    <div className="flex justify-center py-20">
      <div className="animate-spin h-8 w-8 border-4 border-brand-500 border-t-transparent rounded-full" />
    </div>
  );

  if (authorized) return <>{children}</>;

  const isAdmin = required === 'admin';

  return (
    <div className="flex items-center justify-center min-h-[65vh]">
      <div className="bg-white rounded-2xl shadow-card border border-red-100 p-8 max-w-sm w-full space-y-6">

        {/* Icon + title */}
        <div className="text-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
               style={{ background: isAdmin ? '#fef2f2' : '#fdf8ec' }}>
            {isAdmin
              ? <Shield size={30} className="text-brand-600" />
              : <Lock size={30} className="text-brand-600" />}
          </div>
          <h2 className="font-display text-xl font-bold text-brand-800">Acesso Restrito</h2>
          <p className="text-sm text-brand-muted mt-2 leading-relaxed">
            {isAdmin
              ? 'Esta área é exclusiva para administradores do sistema.'
              : 'Esta área é exclusiva para gestores. Informe a senha para continuar.'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={submit} className="space-y-4">
          <input
            type="password"
            value={password}
            onChange={e => { setPassword(e.target.value); setError(''); }}
            placeholder="Senha de acesso"
            autoFocus
            className="w-full border border-red-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 bg-white"
          />
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2 text-center">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={!password}
            className="w-full py-3 bg-brand-600 text-white rounded-xl font-semibold text-sm hover:bg-brand-700 transition-colors disabled:opacity-50 shadow-sm"
          >
            Acessar
          </button>
        </form>

        <p className="text-center text-xs text-gray-400">
          {isAdmin ? 'Acesso · Administrador' : 'Acesso · Gestor'}
        </p>
      </div>
    </div>
  );
}
