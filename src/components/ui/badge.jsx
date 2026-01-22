import * as React from 'react';
import { cn } from '../../lib/utils';

const Badge = React.forwardRef(({ className, ...props }, ref) => (
  <span
    ref={ref}
    className={cn(
      'inline-flex items-center rounded-full bg-[var(--surface-soft)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted-ink)]',
      className
    )}
    {...props}
  />
));
Badge.displayName = 'Badge';

export { Badge };
