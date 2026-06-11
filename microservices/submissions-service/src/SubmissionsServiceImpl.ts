import {
  RunCodeServerInput,
  RunCodeServerOutput,
  SubmitServerInput,
  SubmitServerOutput,
  GetSubmissionServerInput,
  GetSubmissionServerOutput,
  ListSubmissionsServerInput,
  ListSubmissionsServerOutput,
  GetSubmissionCodeServerInput,
  GetSubmissionCodeServerOutput,
  SubmissionsServiceService,
  Language,
  SubmissionStatus,
  Verdict,
} from '@com.leetcode/submissions-api-server';

interface SubmissionRecord {
  id: string;
  problemId: string;
  userId: string;
  language: Language;
  status: SubmissionStatus;
  verdict?: Verdict;
  runtimeMs?: number;
  memoryKb?: number;
  failedTestCaseIndex?: number;
  compileError?: string;
  sourceCode: string;
  isRun: boolean;
  createdAt: string;
}

const db = new Map<string, SubmissionRecord>();

function seed() {
  const records: SubmissionRecord[] = [
    {
      id: 'sub-001',
      problemId: 'prob-001',
      userId: 'user-001',
      language: Language.PYTHON,
      status: SubmissionStatus.DONE,
      verdict: Verdict.AC,
      runtimeMs: 42,
      memoryKb: 14200,
      sourceCode:
        'def twoSum(nums, target):\n    seen = {}\n    for i, n in enumerate(nums):\n        if target - n in seen:\n            return [seen[target - n], i]\n        seen[n] = i',
      isRun: false,
      createdAt: '2024-03-01T10:00:00Z',
    },
    {
      id: 'sub-002',
      problemId: 'prob-001',
      userId: 'user-002',
      language: Language.JAVA,
      status: SubmissionStatus.DONE,
      verdict: Verdict.WA,
      runtimeMs: 88,
      memoryKb: 41000,
      failedTestCaseIndex: 3,
      sourceCode:
        'class Solution { public int[] twoSum(int[] nums, int target) { return new int[]{}; } }',
      isRun: false,
      createdAt: '2024-03-02T14:30:00Z',
    },
    {
      id: 'sub-003',
      problemId: 'prob-002',
      userId: 'user-001',
      language: Language.CPP,
      status: SubmissionStatus.DONE,
      verdict: Verdict.TLE,
      runtimeMs: 5000,
      memoryKb: 8192,
      sourceCode: 'class Solution { public: bool isPalindrome(string s) { return false; } };',
      isRun: false,
      createdAt: '2024-03-03T09:15:00Z',
    },
    {
      id: 'sub-004',
      problemId: 'prob-003',
      userId: 'user-003',
      language: Language.JAVASCRIPT,
      status: SubmissionStatus.RUNNING,
      sourceCode: 'var maxProfit = function(prices) { return 0; };',
      isRun: false,
      createdAt: '2024-03-04T11:00:00Z',
    },
    {
      id: 'sub-005',
      problemId: 'prob-002',
      userId: 'user-002',
      language: Language.TYPESCRIPT,
      status: SubmissionStatus.QUEUED,
      sourceCode: 'function isPalindrome(s: string): boolean { return false; }',
      isRun: false,
      createdAt: '2024-03-05T16:45:00Z',
    },
  ];
  for (const r of records) db.set(r.id, r);
}

seed();

let idCounter = 6;
function newId(): string {
  return `sub-${String(idCounter++).padStart(3, '0')}`;
}

function simulateResult(id: string) {
  setTimeout(() => {
    const rec = db.get(id);
    if (!rec) return;
    rec.status = SubmissionStatus.DONE;
    rec.verdict = Verdict.AC;
    rec.runtimeMs = Math.floor(Math.random() * 200) + 10;
    rec.memoryKb = Math.floor(Math.random() * 30000) + 8000;
  }, 2000);
}

function notFound(message: string): never {
  throw { $fault: 'client', $metadata: {}, message } as any;
}

