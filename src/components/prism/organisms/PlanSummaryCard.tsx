'use client';

import React from 'react';
import clsx from 'clsx';
import { Calendar } from 'lucide-react';
import { Badge } from '@/components/prism/atoms';
import { ProgressBar } from '@/components/prism/molecules';
import { ProbabilityGauge } from './ProbabilityGauge';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PlanCardStatus = 'draft' | 'active' | 'needs_review' | 'archived';

export interface PlanSummaryCardProps {
  /** Client display name */
  clientName: string;
  /** Plan name / title */
  planName: string;
  /** Current plan status */
  status: PlanCardStatus;
  /** ISO-formatted or human-readable last updated date */
  lastUpdated: string;
  /** Monte-Carlo probability of success (0-100), or null if not yet computed */
  successRate: number | null;
  /** Data completeness score (0-100) */
  completionScore: number;
  /** Additional CSS classes */
  className?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STATUS_VARIANT: Record<PlanCardStatus, { label: string; variant: 'neutral' | 'success' | 'warning' | 'critical' | 'info' | 'brand' }> = {
  draft: { label: 'Draft', variant: 'neutral' },
  active: { label: 'Active', variant: 'success' },
  needs_review: { label: 'Needs Review', variant: 'warning' },
  archived: { label: 'Archived', variant: 'neutral' },
};

function formatDate(raw: string): string {
  try {
    const d = new Date(raw);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return raw;
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PlanSummaryCard({
  clientName,
  planName,
  status,
  lastUpdated,
  successRate,
  completionScore,
  className,
}: PlanSummaryCardProps) {
  const statusCfg = STATUS_VARIANT[status];

  return (
    <div
      className={clsx(
        'rounded-card border border-limestone-200 bg-white p-5 shadow-sm',
        className,
      )}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-base font-bold text-charcoal-900 truncate">{clientName}</p>
          <p className="mt-0.5 text-sm text-charcoal-500 truncate">{planName}</p>
        </div>
        <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
      </div>

      {/* Last updated */}
      <div className="mt-3 flex items-center gap-1.5 text-xs text-charcoal-300">
        <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
        <span>Updated {formatDate(lastUpdated)}</span>
      </div>

      {/* Success rate gauge + Completion bar */}
      <div className="mt-4 flex items-end gap-4">
        {/* Gauge */}
        <div className="flex flex-col items-center">
          {successRate !== null ? (
            <ProbabilityGauge value={successRate} label="Success" size="sm" />
          ) : (
            <div className="flex h-[46px] w-[80px] items-center justify-center">
              <span className="text-xs text-charcoal-300">N/A</span>
            </div>
          )}
        </div>

        {/* Completion bar */}
        <div className="flex-1 min-w-0">
          <ProgressBar
            value={completionScore}
            label="Data Completeness"
            size="sm"
          />
        </div>
      </div>
    </div>
  );
}

PlanSummaryCard.displayName = 'PlanSummaryCard';
