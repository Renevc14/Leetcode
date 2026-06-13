import { getInitials, cn } from '@/lib/utils';

const SIZES = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-20 w-20 text-2xl',
} as const;

export function Avatar({
  name,
  size = 'sm',
  className,
}: {
  name: string;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex shrink-0 select-none items-center justify-center rounded-full bg-lc-orange font-semibold text-black',
        SIZES[size],
        className,
      )}
      title={name}
    >
      {getInitials(name) || '?'}
    </div>
  );
}
