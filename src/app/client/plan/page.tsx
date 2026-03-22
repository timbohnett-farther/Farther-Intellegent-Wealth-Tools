'use client';

import React from 'react';
import {
  Target,
  TrendingUp,
  DollarSign,
  ShieldCheck,
  CalendarDays,
} from 'lucide-react';

// ── Mock Data ──────────────────────────────────────────────────────
const PLAN_OVERVIEW = {
  planName: 'Mitchell Family Financial Plan',
  lastReviewed: '2026-01-15',
  planStatus: 'On Track',
  retirementAge: 65,
  currentAge: 48,
  yearsToRetirement: 17,
  estimatedAnnualRetirementIncome: 180_000,
  estimatedSocialSecurity: 42_000,
  portfolioWithdrawal: 138_000,
  successRate: 87,
};

const RETIREMENT_PROJECTION = [
  { age: 48, portfolio: 3_450_000 },
  { age: 50, portfolio: 3_900_000 },
  { age: 55, portfolio: 5_100_000 },
  { age: 60, portfolio: 6_600_000 },
  { age: 65, portfolio: 7_800_000 },
  { age: 70, portfolio: 7_200_000 },
  { age: 75, portfolio: 6_400_000 },
  { age: 80, portfolio: 5_200_000 },
  { age: 85, portfolio: 3_800_000 },
  { age: 90, portfolio: 2_100_000 },
];

const GOALS = [
  { name: 'Retirement at 65', target: 5_000_000, current: 3_600_000, status: 'On Track' },
  { name: 'College Fund — Emma', target: 250_000, current: 145_000, status: 'On Track' },
  { name: 'Vacation Home', target: 800_000, current: 320_000, status: 'Needs Attention' },
  { name: 'Emergency Fund', target: 150_000, current: 150_000, status: 'Complete' },
];

const TAX_SUMMARY = {
  estimatedFederalTax: 68_500,
  estimatedStateTax: 22_300,
  effectiveRate: 24.8,
  marginalBracket: 32,
  rothConversionOpportunity: 50_000,
  estimatedTaxSavings: 12_400,
};

// ── Helpers ────────────────────────────────────────────────────────
function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

function statusBadge(status: string) {
  switch (status) {
    case 'On Track':
      return 'bg-goal-funded/10 text-goal-funded';
    case 'Needs Attention':
      return 'bg-goal-partial/10 text-goal-partial';
    case 'Complete':
      return 'bg-teal-500/10 text-teal-300';
    case 'At Risk':
      return 'bg-goal-at-risk/10 text-goal-at-risk';
    default:
      return 'bg-white/[0.06] text-white/50';
  }
}

