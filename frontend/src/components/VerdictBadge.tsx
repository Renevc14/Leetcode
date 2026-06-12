import type { Verdict } from '@/types';
import { cn } from '@/lib/utils';

export const VERDICT_LABELS: Record<Verdict, string> = {
  AC: 'Accepted',
  WA: 'Wrong Answer',
  TLE: 'Time Limit Exceeded',
  MLE: 'Memory Limit Exceeded',
  RE: 'Runtime Error',
  CE: 'Compile Error',
};

export function VerdictBadge({
  verdict,
  className,
}: {
  verdict: Verdict | null | undefined;
  className?: string;
}) {
  if (!verdict) {
    return <span className={cn('text-sm text-lc-muted', className)}>Pending</span>;
  }
  return (
    <span
      className={cn(
        'text-sm font-semibold',
        verdict === 'AC' ? 'text-lc-green' : 'text-lc-red',
        className,
      )}
    >
      {VERDICT_LABELS[verdict] ?? verdict}
    </span>
  );
}
