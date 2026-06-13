import type { Difficulty } from '@/types';
import { cn } from '@/lib/utils';

const STYLES: Record<Difficulty, string> = {
  EASY: 'text-lc-green',
  MEDIUM: 'text-lc-orange',
  HARD: 'text-lc-red',
};

const LABELS: Record<Difficulty, string> = {
  EASY: 'Easy',
  MEDIUM: 'Medium',
  HARD: 'Hard',
};

export function DifficultyBadge({
  difficulty,
  className,
}: {
  difficulty: Difficulty | string;
  className?: string;
}) {
  const key = String(difficulty).toUpperCase() as Difficulty;
  return (
    <span className={cn('text-sm font-medium', STYLES[key] ?? 'text-lc-muted', className)}>
      {LABELS[key] ?? difficulty}
    </span>
  );
}
