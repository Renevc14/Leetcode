import 'dotenv/config';
import type { IncomingMessage } from 'http';
import { ProblemsApiClient } from '@leetcode/problems-client-sdk';
import { ExecutorApiClient } from '@leetcode/executor-client-sdk';
import { Queue } from 'bullmq';
import { prisma } from './persistence/prisma/client.js';
import { PrismaSubmissionsRepository } from './persistence/prisma/submissions-repository.js';
import type { SubmissionsRepository } from './application/submissions-repository.js';
import type { AuthPrincipal } from './auth/principal.js';
import { extractPrincipal } from './auth/principal.js';

export interface SubmissionsContext {
  submissionsRepository: SubmissionsRepository;
  problemsClient: ProblemsApiClient;
  executorClient: ExecutorApiClient;
  judgeQueue: Queue;
  principal: AuthPrincipal | null;
}

const submissionsRepository = new PrismaSubmissionsRepository(prisma);

const PROBLEMS_URL = process.env['PROBLEMS_URL'] ?? 'http://localhost:3001';
const EXECUTOR_URL = process.env['EXECUTOR_URL'] ?? 'http://localhost:3005';

const judgeQueue = new Queue('submissions-judge', {
  connection: { url: process.env['REDIS_URL'] ?? 'redis://localhost:6379' },
});

export async function createRequestContext(req: IncomingMessage): Promise<SubmissionsContext> {
  const principal = await extractPrincipal(req);
  const tokenConfig = principal?.token ? { token: { token: principal.token } } : {};

  return {
    submissionsRepository,
    problemsClient: new ProblemsApiClient({ endpoint: PROBLEMS_URL, ...tokenConfig }),
    executorClient: new ExecutorApiClient({ endpoint: EXECUTOR_URL, ...tokenConfig }),
    judgeQueue,
    principal,
  };
}
