import {
  type GetSubmissionServerInput,
  type GetSubmissionServerOutput,
  type ListSubmissionsServerInput,
  type ListSubmissionsServerOutput,
  type RunCodeServerInput,
  type RunCodeServerOutput,
  type SubmissionsApiService,
  type SubmitServerInput,
  type SubmitServerOutput,
  type SubmissionStatus,
} from '@leetcode/submissions-server-sdk';
import { GetProblemCommand, type TestCaseOutput } from '@leetcode/problems-client-sdk';
import { ExecuteCommand, type ExecutionStatus } from '@leetcode/executor-client-sdk';
import type { SubmissionsContext } from '../context.js';
import {
  ForbiddenError,
  NotFoundError,
  throwIfKnownServiceError,
  UnauthorizedError,
} from './errors.js';
import { mapUnexpectedError } from '../persistence/prisma/error-handlers.js';
import {
  toGetSubmissionOutput,
  toListSubmissionsOutput,
  toRunCodeOutput,
  toSubmitOutput,
} from './submission-mapper.js';

// Both SDKs use the same string values for Language/Status; the casts below are safe.
function toExecutorStatus(s: ExecutionStatus): SubmissionStatus {
  return s;
}

export class SubmissionsApiServiceImpl implements SubmissionsApiService<SubmissionsContext> {
  constructor() {
    this.RunCode = this.RunCode.bind(this);
    this.Submit = this.Submit.bind(this);
    this.GetSubmission = this.GetSubmission.bind(this);
    this.ListSubmissions = this.ListSubmissions.bind(this);
  }

  private async handleErrors<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (error: unknown) {
      throwIfKnownServiceError(error);
      mapUnexpectedError(error);
    }
  }

  private requireUserId(ctx: SubmissionsContext): string {
    if (!ctx.currentUserId) {
      throw new UnauthorizedError({ message: 'Authentication required.' });
    }
    return ctx.currentUserId;
  }

  async RunCode(input: RunCodeServerInput, ctx: SubmissionsContext): Promise<RunCodeServerOutput> {
    return this.handleErrors(async () => {
      this.requireUserId(ctx);

      const problemId = input.problemId!;
      const language = input.language!;
      const code = input.code!;

      const problem = await ctx.problemsClient.send(new GetProblemCommand({ problemId }));

      const sampleCases = (problem.testCases ?? []).filter(
        (tc: TestCaseOutput) => tc.isSample === true,
      );

      const result = await ctx.executorClient.send(
        new ExecuteCommand({
          language: language,
          code,
          limits: {
            timeLimitMs: problem.timeLimitMs ?? 1000,
            memoryLimitMb: problem.memoryLimitMb ?? 256,
          },
          testCases: sampleCases.map((tc: TestCaseOutput) => ({
            testCaseId: tc.id!,
            input: tc.input!,
            expectedOutput: tc.expectedOutput!,
          })),
        }),
      );

      return toRunCodeOutput({
        status: toExecutorStatus(result.status!),
        timeMs: result.timeMs,
        memoryMb: result.memoryMb,
        errorMessage: result.errorMessage,
        testCaseResults: (result.testCaseResults ?? []).map((r) => ({
          testCaseId: r.testCaseId!,
          status: toExecutorStatus(r.status!),
          executionTimeMs: r.executionTimeMs,
          memoryUsageMb: r.memoryUsageMb,
          actualOutput: r.actualOutput,
        })),
      });
    });
  }

  async Submit(input: SubmitServerInput, ctx: SubmissionsContext): Promise<SubmitServerOutput> {
    return this.handleErrors(async () => {
      const userId = this.requireUserId(ctx);

      const submission = await ctx.submissionsRepository.createPendingSubmission({
        userId,
        problemId: input.problemId!,
        contestId: input.contestId,
        language: input.language!,
        code: input.code!,
      });

      await ctx.judgeQueue.add(
        'judge',
        { submissionId: submission.id },
        { jobId: submission.id, attempts: 3, backoff: { type: 'exponential', delay: 2000 } },
      );

      return toSubmitOutput(submission);
    });
  }

  async GetSubmission(
    input: GetSubmissionServerInput,
    ctx: SubmissionsContext,
  ): Promise<GetSubmissionServerOutput> {
    return this.handleErrors(async () => {
      const userId = this.requireUserId(ctx);
      const submissionId = input.submissionId!;

      const submission = await ctx.submissionsRepository.findById(submissionId);
      if (!submission) {
        throw new NotFoundError({ message: `Submission '${submissionId}' not found.` });
      }
      if (submission.userId !== userId) {
        throw new ForbiddenError({ message: 'You do not have access to this submission.' });
      }

      return toGetSubmissionOutput(submission);
    });
  }

  async ListSubmissions(
    input: ListSubmissionsServerInput,
    ctx: SubmissionsContext,
  ): Promise<ListSubmissionsServerOutput> {
    return this.handleErrors(async () => {
      const userId = this.requireUserId(ctx);

      const result = await ctx.submissionsRepository.list({
        userId,
        problemId: input.problemId,
        contestId: input.contestId,
        status: input.status,
        cursor: input.cursor,
        limit: input.limit,
      });

      return toListSubmissionsOutput(result);
    });
  }
}
