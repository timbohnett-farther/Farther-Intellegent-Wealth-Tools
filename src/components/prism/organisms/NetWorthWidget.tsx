'use client';

import React, { useMemo } from 'react';
import clsx from 'clsx';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface NetWorthWidgetProps {
  /** Total asset value in dollars */
  totalAssets: number;
  /** Total liability value in dollars (positive number) */
  totalLiabilities: number;
  /** Additional CSS classes */
  className?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(value: number): string {
  const abs = Math.abs(value);
  const formatted = abs.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  return value < 0 ? `-${formatted}` : formatted;
}

function formatCompact(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
}

// ---------------------------------------------------------------------------
// Chart tooltip
// ---------------------------------------------------------------------------

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ value: number; payload: { name: string } }> }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md bg-gray-900 px-3 py-1.5 text-xs text-white shadow-md">
      <p className="font-medium">{payload[0].payload.name}</p>
      <p className="tabular-nums">{formatCurrency(payload[0].value)}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function NetWorthWidget({
  totalAssets,
  totalLiabilities,
  className,
}: NetWorthWidgetProps) {
  const netWorth = totalAssets - totalLiabilities;

  const chartData = useMemo(
    () => [
      { name: 'Assets', value: totalAssets, color: '#10B981' },
      { name: 'Liabilities', value: totalLiabilities, color: '#EF4444' },
      { name: 'Net Worth', value: Math.max(netWorth, 0), color: '#2563EB' },
    ],
    [totalAssets, totalLiabilities, netWorth],
  );

  return (
    <div
      className={clsx(
        'rounded-card border border-gray-200 bg-white p-5 shadow-sm',
        className,
      )}
    >
      {/* Stacked numbers */}
      <div className="space-y-3">
        {/* Total Assets */}
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Total Assets
          </p>
          <p className="mt-0.5 text-lg font-bold tabular-nums text-emerald-600">
            {formatCurrency(totalAssets)}
          </p>
        </div>

        {/* Total Liabilities */}
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Total Liabilities
          </p>
          <p className="mt-0.5 text-lg font-bold tabular-nums text-[#EF4444]">
            {formatCurrency(totalLiabilities)}
          </p>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-200" />

        {/* Net Worth */}
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Net Worth
          </p>
          <p
            className={clsx(
              'mt-0.5 text-2xl font-bold tabular-nums',
              netWorth >= 0 ? 'text-gray-900' : 'text-[#EF4444]',
            )}
          >
            {formatCurrency(netWorth)}
          </p>
        </div>
      </div>

      {/* Mini bar chart */}
      <div className="mt-5 h-32">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 10, fill: '#9CA3AF' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              hide
              domain={[0, 'auto']}
            />
            <RechartsTooltip
              content={<CustomTooltip />}
              cursor={{ fill: 'rgba(0,0,0,0.04)' }}
            />
            <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={40}>
              {chartData.map((entry, index) => (
                <Cell key={index} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

NetWorthWidget.displayName = 'NetWorthWidget';
