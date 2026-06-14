import type {
  ContestDetail,
  ContestSummary,
  LeaderboardEntry,
} from '@leetcode/contests-server-sdk';
import type { ContestAggregate } from '../domain/contest.js';

export function toContestSummary(contest: ContestAggregate): ContestSummary {
  return {
    id: contest.id,
    slug: contest.slug,
    title: contest.title,
    status: contest.status,
    startsAt: contest.startsAt.toISOString(),
    endsAt: contest.endsAt.toISOString(),
    participantCount: contest.participantCount,
    maxParticipants: contest.maxParticipants ?? undefined,
  };
}

export function toContestDetail(contest: ContestAggregate, isEnrolled?: boolean): ContestDetail {
  return {
    id: contest.id,
    slug: contest.slug,
    title: contest.title,
    description: contest.description,
    status: contest.status,
    startsAt: contest.startsAt.toISOString(),
    endsAt: contest.endsAt.toISOString(),
    participantCount: contest.participantCount,
    maxParticipants: contest.maxParticipants ?? undefined,
    isEnrolled,
  };
}

export function toLeaderboardEntry(
  userId: string,
  username: string,
  solvedCount: number,
  totalTimeMinutes: number,
  rank: number,
): LeaderboardEntry {
  return {
    rank,
    userId,
    username,
    solvedCount,
    totalTimeMinutes,
  };
}
