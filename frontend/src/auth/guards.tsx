import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './useAuth';
import type { UserRole } from '@/types';

export function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  if (isLoading) return null;
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  return <>{children}</>;
}

export function RequireRole({ role, children }: { role: UserRole; children: ReactNode }) {
  const { isAuthenticated, isLoading, hasRole, isAdmin } = useAuth();
  const location = useLocation();
  if (isLoading) return null;
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  if (!hasRole(role) && !isAdmin) {
    return <Navigate to="/forbidden" replace />;
  }
  return <>{children}</>;
}

export function ShowIfRole({ role, children }: { role: UserRole; children: ReactNode }) {
  const { hasRole, isAdmin } = useAuth();
  if (hasRole(role) || isAdmin) return <>{children}</>;
  return null;
}
