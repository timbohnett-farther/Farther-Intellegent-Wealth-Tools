'use client';

import React from 'react';
import { cn } from '@/lib/utils/cn';
import { DollarSign, TrendingUp, ArrowDown } from 'lucide-react';
import type { FeeAnalysis, FeeBreakdown, MoneyCents } from '@/lib/proposal-engine/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FeeComparisonChartProps {
  /** Fee analysis data with current vs proposed breakdowns. */
  analysis: FeeAnalysis;
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

function fmtMoney2(cents: MoneyCents): string {
  const dollars = (cents as number) / 100;
  const isNeg = dollars < 0;
  const formatted = Math.abs(dollars).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return isNeg ? `-$${formatted}` : `$${formatted}`;
}

function fmtPct(decimal: number): string {
  return `${(decimal * 100).toFixed(2)}%`;
}

function fmtBps(decimal: number): string {
  return `${(decimal * 10000).toFixed(0)} bps`;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function FeeBreakdownCard({
  breakdown,
  label,
  variant,
}: {
  breakdown: FeeBreakdown;
  label: string;
  variant: 'current' | 'proposed';
}) {
  const rows = [
    { label: 'Fund Expenses', rate: breakdown.fundExpenseRatio, dollars: breakdown.fundExpenseDollars },
    { label: 'Advisory Fee', rate: breakdown.advisoryFeeRate, dollars: breakdown.advisoryFeeDollars },
    { label: 'Transaction Costs', rate: breakdown.transactionCostRate, dollars: breakdown.transactionCostDollars },
  ];

  return (
    <div
      className={cn(
        'rounded-lg border p-5 shadow-sm',
        variant === 'proposed'
          ? 'border-brand-200 bg-brand-700/5'
          : 'border-limestone-200 bg-white',
      )}
    >
      <h4
        className={cn(
          'text-sm font-semibold mb-4',
          variant === 'proposed' ? 'text-brand-700' : 'text-charcoal-900',
        )}
      >
        {label}
      </h4>

      <div className="space-y-3">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between">
            <div>
              <span className="text-xs text-charcoal-600">{row.label}</span>
              <span className="ml-1.5 text-[10px] text-charcoal-400">
                ({fmtPct(row.rate)})
              </span>
            </div>
            <span className="text-sm font-medium tabular-nums text-charcoal-900">
              {fmtMoney(row.dollars)}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-4 border-t border-limestone-200 pt-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wide text-charcoal-500">
            Total All-In
          </span>
          <div className="text-right">
            <p className="text-lg font-bold tabular-nums text-charcoal-900">
              {fmtPct(breakdown.totalRate)}
            </p>
            <p className="text-xs tabular-nums text-charcoal-500">
              {fmtMoney(breakdown.totalDollars)}/yr
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function FeeComparisonChart({ analysis }: FeeComparisonChartProps) {
  // Fee rate visual bar comparison
  const maxRate = Math.max(analysis.current.totalRate, analysis.proposed.totalRate, 0.001);

  return (
    <div className="space-y-6">
      {/* Annual savings banner */}
      <div className="rounded-xl border border-success-200 bg-success-50 p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-success-100">
            <DollarSign className="h-5 w-5 text-success-700" />
          </div>
          <div>
            <span className="text-xs font-medium uppercase tracking-wide text-success-600">
              Estimated Annual Savings
            </span>
            <p className="text-2xl font-bold tabular-nums text-success-700">
              {fmtMoney2(analysis.annualSavings)}
            </p>
          </div>
        </div>
      </div>

      {/* Side-by-side fee breakdown cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FeeBreakdownCard
          breakdown={analysis.current}
          label="Current Fees"
          variant="current"
        />
        <FeeBreakdownCard
          breakdown={analysis.proposed}
          label="Proposed Fees"
          variant="proposed"
        />
      </div>

      {/* Fee rate visual bar */}
      <div className="rounded-lg border border-limestone-200 bg-white p-5 shadow-sm">
        <h4 className="text-sm font-semibold text-charcoal-900 mb-4">
          Fee Rate Comparison
        </h4>
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-charcoal-600">Current</span>
              <span className="text-xs font-semibold tabular-nums text-charcoal-700">
                {fmtPct(analysis.current.totalRate)} ({fmtBps(analysis.current.totalRate)})
              </span>
            </div>
            <div className="h-6 w-full rounded-md bg-limestone-100 overflow-hidden">
              <div
                className="h-full rounded-md bg-charcoal-400 transition-all duration-500"
                style={{
                  width: `${(analysis.current.totalRate / maxRate) * 100}%`,
                }}
              />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-charcoal-600">Proposed</span>
              <span className="text-xs font-semibold tabular-nums text-brand-700">
                {fmtPct(analysis.proposed.totalRate)} ({fmtBps(analysis.proposed.totalRate)})
              </span>
            </div>
            <div className="h-6 w-full rounded-md bg-limestone-100 overflow-hidden">
              <div
                className="h-full rounded-md bg-brand-700 transition-all duration-500"
                style={{
                  width: `${(analysis.proposed.totalRate / maxRate) * 100}%`,
                }}
              />
            </div>
          </div>
          {analysis.current.totalRate > analysis.proposed.totalRate && (
            <div className="flex items-center gap-1.5 text-xs text-success-600 font-medium">
              <ArrowDown className="h-3 w-3" />
              <span>
                {fmtBps(analysis.current.totalRate - analysis.proposed.totalRate)} lower
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Compounding impact table */}
      <div className="rounded-lg border border-limestone-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-4 w-4 text-brand-700" />
          <h4 className="text-sm font-semibold text-charcoal-900">
            Compounding Impact of Lower Fees
          </h4>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-limestone-200">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-charcoal-500">
                  Year
                </th>
                <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-charcoal-500">
                  Current Wealth
                </th>
                <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-charcoal-500">
                  Proposed Wealth
                </th>
                <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-charcoal-500">
                  Benefit
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-limestone-100">
              {analysis.compoundingImpact.map((row) => (
                <tr key={row.years} className="hover:bg-limestone-50 transition-colors">
                  <td className="px-3 py-2.5 font-medium text-charcoal-900">
                    {row.years} yr{row.years !== 1 ? 's' : ''}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-charcoal-700">
                    {fmtMoney(row.currentWealth)}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-charcoal-700">
                    {fmtMoney(row.proposedWealth)}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-success-700">
                    +{fmtMoney(row.difference)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

FeeComparisonChart.displayName = 'FeeComparisonChart';
