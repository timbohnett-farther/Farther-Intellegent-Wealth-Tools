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
  CORE: { label: 'Core', bgClass: 'bg-accent-primary/15', textClass: 'text-accent-primarySoft' },
  STRATEGIC: { label: 'Strategic', bgClass: 'bg-accent-primary/15', textClass: 'text-accent-primarySoft' },
  TACTICAL: { label: 'Tactical', bgClass: 'bg-info-100', textClass: 'text-info-700' },
  FACTOR: { label: 'Factor', bgClass: 'bg-warning-100', textClass: 'text-warning-700' },
  ESG: { label: 'ESG', bgClass: 'bg-success-100', textClass: 'text-success-700' },
  TAX_EFFICIENT: { label: 'Tax Efficient', bgClass: 'bg-success-100', textClass: 'text-success-700' },
  INCOME: { label: 'Income', bgClass: 'bg-info-100', textClass: 'text-info-700' },
  ALTERNATIVES: { label: 'Alternatives', bgClass: 'bg-warning-100', textClass: 'text-warning-700' },
  CUSTOM: { label: 'Custom', bgClass: 'bg-surface-subtle', textClass: 'text-text-muted' },
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
        'relative rounded-lg border-2 bg-surface-soft backdrop-blur-xl p-5 shadow-sm transition-all',
        selected
          ? 'border-accent-primary shadow-md shadow-brand-700/10'
          : 'border-border-subtle hover:border-border-subtle hover:shadow',
      )}
    >
      {/* Header: name and category badge */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <h4 className="text-sm font-semibold text-text leading-tight">
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
          <Shield className="h-3.5 w-3.5 text-text-faint" aria-hidden="true" />
          <span className="text-[10px] font-medium uppercase tracking-wide text-text-muted">
            Risk Score
          </span>
          <span className="ml-auto text-xs font-bold tabular-nums text-text-muted">
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
                      ? 'bg-brand-400'
                      : model.riskScore <= 80
                        ? 'bg-warning-500'
                        : 'bg-critical-500'
                  : 'bg-surface-subtle',
              )}
            />
          ))}
        </div>
      </div>

      {/* Performance metrics */}
      <div className="grid grid-cols-3 gap-x-3 gap-y-2 mb-3">
        <div>
          <span className="text-[10px] text-text-muted">1Y Return</span>
          <p className="text-sm font-semibold tabular-nums text-text">
            {fmtPct(model.performance?.oneYear ?? 0, 1)}
          </p>
        </div>
        <div>
          <span className="text-[10px] text-text-muted">3Y Return</span>
          <p className="text-sm font-semibold tabular-nums text-text">
            {fmtPct(model.performance?.threeYear ?? 0, 1)}
          </p>
        </div>
        <div>
          <span className="text-[10px] text-text-muted">5Y Return</span>
          <p className="text-sm font-semibold tabular-nums text-text">
            {fmtPct(model.performance?.fiveYear ?? 0, 1)}
          </p>
        </div>
      </div>

      {/* Expense ratio */}
      <div className="mb-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-medium uppercase tracking-wide text-text-muted">
            Expense Ratio
          </span>
          <span className="text-xs font-semibold tabular-nums text-text-muted">
            {fmtPct(model.expenseRatio ?? 0)}
          </span>
        </div>
      </div>

      {/* Allocation summary bar */}
      <div className="mb-3">
        <span className="text-[10px] font-medium uppercase tracking-wide text-text-muted block mb-1.5">
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
        <div className="mb-4 rounded-md bg-transparent px-3 py-2">
          <div className="flex items-center gap-1.5 mb-0.5">
            <AlertTriangle className="h-3 w-3 text-text-faint" />
            <span className="text-[10px] font-medium uppercase tracking-wide text-text-muted">
              Worst Scenario
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-text-muted">
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
              ? 'bg-accent-primary text-text'
              : 'border border-accent-primary bg-surface-soft text-accent-primarySoft hover:bg-accent-primary/10',
          )}
        >
          {selected ? 'Selected' : 'Select Model'}
        </button>
      )}
    </div>
  );
}

ModelCard.displayName = 'ModelCard';
