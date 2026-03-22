'use client';

import React, { useMemo } from 'react';
import { cn } from '@/lib/utils/cn';
import { Shield, TrendingUp, AlertTriangle } from 'lucide-react';
import type { InvestmentModel, ModelCategory, AssetClass } from '@/lib/proposal-engine/types';
import { AllocationBar } from './AllocationBar';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ModelCardProps {
  /** Investment model to display. */
  model: InvestmentModel;
  /** Whether this model card is currently selected. */
  selected?: boolean;
  /** Callback when the card is selected. */
  onSelect?: (modelId: string) => void;
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const CATEGORY_CONFIG: Record<ModelCategory, { label: string; bgClass: string; textClass: string }> = {
  CORE: { label: 'Core', bgClass: 'bg-brand-100', textClass: 'text-brand-700' },
  STRATEGIC: { label: 'Strategic', bgClass: 'bg-brand-100', textClass: 'text-brand-700' },
  TACTICAL: { label: 'Tactical', bgClass: 'bg-info-100', textClass: 'text-info-700' },
  FACTOR: { label: 'Factor', bgClass: 'bg-warning-100', textClass: 'text-warning-700' },
  ESG: { label: 'ESG', bgClass: 'bg-success-100', textClass: 'text-success-700' },
  TAX_EFFICIENT: { label: 'Tax Efficient', bgClass: 'bg-success-100', textClass: 'text-success-700' },
  INCOME: { label: 'Income', bgClass: 'bg-info-100', textClass: 'text-info-700' },
  ALTERNATIVES: { label: 'Alternatives', bgClass: 'bg-warning-100', textClass: 'text-warning-700' },
  CUSTOM: { label: 'Custom', bgClass: 'bg-limestone-200', textClass: 'text-charcoal-700' },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmtPct(decimal: number, decimals = 2): string {
  return `${(decimal * 100).toFixed(decimals)}%`;
}

/** Compute broad allocation percentages from model allocation slices. */
function computeAllocation(allocation: InvestmentModel['allocation']) {
  let equity = 0;
  let fixedIncome = 0;
  let alternatives = 0;
  let cash = 0;

  if (!allocation) return { equity, fixedIncome, alternatives, cash };

  for (const a of allocation) {
    const pct = a.targetPct ?? 0;
    const ac = a.assetClass;
    if (ac.startsWith('EQUITY_')) equity += pct;
    else if (ac.startsWith('FIXED_INCOME_')) fixedIncome += pct;
    else if (ac === 'CASH_EQUIVALENT') cash += pct;
    else alternatives += pct;
  }

  return { equity, fixedIncome, alternatives, cash };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ModelCard({
  model,
  selected = false,
  onSelect,
}: ModelCardProps) {
  const categoryConfig = CATEGORY_CONFIG[model.category] ?? CATEGORY_CONFIG.STRATEGIC;

  const alloc = useMemo(() => computeAllocation(model.allocation), [model.allocation]);

  // Risk score visual: 10 dots
  const filledDots = Math.round(model.riskScore / 10);

  // Find worst stress test scenario
  const worstStress = useMemo(() => {
    if (!model.stressTests || model.stressTests.length === 0) return null;
    return model.stressTests.reduce((worst, st) =>
      st.portfolioReturn < worst.portfolioReturn ? st : worst,
    );
  }, [model.stressTests]);

  return (
    <div
      className={cn(
        'relative rounded-lg border-2 bg-white p-5 shadow-sm transition-all',
        selected
          ? 'border-brand-700 shadow-md shadow-brand-700/10'
          : 'border-limestone-200 hover:border-limestone-300 hover:shadow',
      )}
    >
      {/* Header: name and category badge */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <h4 className="text-sm font-semibold text-charcoal-900 leading-tight">
          {model.name}
        </h4>
        <span
          className={cn(
            'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide',
            categoryConfig.bgClass,
            categoryConfig.textClass,
          )}
        >
          {categoryConfig.label}
        </span>
      </div>

      {/* Risk score visual */}
      <div className="mb-3">
        <div className="flex items-center gap-1.5 mb-1">
          <Shield className="h-3.5 w-3.5 text-charcoal-400" aria-hidden="true" />
          <span className="text-[10px] font-medium uppercase tracking-wide text-charcoal-500">
            Risk Score
          </span>
          <span className="ml-auto text-xs font-bold tabular-nums text-charcoal-700">
            {model.riskScore}
          </span>
        </div>
        <div className="flex gap-1">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className={cn(
                'h-2 flex-1 rounded-full transition-colors',
                i < filledDots
                  ? model.riskScore <= 30
                    ? 'bg-info-500'
                    : model.riskScore <= 60
                      ? 'bg-brand-600'
                      : model.riskScore <= 80
                        ? 'bg-warning-500'
                        : 'bg-critical-500'
                  : 'bg-limestone-200',
              )}
            />
          ))}
        </div>
      </div>

      {/* Performance metrics */}
      <div className="grid grid-cols-3 gap-x-3 gap-y-2 mb-3">
        <div>
          <span className="text-[10px] text-charcoal-500">1Y Return</span>
          <p className="text-sm font-semibold tabular-nums text-charcoal-900">
            {fmtPct(model.performance?.oneYear ?? 0, 1)}
          </p>
        </div>
        <div>
          <span className="text-[10px] text-charcoal-500">3Y Return</span>
          <p className="text-sm font-semibold tabular-nums text-charcoal-900">
            {fmtPct(model.performance?.threeYear ?? 0, 1)}
          </p>
        </div>
        <div>
          <span className="text-[10px] text-charcoal-500">5Y Return</span>
          <p className="text-sm font-semibold tabular-nums text-charcoal-900">
            {fmtPct(model.performance?.fiveYear ?? 0, 1)}
          </p>
        </div>
      </div>

      {/* Expense ratio */}
      <div className="mb-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-medium uppercase tracking-wide text-charcoal-500">
            Expense Ratio
          </span>
          <span className="text-xs font-semibold tabular-nums text-charcoal-700">
            {fmtPct(model.expenseRatio ?? 0)}
          </span>
        </div>
      </div>

      {/* Allocation summary bar */}
      <div className="mb-3">
        <span className="text-[10px] font-medium uppercase tracking-wide text-charcoal-500 block mb-1.5">
          Allocation
        </span>
        <AllocationBar
          equity={alloc.equity}
          fixedIncome={alloc.fixedIncome}
          alternatives={alloc.alternatives}
          cash={alloc.cash}
          height={20}
        />
      </div>

      {/* Stress test preview (worst scenario) */}
      {worstStress && (
        <div className="mb-4 rounded-md bg-limestone-50 px-3 py-2">
          <div className="flex items-center gap-1.5 mb-0.5">
            <AlertTriangle className="h-3 w-3 text-charcoal-400" />
            <span className="text-[10px] font-medium uppercase tracking-wide text-charcoal-500">
              Worst Scenario
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-charcoal-600">
              {worstStress.scenarioLabel}
            </span>
            <span className="text-xs font-semibold tabular-nums text-critical-700">
              {fmtPct(worstStress.portfolioReturn, 1)}
            </span>
          </div>
        </div>
      )}

      {/* Select button */}
      {onSelect && (
        <button
          type="button"
          onClick={() => onSelect(model.modelId)}
          className={cn(
            'w-full rounded-lg px-4 py-2 text-sm font-medium transition-colors',
            selected
              ? 'bg-brand-700 text-white'
              : 'border border-brand-700 bg-white text-brand-700 hover:bg-brand-50',
          )}
        >
          {selected ? 'Selected' : 'Select Model'}
        </button>
      )}
    </div>
  );
}

ModelCard.displayName = 'ModelCard';
