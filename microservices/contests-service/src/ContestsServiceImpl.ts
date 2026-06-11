import {
  ContestStatus,
  Difficulty,
} from '@com.leetcode/contests-api-server';
import type {
  ListContestsServerInput,
  ListContestsServerOutput,
  GetContestServerInput,
  GetContestServerOutput,
  CreateContestServerInput,
  CreateContestServerOutput,
  EnrollContestServerInput,
  EnrollContestServerOutput,
  UnenrollContestServerInput,
  UnenrollContestServerOutput,
  GetContestProblemsServerInput,
  GetContestProblemsServerOutput,
  GetLeaderboardServerInput,
  GetLeaderboardServerOutput,
  ContestsServiceService,
} from '@com.leetcode/contests-api-server';

interface ContestRecord {
  id: string;
  title: string;
  description: string;
  status: ContestStatus;
  startTime: string;
  endTime: string;
  participantCount: number;
  problemIds: string[];
  enrolledUserIds: Set<string>;
}

interface ContestProblemRecord {
  problemId: string;
  title: string;
  difficulty: Difficulty;
  order: number;
}

const db = new Map<string, ContestRecord>();

const problemTitles: Record<string, { title: string; difficulty: Difficulty }> = {
  'prob-001': { title: 'Two Sum', difficulty: Difficulty.EASY },
  'prob-002': { title: 'Valid Palindrome', difficulty: Difficulty.EASY },
  'prob-003': { title: 'Best Time to Buy and Sell Stock', difficulty: Difficulty.MEDIUM },
  'prob-004': {
    title: 'Longest Substring Without Repeating Characters',
    difficulty: Difficulty.MEDIUM,
  },
  'prob-005': { title: 'Median of Two Sorted Arrays', difficulty: Difficulty.HARD },
};

function seed() {
  const now = new Date();
  const past = (h: number) => new Date(now.getTime() - h * 3600000).toISOString();
  const future = (h: number) => new Date(now.getTime() + h * 3600000).toISOString();

  const contests: ContestRecord[] = [
    {
      id: 'contest-001',
      title: 'Weekly Contest 380',
      description: 'Standard weekly rated contest with 4 problems.',
      status: ContestStatus.FINISHED,
      startTime: past(48),
      endTime: past(46),
      participantCount: 12483,
      problemIds: ['prob-001', 'prob-002', 'prob-003', 'prob-005'],
      enrolledUserIds: new Set(['user-001', 'user-002', 'user-003']),
    },
    {
      id: 'contest-002',
      title: 'Biweekly Contest 120',
      description: 'Biweekly contest — easier warmup problems.',
      status: ContestStatus.LIVE,
      startTime: past(1),
      endTime: future(1),
      participantCount: 3421,
      problemIds: ['prob-001', 'prob-002', 'prob-003'],
      enrolledUserIds: new Set(['user-001', 'user-003']),
    },
    {
      id: 'contest-003',
      title: 'Weekly Contest 381',
      description: 'Upcoming weekly rated contest.',
      status: ContestStatus.UPCOMING,
      startTime: future(24),
      endTime: future(26),
      participantCount: 0,
      problemIds: ['prob-003', 'prob-004', 'prob-005'],
      enrolledUserIds: new Set(),
    },
  ];

  for (const c of contests) db.set(c.id, c);
}

seed();

let idCounter = 4;
function newId(): string {
  return `contest-${String(idCounter++).padStart(3, '0')}`;
}

class ClientFaultError extends Error {
  readonly $fault = 'client' as const;
  readonly $metadata: Record<string, never> = {};

  constructor(message: string) {
    super(message);
    this.name = 'ClientFaultError';
  }
}

function notFound(message: string): never {
  throw new ClientFaultError(message);
}

function conflict(message: string): never {
  throw new ClientFaultError(message);
}

function requireString(value: string | undefined, fieldName: string): string {
  if (!value) {
    throw new ClientFaultError(`Missing required field '${fieldName}'`);
  }
  return value;
}

const CURRENT_USER_ID = 'user-001';

