'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth, useToast } from '@/lib/tax-planning/auth-context';
import type {
  FartherDebtScore,
  HouseholdDebt,
  DebtScoreLabel,
  DebtCategory,
  OpportunityUrgency,
} from '@/lib/debt-engine/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DebtSummaryStats {
  totalDebt: number;
  monthlyDebtService: number;
  afterTaxCostOfDebt: number;
  debtFreeDate: string;
  debtFreeDateWithStrategy: string;
  yearsSaved: number;
}

interface DebtTableRow {
  id: string;
  name: string;
  category: DebtCategory;
  balance: number;
  rate: number;
  monthlyPayment: number;
  afterTaxRate: number;
  payoffDate: string;
  rateType: string;
}

interface OpportunityCard {
  type: string;
  annualSavings: number;
  urgency: OpportunityUrgency;
  action: string;
  link: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SCORE_LABELS: Record<DebtScoreLabel, { color: string; bg: string }> = {
  DEBT_FREE: { color: 'text-success-700', bg: 'bg-success-50' },
  EXCELLENT: { color: 'text-success-700', bg: 'bg-success-50' },
  GOOD: { color: 'text-teal-300', bg: 'bg-teal-500/10' },
  FAIR: { color: 'text-warning-700', bg: 'bg-warning-50' },
  CONCERNING: { color: 'text-critical-700', bg: 'bg-critical-50' },
  CRITICAL: { color: 'text-critical-700', bg: 'bg-critical-50' },
};

const CATEGORY_COLORS: Record<DebtCategory, string> = {
  MORTGAGE: 'bg-charcoal-100 text-white/60',
  HELOC: 'bg-warning-100 text-warning-700',
  STUDENT_LOAN: 'bg-info-100 text-info-700',
  AUTO_LOAN: 'bg-success-100 text-success-700',
  CREDIT_CARD: 'bg-critical-100 text-critical-700',
  PERSONAL_LOAN: 'bg-purple-100 text-purple-700',
  SBLOC: 'bg-teal-500/15 text-teal-300',
  MARGIN_LOAN: 'bg-teal-500/15 text-teal-300',
  BUSINESS_LOAN: 'bg-charcoal-100 text-white/60',
  OTHER: 'bg-white/[0.06] text-white/50',
};

const URGENCY_STYLES: Record<OpportunityUrgency, { dot: string; label: string }> = {
  IMMEDIATE: { dot: 'bg-critical-500', label: 'High Priority' },
  '6_MONTHS': { dot: 'bg-warning-500', label: 'Medium Priority' },
  '1_YEAR': { dot: 'bg-info-500', label: 'Planning' },
  PLANNING_HORIZON: { dot: 'bg-white/20', label: 'Long-Term' },
};

const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const fmtPct = new Intl.NumberFormat('en-US', { style: 'percent', minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ---------------------------------------------------------------------------
// Skeleton Components
// ---------------------------------------------------------------------------

function ScoreSkeleton() {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.07] backdrop-blur-xl p-8 shadow-sm animate-pulse">
      <div className="flex flex-col items-center gap-4">
        <div className="h-5 w-40 rounded bg-white/[0.06]" />
        <div className="h-16 w-32 rounded bg-white/[0.06]" />
        <div className="h-3 w-full rounded bg-white/[0.06]" />
        <div className="space-y-3 w-full mt-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-3 w-20 rounded bg-white/[0.06]" />
              <div className="h-3 flex-1 rounded bg-white/[0.06]" />
              <div className="h-3 w-10 rounded bg-white/[0.06]" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCardSkeleton() {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.07] backdrop-blur-xl p-5 shadow-sm animate-pulse">
      <div className="h-3 w-24 rounded bg-white/[0.06] mb-3" />
      <div className="h-8 w-28 rounded bg-white/[0.06]" />
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 py-3 border-b border-limestone-100">
          <div className="h-4 w-32 rounded bg-white/[0.06]" />
          <div className="h-5 w-20 rounded-full bg-white/[0.06]" />
          <div className="h-4 w-20 rounded bg-white/[0.06]" />
          <div className="h-4 w-16 rounded bg-white/[0.06]" />
          <div className="h-4 w-24 rounded bg-white/[0.06] flex-1" />
          <div className="h-4 w-16 rounded bg-white/[0.06]" />
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-Components
// ---------------------------------------------------------------------------

function DimensionBar({ label, score }: { label: string; score: number }) {
  const pct = Math.min(100, Math.max(0, score));
  const barColor =
    pct >= 80 ? 'bg-success-500' :
    pct >= 60 ? 'bg-teal-500' :
    pct >= 40 ? 'bg-warning-500' :
    'bg-critical-500';

  return (
    <div className="flex items-center gap-3">
      <span className="w-20 text-xs font-medium text-white/50 text-right">{label}</span>
      <div className="flex-1 h-2.5 rounded-full bg-white/[0.06] overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-10 text-xs font-semibold text-white/60 text-right">{score}</span>
    </div>
  );
}

function DebtScoreHero({ score }: { score: FartherDebtScore }) {
  const style = SCORE_LABELS[score.label];
  const pct = Math.round((score.score / 850) * 100);
  const changePrefix = score.scoreChange > 0 ? '+' : '';

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.07] backdrop-blur-xl p-8 shadow-sm">
      <div className="flex flex-col items-center gap-2 mb-6">
        <h2 className="text-sm font-semibold tracking-wide uppercase text-white/50">
          Farther Debt Score
        </h2>
        <div className="flex items-baseline gap-2">
          <span className="text-5xl font-bold text-white">{score.score}</span>
          <span className="text-lg text-white/30">/ 850</span>
        </div>
        <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${style.color} ${style.bg}`}>
          {score.label.replace(/_/g, ' ')}
        </span>
        {score.scoreChange !== 0 && (
          <p className={`text-sm font-medium ${score.scoreChange > 0 ? 'text-success-700' : 'text-critical-700'}`}>
            {score.scoreChange > 0 ? '\u25B2' : '\u25BC'} {changePrefix}{score.scoreChange} points since last quarter
          </p>
        )}
      </div>

      {/* Score bar */}
      <div className="w-full h-3 rounded-full bg-white/[0.06] overflow-hidden mb-6">
        <div
          className="h-full rounded-full bg-linear-to-r from-critical-500 via-warning-500 via-brand-500 to-success-500 transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Dimension breakdown */}
      <div className="space-y-3">
        <DimensionBar label="Leverage" score={score.dimensions.leverage} />
        <DimensionBar label="Cost" score={score.dimensions.cost} />
        <DimensionBar label="Structure" score={score.dimensions.structure} />
        <DimensionBar label="Risk" score={score.dimensions.risk} />
        <DimensionBar label="Trajectory" score={score.dimensions.trajectory} />
      </div>

      {/* Key drivers */}
      {score.keyDrivers.length > 0 && (
        <div className="mt-6 pt-4 border-t border-limestone-100">
          <p className="text-xs font-semibold uppercase text-white/30 mb-2">Key Drivers</p>
          <ul className="space-y-1">
            {score.keyDrivers.map((driver, i) => (
              <li key={i} className="text-sm text-white/50 flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-teal-500 flex-shrink-0" />
                {driver}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, subtext, subtextColor }: {
  label: string;
  value: string;
  subtext?: string;
  subtextColor?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.07] backdrop-blur-xl p-5 shadow-sm">
      <p className="text-sm font-medium text-white/50 mb-1">{label}</p>
      <p className="text-2xl font-bold text-white">{value}</p>
      {subtext && (
        <p className={`text-xs mt-1 font-medium ${subtextColor || 'text-white/30'}`}>{subtext}</p>
      )}
    </div>
  );
}

function OpportunityCardComponent({ opp }: { opp: OpportunityCard }) {
  const urgencyStyle = URGENCY_STYLES[opp.urgency];
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.07] backdrop-blur-xl p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center gap-2 mb-2">
        <span className={`h-2.5 w-2.5 rounded-full ${urgencyStyle.dot}`} />
        <span className="text-xs font-semibold uppercase text-white/30">{urgencyStyle.label}</span>
      </div>
      <h4 className="text-sm font-semibold text-white mb-1">{opp.type}</h4>
      <p className="text-sm text-white/50 mb-3">{opp.action}</p>
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-success-700">
          {fmt.format(opp.annualSavings)}/yr savings
        </span>
        <Link
          href={opp.link}
          className="text-sm font-medium text-teal-300 hover:text-teal-300 transition-colors"
        >
          Analyze &rarr;
        </Link>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page Component
// ---------------------------------------------------------------------------

export default function DebtIQDashboardPage() {
  const { user, token } = useAuth();
  const { addToast } = useToast();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [debtScore, setDebtScore] = useState<FartherDebtScore | null>(null);
  const [stats, setStats] = useState<DebtSummaryStats | null>(null);
  const [debts, setDebts] = useState<DebtTableRow[]>([]);
  const [opportunities, setOpportunities] = useState<OpportunityCard[]>([]);
  const [sortField, setSortField] = useState<'balance' | 'rate' | 'afterTaxRate' | 'monthlyPayment'>('balance');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const fetchDashboardData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/v1/debt-iq/dashboard', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('Failed to load debt dashboard');

      const data = await res.json();

      setDebtScore(data.debtScore ?? null);
      setStats(data.summary ?? null);
      setDebts(data.debts ?? []);
      setOpportunities(data.opportunities ?? []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
      addToast(message, 'error');
    } finally {
      setLoading(false);
    }
  }, [token, addToast]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const sortedDebts = [...debts].sort((a, b) => {
    const mul = sortDir === 'asc' ? 1 : -1;
    return mul * (a[sortField] - b[sortField]);
  });

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const sortIcon = (field: typeof sortField) =>
    sortField === field ? (sortDir === 'asc' ? ' \u25B2' : ' \u25BC') : '';

  // -------------------------------------------------------------------------
  // Error state
  // -------------------------------------------------------------------------
  if (error && !loading) {
    return (
      <div className="mx-auto max-w-7xl space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Debt Analysis</h1>
          <p className="mt-1 text-sm text-white/50">FP-DebtIQ — Intelligent Debt Analysis Engine</p>
        </div>
        <div className="rounded-lg border border-critical-200 bg-critical-50 p-6 text-center">
          <p className="text-sm font-medium text-critical-700 mb-3">{error}</p>
          <button
            onClick={fetchDashboardData}
            className="rounded-lg bg-teal-500 px-4 py-2 text-sm font-medium text-white hover:bg-teal-400 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <div className="mx-auto max-w-7xl space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Debt Analysis</h1>
          <p className="mt-1 text-sm text-white/50">
            FP-DebtIQ — Intelligent Debt Analysis Engine
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/tax-planning/debt-iq/strategy"
            className="rounded-2xl border border-white/[0.06] bg-white/[0.07] backdrop-blur-xl px-4 py-2 text-sm font-medium text-white/60 hover:bg-white/[0.04] transition-colors"
          >
            Payoff Optimizer
          </Link>
          <Link
            href="/tax-planning/debt-iq/analysis/mortgage"
            className="rounded-lg bg-teal-500 px-4 py-2 text-sm font-medium text-white hover:bg-teal-400 transition-colors shadow-sm"
          >
            Run Analysis
          </Link>
        </div>
      </div>

      {/* Score + Stats Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Debt Score — left column */}
        <div className="lg:col-span-1">
          {loading ? <ScoreSkeleton /> : debtScore ? <DebtScoreHero score={debtScore} /> : (
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.07] backdrop-blur-xl p-8 shadow-sm text-center">
              <p className="text-sm text-white/50">No debt score available yet.</p>
              <p className="text-xs text-white/30 mt-1">Add debts to calculate your score.</p>
            </div>
          )}
        </div>

        {/* Stat cards + opportunities — right column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Summary stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
            ) : stats ? (
              <>
                <StatCard
                  label="Total Debt"
                  value={fmt.format(stats.totalDebt)}
                />
                <StatCard
                  label="Monthly Service"
                  value={fmt.format(stats.monthlyDebtService)}
                  subtext={stats.afterTaxCostOfDebt > 0 ? `${fmtPct.format(stats.afterTaxCostOfDebt)} DTI` : undefined}
                />
                <StatCard
                  label="After-Tax Cost"
                  value={fmtPct.format(stats.afterTaxCostOfDebt)}
                />
                <StatCard
                  label="Debt-Free Date"
                  value={stats.debtFreeDate}
                  subtext={stats.yearsSaved > 0 ? `-${stats.yearsSaved} yrs w/ strategy` : undefined}
                  subtextColor="text-success-700"
                />
              </>
            ) : null}
          </div>

          {/* Opportunities */}
          {!loading && opportunities.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold uppercase text-white/30 mb-3">
                Top Opportunities
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {opportunities.slice(0, 3).map((opp, i) => (
                  <OpportunityCardComponent key={i} opp={opp} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Debt Breakdown Table */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.07] backdrop-blur-xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-limestone-100">
          <h3 className="text-base font-semibold text-white">All Debts</h3>
          <Link
            href="/tax-planning/debt-iq/strategy"
            className="text-sm font-medium text-teal-300 hover:text-teal-300 transition-colors"
          >
            View Strategy &rarr;
          </Link>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-6"><TableSkeleton /></div>
          ) : debts.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-sm text-white/50">No debts recorded for this household.</p>
              <p className="text-xs text-white/30 mt-1">Add debts to see your full liability profile.</p>
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-limestone-100 bg-transparent/50">
                  <th className="px-6 py-3 text-xs font-semibold uppercase text-white/30">Debt</th>
                  <th className="px-3 py-3 text-xs font-semibold uppercase text-white/30">Type</th>
                  <th
                    className="px-3 py-3 text-xs font-semibold uppercase text-white/30 cursor-pointer select-none text-right"
                    onClick={() => toggleSort('balance')}
                  >
                    Balance{sortIcon('balance')}
                  </th>
                  <th
                    className="px-3 py-3 text-xs font-semibold uppercase text-white/30 cursor-pointer select-none text-right"
                    onClick={() => toggleSort('rate')}
                  >
                    Rate{sortIcon('rate')}
                  </th>
                  <th
                    className="px-3 py-3 text-xs font-semibold uppercase text-white/30 cursor-pointer select-none text-right"
                    onClick={() => toggleSort('monthlyPayment')}
                  >
                    Mo. Payment{sortIcon('monthlyPayment')}
                  </th>
                  <th
                    className="px-3 py-3 text-xs font-semibold uppercase text-white/30 cursor-pointer select-none text-right"
                    onClick={() => toggleSort('afterTaxRate')}
                  >
                    After-Tax{sortIcon('afterTaxRate')}
                  </th>
                  <th className="px-3 py-3 text-xs font-semibold uppercase text-white/30 text-right">Payoff</th>
                  <th className="px-3 py-3 text-xs font-semibold uppercase text-white/30">Type</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-limestone-100">
                {sortedDebts.map((debt) => (
                  <tr key={debt.id} className="hover:bg-white/[0.04]/50 transition-colors">
                    <td className="px-6 py-3 font-medium text-white">{debt.name}</td>
                    <td className="px-3 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${CATEGORY_COLORS[debt.category]}`}>
                        {debt.category.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-white">{fmt.format(debt.balance)}</td>
                    <td className="px-3 py-3 text-right font-mono text-white/60">{fmtPct.format(debt.rate)}</td>
                    <td className="px-3 py-3 text-right font-mono text-white/60">{fmt.format(debt.monthlyPayment)}</td>
                    <td className="px-3 py-3 text-right font-mono text-white/60">{fmtPct.format(debt.afterTaxRate)}</td>
                    <td className="px-3 py-3 text-right text-white/50">{debt.payoffDate}</td>
                    <td className="px-3 py-3 text-white/50">{debt.rateType}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-white/[0.06] bg-transparent/50 font-semibold">
                  <td className="px-6 py-3 text-white">Totals</td>
                  <td className="px-3 py-3" />
                  <td className="px-3 py-3 text-right font-mono text-white">
                    {fmt.format(debts.reduce((s, d) => s + d.balance, 0))}
                  </td>
                  <td className="px-3 py-3 text-right font-mono text-white/60">
                    {debts.length > 0
                      ? fmtPct.format(
                          debts.reduce((s, d) => s + d.rate * d.balance, 0) /
                          debts.reduce((s, d) => s + d.balance, 0)
                        )
                      : '0.00%'}
                  </td>
                  <td className="px-3 py-3 text-right font-mono text-white">
                    {fmt.format(debts.reduce((s, d) => s + d.monthlyPayment, 0))}
                  </td>
                  <td className="px-3 py-3" colSpan={3} />
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </div>

      {/* Analysis Tools Quick Links */}
      <div>
        <h3 className="text-sm font-semibold uppercase text-white/30 mb-3">Analysis Tools</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: 'Mortgage', href: '/tax-planning/debt-iq/analysis/mortgage', icon: '\uD83C\uDFE0' },
            { label: 'Student Loans', href: '/tax-planning/debt-iq/analysis/student-loans', icon: '\uD83C\uDF93' },
            { label: 'Credit Cards', href: '/tax-planning/debt-iq/analysis/credit-cards', icon: '\uD83D\uDCB3' },
            { label: 'Securities', href: '/tax-planning/debt-iq/analysis/securities', icon: '\uD83D\uDCC8' },
            { label: 'Auto Loans', href: '/tax-planning/debt-iq/analysis/auto', icon: '\uD83D\uDE97' },
            { label: 'Business Debt', href: '/tax-planning/debt-iq/analysis/business', icon: '\uD83C\uDFE2' },
          ].map((tool) => (
            <Link
              key={tool.label}
              href={tool.href}
              className="flex flex-col items-center gap-2 rounded-2xl border border-white/[0.06] bg-white/[0.07] backdrop-blur-xl p-4 text-center hover:bg-white/[0.04] hover:shadow-sm transition-all"
            >
              <span className="text-2xl">{tool.icon}</span>
              <span className="text-xs font-semibold text-white/60">{tool.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
