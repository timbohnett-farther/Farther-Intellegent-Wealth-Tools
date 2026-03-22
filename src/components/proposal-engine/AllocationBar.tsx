'use client';

import React from 'react';
import { cn } from '@/lib/utils/cn';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AllocationBarProps {
  /** Equity percentage (0-100). */
  equity: number;
  /** Fixed income percentage (0-100). */
  fixedIncome: number;
  /** Alternatives percentage (0-100). */
  alternatives: number;
  /** Cash percentage (0-100). */
  cash: number;
  /** Show labels and legend below the bar. */
  showLabels?: boolean;
  /** Bar height in pixels. */
  height?: number;
}

// ---------------------------------------------------------------------------
// Segment configuration
// ---------------------------------------------------------------------------

interface Segment {
  key: string;
  label: string;
  color: string;
  textColor: string;
}

const SEGMENTS: Segment[] = [
  {
    key: 'equity',
    label: 'Equity',
    color: 'bg-brand-700',
    textColor: 'text-white',
  },
  {
    key: 'fixedIncome',
    label: 'Fixed Income',
    color: 'bg-info-500',
    textColor: 'text-white',
  },
  {
    key: 'alternatives',
    label: 'Alternatives',
    color: 'bg-warning-500',
    textColor: 'text-white',
  },
  {
    key: 'cash',
    label: 'Cash',
    color: 'bg-limestone-400',
    textColor: 'text-charcoal-900',
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AllocationBar({
  equity,
  fixedIncome,
  alternatives,
  cash,
  showLabels = false,
  height = 28,
}: AllocationBarProps) {
  const values: Record<string, number> = {
    equity,
    fixedIncome,
    alternatives,
    cash,
  };

  // Filter to segments that have a non-zero allocation
  const activeSegments = SEGMENTS.filter((seg) => (values[seg.key] ?? 0) > 0);

  return (
    <div className="w-full">
      {/* Stacked bar */}
      <div
        className="flex w-full overflow-hidden rounded-md"
        style={{ height: `${height}px` }}
        role="img"
        aria-label={`Allocation: ${equity}% Equity, ${fixedIncome}% Fixed Income, ${alternatives}% Alternatives, ${cash}% Cash`}
      >
        {activeSegments.map((seg) => {
          const pct = values[seg.key] ?? 0;
          const showInlineLabel = pct >= 12 && height >= 24;

          return (
            <div
              key={seg.key}
              className={cn(
                seg.color,
                'relative flex items-center justify-center transition-all duration-300',
              )}
              style={{ width: `${pct}%` }}
            >
              {showInlineLabel && (
                <span
                  className={cn(
                    seg.textColor,
                    'text-[11px] font-semibold tabular-nums leading-none',
                  )}
                >
                  {pct.toFixed(0)}%
                </span>
              )}
            </div>
          );
        })}

        {/* Empty state */}
        {activeSegments.length === 0 && (
          <div className="flex h-full w-full items-center justify-center bg-limestone-100">
            <span className="text-xs text-charcoal-300">No allocation</span>
          </div>
        )}
      </div>

      {/* Legend */}
      {showLabels && (
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
          {SEGMENTS.map((seg) => {
            const pct = values[seg.key] ?? 0;
            if (pct === 0) return null;

            return (
              <div key={seg.key} className="flex items-center gap-1.5">
                <span
                  className={cn('inline-block h-2.5 w-2.5 rounded-sm', seg.color)}
                  aria-hidden="true"
                />
                <span className="text-xs text-charcoal-700">
                  {seg.label}
                </span>
                <span className="text-xs font-medium tabular-nums text-charcoal-500">
                  {pct.toFixed(1)}%
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

AllocationBar.displayName = 'AllocationBar';
