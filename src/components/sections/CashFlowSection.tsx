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
    { name: 'Box Spread', payment: data.monthlyPaymentComparison.box, fill: '#3B82F6' },
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
        <div className="card p-4 text-center bg-gradient-to-b from-green-50 to-white">
          <p className="text-xs text-gray-500 mb-1">Monthly Cash Flow Freed</p>
          <p className="text-2xl font-bold text-green-700">{formatCurrency(data.monthlyPaymentComparison.monthlySavings)}</p>
          <p className="text-xs text-gray-400 mt-1">vs. margin loan monthly payments</p>
        </div>
        <div className="card p-4 text-center bg-gradient-to-b from-blue-50 to-white">
          <p className="text-xs text-gray-500 mb-1">Reinvestment Value of Savings</p>
          <p className="text-2xl font-bold text-blue-700">{formatCurrency(data.monthlyPaymentComparison.reinvestmentValue)}</p>
          <p className="text-xs text-gray-400 mt-1">FV if monthly savings reinvested</p>
        </div>
      </div>

      {/* Box Spread Cash Flow Timeline */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
          <h3 className="font-semibold text-sm">Box Spread Cash Flow Timeline</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="text-left px-3 py-2 font-medium text-gray-600">Date</th>
                <th className="text-left px-3 py-2 font-medium text-gray-600">Description</th>
                <th className="text-right px-3 py-2 font-medium text-gray-600">Cash Flow</th>
                <th className="text-right px-3 py-2 font-medium text-gray-600">Running Balance</th>
              </tr>
            </thead>
            <tbody>
              {data.boxSpread.map((row, i) => (
                <tr key={i} className={`border-t border-gray-100 ${row.cashFlow < 0 ? 'bg-red-50' : row.cashFlow > 0 ? 'bg-green-50' : ''}`}>
                  <td className="px-3 py-2 font-medium">{row.date}</td>
                  <td className="px-3 py-2 text-gray-600">{row.description}</td>
                  <td className={`px-3 py-2 text-right font-medium ${row.cashFlow > 0 ? 'text-green-600' : row.cashFlow < 0 ? 'text-red-600' : ''}`}>
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
      <div className="card p-4 bg-blue-50 border-blue-200">
        <p className="text-sm text-blue-800">
          <span className="font-semibold">Key Insight:</span> Box spread borrowers pay $0/month during the loan term,
          freeing up {formatCurrency(data.monthlyPaymentComparison.monthlySavings)}/month compared to a margin loan.
          If reinvested, these savings could grow to {formatCurrency(data.monthlyPaymentComparison.reinvestmentValue)} by maturity.
        </p>
      </div>
    </div>
  );
}
