import type { IncomingMessage } from 'http';
import type { ProblemsRepository } from './application/problems-repository.js';
import { PrismaProblemsRepository } from './persistence/prisma/problems-repository.js';
import { prisma } from './persistence/prisma/client.js';
import type { AuthPrincipal } from './auth/principal.js';
import { extractPrincipal } from './auth/principal.js';

export interface ProblemsContext {
  problemsRepository: ProblemsRepository;
  principal: AuthPrincipal | null;
}

const problemsRepository: ProblemsRepository = new PrismaProblemsRepository(prisma);

export function createRequestContext(req: IncomingMessage): ProblemsContext {
  return {
    problemsRepository,
    principal: extractPrincipal(req),
  };
}
