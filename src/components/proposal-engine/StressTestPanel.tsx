'use client';

import React, { useMemo } from 'react';
import { cn } from '@/lib/utils/cn';
import { AlertTriangle, Clock, TrendingDown } from 'lucide-react';
import type { StressTestResult } from '@/lib/proposal-engine/types';
import type { EnhancedStressResult } from '@/lib/proposal-engine/analytics/stress-testing';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface StressTestPanelProps {
  /** Array of stress test results to display. */
  results: StressTestResult[];
  /** Optional enhanced stress test result with VaR/CVaR metrics. */
  enhancedResult?: EnhancedStressResult | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmtPct(decimal: number, decimals = 1): string {
  const value = decimal * 100;
  const prefix = value >= 0 ? '+' : '';
  return `${prefix}${value.toFixed(decimals)}%`;
}

function getReturnColor(decimal: number): string {
  if (decimal >= 0) return 'text-success-700';
  if (decimal >= -0.1) return 'text-warning-700';
  return 'text-critical-700';
}

function getReturnBgColor(decimal: number): string {
  if (decimal >= 0) return 'bg-success-500';
  if (decimal >= -0.1) return 'bg-warning-500';
  return 'bg-critical-500';
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function StressTestPanel({ results, enhancedResult }: StressTestPanelProps) {
  // Use enhanced results if available, otherwise fall back to basic results
  const displayResults = useMemo(() => {
    return enhancedResult?.results ?? results;
  }, [enhancedResult, results]);

  // Find the widest drawdown to scale the bars
  const maxAbsReturn = useMemo(() => {
    return Math.max(
      ...displayResults.map((r) => Math.abs(r.portfolioReturn)),
      0.01,
    );
  }, [displayResults]);

  // Identify worst-case scenario
  const worstCaseScenario = useMemo(() => {
    return enhancedResult?.worstCase?.scenario ?? null;
  }, [enhancedResult]);

  if (displayResults.length === 0) {
    return (
      <div className="rounded-2xl border border-border-subtle bg-surface-soft backdrop-blur-xl p-6 text-center shadow-sm">
        <TrendingDown className="mx-auto h-8 w-8 text-text-faint mb-2" />
        <p className="text-sm text-text-muted">No stress test results available.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-text">
        Stress Test Scenarios ({displayResults.length})
      </h3>

      {/* VaR/CVaR Summary Cards (only when enhanced result is provided) */}
      {enhancedResult && (
        <div className="grid grid-cols-4 gap-3 mb-4">
          <div className="rounded-xl border border-border-subtle bg-surface-soft p-3 text-center">
            <div className="text-lg font-bold tabular-nums text-critical-700">{fmtPct(enhancedResult.portfolioVaR95)}</div>
            <div className="text-[10px] text-text-muted mt-0.5">VaR (95%)</div>
          </div>
          <div className="rounded-xl border border-border-subtle bg-surface-soft p-3 text-center">
            <div className="text-lg font-bold tabular-nums text-critical-700">{fmtPct(enhancedResult.portfolioCVaR95)}</div>
            <div className="text-[10px] text-text-muted mt-0.5">CVaR (95%)</div>
          </div>
          <div className="rounded-xl border border-border-subtle bg-surface-soft p-3 text-center">
            <div className="text-lg font-bold tabular-nums text-text">{fmtPct(enhancedResult.averageLoss)}</div>
            <div className="text-[10px] text-text-muted mt-0.5">Avg Loss</div>
          </div>
          <div className="rounded-xl border border-border-subtle bg-surface-soft p-3 text-center">
            <div className="text-lg font-bold tabular-nums text-critical-700">{fmtPct(enhancedResult.maxDrawdown)}</div>
            <div className="text-[10px] text-text-muted mt-0.5">Max Drawdown</div>
          </div>
        </div>
      )}

      {/* Table view */}
      <div className="overflow-x-auto rounded-lg border border-border-subtle shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b border-border-subtle bg-transparent">
            <tr>
              <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-text-muted">
                Scenario
              </th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-text-muted">
                Portfolio Return
              </th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-text-muted">
                Benchmark
              </th>
              {enhancedResult && (
                <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-text-muted">
                  Dollar Impact
                </th>
              )}
              <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-text-muted">
                Max Drawdown
              </th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-text-muted">
                Recovery
              </th>
              <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-text-muted w-40">
                Return Visual
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-limestone-100 bg-text">
            {displayResults.map((result) => {
              const barWidth = (Math.abs(result.portfolioReturn) / maxAbsReturn) * 100;
              const isWorstCase = worstCaseScenario === result.scenario;
              const enhancedRow = enhancedResult?.results.find((r) => r.scenario === result.scenario);

              return (
                <tr
                  key={result.scenario}
                  className={cn(
                    'hover:bg-surface-subtle transition-colors',
                    isWorstCase && 'bg-critical-500/5'
                  )}
                >
                  {/* Scenario */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <AlertTriangle
                        className={cn(
                          'h-3.5 w-3.5 shrink-0',
                          result.portfolioReturn < -0.2
                            ? 'text-critical-500'
                            : result.portfolioReturn < -0.1
                              ? 'text-warning-500'
                              : 'text-text-faint',
                        )}
                      />
                      <span className="font-medium text-text">
                        {result.scenarioLabel}
                      </span>
                    </div>
                  </td>

                  {/* Portfolio Return */}
                  <td
                    className={cn(
                      'px-4 py-3 text-right tabular-nums font-semibold',
                      getReturnColor(result.portfolioReturn),
                    )}
                  >
                    {fmtPct(result.portfolioReturn)}
                  </td>

                  {/* Benchmark Return */}
                  <td
                    className={cn(
                      'px-4 py-3 text-right tabular-nums',
                      getReturnColor(result.benchmarkReturn),
                    )}
                  >
                    {fmtPct(result.benchmarkReturn)}
                  </td>

                  {/* Dollar Impact (only when enhanced data available) */}
                  {enhancedResult && (
                    <td
                      className={cn(
                        'px-4 py-3 text-right tabular-nums font-medium',
                        enhancedRow && enhancedRow.dollarImpact >= 0 ? 'text-success-700' : 'text-critical-700'
                      )}
                    >
                      {enhancedRow
                        ? `${enhancedRow.dollarImpact >= 0 ? '+' : ''}$${(Math.abs(enhancedRow.dollarImpact) / 100).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
                        : '—'}
                    </td>
                  )}

                  {/* Max Drawdown */}
                  <td className="px-4 py-3 text-right tabular-nums font-medium text-critical-700">
                    {fmtPct(result.maxDrawdown)}
                  </td>

                  {/* Recovery Months */}
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-1 text-text-muted">
                      <Clock className="h-3 w-3" />
                      <span className="tabular-nums text-xs">
                        {result.recoveryMonths} mo
                      </span>
                    </div>
                  </td>

                  {/* Visual bar */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="relative h-4 flex-1 rounded-full bg-surface-subtle overflow-hidden">
                        <div
                          className={cn(
                            'absolute top-0 h-full rounded-full transition-all duration-500',
                            getReturnBgColor(result.portfolioReturn),
                          )}
                          style={{
                            width: `${Math.min(barWidth, 100)}%`,
                            [result.portfolioReturn >= 0 ? 'left' : 'right']: '0',
                          }}
                        />
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

StressTestPanel.displayName = 'StressTestPanel';
