import { ForbiddenError, UnauthorizedError } from './errors.js';
import type { AuthPrincipal } from '../auth/principal.js';

export const CONTESTS_WRITE_SCOPE = 'contests:write';
export const CONTESTS_PARTICIPATE_SCOPE = 'contests:participate';

export function requireScope(principal: AuthPrincipal | null, scope: string): void {
  if (principal === null) {
    throw new UnauthorizedError({ message: 'Authentication required.' });
  }
  if (!principal.scopes.includes(scope)) {
    throw new ForbiddenError({ message: 'Insufficient permissions.' });
  }
}
