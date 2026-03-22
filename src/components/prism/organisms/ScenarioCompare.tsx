'use client';

import React from 'react';
import { cn } from '@/lib/utils/cn';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { Card } from '@/components/ui/Card';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ScenarioData {
  /** Display name for the scenario */
  name: string;
  /** Monte-Carlo probability of success (0-100) */
  probabilityOfSuccess: number;
  /** Projected net worth at plan end */
  netWorthAtEnd: number;
  /** Cumulative lifetime taxes */
  totalTaxes: number;
  /** Estate value at end of plan */
  estateValue: number;
}

export interface ScenarioCompareProps {
  /** 2–3 scenarios to compare side-by-side */
  scenarios: ScenarioData[];
  /** Additional CSS classes */
  className?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(value: number): string {
  const abs = Math.abs(value);
  const formatted = abs.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  return value < 0 ? `-${formatted}` : formatted;
}

function formatPercent(value: number): string {
  return `${Math.round(value)}%`;
}

// ---------------------------------------------------------------------------
// Metric row types
// ---------------------------------------------------------------------------

interface MetricDef {
  label: string;
  key: keyof Omit<ScenarioData, 'name'>;
  format: (v: number) => string;
  /** true = higher is better, false = lower is better */
  higherIsBetter: boolean;
}

const METRICS: MetricDef[] = [
  { label: 'Probability of Success', key: 'probabilityOfSuccess', format: formatPercent, higherIsBetter: true },
  { label: 'Net Worth at End', key: 'netWorthAtEnd', format: formatCurrency, higherIsBetter: true },
  { label: 'Total Taxes', key: 'totalTaxes', format: formatCurrency, higherIsBetter: false },
  { label: 'Estate Value', key: 'estateValue', format: formatCurrency, higherIsBetter: true },
];

// ---------------------------------------------------------------------------
// Delta indicator
// ---------------------------------------------------------------------------

function DeltaIndicator({
  current,
  baseline,
  format,
  higherIsBetter,
}: {
  current: number;
  baseline: number;
  format: (v: number) => string;
  higherIsBetter: boolean;
}) {
  const diff = current - baseline;
  if (diff === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] text-white/30">
        <Minus className="h-3 w-3" /> --
      </span>
    );
  }

  const isPositive = diff > 0;
  const isBetter = higherIsBetter ? isPositive : !isPositive;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 text-[10px] font-medium',
        isBetter ? 'text-success-500' : 'text-critical-500',
      )}
    >
      {isPositive ? (
        <ArrowUp className="h-3 w-3" />
      ) : (
        <ArrowDown className="h-3 w-3" />
      )}
      {format(Math.abs(diff))}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ScenarioCompare({ scenarios, className }: ScenarioCompareProps) {
  if (scenarios.length === 0) return null;

  const baseline = scenarios[0];
  const colCount = scenarios.length;

  return (
    <Card className={cn('overflow-hidden p-0', className)}>
      {/* Header row – scenario names */}
      <div
        className="grid border-b border-white/[0.06] bg-transparent"
        style={{ gridTemplateColumns: `180px repeat(${colCount}, 1fr)` }}
      >
        <div className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-white/50">
          Metric
        </div>
        {scenarios.map((s, i) => (
          <div
            key={s.name}
            className={cn(
              'px-4 py-3 text-center text-sm font-semibold text-white',
              i === 0 && 'bg-teal-500/10/50',
            )}
          >
            {s.name}
            {i === 0 && (
              <span className="ml-1.5 text-[10px] font-normal text-white/30">
                (base)
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Metric rows */}
      {METRICS.map((metric) => (
        <div
          key={metric.key}
          className="grid border-b border-limestone-100 last:border-b-0"
          style={{ gridTemplateColumns: `180px repeat(${colCount}, 1fr)` }}
        >
          {/* Label */}
          <div className="flex items-center px-4 py-3 text-xs font-medium text-white/50">
            {metric.label}
          </div>

          {/* Values */}
          {scenarios.map((s, i) => {
            const val = s[metric.key];
            const isBase = i === 0;

            return (
              <div
                key={s.name}
                className={cn(
                  'flex flex-col items-center justify-center gap-0.5 px-4 py-3',
                  isBase && 'bg-teal-500/10/30',
                )}
              >
                <span className="text-sm font-bold tabular-nums text-white">
                  {metric.format(val)}
                </span>
                {!isBase && (
                  <DeltaIndicator
                    current={val}
                    baseline={baseline[metric.key]}
                    format={metric.format}
                    higherIsBetter={metric.higherIsBetter}
                  />
                )}
              </div>
            );
          })}
        </div>
      ))}
    </Card>
  );
}

ScenarioCompare.displayName = 'ScenarioCompare';
