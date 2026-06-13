import { Loader2 } from 'lucide-react';
import type { Submission } from '@/types';
import { VERDICT_LABELS } from '@/components/VerdictBadge';
import { cn } from '@/lib/utils';

/**
 * Result panel content for a (possibly still running) submission.
 */
export function VerdictBanner({ submission }: { submission: Submission }) {
  if (submission.status !== 'DONE') {
    return (
      <div className="flex items-center gap-3 text-lc-muted">
        <Loader2 className="h-5 w-5 animate-spin text-lc-orange" />
        <div>
          <div className="font-medium text-lc-text">
            {submission.status === 'QUEUED' ? 'Queued…' : 'Running…'}
          </div>
          <div className="text-xs">Judging your solution</div>
        </div>
      </div>
    );
  }

  const verdict = submission.verdict;
  const isAccepted = verdict === 'AC';

  return (
    <div className="space-y-4">
      <div className={cn('text-xl font-semibold', isAccepted ? 'text-lc-green' : 'text-lc-red')}>
        {verdict ? (VERDICT_LABELS[verdict] ?? verdict) : 'Unknown'}
      </div>

      <div className="flex gap-3">
        <div className="flex-1 rounded-md bg-lc-bg p-3">
          <div className="text-xs text-lc-muted">Runtime</div>
          <div className="mt-1 font-mono text-sm text-lc-text">
            {submission.runtimeMs != null ? `${submission.runtimeMs} ms` : '—'}
          </div>
        </div>
        <div className="flex-1 rounded-md bg-lc-bg p-3">
          <div className="text-xs text-lc-muted">Memory</div>
          <div className="mt-1 font-mono text-sm text-lc-text">
            {submission.memoryKb != null ? `${(submission.memoryKb / 1024).toFixed(1)} MB` : '—'}
          </div>
        </div>
      </div>

      {submission.failedTestCaseIndex != null && !isAccepted && (
        <div className="rounded-md border border-lc-red/40 bg-lc-red/10 p-3 text-sm text-lc-text">
          Failed on test case{' '}
          <span className="font-mono font-semibold">#{submission.failedTestCaseIndex + 1}</span>
        </div>
      )}

      {submission.compileError && (
        <div className="rounded-md border border-lc-red/40 bg-lc-red/10 p-3">
          <div className="mb-1 text-xs font-medium text-lc-red">Compile output</div>
          <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-xs text-lc-text">
            {submission.compileError}
          </pre>
        </div>
      )}
    </div>
  );
}
