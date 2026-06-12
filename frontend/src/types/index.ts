export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';

/** Enum del submissions-service (MAYÚSCULAS) */
export type Language = 'PYTHON' | 'JAVA' | 'CPP' | 'JAVASCRIPT' | 'TYPESCRIPT';

/** Enum del problems-service (minúsculas) — allowedLanguages */
export type ProblemLanguage = 'python' | 'java' | 'cpp' | 'javascript' | 'typescript';

export type SubmissionStatus = 'QUEUED' | 'RUNNING' | 'DONE';

export type Verdict = 'AC' | 'WA' | 'TLE' | 'MLE' | 'RE' | 'CE';

export type ContestStatus = 'UPCOMING' | 'LIVE' | 'FINISHED';

export type MyStatus = 'unsolved' | 'attempted' | 'solved';

export type UserRole = 'USER' | 'SETTER' | 'ADMIN';

// ─── users-service ────────────────────────────────────────────────────────────

/** GET /v1/users/me */
export interface Me {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  createdAt: string;
}

/** GET /v1/users/{userId} — perfil público, sin email */
export interface PublicUser {
  id: string;
  username: string;
  createdAt: string;
}

/** GET /v1/users/{userId}/stats */
export interface UserStats {
  userId: string;
  solvedByDifficulty: { easy: number; medium: number; hard: number };
  acceptanceRate: number;
  contestsPlayed: number;
  totalSubmissions: number;
}

/** Sesión local (auth simulada — el auth real vendrá de un servicio externo) */
export interface SessionUser {
  id: string;
  username: string;
  email?: string;
  role?: UserRole;
  createdAt?: string;
}

// ─── problems-service ─────────────────────────────────────────────────────────

export interface PublicTestCase {
  input: string;
  expectedOutput: string;
}

export interface TestCaseInput {
  input: string;
  expectedOutput: string;
  isPublic: boolean;
}

/** Item de GET /v1/problems */
export interface ProblemSummary {
  id: string;
  title: string;
  difficulty: Difficulty;
  categories: string[];
  acceptanceRate: number;
  myStatus?: MyStatus;
}

/** GET /v1/problems/{problemId} */
export interface ProblemDetail {
  id: string;
  title: string;
  difficulty: Difficulty;
  categories: string[];
  acceptanceRate: number;
  myStatus?: MyStatus;
  statementMarkdown: string;
  constraints: string;
  timeLimitMs: number;
  memoryLimitMb: number;
  allowedLanguages: ProblemLanguage[];
  publicTestCases: PublicTestCase[];
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
}

// ─── submissions-service ──────────────────────────────────────────────────────

export interface Submission {
  id: string;
  problemId: string;
  userId: string;
  language: Language;
  status: SubmissionStatus;
  verdict?: Verdict | null;
  runtimeMs?: number | null;
  memoryKb?: number | null;
  failedTestCaseIndex?: number | null;
  compileError?: string | null;
  createdAt: string;
}

export interface SubmissionCode {
  sourceCode: string;
  language: Language;
}

// ─── contests-service ─────────────────────────────────────────────────────────

/** Item de GET /v1/contests — no incluye description ni isEnrolled */
export interface ContestSummary {
  id: string;
  title: string;
  status: ContestStatus;
  startTime: string;
  endTime: string;
  participantCount: number;
}

/** GET /v1/contests/{contestId} */
export interface Contest extends ContestSummary {
  description: string;
  isEnrolled?: boolean;
}

export interface ContestProblem {
  problemId: string;
  title: string;
  difficulty: Difficulty;
  order: number;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  score: number;
  solvedCount: number;
  penalty: number;
}
