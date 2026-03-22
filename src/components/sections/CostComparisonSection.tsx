'use client';

import React from 'react';
import { CostComparisonResult, LoanConfig } from '@/lib/types';
import { formatCurrency, formatPercent } from '@/lib/format';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line,
} from 'recharts';

interface Props {
  data: CostComparisonResult;
  config: LoanConfig;
}

export default function CostComparisonSection({ data, config }: Props) {
  const barData = [
    { name: 'Box Spread', interest: data.boxSpread.totalInterest, fill: '#1d7682' },
    { name: 'Margin Loan', interest: data.marginLoan.totalInterest, fill: '#6B7280' },
    { name: 'SBLOC', interest: data.sbloc.totalInterest, fill: '#F97316' },
    { name: 'HELOC', interest: data.heloc.totalInterest, fill: '#8B5CF6' },
  ];

  const sensitivityData = data.rateSensitivity.map(r => ({
    rate: (r.rate * 100).toFixed(2) + '%',
    'vs Margin': Math.round(r.savingsVsMargin),
    'vs SBLOC': Math.round(r.savingsVsSbloc),
    'vs HELOC': Math.round(r.savingsVsHeloc),
  }));

  return (
    <div className="space-y-4">
      {/* Bar Chart */}
      <div className="card p-4">
        <h3 className="font-semibold text-sm mb-3">Total Interest Cost Comparison</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={barData} margin={{ top: 5, right: 20, bottom: 5, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v: number) => formatCurrency(v)} />
            <Bar dataKey="interest" name="Total Interest" radius={[4, 4, 0, 0]}>
              {barData.map((entry, index) => (
                <rect key={index} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Comparison Table */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-white/[0.06] bg-transparent">
          <h3 className="font-semibold text-sm">Pre-Tax Savings</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-transparent border-b">
                <th className="text-left px-3 py-2 font-medium text-white/50">Metric</th>
                <th className="text-right px-3 py-2 font-medium text-teal-300">Box Spread</th>
                <th className="text-right px-3 py-2 font-medium text-white/50">Margin</th>
                <th className="text-right px-3 py-2 font-medium text-orange-600">SBLOC</th>
                <th className="text-right px-3 py-2 font-medium text-teal-300">HELOC</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-limestone-100">
                <td className="px-3 py-2">Loan Amount</td>
                <td className="px-3 py-2 text-right">{formatCurrency(config.loanAmount)}</td>
                <td className="px-3 py-2 text-right">{formatCurrency(config.loanAmount)}</td>
                <td className="px-3 py-2 text-right">{formatCurrency(config.loanAmount)}</td>
                <td className="px-3 py-2 text-right">{formatCurrency(config.loanAmount)}</td>
              </tr>
              <tr className="border-t border-limestone-100">
                <td className="px-3 py-2">Annual Rate</td>
                <td className="px-3 py-2 text-right font-medium text-teal-300">{formatPercent(data.boxSpread.annualRate)}</td>
                <td className="px-3 py-2 text-right">{formatPercent(data.marginLoan.annualRate)}</td>
                <td className="px-3 py-2 text-right">{formatPercent(data.sbloc.annualRate)}</td>
                <td className="px-3 py-2 text-right">{formatPercent(data.heloc.annualRate)}</td>
              </tr>
              <tr className="border-t border-limestone-100">
                <td className="px-3 py-2">Term</td>
                <td className="px-3 py-2 text-right">{config.termYears} yr</td>
                <td className="px-3 py-2 text-right">{config.termYears} yr</td>
                <td className="px-3 py-2 text-right">{config.termYears} yr</td>
                <td className="px-3 py-2 text-right">{config.termYears} yr</td>
              </tr>
              <tr className="border-t border-limestone-100">
                <td className="px-3 py-2 font-medium">Total Interest</td>
                <td className="px-3 py-2 text-right font-bold text-teal-300">{formatCurrency(data.boxSpread.totalInterest)}</td>
                <td className="px-3 py-2 text-right">{formatCurrency(data.marginLoan.totalInterest)}</td>
                <td className="px-3 py-2 text-right">{formatCurrency(data.sbloc.totalInterest)}</td>
                <td className="px-3 py-2 text-right">{formatCurrency(data.heloc.totalInterest)}</td>
              </tr>
              <tr className="border-t-2 border-white/[0.06] bg-success-50">
                <td className="px-3 py-2 font-semibold text-success-700">Savings vs. Box</td>
                <td className="px-3 py-2 text-right text-white/30">--</td>
                <td className="px-3 py-2 text-right font-bold text-success-700">{formatCurrency(data.savingsVsMargin)}</td>
                <td className="px-3 py-2 text-right font-bold text-success-700">{formatCurrency(data.savingsVsSbloc)}</td>
                <td className="px-3 py-2 text-right font-bold text-success-700">{formatCurrency(data.savingsVsHeloc)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Rate Sensitivity Chart */}
      <div className="card p-4">
        <h3 className="font-semibold text-sm mb-3">Rate Sensitivity Analysis</h3>
        <p className="text-xs text-white/50 mb-3">Savings vs. alternatives as box spread rate varies +/- 200bps</p>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={sensitivityData} margin={{ top: 5, right: 20, bottom: 5, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="rate" tick={{ fontSize: 10 }} interval={3} />
            <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v: number) => formatCurrency(v)} />
            <Legend />
            <Line type="monotone" dataKey="vs Margin" stroke="#6B7280" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="vs SBLOC" stroke="#F97316" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="vs HELOC" stroke="#8B5CF6" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
