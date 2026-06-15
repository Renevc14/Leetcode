import { useEffect, useRef } from 'react';
import { useAuth as useOidcAuth } from 'react-oidc-context';
import { configureAuth } from '@/api/client';

export function AuthBootstrap({ children }: { children: React.ReactNode }) {
  const auth = useOidcAuth();
  const triedSilent = useRef(false);

  useEffect(() => {
    configureAuth(
      () => auth.user?.access_token ?? null,
      () => {
        void auth.removeUser();
      },
    );
  }, [auth]);

  // Intenta SSO silencioso al cargar: si el navegador ya tiene sesion abierta
  // en Authentik, recupera el token sin interaccion ni redirect visible.
  useEffect(() => {
    if (triedSilent.current) return;
    if (auth.isLoading || auth.isAuthenticated || auth.activeNavigator) return;
    if (window.location.pathname.startsWith('/auth/callback')) return;
    triedSilent.current = true;
    auth.signinSilent().catch(() => {
      // Sin sesion previa en Authentik: queda anonimo, sin error visible.
    });
  }, [auth]);

  return <>{children}</>;
}
