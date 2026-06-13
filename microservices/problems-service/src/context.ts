import type { ProblemsRepository } from './application/problems-repository.js';
import { PrismaProblemsRepository } from './persistence/prisma/problems-repository.js';
import { prisma } from './persistence/prisma/client.js';

export interface ProblemsContext {
  problemsRepository: ProblemsRepository;
}

export function createInitialContext(): ProblemsContext {
  return {
    problemsRepository: new PrismaProblemsRepository(prisma),
  };
}
