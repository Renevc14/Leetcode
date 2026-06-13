import 'dotenv/config';
import type { IncomingMessage } from 'http';
import { ProblemsApiClient } from '@leetcode/problems-client-sdk';
import { ExecutorApiClient } from '@leetcode/executor-client-sdk';
import { Queue } from 'bullmq';
import { prisma } from './persistence/prisma/client.js';
import { PrismaSubmissionsRepository } from './persistence/prisma/submissions-repository.js';
import type { SubmissionsRepository } from './application/submissions-repository.js';

export interface SubmissionsContext {
  submissionsRepository: SubmissionsRepository;
  problemsClient: ProblemsApiClient;
  executorClient: ExecutorApiClient;
  judgeQueue: Queue;
  currentUserId: string | null;
}

const submissionsRepository = new PrismaSubmissionsRepository(prisma);

const problemsClient = new ProblemsApiClient({
  endpoint: process.env['PROBLEMS_URL'] ?? 'http://localhost:3001',
});

const executorClient = new ExecutorApiClient({
  endpoint: process.env['EXECUTOR_URL'] ?? 'http://localhost:3005',
});

// Inject the shared secret into every request sent to the executor
executorClient.middlewareStack.add(
  (next) => async (args) => {
    const request = args.request as { headers?: Record<string, string> };
    request.headers ??= {};
    request.headers['x-executor-secret'] = process.env['EXECUTOR_SHARED_SECRET'] ?? '';
    return next(args);
  },
  { step: 'build', name: 'executorSharedSecret' },
);

const judgeQueue = new Queue('submissions-judge', {
  connection: { url: process.env['REDIS_URL'] ?? 'redis://localhost:6379' },
});

function extractUserId(req: IncomingMessage): string | null {
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

export function createRequestContext(req: IncomingMessage): SubmissionsContext {
  return {
    submissionsRepository,
    problemsClient,
    executorClient,
    judgeQueue,
    currentUserId: extractUserId(req),
  };
}
