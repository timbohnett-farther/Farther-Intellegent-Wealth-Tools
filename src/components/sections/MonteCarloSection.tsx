'use client';

import React from 'react';
import { MonteCarloResult } from '@/lib/types';
import { formatCurrency, formatPercentValue } from '@/lib/format';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

interface Props {
  data: MonteCarloResult;
}

export default function MonteCarloSection({ data }: Props) {
  const chartData = data.fanChartData.map(d => ({
    month: d.month,
    p5_p95: [d.p5, d.p95],
    p25_p75: [d.p25, d.p75],
    p50: d.p50,
    marginCallLine: d.marginCallLine,
    p5: d.p5,
    p25: d.p25,
    p75: d.p75,
    p95: d.p95,
  }));

  return (
    <div className="space-y-4">
      {/* Probability Dashboard */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <div className="card p-3 text-center">
          <p className="text-xs text-white/50">Margin Call Probability</p>
          <p className={`text-2xl font-bold ${data.probabilityOfMarginCall < 5 ? 'text-safe' : data.probabilityOfMarginCall < 15 ? 'text-warning' : 'text-danger'}`}>
            {formatPercentValue(data.probabilityOfMarginCall, 1)}
          </p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-xs text-white/50">Portfolio Grows</p>
          <p className="text-2xl font-bold text-safe">{formatPercentValue(data.probabilityPortfolioGrows, 1)}</p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-xs text-white/50">Median Terminal Portfolio</p>
          <p className="text-2xl font-bold text-teal-300">{formatCurrency(data.medianTerminalPortfolio)}</p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-xs text-white/50">Median Net Wealth</p>
          <p className="text-2xl font-bold text-success-700">{formatCurrency(data.medianNetWealth)}</p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-xs text-white/50">5th Percentile (Worst)</p>
          <p className="text-2xl font-bold text-warning-500">{formatCurrency(data.percentiles.p5)}</p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-xs text-white/50">95th Percentile (Best)</p>
          <p className="text-2xl font-bold text-teal-300">{formatCurrency(data.percentiles.p95)}</p>
        </div>
      </div>

      {/* Fan Chart */}
      <div className="card p-4">
        <h3 className="font-semibold text-sm mb-1">Portfolio Value Projection (5,000 Simulations)</h3>
        <p className="text-xs text-white/50 mb-3">Shaded bands show 5th-95th and 25th-75th percentile ranges</p>
        <ResponsiveContainer width="100%" height={350}>
          <AreaChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11 }}
              label={{ value: 'Month', position: 'insideBottom', offset: -2, fontSize: 11 }}
            />
            <YAxis
              tickFormatter={(v) => `$${(v / 1_000_000).toFixed(1)}M`}
              tick={{ fontSize: 11 }}
            />
            <Tooltip
              formatter={(v: number) => formatCurrency(v)}
              labelFormatter={(l) => `Month ${l}`}
            />
            {/* P5-P95 band */}
            <Area type="monotone" dataKey="p95" stackId="1" stroke="none" fill="#E0EAED" fillOpacity={0.5} name="95th %ile" />
            <Area type="monotone" dataKey="p5" stackId="2" stroke="none" fill="white" fillOpacity={1} name="5th %ile" />
            {/* P25-P75 band */}
            <Area type="monotone" dataKey="p75" stackId="3" stroke="none" fill="#A3BFC9" fillOpacity={0.4} name="75th %ile" />
            <Area type="monotone" dataKey="p25" stackId="4" stroke="none" fill="white" fillOpacity={1} name="25th %ile" />
            {/* Median line */}
            <Area type="monotone" dataKey="p50" stroke="#1d7682" strokeWidth={2.5} fill="none" name="Median" />
            {/* Margin call line */}
            <Area type="monotone" dataKey="marginCallLine" stroke="#EF4444" strokeWidth={2} strokeDasharray="6 4" fill="#F8D7DA" fillOpacity={0.3} name="Margin Call Zone" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Percentile Table */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-white/[0.06] bg-transparent">
          <h3 className="font-semibold text-sm">Terminal Portfolio Distribution</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-transparent border-b">
                <th className="text-left px-4 py-2 font-medium text-white/50">Percentile</th>
                <th className="text-right px-4 py-2 font-medium text-white/50">Terminal Portfolio</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['5th (Worst Reasonable)', data.percentiles.p5],
                ['25th', data.percentiles.p25],
                ['50th (Median)', data.percentiles.p50],
                ['75th', data.percentiles.p75],
                ['95th (Best Reasonable)', data.percentiles.p95],
              ].map(([label, value], i) => (
                <tr key={i} className="border-t border-limestone-100">
                  <td className="px-4 py-2 font-medium">{label as string}</td>
                  <td className="px-4 py-2 text-right font-medium">{formatCurrency(value as number)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {data.averageTimeToMC > 0 && (
        <div className="card p-3 bg-warning-50 border-warning-200 text-sm text-warning-700">
          When margin calls did occur, they happened on average at month {Math.round(data.averageTimeToMC)} ({(data.averageTimeToMC / 12).toFixed(1)} years).
        </div>
      )}
    </div>
  );
}
