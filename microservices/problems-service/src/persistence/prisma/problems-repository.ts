import type { Difficulty } from '@leetcode/problems-server-sdk';
import type { Prisma, PrismaClient } from '../../../generated/prisma/client.js';
import type {
  ProblemsRepository,
  ListProblemsFilters,
} from '../../application/problems-repository.js';
import type {
  CreateProblemData,
  ProblemAggregate,
  ProblemListResult,
  UpdateProblemData,
} from '../../domain/problem.js';

type ProblemRecord = Prisma.ProblemGetPayload<{
  include: typeof problemInclude;
}>;

const problemInclude = {
  testCases: {
    orderBy: {
      orderIndex: 'asc' as const,
    },
    select: {
      id: true,
      input: true,
      expectedOutput: true,
      isSample: true,
      orderIndex: true,
    },
  },
  problemCategories: {
    include: {
      category: {
        select: {
          name: true,
        },
      },
    },
  },
  problemLanguages: {
    select: {
      language: true,
    },
  },
} as const;

export class PrismaProblemsRepository implements ProblemsRepository {
  private readonly prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async listPublished(filters: ListProblemsFilters): Promise<ProblemListResult> {
    return this.listWithWhere({ isDeleted: false, isPublished: true }, filters);
  }

  async listNonDeleted(filters: ListProblemsFilters): Promise<ProblemListResult> {
    return this.listWithWhere({ isDeleted: false }, filters);
  }

  async listAll(filters: ListProblemsFilters): Promise<ProblemListResult> {
    return this.listWithWhere({}, filters);
  }

  private async listWithWhere(
    baseWhere: Prisma.ProblemWhereInput,
    filters: ListProblemsFilters,
  ): Promise<ProblemListResult> {
    const where: Prisma.ProblemWhereInput = { ...baseWhere };

    if (filters.difficulty !== undefined) {
      where.difficulty = filters.difficulty;
    }

    if (filters.category !== undefined) {
      where.problemCategories = {
        some: {
          category: {
            name: filters.category,
          },
        },
      };
    }

    const rows = await this.prisma.problem.findMany({
      where,
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      ...(filters.cursor ? { cursor: { id: filters.cursor }, skip: 1 } : {}),
      take: filters.limit + 1,
      include: problemInclude,
    });

    const hasMore = rows.length > filters.limit;
    const page = hasMore ? rows.slice(0, filters.limit) : rows;
    const items = page.map((row) => this.toProblemAggregate(row));
    const nextCursor = hasMore ? page[page.length - 1]?.id : undefined;

    return { items, nextCursor };
  }

  async findPublishedById(id: string): Promise<ProblemAggregate | null> {
    const row = await this.prisma.problem.findFirst({
      where: { id, isPublished: true, isDeleted: false },
      include: problemInclude,
    });

    return row ? this.toProblemAggregate(row) : null;
  }

  async findById(id: string): Promise<ProblemAggregate | null> {
    const row = await this.prisma.problem.findUnique({
      where: { id },
      include: problemInclude,
    });

    return row ? this.toProblemAggregate(row) : null;
  }

  async categoryNamesExist(names: string[]): Promise<boolean> {
    const uniqueNames = Array.from(new Set(names));
    const found = await this.prisma.category.findMany({
      where: {
        name: {
          in: uniqueNames,
        },
      },
      select: {
        name: true,
      },
    });

    return found.length === uniqueNames.length;
  }

  async create(data: CreateProblemData): Promise<ProblemAggregate> {
    const categoryRows = await this.prisma.category.findMany({
      where: {
        name: {
          in: data.categories,
        },
      },
      select: {
        id: true,
      },
    });

    const created = await this.prisma.problem.create({
      data: {
        slug: data.slug,
        title: data.title,
        descriptionMd: data.descriptionMd,
        constraintsMd: data.constraintsMd,
        difficulty: data.difficulty,
        timeLimitMs: data.timeLimitMs,
        memoryLimitMb: data.memoryLimitMb,
        isPublished: false,
        isDeleted: false,
        testCases: {
          createMany: {
            data: data.testCases.map((testCase, index) => ({
              input: testCase.input,
              expectedOutput: testCase.expectedOutput,
              isSample: testCase.isSample,
              orderIndex: index,
            })),
          },
        },
        problemLanguages: {
          createMany: {
            data: data.allowedLanguages.map((language) => ({ language })),
          },
        },
        problemCategories: {
          createMany: {
            data: categoryRows.map((category) => ({ categoryId: category.id })),
          },
        },
      },
      include: problemInclude,
    });

    return this.toProblemAggregate(created);
  }

