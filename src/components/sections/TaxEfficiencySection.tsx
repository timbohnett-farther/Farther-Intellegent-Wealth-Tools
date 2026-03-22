'use client';

import React from 'react';
import { TaxAnalysisResult } from '@/lib/types';
import { formatCurrency, formatPercent } from '@/lib/format';

interface Props {
  data: TaxAnalysisResult;
}

export default function TaxEfficiencySection({ data }: Props) {
  const deductionLabel = {
    full: 'Full deduction available — annual capital gains exceed box spread interest',
    partial: 'Partial deduction — gains plus $3,000 ordinary income offset cover interest',
    limited: 'Limited deduction — excess losses will carry forward to future years',
  };

  return (
    <div className="space-y-4">
      {/* After-Tax Rate Card */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="card p-4 text-center bg-gradient-to-b from-brand-50 to-white">
          <p className="text-xs text-charcoal-500 mb-1">Blended 1256 Tax Rate</p>
          <p className="text-2xl font-bold text-brand-700">{formatPercent(data.blended1256Rate)}</p>
          <p className="text-[10px] text-charcoal-300 mt-1">60% LTCG / 40% STCG</p>
        </div>
        <div className="card p-4 text-center bg-gradient-to-b from-success-50 to-white">
          <p className="text-xs text-charcoal-500 mb-1">After-Tax Effective Rate</p>
          <p className="text-2xl font-bold text-success-700">{formatPercent(data.afterTaxRate)}</p>
          <p className="text-[10px] text-charcoal-300 mt-1">All-in rate x (1 - blended rate)</p>
        </div>
        <div className="card p-4 text-center bg-gradient-to-b from-emerald-50 to-white">
          <p className="text-xs text-charcoal-500 mb-1">Total Tax Savings</p>
          <p className="text-2xl font-bold text-emerald-700">{formatCurrency(data.totalTaxSavings)}</p>
          <p className="text-[10px] text-charcoal-300 mt-1">Over the loan term</p>
        </div>
      </div>

      {/* Deduction Status */}
      <div className={`card p-3 text-sm ${data.deductionType === 'full' ? 'border-success-200 bg-success-50' : data.deductionType === 'partial' ? 'border-warning-200 bg-warning-50' : 'border-critical-200 bg-critical-50'}`}>
        <p className="font-medium">{deductionLabel[data.deductionType]}</p>
        {data.carryforward > 0 && (
          <p className="text-xs mt-1 text-charcoal-500">Capital loss carryforward: {formatCurrency(data.carryforward)}</p>
        )}
      </div>

      {/* Annual Mark-to-Market Deduction Schedule */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-limestone-200 bg-limestone-50">
          <h3 className="font-semibold text-sm">Annual Mark-to-Market Deduction Schedule</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-limestone-50 border-b">
                <th className="text-left px-3 py-2 font-medium text-charcoal-500">Year</th>
                <th className="text-right px-3 py-2 font-medium text-charcoal-500">Accrued Interest</th>
                <th className="text-right px-3 py-2 font-medium text-charcoal-500">LT Loss (60%)</th>
                <th className="text-right px-3 py-2 font-medium text-charcoal-500">ST Loss (40%)</th>
                <th className="text-right px-3 py-2 font-medium text-charcoal-500">Gains Offset</th>
                <th className="text-right px-3 py-2 font-medium text-success-500">Tax Savings</th>
                <th className="text-right px-3 py-2 font-medium text-charcoal-500">Net Cost</th>
              </tr>
            </thead>
            <tbody>
              {data.annualSchedule.map((row) => (
                <tr key={row.year} className="border-t border-limestone-100">
                  <td className="px-3 py-2 font-medium">{row.year}</td>
                  <td className="px-3 py-2 text-right">{formatCurrency(row.accruedInterest)}</td>
                  <td className="px-3 py-2 text-right">{formatCurrency(row.ltLoss)}</td>
                  <td className="px-3 py-2 text-right">{formatCurrency(row.stLoss)}</td>
                  <td className="px-3 py-2 text-right">{formatCurrency(row.gainsOffset)}</td>
                  <td className="px-3 py-2 text-right font-medium text-success-500">{formatCurrency(row.taxSavings)}</td>
                  <td className="px-3 py-2 text-right">{formatCurrency(row.netCost)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-limestone-300 bg-limestone-50 font-semibold">
                <td className="px-3 py-2">Total</td>
                <td className="px-3 py-2 text-right">{formatCurrency(data.annualSchedule.reduce((s, r) => s + r.accruedInterest, 0))}</td>
                <td className="px-3 py-2 text-right">{formatCurrency(data.annualSchedule.reduce((s, r) => s + r.ltLoss, 0))}</td>
                <td className="px-3 py-2 text-right">{formatCurrency(data.annualSchedule.reduce((s, r) => s + r.stLoss, 0))}</td>
                <td className="px-3 py-2 text-right">{formatCurrency(data.annualSchedule.reduce((s, r) => s + r.gainsOffset, 0))}</td>
                <td className="px-3 py-2 text-right text-success-500">{formatCurrency(data.totalTaxSavings)}</td>
                <td className="px-3 py-2 text-right">{formatCurrency(data.annualSchedule.reduce((s, r) => s + r.netCost, 0))}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Grand Comparison: Tax-Deductible vs Non-Deductible */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-limestone-200 bg-limestone-50">
          <h3 className="font-semibold text-sm">After-Tax Cost: Deductible vs. Non-Deductible Interest</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-limestone-50 border-b">
                <th className="text-left px-3 py-2 font-medium text-charcoal-500">Method</th>
                <th className="text-right px-3 py-2 font-medium">Pre-Tax Interest</th>
                <th className="text-right px-3 py-2 font-medium text-success-500">Tax Benefit</th>
                <th className="text-right px-3 py-2 font-medium">After-Tax Cost</th>
                <th className="text-right px-3 py-2 font-medium text-success-500">Savings vs. Box</th>
              </tr>
            </thead>
            <tbody>
              {[
                { name: 'Box Spread', ...data.grandComparison.boxSpread, color: 'text-brand-700', isSelf: true },
                { name: 'Margin Loan', ...data.grandComparison.marginLoan, color: 'text-charcoal-500', isSelf: false },
                { name: 'SBLOC', ...data.grandComparison.sbloc, color: 'text-orange-600', isSelf: false },
                { name: 'HELOC', ...data.grandComparison.heloc, color: 'text-brand-700', isSelf: false },
              ].map((row) => (
                <tr key={row.name} className="border-t border-limestone-100">
                  <td className={`px-3 py-2 font-medium ${row.color}`}>{row.name}</td>
                  <td className="px-3 py-2 text-right">{formatCurrency(row.preTaxInterest)}</td>
                  <td className="px-3 py-2 text-right text-success-500">{row.taxBenefit > 0 ? `(${formatCurrency(row.taxBenefit)})` : '--'}</td>
                  <td className="px-3 py-2 text-right font-medium">{formatCurrency(row.afterTaxCost)}</td>
                  <td className="px-3 py-2 text-right font-bold text-success-700">
                    {row.isSelf ? '--' : formatCurrency(row.afterTaxCost - data.grandComparison.boxSpread.afterTaxCost)}
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
