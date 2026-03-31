'use client';

import React from 'react';
import { TalsAllResults, TalsWarning } from '@/lib/tals/types';
import { formatCurrency, formatPercent } from '@/lib/format';

interface Props {
  data: TalsAllResults;
}

const SEVERITY_STYLES: Record<string, string> = {
  critical: 'bg-critical-50 border-critical-500 text-critical-700',
  warning: 'bg-warning-50 border-warning-500 text-warning-700',
  info: 'bg-accent-primary/10 border-accent-primary text-accent-primarySoft',
};

function WarningBanner({ warning }: { warning: TalsWarning }) {
  return (
    <div className={`p-3 rounded-lg border-l-4 text-sm ${SEVERITY_STYLES[warning.severity]}`}>
      <span className="font-semibold capitalize mr-1">{warning.severity}:</span>
      {warning.message}
    </div>
  );
}

export default function TalsSummarySection({ data }: Props) {
  const { columns, warnings } = data;

  // Find the best TALS column (highest net tax alpha)
  const talsColumns = columns.filter((c) => c.config.type === 'tals');
  const bestTals = talsColumns.sort((a, b) => b.summary.netTaxAlpha - a.summary.netTaxAlpha)[0];

  // Recommendation
  const holdCol = columns.find((c) => c.config.type === 'hold');
  const sellCol = columns.find((c) => c.config.type === 'sell_upfront');

  let recommendation = '';
  if (bestTals && holdCol) {
    const delta = bestTals.summary.wealthDeltaVsHold;
    if (delta > 0) {
      recommendation = `${bestTals.config.label} generates ${formatCurrency(delta)} more after-tax wealth than holding over the projection period, with ${formatCurrency(bestTals.summary.totalTaxSavings)} in cumulative tax savings.`;
    } else {
      recommendation = `Holding the concentrated position outperforms ${bestTals.config.label} by ${formatCurrency(Math.abs(delta))} in this scenario. Consider extending the horizon or adjusting assumptions.`;
    }
  }

  return (
    <div className="space-y-4">
      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="space-y-2">
          {warnings.map((w, i) => (
            <WarningBanner key={i} warning={w} />
          ))}
        </div>
      )}

      {/* Recommendation Banner */}
      {recommendation && (
        <div className="p-4 rounded-xl border-2 bg-accent-primary/10 border-accent-primary text-accent-primarySoft">
          <h3 className="font-semibold text-lg mb-1">Recommendation</h3>
          <p className="text-sm">{recommendation}</p>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {columns.map((col, i) => (
          <div key={i} className="card p-3 text-center">
            <p className="text-xs text-text-muted truncate">{col.config.label}</p>
            <p className="text-xl font-bold text-text mt-1">
              {formatCurrency(col.summary.finalAfterTaxWealth)}
            </p>
            <p className="text-[10px] text-text-faint">After-Tax Wealth</p>
          </div>
        ))}
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {columns.map((col, i) => (
          <div key={i} className="card p-3 text-center">
            <p className="text-xs text-text-muted truncate">{col.config.label}</p>
            <p className={`text-lg font-bold ${col.summary.totalTaxSavings > 0 ? 'text-success-500' : 'text-text-faint'}`}>
              {formatCurrency(col.summary.totalTaxSavings)}
            </p>
            <p className="text-[10px] text-text-faint">Total Tax Savings</p>
          </div>
        ))}
      </div>

      {/* Decision Matrix */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-border-subtle">
          <h3 className="font-semibold text-sm">Strategy Comparison</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-transparent">
                <th className="text-left px-3 py-2 font-medium text-text-muted">Metric</th>
                {columns.map((col, i) => (
                  <th key={i} className="text-right px-3 py-2 font-medium text-text-muted truncate max-w-[120px]">
                    {col.config.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-limestone-100">
                <td className="px-3 py-2 font-medium">After-Tax Wealth</td>
                {columns.map((col, i) => (
                  <td key={i} className="px-3 py-2 text-right font-medium">
                    {formatCurrency(col.summary.finalAfterTaxWealth)}
                  </td>
                ))}
              </tr>
              <tr className="border-t border-limestone-100">
                <td className="px-3 py-2 font-medium">Total Tax Savings</td>
                {columns.map((col, i) => (
                  <td key={i} className={`px-3 py-2 text-right ${col.summary.totalTaxSavings > 0 ? 'text-success-500 font-medium' : ''}`}>
                    {formatCurrency(col.summary.totalTaxSavings)}
                  </td>
                ))}
              </tr>
              <tr className="border-t border-limestone-100">
                <td className="px-3 py-2 font-medium">Net Tax Alpha</td>
                {columns.map((col, i) => (
                  <td key={i} className={`px-3 py-2 text-right ${col.summary.netTaxAlpha > 0 ? 'text-success-500' : col.summary.netTaxAlpha < 0 ? 'text-critical-500' : ''}`}>
                    {formatCurrency(col.summary.netTaxAlpha)}
                  </td>
                ))}
              </tr>
              <tr className="border-t border-limestone-100">
                <td className="px-3 py-2 font-medium">Annualized Net Alpha</td>
                {columns.map((col, i) => (
                  <td key={i} className="px-3 py-2 text-right">
                    {formatCurrency(col.summary.annualizedNetAlpha)}/yr
                  </td>
                ))}
              </tr>
              <tr className="border-t border-limestone-100">
                <td className="px-3 py-2 font-medium">Years to Target</td>
                {columns.map((col, i) => (
                  <td key={i} className="px-3 py-2 text-right">
                    {col.summary.yearsToTarget !== null ? `${col.summary.yearsToTarget} yr` : 'N/A'}
                  </td>
                ))}
              </tr>
              <tr className="border-t border-limestone-100">
                <td className="px-3 py-2 font-medium">Final Concentration</td>
                {columns.map((col, i) => (
                  <td key={i} className="px-3 py-2 text-right">
                    {formatPercent(col.summary.finalConcentration)}
                  </td>
                ))}
              </tr>
              {holdCol && (
                <tr className="border-t-2 border-border-subtle bg-success-50">
                  <td className="px-3 py-2 font-semibold text-success-700">Wealth Delta vs. Hold</td>
                  {columns.map((col, i) => (
                    <td key={i} className={`px-3 py-2 text-right font-bold ${col.summary.wealthDeltaVsHold >= 0 ? 'text-success-700' : 'text-critical-700'}`}>
                      {col.config.type === 'hold' ? '--' : formatCurrency(col.summary.wealthDeltaVsHold)}
                    </td>
                  ))}
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
