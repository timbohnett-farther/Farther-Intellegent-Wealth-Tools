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
    <div className="rounded-md border border-gray-200 bg-white px-3 py-2 text-xs shadow-lg">
      <p className="mb-1.5 font-semibold text-gray-900">Year {label}</p>
      <table className="w-full">
        <tbody>
          {rows.map((row) => (
            <tr key={row.label}>
              <td className="pr-3 text-gray-500">{row.label}</td>
              <td className="text-right tabular-nums font-medium text-gray-900">
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
          <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />

          <XAxis
            dataKey="year"
            tick={{ fontSize: 11, fill: '#6B7280' }}
            axisLine={{ stroke: '#E5E7EB' }}
            tickLine={false}
          />

          <YAxis
            tickFormatter={formatMillions}
            tick={{ fontSize: 11, fill: '#6B7280' }}
            axisLine={false}
            tickLine={false}
            domain={[0, yMax]}
            width={60}
          />

          <Tooltip content={<FanTooltip />} />

          {/* Band p5-p25: red zone */}
          <Area
            type="monotone"
            dataKey="p5"
            stackId="band"
            stroke="none"
            fill="transparent"
            activeDot={false}
          />
          <Area
            type="monotone"
            dataKey="p25"
            stackId="band-p5-p25"
            stroke="none"
            fill="#EF4444"
            fillOpacity={0.15}
            activeDot={false}
            // These use absolute values; we render overlapping areas
          />

          {/*
            Since Recharts stacked areas don't natively support "band" fills
            between arbitrary percentiles, we use overlapping areas with
            decreasing opacity layered bottom-to-top.
          */}

          {/* Bottom band: p5-p25 (red) */}
          <Area
            type="monotone"
            dataKey="p5"
            stroke="none"
            fill="#EF4444"
            fillOpacity={0.15}
            activeDot={false}
            isAnimationActive={false}
          />

          {/* Band p25-p50 (amber) — draws from 0 to p25 with amber, overlaps red below */}
          <Area
            type="monotone"
            dataKey="p25"
            stroke="none"
            fill="#F59E0B"
            fillOpacity={0.15}
            activeDot={false}
            isAnimationActive={false}
          />

          {/* Band p50-p75 (green) */}
          <Area
            type="monotone"
            dataKey="p75"
            stroke="none"
            fill="#10B981"
            fillOpacity={0.15}
            activeDot={false}
            isAnimationActive={false}
          />

          {/* Band p75-p95 (dark green) */}
          <Area
            type="monotone"
            dataKey="p95"
            stroke="none"
            fill="#047857"
            fillOpacity={0.15}
            activeDot={false}
            isAnimationActive={false}
          />

          {/* Median line */}
          <Area
            type="monotone"
            dataKey="p50"
            stroke="#10B981"
            strokeWidth={2}
            fill="none"
            activeDot={{ r: 4, fill: '#10B981' }}
            isAnimationActive={false}
          />

          {/* Retirement year reference line */}
          {retirementYear != null && (
            <ReferenceLine
              x={retirementYear}
              stroke="#9CA3AF"
              strokeDasharray="6 4"
              label={{
                value: 'Retirement',
                position: 'top',
                fill: '#6B7280',
                fontSize: 11,
              }}
            />
          )}

          {/* Goal amount reference line */}
          {goalAmount != null && (
            <ReferenceLine
              y={goalAmount}
              stroke="#2563EB"
              strokeDasharray="6 4"
              label={{
                value: `Goal ${formatMillions(goalAmount)}`,
                position: 'right',
                fill: '#2563EB',
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
