'use client';

import React, { useMemo } from 'react';
import { cn } from '@/lib/utils/cn';
import { TrendingUp, TrendingDown, Target } from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import type { MonteCarloResult } from '@/lib/proposal-engine/analytics/monte-carlo-bridge';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MonteCarloFanChartProps {
  result: MonteCarloResult;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatValue(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M`;
  }
  if (abs >= 1_000) {
    return `$${(value / 1_000).toFixed(0)}K`;
  }
  return `$${Math.round(value).toLocaleString()}`;
}

function fmtPct(decimal: number, decimals = 1): string {
  return `${(decimal * 100).toFixed(decimals)}%`;
}

// ---------------------------------------------------------------------------
// Custom Tooltip
// ---------------------------------------------------------------------------

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="rounded-lg border border-border-subtle bg-surface-soft backdrop-blur-xl px-3 py-2 shadow-lg">
      <p className="text-xs text-text-muted mb-1">Year {label}</p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center justify-between gap-3">
          <span className="text-xs text-text-muted">{entry.name}:</span>
          <span className="text-xs font-semibold text-text">{formatValue(entry.value)}</span>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MonteCarloFanChart({ result }: MonteCarloFanChartProps) {
  // Transform percentile arrays into chart data
  const chartData = useMemo(() => {
    return Array.from({ length: result.timeHorizon + 1 }, (_, i) => ({
      year: i,
      p5: result.percentiles.p5[i],
      p25: result.percentiles.p25[i],
      p50: result.percentiles.p50[i],
      p75: result.percentiles.p75[i],
      p95: result.percentiles.p95[i],
    }));
  }, [result]);

  const yAxisMax = useMemo(() => {
    const max = Math.max(...result.percentiles.p95);
    return Math.ceil(max * 1.1); // 10% padding
  }, [result.percentiles.p95]);

  return (
    <div className="space-y-4">
      {/* Chart */}
      <div className="rounded-lg border border-border-subtle bg-surface-soft p-4">
        <h3 className="text-sm font-semibold text-text mb-4">
          {result.paths.toLocaleString()} Simulation Paths ({result.timeHorizon} Years)
        </h3>

        <ResponsiveContainer width="100%" height={320}>
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
            <defs>
              {/* Gradient for p25-p75 band (darker) */}
              <linearGradient id="gradientMid" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="rgb(var(--accent-primary))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="rgb(var(--accent-primary))" stopOpacity={0.1} />
              </linearGradient>
              {/* Gradient for p5-p95 band (lighter) */}
              <linearGradient id="gradientOuter" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="rgb(var(--accent-primary))" stopOpacity={0.15} />
                <stop offset="95%" stopColor="rgb(var(--accent-primary))" stopOpacity={0.05} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--border-subtle))" opacity={0.5} />

            <XAxis
              dataKey="year"
              stroke="rgb(var(--text-muted))"
              tick={{ fill: 'rgb(var(--text-muted))', fontSize: 12 }}
              label={{ value: 'Years', position: 'insideBottom', offset: -5, fill: 'rgb(var(--text-muted))' }}
            />

            <YAxis
              stroke="rgb(var(--text-muted))"
              tick={{ fill: 'rgb(var(--text-muted))', fontSize: 12 }}
              tickFormatter={(value) => formatValue(value)}
              domain={[0, yAxisMax]}
            />

            <Tooltip content={<CustomTooltip />} />

            {/* Outer band: p5-p95 */}
            <Area
              type="monotone"
              dataKey="p95"
              stroke="none"
              fill="url(#gradientOuter)"
              fillOpacity={1}
            />
            <Area
              type="monotone"
              dataKey="p5"
              stroke="none"
              fill="rgb(var(--surface-soft))"
              fillOpacity={1}
            />

            {/* Mid band: p25-p75 */}
            <Area
              type="monotone"
              dataKey="p75"
              stroke="none"
              fill="url(#gradientMid)"
              fillOpacity={1}
            />
            <Area
              type="monotone"
              dataKey="p25"
              stroke="none"
              fill="rgb(var(--surface-soft))"
              fillOpacity={1}
            />

            {/* Median line (p50) */}
            <Area
              type="monotone"
              dataKey="p50"
              stroke="rgb(var(--accent-primary))"
              strokeWidth={2}
              fill="none"
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Terminal Statistics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-xl border border-border-subtle bg-surface-soft p-3">
          <div className="flex items-center gap-2 mb-1">
            <Target className="h-3.5 w-3.5 text-text-muted" />
            <span className="text-xs text-text-muted">Mean</span>
          </div>
          <div className="text-lg font-bold tabular-nums text-text">{formatValue(result.terminalValues.mean)}</div>
        </div>

        <div className="rounded-xl border border-border-subtle bg-surface-soft p-3">
          <div className="flex items-center gap-2 mb-1">
            <Target className="h-3.5 w-3.5 text-text-muted" />
            <span className="text-xs text-text-muted">Median</span>
          </div>
          <div className="text-lg font-bold tabular-nums text-text">{formatValue(result.terminalValues.median)}</div>
        </div>

        <div className="rounded-xl border border-critical-500/20 bg-critical-500/5 p-3">
          <div className="flex items-center gap-2 mb-1">
            <TrendingDown className="h-3.5 w-3.5 text-critical-700" />
            <span className="text-xs text-critical-700">5th %ile</span>
          </div>
          <div className="text-lg font-bold tabular-nums text-critical-700">{formatValue(result.terminalValues.p5)}</div>
        </div>

        <div className="rounded-xl border border-success-500/20 bg-success-500/5 p-3">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="h-3.5 w-3.5 text-success-700" />
            <span className="text-xs text-success-700">95th %ile</span>
          </div>
          <div className="text-lg font-bold tabular-nums text-success-700">{formatValue(result.terminalValues.p95)}</div>
        </div>
      </div>

      {/* Probability Badges */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-border-subtle bg-surface-soft p-3 text-center">
          <div className={cn(
            'text-2xl font-bold tabular-nums',
            result.probabilityOfSuccess >= 0.8 ? 'text-success-700' : result.probabilityOfSuccess >= 0.6 ? 'text-warning-700' : 'text-critical-700'
          )}>
            {fmtPct(result.probabilityOfSuccess, 0)}
          </div>
          <div className="text-xs text-text-muted mt-1">Success Rate</div>
        </div>

        <div className="rounded-lg border border-border-subtle bg-surface-soft p-3 text-center">
          <div className={cn(
            'text-2xl font-bold tabular-nums',
            result.probabilityOfLoss < 0.2 ? 'text-success-700' : result.probabilityOfLoss < 0.4 ? 'text-warning-700' : 'text-critical-700'
          )}>
            {fmtPct(result.probabilityOfLoss, 0)}
          </div>
          <div className="text-xs text-text-muted mt-1">Loss Risk</div>
        </div>

        <div className="rounded-lg border border-border-subtle bg-surface-soft p-3 text-center">
          <div className="text-2xl font-bold tabular-nums text-accent-primarySoft">
            {fmtPct(result.probabilityOfDoubling, 0)}
          </div>
          <div className="text-xs text-text-muted mt-1">Doubling Chance</div>
        </div>
      </div>
    </div>
  );
}

MonteCarloFanChart.displayName = 'MonteCarloFanChart';
