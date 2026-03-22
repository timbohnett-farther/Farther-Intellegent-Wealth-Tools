'use client';

import React from 'react';
import clsx from 'clsx';

type BadgeVariant =
  | 'neutral'
  | 'success'
  | 'warning'
  | 'critical'
  | 'info'
  | 'brand';

export interface BadgeProps {
  /** Visual style variant */
  variant?: BadgeVariant;
  /** Badge content */
  children: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  neutral: 'bg-charcoal-50 text-charcoal-700',
  success: 'bg-success-100 text-success-700',
  warning: 'bg-warning-100 text-warning-700',
  critical: 'bg-critical-100 text-critical-700',
  info: 'bg-info-100 text-info-700',
  brand: 'bg-brand-100 text-brand-700',
};

export const Badge: React.FC<BadgeProps> = ({
  variant = 'neutral',
  children,
  className,
}) => {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide',
        variantStyles[variant],
        className,
      )}
    >
      {children}
    </span>
  );
};

Badge.displayName = 'Badge';
