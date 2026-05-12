import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, type Role } from './useAuth';

export function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading, signinRedirect } = useAuth();
  const location = useLocation();

  if (isLoading) return <p>Cargando sesión…</p>;
  if (!isAuthenticated) {
    void signinRedirect({ state: { returnTo: location.pathname } });
    return null;
  }
  return <>{children}</>;
}

export function RequireRole({ role, children }: { role: Role; children: ReactNode }) {
  const { isAuthenticated, isLoading, hasRole, signinRedirect } = useAuth();
  const location = useLocation();

  if (isLoading) return <p>Cargando sesión…</p>;
  if (!isAuthenticated) {
    void signinRedirect({ state: { returnTo: location.pathname } });
    return null;
  }
  if (!hasRole(role)) return <Navigate to="/403" replace />;
  return <>{children}</>;
}

export function Show({ ifRole, children }: { ifRole: Role; children: ReactNode }) {
  const { hasRole } = useAuth();
  if (!hasRole(ifRole)) return null;
  return <>{children}</>;
}
