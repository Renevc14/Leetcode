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

export function toGetProblemOutput(problem: ProblemAggregate): GetProblemServerOutput {
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
    publicTestCases: problem.testCases
      .filter((testCase) => testCase.isSample)
      .map((testCase) => ({ input: testCase.input, expectedOutput: testCase.expectedOutput })),
  };
}

export function toCreateProblemOutput(problem: ProblemAggregate): CreateProblemServerOutput {
  return toGetProblemOutput(problem);
}

export function toUpdateProblemOutput(problem: ProblemAggregate): UpdateProblemServerOutput {
  return toGetProblemOutput(problem);
}
