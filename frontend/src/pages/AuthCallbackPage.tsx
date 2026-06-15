import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth as useOidcAuth } from 'react-oidc-context';
import { useAuth } from '@/auth/useAuth';
import { useUpsertMyUser } from '@/hooks/useUpsertMyUser';

export function AuthCallbackPage() {
  const oidc = useOidcAuth();
  const { isAuthenticated, subject } = useAuth();
  const upsert = useUpsertMyUser();
  const hasCode = window.location.search.includes('code=');

  useEffect(() => {
    if (isAuthenticated && subject) {
      upsert.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, subject]);

  if (oidc.isLoading || (hasCode && !oidc.error)) {
    return <div className="p-8 text-center">Procesando login...</div>;
  }
  if (oidc.error) {
    return (
      <div className="p-8 text-center text-lc-red">Error en callback: {oidc.error.message}</div>
    );
  }
  if (isAuthenticated) return <Navigate to="/problems" replace />;
  return <Navigate to="/login" replace />;
}
