import { ForbiddenError, UnauthorizedError } from './errors.js';
import type { AuthPrincipal } from '../auth/principal.js';

export const SUBMISSIONS_READ_SCOPE = 'submissions:read';
export const SUBMISSIONS_WRITE_SCOPE = 'submissions:write';

export function requireScope(principal: AuthPrincipal | null, scope: string): void {
  if (principal === null) {
    throw new UnauthorizedError({ message: 'Authentication required.' });
  }
  if (!principal.scopes.includes(scope)) {
    throw new ForbiddenError({ message: 'Insufficient permissions.' });
  }
}
