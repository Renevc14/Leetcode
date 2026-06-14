import {
  type ContestsApiService,
  type CreateContestServerInput,
  type CreateContestServerOutput,
  type DeleteContestServerInput,
  type DeleteContestServerOutput,
  type EnrollContestServerInput,
  type EnrollContestServerOutput,
  type GetContestLeaderboardServerInput,
  type GetContestLeaderboardServerOutput,
  type GetContestProblemsServerInput,
  type GetContestProblemsServerOutput,
  type GetContestServerInput,
  type GetContestServerOutput,
  type ListContestsServerInput,
  type ListContestsServerOutput,
  type UnenrollContestServerInput,
  type UnenrollContestServerOutput,
  type UpdateContestServerInput,
  type UpdateContestServerOutput,
} from '@leetcode/contests-server-sdk';
import { GetProblemCommand } from '@leetcode/problems-client-sdk';
import { GetUserCommand } from '@leetcode/users-client-sdk';
import type { ContestsContext } from '../context.js';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  throwIfKnownServiceError,
  ValidationException,
} from './errors.js';
import { CONTESTS_PARTICIPATE_SCOPE, CONTESTS_WRITE_SCOPE, requireScope } from './authz.js';
import { mapUnexpectedError } from '../persistence/prisma/error-handlers.js';
import { requireString, requireValue, normalizeLimit } from '../domain/validation.js';
import { toContestDetail, toContestSummary, toLeaderboardEntry } from './contest-mapper.js';
import type { ListContestsFilters } from './contests-repository.js';
import type { CreateContestData, UpdateContestData } from '../domain/contest.js';

export class ContestsApiServiceImpl implements ContestsApiService<ContestsContext> {
  constructor() {
    this.ListContests = this.ListContests.bind(this);
    this.GetContest = this.GetContest.bind(this);
    this.CreateContest = this.CreateContest.bind(this);
    this.UpdateContest = this.UpdateContest.bind(this);
    this.DeleteContest = this.DeleteContest.bind(this);
    this.EnrollContest = this.EnrollContest.bind(this);
    this.UnenrollContest = this.UnenrollContest.bind(this);
    this.GetContestProblems = this.GetContestProblems.bind(this);
    this.GetContestLeaderboard = this.GetContestLeaderboard.bind(this);
  }

