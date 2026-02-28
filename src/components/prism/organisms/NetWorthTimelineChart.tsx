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
    { label: 'Total Assets', value: dataPoint.totalAssets, color: '#3B82F6' },
    { label: 'Total Liabilities', value: dataPoint.totalLiabilities, color: '#EF4444' },
    { label: 'Net Worth', value: dataPoint.netWorth, color: '#1E3A5F' },
  ];

  // Add portfolio breakdown if available
  if (dataPoint.taxablePortfolio != null) {
    rows.push({ label: 'Taxable', value: dataPoint.taxablePortfolio, color: '#6B7280' });
  }
  if (dataPoint.taxDeferredPortfolio != null) {
    rows.push({ label: 'Tax-Deferred', value: dataPoint.taxDeferredPortfolio, color: '#6B7280' });
  }
  if (dataPoint.taxFreePortfolio != null) {
    rows.push({ label: 'Tax-Free', value: dataPoint.taxFreePortfolio, color: '#6B7280' });
  }

  return (
    <div className="rounded-md border border-gray-200 bg-white px-3 py-2 text-xs shadow-lg">
      <p className="mb-1.5 font-semibold text-gray-900">
        Year {label} (Age {dataPoint.clientAge})
      </p>
      <table className="w-full">
        <tbody>
          {rows.map((row) => (
            <tr key={row.label}>
              <td className="pr-3 flex items-center gap-1.5 text-gray-600">
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ backgroundColor: row.color }}
                />
                {row.label}
              </td>
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
            domain={yDomain}
            width={65}
          />

          <Tooltip content={<TimelineTooltip />} />

          {/* Zero line when liabilities push chart below 0 */}
          {yDomain[0] < 0 && (
            <ReferenceLine y={0} stroke="#D1D5DB" strokeWidth={1} />
          )}

          {/* Total assets area */}
          <Area
            type="monotone"
            dataKey="totalAssets"
            name="Total Assets"
            stroke="#3B82F6"
            strokeWidth={1.5}
            fill="#3B82F6"
            fillOpacity={0.3}
            activeDot={false}
            isAnimationActive={false}
          />

          {/* Liabilities area (negative values) */}
          <Area
            type="monotone"
            dataKey="liabilitiesNeg"
            name="Total Liabilities"
            stroke="#EF4444"
            strokeWidth={1.5}
            fill="#EF4444"
            fillOpacity={0.3}
            activeDot={false}
            isAnimationActive={false}
          />

          {/* Net worth bold line */}
          <Area
            type="monotone"
            dataKey="netWorth"
            name="Net Worth"
            stroke="#1E3A5F"
            strokeWidth={2.5}
            fill="none"
            activeDot={{ r: 4, fill: '#1E3A5F' }}
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
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

NetWorthTimelineChart.displayName = 'NetWorthTimelineChart';
