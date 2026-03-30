'use client';

import React from 'react';
import { cn } from '@/lib/utils/cn';

export interface ProgressBarProps {
  /** Progress value between 0 and 100 */
  value: number;
  label?: string;
  showPercentage?: boolean;
  color?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeStyles = {
  sm: 'h-1.5',
  md: 'h-2.5',
  lg: 'h-4',
} as const;

export function ProgressBar({
  value,
  label,
  showPercentage = true,
  color,
  size = 'md',
  className,
}: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value));

  return (
    <div className={cn('w-full', className)}>
      {(label || showPercentage) && (
        <div className="mb-1.5 flex items-center justify-between">
          {label && (
            <span className="text-sm font-medium text-text-muted">{label}</span>
          )}
          {showPercentage && (
            <span className="text-xs tabular-nums text-text-muted">
              {Math.round(clamped)}%
            </span>
          )}
        </div>
      )}

      <div
        className={cn(
          'w-full overflow-hidden rounded-full bg-surface-subtle',
          sizeStyles[size],
        )}
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label || 'Progress'}
      >
        <div
          className={cn(
            'h-full rounded-full transition-all duration-300 ease-out',
            !color && 'bg-accent-primary',
          )}
          style={{
            width: `${clamped}%`,
            ...(color ? { backgroundColor: color } : {}),
          }}
        />
      </div>
    </div>
  );
}
