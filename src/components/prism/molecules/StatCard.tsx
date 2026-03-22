'use client';

import React from 'react';
import clsx from 'clsx';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export interface StatCardProps {
  label: string;
  value: string;
  delta?: string;
  trend?: 'up' | 'down' | 'neutral';
  color?: string;
  className?: string;
}

const trendConfig = {
  up: {
    icon: TrendingUp,
    colorClass: 'text-success-500',
  },
  down: {
    icon: TrendingDown,
    colorClass: 'text-critical-500',
  },
  neutral: {
    icon: Minus,
    colorClass: 'text-charcoal-500',
  },
} as const;

export function StatCard({
  label,
  value,
  delta,
  trend,
  color,
  className,
}: StatCardProps) {
  const trendInfo = trend ? trendConfig[trend] : null;
  const TrendIcon = trendInfo?.icon;

  return (
    <div
      className={clsx(
        'rounded-card border border-limestone-200 bg-white p-4 shadow-sm',
        className,
      )}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-charcoal-500">
        {label}
      </p>

      <p
        className={clsx('mt-1 text-2xl font-bold tabular-nums', color || 'text-charcoal-900')}
      >
        {value}
      </p>

      {delta && (
        <div className={clsx('mt-1 flex items-center gap-1', trendInfo?.colorClass)}>
          {TrendIcon && <TrendIcon className="h-3.5 w-3.5" aria-hidden="true" />}
          <span className="text-xs font-medium">{delta}</span>
        </div>
      )}
    </div>
  );
}
