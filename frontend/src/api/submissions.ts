import { api } from './client';
import type { Language, Paginated, Submission, SubmissionCode, Verdict } from '@/types';

export interface SubmissionInput {
  problemId: string;
  language: Language;
  sourceCode: string;
  contestId?: string;
}

export interface SubmissionAccepted {
  submissionId: string;
  status: string;
}

interface BackendTcResult {
  testCaseId: string;
  status: string;
  executionTimeMs?: number;
  memoryUsageMb?: number;
  actualOutput?: string;
}

interface BackendSubmission {
  id: string;
  userId: string;
  problemId: string;
  language: string;
  status?: string;
  timeMs?: number;
  memoryMb?: number;
  submittedAt?: number | string;
  judgedAt?: number | string;
  errorMessage?: string;
  code?: string;
  testCaseResults?: BackendTcResult[];
}

interface BackendList {
  items: BackendSubmission[];
  nextCursor?: string;
}

function toIso(v: number | string | undefined): string {
  if (v === undefined) return new Date().toISOString();
  if (typeof v === 'number') return new Date(v * 1000).toISOString();
  return v;
}

function mapVerdict(s?: string): Verdict | undefined {
  switch (s) {
    case 'ACCEPTED':
      return 'AC';
    case 'WRONG_ANSWER':
      return 'WA';
    case 'TIME_LIMIT_EXCEEDED':
      return 'TLE';
    case 'MEMORY_LIMIT_EXCEEDED':
      return 'MLE';
    case 'RUNTIME_ERROR':
      return 'RE';
    case 'COMPILATION_ERROR':
      return 'CE';
    default:
      return undefined;
  }
}

function mapSubmission(s: BackendSubmission): Submission {
  const verdict = mapVerdict(s.status);
  const isDone = !!verdict;
  const failedIdx = (s.testCaseResults ?? []).findIndex(
    (tc) => mapVerdict(tc.status) && mapVerdict(tc.status) !== 'AC',
  );
  return {
    id: s.id,
    userId: s.userId,
    problemId: s.problemId,
    language: s.language as Language,
    status: isDone ? 'DONE' : s.status === 'RUNNING' ? 'RUNNING' : 'QUEUED',
    verdict,
    runtimeMs: s.timeMs ?? null,
    memoryKb: s.memoryMb != null ? Math.round(s.memoryMb * 1024) : null,
    failedTestCaseIndex: failedIdx >= 0 ? failedIdx : null,
    compileError: s.errorMessage ?? null,
    createdAt: toIso(s.submittedAt),
  } as Submission;
}

export const submissionsApi = {
  run: (data: Omit<SubmissionInput, 'contestId'>) =>
    api
      .post<BackendSubmission>('/api/submissions/run', {
        problemId: data.problemId,
        language: data.language,
        code: data.sourceCode,
      })
      .then((r) => {
        const raw = r.data;
        const synthetic: BackendSubmission = {
          id: 'run-' + Date.now(),
          userId: 'me',
          problemId: data.problemId,
          language: data.language,
          status: raw.status,
          timeMs: raw.timeMs,
          memoryMb: raw.memoryMb,
          testCaseResults: raw.testCaseResults,
          errorMessage: raw.errorMessage,
        };
        return mapSubmission(synthetic);
      }),

  submit: (data: SubmissionInput) =>
    api
      .post<{ submissionId: string; status: string }>('/api/submissions', {
        problemId: data.problemId,
        language: data.language,
        code: data.sourceCode,
        ...(data.contestId ? { contestId: data.contestId } : {}),
      })
      .then((r) => r.data),

  get: (submissionId: string) =>
    api
      .get<BackendSubmission>(`/api/submissions/${submissionId}`)
      .then((r) => mapSubmission(r.data)),

  list: (
    params: {
      problemId?: string;
      userId?: string;
      verdict?: Verdict;
      page?: number;
      pageSize?: number;
    } = {},
  ) =>
    api.get<BackendList>('/api/submissions', { params }).then(
      (r) =>
        ({
          items: r.data.items.map(mapSubmission),
          total: r.data.items.length,
          page: 1,
        }) as Paginated<Submission>,
    ),

  getCode: (submissionId: string) =>
    api
      .get<BackendSubmission>(`/api/submissions/${submissionId}`)
      .then(
        (r) =>
          ({ code: r.data.code ?? '', language: r.data.language as Language }) as SubmissionCode,
      ),
};
