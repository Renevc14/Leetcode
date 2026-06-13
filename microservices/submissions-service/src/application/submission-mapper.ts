import type {
  GetSubmissionServerOutput,
  ListSubmissionsServerOutput,
  RunCodeServerOutput,
  SubmitServerOutput,
} from '@leetcode/submissions-server-sdk';
import type { SubmissionAggregate } from '../domain/submission.js';
import type { JudgeVerdict } from './judge.js';
import type { ListSubmissionsResult } from './submissions-repository.js';

export function toSubmitOutput(submission: SubmissionAggregate): SubmitServerOutput {
  return {
    submissionId: submission.id,
    status: submission.status,
  };
}

export function toRunCodeOutput(verdict: JudgeVerdict): RunCodeServerOutput {
  return {
    status: verdict.status,
    timeMs: verdict.timeMs,
    memoryMb: verdict.memoryMb,
    errorMessage: verdict.errorMessage,
    testCaseResults: verdict.testCaseResults.map((result) => ({
      testCaseId: result.testCaseId,
      status: result.status,
      executionTimeMs: result.executionTimeMs,
      memoryUsageMb: result.memoryUsageMb,
      actualOutput: result.actualOutput,
    })),
  };
}

export function toGetSubmissionOutput(submission: SubmissionAggregate): GetSubmissionServerOutput {
  return {
    id: submission.id,
    problemId: submission.problemId,
    userId: submission.userId,
    contestId: submission.contestId,
    language: submission.language,
    code: submission.code,
    status: submission.status,
    timeMs: submission.timeMs,
    memoryMb: submission.memoryMb,
    errorMessage: submission.errorMessage,
    submittedAt: submission.submittedAt,
    judgedAt: submission.judgedAt,
    testCaseResults: submission.testCaseResults.map((result) => ({
      testCaseId: result.testCaseId,
      status: result.status,
      executionTimeMs: result.executionTimeMs,
      memoryUsageMb: result.memoryUsageMb,
      actualOutput: result.actualOutput,
    })),
  };
}

export function toListSubmissionsOutput(
  result: ListSubmissionsResult,
): ListSubmissionsServerOutput {
  return {
    items: result.items.map((item) => ({
      id: item.id,
      problemId: item.problemId,
      userId: item.userId,
      contestId: item.contestId,
      language: item.language,
      status: item.status,
      timeMs: item.timeMs,
      memoryMb: item.memoryMb,
      submittedAt: item.submittedAt,
      judgedAt: item.judgedAt,
    })),
    nextCursor: result.nextCursor,
  };
}