// ── Projection Chart ───────────────────────────────────────────────
function ProjectionChart({ data }: { data: typeof RETIREMENT_PROJECTION }) {
  const max = Math.max(...data.map((d) => d.portfolio));
  const retirementIdx = data.findIndex(
    (d) => d.age === PLAN_OVERVIEW.retirementAge
  );

  return (
    <div className="relative">
      <div className="flex items-end gap-2 h-56 px-2">
        {data.map((point, i) => {
          const height = max > 0 ? (point.portfolio / max) * 100 : 0;
          const isRetirement = point.age === PLAN_OVERVIEW.retirementAge;
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              {isRetirement && (
                <span className="text-[9px] font-medium text-teal-300">
                  Retire
                </span>
              )}
              <span className="text-[9px] text-white/30 font-medium">
                {formatCurrency(point.portfolio)}
              </span>
              <div
                className={`w-full rounded-t-md transition-all ${
                  i <= retirementIdx ? 'bg-teal-500' : 'bg-teal-300'
                }`}
                style={{ height: `${Math.max(height, 4)}%` }}
              />
              <span className="text-[10px] text-white/50">{point.age}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────
export default function ClientPlanPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">My Plan</h1>
        <span
          className={`text-xs font-medium px-3 py-1 rounded-full ${statusBadge(PLAN_OVERVIEW.planStatus)}`}
        >
          {PLAN_OVERVIEW.planStatus}
        </span>
      </div>

      {/* ── Plan Overview Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white/[0.07] rounded-card border border-white/[0.06] p-5">
          <div className="flex items-center gap-2 text-sm text-white/50 mb-1">
            <Target size={16} />
            Success Rate
          </div>
          <p className="text-2xl font-bold text-white">
            {PLAN_OVERVIEW.successRate}%
          </p>
        </div>
        <div className="bg-white/[0.07] rounded-card border border-white/[0.06] p-5">
          <div className="flex items-center gap-2 text-sm text-white/50 mb-1">
            <CalendarDays size={16} />
            Years to Retirement
          </div>
          <p className="text-2xl font-bold text-white">
            {PLAN_OVERVIEW.yearsToRetirement}
          </p>
          <p className="text-xs text-white/50 mt-0.5">
            Age {PLAN_OVERVIEW.currentAge} to {PLAN_OVERVIEW.retirementAge}
          </p>
        </div>
        <div className="bg-white/[0.07] rounded-card border border-white/[0.06] p-5">
          <div className="flex items-center gap-2 text-sm text-white/50 mb-1">
            <DollarSign size={16} />
            Retirement Income
          </div>
          <p className="text-2xl font-bold text-white">
            {formatCurrency(PLAN_OVERVIEW.estimatedAnnualRetirementIncome)}
          </p>
          <p className="text-xs text-white/50 mt-0.5">per year (projected)</p>
        </div>
        <div className="bg-white/[0.07] rounded-card border border-white/[0.06] p-5">
          <div className="flex items-center gap-2 text-sm text-white/50 mb-1">
            <ShieldCheck size={16} />
            Social Security
          </div>
          <p className="text-2xl font-bold text-white">
            {formatCurrency(PLAN_OVERVIEW.estimatedSocialSecurity)}
          </p>
          <p className="text-xs text-white/50 mt-0.5">estimated annual</p>
        </div>
      </div>

      {/* ── Retirement Projection Chart ── */}
      <div className="bg-white/[0.07] rounded-card border border-white/[0.06] p-6">
        <h2 className="text-lg font-semibold text-white mb-1">
          Retirement Projection
        </h2>
        <p className="text-sm text-white/50 mb-6">
          Projected portfolio value from now through age 90
        </p>
        <ProjectionChart data={RETIREMENT_PROJECTION} />
      </div>

      {/* ── Goals ── */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">
          Goal Progress
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {GOALS.map((goal, i) => {
            const pct = Math.round((goal.current / goal.target) * 100);
            const barColor =
              goal.status === 'Complete'
                ? 'bg-teal-500'
                : goal.status === 'On Track'
                  ? 'bg-goal-funded'
                  : goal.status === 'Needs Attention'
                    ? 'bg-goal-partial'
                    : 'bg-goal-at-risk';

            return (
              <div
                key={i}
                className="bg-white/[0.07] rounded-card border border-white/[0.06] p-5"
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-white">
                    {goal.name}
                  </h3>
                  <span
                    className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${statusBadge(goal.status)}`}
                  >
                    {goal.status}
                  </span>
                </div>
                <div className="w-full h-2 bg-white/[0.06] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${barColor}`}
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between mt-2 text-xs text-white/50">
                  <span>{formatCurrency(goal.current)}</span>
                  <span>{formatCurrency(goal.target)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Tax Summary (Simplified) ── */}
      <div className="bg-white/[0.07] rounded-card border border-white/[0.06] p-6">
        <h2 className="text-lg font-semibold text-white mb-4">
          Tax Summary
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div>
            <p className="text-sm text-white/50">
              Estimated Federal Tax (2025)
            </p>
            <p className="text-xl font-bold text-white mt-1">
              {formatCurrency(TAX_SUMMARY.estimatedFederalTax)}
            </p>
          </div>
          <div>
            <p className="text-sm text-white/50">Estimated State Tax</p>
            <p className="text-xl font-bold text-white mt-1">
              {formatCurrency(TAX_SUMMARY.estimatedStateTax)}
            </p>
          </div>
          <div>
            <p className="text-sm text-white/50">Effective Tax Rate</p>
            <p className="text-xl font-bold text-white mt-1">
              {TAX_SUMMARY.effectiveRate}%
            </p>
            <p className="text-xs text-white/30 mt-0.5">
              Marginal bracket: {TAX_SUMMARY.marginalBracket}%
            </p>
          </div>
        </div>

        <div className="mt-6 p-4 bg-teal-500/10 rounded-lg border border-brand-100">
          <div className="flex items-start gap-3">
            <TrendingUp size={20} className="text-teal-300 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-white">
                Roth Conversion Opportunity
              </p>
              <p className="text-sm text-white/50 mt-0.5">
                Converting {formatCurrency(TAX_SUMMARY.rothConversionOpportunity)}{' '}
                this year could save an estimated{' '}
                {formatCurrency(TAX_SUMMARY.estimatedTaxSavings)} in future
                taxes. Ask your advisor for details.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
