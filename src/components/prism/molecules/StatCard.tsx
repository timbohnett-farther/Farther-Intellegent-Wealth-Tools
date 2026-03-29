'use client';

import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/utils/cn';

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
    colorClass: 'text-text-muted',
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
    <Card className={cn('p-4', className)}>
      <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
        {label}
      </p>

      <p
        className={cn('mt-1 text-2xl font-bold tabular-nums', color || 'text-text')}
      >
        {value}
      </p>

      {delta && (
        <div className={cn('mt-1 flex items-center gap-1', trendInfo?.colorClass)}>
          {TrendIcon && <TrendIcon className="h-3.5 w-3.5" aria-hidden="true" />}
          <span className="text-xs font-medium">{delta}</span>
        </div>
      )}
    </Card>
  );
}
