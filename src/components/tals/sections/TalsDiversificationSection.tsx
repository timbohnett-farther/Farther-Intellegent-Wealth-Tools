'use client';

import React from 'react';
import { TalsColumnResult } from '@/lib/tals/types';
import { formatPercent } from '@/lib/format';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

interface Props {
  columns: TalsColumnResult[];
  targetConcentration: number;
}

const COLORS = ['#4E7082', '#8B5CF6', '#F97316', '#10B981'];

export default function TalsDiversificationSection({ columns, targetConcentration }: Props) {
  const horizon = columns[0]?.yearByYear.length ?? 0;

  const chartData = Array.from({ length: horizon }, (_, i) => {
    const row: Record<string, string | number> = { year: `Y${i + 1}` };
    for (const col of columns) {
      row[col.config.label] = parseFloat(((col.yearByYear[i]?.concentratedPctRemaining ?? 0) * 100).toFixed(1));
    }
    return row;
  });

  return (
    <div className="space-y-4">
      {/* Area Chart */}
      <div className="card p-4">
        <h3 className="font-semibold text-sm mb-3">Concentrated Position % Over Time</h3>
        <p className="text-xs text-text-muted mb-3">Target concentration: {formatPercent(targetConcentration)}</p>
        <ResponsiveContainer width="100%" height={320}>
          <AreaChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="year" tick={{ fontSize: 10 }} />
            <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v: number) => `${v.toFixed(1)}%`} />
            <Legend />
            <ReferenceLine
              y={targetConcentration * 100}
              stroke="#EF4444"
              strokeDasharray="5 5"
              label={{ value: 'Target', position: 'insideTopRight', fill: '#EF4444', fontSize: 10 }}
            />
            {columns.map((col, i) => (
              <Area
                key={col.config.label}
                type="monotone"
                dataKey={col.config.label}
                stroke={COLORS[i % COLORS.length]}
                fill={COLORS[i % COLORS.length]}
                fillOpacity={0.1}
                strokeWidth={2}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Years to Target KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {columns.map((col, i) => (
          <div key={i} className="card p-3 text-center">
            <p className="text-xs text-text-muted truncate">{col.config.label}</p>
            <p className={`text-2xl font-bold mt-1 ${
              col.summary.yearsToTarget !== null ? 'text-success-500' : 'text-text-faint'
            }`}>
              {col.summary.yearsToTarget !== null ? `${col.summary.yearsToTarget}` : 'N/A'}
            </p>
            <p className="text-[10px] text-text-faint">
              {col.summary.yearsToTarget !== null ? 'years to target' : 'never reaches target'}
            </p>
          </div>
        ))}
      </div>

      {/* Concentration Snapshot Table */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-border-subtle">
          <h3 className="font-semibold text-sm">Concentration Snapshots</h3>
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
              {[0, 2, 4, 7, 9, 14, 19, 24, 29].map((idx) => {
                if (idx >= horizon) return null;
                return (
                  <tr key={idx} className="border-t border-limestone-100">
                    <td className="px-3 py-2 font-medium">Year {idx + 1}</td>
                    {columns.map((col, i) => {
                      const pct = col.yearByYear[idx]?.concentratedPctRemaining ?? 0;
                      const belowTarget = pct <= targetConcentration;
                      return (
                        <td key={i} className={`px-3 py-2 text-right ${belowTarget ? 'text-success-500 font-medium' : ''}`}>
                          {formatPercent(pct)}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