function unauthorized(): never {
  throw { $fault: 'client', $metadata: {}, message: 'Unauthorized' } as any;
}

function requireString(value: string | undefined, fieldName: string): string {
  if (!value) {
    throw {
      $fault: 'client',
      $metadata: {},
      message: `Missing required field '${fieldName}'`,
    } as any;
  }
  return value;
}

function requireValue<T>(value: T | undefined, fieldName: string): T {
  if (value === undefined) {
    throw {
      $fault: 'client',
      $metadata: {},
      message: `Missing required field '${fieldName}'`,
    } as any;
  }
  return value;
}

export const submissionsServiceImpl: SubmissionsServiceService<{}> = {
  async RunCode(input: RunCodeServerInput): Promise<RunCodeServerOutput> {
    const problemId = requireString(input.problemId, 'problemId');
    const language = requireValue(input.language, 'language');
    const sourceCode = requireString(input.sourceCode, 'sourceCode');
    const id = newId();
    db.set(id, {
      id,
      problemId,
      userId: 'user-anon',
      language,
      status: SubmissionStatus.QUEUED,
      sourceCode,
      isRun: true,
      createdAt: new Date().toISOString(),
    });
    simulateResult(id);
    return { submissionId: id, status: SubmissionStatus.QUEUED };
  },

  async Submit(input: SubmitServerInput): Promise<SubmitServerOutput> {
    const problemId = requireString(input.problemId, 'problemId');
    const language = requireValue(input.language, 'language');
    const sourceCode = requireString(input.sourceCode, 'sourceCode');
    const id = newId();
    db.set(id, {
      id,
      problemId,
      userId: 'user-001',
      language,
      status: SubmissionStatus.QUEUED,
      sourceCode,
      isRun: false,
      createdAt: new Date().toISOString(),
    });
    simulateResult(id);
    return { submissionId: id, status: SubmissionStatus.QUEUED };
  },

  async GetSubmission(input: GetSubmissionServerInput): Promise<GetSubmissionServerOutput> {
    const submissionId = requireString(input.submissionId, 'submissionId');
    const rec = db.get(submissionId);
    if (!rec) notFound(`Submission '${submissionId}' not found`);
    return {
      id: rec.id,
      problemId: rec.problemId,
      userId: rec.userId,
      language: rec.language,
      status: rec.status,
      verdict: rec.verdict,
      runtimeMs: rec.runtimeMs,
      memoryKb: rec.memoryKb,
      failedTestCaseIndex: rec.failedTestCaseIndex,
      compileError: rec.compileError,
      createdAt: rec.createdAt,
    };
  },

  async ListSubmissions(input: ListSubmissionsServerInput): Promise<ListSubmissionsServerOutput> {
    let items = Array.from(db.values()).filter((r) => !r.isRun);
    if (input.problemId) items = items.filter((r) => r.problemId === input.problemId);
    if (input.userId) items = items.filter((r) => r.userId === input.userId);
    if (input.verdict) items = items.filter((r) => r.verdict === input.verdict);

    const total = items.length;
    const page = input.page ?? 1;
    const pageSize = input.pageSize ?? 20;
    const paged = items.slice((page - 1) * pageSize, page * pageSize);

    return {
      items: paged.map((r) => ({
        id: r.id,
        problemId: r.problemId,
        userId: r.userId,
        language: r.language,
        status: r.status,
        verdict: r.verdict,
        runtimeMs: r.runtimeMs,
        memoryKb: r.memoryKb,
        createdAt: r.createdAt,
      })),
      total,
      page,
    };
  },

  async GetSubmissionCode(
    input: GetSubmissionCodeServerInput,
  ): Promise<GetSubmissionCodeServerOutput> {
    const submissionId = requireString(input.submissionId, 'submissionId');
    const rec = db.get(submissionId);
    if (!rec) notFound(`Submission '${submissionId}' not found`);
    return { sourceCode: rec.sourceCode, language: rec.language };
  },
};
