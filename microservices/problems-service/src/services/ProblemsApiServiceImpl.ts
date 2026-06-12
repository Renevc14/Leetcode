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
import {
  mapUnexpectedError,
  throwIfKnownServiceError,
  ValidationException,
} from '../domain/error-translation.js';
import type { ListProblemsFilters } from '../application/problems-repository.js';
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
} from '../mappers/problem-mapper.js';

export class ProblemsApiServiceImpl implements ProblemsApiService<ProblemsContext> {
  async ListProblems(
    input: ListProblemsServerInput,
    ctx: ProblemsContext,
  ): Promise<ListProblemsServerOutput> {
    try {
      const limit = normalizeLimit(input.limit);

      if (input.cursor) {
        const cursorExists = await ctx.problemsRepository.findById(input.cursor);
        if (!cursorExists) {
          throw new ValidationException({
            message: 'cursor does not reference an existing problem id.',
          });
        }
      }

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
    } catch (error: unknown) {
      throwIfKnownServiceError(error);
      mapUnexpectedError(error);
    }
  }

  async GetProblem(
    input: GetProblemServerInput,
    ctx: ProblemsContext,
  ): Promise<GetProblemServerOutput> {
    try {
      const problemId = requireString(input.problemId, 'problemId');
      const problem = await ctx.problemsRepository.findPublishedById(problemId);

      if (!problem) {
        throw new NotFoundError({
          message: `Problem '${problemId}' does not exist or is disabled.`,
        });
      }

      return toGetProblemOutput(problem);
    } catch (error: unknown) {
      throwIfKnownServiceError(error);
      mapUnexpectedError(error);
    }
  }

  async CreateProblem(
    input: CreateProblemServerInput,
    ctx: ProblemsContext,
  ): Promise<CreateProblemServerOutput> {
    try {
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
    } catch (error: unknown) {
      throwIfKnownServiceError(error);
      mapUnexpectedError(error);
    }
  }

  async UpdateProblem(
    input: UpdateProblemServerInput,
    ctx: ProblemsContext,
  ): Promise<UpdateProblemServerOutput> {
    try {
      const problemId = requireString(input.problemId, 'problemId');

      if (input.categories !== undefined) {
        const categories = ensureCategoriesProvided(input.categories);
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
      if (input.categories !== undefined) {
        updateData.categories = input.categories;
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

      const updated = await ctx.problemsRepository.update(updateData);

      if (!updated || updated.isDeleted) {
        throw new NotFoundError({ message: `Problem '${problemId}' not found.` });
      }

      return toUpdateProblemOutput(updated);
    } catch (error: unknown) {
      throwIfKnownServiceError(error);
      mapUnexpectedError(error);
    }
  }

  async DeleteProblem(
    input: DeleteProblemServerInput,
    ctx: ProblemsContext,
  ): Promise<DeleteProblemServerOutput> {
    try {
      const problemId = requireString(input.problemId, 'problemId');
      const deleted = await ctx.problemsRepository.softDelete(problemId);

      if (!deleted) {
        throw new NotFoundError({ message: `Problem '${problemId}' not found.` });
      }

      return {};
    } catch (error: unknown) {
      console.log('Error in DeleteProblem:', error);
      throwIfKnownServiceError(error);
      mapUnexpectedError(error);
    }
  }
}
