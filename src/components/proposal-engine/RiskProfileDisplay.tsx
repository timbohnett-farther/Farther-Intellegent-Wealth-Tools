'use client';

import React from 'react';
import { cn } from '@/lib/utils/cn';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import type { FartherRiskProfile, RiskLabel, MoneyCents } from '@/lib/proposal-engine/types';
import { RiskScoreGauge } from './RiskScoreGauge';
import { AllocationBar } from './AllocationBar';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RiskProfileDisplayProps {
  /** The client's 3-dimensional risk profile. */
  profile: FartherRiskProfile;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const RISK_LABEL_MAP: Record<RiskLabel, { label: string; colorClass: string; bgClass: string }> = {
  CONSERVATIVE: { label: 'Conservative', colorClass: 'text-info-700', bgClass: 'bg-info-100' },
  MODERATELY_CONSERVATIVE: { label: 'Mod. Conservative', colorClass: 'text-info-600', bgClass: 'bg-info-50' },
  MODERATE: { label: 'Moderate', colorClass: 'text-accent-primarySoft', bgClass: 'bg-accent-primary/15' },
  MODERATELY_AGGRESSIVE: { label: 'Mod. Aggressive', colorClass: 'text-warning-700', bgClass: 'bg-warning-100' },
  AGGRESSIVE: { label: 'Aggressive', colorClass: 'text-critical-700', bgClass: 'bg-critical-100' },
};

function getRiskLabelConfig(label: RiskLabel) {
  return RISK_LABEL_MAP[label] ?? RISK_LABEL_MAP.MODERATE;
}

function labelFromScore(score: number): RiskLabel {
  if (score <= 20) return 'CONSERVATIVE';
  if (score <= 40) return 'MODERATELY_CONSERVATIVE';
  if (score <= 60) return 'MODERATE';
  if (score <= 80) return 'MODERATELY_AGGRESSIVE';
  return 'AGGRESSIVE';
}

function fmtCompact(value: MoneyCents): string {
  const dollars = Math.abs((value as number) / 100);
  const sign = (value as number) < 0 ? '-' : '';
  if (dollars >= 1_000_000) return `${sign}$${(dollars / 1_000_000).toFixed(1)}M`;
  if (dollars >= 1_000) return `${sign}$${(dollars / 1_000).toFixed(0)}K`;
  return `${sign}$${dollars.toFixed(0)}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function RiskProfileDisplay({ profile }: RiskProfileDisplayProps) {
  const compositeConfig = getRiskLabelConfig(profile.compositeLabel);
  const capacityLabelVal = labelFromScore(profile.capacityScore);
  const requiredLabelVal = labelFromScore(profile.requiredScore);

  return (
    <div className="space-y-6">
      {/* Composite score -- prominent display */}
      <div className="rounded-2xl border border-border-subtle bg-surface-soft backdrop-blur-xl p-6 shadow-sm">
        <div className="flex flex-col items-center sm:flex-row sm:items-center sm:gap-6">
          <RiskScoreGauge
            score={profile.compositeScore}
            label="Composite Score"
            size="lg"
          />
          <div className="mt-4 text-center sm:mt-0 sm:text-left">
            <span
              className={cn(
                'inline-block rounded-full px-3 py-1 text-xs font-bold uppercase',
                compositeConfig.bgClass,
                compositeConfig.colorClass,
              )}
            >
              {compositeConfig.label}
            </span>
            <p className="mt-2 text-sm text-text-muted max-w-xs">
              Weighted composite of behavioral preference, financial capacity,
              and required return dimensions.
            </p>
          </div>
        </div>
      </div>

      {/* Three dimension gauges */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Behavioral */}
        <div className="flex flex-col items-center rounded-2xl border border-border-subtle bg-surface-soft backdrop-blur-xl p-5 shadow-sm">
          <RiskScoreGauge
            score={profile.behavioralScore}
            label="Behavioral"
            size="md"
          />
          <span
            className={cn(
              'mt-2 rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase',
              getRiskLabelConfig(profile.behavioralLabel).bgClass,
              getRiskLabelConfig(profile.behavioralLabel).colorClass,
            )}
          >
            {getRiskLabelConfig(profile.behavioralLabel).label}
          </span>
        </div>

        {/* Capacity */}
        <div className="flex flex-col items-center rounded-2xl border border-border-subtle bg-surface-soft backdrop-blur-xl p-5 shadow-sm">
          <RiskScoreGauge
            score={profile.capacityScore}
            label="Capacity"
            size="md"
          />
          <span
            className={cn(
              'mt-2 rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase',
              getRiskLabelConfig(capacityLabelVal).bgClass,
              getRiskLabelConfig(capacityLabelVal).colorClass,
            )}
          >
            {getRiskLabelConfig(capacityLabelVal).label}
          </span>
        </div>

        {/* Required */}
        <div className="flex flex-col items-center rounded-2xl border border-border-subtle bg-surface-soft backdrop-blur-xl p-5 shadow-sm">
          <RiskScoreGauge
            score={profile.requiredScore}
            label="Required"
            size="md"
          />
          <span
            className={cn(
              'mt-2 rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase',
              getRiskLabelConfig(requiredLabelVal).bgClass,
              getRiskLabelConfig(requiredLabelVal).colorClass,
            )}
          >
            {getRiskLabelConfig(requiredLabelVal).label}
          </span>
        </div>
      </div>

      {/* Recommended allocation as stacked bar */}
      <div className="rounded-2xl border border-border-subtle bg-surface-soft backdrop-blur-xl p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-text mb-3">
          Recommended Allocation
        </h3>
        <AllocationBar
          equity={profile.recommendedAllocation.equity}
          fixedIncome={profile.recommendedAllocation.fixedIncome}
          alternatives={profile.recommendedAllocation.alternatives}
          cash={profile.recommendedAllocation.cash}
          showLabels
          height={36}
        />
      </div>

      {/* Capacity factors detail grid */}
      <div className="rounded-2xl border border-border-subtle bg-surface-soft backdrop-blur-xl p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-text mb-4">
          Capacity Factors
        </h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <div>
            <span className="text-[10px] font-medium uppercase tracking-wide text-text-muted">
              Time Horizon
            </span>
            <p className="text-lg font-bold tabular-nums text-text">
              {profile.capacityFactors.timeHorizon} yrs
            </p>
          </div>
          <div>
            <span className="text-[10px] font-medium uppercase tracking-wide text-text-muted">
              Income Stability
            </span>
            <p className="text-lg font-bold tabular-nums text-text">
              {profile.capacityFactors.incomeStability}
            </p>
          </div>
          <div>
            <span className="text-[10px] font-medium uppercase tracking-wide text-text-muted">
              Liquidity Ratio
            </span>
            <p className="text-lg font-bold tabular-nums text-text">
              {profile.capacityFactors.liquidityRatio.toFixed(1)}x
            </p>
          </div>
          <div>
            <span className="text-[10px] font-medium uppercase tracking-wide text-text-muted">
              Debt Ratio
            </span>
            <p className="text-lg font-bold tabular-nums text-text">
              {(profile.capacityFactors.debtRatio * 100).toFixed(0)}%
            </p>
          </div>
          <div>
            <span className="text-[10px] font-medium uppercase tracking-wide text-text-muted">
              Human Capital
            </span>
            <p className="text-lg font-bold tabular-nums text-text">
              {fmtCompact(profile.capacityFactors.humanCapitalValue)}
            </p>
          </div>
        </div>

        {/* Required return metrics */}
        <div className="mt-4 grid grid-cols-2 gap-4 border-t border-limestone-100 pt-4 sm:grid-cols-3">
          <div>
            <span className="text-[10px] font-medium uppercase tracking-wide text-text-muted">
              Required Return
            </span>
            <p className="text-lg font-bold tabular-nums text-text">
              {(profile.requiredReturn * 100).toFixed(1)}%
            </p>
          </div>
          <div>
            <span className="text-[10px] font-medium uppercase tracking-wide text-text-muted">
              Funding Ratio
            </span>
            <p className="text-lg font-bold tabular-nums text-text">
              {(profile.fundingRatio * 100).toFixed(0)}%
            </p>
          </div>
        </div>
      </div>

      {/* Risk gap information */}
      {profile.riskGap !== 0 && (
        <div
          className={cn(
            'rounded-lg border p-5',
            Math.abs(profile.riskGap) > 15
              ? 'border-warning-200 bg-warning-50'
              : 'border-info-200 bg-info-50',
          )}
        >
          <div className="flex items-start gap-3">
            <AlertTriangle
              className={cn(
                'mt-0.5 h-5 w-5 shrink-0',
                Math.abs(profile.riskGap) > 15
                  ? 'text-warning-600'
                  : 'text-info-600',
              )}
              aria-hidden="true"
            />
            <div className="flex-1">
              <h4
                className={cn(
                  'text-sm font-semibold',
                  Math.abs(profile.riskGap) > 15
                    ? 'text-warning-800'
                    : 'text-info-800',
                )}
              >
                Risk Gap: {profile.riskGapLabel}
              </h4>
              <p className="mt-1 text-sm text-text-muted">
                Current portfolio risk score is{' '}
                <strong>{profile.currentPortfolioRisk}</strong> vs. recommended{' '}
                <strong>{profile.compositeScore}</strong> (gap of{' '}
                {profile.riskGap > 0 ? '+' : ''}
                {profile.riskGap}).
              </p>

              {/* Visual gap indicator */}
              <div className="mt-3 relative h-3 w-full rounded-full bg-surface-subtle">
                <div
                  className="absolute top-0 h-3 w-3 rounded-full bg-critical-400 border-2 border-surface-soft shadow"
                  style={{
                    left: `${Math.min(97, Math.max(3, profile.currentPortfolioRisk))}%`,
                    transform: 'translateX(-50%)',
                  }}
                  title={`Current: ${profile.currentPortfolioRisk}`}
                />
                <div
                  className="absolute top-0 h-3 w-3 rounded-full bg-success-500 border-2 border-surface-soft shadow"
                  style={{
                    left: `${Math.min(97, Math.max(3, profile.compositeScore))}%`,
                    transform: 'translateX(-50%)',
                  }}
                  title={`Recommended: ${profile.compositeScore}`}
                />
              </div>
              <div className="mt-2 flex items-center gap-4 text-xs text-text-muted">
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-critical-400" />
                  Current ({profile.currentPortfolioRisk})
                </div>
                <ArrowRight className="h-3 w-3 text-text-faint" />
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-success-500" />
                  Recommended ({profile.compositeScore})
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

RiskProfileDisplay.displayName = 'RiskProfileDisplay';
