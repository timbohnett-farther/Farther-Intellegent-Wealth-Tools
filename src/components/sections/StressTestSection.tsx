'use client';

import React from 'react';
import { StressTestResult } from '@/lib/types';
import { formatCurrency, formatPercent, formatPercentValue } from '@/lib/format';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, Cell,
} from 'recharts';

interface Props {
  data: StressTestResult;
}

export default function StressTestSection({ data }: Props) {
  const ltvData = data.ltvSensitivity.map(l => ({
    ltv: `${(l.ltv * 100).toFixed(0)}%`,
    maxDecline: Math.round(l.maxDecline * 100),
    loan: l.loan,
  }));

  return (
    <div className="space-y-4">
      {/* Margin Safety Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="card p-3 text-center">
          <p className="text-xs text-charcoal-500">Initial Margin</p>
          <p className="text-lg font-bold">{formatPercent(data.initialMarginPct)}</p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-xs text-charcoal-500">Maintenance Margin</p>
          <p className="text-lg font-bold">{formatPercent(data.maintenanceMarginPct)}</p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-xs text-charcoal-500">Max Decline to MC</p>
          <p className={`text-lg font-bold ${data.declineToMarginCall > 0.5 ? 'text-safe' : data.declineToMarginCall > 0.3 ? 'text-warning' : 'text-danger'}`}>
            {formatPercent(data.declineToMarginCall)}
          </p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-xs text-charcoal-500">MC Trigger Value</p>
          <p className="text-lg font-bold text-danger">{formatCurrency(data.marginCallPortfolioValue)}</p>
        </div>
      </div>

      {/* Stress Test Scenarios Table */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-limestone-200 bg-limestone-50">
          <h3 className="font-semibold text-sm">Market Decline Stress Test</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-limestone-50 border-b">
                <th className="text-left px-3 py-2 font-medium text-charcoal-500">Decline</th>
                <th className="text-right px-3 py-2 font-medium text-charcoal-500">Portfolio Value</th>
                <th className="text-right px-3 py-2 font-medium text-charcoal-500">Box Obligation</th>
                <th className="text-right px-3 py-2 font-medium text-charcoal-500">Equity</th>
                <th className="text-right px-3 py-2 font-medium text-charcoal-500">Equity %</th>
                <th className="text-center px-3 py-2 font-medium text-charcoal-500">Status</th>
                <th className="text-right px-3 py-2 font-medium text-charcoal-500">Excess Equity</th>
              </tr>
            </thead>
            <tbody>
              {data.scenarios.map((s, i) => {
                const statusConfig = {
                  safe: { icon: '\u2705', label: 'SAFE', bg: '' },
                  warning: { icon: '\u26A0\uFE0F', label: 'WARNING', bg: 'bg-warning-50' },
                  margin_call: { icon: '\uD83D\uDD34', label: 'MARGIN CALL', bg: 'bg-critical-50' },
                };
                const sc = statusConfig[s.status];
                return (
                  <tr key={i} className={`border-t border-limestone-100 ${sc.bg}`}>
                    <td className="px-3 py-2 font-medium">-{formatPercentValue(s.decline * 100, 0)}</td>
                    <td className="px-3 py-2 text-right">{formatCurrency(s.portfolioValue)}</td>
                    <td className="px-3 py-2 text-right">{formatCurrency(s.boxObligation)}</td>
                    <td className="px-3 py-2 text-right">{formatCurrency(s.equity)}</td>
                    <td className="px-3 py-2 text-right">{formatPercentValue(s.equityPct * 100, 1)}</td>
                    <td className="px-3 py-2 text-center whitespace-nowrap">
                      <span className="text-xs">{sc.icon} {sc.label}</span>
                    </td>
                    <td className="px-3 py-2 text-right">{formatCurrency(s.excessEquity)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Historical Drawdown Overlay */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-limestone-200 bg-limestone-50">
          <h3 className="font-semibold text-sm">Historical Drawdown Overlay</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-limestone-50 border-b">
                <th className="text-left px-3 py-2 font-medium text-charcoal-500">Event</th>
                <th className="text-right px-3 py-2 font-medium text-charcoal-500">Decline</th>
                <th className="text-center px-3 py-2 font-medium text-charcoal-500">Duration</th>
                <th className="text-center px-3 py-2 font-medium text-charcoal-500">Margin Call?</th>
              </tr>
            </thead>
            <tbody>
              {data.historicalEvents.map((e, i) => (
                <tr key={i} className={`border-t border-limestone-100 ${e.wouldTrigger ? 'bg-critical-50' : ''}`}>
                  <td className="px-3 py-2 font-medium">{e.name}</td>
                  <td className="px-3 py-2 text-right">-{formatPercentValue(e.decline * 100, 1)}</td>
                  <td className="px-3 py-2 text-center">{e.duration}</td>
                  <td className="px-3 py-2 text-center">{e.wouldTrigger ? '\uD83D\uDD34 YES' : '\u2705 NO'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* LTV Sensitivity Chart */}
      <div className="card p-4">
        <h3 className="font-semibold text-sm mb-3">LTV vs. Maximum Decline Before Margin Call</h3>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={ltvData} margin={{ top: 5, right: 20, bottom: 5, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="ltv" tick={{ fontSize: 11 }} label={{ value: 'LTV Ratio', position: 'insideBottom', offset: -2, fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} label={{ value: 'Max Decline %', angle: -90, position: 'insideLeft', fontSize: 11 }} />
            <Tooltip formatter={(v: number) => `${v}%`} />
            <ReferenceLine y={56.8} stroke="#EF4444" strokeDasharray="3 3" label={{ value: 'GFC -56.8%', fontSize: 10, fill: '#EF4444' }} />
            <ReferenceLine y={33.5} stroke="#F59E0B" strokeDasharray="3 3" label={{ value: 'Black Mon -33.5%', fontSize: 10, fill: '#F59E0B' }} />
            <Bar dataKey="maxDecline" name="Max Decline %" radius={[4, 4, 0, 0]}>
              {ltvData.map((entry, index) => (
                <Cell key={index} fill={entry.maxDecline > 50 ? '#22C55E' : entry.maxDecline > 30 ? '#F59E0B' : '#EF4444'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
