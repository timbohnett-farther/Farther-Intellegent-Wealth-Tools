'use client';

import React from 'react';
import clsx from 'clsx';
import {
  CheckCircle2,
  Star,
  Clock,
  DollarSign,
  ThumbsUp,
  ThumbsDown,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import type {
  TaxTransitionAnalysis,
  TransitionStrategyResult,
  MoneyCents,
} from '@/lib/proposal-engine/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TaxTransitionPanelProps {
  /** Tax transition analysis with strategies and recommendations. */
  analysis: TaxTransitionAnalysis;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmtMoney(cents: MoneyCents): string {
  const dollars = (cents as number) / 100;
  const isNeg = dollars < 0;
  const formatted = Math.abs(dollars).toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  return isNeg ? `-$${formatted}` : `$${formatted}`;
}

function fmtPct(pct: number): string {
  return `${pct.toFixed(1)}%`;
}

// ---------------------------------------------------------------------------
// Strategy card sub-component
// ---------------------------------------------------------------------------

function StrategyCard({
  result,
  isRecommended,
}: {
  result: TransitionStrategyResult;
  isRecommended: boolean;
}) {
  return (
    <div
      className={clsx(
        'relative rounded-lg border-2 p-5 shadow-sm transition-all',
        isRecommended
          ? 'border-brand-700 bg-brand-700/5'
          : 'border-limestone-200 bg-white',
      )}
    >
      {/* Recommended badge */}
      {isRecommended && (
        <div className="absolute -top-2.5 left-4 inline-flex items-center gap-1 rounded-full bg-brand-700 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
          <Star className="h-3 w-3" />
          Recommended
        </div>
      )}

      {/* Header */}
      <div className="mb-3">
        <h4 className="text-sm font-semibold text-charcoal-900">
          {result.label}
        </h4>
        <p className="mt-1 text-xs text-charcoal-500 leading-relaxed">
          {result.description}
        </p>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="rounded-md bg-limestone-50 p-3">
          <div className="flex items-center gap-1.5 mb-0.5">
            <DollarSign className="h-3 w-3 text-charcoal-400" />
            <span className="text-[10px] font-medium uppercase tracking-wide text-charcoal-500">
              Est. Tax Cost
            </span>
          </div>
          <p className="text-sm font-bold tabular-nums text-critical-700">
            {fmtMoney(result.estimatedTaxCost as MoneyCents)}
          </p>
        </div>
        <div className="rounded-md bg-limestone-50 p-3">
          <div className="flex items-center gap-1.5 mb-0.5">
            <CheckCircle2 className="h-3 w-3 text-charcoal-400" />
            <span className="text-[10px] font-medium uppercase tracking-wide text-charcoal-500">
              Alignment
            </span>
          </div>
          <p className="text-sm font-bold tabular-nums text-charcoal-900">
            {fmtPct(result.alignmentPct ?? 0)}
          </p>
        </div>
        <div className="rounded-md bg-limestone-50 p-3">
          <div className="flex items-center gap-1.5 mb-0.5">
            <Clock className="h-3 w-3 text-charcoal-400" />
            <span className="text-[10px] font-medium uppercase tracking-wide text-charcoal-500">
              Timeline
            </span>
          </div>
          <p className="text-sm font-bold tabular-nums text-charcoal-900">
            {result.timelineYears ?? 0} yr{(result.timelineYears ?? 0) !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="rounded-md bg-limestone-50 p-3">
          <div className="flex items-center gap-1.5 mb-0.5">
            <DollarSign className="h-3 w-3 text-charcoal-400" />
            <span className="text-[10px] font-medium uppercase tracking-wide text-charcoal-500">
              Net Proceeds
            </span>
          </div>
          <p className="text-sm font-bold tabular-nums text-charcoal-900">
            {fmtMoney((result.netProceeds ?? 0) as MoneyCents)}
          </p>
        </div>
      </div>

      {/* Pros and Cons */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="flex items-center gap-1 mb-1.5">
            <ThumbsUp className="h-3 w-3 text-success-600" />
            <span className="text-[10px] font-semibold uppercase tracking-wide text-success-600">
              Pros
            </span>
          </div>
          <ul className="space-y-1">
            {result.pros.map((pro, i) => (
              <li key={i} className="text-xs text-charcoal-600 leading-relaxed">
                {pro}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <div className="flex items-center gap-1 mb-1.5">
            <ThumbsDown className="h-3 w-3 text-critical-600" />
            <span className="text-[10px] font-semibold uppercase tracking-wide text-critical-600">
              Cons
            </span>
          </div>
          <ul className="space-y-1">
            {result.cons.map((con, i) => (
              <li key={i} className="text-xs text-charcoal-600 leading-relaxed">
                {con}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TaxTransitionPanel({ analysis }: TaxTransitionPanelProps) {
  return (
    <div className="space-y-6">
      {/* Summary of unrealized gains/losses */}
      <div className="rounded-lg border border-limestone-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-charcoal-900 mb-4">
          Unrealized Gains & Losses Summary
        </h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <span className="text-[10px] font-medium uppercase tracking-wide text-charcoal-500">
              Market Value
            </span>
            <p className="text-lg font-bold tabular-nums text-charcoal-900">
              {fmtMoney((analysis.currentMarketValue ?? 0) as MoneyCents)}
            </p>
          </div>
          <div>
            <span className="text-[10px] font-medium uppercase tracking-wide text-charcoal-500">
              Cost Basis
            </span>
            <p className="text-lg font-bold tabular-nums text-charcoal-900">
              {fmtMoney((analysis.totalCostBasis ?? 0) as MoneyCents)}
            </p>
          </div>
          <div>
            <div className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-success-600" />
              <span className="text-[10px] font-medium uppercase tracking-wide text-charcoal-500">
                Unrealized Gains
              </span>
            </div>
            <p className="text-lg font-bold tabular-nums text-success-700">
              +{fmtMoney((analysis.totalUnrealizedGain ?? 0) as MoneyCents)}
            </p>
          </div>
          <div>
            <div className="flex items-center gap-1">
              <TrendingDown className="h-3 w-3 text-critical-600" />
              <span className="text-[10px] font-medium uppercase tracking-wide text-charcoal-500">
                Unrealized Losses
              </span>
            </div>
            <p className="text-lg font-bold tabular-nums text-critical-700">
              -{fmtMoney((analysis.totalUnrealizedLoss ?? 0) as MoneyCents)}
            </p>
          </div>
        </div>

        {/* Short vs Long term gains */}
        <div className="mt-4 grid grid-cols-2 gap-4 border-t border-limestone-100 pt-4">
          <div>
            <span className="text-[10px] font-medium uppercase tracking-wide text-charcoal-500">
              Short-Term Gains
            </span>
            <p className="text-sm font-semibold tabular-nums text-charcoal-900">
              {fmtMoney((analysis.shortTermGains ?? 0) as MoneyCents)}
            </p>
          </div>
          <div>
            <span className="text-[10px] font-medium uppercase tracking-wide text-charcoal-500">
              Long-Term Gains
            </span>
            <p className="text-sm font-semibold tabular-nums text-charcoal-900">
              {fmtMoney((analysis.longTermGains ?? 0) as MoneyCents)}
            </p>
          </div>
        </div>
      </div>

      {/* Recommendation rationale */}
      <div className="rounded-lg border border-brand-200 bg-brand-700/5 p-4">
        <div className="flex items-start gap-2">
          <Star className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" />
          <div>
            <span className="text-xs font-semibold text-brand-700 uppercase tracking-wide">
              Recommendation Rationale
            </span>
            <p className="mt-1 text-sm text-charcoal-700 leading-relaxed">
              {analysis.recommendationRationale ?? analysis.recommendationReason ?? ''}
            </p>
          </div>
        </div>
      </div>

      {/* Strategy cards */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-charcoal-900">
          Transition Strategies
        </h3>
        {analysis.strategies.map((strat) => (
          <StrategyCard
            key={strat.strategy}
            result={strat}
            isRecommended={strat.strategy === analysis.recommendedStrategy}
          />
        ))}
      </div>
    </div>
  );
}

TaxTransitionPanel.displayName = 'TaxTransitionPanel';
