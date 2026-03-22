'use client';

import React, { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MonteCarloFanChartProps {
  data: Array<{
    year: number;
    p5: number;
    p10: number;
    p25: number;
    p50: number;
    p75: number;
    p90: number;
    p95: number;
  }>;
  /** Year at which retirement begins (vertical dashed line) */
  retirementYear?: number;
  /** Dollar amount for the goal target (horizontal dashed line) */
  goalAmount?: number;
  /** Additional CSS classes */
  className?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(value: number): string {
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function formatMillions(value: number): string {
  return `$${(value / 1_000_000).toFixed(1)}M`;
}

// ---------------------------------------------------------------------------
// Custom Tooltip
// ---------------------------------------------------------------------------

interface TooltipPayloadEntry {
  dataKey: string;
  value: number;
  color: string;
}

function FanTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: number;
}) {
  if (!active || !payload?.length) return null;

  // Extract the raw data point from the first payload entry
  const dataPoint = (payload[0] as unknown as { payload: MonteCarloFanChartProps['data'][number] })
    .payload;

  const rows: Array<{ label: string; value: number }> = [
    { label: '95th', value: dataPoint.p95 },
    { label: '90th', value: dataPoint.p90 },
    { label: '75th', value: dataPoint.p75 },
    { label: '50th (Median)', value: dataPoint.p50 },
    { label: '25th', value: dataPoint.p25 },
    { label: '10th', value: dataPoint.p10 },
    { label: '5th', value: dataPoint.p5 },
  ];

  return (
    <div className="rounded-lg border border-[#E4DDD4] bg-white px-3 py-2 text-xs shadow-md">
      <p className="mb-1.5 font-semibold text-charcoal-900">Year {label}</p>
      <table className="w-full">
        <tbody>
          {rows.map((row) => (
            <tr key={row.label}>
              <td className="pr-3 text-charcoal-500">{row.label}</td>
              <td className="text-right tabular-nums font-medium text-charcoal-900">
                {formatCurrency(row.value)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MonteCarloFanChart({
  data,
  retirementYear,
  goalAmount,
  className,
}: MonteCarloFanChartProps) {
  // Compute Y-axis domain with some headroom
  const yMax = useMemo(() => {
    const maxValue = Math.max(...data.map((d) => d.p95));
    return Math.ceil(maxValue / 1_000_000) * 1_000_000;
  }, [data]);

  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={400}>
        <AreaChart data={data} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E4DDD4" />

          <XAxis
            dataKey="year"
            tick={{ fontSize: 11, fill: '#6B6B6B' }}
            axisLine={{ stroke: '#E4DDD4' }}
            tickLine={false}
          />

          <YAxis
            tickFormatter={formatMillions}
            tick={{ fontSize: 11, fill: '#6B6B6B' }}
            axisLine={false}
            tickLine={false}
            domain={[0, yMax]}
            width={60}
          />

          <Tooltip content={<FanTooltip />} />

          {/* P5-P95 outermost band */}
          <Area
            type="monotone"
            dataKey="p95"
            stroke="none"
            fill="rgba(59,90,105,0.08)"
            fillOpacity={1}
            activeDot={false}
            isAnimationActive={false}
          />
          <Area
            type="monotone"
            dataKey="p5"
            stroke="none"
            fill="rgba(59,90,105,0.08)"
            fillOpacity={1}
            activeDot={false}
            isAnimationActive={false}
          />

          {/* P10-P90 band */}
          <Area
            type="monotone"
            dataKey="p90"
            stroke="none"
            fill="rgba(59,90,105,0.15)"
            fillOpacity={1}
            activeDot={false}
            isAnimationActive={false}
          />
          <Area
            type="monotone"
            dataKey="p10"
            stroke="none"
            fill="rgba(59,90,105,0.15)"
            fillOpacity={1}
            activeDot={false}
            isAnimationActive={false}
          />

          {/* P25-P75 inner band */}
          <Area
            type="monotone"
            dataKey="p75"
            stroke="none"
            fill="rgba(59,90,105,0.30)"
            fillOpacity={1}
            activeDot={false}
            isAnimationActive={false}
          />
          <Area
            type="monotone"
            dataKey="p25"
            stroke="none"
            fill="rgba(59,90,105,0.30)"
            fillOpacity={1}
            activeDot={false}
            isAnimationActive={false}
          />

          {/* P50 median line */}
          <Area
            type="monotone"
            dataKey="p50"
            stroke="#3B5A69"
            strokeWidth={2.5}
            fill="none"
            activeDot={{ r: 4, fill: '#3B5A69' }}
            isAnimationActive={false}
          />

          {/* Retirement year reference line */}
          {retirementYear != null && (
            <ReferenceLine
              x={retirementYear}
              stroke="#9E9E9E"
              strokeDasharray="6 4"
              label={{
                value: 'Retirement',
                position: 'top',
                fill: '#6B6B6B',
                fontSize: 11,
              }}
            />
          )}

          {/* Goal amount reference line */}
          {goalAmount != null && (
            <ReferenceLine
              y={goalAmount}
              stroke="#E8A838"
              strokeDasharray="6 4"
              label={{
                value: `Goal ${formatMillions(goalAmount)}`,
                position: 'right',
                fill: '#E8A838',
                fontSize: 11,
              }}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

MonteCarloFanChart.displayName = 'MonteCarloFanChart';
