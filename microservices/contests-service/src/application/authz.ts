import { ForbiddenError, UnauthorizedError } from './errors.js';
import type { AuthPrincipal } from '../auth/principal.js';

export const CONTESTS_WRITE_SCOPE = 'contests:write';
export const CONTESTS_PARTICIPATE_SCOPE = 'contests:participate';

const SCOPE_TO_ROLES: Record<string, string[]> = {
  'contests:write': ['SETTER', 'ADMIN'],
  'contests:manage': ['ADMIN'],
  'contests:participate': ['USER', 'SETTER', 'ADMIN'],
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
