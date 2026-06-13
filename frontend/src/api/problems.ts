import { api } from './client';
import type {
  Difficulty,
  MyStatus,
  Paginated,
  ProblemDetail,
  ProblemSummary,
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

export const problemsApi = {
  list: (
    params: {
      difficulty?: Difficulty;
      category?: string;
      status?: MyStatus;
      page?: number;
      pageSize?: number;
    } = {},
  ) => api.get<Paginated<ProblemSummary>>('/api/problems', { params }).then((r) => r.data),

  get: (problemId: string) =>
    api.get<ProblemDetail>(`/api/problems/${problemId}`).then((r) => r.data),

  create: (data: CreateProblemInput) =>
    api.post<{ id: string }>('/api/problems', data).then((r) => r.data),

  update: (problemId: string, data: Partial<CreateProblemInput>) =>
    api.put<{ id: string }>(`/api/problems/${problemId}`, data).then((r) => r.data),

  disable: (problemId: string) =>
    api.patch<{ message: string }>(`/api/problems/${problemId}/disable`).then((r) => r.data),
};
