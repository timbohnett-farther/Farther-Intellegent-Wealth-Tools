'use client';

import React from 'react';
import { cn } from '@/lib/utils/cn';
import { AlertTriangle, Lightbulb, CheckCircle2 } from 'lucide-react';
import type { QualityFlag, FlagSeverity } from '@/lib/proposal-engine/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface QualityFlagsListProps {
  /** Array of quality flags to display. */
  flags: QualityFlag[];
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

interface FlagStyle {
  bgClass: string;
  borderClass: string;
  iconColor: string;
  icon: React.FC<{ className?: string }>;
  textWeight: string;
  opacity: string;
}

function getFlagStyle(severity: FlagSeverity): FlagStyle {
  switch (severity) {
    case 'HIGH':
      return {
        bgClass: 'bg-warning-100',
        borderClass: 'border-warning-200',
        iconColor: 'text-warning-600',
        icon: AlertTriangle,
        textWeight: 'font-semibold',
        opacity: '',
      };
    case 'MEDIUM':
      return {
        bgClass: 'bg-warning-50',
        borderClass: 'border-warning-100',
        iconColor: 'text-warning-500',
        icon: AlertTriangle,
        textWeight: 'font-medium',
        opacity: '',
      };
    case 'LOW':
      return {
        bgClass: 'bg-transparent',
        borderClass: 'border-border-subtle',
        iconColor: 'text-text-faint',
        icon: AlertTriangle,
        textWeight: 'font-normal',
        opacity: 'opacity-75',
      };
    case 'OPPORTUNITY':
      return {
        bgClass: 'bg-success-50',
        borderClass: 'border-success-200',
        iconColor: 'text-success-600',
        icon: Lightbulb,
        textWeight: 'font-medium',
        opacity: '',
      };
  }
}

const CATEGORY_LABELS: Record<string, string> = {
  CONCENTRATION: 'Concentration',
  EXPENSE: 'Expense',
  DIVERSIFICATION: 'Diversification',
  ALLOCATION: 'Allocation',
  TAX: 'Tax',
  OVERLAP: 'Overlap',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function QualityFlagsList({ flags }: QualityFlagsListProps) {
  if (flags.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-success-200 bg-success-50 px-4 py-3">
        <CheckCircle2 className="h-5 w-5 text-success-600" aria-hidden="true" />
        <p className="text-sm font-medium text-success-700">
          No quality issues detected. Portfolio looks good.
        </p>
      </div>
    );
  }

  // Sort: HIGH first, then MEDIUM, LOW, OPPORTUNITY
  const severityOrder: Record<FlagSeverity, number> = {
    HIGH: 0,
    MEDIUM: 1,
    LOW: 2,
    OPPORTUNITY: 3,
  };

  const sorted = [...flags].sort(
    (a, b) => severityOrder[a.severity] - severityOrder[b.severity],
  );

  return (
    <ul className="space-y-2" role="list" aria-label="Portfolio quality flags">
      {sorted.map((flag) => {
        const style = getFlagStyle(flag.severity);
        const Icon = style.icon;

        return (
          <li
            key={flag.flagId}
            className={cn(
              'rounded-lg border px-4 py-3',
              style.bgClass,
              style.borderClass,
              style.opacity,
            )}
          >
            <div className="flex items-start gap-3">
              {/* Icon */}
              <Icon
                className={cn('mt-0.5 h-4 w-4 flex-shrink-0', style.iconColor)}
                aria-hidden="true"
              />

              {/* Content */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'text-sm text-text',
                      style.textWeight,
                    )}
                  >
                    {flag.title}
                  </span>

                  <span className="shrink-0 rounded bg-surface-subtle px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-text-muted">
                    {CATEGORY_LABELS[flag.category] ?? flag.category}
                  </span>
                </div>

                <p className="mt-0.5 text-xs text-text-muted leading-relaxed">
                  {flag.description}
                </p>

                {/* Affected tickers */}
                {flag.affectedTickers && flag.affectedTickers.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {flag.affectedTickers.map((ticker) => (
                      <span
                        key={ticker}
                        className="inline-block rounded bg-surface-soft px-1.5 py-0.5 text-[10px] font-mono font-medium text-text-muted"
                      >
                        {ticker}
                      </span>
                    ))}
                  </div>
                )}

                {/* Recommendation */}
                {flag.recommendation && (
                  <p className="mt-1.5 text-xs text-text-muted italic">
                    Recommendation: {flag.recommendation}
                  </p>
                )}
              </div>

              {/* Severity badge */}
              <span
                className={cn(
                  'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase',
                  flag.severity === 'HIGH' && 'bg-warning-200 text-warning-800',
                  flag.severity === 'MEDIUM' && 'bg-warning-100 text-warning-700',
                  flag.severity === 'LOW' && 'bg-surface-subtle text-text-muted',
                  flag.severity === 'OPPORTUNITY' && 'bg-success-100 text-success-700',
                )}
              >
                {flag.severity}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

QualityFlagsList.displayName = 'QualityFlagsList';
