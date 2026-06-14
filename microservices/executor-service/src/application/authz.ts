import { ForbiddenError, UnauthorizedError } from './errors.js';
import type { AuthPrincipal } from '../auth/principal.js';

export const EXECUTOR_EXECUTE_SCOPE = 'executor:execute';

export function requireScope(principal: AuthPrincipal | null, scope: string): void {
  if (principal === null) {
    throw new UnauthorizedError({ message: 'Authentication required.' });
  }
  if (!principal.scopes.includes(scope)) {
    throw new ForbiddenError({ message: 'Insufficient permissions.' });
  }
}
