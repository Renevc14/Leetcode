import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Styled native select — keeps keyboard/touch behavior for free while
 * matching the LeetCode dark palette.
 */
const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        'flex h-9 cursor-pointer rounded-md border border-lc-border bg-lc-panel px-3 py-1 text-sm text-lc-text shadow-sm transition-colors focus-visible:border-lc-orange focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  ),
);
Select.displayName = 'Select';

export { Select };
