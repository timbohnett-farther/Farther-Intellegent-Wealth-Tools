'use client';

import React, { useMemo } from 'react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TaxProjectionChartProps {
  data: Array<{
    year: number;
    clientAge: number;
    federalTax: number;
    stateTax: number;
    seTax: number;
    niit: number;
    effectiveFedRate: number;
    marginalRate?: number;
  }>;
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

function formatCompactAxis(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

// ---------------------------------------------------------------------------
// Custom Tooltip
// ---------------------------------------------------------------------------

interface TooltipPayloadEntry {
  name: string;
  value: number;
  color: string;
  dataKey: string;
}

function TaxTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: number;
}) {
  if (!active || !payload?.length) return null;

  // Separate bar entries from line entries
  const barEntries = payload.filter(
    (e) => e.dataKey !== 'effectiveFedRate' && e.dataKey !== 'marginalRate',
  );
  const rateEntries = payload.filter(
    (e) => e.dataKey === 'effectiveFedRate' || e.dataKey === 'marginalRate',
  );

  return (
    <div className="rounded-md border border-gray-200 bg-white px-3 py-2 text-xs shadow-lg">
      <p className="mb-1.5 font-semibold text-gray-900">Year {label}</p>
      <table className="w-full">
        <tbody>
          {barEntries.map((entry) => (
            <tr key={entry.name}>
              <td className="pr-3 flex items-center gap-1.5 text-gray-600">
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                {entry.name}
              </td>
              <td className="text-right tabular-nums font-medium text-gray-900">
                {formatCurrency(entry.value)}
              </td>
            </tr>
          ))}
          {rateEntries.map((entry) => (
            <tr key={entry.name}>
              <td className="pr-3 flex items-center gap-1.5 text-gray-600">
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                {entry.name}
              </td>
              <td className="text-right tabular-nums font-medium text-gray-900">
                {formatPercent(entry.value)}
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

export function TaxProjectionChart({
  data,
  className,
}: TaxProjectionChartProps) {
  // Determine whether marginal rate data is present
  const hasMarginalRate = useMemo(
    () => data.some((d) => d.marginalRate != null),
    [data],
  );

  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={420}>
        <ComposedChart data={data} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />

          <XAxis
            dataKey="year"
            tick={{ fontSize: 11, fill: '#6B7280' }}
            axisLine={{ stroke: '#E5E7EB' }}
            tickLine={false}
          />

          {/* Primary Y-axis: dollar amounts */}
          <YAxis
            yAxisId="dollars"
            tickFormatter={formatCompactAxis}
            tick={{ fontSize: 11, fill: '#6B7280' }}
            axisLine={false}
            tickLine={false}
            width={65}
          />

          {/* Secondary Y-axis: rates (%) */}
          <YAxis
            yAxisId="rate"
            orientation="right"
            tickFormatter={(v: number) => `${v}%`}
            tick={{ fontSize: 11, fill: '#6B7280' }}
            axisLine={false}
            tickLine={false}
            domain={[0, 'auto']}
            width={45}
          />

          <Tooltip content={<TaxTooltip />} />
          <Legend
            verticalAlign="top"
            height={36}
            iconType="square"
            iconSize={10}
            wrapperStyle={{ fontSize: 11 }}
          />

          {/* Stacked tax bars */}
          <Bar
            yAxisId="dollars"
            dataKey="federalTax"
            name="Federal Tax"
            stackId="tax"
            fill="#2563EB"
            maxBarSize={24}
          />
          <Bar
            yAxisId="dollars"
            dataKey="stateTax"
            name="State Tax"
            stackId="tax"
            fill="#7C3AED"
            maxBarSize={24}
          />
          <Bar
            yAxisId="dollars"
            dataKey="seTax"
            name="SE Tax"
            stackId="tax"
            fill="#0D9488"
            maxBarSize={24}
          />
          <Bar
            yAxisId="dollars"
            dataKey="niit"
            name="NIIT"
            stackId="tax"
            fill="#F59E0B"
            radius={[2, 2, 0, 0]}
            maxBarSize={24}
          />

          {/* Effective rate line on secondary axis */}
          <Line
            yAxisId="rate"
            type="monotone"
            dataKey="effectiveFedRate"
            name="Effective Rate"
            stroke="#EF4444"
            strokeWidth={2}
            dot={{ r: 2, fill: '#EF4444' }}
            activeDot={{ r: 4 }}
          />

          {/* Marginal rate line (if data present) */}
          {hasMarginalRate && (
            <Line
              yAxisId="rate"
              type="monotone"
              dataKey="marginalRate"
              name="Marginal Rate"
              stroke="#9CA3AF"
              strokeWidth={1.5}
              strokeDasharray="4 3"
              dot={false}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

TaxProjectionChart.displayName = 'TaxProjectionChart';
