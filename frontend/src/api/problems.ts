import { api } from './client';
import type {
  Difficulty,
  MyStatus,
  Paginated,
  ProblemDetail,
  ProblemLanguage,
  ProblemSummary,
  PublicTestCase,
  TestCaseInput,
} from '@/types';

export interface CreateProblemInput {
  title: string;
  statementMarkdown: string;
  constraints: string;
  difficulty: Difficulty;
  categories: string[];
  timeLimitMs: number;
  memoryLimitMb: number;
  allowedLanguages: string[];
  testCases: TestCaseInput[];
}

// Adapters: Smithy server-sdk usa nombres distintos que los tipos del front.
interface BackendTestCase {
  input?: string;
  expectedOutput?: string;
  isSample?: boolean;
  id?: string;
}

interface BackendProblem {
  id: string;
  slug?: string;
  title: string;
  difficulty: Difficulty;
  categories?: string[];
  acceptanceRate?: number;
  descriptionMd?: string;
  constraintsMd?: string;
  timeLimitMs?: number;
  memoryLimitMb?: number;
  allowedLanguages?: string[];
  testCases?: BackendTestCase[];
  userStatus?: string;
}

function mapStatus(status?: string): MyStatus | undefined {
  if (!status) return undefined;
  if (status === 'SOLVED') return 'solved';
  if (status === 'ATTEMPTED') return 'attempted';
  if (status === 'NOT_ATTEMPTED') return 'unsolved';
  return undefined;
}

function mapDetail(p: BackendProblem): ProblemDetail {
  const langs = (p.allowedLanguages ?? []).map((l) => l.toLowerCase() as ProblemLanguage);
  const samples: PublicTestCase[] = (p.testCases ?? [])
    .filter((tc) => tc.isSample)
    .map((tc) => ({ input: tc.input ?? '', expectedOutput: tc.expectedOutput ?? '' }));
  return {
    id: p.id,
    title: p.title,
    difficulty: p.difficulty,
    categories: p.categories ?? [],
    acceptanceRate: p.acceptanceRate ?? 0,
    myStatus: mapStatus(p.userStatus),
    statementMarkdown: p.descriptionMd ?? '',
    constraints: p.constraintsMd ?? '',
    timeLimitMs: p.timeLimitMs ?? 1000,
    memoryLimitMb: p.memoryLimitMb ?? 128,
    allowedLanguages: langs,
    publicTestCases: samples,
  };
}

function mapSummary(p: BackendProblem): ProblemSummary {
  return {
    id: p.id,
    title: p.title,
    difficulty: p.difficulty,
    categories: p.categories ?? [],
    acceptanceRate: p.acceptanceRate ?? 0,
    myStatus: mapStatus(p.userStatus),
  };
}

interface BackendPaginated<T> {
  items: T[];
  total?: number;
  page?: number;
  nextCursor?: string;
}

export const problemsApi = {
  list: (
    params: {
      difficulty?: Difficulty;
      category?: string;
      status?: MyStatus;
      page?: number;
      pageSize?: number;
    } = {},
  ) =>
    api.get<BackendPaginated<BackendProblem>>('/api/problems', { params }).then(
      (r) =>
        ({
          items: r.data.items.map(mapSummary),
          total: r.data.total ?? r.data.items.length,
          page: r.data.page ?? 1,
        }) as Paginated<ProblemSummary>,
    ),

  get: (problemId: string) =>
    api.get<BackendProblem>(`/api/problems/${problemId}`).then((r) => mapDetail(r.data)),

  create: (data: CreateProblemInput) => {
    const body = {
      slug: data.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .slice(0, 100),
      title: data.title,
      descriptionMd: data.statementMarkdown,
      constraintsMd: data.constraints,
      difficulty: data.difficulty,
      categories: data.categories,
      timeLimitMs: data.timeLimitMs,
      memoryLimitMb: data.memoryLimitMb,
      allowedLanguages: data.allowedLanguages.map((l) => l.toUpperCase()),
      testCases: data.testCases.map((tc) => ({
        input: tc.input,
        expectedOutput: tc.expectedOutput,
        isSample: tc.isPublic ?? false,
        explanation: '',
      })),
    };
    return api.post<{ id: string }>('/api/problems', body).then((r) => r.data);
  },

  update: (problemId: string, data: Partial<CreateProblemInput>) =>
    api.put<{ id: string }>(`/api/problems/${problemId}`, data).then((r) => r.data),

  disable: (problemId: string) =>
    api.patch<{ message: string }>(`/api/problems/${problemId}/disable`).then((r) => r.data),
};
