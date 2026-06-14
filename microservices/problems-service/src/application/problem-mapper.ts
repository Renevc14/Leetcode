import type {
  CreateProblemServerOutput,
  GetProblemServerOutput,
  ListProblemsServerOutput,
  UpdateProblemServerOutput,
} from '@leetcode/problems-server-sdk';
import type { ProblemAggregate } from '../domain/problem.js';

type UserStatusMap = Map<string, 'ATTEMPTED' | 'SOLVED'>;

export function toListProblemsOutput(
  problems: ProblemAggregate[],
  nextCursor: string | undefined,
  statusMap?: UserStatusMap,
): ListProblemsServerOutput {
  return {
    items: problems.map((problem) => ({
      id: problem.id,
      slug: problem.slug,
      title: problem.title,
      difficulty: problem.difficulty,
      categories: problem.categories,
      acceptanceRate: problem.acceptanceRate,
      ...(statusMap !== undefined
        ? { userStatus: statusMap.get(problem.id) ?? 'NOT_ATTEMPTED' }
        : {}),
    })),
    nextCursor,
  };
}

export function toGetProblemOutput(
  problem: ProblemAggregate,
  includeAllTestCases = false,
  statusMap?: UserStatusMap,
): GetProblemServerOutput {
  const testCases = includeAllTestCases
    ? problem.testCases
    : problem.testCases.filter((testCase) => testCase.isSample);

  return {
    id: problem.id,
    slug: problem.slug,
    title: problem.title,
    descriptionMd: problem.descriptionMd,
    constraintsMd: problem.constraintsMd,
    difficulty: problem.difficulty,
    timeLimitMs: problem.timeLimitMs,
    memoryLimitMb: problem.memoryLimitMb,
    allowedLanguages: problem.allowedLanguages,
    categories: problem.categories,
    acceptanceRate: problem.acceptanceRate,
    testCases: testCases.map((testCase) => ({
      id: testCase.id,
      input: testCase.input,
      expectedOutput: testCase.expectedOutput,
      isSample: testCase.isSample,
    })),
    ...(statusMap !== undefined
      ? { userStatus: statusMap.get(problem.id) ?? 'NOT_ATTEMPTED' }
      : {}),
  };
}

export function toCreateProblemOutput(problem: ProblemAggregate): CreateProblemServerOutput {
  return toGetProblemOutput(problem);
}

export function toUpdateProblemOutput(problem: ProblemAggregate): UpdateProblemServerOutput {
  return toGetProblemOutput(problem);
}
