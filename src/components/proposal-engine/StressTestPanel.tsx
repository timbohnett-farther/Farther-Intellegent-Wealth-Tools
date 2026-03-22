'use client';

import React, { useMemo } from 'react';
import { cn } from '@/lib/utils/cn';
import { AlertTriangle, Clock, TrendingDown } from 'lucide-react';
import type { StressTestResult } from '@/lib/proposal-engine/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface StressTestPanelProps {
  /** Array of stress test results to display. */
  results: StressTestResult[];
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

export function StressTestPanel({ results }: StressTestPanelProps) {
  // Find the widest drawdown to scale the bars
  const maxAbsReturn = useMemo(() => {
    return Math.max(
      ...results.map((r) => Math.abs(r.portfolioReturn)),
      0.01,
    );
  }, [results]);

  if (results.length === 0) {
    return (
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.07] backdrop-blur-xl p-6 text-center shadow-sm">
        <TrendingDown className="mx-auto h-8 w-8 text-white/30 mb-2" />
        <p className="text-sm text-white/50">No stress test results available.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-white">
        Stress Test Scenarios ({results.length})
      </h3>

      {/* Table view */}
      <div className="overflow-x-auto rounded-lg border border-white/[0.06] shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b border-white/[0.06] bg-transparent">
            <tr>
              <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-white/50">
                Scenario
              </th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-white/50">
                Portfolio Return
              </th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-white/50">
                Benchmark
              </th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-white/50">
                Max Drawdown
              </th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-white/50">
                Recovery
              </th>
              <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-white/50 w-40">
                Return Visual
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-limestone-100 bg-white">
            {results.map((result) => {
              const barWidth = (Math.abs(result.portfolioReturn) / maxAbsReturn) * 100;

              return (
                <tr key={result.scenario} className="hover:bg-white/[0.04] transition-colors">
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
                              : 'text-white/30',
                        )}
                      />
                      <span className="font-medium text-white">
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

                  {/* Max Drawdown */}
                  <td className="px-4 py-3 text-right tabular-nums font-medium text-critical-700">
                    {fmtPct(result.maxDrawdown)}
                  </td>

                  {/* Recovery Months */}
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-1 text-white/50">
                      <Clock className="h-3 w-3" />
                      <span className="tabular-nums text-xs">
                        {result.recoveryMonths} mo
                      </span>
                    </div>
                  </td>

                  {/* Visual bar */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="relative h-4 flex-1 rounded-full bg-white/[0.06] overflow-hidden">
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
