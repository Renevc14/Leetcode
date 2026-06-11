// Tipos e interfaz de servicio — generados automáticamente por Smithy (typescript-ssdk-codegen)
import {
  Difficulty,
  Language,
  ProblemNotFoundError,
} from '@com.leetcode/problems-api-server';
import type {
  ProblemsServiceService,
  ListProblemsServerInput,
  ListProblemsServerOutput,
  GetProblemServerInput,
  GetProblemServerOutput,
  CreateProblemServerInput,
  CreateProblemServerOutput,
  UpdateProblemServerInput,
  UpdateProblemServerOutput,
  DisableProblemServerInput,
  DisableProblemServerOutput,
} from '@com.leetcode/problems-api-server';
import { randomUUID } from 'crypto';

// ─── Tipos internos ────────────────────────────────────────────────────────────

interface TestCaseRecord {
  input: string;
  expectedOutput: string;
  isPublic: boolean;
}

interface ProblemRecord {
  id: string;
  slug: string;
  title: string;
  statementMarkdown: string;
  constraints: string;
  difficulty: Difficulty;
  categories: string[];
  timeLimitMs: number;
  memoryLimitMb: number;
  allowedLanguages: Language[];
  testCases: TestCaseRecord[];
  isPublished: boolean;
  totalSubmissions: number;
  acceptedSubmissions: number;
  createdAt: string;
}

// ─── Contexto del servicio ─────────────────────────────────────────────────────

export interface ProblemsContext {
  // En producción esto sería una conexión a RDS PostgreSQL
  problems: Map<string, ProblemRecord>;
}

// ─── Datos semilla para pruebas ────────────────────────────────────────────────