  private async handleErrors<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (error: unknown) {
      throwIfKnownServiceError(error);
      mapUnexpectedError(error);
    }
  }

  async ListContests(
    input: ListContestsServerInput,
    ctx: ContestsContext,
  ): Promise<ListContestsServerOutput> {
    return this.handleErrors(async () => {
      const limit = normalizeLimit(input.limit);
      const filters: ListContestsFilters = { limit };
      if (input.status !== undefined) filters.status = input.status;
      if (input.search !== undefined) filters.search = input.search;
      if (input.cursor !== undefined) filters.cursor = input.cursor;

      const result = await ctx.contestsRepository.list(filters);

      return {
        items: result.items.map(toContestSummary),
        nextCursor: result.nextCursor,
      };
    });
  }

  async GetContest(
    input: GetContestServerInput,
    ctx: ContestsContext,
  ): Promise<GetContestServerOutput> {
    return this.handleErrors(async () => {
      const contestId = requireString(input.contestId, 'contestId');
      const contest = await ctx.contestsRepository.findById(contestId);

      if (!contest) {
        throw new NotFoundError({ message: `Contest '${contestId}' not found.` });
      }

      let isEnrolled: boolean | undefined;
      if (ctx.principal) {
        isEnrolled = await ctx.contestsRepository.enrollmentExists(
          contestId,
          ctx.principal.subject,
        );
      }

      return toContestDetail(contest, isEnrolled);
    });
  }

  async CreateContest(
    input: CreateContestServerInput,
    ctx: ContestsContext,
  ): Promise<CreateContestServerOutput> {
    return this.handleErrors(async () => {
      requireScope(ctx.principal, CONTESTS_WRITE_SCOPE);

      const slug = requireString(input.slug, 'slug');
      const title = requireString(input.title, 'title');
      const description = requireString(input.description, 'description');
      const startsAtRaw = requireString(input.startsAt, 'startsAt');
      const endsAtRaw = requireString(input.endsAt, 'endsAt');
      const problemIds = requireValue(input.problemIds, 'problemIds');

      const startsAt = new Date(startsAtRaw);
      const endsAt = new Date(endsAtRaw);

      if (isNaN(startsAt.getTime())) {
        throw new ValidationException({ message: 'startsAt is not a valid ISO date.' });
      }
      if (isNaN(endsAt.getTime())) {
        throw new ValidationException({ message: 'endsAt is not a valid ISO date.' });
      }
      if (endsAt <= startsAt) {
        throw new ValidationException({ message: 'endsAt must be after startsAt.' });
      }

      const createData: CreateContestData = {
        slug,
        title,
        description,
        startsAt,
        endsAt,
        problemIds,
      };
      if (input.maxParticipants !== undefined) {
        createData.maxParticipants = input.maxParticipants;
      }

      const created = await ctx.contestsRepository.create(createData);

      return toContestDetail(created);
    });
  }

  async UpdateContest(
    input: UpdateContestServerInput,
    ctx: ContestsContext,
  ): Promise<UpdateContestServerOutput> {
    return this.handleErrors(async () => {
      requireScope(ctx.principal, CONTESTS_WRITE_SCOPE);

      const contestId = requireString(input.contestId, 'contestId');

      const contest = await ctx.contestsRepository.findById(contestId);
      if (!contest) {
        throw new NotFoundError({ message: `Contest '${contestId}' not found.` });
      }

      const updateData: UpdateContestData = {};
      if (input.slug !== undefined) updateData.slug = input.slug;
      if (input.title !== undefined) updateData.title = input.title;
      if (input.description !== undefined) updateData.description = input.description;
      if (input.status !== undefined) updateData.status = input.status;
      if (input.maxParticipants !== undefined) updateData.maxParticipants = input.maxParticipants;
      if (input.problemIds !== undefined) updateData.problemIds = input.problemIds;

      if (input.startsAt !== undefined) {
        const startsAt = new Date(input.startsAt);
        if (isNaN(startsAt.getTime())) {
          throw new ValidationException({ message: 'startsAt is not a valid ISO date.' });
        }
        updateData.startsAt = startsAt;
      }
      if (input.endsAt !== undefined) {
        const endsAt = new Date(input.endsAt);
        if (isNaN(endsAt.getTime())) {
          throw new ValidationException({ message: 'endsAt is not a valid ISO date.' });
        }
        updateData.endsAt = endsAt;
      }

      const effectiveStartsAt = updateData.startsAt ?? contest.startsAt;
      const effectiveEndsAt = updateData.endsAt ?? contest.endsAt;
      if (effectiveEndsAt <= effectiveStartsAt) {
        throw new ValidationException({ message: 'endsAt must be after startsAt.' });
      }

      const updated = await ctx.contestsRepository.update(contestId, updateData);

      return toContestDetail(updated);
    });
  }

  async DeleteContest(
    input: DeleteContestServerInput,
    ctx: ContestsContext,
  ): Promise<DeleteContestServerOutput> {
    return this.handleErrors(async () => {
      requireScope(ctx.principal, CONTESTS_WRITE_SCOPE);

      const contestId = requireString(input.contestId, 'contestId');

      const contest = await ctx.contestsRepository.findById(contestId);
      if (!contest) {
        throw new NotFoundError({ message: `Contest '${contestId}' not found.` });
      }

      if (contest.status === 'CANCELED') {
        return {};
      }

      if (contest.status === 'ONGOING') {
        throw new ForbiddenError({ message: 'Cannot cancel an ongoing contest.' });
      }

      await ctx.contestsRepository.softDelete(contestId);

      return {};
    });
  }

  async EnrollContest(
    input: EnrollContestServerInput,
    ctx: ContestsContext,
  ): Promise<EnrollContestServerOutput> {
    return this.handleErrors(async () => {
      requireScope(ctx.principal, CONTESTS_PARTICIPATE_SCOPE);

      const contestId = requireString(input.contestId, 'contestId');
      const userId = ctx.principal!.subject;

      const contest = await ctx.contestsRepository.findById(contestId);
      if (!contest) {
        throw new NotFoundError({ message: `Contest '${contestId}' not found.` });
      }

      const alreadyEnrolled = await ctx.contestsRepository.enrollmentExists(contestId, userId);
      if (alreadyEnrolled) {
        throw new ConflictError({ message: 'Already enrolled in this contest.' });
      }

      if (contest.maxParticipants !== null) {
        const currentCount = await ctx.contestsRepository.countEnrollments(contestId);
        if (currentCount >= contest.maxParticipants) {
          throw new ConflictError({
            message: 'Contest has reached its maximum number of participants.',
          });
        }
      }

      await ctx.contestsRepository.enroll(contestId, userId);

      return { message: 'Successfully enrolled in the contest.' };
    });
  }

  async UnenrollContest(
    input: UnenrollContestServerInput,
    ctx: ContestsContext,
  ): Promise<UnenrollContestServerOutput> {
    return this.handleErrors(async () => {
      requireScope(ctx.principal, CONTESTS_PARTICIPATE_SCOPE);

      const contestId = requireString(input.contestId, 'contestId');
      const userId = ctx.principal!.subject;

      const contest = await ctx.contestsRepository.findById(contestId);
      if (!contest) {
        throw new NotFoundError({ message: `Contest '${contestId}' not found.` });
      }

      await ctx.contestsRepository.unenroll(contestId, userId);

      return { message: 'Successfully unenrolled from the contest.' };
    });
  }

  async GetContestProblems(
    input: GetContestProblemsServerInput,
    ctx: ContestsContext,
  ): Promise<GetContestProblemsServerOutput> {
    return this.handleErrors(async () => {
      const contestId = requireString(input.contestId, 'contestId');

      const contest = await ctx.contestsRepository.findById(contestId);
      if (!contest) {
        throw new NotFoundError({ message: `Contest '${contestId}' not found.` });
      }

      const problemRefs = await ctx.contestsRepository.listProblems(contestId);

      const problems = await Promise.all(
        problemRefs.map(async (ref) => {
          try {
            const result = await ctx.problemsClient.send(
              new GetProblemCommand({ problemId: ref.problemId }),
            );
            return {
              problemId: ref.problemId,
              title: result.title ?? ref.problemId,
              difficulty: result.difficulty ?? 'UNKNOWN',
              orderIndex: ref.orderIndex,
            };
          } catch {
            return {
              problemId: ref.problemId,
              title: ref.problemId,
              difficulty: 'UNKNOWN',
              orderIndex: ref.orderIndex,
            };
          }
        }),
      );

      return { items: problems };
    });
  }

  async GetContestLeaderboard(
    input: GetContestLeaderboardServerInput,
    ctx: ContestsContext,
  ): Promise<GetContestLeaderboardServerOutput> {
    return this.handleErrors(async () => {
      const contestId = requireString(input.contestId, 'contestId');
      const limit = normalizeLimit(input.limit);

      const contest = await ctx.contestsRepository.findById(contestId);
      if (!contest) {
        throw new NotFoundError({ message: `Contest '${contestId}' not found.` });
      }

      const { items: rows, nextCursor } = await ctx.contestsRepository.listResults(
        contestId,
        input.cursor,
        limit,
      );

      const entries = await Promise.all(
        rows.map(async (row, index) => {
          const rank = index + 1;
          let username = row.userId;
          try {
            const user = await ctx.usersClient.send(new GetUserCommand({ userId: row.userId }));
            username = user.userName ?? row.userId;
          } catch {
            // degrade gracefully
          }
          return toLeaderboardEntry(
            row.userId,
            username,
            row.solvedCount,
            row.totalTimeMinutes,
            rank,
          );
        }),
      );

      return { items: entries, nextCursor };
    });
  }
}
