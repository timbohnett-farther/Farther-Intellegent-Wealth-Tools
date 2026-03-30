'use client';

import React from 'react';
import { CashFlowScheduleResult } from '@/lib/types';
import { formatCurrency } from '@/lib/format';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

interface Props {
  data: CashFlowScheduleResult;
}

export default function CashFlowSection({ data }: Props) {
  const comparisonData = [
    { name: 'Box Spread', payment: data.monthlyPaymentComparison.box, fill: '#4E7082' },
    { name: 'Margin', payment: data.monthlyPaymentComparison.margin, fill: '#6B7280' },
    { name: 'SBLOC', payment: data.monthlyPaymentComparison.sbloc, fill: '#F97316' },
    { name: 'HELOC', payment: data.monthlyPaymentComparison.heloc, fill: '#8B5CF6' },
  ];

  return (
    <div className="space-y-4">
      {/* Monthly Payment Comparison */}
      <div className="card p-4">
        <h3 className="font-semibold text-sm mb-3">Monthly Payment Comparison</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={comparisonData} margin={{ top: 5, right: 20, bottom: 5, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(1)}K`} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v: number) => formatCurrency(v)} />
            <Bar dataKey="payment" name="Monthly Payment" radius={[4, 4, 0, 0]}>
              {comparisonData.map((entry, index) => (
                <rect key={index} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Cash Flow Savings Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="card p-4 text-center bg-linear-to-b from-success-50 to-white">
          <p className="text-xs text-text-muted mb-1">Monthly Cash Flow Freed</p>
          <p className="text-2xl font-bold text-success-700">{formatCurrency(data.monthlyPaymentComparison.monthlySavings)}</p>
          <p className="text-xs text-text-faint mt-1">vs. margin loan monthly payments</p>
        </div>
        <div className="card p-4 text-center bg-linear-to-b from-brand-50 to-white">
          <p className="text-xs text-text-muted mb-1">Reinvestment Value of Savings</p>
          <p className="text-2xl font-bold text-accent-primarySoft">{formatCurrency(data.monthlyPaymentComparison.reinvestmentValue)}</p>
          <p className="text-xs text-text-faint mt-1">FV if monthly savings reinvested</p>
        </div>
      </div>

      {/* Box Spread Cash Flow Timeline */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-border-subtle bg-transparent">
          <h3 className="font-semibold text-sm">Box Spread Cash Flow Timeline</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-transparent border-b">
                <th className="text-left px-3 py-2 font-medium text-text-muted">Date</th>
                <th className="text-left px-3 py-2 font-medium text-text-muted">Description</th>
                <th className="text-right px-3 py-2 font-medium text-text-muted">Cash Flow</th>
                <th className="text-right px-3 py-2 font-medium text-text-muted">Running Balance</th>
              </tr>
            </thead>
            <tbody>
              {data.boxSpread.map((row, i) => (
                <tr key={i} className={`border-t border-limestone-100 ${row.cashFlow < 0 ? 'bg-critical-50' : row.cashFlow > 0 ? 'bg-success-50' : ''}`}>
                  <td className="px-3 py-2 font-medium">{row.date}</td>
                  <td className="px-3 py-2 text-text-muted">{row.description}</td>
                  <td className={`px-3 py-2 text-right font-medium ${row.cashFlow > 0 ? 'text-success-500' : row.cashFlow < 0 ? 'text-critical-500' : ''}`}>
                    {row.cashFlow !== 0 ? formatCurrency(row.cashFlow) : '--'}
                  </td>
                  <td className="px-3 py-2 text-right">{formatCurrency(row.runningBalance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Key Insight */}
      <div className="card p-4 bg-accent-primary/10 border-brand-200">
        <p className="text-sm text-accent-primarySoft">
          <span className="font-semibold">Key Insight:</span> Box spread borrowers pay $0/month during the loan term,
          freeing up {formatCurrency(data.monthlyPaymentComparison.monthlySavings)}/month compared to a margin loan.
          If reinvested, these savings could grow to {formatCurrency(data.monthlyPaymentComparison.reinvestmentValue)} by maturity.
        </p>
      </div>
    </div>
  );
}
