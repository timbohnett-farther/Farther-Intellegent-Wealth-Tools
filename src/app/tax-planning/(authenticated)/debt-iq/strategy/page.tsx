'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth, useToast } from '@/lib/tax-planning/auth-context';
import type {
  PayoffStrategy,
  PayoffPlan,
  HouseholdDebt,
} from '@/lib/debt-engine/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface StrategyComparison {
  strategy: PayoffStrategy;
  label: string;
  totalInterestPaid: number;
  debtFreeDate: string;
  monthsToDebtFree: number;
  netWorthAt5yr: number;
  firstPayoff: string;
  firstPayoffMonth: number;
}

interface PayoffTimelineEntry {
  month: number;
  date: string;
  totalDebtRemaining: number;
  debtsActive: number;
  event?: string;
}

interface StrategyResult {
  strategies: StrategyComparison[];
  recommendation: PayoffStrategy;
  recommendationReason: string;
  timeline: PayoffTimelineEntry[];
  monthlyPlan: Array<{
    month: number;
    allocation: string;
    target: string;
    amount: number;
  }>;
  minimumPaymentPath: {
    debtFreeMonths: number;
    totalInterest: number;
  };
  optimizedPath: {
    debtFreeMonths: number;
    totalInterest: number;
  };
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STRATEGY_LABELS: Record<PayoffStrategy, string> = {
  AVALANCHE: 'Avalanche',
  SNOWBALL: 'Snowball',
  HYBRID: 'Hybrid',
  HIGHEST_PAYMENT: 'Cash Flow',
  SHORTEST_TERM: 'Shortest Term',
  TAX_OPTIMIZED: 'Tax Optimized',
  CREDIT_SCORE: 'Credit Score',
  NET_WORTH_MAX: 'Net Worth Max',
};

const STRATEGY_DESCRIPTIONS: Record<PayoffStrategy, string> = {
  AVALANCHE: 'Targets highest interest rate first — minimizes total interest paid',
  SNOWBALL: 'Targets lowest balance first — fastest psychological wins',
  HYBRID: 'Snowball until first payoff, then switches to avalanche',
  HIGHEST_PAYMENT: 'Eliminates highest required payment first for cash flow relief',
  SHORTEST_TERM: 'Pays off soonest-maturing debt first',
  TAX_OPTIMIZED: 'Pays non-deductible debt first, preserves tax-advantaged debt',
  CREDIT_SCORE: 'Optimizes to maximize credit score improvement',
  NET_WORTH_MAX: 'Models each strategy for maximum 10-year net worth outcome',
};

const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function PageSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-12 w-full rounded-lg bg-white/[0.06]" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-40 rounded-lg bg-white/[0.06]" />
        ))}
      </div>
      <div className="h-64 rounded-lg bg-white/[0.06]" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-Components
// ---------------------------------------------------------------------------

function ExtraPaymentSlider({ value, onChange, max }: {
  value: number;
  onChange: (v: number) => void;
  max: number;
}) {
  return (
    <div className="flex items-center gap-4">
      <label className="text-sm font-medium text-white/60 whitespace-nowrap">
        Extra Monthly:
      </label>
      <input
        type="range"
        min={0}
        max={max}
        step={50}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 h-2 rounded-full appearance-none bg-white/[0.06] accent-brand-700"
      />
      <span className="text-sm font-bold text-white w-20 text-right">
        {fmt.format(value)}
      </span>
    </div>
  );
}

function StrategyCard({ s, isRecommended, isSelected, onSelect }: {
  s: StrategyComparison;
  isRecommended: boolean;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={`relative w-full text-left rounded-lg border p-4 transition-all ${
        isSelected
          ? 'border-brand-500 bg-teal-500/10 shadow-md ring-2 ring-teal-200'
          : 'border-white/[0.06] bg-white/[0.07] hover:bg-white/[0.04] hover:shadow-sm'
      }`}
    >
      {isRecommended && (
        <span className="absolute -top-2.5 left-3 inline-flex items-center rounded-full bg-success-100 px-2 py-0.5 text-[10px] font-bold uppercase text-success-700">
          Recommended
        </span>
      )}
      <h4 className="text-sm font-semibold text-white mb-2">{STRATEGY_LABELS[s.strategy]}</h4>
      <p className="text-xs text-white/50 mb-3 line-clamp-2">{STRATEGY_DESCRIPTIONS[s.strategy]}</p>
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs">
          <span className="text-white/50">Total Interest:</span>
          <span className="font-mono font-semibold text-white">{fmt.format(s.totalInterestPaid)}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-white/50">Debt-Free:</span>
          <span className="font-medium text-white/60">{s.debtFreeDate}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-white/50">Months:</span>
          <span className="font-medium text-white/60">{s.monthsToDebtFree}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-white/50">First Win:</span>
          <span className="font-medium text-white/60">{s.firstPayoff} (m{s.firstPayoffMonth})</span>
        </div>
      </div>
    </button>
  );
}

