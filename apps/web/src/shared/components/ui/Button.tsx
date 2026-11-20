import type { ComponentProps } from 'react';
import { cn } from '../../lib/cn.js';
import { Spinner } from './Spinner.js';

const variants = {
  primary: 'border-transparent bg-brand-800 text-white hover:bg-brand-900',
  secondary: 'border-brand-800 bg-white text-brand-900 hover:bg-brand-50',
  ghost: 'border-transparent text-brand-900 hover:bg-brand-50',
};
const sizes = { sm: 'px-3 py-1.5 text-sm', md: 'px-5 py-2.5 text-base', lg: 'px-6 py-3 text-lg' };

type ButtonProps = ComponentProps<'button'> & {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  loading?: boolean;
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  type = 'button',
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-md border font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:border-brand-200 disabled:bg-brand-100 disabled:text-brand-800',
        variants[variant],
        sizes[size],
        className,
      )}
    >
      {loading && <Spinner label="Cargando" />}
      {children}
    </button>
  );
}
