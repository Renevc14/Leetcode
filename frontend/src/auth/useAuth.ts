import { useAuth as useOidcAuth } from 'react-oidc-context';
import type { UserRole } from '@/types';

export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  token: string | null;
  subject: string | null;
  username: string | null;
  email: string | null;
  roles: UserRole[];
  scopes: string[];
  login: () => void;
  logout: () => void;
  hasRole: (role: UserRole) => boolean;
  hasScope: (scope: string) => boolean;
  isAdmin: boolean;
  isSetter: boolean;
}

function parseRoles(profile: unknown): UserRole[] {
  if (!profile || typeof profile !== 'object') return [];
  const roles = (profile as { roles?: unknown }).roles;
  if (!Array.isArray(roles)) return [];
  return roles.filter((r): r is UserRole => r === 'USER' || r === 'SETTER' || r === 'ADMIN');
}

function parseScopes(token: string | undefined): string[] {
  if (!token) return [];
  try {
    const payload = JSON.parse(atob(token.split('.')[1] ?? ''));
    const scope = payload.scope;
    if (typeof scope === 'string') return scope.split(' ');
    if (Array.isArray(payload.scopes)) return payload.scopes;
  } catch {
    /* ignore */
  }
  return [];
}

export function useAuth(): AuthState {
  const auth = useOidcAuth();

  const profile = auth.user?.profile;
  const roles = parseRoles(profile);
  const accessToken = auth.user?.access_token ?? null;
  const scopes = parseScopes(accessToken ?? undefined);

  return {
    isAuthenticated: !!auth.isAuthenticated,
    isLoading: auth.isLoading,
    token: accessToken,
    subject: (profile?.sub as string | undefined) ?? null,
    username: (profile?.preferred_username as string | undefined) ?? null,
    email: (profile?.email as string | undefined) ?? null,
    roles,
    scopes,
    login: () => {
      console.log('[auth] login() called, redirecting to OIDC provider');
      auth.signinRedirect().catch((e) => {
        console.error('[auth] signinRedirect failed:', e);
      });
    },
    logout: () => {
      // Limpia el storage del SDK y manda al endpoint de Authentik que cierra
      // la sesion server-side; el id_token_hint le dice quien somos para que
      // no pida confirmacion, y post_logout_redirect_uri trae el browser de
      // vuelta a la home del frontend.
      const idToken = auth.user?.id_token;
      try {
        window.sessionStorage.clear();
      } catch {
        /* ignore */
      }
      void auth.removeUser().finally(() => {
        auth
          .signoutRedirect({
            ...(idToken ? { id_token_hint: idToken } : {}),
            post_logout_redirect_uri: window.location.origin,
          })
          .catch(() => {
            window.location.href = '/';
          });
      });
    },
    hasRole: (role: UserRole) => roles.includes(role),
    hasScope: (scope: string) => scopes.includes(scope),
    isAdmin: roles.includes('ADMIN'),
    isSetter: roles.includes('SETTER') || roles.includes('ADMIN'),
  };
}
