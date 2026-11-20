import { useId } from 'react';
import type { ComponentProps } from 'react';
import { cn } from '../../lib/cn.js';

export function Input({
  label,
  error,
  id,
  className,
  'aria-describedby': describedBy,
  ...props
}: ComponentProps<'input'> & { label: string; error?: string }) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = error ? `${inputId}-error` : undefined;
  return (
    <div className="grid gap-1">
      <label htmlFor={inputId} className="font-semibold">
        {label}
      </label>
      <input
        {...props}
        id={inputId}
        aria-invalid={error ? true : props['aria-invalid']}
        aria-describedby={[describedBy, errorId].filter(Boolean).join(' ') || undefined}
        className={cn(
          'rounded-md border bg-white px-3 py-2',
          error ? 'border-red-700' : 'border-brand-800',
          className,
        )}
      />
      {error && (
        <p id={errorId} className="text-sm text-red-800">
          {error}
        </p>
      )}
    </div>
  );
}
