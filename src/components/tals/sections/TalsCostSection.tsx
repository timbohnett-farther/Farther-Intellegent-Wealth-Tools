'use client';

import React from 'react';
import { TalsCostBreakdown } from '@/lib/tals/types';
import { formatCurrency } from '@/lib/format';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

interface Props {
  data: TalsCostBreakdown[];
}

const COLORS = ['#4E7082', '#8B5CF6', '#F97316', '#10B981'];

export default function TalsCostSection({ data }: Props) {
  const chartData = data.map((d) => ({
    name: d.columnLabel,
    'Mgmt Fee': Math.round(d.mgmtFee),
    'Financing': Math.round(d.financingCost),
    'Transaction': Math.round(d.txnCosts),
    'RIA Fee': Math.round(d.riaFee),
  }));

  return (
    <div className="space-y-4">
      {/* Stacked Bar Chart */}
      <div className="card p-4">
        <h3 className="font-semibold text-sm mb-3">Cost Components by Strategy</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v: number) => formatCurrency(v)} />
            <Legend />
            <Bar dataKey="Mgmt Fee" stackId="costs" fill="#4E7082" radius={[0, 0, 0, 0]} />
            <Bar dataKey="Financing" stackId="costs" fill="#8B5CF6" />
            <Bar dataKey="Transaction" stackId="costs" fill="#F97316" />
            <Bar dataKey="RIA Fee" stackId="costs" fill="#6B7280" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Cost Table */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-border-subtle">
          <h3 className="font-semibold text-sm">Net Cost After Tax Savings</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-transparent">
                <th className="text-left px-3 py-2 font-medium text-text-muted">Component</th>
                {data.map((d, i) => (
                  <th key={i} className="text-right px-3 py-2 font-medium text-text-muted truncate max-w-[120px]">
                    {d.columnLabel}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-limestone-100">
                <td className="px-3 py-2">Management Fee</td>
                {data.map((d, i) => (
                  <td key={i} className="px-3 py-2 text-right">{formatCurrency(d.mgmtFee)}</td>
                ))}
              </tr>
              <tr className="border-t border-limestone-100">
                <td className="px-3 py-2">Financing Cost</td>
                {data.map((d, i) => (
                  <td key={i} className="px-3 py-2 text-right">{formatCurrency(d.financingCost)}</td>
                ))}
              </tr>
              <tr className="border-t border-limestone-100">
                <td className="px-3 py-2">Transaction Costs</td>
                {data.map((d, i) => (
                  <td key={i} className="px-3 py-2 text-right">{formatCurrency(d.txnCosts)}</td>
                ))}
              </tr>
              <tr className="border-t border-limestone-100">
                <td className="px-3 py-2">RIA Fee</td>
                {data.map((d, i) => (
                  <td key={i} className="px-3 py-2 text-right">{formatCurrency(d.riaFee)}</td>
                ))}
              </tr>
              <tr className="border-t border-border-subtle">
                <td className="px-3 py-2 font-semibold">Total Pre-Tax Cost</td>
                {data.map((d, i) => (
                  <td key={i} className="px-3 py-2 text-right font-semibold">{formatCurrency(d.totalPreTax)}</td>
                ))}
              </tr>
              <tr className="border-t border-limestone-100">
                <td className="px-3 py-2 text-success-500">Tax Savings Offset</td>
                {data.map((d, i) => (
                  <td key={i} className="px-3 py-2 text-right text-success-500">({formatCurrency(d.taxSavingsOffset)})</td>
                ))}
              </tr>
              <tr className="border-t-2 border-border-subtle bg-success-50">
                <td className="px-3 py-2 font-bold text-success-700">Net Cost</td>
                {data.map((d, i) => (
                  <td key={i} className={`px-3 py-2 text-right font-bold ${d.netCost <= 0 ? 'text-success-700' : 'text-text'}`}>
                    {formatCurrency(d.netCost)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
