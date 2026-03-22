'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth, useToast } from '@/lib/tax-planning/auth-context';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FeeInputs {
  portfolioValue: number;
  currentExpenseRatio: number;
  currentAdvisoryFee: number;
  currentTransactionCost: number;
  proposedExpenseRatio: number;
  proposedAdvisoryFee: number;
  proposedTransactionCost: number;
  projectionYears: number;
  assumedReturn: number;
}

interface CompoundingRow {
  year: number;
  currentWealth: number;
  proposedWealth: number;
  difference: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_INPUTS: FeeInputs = {
  portfolioValue: 1_000_000,
  currentExpenseRatio: 0.75,
  currentAdvisoryFee: 1.0,
  currentTransactionCost: 0.1,
  proposedExpenseRatio: 0.15,
  proposedAdvisoryFee: 0.85,
  proposedTransactionCost: 0.05,
  projectionYears: 20,
  assumedReturn: 7.0,
};

const PROJECTION_YEAR_OPTIONS = [5, 10, 15, 20, 25, 30];

const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const fmtDetailed = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ---------------------------------------------------------------------------
// Computation
// ---------------------------------------------------------------------------

function computeProjections(inputs: FeeInputs): CompoundingRow[] {
  const rows: CompoundingRow[] = [];
  const currentTotalFee = (inputs.currentExpenseRatio + inputs.currentAdvisoryFee + inputs.currentTransactionCost) / 100;
  const proposedTotalFee = (inputs.proposedExpenseRatio + inputs.proposedAdvisoryFee + inputs.proposedTransactionCost) / 100;
  const grossReturn = inputs.assumedReturn / 100;

  let currentWealth = inputs.portfolioValue;
  let proposedWealth = inputs.portfolioValue;

  for (let year = 1; year <= inputs.projectionYears; year++) {
    currentWealth = currentWealth * (1 + grossReturn - currentTotalFee);
    proposedWealth = proposedWealth * (1 + grossReturn - proposedTotalFee);
    rows.push({
      year,
      currentWealth,
      proposedWealth,
      difference: proposedWealth - currentWealth,
    });
  }

  return rows;
}

// ---------------------------------------------------------------------------
// Fee Input Field
// ---------------------------------------------------------------------------

function FeeField({
  label,
  value,
  onChange,
  suffix = '%',
  prefix,
  step = 0.05,
  min = 0,
  max,
  helpText,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  suffix?: string;
  prefix?: string;
  step?: number;
  min?: number;
  max?: number;
  helpText?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-white/60 mb-1.5">{label}</label>
      <div className="flex items-center rounded-2xl border border-white/[0.06] bg-white/[0.07] backdrop-blur-xl focus-within:border-teal-500 focus-within:ring-1 focus-within:ring-teal-500 transition-all">
        {prefix && <span className="pl-3 text-sm text-white/50">{prefix}</span>}
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          step={step}
          min={min}
          max={max}
          className="h-10 w-full bg-transparent px-3 text-sm font-mono text-white tabular-nums outline-hidden placeholder:text-white/30"
        />
        {suffix && <span className="pr-3 text-sm text-white/50">{suffix}</span>}
      </div>
      {helpText && <p className="mt-1 text-[10px] text-white/30">{helpText}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Bar Chart
// ---------------------------------------------------------------------------

function FeeComparisonChart({ projections, portfolioValue }: { projections: CompoundingRow[]; portfolioValue: number }) {
  const milestones = projections.filter((r) => r.year % 5 === 0 || r.year === projections.length);
  const maxValue = Math.max(...milestones.map((r) => Math.max(r.currentWealth, r.proposedWealth)));

  return (
    <div className="space-y-4">
      {milestones.map((row) => {
        const currentPct = (row.currentWealth / maxValue) * 100;
        const proposedPct = (row.proposedWealth / maxValue) * 100;

        return (
          <div key={row.year}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-white/60">Year {row.year}</span>
              <span className="text-xs font-bold text-success-700 tabular-nums">
                +{fmt.format(row.difference)} savings
              </span>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-16 text-[10px] text-white/30 text-right">Current</span>
                <div className="flex-1 h-5 rounded bg-white/[0.06]">
                  <div
                    className="h-full rounded bg-white/20 flex items-center justify-end pr-2 transition-all duration-500"
                    style={{ width: `${Math.max(currentPct, 8)}%` }}
                  >
                    <span className="text-[10px] font-bold text-white tabular-nums whitespace-nowrap">
                      {fmt.format(row.currentWealth)}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-16 text-[10px] text-teal-300 text-right">Proposed</span>
                <div className="flex-1 h-5 rounded bg-white/[0.06]">
                  <div
                    className="h-full rounded bg-teal-500 flex items-center justify-end pr-2 transition-all duration-500"
                    style={{ width: `${Math.max(proposedPct, 8)}%` }}
                  >
                    <span className="text-[10px] font-bold text-white tabular-nums whitespace-nowrap">
                      {fmt.format(row.proposedWealth)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function FeeAnalyzerPage() {
  const { token } = useAuth();
  const { addToast } = useToast();
  const router = useRouter();

  const [inputs, setInputs] = useState<FeeInputs>(DEFAULT_INPUTS);

  const updateInput = useCallback(<K extends keyof FeeInputs>(key: K, value: FeeInputs[K]) => {
    setInputs((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleReset = useCallback(() => {
    setInputs(DEFAULT_INPUTS);
    addToast('Reset to defaults', 'info');
  }, [addToast]);

  // Computed values
  const currentTotalRate = inputs.currentExpenseRatio + inputs.currentAdvisoryFee + inputs.currentTransactionCost;
  const proposedTotalRate = inputs.proposedExpenseRatio + inputs.proposedAdvisoryFee + inputs.proposedTransactionCost;
  const rateSavings = currentTotalRate - proposedTotalRate;

  const currentAnnualCost = inputs.portfolioValue * (currentTotalRate / 100);
  const proposedAnnualCost = inputs.portfolioValue * (proposedTotalRate / 100);
  const annualSavings = currentAnnualCost - proposedAnnualCost;

  const projections = useMemo(() => computeProjections(inputs), [inputs]);
  const finalRow = projections[projections.length - 1];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Fee Analyzer</h1>
          <p className="mt-1 text-sm text-white/50">
            Compare current vs. proposed fee structures and project the long-term impact on wealth.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-2 rounded-lg border border-white/[0.10] bg-white/[0.07] backdrop-blur-xl px-4 py-2.5 text-sm font-medium text-white/60 hover:bg-white/[0.04] transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
            </svg>
            Reset
          </button>
          <Link
            href="/tax-planning/proposals"
            className="text-sm font-medium text-white/50 hover:text-white/60 transition-colors"
          >
            Back to Proposals
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.07] backdrop-blur-xl p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-white/50">Current All-In</p>
          <p className="mt-2 text-2xl font-bold text-white/60 tabular-nums">{currentTotalRate.toFixed(2)}%</p>
          <p className="mt-1 text-xs text-white/30">{fmt.format(currentAnnualCost)}/yr</p>
        </div>
        <div className="rounded-lg border border-brand-200 bg-teal-500/10 p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-teal-300">Proposed All-In</p>
          <p className="mt-2 text-2xl font-bold text-teal-300 tabular-nums">{proposedTotalRate.toFixed(2)}%</p>
          <p className="mt-1 text-xs text-teal-300">{fmt.format(proposedAnnualCost)}/yr</p>
        </div>
        <div className="rounded-lg border border-success-200 bg-success-50 p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-success-600">Annual Savings</p>
          <p className="mt-2 text-2xl font-bold text-success-700 tabular-nums">{fmt.format(annualSavings)}</p>
          <p className="mt-1 text-xs text-success-500">{rateSavings.toFixed(2)}% lower fees</p>
        </div>
        <div className="rounded-lg border border-success-200 bg-success-50 p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-success-600">{inputs.projectionYears}-Year Impact</p>
          <p className="mt-2 text-2xl font-bold text-success-700 tabular-nums">{finalRow ? fmt.format(finalRow.difference) : '--'}</p>
          <p className="mt-1 text-xs text-success-500">Projected additional wealth</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Input Form */}
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.07] backdrop-blur-xl p-6 shadow-sm space-y-6">
          <h2 className="text-sm font-semibold text-white">Fee Inputs</h2>

          {/* Portfolio Value */}
          <FeeField
            label="Portfolio Value"
            value={inputs.portfolioValue}
            onChange={(v) => updateInput('portfolioValue', v)}
            prefix="$"
            suffix=""
            step={10000}
            min={0}
            helpText="Total investable assets"
          />

          {/* Assumptions */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-white/60 mb-1.5">Projection Years</label>
              <select
                value={inputs.projectionYears}
                onChange={(e) => updateInput('projectionYears', parseInt(e.target.value))}
                className="h-10 w-full rounded-2xl border border-white/[0.06] bg-white/[0.07] backdrop-blur-xl px-3 text-sm text-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
              >
                {PROJECTION_YEAR_OPTIONS.map((y) => (
                  <option key={y} value={y}>{y} years</option>
                ))}
              </select>
            </div>
            <FeeField
              label="Assumed Return"
              value={inputs.assumedReturn}
              onChange={(v) => updateInput('assumedReturn', v)}
              step={0.5}
              min={0}
              max={20}
              helpText="Gross annual"
            />
          </div>

          {/* Current Fees */}
          <div>
            <h3 className="text-xs font-semibold text-white/60 mb-3 uppercase tracking-wide">Current Fees</h3>
            <div className="space-y-3">
              <FeeField
                label="Fund Expense Ratio"
                value={inputs.currentExpenseRatio}
                onChange={(v) => updateInput('currentExpenseRatio', v)}
                helpText="Weighted avg fund expenses"
              />
              <FeeField
                label="Advisory Fee"
                value={inputs.currentAdvisoryFee}
                onChange={(v) => updateInput('currentAdvisoryFee', v)}
                helpText="AUM-based advisory fee"
              />
              <FeeField
                label="Transaction Costs"
                value={inputs.currentTransactionCost}
                onChange={(v) => updateInput('currentTransactionCost', v)}
                helpText="Trading and other costs"
              />
            </div>
          </div>

          {/* Proposed Fees */}
          <div>
            <h3 className="text-xs font-semibold text-teal-300 mb-3 uppercase tracking-wide">Proposed Fees</h3>
            <div className="space-y-3">
              <FeeField
                label="Fund Expense Ratio"
                value={inputs.proposedExpenseRatio}
                onChange={(v) => updateInput('proposedExpenseRatio', v)}
                helpText="Weighted avg fund expenses"
              />
              <FeeField
                label="Advisory Fee"
                value={inputs.proposedAdvisoryFee}
                onChange={(v) => updateInput('proposedAdvisoryFee', v)}
                helpText="AUM-based advisory fee"
              />
              <FeeField
                label="Transaction Costs"
                value={inputs.proposedTransactionCost}
                onChange={(v) => updateInput('proposedTransactionCost', v)}
                helpText="Trading and other costs"
              />
            </div>
          </div>
        </div>

        {/* Visualization */}
        <div className="lg:col-span-2 space-y-6">
          {/* Fee Breakdown */}
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.07] backdrop-blur-xl p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-white mb-4">Fee Breakdown Comparison</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    <th className="py-2 text-left text-xs font-semibold uppercase text-white/50">Fee Component</th>
                    <th className="py-2 text-right text-xs font-semibold uppercase text-white/50">Current</th>
                    <th className="py-2 text-right text-xs font-semibold uppercase text-teal-300">Proposed</th>
                    <th className="py-2 text-right text-xs font-semibold uppercase text-success-600">Savings</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-limestone-100">
                  {[
                    { label: 'Fund Expenses', current: inputs.currentExpenseRatio, proposed: inputs.proposedExpenseRatio },
                    { label: 'Advisory Fee', current: inputs.currentAdvisoryFee, proposed: inputs.proposedAdvisoryFee },
                    { label: 'Transaction Costs', current: inputs.currentTransactionCost, proposed: inputs.proposedTransactionCost },
                  ].map((row) => (
                    <tr key={row.label}>
                      <td className="py-2.5 text-white/60">{row.label}</td>
                      <td className="py-2.5 text-right tabular-nums text-white/50">{row.current.toFixed(2)}%</td>
                      <td className="py-2.5 text-right tabular-nums font-medium text-teal-300">{row.proposed.toFixed(2)}%</td>
                      <td className="py-2.5 text-right tabular-nums font-medium text-success-700">
                        {(row.current - row.proposed).toFixed(2)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t-2 border-white/[0.06]">
                  <tr className="font-bold">
                    <td className="py-2.5 text-white">Total All-In Cost</td>
                    <td className="py-2.5 text-right tabular-nums text-white/60">{currentTotalRate.toFixed(2)}%</td>
                    <td className="py-2.5 text-right tabular-nums text-teal-300">{proposedTotalRate.toFixed(2)}%</td>
                    <td className="py-2.5 text-right tabular-nums text-success-700">{rateSavings.toFixed(2)}%</td>
                  </tr>
                  <tr>
                    <td className="py-2 text-xs text-white/50">Annual Dollar Cost</td>
                    <td className="py-2 text-right text-xs tabular-nums text-white/50">{fmt.format(currentAnnualCost)}</td>
                    <td className="py-2 text-right text-xs tabular-nums text-teal-300">{fmt.format(proposedAnnualCost)}</td>
                    <td className="py-2 text-right text-xs tabular-nums font-semibold text-success-600">{fmt.format(annualSavings)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Wealth Projection Chart */}
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.07] backdrop-blur-xl p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-white mb-4">
              Projected Wealth Impact ({inputs.projectionYears} Years)
            </h2>
            <FeeComparisonChart projections={projections} portfolioValue={inputs.portfolioValue} />
          </div>

          {/* Projection Table */}
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.07] backdrop-blur-xl p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-white mb-4">Year-by-Year Projection</h2>
            <div className="overflow-x-auto max-h-64">
              <table className="min-w-full text-sm">
                <thead className="sticky top-0 bg-[#1a1a1a]">
                  <tr className="border-b border-white/[0.06]">
                    <th className="py-2 text-left text-xs font-semibold uppercase text-white/50">Year</th>
                    <th className="py-2 text-right text-xs font-semibold uppercase text-white/50">Current</th>
                    <th className="py-2 text-right text-xs font-semibold uppercase text-teal-300">Proposed</th>
                    <th className="py-2 text-right text-xs font-semibold uppercase text-success-600">Cumulative Savings</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-limestone-100">
                  {projections.map((row) => (
                    <tr key={row.year} className="hover:bg-white/[0.04]">
                      <td className="py-1.5 text-white/60 tabular-nums">{row.year}</td>
                      <td className="py-1.5 text-right tabular-nums text-white/50">{fmt.format(row.currentWealth)}</td>
                      <td className="py-1.5 text-right tabular-nums font-medium text-teal-300">{fmt.format(row.proposedWealth)}</td>
                      <td className="py-1.5 text-right tabular-nums font-medium text-success-700">{fmt.format(row.difference)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
