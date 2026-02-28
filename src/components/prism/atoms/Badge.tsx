'use client';

import React from 'react';
import clsx from 'clsx';

type BadgeVariant =
  | 'default'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'purple'
  | 'outline';

export interface BadgeProps {
  /** Visual style variant */
  variant?: BadgeVariant;
  /** Badge content */
  children: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-gray-100 text-gray-700',
  success: 'bg-emerald-50 text-[#10B981]',
  warning: 'bg-amber-50 text-[#F59E0B]',
  danger: 'bg-red-50 text-[#EF4444]',
  info: 'bg-brand-50 text-brand-500',
  purple: 'bg-purple-50 text-purple-600',
  outline: 'bg-transparent text-gray-600 ring-1 ring-inset ring-gray-300',
};

export const Badge: React.FC<BadgeProps> = ({
  variant = 'default',
  children,
  className,
}) => {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        variantStyles[variant],
        className,
      )}
    >
      {children}
    </span>
  );
};

Badge.displayName = 'Badge';
