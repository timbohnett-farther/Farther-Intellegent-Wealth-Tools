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

export interface NetWorthTimelineChartProps {
  data: Array<{
    year: number;
    clientAge: number;
    totalAssets: number;
    totalLiabilities: number;
    netWorth: number;
    taxablePortfolio?: number;
    taxDeferredPortfolio?: number;
    taxFreePortfolio?: number;
  }>;
  /** Year at which retirement begins (vertical dashed line) */
  retirementYear?: number;
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

function TimelineTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: number;
}) {
  if (!active || !payload?.length) return null;

  const dataPoint = (
    payload[0] as unknown as { payload: NetWorthTimelineChartProps['data'][number] }
  ).payload;

  const rows: Array<{ label: string; value: number; color: string }> = [
    { label: 'Total Assets', value: dataPoint.totalAssets, color: '#6189A0' },
    { label: 'Total Liabilities', value: dataPoint.totalLiabilities, color: '#C0392B' },
    { label: 'Net Worth', value: dataPoint.netWorth, color: '#3B5A69' },
  ];

  // Add portfolio breakdown if available
  if (dataPoint.taxablePortfolio != null) {
    rows.push({ label: 'Taxable', value: dataPoint.taxablePortfolio, color: '#6B6B6B' });
  }
  if (dataPoint.taxDeferredPortfolio != null) {
    rows.push({ label: 'Tax-Deferred', value: dataPoint.taxDeferredPortfolio, color: '#6B6B6B' });
  }
  if (dataPoint.taxFreePortfolio != null) {
    rows.push({ label: 'Tax-Free', value: dataPoint.taxFreePortfolio, color: '#6B6B6B' });
  }

  return (
    <div className="rounded-lg border border-[#E4DDD4] bg-white px-3 py-2 text-xs shadow-md">
      <p className="mb-1.5 font-semibold text-charcoal-900">
        Year {label} (Age {dataPoint.clientAge})
      </p>
      <table className="w-full">
        <tbody>
          {rows.map((row) => (
            <tr key={row.label}>
              <td className="pr-3 flex items-center gap-1.5 text-charcoal-500">
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ backgroundColor: row.color }}
                />
                {row.label}
              </td>
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

export function NetWorthTimelineChart({
  data,
  retirementYear,
  className,
}: NetWorthTimelineChartProps) {
  // Compute Y-axis domain with headroom
  const yDomain = useMemo(() => {
    const maxAsset = Math.max(...data.map((d) => d.totalAssets));
    const minLiability = Math.min(...data.map((d) => -d.totalLiabilities));
    const yMax = Math.ceil(maxAsset / 1_000_000) * 1_000_000;
    const yMin = minLiability < 0 ? Math.floor(minLiability / 1_000_000) * 1_000_000 : 0;
    return [yMin, yMax] as [number, number];
  }, [data]);

  // Prepare chart data with negative liabilities for display
  const chartData = useMemo(
    () =>
      data.map((d) => ({
        ...d,
        liabilitiesNeg: -d.totalLiabilities,
      })),
    [data],
  );

  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={420}>
        <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
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
            domain={yDomain}
            width={65}
          />

          <Tooltip content={<TimelineTooltip />} />

          {/* Zero line when liabilities push chart below 0 */}
          {yDomain[0] < 0 && (
            <ReferenceLine y={0} stroke="#E4DDD4" strokeWidth={1} />
          )}

          {/* Total assets area */}
          <Area
            type="monotone"
            dataKey="totalAssets"
            name="Total Assets"
            stroke="#6189A0"
            strokeWidth={1.5}
            fill="#6189A0"
            fillOpacity={0.3}
            activeDot={false}
            isAnimationActive={false}
          />

          {/* Liabilities area (negative values) */}
          <Area
            type="monotone"
            dataKey="liabilitiesNeg"
            name="Total Liabilities"
            stroke="#C0392B"
            strokeWidth={1.5}
            fill="#C0392B"
            fillOpacity={0.3}
            activeDot={false}
            isAnimationActive={false}
          />

          {/* Net worth bold line */}
          <Area
            type="monotone"
            dataKey="netWorth"
            name="Net Worth"
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
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

NetWorthTimelineChart.displayName = 'NetWorthTimelineChart';
