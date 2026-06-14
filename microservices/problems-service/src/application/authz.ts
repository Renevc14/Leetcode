import { ForbiddenError, UnauthorizedError } from './errors.js';
import type { AuthPrincipal } from '../auth/principal.js';

export const PROBLEMS_WRITE_SCOPE = 'problems:write';
export const PROBLEMS_ADMIN_SCOPE = 'problems:admin';

export function requireScope(principal: AuthPrincipal | null, scope: string): void {
  if (principal === null) {
    throw new UnauthorizedError({ message: 'Authentication required.' });
  }
  if (!principal.scopes.includes(scope)) {
    throw new ForbiddenError({ message: 'Insufficient permissions.' });
  }
}
