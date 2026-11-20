import type { ComponentProps } from 'react';
import { cn } from '../../lib/cn.js';

const tones = {
  neutral: 'bg-slate-100 text-slate-800',
  success: 'bg-brand-100 text-brand-900',
  danger: 'bg-red-100 text-red-900',
};

export function Badge({
  tone = 'neutral',
  className,
  ...props
}: ComponentProps<'span'> & { tone?: keyof typeof tones }) {
  return (
    <span
      {...props}
      className={cn(
        'inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold',
        tones[tone],
        className,
      )}
    />
  );
}
