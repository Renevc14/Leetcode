import { ForbiddenError, UnauthorizedError } from './errors.js';
import type { AuthPrincipal } from '../auth/principal.js';

export const EXECUTOR_EXECUTE_SCOPE = 'executor:execute';

const ACCESS_ROLES = ['USER', 'SETTER', 'ADMIN'];

export function requireScope(principal: AuthPrincipal | null, scope: string): void {
  if (principal === null) {
    throw new UnauthorizedError({ message: 'Authentication required.' });
  }
  if (principal.scopes.includes(scope)) return;
  if (principal.roles.some((r) => ACCESS_ROLES.includes(r))) return;
  throw new ForbiddenError({ message: 'Insufficient permissions.' });
}
