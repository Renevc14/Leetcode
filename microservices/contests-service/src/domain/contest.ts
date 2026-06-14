import type { ContestStatus } from '@leetcode/contests-server-sdk';

export interface ContestAggregate {
  id: string;
  slug: string;
  title: string;
  description: string;
  startsAt: Date;
  endsAt: Date;
  status: ContestStatus;
  maxParticipants: number | null;
  participantCount: number;
}

export interface CreateContestData {
  slug: string;
  title: string;
  description: string;
  startsAt: Date;
  endsAt: Date;
  maxParticipants?: number;
  problemIds: string[];
}

export interface UpdateContestData {
  slug?: string;
  title?: string;
  description?: string;
  startsAt?: Date;
  endsAt?: Date;
  maxParticipants?: number | null;
  status?: ContestStatus;
  problemIds?: string[];
}

export interface ContestProblemRef {
  problemId: string;
  orderIndex: number;
}

export interface LeaderboardRow {
  userId: string;
  solvedCount: number;
  totalTimeMinutes: number;
}
