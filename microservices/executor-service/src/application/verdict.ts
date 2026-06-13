import type { ExecutionStatus, TestCaseOutcome } from '../domain/execution.js';

export function normalizeOutput(raw: string): string {
  return raw
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
    .trim();
}

export function compareOutput(actual: string, expected: string): boolean {
  return normalizeOutput(actual) === normalizeOutput(expected);
}

const STATUS_PRIORITY: ExecutionStatus[] = [
  'COMPILATION_ERROR',
  'RUNTIME_ERROR',
  'TIME_LIMIT_EXCEEDED',
  'MEMORY_LIMIT_EXCEEDED',
  'WRONG_ANSWER',
  'ACCEPTED',
];

export function aggregateStatus(outcomes: TestCaseOutcome[]): ExecutionStatus {
  for (const priority of STATUS_PRIORITY) {
    if (outcomes.some((o) => o.status === priority)) return priority;
  }
  return 'ACCEPTED';
}

export function aggregateTimeMs(outcomes: TestCaseOutcome[]): number | undefined {
  const times = outcomes.map((o) => o.executionTimeMs).filter((t): t is number => t !== undefined);
  return times.length > 0 ? Math.max(...times) : undefined;
}

export function aggregateMemoryMb(outcomes: TestCaseOutcome[]): number | undefined {
  const mems = outcomes.map((o) => o.memoryUsageMb).filter((m): m is number => m !== undefined);
  return mems.length > 0 ? Math.max(...mems) : undefined;
}
