import { ForbiddenError, UnauthorizedError } from './errors.js';
import type { AuthPrincipal } from '../auth/principal.js';

export const SUBMISSIONS_READ_SCOPE = 'submissions:read';
export const SUBMISSIONS_WRITE_SCOPE = 'submissions:write';

// Roles que dan acceso "estandar" al API. Authentik no siempre emite el claim
// `scope` en el access token segun la version, por eso aceptamos roles tambien.
const ACCESS_ROLES = ['USER', 'SETTER', 'ADMIN'];

export function requireScope(principal: AuthPrincipal | null, scope: string): void {
  if (principal === null) {
    throw new UnauthorizedError({ message: 'Authentication required.' });
  }
  if (principal.scopes.includes(scope)) return;
  if (principal.roles.some((r) => ACCESS_ROLES.includes(r))) return;
  throw new ForbiddenError({ message: 'Insufficient permissions.' });
}
