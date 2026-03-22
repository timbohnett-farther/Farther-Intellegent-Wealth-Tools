'use client';

import React from 'react';
import { cn } from '@/lib/utils/cn';
import {
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  DollarSign,
  Percent,
  Layers,
  TrendingUp,
} from 'lucide-react';
import type { PortfolioMetrics, MoneyCents } from '@/lib/proposal-engine/types';
import { AllocationBar } from './AllocationBar';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SideBySideComparisonProps {
  /** Metrics for the current portfolio. */
  currentMetrics: PortfolioMetrics;
  /** Metrics for the proposed portfolio. */
  proposedMetrics: PortfolioMetrics;
  /** Label for the current column. */
  currentLabel?: string;
  /** Label for the proposed column. */
  proposedLabel?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmtMoney(cents: MoneyCents): string {
  const dollars = (cents as number) / 100;
  const isNeg = dollars < 0;
  const formatted = Math.abs(dollars).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return isNeg ? `-$${formatted}` : `$${formatted}`;
}

function fmtPct(decimal: number, decimals = 2): string {
  return `${(decimal * 100).toFixed(decimals)}%`;
}

function fmtPctPoints(pctA: number, pctB: number): string {
  return `${Math.abs(pctA - pctB).toFixed(1)}pp`;
}

type Direction = 'up' | 'down' | 'neutral';

function getDirection(current: number, proposed: number, lowerIsBetter = false): Direction {
  if (proposed === current) return 'neutral';
  const improved = lowerIsBetter ? proposed < current : proposed > current;
  return improved ? 'up' : 'down';
}

function DirectionIcon({
  direction,
  isImprovement,
}: {
  direction: Direction;
  isImprovement: boolean;
}) {
  if (direction === 'neutral') {
    return <Minus className="h-4 w-4 text-white/30" />;
  }
  if (direction === 'up') {
    return (
      <ArrowUpRight
        className={cn('h-4 w-4', isImprovement ? 'text-success-600' : 'text-critical-600')}
      />
    );
  }
  return (
    <ArrowDownRight
      className={cn('h-4 w-4', isImprovement ? 'text-success-600' : 'text-critical-600')}
    />
  );
}

// ---------------------------------------------------------------------------
// Metric row sub-component
// ---------------------------------------------------------------------------

interface MetricRowProps {
  label: string;
  icon: React.ElementType;
  currentValue: string;
  proposedValue: string;
  direction: Direction;
  isImprovement: boolean;
  delta?: string;
}

function MetricRow({
  label,
  icon: Icon,
  currentValue,
  proposedValue,
  direction,
  isImprovement,
  delta,
}: MetricRowProps) {
  return (
    <div className="grid grid-cols-[1fr_1fr_auto] items-center gap-4 rounded-lg px-4 py-3 hover:bg-white/[0.04] transition-colors">
      <div>
        <div className="flex items-center gap-2 mb-0.5">
          <Icon className="h-3.5 w-3.5 text-white/30" aria-hidden="true" />
          <span className="text-xs font-medium uppercase tracking-wide text-white/50">
            {label}
          </span>
        </div>
        <p className="text-sm font-semibold tabular-nums text-white pl-5.5">
          {currentValue}
        </p>
      </div>
      <div>
        <p
          className={cn(
            'text-sm font-semibold tabular-nums',
            direction !== 'neutral' && isImprovement && 'text-success-700',
            direction !== 'neutral' && !isImprovement && 'text-critical-700',
            direction === 'neutral' && 'text-white',
          )}
        >
          {proposedValue}
        </p>
        {delta && (
          <span className="text-[10px] text-white/50">{delta}</span>
        )}
      </div>
      <DirectionIcon direction={direction} isImprovement={isImprovement} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SideBySideComparison({
  currentMetrics,
  proposedMetrics,
  currentLabel = 'Current Portfolio',
  proposedLabel = 'Proposed Portfolio',
}: SideBySideComparisonProps) {
  const expRatioDir = getDirection(
    currentMetrics.weightedExpenseRatio,
    proposedMetrics.weightedExpenseRatio,
    true,
  );
  const expRatioImproved = proposedMetrics.weightedExpenseRatio <= currentMetrics.weightedExpenseRatio;

  const yieldDir = getDirection(currentMetrics.estimatedYield ?? 0, proposedMetrics.estimatedYield ?? 0);
  const yieldImproved = (proposedMetrics.estimatedYield ?? 0) >= (currentMetrics.estimatedYield ?? 0);

  const holdingDir = getDirection(
    currentMetrics.holdingCount,
    proposedMetrics.holdingCount,
    true,
  );
  const holdingImproved = proposedMetrics.holdingCount <= currentMetrics.holdingCount;

  const costDir = getDirection(
    (currentMetrics.estimatedAnnualCost ?? 0) as number,
    (proposedMetrics.estimatedAnnualCost ?? 0) as number,
    true,
  );
  const costImproved =
    ((proposedMetrics.estimatedAnnualCost ?? 0) as number) <=
    ((currentMetrics.estimatedAnnualCost ?? 0) as number);

  return (
    <div className="space-y-4">
      {/* Column headers */}
      <div className="grid grid-cols-[1fr_1fr_auto] gap-4 px-4">
        <div>
          <h3 className="text-sm font-semibold text-white">{currentLabel}</h3>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-teal-300">{proposedLabel}</h3>
        </div>
        <div className="w-4" />
      </div>

      {/* Allocation comparison */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.07] backdrop-blur-xl p-4 shadow-sm">
        <span className="text-xs font-medium uppercase tracking-wide text-white/50 block mb-3">
          Allocation Comparison
        </span>
        <div className="grid grid-cols-[1fr_1fr_auto] gap-4">
          <div>
            <AllocationBar
              equity={currentMetrics.equityPct}
              fixedIncome={currentMetrics.fixedIncomePct}
              alternatives={currentMetrics.alternativesPct}
              cash={currentMetrics.cashPct}
              showLabels
              height={24}
            />
          </div>
          <div>
            <AllocationBar
              equity={proposedMetrics.equityPct}
              fixedIncome={proposedMetrics.fixedIncomePct}
              alternatives={proposedMetrics.alternativesPct}
              cash={proposedMetrics.cashPct}
              showLabels
              height={24}
            />
          </div>
          <div className="w-4" />
        </div>
      </div>

      {/* Metrics comparison rows */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.07] backdrop-blur-xl shadow-sm divide-y divide-limestone-100">
        <MetricRow
          label="Expense Ratio"
          icon={Percent}
          currentValue={fmtPct(currentMetrics.weightedExpenseRatio)}
          proposedValue={fmtPct(proposedMetrics.weightedExpenseRatio)}
          direction={expRatioDir}
          isImprovement={expRatioImproved}
          delta={fmtPctPoints(
            currentMetrics.weightedExpenseRatio * 100,
            proposedMetrics.weightedExpenseRatio * 100,
          )}
        />
        <MetricRow
          label="Annual Cost"
          icon={DollarSign}
          currentValue={fmtMoney((currentMetrics.estimatedAnnualCost ?? 0) as MoneyCents)}
          proposedValue={fmtMoney((proposedMetrics.estimatedAnnualCost ?? 0) as MoneyCents)}
          direction={costDir}
          isImprovement={costImproved}
        />
        <MetricRow
          label="Estimated Yield"
          icon={TrendingUp}
          currentValue={fmtPct(currentMetrics.estimatedYield ?? 0)}
          proposedValue={fmtPct(proposedMetrics.estimatedYield ?? 0)}
          direction={yieldDir}
          isImprovement={yieldImproved}
        />
        <MetricRow
          label="Holding Count"
          icon={Layers}
          currentValue={currentMetrics.holdingCount.toString()}
          proposedValue={proposedMetrics.holdingCount.toString()}
          direction={holdingDir}
          isImprovement={holdingImproved}
        />
      </div>
    </div>
  );
}

SideBySideComparison.displayName = 'SideBySideComparison';
