import type { Difficulty, Language } from '@leetcode/problems-server-sdk';

export interface ProblemTestCase {
  id: string;
  input: string;
  expectedOutput: string;
  isSample: boolean;
  orderIndex: number;
}

export interface ProblemAggregate {
  id: string;
  slug: string;
  title: string;
  descriptionMd: string;
  constraintsMd: string;
  difficulty: Difficulty;
  timeLimitMs: number;
  memoryLimitMb: number;
  categories: string[];
  allowedLanguages: Language[];
  testCases: ProblemTestCase[];
  isPublished: boolean;
  isDeleted: boolean;
  acceptanceRate: number;
}

export interface ProblemListResult {
  items: ProblemAggregate[];
  nextCursor: string | undefined;
}

export interface CreateProblemData {
  slug: string;
  title: string;
  descriptionMd: string;
  constraintsMd: string;
  difficulty: Difficulty;
  categories: string[];
  timeLimitMs: number;
  memoryLimitMb: number;
  allowedLanguages: Language[];
  testCases: Array<{
    input: string;
    expectedOutput: string;
    isSample: boolean;
  }>;
}

export interface UpdateProblemData {
  id: string;
  slug?: string;
  title?: string;
  descriptionMd?: string;
  constraintsMd?: string;
  difficulty?: Difficulty;
  categories?: string[];
  timeLimitMs?: number;
  memoryLimitMb?: number;
  allowedLanguages?: Language[];
  testCases?: Array<{
    input: string;
    expectedOutput: string;
    isSample: boolean;
  }>;
  isPublished?: boolean;
}
