'use client';

import React from 'react';
import { cn } from '@/lib/utils/cn';

export interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
}

export function SectionHeader({
  title,
  subtitle,
  action,
  className,
}: SectionHeaderProps) {
  return (
    <div
      className={cn(
        'flex items-start justify-between gap-4',
        className,
      )}
    >
      <div className="min-w-0">
        <h2 className="text-lg font-bold text-white">{title}</h2>
        {subtitle && (
          <p className="mt-0.5 text-sm text-white/50">{subtitle}</p>
        )}
      </div>

      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