export function createInitialContext(): ProblemsContext {
  const problems = new Map<string, ProblemRecord>();

  const seed: ProblemRecord[] = [
    {
      id: 'prob-001',
      slug: 'two-sum',
      title: 'Two Sum',
      statementMarkdown:
        'Given an array of integers `nums` and an integer `target`, return indices of the two numbers that add up to `target`.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.',
      constraints: '2 <= nums.length <= 10^4\n-10^9 <= nums[i] <= 10^9\n-10^9 <= target <= 10^9',
      difficulty: Difficulty.EASY,
      categories: ['arrays', 'hash-table'],
      timeLimitMs: 1000,
      memoryLimitMb: 256,
      allowedLanguages: [
        Language.PYTHON,
        Language.JAVA,
        Language.CPP,
        Language.JAVASCRIPT,
        Language.TYPESCRIPT,
      ],
      testCases: [
        { input: '[2,7,11,15]\n9', expectedOutput: '[0,1]', isPublic: true },
        { input: '[3,2,4]\n6', expectedOutput: '[1,2]', isPublic: true },
        { input: '[3,3]\n6', expectedOutput: '[0,1]', isPublic: false },
        { input: '[1,2,3,4,5]\n9', expectedOutput: '[3,4]', isPublic: false },
      ],
      isPublished: true,
      totalSubmissions: 1250,
      acceptedSubmissions: 875,
      createdAt: '2024-01-10T10:00:00Z',
    },
    {
      id: 'prob-002',
      slug: 'longest-substring-without-repeating',
      title: 'Longest Substring Without Repeating Characters',
      statementMarkdown:
        'Given a string `s`, find the length of the **longest substring** without repeating characters.',
      constraints:
        '0 <= s.length <= 5 * 10^4\ns consists of English letters, digits, symbols and spaces.',
      difficulty: Difficulty.MEDIUM,
      categories: ['strings', 'sliding-window', 'hash-table'],
      timeLimitMs: 2000,
      memoryLimitMb: 256,
      allowedLanguages: [
        Language.PYTHON,
        Language.JAVA,
        Language.CPP,
        Language.JAVASCRIPT,
        Language.TYPESCRIPT,
      ],
      testCases: [
        { input: 'abcabcbb', expectedOutput: '3', isPublic: true },
        { input: 'bbbbb', expectedOutput: '1', isPublic: true },
        { input: 'pwwkew', expectedOutput: '3', isPublic: false },
        { input: '', expectedOutput: '0', isPublic: false },
      ],
      isPublished: true,
      totalSubmissions: 980,
      acceptedSubmissions: 441,
      createdAt: '2024-01-12T10:00:00Z',
    },
    {
      id: 'prob-003',
      slug: 'median-of-two-sorted-arrays',
      title: 'Median of Two Sorted Arrays',
      statementMarkdown:
        'Given two sorted arrays `nums1` and `nums2` of size `m` and `n` respectively, return **the median** of the two sorted arrays.\n\nThe overall run time complexity should be `O(log (m+n))`.',
      constraints:
        'nums1.length == m\nnums2.length == n\n0 <= m <= 1000\n0 <= n <= 1000\n1 <= m + n <= 2000',
      difficulty: Difficulty.HARD,
      categories: ['arrays', 'binary-search', 'divide-and-conquer'],
      timeLimitMs: 3000,
      memoryLimitMb: 512,
      allowedLanguages: [Language.PYTHON, Language.JAVA, Language.CPP],
      testCases: [
        { input: '[1,3]\n[2]', expectedOutput: '2.00000', isPublic: true },
        { input: '[1,2]\n[3,4]', expectedOutput: '2.50000', isPublic: true },
        { input: '[0,0]\n[0,0]', expectedOutput: '0.00000', isPublic: false },
      ],
      isPublished: true,
      totalSubmissions: 420,
      acceptedSubmissions: 126,
      createdAt: '2024-01-15T10:00:00Z',
    },
  ];

  for (const p of seed) {
    problems.set(p.id, p);
  }

  return { problems };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function validateHasPublicAndHiddenTestCases(testCases: { isPublic: boolean }[]) {
  const hasPublic = testCases.some((tc) => tc.isPublic);
  const hasHidden = testCases.some((tc) => !tc.isPublic);
  if (!hasPublic || !hasHidden) {
    throw new Error('A problem must have at least one public and one hidden test case.');
  }
}

function requireString(value: string | undefined, fieldName: string): string {
  if (!value) {
    throw new Error(`Missing required field '${fieldName}'.`);
  }
  return value;
}

function requireNumber(value: number | undefined, fieldName: string): number {
  if (value === undefined) {
    throw new Error(`Missing required field '${fieldName}'.`);
  }
  return value;
}

function requireValue<T>(value: T | undefined, fieldName: string): T {
  if (value === undefined) {
    throw new Error(`Missing required field '${fieldName}'.`);
  }
  return value;
}

function normalizeTestCases(
  testCases: Array<{
    input: string | undefined;
    expectedOutput: string | undefined;
    isPublic: boolean | undefined;
  }>,
): TestCaseRecord[] {
  return testCases.map((tc, index) => ({
    input: requireString(tc.input, `testCases[${index}].input`),
    expectedOutput: requireString(tc.expectedOutput, `testCases[${index}].expectedOutput`),
    isPublic: requireValue(tc.isPublic, `testCases[${index}].isPublic`),
  }));
}

// ─── Implementación del servicio ───────────────────────────────────────────────

export class ProblemsServiceImpl implements ProblemsServiceService<ProblemsContext> {
  ListProblems(
    input: ListProblemsServerInput,
    ctx: ProblemsContext,
  ): Promise<ListProblemsServerOutput> {
    const page = input.page ?? 1;
    const pageSize = Math.min(input.pageSize ?? 20, 100);

    let results = Array.from(ctx.problems.values()).filter((p) => p.isPublished);

    // Filtrar por dificultad
    if (input.difficulty) {
      results = results.filter((p) => p.difficulty === input.difficulty);
    }

    // Filtrar por categoría
    if (input.category) {
      results = results.filter((p) => p.categories.includes(input.category!));
    }

    const total = results.length;
    const start = (page - 1) * pageSize;
    const paged = results.slice(start, start + pageSize);

    return Promise.resolve({
      items: paged.map((p) => ({
        id: p.id,
        title: p.title,
        difficulty: p.difficulty,
        categories: p.categories,
        acceptanceRate:
          p.totalSubmissions > 0
            ? Math.round((p.acceptedSubmissions / p.totalSubmissions) * 100)
            : 0,
      })),
      total,
      page,
    });
  }

  GetProblem(
    input: GetProblemServerInput,
    ctx: ProblemsContext,
  ): Promise<GetProblemServerOutput> {
    const problemId = requireString(input.problemId, 'problemId');
    const problem = ctx.problems.get(problemId);

    if (!problem || !problem.isPublished) {
      throw new ProblemNotFoundError({
        message: `Problem '${problemId}' does not exist or is disabled.`,
      });
    }

    return Promise.resolve({
      id: problem.id,
      title: problem.title,
      difficulty: problem.difficulty,
      categories: problem.categories,
      acceptanceRate:
        problem.totalSubmissions > 0
          ? Math.round((problem.acceptedSubmissions / problem.totalSubmissions) * 100)
          : 0,
      statementMarkdown: problem.statementMarkdown,
      constraints: problem.constraints,
      timeLimitMs: problem.timeLimitMs,
      memoryLimitMb: problem.memoryLimitMb,
      allowedLanguages: problem.allowedLanguages,
      publicTestCases: problem.testCases
        .filter((tc) => tc.isPublic)
        .map((tc) => ({ input: tc.input, expectedOutput: tc.expectedOutput })),
    });
  }

  CreateProblem(
    input: CreateProblemServerInput,
    ctx: ProblemsContext,
  ): Promise<CreateProblemServerOutput> {
    // En producción: validar JWT claim roles === SETTER | ADMIN
    const title = requireString(input.title, 'title');
    const statementMarkdown = requireString(input.statementMarkdown, 'statementMarkdown');
    const constraints = requireString(input.constraints, 'constraints');
    const difficulty = requireValue(input.difficulty, 'difficulty');
    const timeLimitMs = requireNumber(input.timeLimitMs, 'timeLimitMs');
    const memoryLimitMb = requireNumber(input.memoryLimitMb, 'memoryLimitMb');
    const testCases = normalizeTestCases(input.testCases ?? []);
    validateHasPublicAndHiddenTestCases(testCases);

    const id = `prob-${randomUUID().slice(0, 8)}`;
    const newProblem: ProblemRecord = {
      id,
      slug: title.toLowerCase().replace(/\s+/g, '-'),
      title,
      statementMarkdown,
      constraints,
      difficulty,
      categories: input.categories ?? [],
      timeLimitMs,
      memoryLimitMb,
      allowedLanguages: (input.allowedLanguages ?? []) as Language[],
      testCases,
      isPublished: true,
      totalSubmissions: 0,
      acceptedSubmissions: 0,
      createdAt: new Date().toISOString(),
    };

    ctx.problems.set(id, newProblem);
    console.log(`[problems-service] Problem created: ${id} - ${title}`);

    return Promise.resolve({ id });
  }

  UpdateProblem(
    input: UpdateProblemServerInput,
    ctx: ProblemsContext,
  ): Promise<UpdateProblemServerOutput> {
    const problemId = requireString(input.problemId, 'problemId');
    const problem = ctx.problems.get(problemId);

    if (!problem) {
      throw new ProblemNotFoundError({
        message: `Problem '${problemId}' not found.`,
      });
    }

    // Actualización parcial — solo los campos presentes en el request
    if (input.title !== undefined) problem.title = input.title;
    if (input.statementMarkdown !== undefined) problem.statementMarkdown = input.statementMarkdown;
    if (input.constraints !== undefined) problem.constraints = input.constraints;
    if (input.difficulty !== undefined) problem.difficulty = input.difficulty;
    if (input.categories !== undefined) problem.categories = input.categories;
    if (input.timeLimitMs !== undefined) problem.timeLimitMs = input.timeLimitMs;
    if (input.memoryLimitMb !== undefined) problem.memoryLimitMb = input.memoryLimitMb;
    if (input.allowedLanguages !== undefined)
      problem.allowedLanguages = input.allowedLanguages as Language[];
    if (input.testCases !== undefined) {
      problem.testCases = normalizeTestCases(input.testCases);
    }

    ctx.problems.set(problem.id, problem);
    console.log(`[problems-service] Problem updated: ${problem.id}`);

    return Promise.resolve({ id: problem.id });
  }

  DisableProblem(
    input: DisableProblemServerInput,
    ctx: ProblemsContext,
  ): Promise<DisableProblemServerOutput> {
    const problemId = requireString(input.problemId, 'problemId');
    const problem = ctx.problems.get(problemId);

    if (!problem) {
      throw new ProblemNotFoundError({
        message: `Problem '${problemId}' not found.`,
      });
    }

    // Soft delete — el historial de envíos se conserva
    problem.isPublished = false;
    ctx.problems.set(problem.id, problem);
    console.log(`[problems-service] Problem disabled: ${problem.id}`);

    return Promise.resolve({
      message: `Problem '${problemId}' has been disabled. Submission history preserved.`,
    });
  }
}
