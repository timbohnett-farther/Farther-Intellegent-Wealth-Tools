'use client';

import React from 'react';
import { TalsColumnResult } from '@/lib/tals/types';
import { formatCurrency } from '@/lib/format';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line,
} from 'recharts';

interface Props {
  columns: TalsColumnResult[];
}

const COLORS = ['#4E7082', '#8B5CF6', '#F97316', '#10B981'];

export default function TalsTaxAlphaSection({ columns }: Props) {
  // Only show columns with tax-loss activity
  const activeCols = columns.filter((c) => c.summary.totalTaxSavings > 0);
  if (activeCols.length === 0) {
    return (
      <div className="card p-6 text-center text-text-muted">
        No columns generate tax losses. Add a TALS strategy or Direct Indexing column to see tax alpha analysis.
      </div>
    );
  }

  const horizon = activeCols[0].yearByYear.length;

  // Annual tax losses grouped bar data
  const annualLossData = Array.from({ length: horizon }, (_, i) => {
    const row: Record<string, string | number> = { year: `Y${i + 1}` };
    for (const col of activeCols) {
      row[col.config.label] = Math.round(col.yearByYear[i]?.taxLossesGenerated ?? 0);
    }
    return row;
  });

  // Cumulative tax savings line data
  const cumulativeSavingsData = Array.from({ length: horizon }, (_, i) => {
    const row: Record<string, string | number> = { year: `Y${i + 1}` };
    for (const col of activeCols) {
      const cumulative = col.yearByYear
        .slice(0, i + 1)
        .reduce((sum, r) => sum + r.taxSavings, 0);
      row[col.config.label] = Math.round(cumulative);
    }
    return row;
  });

  return (
    <div className="space-y-4">
      {/* Annual Tax Losses Chart */}
      <div className="card p-4">
        <h3 className="font-semibold text-sm mb-3">Annual Tax Losses Generated</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={annualLossData} margin={{ top: 5, right: 20, bottom: 5, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="year" tick={{ fontSize: 10 }} />
            <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v: number) => formatCurrency(v)} />
            <Legend />
            {activeCols.map((col, i) => (
              <Bar key={col.config.label} dataKey={col.config.label} fill={COLORS[i % COLORS.length]} radius={[2, 2, 0, 0]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Cumulative Tax Savings Line Chart */}
      <div className="card p-4">
        <h3 className="font-semibold text-sm mb-3">Cumulative Tax Savings</h3>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={cumulativeSavingsData} margin={{ top: 5, right: 20, bottom: 5, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="year" tick={{ fontSize: 10 }} />
            <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v: number) => formatCurrency(v)} />
            <Legend />
            {activeCols.map((col, i) => (
              <Line key={col.config.label} type="monotone" dataKey={col.config.label} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={false} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Net Tax Alpha Table */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-border-subtle">
          <h3 className="font-semibold text-sm">Net Tax Alpha Comparison</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-transparent">
                <th className="text-left px-3 py-2 font-medium text-text-muted">Metric</th>
                {activeCols.map((col, i) => (
                  <th key={i} className="text-right px-3 py-2 font-medium text-text-muted truncate max-w-[120px]">
                    {col.config.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-limestone-100">
                <td className="px-3 py-2">Total Tax Losses</td>
                {activeCols.map((col, i) => (
                  <td key={i} className="px-3 py-2 text-right">
                    {formatCurrency(col.yearByYear.reduce((s, r) => s + r.taxLossesGenerated, 0))}
                  </td>
                ))}
              </tr>
              <tr className="border-t border-limestone-100">
                <td className="px-3 py-2">Total Tax Savings</td>
                {activeCols.map((col, i) => (
                  <td key={i} className="px-3 py-2 text-right text-success-500 font-medium">
                    {formatCurrency(col.summary.totalTaxSavings)}
                  </td>
                ))}
              </tr>
              <tr className="border-t border-limestone-100">
                <td className="px-3 py-2">Total Costs</td>
                {activeCols.map((col, i) => (
                  <td key={i} className="px-3 py-2 text-right">
                    {formatCurrency(col.summary.totalCost)}
                  </td>
                ))}
              </tr>
              <tr className="border-t-2 border-border-subtle bg-success-50">
                <td className="px-3 py-2 font-bold text-success-700">Net Tax Alpha</td>
                {activeCols.map((col, i) => (
                  <td key={i} className={`px-3 py-2 text-right font-bold ${col.summary.netTaxAlpha >= 0 ? 'text-success-700' : 'text-critical-700'}`}>
                    {formatCurrency(col.summary.netTaxAlpha)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* CNCL Comparison */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-border-subtle">
          <h3 className="font-semibold text-sm">CNCL Decay Comparison</h3>
          <p className="text-xs text-text-muted mt-1">Constructive Net Capital Losses — decaying (Track D) vs. non-decaying (Tracks A-C)</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-transparent">
                <th className="text-left px-3 py-2 font-medium text-text-muted">Year</th>
                {activeCols.map((col, i) => (
                  <th key={i} className="text-right px-3 py-2 font-medium text-text-muted truncate max-w-[120px]">
                    {col.config.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[0, 2, 4, 9, 14].map((idx) => {
                if (idx >= horizon) return null;
                return (
                  <tr key={idx} className="border-t border-limestone-100">
                    <td className="px-3 py-2 font-medium">Year {idx + 1}</td>
                    {activeCols.map((col, i) => (
                      <td key={i} className="px-3 py-2 text-right">
                        {(col.yearByYear[idx]?.cumulativeCNCL * 100).toFixed(1)}%
                      </td>
                    ))}
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
