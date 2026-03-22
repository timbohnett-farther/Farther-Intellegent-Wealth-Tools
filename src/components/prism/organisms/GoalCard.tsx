'use client';

import React from 'react';
import { cn } from '@/lib/utils/cn';
import { Target } from 'lucide-react';
import { Badge } from '@/components/prism/atoms';
import { ProgressBar } from '@/components/prism/molecules';
import { Card } from '@/components/ui/Card';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type GoalFundingStatus = 'funded' | 'partial' | 'at_risk';
export type GoalPriority = 'needs' | 'wants' | 'wishes';

export interface GoalCardProps {
  /** Goal display name */
  name: string;
  /** Goal type (e.g. "retirement", "education_college") */
  type: string;
  /** Dollar amount targeted */
  targetAmount: number;
  /** Target year, or null if open-ended */
  targetYear: number | null;
  /** Current progress percentage (0-100) */
  currentProgress: number;
  /** Funded ratio (0-100), or null if not computed */
  fundedRatio: number | null;
  /** Funding status indicator */
  status: GoalFundingStatus | null;
  /** Priority bucket */
  priority: GoalPriority;
  /** Additional CSS classes */
  className?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(value: number): string {
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function formatGoalType(raw: string): string {
  return raw
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

const PRIORITY_BADGE: Record<GoalPriority, { label: string; variant: 'info' | 'warning' | 'brand' }> = {
  needs: { label: 'Needs', variant: 'info' },
  wants: { label: 'Wants', variant: 'warning' },
  wishes: { label: 'Wishes', variant: 'brand' },
};

const STATUS_COLOR: Record<GoalFundingStatus, string> = {
  funded: '#22c55e',
  partial: '#E8A838',
  at_risk: '#ef4444',
};

const STATUS_LABEL: Record<GoalFundingStatus, string> = {
  funded: 'Funded',
  partial: 'Partial',
  at_risk: 'At Risk',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function GoalCard({
  name,
  type,
  targetAmount,
  targetYear,
  currentProgress,
  fundedRatio,
  status,
  priority,
  className,
}: GoalCardProps) {
  const priorityCfg = PRIORITY_BADGE[priority];
  const progressColor = status ? STATUS_COLOR[status] : undefined;

  return (
    <Card className={cn('p-5', className)}>
      {/* Top row: name + type badge + priority */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Target className="h-4 w-4 shrink-0 text-teal-300" aria-hidden="true" />
          <h3 className="text-sm font-semibold text-white truncate">{name}</h3>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Badge variant={priorityCfg.variant}>{priorityCfg.label}</Badge>
        </div>
      </div>

      {/* Type + target year */}
      <div className="mt-1.5 flex items-center gap-2">
        <Badge variant="neutral">{formatGoalType(type)}</Badge>
        {targetYear !== null && (
          <span className="text-xs text-white/30">Target {targetYear}</span>
        )}
      </div>

      {/* Target amount */}
      <p className="mt-3 text-xl font-bold tabular-nums text-white">
        {formatCurrency(targetAmount)}
      </p>

      {/* Progress bar */}
      <div className="mt-3">
        <ProgressBar
          value={currentProgress}
          label="Progress"
          color={progressColor}
          size="sm"
        />
      </div>

      {/* Funded ratio + status */}
      <div className="mt-2 flex items-center justify-between">
        {fundedRatio !== null ? (
          <span className="text-xs tabular-nums text-white/50">
            {Math.round(fundedRatio)}% funded
          </span>
        ) : (
          <span className="text-xs text-white/30">--</span>
        )}
        {status && (
          <span
            className="text-xs font-medium"
            style={{ color: STATUS_COLOR[status] }}
          >
            {STATUS_LABEL[status]}
          </span>
        )}
      </div>
    </Card>
  );
}

GoalCard.displayName = 'GoalCard';
