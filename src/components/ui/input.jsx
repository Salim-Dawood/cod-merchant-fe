import * as React from 'react';
import { cn } from '../../lib/utils';

const Input = React.forwardRef(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        'flex h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--ink)] shadow-sm placeholder:text-[var(--muted-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]',
        className
      )}
      ref={ref}
      {...props}
    />
  );
});
Input.displayName = 'Input';

export { Input };
