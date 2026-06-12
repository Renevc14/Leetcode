import type { ProblemsRepository } from './application/problems-repository.js';
import { PrismaProblemsRepository } from './infrastructure/prisma/problems-repository.js';
import { prisma } from './lib/prisma.js';

export interface ProblemsContext {
  problemsRepository: ProblemsRepository;
}

export function createInitialContext(): ProblemsContext {
  return {
    problemsRepository: new PrismaProblemsRepository(prisma),
  };
}
