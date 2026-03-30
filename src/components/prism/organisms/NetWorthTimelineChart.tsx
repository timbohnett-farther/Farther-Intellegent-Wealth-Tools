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
    { label: 'Total Assets', value: dataPoint.totalAssets, color: '#A8CED3' },
    { label: 'Total Liabilities', value: dataPoint.totalLiabilities, color: '#ef4444' },
    { label: 'Net Worth', value: dataPoint.netWorth, color: '#4E7082' },
  ];

  // Add portfolio breakdown if available
  if (dataPoint.taxablePortfolio != null) {
    rows.push({ label: 'Taxable', value: dataPoint.taxablePortfolio, color: 'rgba(255,255,255,0.40)' });
  }
  if (dataPoint.taxDeferredPortfolio != null) {
    rows.push({ label: 'Tax-Deferred', value: dataPoint.taxDeferredPortfolio, color: 'rgba(255,255,255,0.40)' });
  }
  if (dataPoint.taxFreePortfolio != null) {
    rows.push({ label: 'Tax-Free', value: dataPoint.taxFreePortfolio, color: 'rgba(255,255,255,0.40)' });
  }

  return (
    <div className="rounded-lg border border-[rgba(255,255,255,0.06)] bg-surface-soft backdrop-blur-xl px-3 py-2 text-xs shadow-md">
      <p className="mb-1.5 font-semibold text-text">
        Year {label} (Age {dataPoint.clientAge})
      </p>
      <table className="w-full">
        <tbody>
          {rows.map((row) => (
            <tr key={row.label}>
              <td className="pr-3 flex items-center gap-1.5 text-text-muted">
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ backgroundColor: row.color }}
                />
                {row.label}
              </td>
              <td className="text-right tabular-nums font-medium text-text">
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
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />

          <XAxis
            dataKey="year"
            tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.40)' }}
            axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
            tickLine={false}
          />

          <YAxis
            tickFormatter={formatMillions}
            tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.40)' }}
            axisLine={false}
            tickLine={false}
            domain={yDomain}
            width={65}
          />

          <Tooltip content={<TimelineTooltip />} />

          {/* Zero line when liabilities push chart below 0 */}
          {yDomain[0] < 0 && (
            <ReferenceLine y={0} stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
          )}

          {/* Total assets area */}
          <Area
            type="monotone"
            dataKey="totalAssets"
            name="Total Assets"
            stroke="#A8CED3"
            strokeWidth={1.5}
            fill="#A8CED3"
            fillOpacity={0.3}
            activeDot={false}
            isAnimationActive={false}
          />

          {/* Liabilities area (negative values) */}
          <Area
            type="monotone"
            dataKey="liabilitiesNeg"
            name="Total Liabilities"
            stroke="#ef4444"
            strokeWidth={1.5}
            fill="#ef4444"
            fillOpacity={0.3}
            activeDot={false}
            isAnimationActive={false}
          />

          {/* Net worth bold line */}
          <Area
            type="monotone"
            dataKey="netWorth"
            name="Net Worth"
            stroke="#4E7082"
            strokeWidth={2.5}
            fill="none"
            activeDot={{ r: 4, fill: '#4E7082' }}
            isAnimationActive={false}
          />

          {/* Retirement year reference line */}
          {retirementYear != null && (
            <ReferenceLine
              x={retirementYear}
              stroke="rgba(255,255,255,0.30)"
              strokeDasharray="6 4"
              label={{
                value: 'Retirement',
                position: 'top',
                fill: 'rgba(255,255,255,0.40)',
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