  async update(data: UpdateProblemData): Promise<ProblemAggregate | null> {
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.problem.findUnique({
        where: { id: data.id, isDeleted: false },
        select: { id: true },
      });

      if (!current) {
        return null;
      }

      const problemUpdateData: {
        slug?: string;
        title?: string;
        descriptionMd?: string;
        constraintsMd?: string;
        difficulty?: Difficulty;
        timeLimitMs?: number;
        memoryLimitMb?: number;
      } = {};

      if (data.slug !== undefined) {
        problemUpdateData.slug = data.slug;
      }
      if (data.title !== undefined) {
        problemUpdateData.title = data.title;
      }
      if (data.descriptionMd !== undefined) {
        problemUpdateData.descriptionMd = data.descriptionMd;
      }
      if (data.constraintsMd !== undefined) {
        problemUpdateData.constraintsMd = data.constraintsMd;
      }
      if (data.difficulty !== undefined) {
        problemUpdateData.difficulty = data.difficulty;
      }
      if (data.timeLimitMs !== undefined) {
        problemUpdateData.timeLimitMs = data.timeLimitMs;
      }
      if (data.memoryLimitMb !== undefined) {
        problemUpdateData.memoryLimitMb = data.memoryLimitMb;
      }

      if (Object.keys(problemUpdateData).length > 0) {
        await tx.problem.update({
          where: { id: data.id },
          data: problemUpdateData,
        });
      }

      if (data.testCases !== undefined) {
        await tx.testCase.deleteMany({ where: { problemId: data.id } });
        await tx.testCase.createMany({
          data: data.testCases.map((testCase, index) => ({
            problemId: data.id,
            input: testCase.input,
            expectedOutput: testCase.expectedOutput,
            isSample: testCase.isSample,
            orderIndex: index,
          })),
        });
      }

      if (data.allowedLanguages !== undefined) {
        await tx.problemLanguage.deleteMany({ where: { problemId: data.id } });
        await tx.problemLanguage.createMany({
          data: data.allowedLanguages.map((language) => ({ problemId: data.id, language })),
        });
      }

      if (data.categories !== undefined) {
        const categoryRows = await tx.category.findMany({
          where: {
            name: {
              in: data.categories,
            },
          },
          select: {
            id: true,
          },
        });

        await tx.problemCategory.deleteMany({ where: { problemId: data.id } });
        await tx.problemCategory.createMany({
          data: categoryRows.map((category) => ({
            problemId: data.id,
            categoryId: category.id,
          })),
        });
      }

      const updated = await tx.problem.findUnique({
        where: { id: data.id },
        include: problemInclude,
      });

      return updated ? this.toProblemAggregate(updated) : null;
    });
  }

  async softDelete(id: string): Promise<boolean> {
    const updated = await this.prisma.problem.updateMany({
      where: {
        id,
        isDeleted: false,
      },
      data: {
        isDeleted: true,
        isPublished: false,
      },
    });

    return updated.count > 0;
  }

  private toProblemAggregate(row: ProblemRecord): ProblemAggregate {
    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      descriptionMd: row.descriptionMd,
      constraintsMd: row.constraintsMd,
      difficulty: row.difficulty,
      timeLimitMs: row.timeLimitMs,
      memoryLimitMb: row.memoryLimitMb,
      categories: row.problemCategories.map((problemCategory) => problemCategory.category.name),
      allowedLanguages: row.problemLanguages.map((problemLanguage) => problemLanguage.language),
      testCases: row.testCases.map((testCase) => ({
        id: testCase.id,
        input: testCase.input,
        expectedOutput: testCase.expectedOutput,
        isSample: testCase.isSample,
        orderIndex: testCase.orderIndex,
      })),
      isPublished: row.isPublished,
      isDeleted: row.isDeleted,
    };
  }
}
