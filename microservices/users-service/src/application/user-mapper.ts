import type {
  GetMeServerOutput,
  GetMyProblemStatusesServerOutput,
  GetUserServerOutput,
} from '@leetcode/users-server-sdk';
import type { UserAggregate, UserProblemStatusItem } from '../domain/user.js';

export function toGetMeOutput(user: UserAggregate): GetMeServerOutput {
  return {
    id: user.id,
    userName: user.userName,
    displayName: user.displayName,
    email: user.email,
    bio: user.bio,
    avatarUrl: user.avatarUrl,
    countryCode: user.countryCode,
  };
}

export function toGetUserOutput(user: UserAggregate): GetUserServerOutput {
  return {
    id: user.id,
    userName: user.userName,
    displayName: user.displayName,
    bio: user.bio,
    avatarUrl: user.avatarUrl,
    countryCode: user.countryCode,
  };
}

export function toGetMyProblemStatusesOutput(
  items: UserProblemStatusItem[],
): GetMyProblemStatusesServerOutput {
  return {
    items: items.map((item) => ({
      problemId: item.problemId,
      status: item.status,
      updatedAt: item.updatedAt,
    })),
  };
}
