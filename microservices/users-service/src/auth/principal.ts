import type { IncomingMessage } from 'http';

export interface AuthPrincipal {
  subject: string;
  scopes: string[];
}

function parseScopes(payload: Record<string, unknown>): string[] {
  const scope = payload['scope'];
  if (typeof scope === 'string' && scope.length > 0) {
    return scope.split(' ');
  }
  const scp = payload['scp'] ?? payload['scopes'];
  if (Array.isArray(scp)) {
    return scp.filter((s): s is string => typeof s === 'string');
  }
  return [];
}

export function extractPrincipal(req: IncomingMessage): AuthPrincipal | null {
  const authHeader = req.headers['authorization'];
  if (!authHeader?.startsWith('Bearer ')) return null;

  const token = authHeader.slice('Bearer '.length).trim();
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const encodedPayload = parts[1];
    if (!encodedPayload) return null;
    const payload = JSON.parse(
      Buffer.from(encodedPayload, 'base64url').toString('utf-8'),
    ) as Record<string, unknown>;
    const sub = payload['sub'];
    if (typeof sub !== 'string' || sub.length === 0) return null;
    return { subject: sub, scopes: parseScopes(payload) };
  } catch {
    return null;
  }
}

export function hasScope(principal: AuthPrincipal | null, scope: string): boolean {
  return principal !== null && principal.scopes.includes(scope);
}
