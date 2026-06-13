import type { Language, SubmissionStatus } from '@leetcode/submissions-server-sdk';
import type { TestCaseResultItem } from '../domain/submission.js';

export interface JudgeVerdict {
  status: SubmissionStatus;
  timeMs: number | undefined;
  memoryMb: number | undefined;
  errorMessage: string | undefined;
  testCaseResults: TestCaseResultItem[];
}

/**
 * Stub judge: synchronously produces a verdict without executing any code.
 *
 * This is the single seam to replace with a real code-execution/judge service.
 * It currently returns a deterministic ACCEPTED verdict with a couple of
 * synthetic public test-case results so that the rest of the service (Submit,
 * GetSubmission, ListSubmissions) can return judged data end to end.
 */
export function judge(_code: string, _language: Language, _problemId: string): JudgeVerdict {
  const testCaseResults: TestCaseResultItem[] = [
    {
      testCaseId: '11111111-1111-4111-8111-111111111111',
      status: 'ACCEPTED',
      executionTimeMs: 12,
      memoryUsageMb: 8,
      actualOutput: 'ok',
    },
    {
      testCaseId: '22222222-2222-4222-8222-222222222222',
      status: 'ACCEPTED',
      executionTimeMs: 15,
      memoryUsageMb: 9,
      actualOutput: 'ok',
    },
  ];

  return {
    status: 'ACCEPTED',
    timeMs: 27,
    memoryMb: 9,
    errorMessage: undefined,
    testCaseResults,
  };
}
