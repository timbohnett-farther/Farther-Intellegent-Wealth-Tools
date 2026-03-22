'use client';

import React, { useMemo } from 'react';
import { cn } from '@/lib/utils/cn';
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
import { Card } from '@/components/ui/Card';

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
    <div className="rounded-lg border border-[#E4DDD4] bg-white px-3 py-1.5 text-xs shadow-md">
      <p className="font-medium text-charcoal-900">{payload[0].payload.name}</p>
      <p className="tabular-nums text-charcoal-700">{formatCurrency(payload[0].value)}</p>
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
      { name: 'Assets', value: totalAssets, color: '#2E8B57' },
      { name: 'Liabilities', value: totalLiabilities, color: '#C0392B' },
      { name: 'Net Worth', value: Math.max(netWorth, 0), color: '#3B5A69' },
    ],
    [totalAssets, totalLiabilities, netWorth],
  );

  return (
    <Card className={cn('p-5', className)}>
      {/* Stacked numbers */}
      <div className="space-y-3">
        {/* Total Assets */}
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-charcoal-500">
            Total Assets
          </p>
          <p className="mt-0.5 text-lg font-bold tabular-nums text-success-500">
            {formatCurrency(totalAssets)}
          </p>
        </div>

        {/* Total Liabilities */}
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-charcoal-500">
            Total Liabilities
          </p>
          <p className="mt-0.5 text-lg font-bold tabular-nums text-critical-500">
            {formatCurrency(totalLiabilities)}
          </p>
        </div>

        {/* Divider */}
        <div className="border-t border-limestone-200" />

        {/* Net Worth */}
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-charcoal-500">
            Net Worth
          </p>
          <p
            className={cn(
              'mt-0.5 text-2xl font-bold tabular-nums',
              netWorth >= 0 ? 'text-charcoal-900' : 'text-critical-500',
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
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E4DDD4" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 10, fill: '#6B6B6B' }}
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
    </Card>
  );
}

NetWorthWidget.displayName = 'NetWorthWidget';
