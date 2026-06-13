import type { PrismaClient } from '../../../generated/prisma/client.js';
import type {
  SubmissionAggregate,
  SubmissionSummaryItem,
  TestCaseResultItem,
} from '../../domain/submission.js';
import type {
  CreatePendingSubmissionInput,
  ListSubmissionsFilter,
  ListSubmissionsResult,
  SubmissionsRepository,
  UpdateVerdictInput,
} from '../../application/submissions-repository.js';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

type SubmissionRow = Awaited<ReturnType<PrismaClient['submission']['findUnique']>> & object;
type TestCaseRow = {
  testCaseId: string;
  status: SubmissionAggregate['status'];
  executionTimeMs: number | null;
  memoryUsageMb: number | null;
  actualOutput: string | null;
};

function toTestCaseItem(row: TestCaseRow): TestCaseResultItem {
  return {
    testCaseId: row.testCaseId,
    status: row.status,
    executionTimeMs: row.executionTimeMs ?? undefined,
    memoryUsageMb: row.memoryUsageMb ?? undefined,
    actualOutput: row.actualOutput ?? undefined,
  };
}

function toDomain(row: SubmissionRow & { testCaseResults: TestCaseRow[] }): SubmissionAggregate {
  return {
    id: row.id,
    problemId: row.problemId,
    userId: row.userId,
    contestId: row.contestId ?? undefined,
    language: row.language,
    code: row.code,
    status: row.status,
    timeMs: row.timeMs ?? undefined,
    memoryMb: row.memoryMb ?? undefined,
    errorMessage: row.errorMessage ?? undefined,
    submittedAt: row.submittedAt,
    judgedAt: row.judgedAt ?? undefined,
    testCaseResults: row.testCaseResults.map(toTestCaseItem),
  };
}

function toSummary(row: SubmissionRow): SubmissionSummaryItem {
  return {
    id: row.id,
    problemId: row.problemId,
    userId: row.userId,
    contestId: row.contestId ?? undefined,
    language: row.language,
    status: row.status,
    timeMs: row.timeMs ?? undefined,
    memoryMb: row.memoryMb ?? undefined,
    submittedAt: row.submittedAt,
    judgedAt: row.judgedAt ?? undefined,
  };
}

interface CursorPosition {
  submittedAt: Date;
  id: string;
}

function encodeCursor(position: CursorPosition): string {
  return Buffer.from(`${position.submittedAt.toISOString()}|${position.id}`, 'utf-8').toString(
    'base64url',
  );
}

function decodeCursor(cursor: string): CursorPosition | null {
  try {
    const decoded = Buffer.from(cursor, 'base64url').toString('utf-8');
    const separator = decoded.lastIndexOf('|');
    if (separator === -1) return null;
    const isoDate = decoded.slice(0, separator);
    const id = decoded.slice(separator + 1);
    const submittedAt = new Date(isoDate);
    if (Number.isNaN(submittedAt.getTime()) || id.length === 0) return null;
    return { submittedAt, id };
  } catch {
    return null;
  }
}

export class PrismaSubmissionsRepository implements SubmissionsRepository {
  private readonly prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async createPendingSubmission(input: CreatePendingSubmissionInput): Promise<SubmissionAggregate> {
    const submission = await this.prisma.submission.create({
      data: {
        userId: input.userId,
        problemId: input.problemId,
        contestId: input.contestId ?? null,
        language: input.language,
        code: input.code,
        status: 'PENDING',
      },
      include: { testCaseResults: true },
    });

    return toDomain(submission);
  }

  async updateVerdict(input: UpdateVerdictInput): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.submission.update({
        where: { id: input.submissionId },
        data: {
          status: input.status,
          timeMs: input.timeMs ?? null,
          memoryMb: input.memoryMb ?? null,
          errorMessage: input.errorMessage ?? null,
          judgedAt: input.judgedAt,
        },
      });

      if (input.testCaseResults.length > 0) {
        await tx.submissionTestCaseResult.createMany({
          data: input.testCaseResults.map((r) => ({
            submissionId: input.submissionId,
            testCaseId: r.testCaseId,
            status: r.status,
            executionTimeMs: r.executionTimeMs ?? null,
            memoryUsageMb: r.memoryUsageMb ?? null,
            actualOutput: r.actualOutput ?? null,
          })),
        });
      }
    });
  }

  async findById(id: string): Promise<SubmissionAggregate | null> {
    const submission = await this.prisma.submission.findUnique({
      where: { id },
      include: { testCaseResults: true },
    });
    if (!submission) return null;
    return toDomain(submission);
  }

  async list(filter: ListSubmissionsFilter): Promise<ListSubmissionsResult> {
    const take = Math.min(Math.max(filter.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);

    const baseWhere = {
      userId: filter.userId,
      ...(filter.problemId ? { problemId: filter.problemId } : {}),
      ...(filter.contestId ? { contestId: filter.contestId } : {}),
      ...(filter.status ? { status: filter.status } : {}),
    };

    // Keyset pagination over (submittedAt desc, id desc).
    const position = filter.cursor ? decodeCursor(filter.cursor) : null;
    const where = position
      ? {
          AND: [
            baseWhere,
            {
              OR: [
                { submittedAt: { lt: position.submittedAt } },
                { submittedAt: position.submittedAt, id: { lt: position.id } },
              ],
            },
          ],
        }
      : baseWhere;

    const rows = await this.prisma.submission.findMany({
      where,
      orderBy: [{ submittedAt: 'desc' }, { id: 'desc' }],
      take: take + 1,
    });

    const hasMore = rows.length > take;
    const page = hasMore ? rows.slice(0, take) : rows;
    const last = page[page.length - 1];
    const nextCursor =
      hasMore && last ? encodeCursor({ submittedAt: last.submittedAt, id: last.id }) : undefined;

    return {
      items: page.map(toSummary),
      nextCursor,
    };
  }
}
