import type { UserAggregate, UserProblemStatusItem } from '../domain/user.js';

export interface UpsertUserInput {
  id: string;
  email: string;
  displayName: string;
  userName: string;
}

export interface UsersRepository {
  findById(id: string): Promise<UserAggregate | null>;
  upsertFromAuth(input: UpsertUserInput): Promise<UserAggregate>;
  listProblemStatuses(userId: string): Promise<UserProblemStatusItem[]>;
  upsertProblemStatus(
    userId: string,
    problemId: string,
    status: 'ATTEMPTED' | 'SOLVED',
  ): Promise<void>;
}
