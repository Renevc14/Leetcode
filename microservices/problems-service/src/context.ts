import 'dotenv/config';
import type { IncomingMessage } from 'http';
import { UsersApiClient } from '@leetcode/users-client-sdk';
import type { ProblemsRepository } from './application/problems-repository.js';
import { PrismaProblemsRepository } from './persistence/prisma/problems-repository.js';
import { prisma } from './persistence/prisma/client.js';
import type { AuthPrincipal } from './auth/principal.js';
import { extractPrincipal } from './auth/principal.js';

export interface ProblemsContext {
  problemsRepository: ProblemsRepository;
  usersClient: UsersApiClient;
  principal: AuthPrincipal | null;
}

const problemsRepository: ProblemsRepository = new PrismaProblemsRepository(prisma);

const USERS_URL = process.env['USERS_URL'] ?? 'http://localhost:3004';

export function createRequestContext(req: IncomingMessage): ProblemsContext {
  const principal = extractPrincipal(req);
  const tokenConfig = principal?.token ? { token: { token: principal.token } } : {};

  return {
    problemsRepository,
    usersClient: new UsersApiClient({ endpoint: USERS_URL, ...tokenConfig }),
    principal,
  };
}
