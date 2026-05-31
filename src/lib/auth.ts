export type AuthRole = 'gestor' | 'admin';

const PASSWORDS: Record<AuthRole, string> = {
  gestor: 'Gestao@2026',
  admin:  'Tres@2026',
};

export function getStoredRole(): AuthRole | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem('authRole') as AuthRole | null;
}

export function setStoredRole(role: AuthRole): void {
  sessionStorage.setItem('authRole', role);
}

export function clearStoredRole(): void {
  sessionStorage.removeItem('authRole');
}

export function hasRole(required: AuthRole): boolean {
  const stored = getStoredRole();
  if (!stored) return false;
  if (required === 'gestor') return stored === 'gestor' || stored === 'admin';
  return stored === 'admin';
}

export function tryGrant(password: string, required: AuthRole): AuthRole | null {
  if (password === PASSWORDS.admin) {
    setStoredRole('admin');
    return 'admin';
  }
  if (password === PASSWORDS.gestor && required === 'gestor') {
    setStoredRole('gestor');
    return 'gestor';
  }
  return null;
}

export const ROLE_LABELS: Record<AuthRole, string> = {
  gestor: 'Gestor',
  admin:  'Administrador',
};
