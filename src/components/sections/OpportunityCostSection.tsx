'use client';

import React from 'react';
import { OpportunityCostResult } from '@/lib/types';
import { formatCurrency, formatPercent } from '@/lib/format';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

interface Props {
  data: OpportunityCostResult;
}

export default function OpportunityCostSection({ data }: Props) {
  const chartData = data.scenarioSell.map((_, i) => ({
    year: i,
    'Sell Assets': Math.round(data.scenarioSell[i]?.totalWealth ?? 0),
    'Box Spread': Math.round(data.scenarioBorrow[i]?.totalWealth ?? 0),
    'Margin Loan': Math.round(data.scenarioMargin[i]?.totalWealth ?? 0),
  }));

  return (
    <div className="space-y-4">
      {/* Break-Even Card */}
      <div className="card p-4 bg-gradient-to-r from-brand-50 to-success-50">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
          <div>
            <p className="text-xs text-charcoal-500 uppercase tracking-wider">Break-Even Return</p>
            <p className="text-3xl font-bold text-brand-700">{formatPercent(data.breakEvenReturn)}</p>
            <p className="text-xs text-charcoal-500 mt-1">
              If your portfolio earns more than this annually, borrowing via box spread is mathematically superior to selling.
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-charcoal-500 uppercase tracking-wider">Net Wealth Advantage</p>
            <p className={`text-3xl font-bold ${data.wealthDifference > 0 ? 'text-success-700' : 'text-critical-700'}`}>
              {formatCurrency(data.wealthDifference)}
            </p>
            <p className="text-xs text-charcoal-500 mt-1">Borrowing vs. selling at term end</p>
          </div>
        </div>
      </div>

      {/* Wealth Projection Chart */}
      <div className="card p-4">
        <h3 className="font-semibold text-sm mb-3">Net Wealth Comparison Over Time</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="year" tick={{ fontSize: 11 }} label={{ value: 'Year', position: 'insideBottom', offset: -2, fontSize: 11 }} />
            <YAxis tickFormatter={(v) => `$${(v / 1_000_000).toFixed(1)}M`} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v: number) => formatCurrency(v)} />
            <Legend />
            <Line type="monotone" dataKey="Sell Assets" stroke="#EF4444" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="Box Spread" stroke="#3B5A69" strokeWidth={2.5} dot={false} />
            <Line type="monotone" dataKey="Margin Loan" stroke="#6B7280" strokeWidth={2} dot={false} strokeDasharray="5 5" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Missed Market Days Analysis */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-limestone-200 bg-limestone-50">
          <h3 className="font-semibold text-sm">Missed Market Days Analysis</h3>
          <p className="text-xs text-charcoal-500 mt-1">Impact of selling and missing the best market days</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-limestone-50 border-b">
                <th className="text-left px-3 py-2 font-medium text-charcoal-500">Scenario</th>
                <th className="text-right px-3 py-2 font-medium text-charcoal-500">Adj. Return</th>
                <th className="text-right px-3 py-2 font-medium text-charcoal-500">Wealth if Sold</th>
                <th className="text-right px-3 py-2 font-medium text-charcoal-500">Wealth if Borrowed</th>
                <th className="text-right px-3 py-2 font-medium text-success-500">Advantage</th>
              </tr>
            </thead>
            <tbody>
              {data.missedDaysAnalysis.map((row, i) => (
                <tr key={i} className="border-t border-limestone-100">
                  <td className="px-3 py-2 font-medium">{row.scenario}</td>
                  <td className="px-3 py-2 text-right">{formatPercent(row.adjustedReturn)}</td>
                  <td className="px-3 py-2 text-right">{formatCurrency(row.wealthIfSold)}</td>
                  <td className="px-3 py-2 text-right">{formatCurrency(row.wealthIfBorrowed)}</td>
                  <td className={`px-3 py-2 text-right font-bold ${row.opportunityCost > 0 ? 'text-success-500' : 'text-critical-500'}`}>
                    {formatCurrency(row.opportunityCost)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
