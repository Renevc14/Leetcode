import { api } from './client';
import type { Contest, ContestProblem, ContestStatus, LeaderboardEntry, Paginated } from '@/types';

export interface ContestInput {
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  problemIds: string[];
}

function slugify(title: string): string {
  return (
    title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 100) || 'contest-' + Date.now()
  );
}

interface BackendContest {
  id: string;
  slug?: string;
  title: string;
  description?: string;
  startsAt?: string;
  endsAt?: string;
  status?: ContestStatus;
  participantCount?: number;
}

interface BackendList {
  items: BackendContest[];
  nextCursor?: string;
}

function mapContest(c: BackendContest): Contest {
  return {
    id: c.id,
    title: c.title,
    description: c.description ?? '',
    status: c.status ?? 'UPCOMING',
    startTime: c.startsAt ?? new Date().toISOString(),
    endTime: c.endsAt ?? new Date().toISOString(),
    participantCount: c.participantCount ?? 0,
  } as Contest;
}

export const contestsApi = {
  list: (params: { status?: ContestStatus; page?: number; pageSize?: number } = {}) =>
    api.get<BackendList>('/v1/contests', { params }).then(
      (r) =>
        ({
          items: r.data.items.map(mapContest),
          total: r.data.items.length,
          page: 1,
        }) as Paginated<Contest>,
    ),

  get: (contestId: string) =>
    api.get<BackendContest>(`/v1/contests/${contestId}`).then((r) => mapContest(r.data)),

  create: (data: ContestInput) =>
    api
      .post<{ id: string; title: string; status: ContestStatus }>('/v1/contests', {
        slug: slugify(data.title),
        title: data.title,
        description: data.description,
        startsAt: new Date(data.startTime).toISOString(),
        endsAt: new Date(data.endTime).toISOString(),
        problemIds: data.problemIds,
      })
      .then((r) => r.data),

  enroll: (contestId: string) =>
    api.post<{ message: string }>(`/v1/contests/${contestId}/enroll`, {}).then((r) => r.data),

  unenroll: (contestId: string) =>
    api.delete<{ message: string }>(`/v1/contests/${contestId}/enroll`).then((r) => r.data),

  problems: (contestId: string) =>
    api.get<{ items: ContestProblem[] }>(`/v1/contests/${contestId}/problems`).then((r) => r.data),

  leaderboard: (contestId: string, params: { page?: number; pageSize?: number } = {}) =>
    api
      .get<Paginated<LeaderboardEntry>>(`/v1/contests/${contestId}/leaderboard`, { params })
      .then((r) => r.data),
};
