import { useCountdown } from '@/hooks/useCountdown';
import { cn } from '@/lib/utils';

export function CountdownTimer({
  target,
  prefix,
  className,
}: {
  target: string;
  prefix?: string;
  className?: string;
}) {
  const { formatted, isExpired } = useCountdown(target);

  return (
    <span className={cn('font-mono tabular-nums', className)}>
      {prefix && <span className="mr-1.5 font-sans text-lc-muted">{prefix}</span>}
      {isExpired ? '00:00:00' : formatted}
    </span>
  );
}
