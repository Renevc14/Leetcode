import { UnauthorizedError } from './errors.js';
import type { AuthPrincipal } from '../auth/principal.js';

export function requireAuth(principal: AuthPrincipal | null): string {
  if (principal === null) {
    throw new UnauthorizedError({ message: 'Authentication required.' });
  }
  return principal.subject;
}
