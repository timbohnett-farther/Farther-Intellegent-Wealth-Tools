'use client';

import React from 'react';
import { Badge as TremorBadge } from '@/components/ui/Badge';

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

export const Badge: React.FC<BadgeProps> = ({
  variant = 'neutral',
  children,
  className,
}) => {
  return (
    <TremorBadge variant={variant} className={className}>
      {children}
    </TremorBadge>
  );
};

Badge.displayName = 'Badge';
