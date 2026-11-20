import type { ComponentProps } from 'react';
import { cn } from '../../lib/cn.js';

export function Card({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      {...props}
      className={cn('rounded-2xl border border-brand-200 bg-white shadow-sm', className)}
    />
  );
}
