export type ExecutionStatus =
  | 'ACCEPTED'
  | 'WRONG_ANSWER'
  | 'TIME_LIMIT_EXCEEDED'
  | 'MEMORY_LIMIT_EXCEEDED'
  | 'RUNTIME_ERROR'
  | 'COMPILATION_ERROR';

export interface TestCaseOutcome {
  testCaseId: string;
  status: ExecutionStatus;
  executionTimeMs: number | undefined;
  memoryUsageMb: number | undefined;
  actualOutput: string | undefined;
}

export interface ExecutionVerdict {
  status: ExecutionStatus;
  timeMs: number | undefined;
  memoryMb: number | undefined;
  errorMessage: string | undefined;
  testCaseResults: TestCaseOutcome[];
}
