'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { buttonVariants } from '@/components/ui/Button';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'icon-only';
type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  children?: React.ReactNode;
}

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

    // icon-only has no Tremor equivalent — keep custom styles
    const classes = isIconOnly
      ? cn(
          'inline-flex items-center justify-center font-medium transition-colors',
          'focus-visible:outline-hidden focus-visible:shadow-focus',
          'disabled:pointer-events-none disabled:opacity-45',
          'bg-transparent text-white/50 hover:bg-white/[0.04] hover:text-white/60',
          iconOnlySizeStyles[size],
          className,
        )
      : cn(
          buttonVariants({
            variant: variant as 'primary' | 'secondary' | 'ghost' | 'danger',
            size: size === 'xs' ? 'sm' : size,
          }),
          size === 'xs' && 'h-7 px-2.5 text-xs gap-1 rounded',
          className,
        );

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        className={classes}
        {...props}
      >
        {loading && (
          <Loader2 className={cn('animate-spin', spinnerSizes[size])} />
        )}
        {!(loading && isIconOnly) && children}
      </button>
    );
  },
);

Button.displayName = 'Button';
