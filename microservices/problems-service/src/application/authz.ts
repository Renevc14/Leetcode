import { ForbiddenError, UnauthorizedError } from './errors.js';
import type { AuthPrincipal } from '../auth/principal.js';

export const PROBLEMS_WRITE_SCOPE = 'problems:write';
export const PROBLEMS_ADMIN_SCOPE = 'problems:admin';
export const SUBMISSIONS_WRITE_SCOPE = 'submissions:write';

// Mapeo scope → roles que permiten el acceso. Authentik no siempre emite
// `scope` en el access token; aceptamos el role equivalente como fallback.
const SCOPE_TO_ROLES: Record<string, string[]> = {
  'problems:write': ['SETTER', 'ADMIN'],
  'problems:admin': ['ADMIN'],
  'submissions:write': ['USER', 'SETTER', 'ADMIN'],
  'submissions:read': ['USER', 'SETTER', 'ADMIN'],
};

export function requireScope(principal: AuthPrincipal | null, scope: string): void {
  if (principal === null) {
    throw new UnauthorizedError({ message: 'Authentication required.' });
  }
  if (principal.scopes.includes(scope)) return;
  const allowedRoles = SCOPE_TO_ROLES[scope] ?? [];
  if (principal.roles.some((r) => allowedRoles.includes(r))) return;
  throw new ForbiddenError({ message: 'Insufficient permissions.' });
}
