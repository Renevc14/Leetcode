import { useAuth } from '@/auth/useAuth';
import type { SessionUser, UserRole } from '@/types';

interface LegacyState {
  token: string | null;
  user: SessionUser | null;
  login: () => void;
  logout: () => void;
}

function shape(auth: ReturnType<typeof useAuth>): LegacyState {
  const role: UserRole | undefined =
    auth.roles.find((r): r is UserRole => r === 'ADMIN' || r === 'SETTER' || r === 'USER') ??
    (auth.isAuthenticated ? 'USER' : undefined);
  const user: SessionUser | null = auth.subject
    ? {
        id: auth.subject,
        username: auth.username ?? auth.email ?? auth.subject,
        ...(auth.email !== null ? { email: auth.email } : {}),
        ...(role !== undefined ? { role } : {}),
      }
    : null;
  return {
    token: auth.token,
    user,
    login: auth.login,
    logout: auth.logout,
  };
}

export function useAuthStore<T = LegacyState>(selector?: (s: LegacyState) => T): T {
  const auth = useAuth();
  const s = shape(auth);
  return selector ? selector(s) : (s as unknown as T);
}
