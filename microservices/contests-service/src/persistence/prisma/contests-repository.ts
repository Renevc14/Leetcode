import type { ContestStatus } from '@leetcode/contests-server-sdk';
import type { PrismaClient } from '../../../generated/prisma/client.js';
import type {
  ContestsRepository,
  LeaderboardResult,
  ListContestsFilters,
  ContestListResult,
} from '../../application/contests-repository.js';
import type {
  ContestAggregate,
  ContestProblemRef,
  CreateContestData,
  LeaderboardRow,
  UpdateContestData,
} from '../../domain/contest.js';

const contestInclude = {
  _count: {
    select: { contestEnrollments: true },
  },
} as const;

export class PrismaContestsRepository implements ContestsRepository {
  private readonly prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async list(filters: ListContestsFilters): Promise<ContestListResult> {
    const where: { status?: ContestStatus; OR?: object[] } = {};
    if (filters.status) where.status = filters.status;
    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const rows = await this.prisma.contest.findMany({
      where,
      orderBy: [{ startsAt: 'desc' }, { id: 'asc' }],
      ...(filters.cursor ? { cursor: { id: filters.cursor }, skip: 1 } : {}),
      take: filters.limit + 1,
      include: contestInclude,
    });

    const hasMore = rows.length > filters.limit;
    const page = hasMore ? rows.slice(0, filters.limit) : rows;
    const nextCursor = hasMore ? page[page.length - 1]?.id : undefined;

    return {
      items: page.map((row) => this.toAggregate(row, row._count.contestEnrollments)),
      nextCursor,
    };
  }

  async findById(id: string): Promise<ContestAggregate | null> {
    const row = await this.prisma.contest.findUnique({
      where: { id },
      include: contestInclude,
    });

    return row ? this.toAggregate(row, row._count.contestEnrollments) : null;
  }

  async create(data: CreateContestData): Promise<ContestAggregate> {
    const row = await this.prisma.contest.create({
      data: {
        slug: data.slug,
        title: data.title,
        description: data.description,
        startsAt: data.startsAt,
        endsAt: data.endsAt,
        status: 'UPCOMING',
        maxParticipants: data.maxParticipants ?? null,
        contestProblems: {
          createMany: {
            data: data.problemIds.map((problemId, index) => ({
              problemId,
              orderIndex: index,
            })),
          },
        },
      },
      include: contestInclude,
    });

    return this.toAggregate(row, row._count.contestEnrollments);
  }

  async update(id: string, data: UpdateContestData): Promise<ContestAggregate> {
    const row = await this.prisma.$transaction(async (tx) => {
      if (data.problemIds !== undefined) {
        await tx.contestProblem.deleteMany({ where: { contestId: id } });
        await tx.contestProblem.createMany({
          data: data.problemIds.map((problemId, index) => ({
            contestId: id,
            problemId,
            orderIndex: index,
          })),
        });
      }

      return tx.contest.update({
        where: { id },
        data: {
          ...(data.slug !== undefined && { slug: data.slug }),
          ...(data.title !== undefined && { title: data.title }),
          ...(data.description !== undefined && { description: data.description }),
          ...(data.startsAt !== undefined && { startsAt: data.startsAt }),
          ...(data.endsAt !== undefined && { endsAt: data.endsAt }),
          ...(data.status !== undefined && { status: data.status }),
          ...('maxParticipants' in data && { maxParticipants: data.maxParticipants }),
        },
        include: contestInclude,
      });
    });

    return this.toAggregate(row, row._count.contestEnrollments);
  }

  async softDelete(id: string): Promise<void> {
    await this.prisma.contest.update({
      where: { id },
      data: { status: 'CANCELED' },
    });
  }

  async enrollmentExists(contestId: string, userId: string): Promise<boolean> {
    const row = await this.prisma.contestEnrollment.findUnique({
      where: { contestId_userId: { contestId, userId } },
      select: { contestId: true },
    });
    return row !== null;
  }

  async countEnrollments(contestId: string): Promise<number> {
    return this.prisma.contestEnrollment.count({ where: { contestId } });
  }

  async enroll(contestId: string, userId: string): Promise<void> {
    await this.prisma.contestEnrollment.create({
      data: { contestId, userId },
    });
  }

  async unenroll(contestId: string, userId: string): Promise<void> {
    await this.prisma.contestEnrollment.deleteMany({
      where: { contestId, userId },
    });
  }

  async listProblems(contestId: string): Promise<ContestProblemRef[]> {
    const rows = await this.prisma.contestProblem.findMany({
      where: { contestId },
      orderBy: { orderIndex: 'asc' },
    });

    return rows.map((row) => ({
      problemId: row.problemId,
      orderIndex: row.orderIndex,
    }));
  }

  async listResults(
    contestId: string,
    cursor: string | undefined,
    limit: number,
  ): Promise<LeaderboardResult> {
    const rows = await this.prisma.contestResult.findMany({
      where: { contestId },
      orderBy: [{ solvedCount: 'desc' }, { totalTimeMinutes: 'asc' }, { userId: 'asc' }],
      ...(cursor ? { cursor: { contestId_userId: { contestId, userId: cursor } }, skip: 1 } : {}),
      take: limit + 1,
    });

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore ? page[page.length - 1]?.userId : undefined;

    const items: LeaderboardRow[] = page.map((row) => ({
      userId: row.userId,
      solvedCount: row.solvedCount,
      totalTimeMinutes: row.totalTimeMinutes,
    }));

    return { items, nextCursor };
  }

  private toAggregate(
    row: {
      id: string;
      slug: string;
      title: string;
      description: string;
      startsAt: Date;
      endsAt: Date;
      status: ContestStatus;
      maxParticipants: number | null;
    },
    participantCount: number,
  ): ContestAggregate {
    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      description: row.description,
      startsAt: row.startsAt,
      endsAt: row.endsAt,
      status: row.status,
      maxParticipants: row.maxParticipants,
      participantCount,
    };
  }
}
