import type { IncomingMessage } from 'http';
import { prisma } from './persistence/prisma/client.js';
import { PrismaUsersRepository } from './persistence/prisma/users-repository.js';
import type { UsersRepository } from './application/users-repository.js';
import type { AuthPrincipal } from './auth/principal.js';
import { extractPrincipal } from './auth/principal.js';

export interface UsersContext {
  usersRepository: UsersRepository;
  principal: AuthPrincipal | null;
}

const usersRepository = new PrismaUsersRepository(prisma);

export async function createRequestContext(req: IncomingMessage): Promise<UsersContext> {
  return {
    usersRepository,
    principal: await extractPrincipal(req),
  };
}
