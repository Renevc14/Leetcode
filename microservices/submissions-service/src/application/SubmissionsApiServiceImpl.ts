import { randomUUID } from 'crypto';
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
} from '@leetcode/submissions-server-sdk';
import type { SubmissionsContext } from '../context.js';
import {
  ForbiddenError,
  NotFoundError,
  throwIfKnownServiceError,
  UnauthorizedError,
} from './errors.js';
import { mapUnexpectedError } from '../persistence/prisma/error-handlers.js';
import { judge } from './judge.js';
import {
  toGetSubmissionOutput,
  toListSubmissionsOutput,
  toRunCodeOutput,
  toSubmitOutput,
} from './submission-mapper.js';

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

  async RunCode(_input: RunCodeServerInput, ctx: SubmissionsContext): Promise<RunCodeServerOutput> {
    return this.handleErrors(() => {
      this.requireUserId(ctx);
      // Ephemeral execution: no persistence. A real judge would run asynchronously;
      // here we hand back a fresh id the client could poll, starting at PENDING.
      return Promise.resolve(toRunCodeOutput(randomUUID(), 'PENDING'));
    });
  }

  async Submit(input: SubmitServerInput, ctx: SubmissionsContext): Promise<SubmitServerOutput> {
    return this.handleErrors(async () => {
      const userId = this.requireUserId(ctx);
      const problemId = input.problemId!;
      const language = input.language!;
      const code = input.code!;

      const verdict = judge(code, language, problemId);

      const submission = await ctx.submissionsRepository.createSubmission({
        userId,
        problemId,
        contestId: input.contestId,
        language,
        code,
        status: verdict.status,
        timeMs: verdict.timeMs,
        memoryMb: verdict.memoryMb,
        errorMessage: verdict.errorMessage,
        judgedAt: new Date(),
        testCaseResults: verdict.testCaseResults,
      });

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
