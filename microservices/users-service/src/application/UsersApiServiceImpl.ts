import {
  type GetMeServerInput,
  type GetMeServerOutput,
  type GetMyProblemStatusesServerInput,
  type GetMyProblemStatusesServerOutput,
  type GetUserServerInput,
  type GetUserServerOutput,
  type RecordProblemStatusServerInput,
  type RecordProblemStatusServerOutput,
  NotFoundError,
  UnauthorizedError,
  type UsersApiService,
} from '@leetcode/users-server-sdk';
import type { UsersContext } from '../context.js';
import { throwIfKnownServiceError } from './errors.js';
import { requireAuth } from './authz.js';
import { mapUnexpectedError } from '../persistence/prisma/error-handlers.js';
import { toGetMeOutput, toGetMyProblemStatusesOutput, toGetUserOutput } from './user-mapper.js';

export class UsersApiServiceImpl implements UsersApiService<UsersContext> {
  constructor() {
    this.GetMe = this.GetMe.bind(this);
    this.GetUser = this.GetUser.bind(this);
    this.GetMyProblemStatuses = this.GetMyProblemStatuses.bind(this);
    this.RecordProblemStatus = this.RecordProblemStatus.bind(this);
  }

  private async handleErrors<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (error: unknown) {
      throwIfKnownServiceError(error);
      mapUnexpectedError(error);
    }
  }

  async GetMe(_input: GetMeServerInput, ctx: UsersContext): Promise<GetMeServerOutput> {
    return this.handleErrors(async () => {
      const authentikId = requireAuth(ctx.principal);

      const user = await ctx.usersRepository.findByAuthentikId(authentikId);
      if (!user) {
        throw new UnauthorizedError({ message: 'Authenticated user not found.' });
      }

      return toGetMeOutput(user);
    });
  }

  async GetUser(input: GetUserServerInput, ctx: UsersContext): Promise<GetUserServerOutput> {
    return this.handleErrors(async () => {
      const userId = input.userId!;
      const user = await ctx.usersRepository.findById(userId);

      if (!user) {
        throw new NotFoundError({ message: `User '${userId}' not found.` });
      }

      return toGetUserOutput(user);
    });
  }

  async GetMyProblemStatuses(
    _input: GetMyProblemStatusesServerInput,
    ctx: UsersContext,
  ): Promise<GetMyProblemStatusesServerOutput> {
    return this.handleErrors(async () => {
      const authentikId = requireAuth(ctx.principal);

      const user = await ctx.usersRepository.findByAuthentikId(authentikId);
      if (!user) {
        throw new UnauthorizedError({ message: 'Authenticated user not found.' });
      }

      const items = await ctx.usersRepository.listProblemStatuses(user.id);
      return toGetMyProblemStatusesOutput(items);
    });
  }

  async RecordProblemStatus(
    input: RecordProblemStatusServerInput,
    ctx: UsersContext,
  ): Promise<RecordProblemStatusServerOutput> {
    return this.handleErrors(async () => {
      const authentikId = requireAuth(ctx.principal);

      const user = await ctx.usersRepository.findById(authentikId);
      if (!user) {
        throw new UnauthorizedError({ message: 'Authenticated user not found.' });
      }

      await ctx.usersRepository.upsertProblemStatus(user.id, input.problemId!, input.status!);
      return {};
    });
  }
}
