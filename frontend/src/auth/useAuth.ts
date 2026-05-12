import { useAuth as useOidcAuth } from 'react-oidc-context';

export type Role = 'USER' | 'SETTER' | 'ADMIN';

export function useAuth() {
  const oidc = useOidcAuth();
  const profile = oidc.user?.profile as { roles?: string[] } | undefined;
  const roles = (profile?.roles ?? []) as Role[];

  return {
    ...oidc,
    roles,
    hasRole: (role: Role) => roles.includes(role),
    hasAnyRole: (...needed: Role[]) => needed.some((r) => roles.includes(r)),
  };
}
