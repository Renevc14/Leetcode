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

export const submissionsApi = {
  run: (data: Omit<SubmissionInput, 'contestId'>) =>
    api.post<SubmissionAccepted>('/api/submissions/run', data).then((r) => r.data),

  submit: (data: SubmissionInput) =>
    api.post<SubmissionAccepted>('/api/submissions', data).then((r) => r.data),

  get: (submissionId: string) =>
    api.get<Submission>(`/api/submissions/${submissionId}`).then((r) => r.data),

  list: (
    params: {
      problemId?: string;
      userId?: string;
      verdict?: Verdict;
      page?: number;
      pageSize?: number;
    } = {},
  ) => api.get<Paginated<Submission>>('/api/submissions', { params }).then((r) => r.data),

  getCode: (submissionId: string) =>
    api.get<SubmissionCode>(`/api/submissions/${submissionId}/code`).then((r) => r.data),
};
