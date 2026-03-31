'use client';

import React from 'react';
import { TalsColumnResult } from '@/lib/tals/types';
import { formatCurrency } from '@/lib/format';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

interface Props {
  columns: TalsColumnResult[];
  portfolioValue: number;
}

const COLORS = ['#4E7082', '#8B5CF6', '#F97316', '#10B981'];

export default function TalsWealthProjectionSection({ columns, portfolioValue }: Props) {
  const horizon = columns[0]?.yearByYear.length ?? 0;

  // Build chart data with Y0 as starting point
  const chartData = [
    (() => {
      const row: Record<string, string | number> = { year: 'Y0' };
      for (const col of columns) {
        const firstYear = col.yearByYear[0];
        const y0Value = col.config.type === 'sell_upfront' && firstYear
          ? firstYear.portfolioValue / (1 + 0.085 - 0.0075)
          : portfolioValue;
        row[col.config.label] = Math.round(y0Value);
      }
      return row;
    })(),
    ...Array.from({ length: horizon }, (_, i) => {
      const row: Record<string, string | number> = { year: `Y${i + 1}` };
      for (const col of columns) {
        row[col.config.label] = Math.round(col.yearByYear[i]?.afterTaxWealth ?? 0);
      }
      return row;
    }),
  ];

  // Snapshot years for the table
  const snapshotYears = [5, 10, 15, 20, 25, 30].filter((y) => y <= horizon);

  // Wealth delta KPIs
  const holdCol = columns.find((c) => c.config.type === 'hold');
  const sellCol = columns.find((c) => c.config.type === 'sell_upfront');

  return (
    <div className="space-y-4">
      {/* Multi-line Chart */}
      <div className="card p-4">
        <h3 className="font-semibold text-sm mb-3">After-Tax Wealth Projection</h3>
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="year" tick={{ fontSize: 10 }} />
            <YAxis tickFormatter={(v) => `$${(v / 1_000_000).toFixed(1)}M`} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v: number) => formatCurrency(v)} />
            <Legend />
            {columns.map((col, i) => (
              <Line
                key={col.config.label}
                type="monotone"
                dataKey={col.config.label}
                stroke={COLORS[i % COLORS.length]}
                strokeWidth={2}
                dot={false}
                strokeDasharray={col.config.type === 'hold' ? '5 5' : undefined}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Wealth Delta KPIs */}
      {(holdCol || sellCol) && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {columns.filter((c) => c.config.type !== 'hold').map((col, i) => (
            <div key={i} className="card p-3 text-center">
              <p className="text-xs text-text-muted truncate">{col.config.label}</p>
              <p className={`text-lg font-bold ${col.summary.wealthDeltaVsHold >= 0 ? 'text-success-500' : 'text-critical-500'}`}>
                {col.summary.wealthDeltaVsHold >= 0 ? '+' : ''}{formatCurrency(col.summary.wealthDeltaVsHold)}
              </p>
              <p className="text-[10px] text-text-faint">vs. Hold</p>
            </div>
          ))}
        </div>
      )}

      {/* Snapshot Table */}
      {snapshotYears.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-border-subtle">
            <h3 className="font-semibold text-sm">Wealth Snapshots</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-transparent">
                  <th className="text-left px-3 py-2 font-medium text-text-muted">Year</th>
                  {columns.map((col, i) => (
                    <th key={i} className="text-right px-3 py-2 font-medium text-text-muted truncate max-w-[120px]">
                      {col.config.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {snapshotYears.map((yr) => (
                  <tr key={yr} className="border-t border-limestone-100">
                    <td className="px-3 py-2 font-medium">Year {yr}</td>
                    {columns.map((col, i) => (
                      <td key={i} className="px-3 py-2 text-right">
                        {formatCurrency(col.yearByYear[yr - 1]?.afterTaxWealth ?? 0)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
