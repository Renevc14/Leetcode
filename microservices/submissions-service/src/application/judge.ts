import type { SubmissionStatus } from '@leetcode/submissions-server-sdk';
import type { TestCaseResultItem } from '../domain/submission.js';

export interface JudgeVerdict {
  status: SubmissionStatus;
  timeMs: number | undefined;
  memoryMb: number | undefined;
  errorMessage: string | undefined;
  testCaseResults: TestCaseResultItem[];
}
