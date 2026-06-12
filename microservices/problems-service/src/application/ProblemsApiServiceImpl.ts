import {
  type CreateProblemServerInput,
  type CreateProblemServerOutput,
  type DeleteProblemServerInput,
  type DeleteProblemServerOutput,
  type GetProblemServerInput,
  type GetProblemServerOutput,
  type ListProblemsServerInput,
  type ListProblemsServerOutput,
  NotFoundError,
  type ProblemsApiService,
  type UpdateProblemServerInput,
  type UpdateProblemServerOutput,
} from '@leetcode/problems-server-sdk';
import type { ProblemsContext } from '../context.js';
import { throwIfKnownServiceError, ValidationException } from './errors.js';
import { mapUnexpectedError } from '../persistence/prisma/error-handlers.js';
import type { ListProblemsFilters } from './problems-repository.js';
import type { UpdateProblemData } from '../domain/problem.js';
import {
  ensureCategoriesProvided,
  ensureLanguagesProvided,
  normalizeLimit,
  normalizeTestCases,
  requireNumber,
  requireString,
  requireValue,
  validateKnownCategories,
} from '../domain/validation.js';
import {
  toCreateProblemOutput,
  toGetProblemOutput,
  toListProblemsOutput,
  toUpdateProblemOutput,
} from './problem-mapper.js';

export class ProblemsApiServiceImpl implements ProblemsApiService<ProblemsContext> {
  constructor() {
    this.ListProblems = this.ListProblems.bind(this);
    this.GetProblem = this.GetProblem.bind(this);
    this.CreateProblem = this.CreateProblem.bind(this);
    this.UpdateProblem = this.UpdateProblem.bind(this);
    this.DeleteProblem = this.DeleteProblem.bind(this);
  }

  private async handleErrors<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (error: unknown) {
      throwIfKnownServiceError(error);
      mapUnexpectedError(error);
    }
  }

  async ListProblems(
    input: ListProblemsServerInput,
    ctx: ProblemsContext,
  ): Promise<ListProblemsServerOutput> {
    return this.handleErrors(async () => {
      const limit = normalizeLimit(input.limit);

      const filters: ListProblemsFilters = {
        limit,
      };

      if (input.cursor !== undefined) {
        filters.cursor = input.cursor;
      }
      if (input.difficulty !== undefined) {
        filters.difficulty = input.difficulty;
      }
      if (input.category !== undefined) {
        filters.category = input.category;
      }

      const result = await ctx.problemsRepository.listPublished(filters);

      return toListProblemsOutput(result.items, result.nextCursor);
    });
  }

  async GetProblem(
    input: GetProblemServerInput,
    ctx: ProblemsContext,
  ): Promise<GetProblemServerOutput> {
    return this.handleErrors(async () => {
      const problemId = requireString(input.problemId, 'problemId');
      const includeAllTestCases = input.allTestCases === true;
      const problem = await ctx.problemsRepository.findById(problemId);

      if (!problem) {
        throw new NotFoundError({
          message: `Problem '${problemId}' does not exist.`,
        });
      }

      return toGetProblemOutput(problem, includeAllTestCases);
    });
  }

  async CreateProblem(
    input: CreateProblemServerInput,
    ctx: ProblemsContext,
  ): Promise<CreateProblemServerOutput> {
    return this.handleErrors(async () => {
      const slug = requireString(input.slug, 'slug');
      const title = requireString(input.title, 'title');
      const descriptionMd = requireString(input.descriptionMd, 'descriptionMd');
      const constraintsMd = requireString(input.constraintsMd, 'constraintsMd');
      const difficulty = requireValue(input.difficulty, 'difficulty');
      const timeLimitMs = requireNumber(input.timeLimitMs, 'timeLimitMs');
      const memoryLimitMb = requireNumber(input.memoryLimitMb, 'memoryLimitMb');
      const categories = ensureCategoriesProvided(input.categories);
      const allowedLanguages = ensureLanguagesProvided(input.allowedLanguages);
      const testCases = normalizeTestCases(input.testCases);

      const categoriesExist = await ctx.problemsRepository.categoryNamesExist(categories);
      validateKnownCategories(categories, categoriesExist);

      const created = await ctx.problemsRepository.create({
        slug,
        title,
        descriptionMd,
        constraintsMd,
        difficulty,
        categories,
        timeLimitMs,
        memoryLimitMb,
        allowedLanguages,
        testCases,
      });

      return toCreateProblemOutput(created);
    });
  }

  async UpdateProblem(
    input: UpdateProblemServerInput,
    ctx: ProblemsContext,
  ): Promise<UpdateProblemServerOutput> {
    return this.handleErrors(async () => {
      const problemId = requireString(input.problemId, 'problemId');
      let categories: string[] | undefined;

      if (input.categories !== undefined) {
        categories = ensureCategoriesProvided(input.categories);
        const categoriesExist = await ctx.problemsRepository.categoryNamesExist(categories);
        validateKnownCategories(categories, categoriesExist);
      }

      const testCases =
        input.testCases !== undefined ? normalizeTestCases(input.testCases) : undefined;
      const allowedLanguages =
        input.allowedLanguages !== undefined
          ? ensureLanguagesProvided(input.allowedLanguages)
          : undefined;

      const updateData: UpdateProblemData = {
        id: problemId,
      };

      if (input.slug !== undefined) {
        updateData.slug = input.slug;
      }
      if (input.title !== undefined) {
        updateData.title = input.title;
      }
      if (input.descriptionMd !== undefined) {
        updateData.descriptionMd = input.descriptionMd;
      }
      if (input.constraintsMd !== undefined) {
        updateData.constraintsMd = input.constraintsMd;
      }
      if (input.difficulty !== undefined) {
        updateData.difficulty = input.difficulty;
      }
      if (categories !== undefined) {
        updateData.categories = categories;
      }
      if (input.timeLimitMs !== undefined) {
        updateData.timeLimitMs = input.timeLimitMs;
      }
      if (input.memoryLimitMb !== undefined) {
        updateData.memoryLimitMb = input.memoryLimitMb;
      }
      if (allowedLanguages !== undefined) {
        updateData.allowedLanguages = allowedLanguages;
      }
      if (testCases !== undefined) {
        updateData.testCases = testCases;
      }

      if (Object.keys(updateData).length === 1) {
        throw new ValidationException({
          message: 'At least one updatable field beyond problemId must be provided.',
        });
      }

      const updated = await ctx.problemsRepository.update(updateData);

      if (!updated || updated.isDeleted) {
        throw new NotFoundError({ message: `Problem '${problemId}' not found.` });
      }

      return toUpdateProblemOutput(updated);
    });
  }

  async DeleteProblem(
    input: DeleteProblemServerInput,
    ctx: ProblemsContext,
  ): Promise<DeleteProblemServerOutput> {
    return this.handleErrors(async () => {
      const problemId = requireString(input.problemId, 'problemId');
      const deleted = await ctx.problemsRepository.softDelete(problemId);

      if (!deleted) {
        throw new NotFoundError({ message: `Problem '${problemId}' not found.` });
      }

      return {};
    });
  }
}
