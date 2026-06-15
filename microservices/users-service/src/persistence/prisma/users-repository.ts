import type { PrismaClient } from '../../../generated/prisma/client.js';
import type { UserAggregate, UserProblemStatusItem } from '../../domain/user.js';
import type { UpsertUserInput, UsersRepository } from '../../application/users-repository.js';

function toDomain(
  user: Awaited<ReturnType<PrismaClient['user']['findUnique']>> & object,
): UserAggregate {
  return {
    id: user.id,
    userName: user.userName,
    displayName: user.displayName,
    email: user.email,
    bio: user.bio ?? undefined,
    avatarUrl: user.avatarUrl ?? undefined,
    countryCode: user.countryCode ?? undefined,
    isActive: user.isActive,
  };
}

export class PrismaUsersRepository implements UsersRepository {
  private readonly prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async findById(id: string): Promise<UserAggregate | null> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) return null;
    return toDomain(user);
  }

  async upsertFromAuth(input: UpsertUserInput): Promise<UserAggregate> {
    const user = await this.prisma.user.upsert({
      where: { id: input.id },
      create: {
        id: input.id,
        userName: input.userName,
        displayName: input.displayName,
        email: input.email,
        isActive: true,
      },
      update: {
        email: input.email,
        displayName: input.displayName,
      },
    });
    return toDomain(user);
  }

  async listProblemStatuses(userId: string): Promise<UserProblemStatusItem[]> {
    const records = await this.prisma.userProblem.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    });

    return records.map((r) => ({
      problemId: r.problemId,
      status: r.status,
      updatedAt: r.updatedAt,
    }));
  }

  async upsertProblemStatus(
    userId: string,
    problemId: string,
    status: 'ATTEMPTED' | 'SOLVED',
  ): Promise<void> {
    await this.prisma.userProblem.upsert({
      where: { userId_problemId: { userId, problemId } },
      create: { userId, problemId, status },
      // On SOLVED: always write. On ATTEMPTED: no-op to avoid downgrading SOLVED.
      update: status === 'SOLVED' ? { status: 'SOLVED' } : {},
    });
  }
}
