import type {
  ExecuteServerInput,
  ExecuteServerOutput,
  ExecutorApiService,
} from '@leetcode/executor-server-sdk';
import type { ExecutorContext } from '../context.js';
import { getStrategy } from '../domain/language-strategy.js';
import { ContainerRunner } from '../infrastructure/docker/container-runner.js';
import { config } from '../config/env.js';
import type { TestCaseOutcome } from '../domain/execution.js';
import { aggregateMemoryMb, aggregateStatus, aggregateTimeMs, compareOutput } from './verdict.js';

export class ExecutorApiServiceImpl implements ExecutorApiService<ExecutorContext> {
  constructor() {
    this.Execute = this.Execute.bind(this);
  }

  async Execute(input: ExecuteServerInput, ctx: ExecutorContext): Promise<ExecuteServerOutput> {
    const language = input.language!;
    const code = input.code!;
    const timeLimitMs = input.limits!.timeLimitMs!;
    const memoryLimitMb = input.limits!.memoryLimitMb!;
    const testCases = input.testCases!;

    const strategy = getStrategy(language, config.images);

    return ctx.semaphore.run(async () => {
      const runner = new ContainerRunner(strategy.image, memoryLimitMb, config.containerCpu);

      try {
        await runner.start(strategy.sourceFile, code);

        // Compile step (if required by the language)
        if (strategy.compileCmd !== null) {
          const compileResult = await runner.exec(strategy.compileCmd, '', 30000);
          if (compileResult.exitCode !== 0) {
            return {
              status: 'COMPILATION_ERROR',
              timeMs: undefined,
              memoryMb: undefined,
              errorMessage: compileResult.stderr.slice(0, 10000) || 'Compilation failed.',
              testCaseResults: [],
            };
          }
        }

        // Run each test case sequentially
        const outcomes: TestCaseOutcome[] = [];
        for (const tc of testCases) {
          const result = await runner.exec(strategy.runCmd, tc.input ?? '', timeLimitMs);

          let status: TestCaseOutcome['status'];
          if (result.timedOut) {
            status = 'TIME_LIMIT_EXCEEDED';
          } else if (result.oomKilled) {
            status = 'MEMORY_LIMIT_EXCEEDED';
          } else if (result.exitCode !== 0) {
            status = 'RUNTIME_ERROR';
          } else if (!compareOutput(result.stdout, tc.expectedOutput ?? '')) {
            status = 'WRONG_ANSWER';
          } else {
            status = 'ACCEPTED';
          }

          outcomes.push({
            testCaseId: tc.testCaseId!,
            status,
            executionTimeMs: result.timedOut ? undefined : result.wallTimeMs,
            memoryUsageMb: undefined, // per-exec memory not available without cgroup instrumentation
            actualOutput: result.stdout.slice(0, 20000),
          });
        }

        const aggregatedStatus = aggregateStatus(outcomes);
        return {
          status: aggregatedStatus,
          timeMs: aggregateTimeMs(outcomes),
          memoryMb: aggregateMemoryMb(outcomes),
          errorMessage: undefined,
          testCaseResults: outcomes.map((o) => ({
            testCaseId: o.testCaseId,
            status: o.status,
            executionTimeMs: o.executionTimeMs,
            memoryUsageMb: o.memoryUsageMb,
            actualOutput: o.actualOutput,
          })),
        };
      } finally {
        await runner.remove();
      }
    });
  }
}
