'use client';

import React, { useState, useMemo } from 'react';
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

export interface CashFlowBarChartProps {
  data: Array<{
    year: number;
    clientAge: number;
    totalGrossIncome: number;
    totalExpenses: number;
    totalTax: number;
    netCashFlow: number;
    salaryIncome?: number;
    socialSecurityClientGross?: number;
    pensionIncome?: number;
    rmdIncome?: number;
    investmentIncome?: number;
  }>;
  /** When true, default X-axis shows client age instead of year */
  showByAge?: boolean;
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

// ---------------------------------------------------------------------------
// Custom Tooltip
// ---------------------------------------------------------------------------

interface TooltipPayloadEntry {
  name: string;
  value: number;
  color: string;
}

function CashFlowTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string | number;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border border-[rgba(255,255,255,0.06)] bg-white/[0.07] backdrop-blur-xl px-3 py-2 text-xs shadow-md">
      <p className="mb-1.5 font-semibold text-white">{label}</p>
      <table className="w-full">
        <tbody>
          {payload.map((entry) => (
            <tr key={entry.name}>
              <td className="pr-3 flex items-center gap-1.5 text-white/50">
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                {entry.name}
              </td>
              <td className="text-right tabular-nums font-medium text-white">
                {formatCurrency(entry.value)}
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

export function CashFlowBarChart({
  data,
  showByAge = false,
  className,
}: CashFlowBarChartProps) {
  const [byAge, setByAge] = useState(showByAge);

  const xDataKey = byAge ? 'clientAge' : 'year';
  const xLabel = byAge ? 'Age' : 'Year';

  // Check which optional income breakdowns exist
  const hasBreakdown = useMemo(() => {
    return {
      salary: data.some((d) => d.salaryIncome != null && d.salaryIncome > 0),
      socialSecurity: data.some(
        (d) => d.socialSecurityClientGross != null && d.socialSecurityClientGross > 0,
      ),
      pension: data.some((d) => d.pensionIncome != null && d.pensionIncome > 0),
      rmd: data.some((d) => d.rmdIncome != null && d.rmdIncome > 0),
      investment: data.some((d) => d.investmentIncome != null && d.investmentIncome > 0),
    };
  }, [data]);

  return (
    <div className={className}>
      {/* Toggle */}
      <div className="mb-3 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => setByAge(false)}
          className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
            !byAge
              ? 'bg-teal-500 text-white'
              : 'bg-white/[0.06] text-white/50 hover:bg-white/[0.06]'
          }`}
        >
          Show by Year
        </button>
        <button
          type="button"
          onClick={() => setByAge(true)}
          className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
            byAge
              ? 'bg-teal-500 text-white'
              : 'bg-white/[0.06] text-white/50 hover:bg-white/[0.06]'
          }`}
        >
          Show by Age
        </button>
      </div>

      <ResponsiveContainer width="100%" height={420}>
        <ComposedChart data={data} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />

          <XAxis
            dataKey={xDataKey}
            tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.40)' }}
            axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
            tickLine={false}
            label={{
              value: xLabel,
              position: 'insideBottom',
              offset: -2,
              fontSize: 11,
              fill: 'rgba(255,255,255,0.40)',
            }}
          />

          <YAxis
            tickFormatter={formatCompactAxis}
            tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.40)' }}
            axisLine={false}
            tickLine={false}
            width={65}
          />

          <Tooltip content={<CashFlowTooltip />} />
          <Legend
            verticalAlign="top"
            height={36}
            iconType="square"
            iconSize={10}
            wrapperStyle={{ fontSize: 11 }}
          />

          {/* Income bars -- use breakdown if available, otherwise total */}
          {hasBreakdown.salary && (
            <Bar
              dataKey="salaryIncome"
              name="Salary"
              stackId="income"
              fill="#1d7682"
              radius={[0, 0, 0, 0]}
              maxBarSize={24}
            />
          )}
          {hasBreakdown.socialSecurity && (
            <Bar
              dataKey="socialSecurityClientGross"
              name="Social Security"
              stackId="income"
              fill="#2a9aa8"
              maxBarSize={24}
            />
          )}
          {hasBreakdown.pension && (
            <Bar
              dataKey="pensionIncome"
              name="Pension"
              stackId="income"
              fill="#A3BFC9"
              maxBarSize={24}
            />
          )}
          {hasBreakdown.rmd && (
            <Bar
              dataKey="rmdIncome"
              name="RMD"
              stackId="income"
              fill="#C4D8DF"
              maxBarSize={24}
            />
          )}
          {hasBreakdown.investment && (
            <Bar
              dataKey="investmentIncome"
              name="Investment"
              stackId="income"
              fill="#DDE8EC"
              maxBarSize={24}
            />
          )}

          {/* If no breakdown fields are populated, show total income */}
          {!hasBreakdown.salary &&
            !hasBreakdown.socialSecurity &&
            !hasBreakdown.pension &&
            !hasBreakdown.rmd &&
            !hasBreakdown.investment && (
              <Bar
                dataKey="totalGrossIncome"
                name="Total Income"
                stackId="income"
                fill="#1d7682"
                radius={[4, 4, 0, 0]}
                maxBarSize={24}
              />
            )}

          {/* Expenses bar */}
          <Bar
            dataKey="totalExpenses"
            name="Expenses"
            stackId="outflow"
            fill="#E8A838"
            maxBarSize={24}
          />

          {/* Taxes bar */}
          <Bar
            dataKey="totalTax"
            name="Taxes"
            stackId="outflow"
            fill="#E07B54"
            radius={[4, 4, 0, 0]}
            maxBarSize={24}
          />

          {/* Net cash flow line */}
          <Line
            type="monotone"
            dataKey="netCashFlow"
            name="Net Cash Flow"
            stroke="#22c55e"
            strokeWidth={2}
            dot={{ r: 2, fill: '#22c55e' }}
            activeDot={{ r: 4 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

CashFlowBarChart.displayName = 'CashFlowBarChart';
