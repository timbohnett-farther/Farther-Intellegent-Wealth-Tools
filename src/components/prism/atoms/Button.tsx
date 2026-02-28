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
    'bg-brand-500 text-white hover:bg-brand-400 focus-visible:ring-brand-500 shadow-sm',
  secondary:
    'border border-brand-300 bg-white text-brand-500 hover:bg-brand-50 focus-visible:ring-brand-500',
  ghost:
    'bg-transparent text-gray-700 hover:bg-gray-100 focus-visible:ring-gray-400',
  danger:
    'bg-[#EF4444] text-white hover:bg-red-600 focus-visible:ring-[#EF4444] shadow-sm',
  'icon-only':
    'bg-transparent text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus-visible:ring-gray-400',
};

const sizeStyles: Record<ButtonSize, string> = {
  xs: 'h-7 px-2.5 text-xs gap-1 rounded',
  sm: 'h-8 px-3 text-sm gap-1.5 rounded-md',
  md: 'h-9 px-4 text-sm gap-2 rounded-lg',
  lg: 'h-11 px-6 text-base gap-2 rounded-lg',
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
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
          'disabled:pointer-events-none disabled:opacity-50',
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
