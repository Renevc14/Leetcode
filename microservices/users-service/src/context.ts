import type { IncomingMessage } from 'http';
import { prisma } from './persistence/prisma/client.js';
import { PrismaUsersRepository } from './persistence/prisma/users-repository.js';
import type { UsersRepository } from './application/users-repository.js';

export interface UsersContext {
  usersRepository: UsersRepository;
  currentAuthentikId: string | null;
}

const usersRepository = new PrismaUsersRepository(prisma);

function extractAuthentikId(req: IncomingMessage): string | null {
  const authHeader = req.headers['authorization'];
  if (!authHeader?.startsWith('Bearer ')) return null;

  const token = authHeader.slice(7);
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const encodedPayload = parts[1];
    if (!encodedPayload) return null;
    const payload = JSON.parse(
      Buffer.from(encodedPayload, 'base64url').toString('utf-8'),
    ) as Record<string, unknown>;
    const sub = payload['sub'];
    return typeof sub === 'string' && sub.length > 0 ? sub : null;
  } catch {
    return null;
  }
}

export function createRequestContext(req: IncomingMessage): UsersContext {
  return {
    usersRepository,
    currentAuthentikId: extractAuthentikId(req),
  };
}
