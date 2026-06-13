import type { Language, SubmissionStatus } from '@leetcode/submissions-server-sdk';
import type {
  SubmissionAggregate,
  SubmissionSummaryItem,
  TestCaseResultItem,
} from '../domain/submission.js';

export interface CreatePendingSubmissionInput {
  userId: string;
  problemId: string;
  contestId: string | undefined;
  language: Language;
  code: string;
}

export interface UpdateVerdictInput {
  submissionId: string;
  status: SubmissionStatus;
  timeMs: number | undefined;
  memoryMb: number | undefined;
  errorMessage: string | undefined;
  judgedAt: Date;
  testCaseResults: TestCaseResultItem[];
}

export interface ListSubmissionsFilter {
  userId: string;
  problemId?: string | undefined;
  contestId?: string | undefined;
  status?: SubmissionStatus | undefined;
  cursor?: string | undefined;
  limit?: number | undefined;
}

export interface ListSubmissionsResult {
  items: SubmissionSummaryItem[];
  nextCursor: string | undefined;
}

export interface SubmissionsRepository {
  createPendingSubmission(input: CreatePendingSubmissionInput): Promise<SubmissionAggregate>;
  updateVerdict(input: UpdateVerdictInput): Promise<void>;
  findById(id: string): Promise<SubmissionAggregate | null>;
  list(filter: ListSubmissionsFilter): Promise<ListSubmissionsResult>;
}
