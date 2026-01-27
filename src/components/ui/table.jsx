import * as React from 'react';
import { cn } from '../../lib/utils';

const Table = React.forwardRef(({ className, ...props }, ref) => (
  <div className="w-full overflow-x-hidden">
    <table
      ref={ref}
      className={cn('w-full table-fixed caption-bottom text-sm', className)}
      {...props}
    />
  </div>
));
Table.displayName = 'Table';

const TableHeader = React.forwardRef(({ className, ...props }, ref) => (
  <thead ref={ref} className={cn('border-b border-[var(--border)]', className)} {...props} />
));
TableHeader.displayName = 'TableHeader';

const TableBody = React.forwardRef(({ className, ...props }, ref) => (
  <tbody ref={ref} className={cn('', className)} {...props} />
));
TableBody.displayName = 'TableBody';

const TableRow = React.forwardRef(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn('border-b border-[var(--border)] hover:bg-[var(--surface-soft)]', className)}
    {...props}
  />
));
TableRow.displayName = 'TableRow';

const TableHead = React.forwardRef(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      'h-11 px-3 text-left align-middle text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--muted-ink)] whitespace-normal break-words',
      className
    )}
    {...props}
  />
));
TableHead.displayName = 'TableHead';

const TableCell = React.forwardRef(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={cn('p-3 align-top text-[13px] text-[var(--ink)] whitespace-normal break-words', className)}
    {...props}
  />
));
TableCell.displayName = 'TableCell';

export { Table, TableHeader, TableBody, TableRow, TableHead, TableCell };
