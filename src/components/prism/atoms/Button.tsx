'use client';

import React from 'react';
import clsx from 'clsx';
import { Loader2 } from 'lucide-react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'icon-only';
type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  children?: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-brand-700 text-white hover:bg-brand-600 active:bg-brand-800 focus-visible:shadow-focus shadow-sm',
  secondary:
    'border border-brand-700 bg-white text-brand-700 hover:bg-brand-50 focus-visible:shadow-focus',
  ghost:
    'bg-transparent text-charcoal-500 hover:bg-limestone-50 focus-visible:shadow-focus',
  danger:
    'bg-critical-500 text-white hover:bg-critical-600 focus-visible:shadow-focus shadow-sm',
  'icon-only':
    'bg-transparent text-charcoal-500 hover:bg-limestone-50 hover:text-charcoal-700 focus-visible:shadow-focus',
};

const sizeStyles: Record<ButtonSize, string> = {
  xs: 'h-7 px-2.5 text-xs gap-1 rounded',
  sm: 'h-8 px-3 text-[13px] gap-1.5 rounded-md',
  md: 'h-10 px-5 text-sm gap-2 rounded-lg',
  lg: 'h-12 px-7 text-base gap-2 rounded-lg',
};

const iconOnlySizeStyles: Record<ButtonSize, string> = {
  xs: 'h-7 w-7 rounded',
  sm: 'h-8 w-8 rounded-md',
  md: 'h-9 w-9 rounded-lg',
  lg: 'h-11 w-11 rounded-lg',
};

const spinnerSizes: Record<ButtonSize, string> = {
  xs: 'h-3 w-3',
  sm: 'h-3.5 w-3.5',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      disabled = false,
      loading = false,
      children,
      className,
      type = 'button',
      ...props
    },
    ref,
  ) => {
    const isIconOnly = variant === 'icon-only';

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        className={clsx(
          'inline-flex items-center justify-center font-medium transition-colors',
          'focus-visible:outline-none',
          'disabled:pointer-events-none disabled:opacity-45',
          variantStyles[variant],
          isIconOnly ? iconOnlySizeStyles[size] : sizeStyles[size],
          className,
        )}
        {...props}
      >
        {loading && (
          <Loader2 className={clsx('animate-spin', spinnerSizes[size])} />
        )}
        {!(loading && isIconOnly) && children}
      </button>
    );
  },
);

Button.displayName = 'Button';
