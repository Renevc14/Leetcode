import type { UserAggregate, UserProblemStatusItem } from '../domain/user.js';

export interface UsersRepository {
  findById(id: string): Promise<UserAggregate | null>;
  listProblemStatuses(userId: string): Promise<UserProblemStatusItem[]>;
  upsertProblemStatus(
    userId: string,
    problemId: string,
    status: 'ATTEMPTED' | 'SOLVED',
  ): Promise<void>;
}
