import type { Language, SubmissionStatus } from '@leetcode/submissions-server-sdk';

export interface TestCaseResultItem {
  testCaseId: string;
  status: SubmissionStatus;
  executionTimeMs: number | undefined;
  memoryUsageMb: number | undefined;
  actualOutput: string | undefined;
}

export interface SubmissionAggregate {
  id: string;
  problemId: string;
  userId: string;
  contestId: string | undefined;
  language: Language;
  code: string;
  status: SubmissionStatus;
  timeMs: number | undefined;
  memoryMb: number | undefined;
  errorMessage: string | undefined;
  submittedAt: Date;
  judgedAt: Date | undefined;
  testCaseResults: TestCaseResultItem[];
}

export interface SubmissionSummaryItem {
  id: string;
  problemId: string;
  userId: string;
  contestId: string | undefined;
  language: Language;
  status: SubmissionStatus;
  timeMs: number | undefined;
  memoryMb: number | undefined;
  submittedAt: Date;
  judgedAt: Date | undefined;
}
