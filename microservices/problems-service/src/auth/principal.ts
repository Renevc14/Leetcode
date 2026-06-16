import type { IncomingMessage } from 'http';
import { createRemoteJWKSet, jwtVerify, decodeJwt } from 'jose';

export interface AuthPrincipal {
  subject: string;
  scopes: string[];
  roles: string[];
  email?: string;
  name?: string;
  token: string;
}

const JWKS_URL = process.env['AUTH_JWKS_URL'];
const JWT_ISSUER = process.env['AUTH_JWT_ISSUER'];
const SKIP_JWT_VERIFY = process.env['AUTH_SKIP_VERIFY'] === 'true';

const jwks = JWKS_URL && !SKIP_JWT_VERIFY ? createRemoteJWKSet(new URL(JWKS_URL)) : null;

function parseScopes(payload: Record<string, unknown>): string[] {
  const scope = payload['scope'];
  if (typeof scope === 'string' && scope.length > 0) return scope.split(' ');
  const scp = payload['scp'] ?? payload['scopes'];
  if (Array.isArray(scp)) return scp.filter((s): s is string => typeof s === 'string');
  return [];
}

function parseRoles(payload: Record<string, unknown>): string[] {
  const roles = payload['roles'];
  if (Array.isArray(roles)) return roles.filter((r): r is string => typeof r === 'string');
  return [];
}

function buildPrincipal(payload: Record<string, unknown>, token: string): AuthPrincipal | null {
  const sub = payload['sub'];
  if (typeof sub !== 'string' || sub.length === 0) return null;
  const principal: AuthPrincipal = {
    subject: sub,
    scopes: parseScopes(payload),
    roles: parseRoles(payload),
    token,
  };
  if (typeof payload['email'] === 'string') principal.email = payload['email'];
  if (typeof payload['name'] === 'string') principal.name = payload['name'];
  return principal;
}

export async function extractPrincipal(req: IncomingMessage): Promise<AuthPrincipal | null> {
  const authHeader = req.headers['authorization'];
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice('Bearer '.length).trim();

  if (jwks) {
    try {
      const { payload } = await jwtVerify(token, jwks, JWT_ISSUER ? { issuer: JWT_ISSUER } : {});
      return buildPrincipal(payload, token);
    } catch {
      return null;
    }
  }

  try {
    const payload = decodeJwt(token) as Record<string, unknown>;
    return buildPrincipal(payload, token);
  } catch {
    return null;
  }
}

// Mapeo scope -> roles que lo cubren. Authentik no siempre emite el claim
// `scope` en el access token; aceptamos el role equivalente como fallback.
const SCOPE_TO_ROLES: Record<string, string[]> = {
  'problems:write': ['SETTER', 'ADMIN'],
  'problems:admin': ['ADMIN'],
  'submissions:write': ['USER', 'SETTER', 'ADMIN'],
  'submissions:read': ['USER', 'SETTER', 'ADMIN'],
};

export function hasScope(principal: AuthPrincipal | null, scope: string): boolean {
  if (principal === null) return false;
  if (principal.scopes.includes(scope)) return true;
  const allowedRoles = SCOPE_TO_ROLES[scope] ?? [];
  return principal.roles.some((r) => allowedRoles.includes(r));
}

export function hasRole(principal: AuthPrincipal | null, role: string): boolean {
  return principal !== null && principal.roles.includes(role);
}
