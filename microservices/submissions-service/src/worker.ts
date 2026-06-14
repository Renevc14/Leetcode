import 'dotenv/config';
import { Worker } from 'bullmq';
import { GetProblemCommand, type TestCaseOutput } from '@leetcode/problems-client-sdk';
import { ExecuteCommand, type ExecutionStatus } from '@leetcode/executor-client-sdk';
import type { SubmissionStatus } from '@leetcode/submissions-server-sdk';
import { ProblemsApiClient } from '@leetcode/problems-client-sdk';
import { ExecutorApiClient } from '@leetcode/executor-client-sdk';
import { UsersApiClient, RecordProblemStatusCommand } from '@leetcode/users-client-sdk';
import { prisma } from './persistence/prisma/client.js';
import { PrismaSubmissionsRepository } from './persistence/prisma/submissions-repository.js';

const REDIS_URL = process.env['REDIS_URL'] ?? 'redis://localhost:6379';
const EXECUTOR_URL = process.env['EXECUTOR_URL'] ?? 'http://localhost:3005';
const PROBLEMS_URL = process.env['PROBLEMS_URL'] ?? 'http://localhost:3001';
const USERS_URL = process.env['USERS_URL'] ?? 'http://localhost:3004';
const WORKER_CONCURRENCY = parseInt(process.env['WORKER_CONCURRENCY'] ?? '4', 10);

const repository = new PrismaSubmissionsRepository(prisma);

function toSubmissionStatus(s: ExecutionStatus): SubmissionStatus {
  return s;
}

interface JudgeJobData {
  submissionId: string;
  token: string;
}

const worker = new Worker<JudgeJobData>(
  'submissions-judge',
  async (job) => {
    const { submissionId, token } = job.data;

    const tokenIdentity = { token };
    const problemsClient = new ProblemsApiClient({ endpoint: PROBLEMS_URL, token: tokenIdentity });
    const executorClient = new ExecutorApiClient({ endpoint: EXECUTOR_URL, token: tokenIdentity });

    const submission = await repository.findById(submissionId);
    if (!submission) {
      throw new Error(`Submission not found: ${submissionId}`);
    }

    const problem = await problemsClient.send(
      new GetProblemCommand({ problemId: submission.problemId, allTestCases: true }),
    );

    const allCases = problem.testCases ?? [];
    const cmd = new ExecuteCommand({
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
    });
    const result = await executorClient.send(cmd);

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

    const problemStatus = result.status === 'ACCEPTED' ? 'SOLVED' : 'ATTEMPTED';
    const usersClient = new UsersApiClient({ endpoint: USERS_URL, token: tokenIdentity });
    console.log(tokenIdentity);
    await usersClient
      .send(
        new RecordProblemStatusCommand({ problemId: submission.problemId, status: problemStatus }),
      )
      .catch((err: unknown) => {
        console.error(
          `[judge-worker] Failed to record problem status for submission ${submissionId}:`,
          err,
        );
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
