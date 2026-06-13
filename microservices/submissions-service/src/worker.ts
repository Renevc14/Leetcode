import 'dotenv/config';
import { Worker } from 'bullmq';
import { GetProblemCommand, type TestCaseOutput } from '@leetcode/problems-client-sdk';
import { ExecuteCommand, type ExecutionStatus } from '@leetcode/executor-client-sdk';
import type { SubmissionStatus } from '@leetcode/submissions-server-sdk';
import { ProblemsApiClient } from '@leetcode/problems-client-sdk';
import { ExecutorApiClient } from '@leetcode/executor-client-sdk';
import { prisma } from './persistence/prisma/client.js';
import { PrismaSubmissionsRepository } from './persistence/prisma/submissions-repository.js';

const REDIS_URL = process.env['REDIS_URL'] ?? 'redis://localhost:6379';
const EXECUTOR_URL = process.env['EXECUTOR_URL'] ?? 'http://localhost:3005';
const EXECUTOR_SHARED_SECRET = process.env['EXECUTOR_SHARED_SECRET'] ?? '';
const PROBLEMS_URL = process.env['PROBLEMS_URL'] ?? 'http://localhost:3001';
const WORKER_CONCURRENCY = parseInt(process.env['WORKER_CONCURRENCY'] ?? '4', 10);

const repository = new PrismaSubmissionsRepository(prisma);

const problemsClient = new ProblemsApiClient({ endpoint: PROBLEMS_URL });

const executorClient = new ExecutorApiClient({ endpoint: EXECUTOR_URL });
executorClient.middlewareStack.add(
  (next) => async (args) => {
    const request = args.request as { headers?: Record<string, string> };
    request.headers ??= {};
    request.headers['x-executor-secret'] = EXECUTOR_SHARED_SECRET;
    return next(args);
  },
  { step: 'build', name: 'executorSharedSecret' },
);

function toSubmissionStatus(s: ExecutionStatus): SubmissionStatus {
  return s;
}

interface JudgeJobData {
  submissionId: string;
}

const worker = new Worker<JudgeJobData>(
  'submissions-judge',
  async (job) => {
    const { submissionId } = job.data;

    const submission = await repository.findById(submissionId);
    if (!submission) {
      throw new Error(`Submission not found: ${submissionId}`);
    }

    const problem = await problemsClient.send(
      new GetProblemCommand({ problemId: submission.problemId, allTestCases: true }),
    );

    const allCases = problem.testCases ?? [];
    const result = await executorClient.send(
      new ExecuteCommand({
        language: submission.language,
        code: submission.code,
        limits: {
          timeLimitMs: problem.timeLimitMs ?? 1000,
          memoryLimitMb: problem.memoryLimitMb ?? 256,
        },
        testCases: allCases.map((tc: TestCaseOutput) => ({
          testCaseId: tc.id!,
          input: tc.input!,
          expectedOutput: tc.expectedOutput!,
        })),
      }),
    );

    await repository.updateVerdict({
      submissionId,
      status: toSubmissionStatus(result.status!),
      timeMs: result.timeMs,
      memoryMb: result.memoryMb,
      errorMessage: result.errorMessage,
      judgedAt: new Date(),
      testCaseResults: (result.testCaseResults ?? []).map((r) => ({
        testCaseId: r.testCaseId!,
        status: toSubmissionStatus(r.status!),
        executionTimeMs: r.executionTimeMs,
        memoryUsageMb: r.memoryUsageMb,
        actualOutput: r.actualOutput,
      })),
    });
  },
  {
    connection: { url: REDIS_URL },
    concurrency: WORKER_CONCURRENCY,
  },
);

worker.on('completed', (job) => {
  console.log(`[judge-worker] Submission ${job.data.submissionId} judged`);
});

worker.on('failed', (job, err) => {
  const id = job?.data.submissionId ?? '(unknown)';
  console.error(`[judge-worker] Job failed for submission ${id}:`, err);

  // If all retries exhausted, mark the submission as a runtime error so it doesn't hang in PENDING
  if ((job?.attemptsMade ?? 0) >= (job?.opts.attempts ?? 1)) {
    repository
      .updateVerdict({
        submissionId: id,
        status: 'RUNTIME_ERROR',
        timeMs: undefined,
        memoryMb: undefined,
        errorMessage: 'Internal error: judgment could not be completed.',
        judgedAt: new Date(),
        testCaseResults: [],
      })
      .catch((e: unknown) => {
        console.error(`[judge-worker] Failed to mark submission as RUNTIME_ERROR:`, e);
      });
  }
});

console.log('[judge-worker] Started, waiting for jobs...');
