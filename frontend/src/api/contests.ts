import { api } from './client';
import type { Contest, ContestProblem, ContestStatus, LeaderboardEntry, Paginated } from '@/types';

export interface ContestInput {
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  problemIds: string[];
}

export const contestsApi = {
  list: (params: { status?: ContestStatus; page?: number; pageSize?: number } = {}) =>
    api.get<Paginated<Contest>>('/api/contests', { params }).then((r) => r.data),

  get: (contestId: string) => api.get<Contest>(`/api/contests/${contestId}`).then((r) => r.data),

  create: (data: ContestInput) =>
    api
      .post<{ id: string; title: string; status: ContestStatus }>('/api/contests', data)
      .then((r) => r.data),

  enroll: (contestId: string) =>
    api.post<{ message: string }>(`/api/contests/${contestId}/enroll`, {}).then((r) => r.data),

  unenroll: (contestId: string) =>
    api.delete<{ message: string }>(`/api/contests/${contestId}/enroll`).then((r) => r.data),

  problems: (contestId: string) =>
    api.get<{ items: ContestProblem[] }>(`/api/contests/${contestId}/problems`).then((r) => r.data),

  leaderboard: (contestId: string, params: { page?: number; pageSize?: number } = {}) =>
    api
      .get<Paginated<LeaderboardEntry>>(`/api/contests/${contestId}/leaderboard`, { params })
      .then((r) => r.data),
};
