'use client';

import React, { useState } from 'react';
import { TalsColumnResult } from '@/lib/tals/types';
import { formatCurrency, formatPercent } from '@/lib/format';

interface Props {
  columns: TalsColumnResult[];
}

export default function TalsYearByYearSection({ columns }: Props) {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const selected = columns[selectedIdx];

  if (!selected) return null;

  return (
    <div className="space-y-4">
      {/* Column Selector Tabs */}
      <div className="flex gap-1 border-b border-border-subtle overflow-x-auto">
        {columns.map((col, i) => (
          <button
            key={i}
            className={`px-3 py-2 text-sm whitespace-nowrap transition-colors ${
              selectedIdx === i ? 'tab-active' : 'tab-inactive'
            }`}
            onClick={() => setSelectedIdx(i)}
          >
            {col.config.label}
          </button>
        ))}
      </div>

      {/* Strategy Info */}
      {selected.strategy && (
        <div className="card p-3">
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-text-muted">
            <span>Provider: <strong className="text-text">{selected.strategy.provider}</strong></span>
            <span>Track: <strong className="text-text">{selected.strategy.formulaTrack}</strong></span>
            <span>Leverage: <strong className="text-text">{selected.strategy.longRatio * 100}/{selected.strategy.shortRatio * 100}</strong></span>
            <span>Mgmt Fee: <strong>{(selected.strategy.fees.mgmtFee * 100).toFixed(2)}%</strong></span>
            <span>CNCL Base: <strong>{(selected.strategy.cncl.cnclBase * 100).toFixed(0)}%</strong></span>
            {selected.strategy.cncl.decaying && (
              <span className="text-warning-500">Decaying CNCL ({(selected.strategy.cncl.decayRate * 100).toFixed(0)}%/yr)</span>
            )}
          </div>
        </div>
      )}

      {/* Full Data Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-transparent">
                <th className="text-left px-3 py-2 font-medium text-text-muted">Year</th>
                <th className="text-right px-3 py-2 font-medium text-text-muted">Portfolio Value</th>
                <th className="text-right px-3 py-2 font-medium text-text-muted">Tax Losses</th>
                <th className="text-right px-3 py-2 font-medium text-text-muted">Tax Savings</th>
                <th className="text-right px-3 py-2 font-medium text-text-muted">Cum. CNCL</th>
                <th className="text-right px-3 py-2 font-medium text-text-muted">All-In Cost</th>
                <th className="text-right px-3 py-2 font-medium text-text-muted">Net Alpha</th>
                <th className="text-right px-3 py-2 font-medium text-text-muted">Conc. %</th>
                <th className="text-right px-3 py-2 font-medium text-text-muted">After-Tax Wealth</th>
              </tr>
            </thead>
            <tbody>
              {selected.yearByYear.map((row) => (
                <tr key={row.year} className="border-t border-limestone-100">
                  <td className="px-3 py-2 font-medium">{row.year}</td>
                  <td className="px-3 py-2 text-right">{formatCurrency(row.portfolioValue)}</td>
                  <td className="px-3 py-2 text-right">{formatCurrency(row.taxLossesGenerated)}</td>
                  <td className="px-3 py-2 text-right text-success-500">{formatCurrency(row.taxSavings)}</td>
                  <td className="px-3 py-2 text-right">{formatPercent(row.cumulativeCNCL)}</td>
                  <td className="px-3 py-2 text-right">{formatCurrency(row.allInCost)}</td>
                  <td className={`px-3 py-2 text-right ${row.netTaxAlpha >= 0 ? 'text-success-500' : 'text-critical-500'}`}>
                    {formatCurrency(row.netTaxAlpha)}
                  </td>
                  <td className="px-3 py-2 text-right">{formatPercent(row.concentratedPctRemaining)}</td>
                  <td className="px-3 py-2 text-right font-medium">{formatCurrency(row.afterTaxWealth)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
