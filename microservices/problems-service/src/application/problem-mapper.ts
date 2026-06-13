import type {
  CreateProblemServerOutput,
  GetProblemServerOutput,
  ListProblemsServerOutput,
  UpdateProblemServerOutput,
} from '@leetcode/problems-server-sdk';
import type { ProblemAggregate } from '../domain/problem.js';

const ACCEPTANCE_RATE_FALLBACK = 0; // TODO: replace with a real value from a submissions aggregate

export function toListProblemsOutput(
  problems: ProblemAggregate[],
  nextCursor: string | undefined,
): ListProblemsServerOutput {
  return {
    items: problems.map((problem) => ({
      id: problem.id,
      slug: problem.slug,
      title: problem.title,
      difficulty: problem.difficulty,
      categories: problem.categories,
      acceptanceRate: ACCEPTANCE_RATE_FALLBACK,
    })),
    nextCursor,
  };
}

export function toGetProblemOutput(
  problem: ProblemAggregate,
  includeAllTestCases = false,
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
    acceptanceRate: ACCEPTANCE_RATE_FALLBACK,
    testCases: testCases.map((testCase) => ({
      id: testCase.id,
      input: testCase.input,
      expectedOutput: testCase.expectedOutput,
      isSample: testCase.isSample,
    })),
  };
}

export function toCreateProblemOutput(problem: ProblemAggregate): CreateProblemServerOutput {
  return toGetProblemOutput(problem);
}

export function toUpdateProblemOutput(problem: ProblemAggregate): UpdateProblemServerOutput {
  return toGetProblemOutput(problem);
}