function ComparisonTable({ strategies, recommendation }: {
  strategies: StrategyComparison[];
  recommendation: PayoffStrategy;
}) {
  const metrics = [
    { key: 'totalInterestPaid', label: 'Total Interest', format: (v: number) => fmt.format(v), best: 'min' },
    { key: 'monthsToDebtFree', label: 'Months to Free', format: (v: number) => `${v} months`, best: 'min' },
    { key: 'netWorthAt5yr', label: 'Net Worth @ 5yr', format: (v: number) => fmt.format(v), best: 'max' },
    { key: 'firstPayoffMonth', label: 'First Payoff', format: (v: number) => `Month ${v}`, best: 'min' },
  ] as const;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-limestone-100 bg-transparent/50">
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-white/30">Metric</th>
            {strategies.map((s) => (
              <th key={s.strategy} className={`px-4 py-3 text-right text-xs font-semibold uppercase ${
                s.strategy === recommendation ? 'text-teal-300' : 'text-white/30'
              }`}>
                {STRATEGY_LABELS[s.strategy]}
                {s.strategy === recommendation && ' \u2605'}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-limestone-100">
          {metrics.map((m) => {
            const values = strategies.map((s) => (s as unknown as Record<string, number>)[m.key] as number);
            const bestVal = m.best === 'min' ? Math.min(...values) : Math.max(...values);
            return (
              <tr key={m.key}>
                <td className="px-4 py-3 font-medium text-white/60">{m.label}</td>
                {strategies.map((s) => {
                  const val = (s as unknown as Record<string, number>)[m.key] as number;
                  const isBest = val === bestVal;
                  return (
                    <td key={s.strategy} className={`px-4 py-3 text-right font-mono ${
                      isBest ? 'font-bold text-success-700' : 'text-white/60'
                    }`}>
                      {m.format(val)}
                      {isBest && ' \u2713'}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function DebtFreeCountdown({ minimumPath, optimizedPath }: {
  minimumPath: { debtFreeMonths: number; totalInterest: number };
  optimizedPath: { debtFreeMonths: number; totalInterest: number };
}) {
  const monthsSaved = minimumPath.debtFreeMonths - optimizedPath.debtFreeMonths;
  const yearsSaved = Math.floor(monthsSaved / 12);
  const remainingMonths = monthsSaved % 12;
  const interestSaved = minimumPath.totalInterest - optimizedPath.totalInterest;

  return (
    <div className="rounded-xl border border-white/[0.06] bg-linear-to-br from-brand-50 to-white p-6 shadow-sm">
      <h3 className="text-sm font-semibold uppercase text-white/30 mb-4">Debt-Free Projection</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <p className="text-xs text-white/50 mb-1">Current Path (Minimum Payments)</p>
          <p className="text-lg font-bold text-white">
            {Math.floor(minimumPath.debtFreeMonths / 12)} years {minimumPath.debtFreeMonths % 12} months
          </p>
          <p className="text-sm text-white/50">
            Interest: {fmt.format(minimumPath.totalInterest)}
          </p>
        </div>
        <div>
          <p className="text-xs text-white/50 mb-1">Optimized Path</p>
          <p className="text-lg font-bold text-success-700">
            {Math.floor(optimizedPath.debtFreeMonths / 12)} years {optimizedPath.debtFreeMonths % 12} months
          </p>
          <p className="text-sm text-success-700">
            Interest: {fmt.format(optimizedPath.totalInterest)}
          </p>
        </div>
      </div>
      <div className="mt-4 pt-4 border-t border-limestone-100 text-center">
        <p className="text-2xl font-bold text-teal-300">
          {yearsSaved > 0 && `${yearsSaved} year${yearsSaved !== 1 ? 's' : ''} `}
          {remainingMonths > 0 && `${remainingMonths} month${remainingMonths !== 1 ? 's' : ''} `}
          saved
        </p>
        <p className="text-sm text-white/50 mt-1">
          {fmt.format(interestSaved)} less interest paid
        </p>
      </div>
    </div>
  );
}

function MonthlyAllocationTable({ plan }: {
  plan: Array<{ month: number; allocation: string; target: string; amount: number }>;
}) {
  if (plan.length === 0) return null;

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.07] backdrop-blur-xl shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-limestone-100">
        <h3 className="text-base font-semibold text-white">Monthly Payoff Plan</h3>
        <p className="text-xs text-white/50 mt-1">Step-by-step allocation of your extra payments</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-limestone-100 bg-transparent/50">
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-white/30">Months</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-white/30">Target Debt</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-white/30">Allocation</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-white/30">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-limestone-100">
            {plan.map((row, i) => (
              <tr key={i} className="hover:bg-white/[0.04]/50">
                <td className="px-6 py-3 font-medium text-white/60">Month {row.month}</td>
                <td className="px-4 py-3 text-white font-medium">{row.target}</td>
                <td className="px-4 py-3 text-white/50">{row.allocation}</td>
                <td className="px-4 py-3 text-right font-mono font-semibold text-white">{fmt.format(row.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function DebtPayoffStrategyPage() {
  const { user, token } = useAuth();
  const { addToast } = useToast();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [computing, setComputing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extraPayment, setExtraPayment] = useState(500);
  const [selectedStrategy, setSelectedStrategy] = useState<PayoffStrategy>('AVALANCHE');
  const [result, setResult] = useState<StrategyResult | null>(null);
  const [debts, setDebts] = useState<HouseholdDebt[]>([]);

  const fetchDebts = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/v1/debt-iq/debts', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load debts');
      const data = await res.json();
      setDebts(data.debts ?? []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
      addToast(message, 'error');
    } finally {
      setLoading(false);
    }
  }, [token, addToast]);

  const runOptimizer = useCallback(async () => {
    if (!token) return;
    setComputing(true);

    try {
      const res = await fetch('/api/v1/debt-iq/optimize-payoff', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ extraMonthlyPayment: extraPayment }),
      });
      if (!res.ok) throw new Error('Failed to run payoff optimizer');
      const data: StrategyResult = await res.json();
      setResult(data);
      setSelectedStrategy(data.recommendation);
      addToast('Payoff optimization complete', 'success');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Optimization failed';
      addToast(message, 'error');
    } finally {
      setComputing(false);
    }
  }, [token, extraPayment, addToast]);

  useEffect(() => {
    fetchDebts();
  }, [fetchDebts]);

  // -------------------------------------------------------------------------
  // Error
  // -------------------------------------------------------------------------
  if (error && !loading) {
    return (
      <div className="mx-auto max-w-7xl space-y-8">
        <div>
          <h1 className="font-serif text-3xl text-white tracking-wide">Payoff Strategy Optimizer</h1>
        </div>
        <div className="rounded-lg border border-critical-200 bg-critical-50 p-6 text-center">
          <p className="text-sm font-medium text-critical-700 mb-3">{error}</p>
          <button
            onClick={fetchDebts}
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
          <div className="flex items-center gap-2 mb-1">
            <Link href="/tax-planning/debt-iq" className="text-sm text-teal-300 hover:text-teal-300">
              Debt Analysis
            </Link>
            <span className="text-white/30">/</span>
            <span className="text-sm text-white/50">Strategy</span>
          </div>
          <h1 className="font-serif text-3xl text-white tracking-wide">Multi-Debt Payoff Optimizer</h1>
          <p className="mt-1 text-sm text-white/50">
            Compare 8 strategies simultaneously and find the optimal payoff path
          </p>
        </div>
      </div>

      {loading ? (
        <PageSkeleton />
      ) : debts.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.07] backdrop-blur-xl p-12 text-center shadow-sm">
          <p className="text-base font-medium text-white/60 mb-2">No debts to optimize</p>
          <p className="text-sm text-white/50 mb-4">Add debts to your household profile to use the payoff optimizer.</p>
          <Link
            href="/tax-planning/debt-iq"
            className="rounded-lg bg-teal-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-teal-400 transition-colors"
          >
            Back to Debt Dashboard
          </Link>
        </div>
      ) : (
        <>
          {/* Extra Payment Control */}
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.07] backdrop-blur-xl p-6 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-end gap-4">
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-white mb-3">
                  Available Extra Payment Per Month
                </h3>
                <ExtraPaymentSlider
                  value={extraPayment}
                  onChange={setExtraPayment}
                  max={5000}
                />
              </div>
              <button
                onClick={runOptimizer}
                disabled={computing}
                className="rounded-lg bg-teal-500 px-6 py-2.5 text-sm font-medium text-white hover:bg-teal-400 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {computing ? 'Computing...' : 'Run Optimizer'}
              </button>
            </div>
          </div>

          {/* Current Debts Summary */}
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.07] backdrop-blur-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-limestone-100">
              <h3 className="text-base font-semibold text-white">
                Debts Included ({debts.length})
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-limestone-100 bg-transparent/50">
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-white/30">Name</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-white/30">Balance</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-white/30">APR</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-white/30">Min Payment</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-white/30">Deductible</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-limestone-100">
                  {debts.map((debt) => (
                    <tr key={debt.id} className="hover:bg-white/[0.04]/50">
                      <td className="px-6 py-3 font-medium text-white">{debt.name}</td>
                      <td className="px-4 py-3 text-right font-mono text-white">{fmt.format(debt.currentBalance)}</td>
                      <td className="px-4 py-3 text-right font-mono text-white/60">
                        {(debt.interestRate * 100).toFixed(2)}%
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-white/60">{fmt.format(debt.minimumPayment)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          debt.isDeductible ? 'bg-success-100 text-success-700' : 'bg-white/[0.06] text-white/50'
                        }`}>
                          {debt.isDeductible ? 'Yes' : 'No'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Results */}
          {result && (
            <>
              {/* Debt-Free Countdown */}
              <DebtFreeCountdown
                minimumPath={result.minimumPaymentPath}
                optimizedPath={result.optimizedPath}
              />

              {/* Strategy Cards */}
              <div>
                <h3 className="text-sm font-semibold uppercase text-white/30 mb-3">
                  Strategy Comparison
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {result.strategies.map((s) => (
                    <StrategyCard
                      key={s.strategy}
                      s={s}
                      isRecommended={s.strategy === result.recommendation}
                      isSelected={s.strategy === selectedStrategy}
                      onSelect={() => setSelectedStrategy(s.strategy)}
                    />
                  ))}
                </div>
              </div>

              {/* Recommendation Narrative */}
              <div className="rounded-xl border border-brand-200 bg-teal-500/10 p-6">
                <h3 className="text-sm font-semibold text-teal-300 mb-2">Recommendation</h3>
                <p className="text-sm text-white/60 leading-relaxed">
                  {result.recommendationReason}
                </p>
              </div>

              {/* Detailed Comparison Table */}
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.07] backdrop-blur-xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-limestone-100">
                  <h3 className="text-base font-semibold text-white">Detailed Comparison</h3>
                </div>
                <ComparisonTable
                  strategies={result.strategies}
                  recommendation={result.recommendation}
                />
              </div>

              {/* Monthly Allocation Plan */}
              <MonthlyAllocationTable plan={result.monthlyPlan} />

              {/* Actions */}
              <div className="flex items-center justify-between rounded-2xl border border-white/[0.06] bg-white/[0.07] backdrop-blur-xl p-6 shadow-sm">
                <p className="text-sm text-white/50">
                  Generate a client-ready report with the selected strategy
                </p>
                <div className="flex items-center gap-3">
                  <button className="rounded-2xl border border-white/[0.06] bg-white/[0.07] backdrop-blur-xl px-4 py-2 text-sm font-medium text-white/60 hover:bg-white/[0.04] transition-colors">
                    Export PDF
                  </button>
                  <button className="rounded-lg bg-teal-500 px-4 py-2 text-sm font-medium text-white hover:bg-teal-400 transition-colors shadow-sm">
                    Add to Financial Plan
                  </button>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
