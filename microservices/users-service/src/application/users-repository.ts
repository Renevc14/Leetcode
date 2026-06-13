import type { UserAggregate, UserProblemStatusItem } from '../domain/user.js';

export interface UsersRepository {
  findByAuthentikId(authentikId: string): Promise<UserAggregate | null>;
  findById(id: string): Promise<UserAggregate | null>;
  listProblemStatuses(userId: string): Promise<UserProblemStatusItem[]>;
}
