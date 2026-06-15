import 'dotenv/config';
import type { IncomingMessage } from 'http';
import { ProblemsApiClient } from '@leetcode/problems-client-sdk';
import { UsersApiClient } from '@leetcode/users-client-sdk';
import type { ContestsRepository } from './application/contests-repository.js';
import { PrismaContestsRepository } from './persistence/prisma/contests-repository.js';
import { prisma } from './persistence/prisma/client.js';
import type { AuthPrincipal } from './auth/principal.js';
import { extractPrincipal } from './auth/principal.js';

export interface ContestsContext {
  contestsRepository: ContestsRepository;
  problemsClient: ProblemsApiClient;
  usersClient: UsersApiClient;
  principal: AuthPrincipal | null;
}

const contestsRepository: ContestsRepository = new PrismaContestsRepository(prisma);

const PROBLEMS_URL = process.env['PROBLEMS_URL'] ?? 'http://localhost:3001';
const USERS_URL = process.env['USERS_URL'] ?? 'http://localhost:3004';

export async function createRequestContext(req: IncomingMessage): Promise<ContestsContext> {
  const principal = await extractPrincipal(req);
  const tokenConfig = principal?.token ? { token: { token: principal.token } } : {};

  return {
    contestsRepository,
    problemsClient: new ProblemsApiClient({ endpoint: PROBLEMS_URL, ...tokenConfig }),
    usersClient: new UsersApiClient({ endpoint: USERS_URL, ...tokenConfig }),
    principal,
  };
}
