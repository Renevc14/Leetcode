import type { ContestStatus } from '@leetcode/contests-server-sdk';
import type {
  ContestAggregate,
  ContestProblemRef,
  CreateContestData,
  LeaderboardRow,
  UpdateContestData,
} from '../domain/contest.js';

export interface ListContestsFilters {
  status?: ContestStatus;
  search?: string;
  cursor?: string;
  limit: number;
}

export interface ContestListResult {
  items: ContestAggregate[];
  nextCursor: string | undefined;
}

export interface LeaderboardResult {
  items: LeaderboardRow[];
  nextCursor: string | undefined;
}

export interface ContestsRepository {
  list(filters: ListContestsFilters): Promise<ContestListResult>;
  findById(id: string): Promise<ContestAggregate | null>;
  create(data: CreateContestData): Promise<ContestAggregate>;
  update(id: string, data: UpdateContestData): Promise<ContestAggregate>;
  softDelete(id: string): Promise<void>;
  enrollmentExists(contestId: string, userId: string): Promise<boolean>;
  countEnrollments(contestId: string): Promise<number>;
  enroll(contestId: string, userId: string): Promise<void>;
  unenroll(contestId: string, userId: string): Promise<void>;
  listProblems(contestId: string): Promise<ContestProblemRef[]>;
  listResults(
    contestId: string,
    cursor: string | undefined,
    limit: number,
  ): Promise<LeaderboardResult>;
}