export const contestsServiceImpl: ContestsServiceService<Record<string, never>> = {
  ListContests(input: ListContestsServerInput): Promise<ListContestsServerOutput> {
    let items = Array.from(db.values());
    if (input.status) items = items.filter((c) => c.status === input.status);

    const total = items.length;
    const page = input.page ?? 1;
    const pageSize = input.pageSize ?? 20;
    const paged = items.slice((page - 1) * pageSize, page * pageSize);

    return Promise.resolve({
      items: paged.map((c) => ({
        id: c.id,
        title: c.title,
        status: c.status,
        startTime: c.startTime,
        endTime: c.endTime,
        participantCount: c.participantCount,
      })),
      total,
      page,
    });
  },

  GetContest(input: GetContestServerInput): Promise<GetContestServerOutput> {
    const contestId = requireString(input.contestId, 'contestId');
    const c = db.get(contestId);
    if (!c) notFound(`Contest '${contestId}' not found`);
    return Promise.resolve({
      id: c.id,
      title: c.title,
      description: c.description,
      status: c.status,
      startTime: c.startTime,
      endTime: c.endTime,
      participantCount: c.participantCount,
      isEnrolled: c.enrolledUserIds.has(CURRENT_USER_ID),
    });
  },

  CreateContest(input: CreateContestServerInput): Promise<CreateContestServerOutput> {
    const now = new Date().toISOString();
    const title = requireString(input.title, 'title');
    const description = requireString(input.description, 'description');
    const startTime = requireString(input.startTime, 'startTime');
    const endTime = requireString(input.endTime, 'endTime');
    const status = now < startTime ? ContestStatus.UPCOMING : ContestStatus.LIVE;

    const id = newId();
    db.set(id, {
      id,
      title,
      description,
      status,
      startTime,
      endTime,
      participantCount: 0,
      problemIds: input.problemIds ?? [],
      enrolledUserIds: new Set(),
    });

    return Promise.resolve({ id, title, status });
  },

  EnrollContest(input: EnrollContestServerInput): Promise<EnrollContestServerOutput> {
    const contestId = requireString(input.contestId, 'contestId');
    const c = db.get(contestId);
    if (!c) notFound(`Contest '${contestId}' not found`);
    if (c.enrolledUserIds.has(CURRENT_USER_ID)) {
      conflict('Already enrolled in this contest');
    }
    c.enrolledUserIds.add(CURRENT_USER_ID);
    c.participantCount += 1;
    return Promise.resolve({ message: 'Successfully enrolled in contest' });
  },

  UnenrollContest(input: UnenrollContestServerInput): Promise<UnenrollContestServerOutput> {
    const contestId = requireString(input.contestId, 'contestId');
    const c = db.get(contestId);
    if (!c) notFound(`Contest '${contestId}' not found`);
    if (!c.enrolledUserIds.has(CURRENT_USER_ID)) {
      conflict('Not enrolled in this contest');
    }
    c.enrolledUserIds.delete(CURRENT_USER_ID);
    c.participantCount = Math.max(0, c.participantCount - 1);
    return Promise.resolve({ message: 'Successfully unenrolled from contest' });
  },

  GetContestProblems(
    input: GetContestProblemsServerInput,
  ): Promise<GetContestProblemsServerOutput> {
    const contestId = requireString(input.contestId, 'contestId');
    const c = db.get(contestId);
    if (!c) notFound(`Contest '${contestId}' not found`);

    const items: ContestProblemRecord[] = c.problemIds.map((pid, idx) => {
      const meta = problemTitles[pid] ?? { title: `Problem ${pid}`, difficulty: Difficulty.MEDIUM };
      return { problemId: pid, title: meta.title, difficulty: meta.difficulty, order: idx + 1 };
    });

    return Promise.resolve({ items });
  },

  GetLeaderboard(input: GetLeaderboardServerInput): Promise<GetLeaderboardServerOutput> {
    const contestId = requireString(input.contestId, 'contestId');
    const c = db.get(contestId);
    if (!c) notFound(`Contest '${contestId}' not found`);

    const entries = [
      { rank: 1, userId: 'user-001', username: 'alice', score: 14, solvedCount: 4, penalty: 20 },
      { rank: 2, userId: 'user-002', username: 'bob', score: 11, solvedCount: 3, penalty: 45 },
      { rank: 3, userId: 'user-003', username: 'carol', score: 8, solvedCount: 2, penalty: 30 },
    ];

    const total = entries.length;
    const page = input.page ?? 1;
    const pageSize = input.pageSize ?? 20;
    const paged = entries.slice((page - 1) * pageSize, page * pageSize);

    return Promise.resolve({ items: paged, total, page });
  },
};
