'use client';

import React from 'react';
import { LiquidationComparisonResult } from '@/lib/types';
import { formatCurrency } from '@/lib/format';

interface Props {
  data: LiquidationComparisonResult;
}

export default function LiquidationSection({ data }: Props) {
  return (
    <div className="space-y-4">
      {/* Tax Impact of Liquidation */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
          <h3 className="font-semibold text-sm">Tax Impact of Liquidation</h3>
        </div>
        <div className="divide-y divide-gray-100">
          {[
            ['Unrealized Gain in Portfolio', formatCurrency(data.unrealizedGain)],
            ['Realized Gain on Sale', formatCurrency(data.realizedGain)],
            ['Federal LTCG Tax', formatCurrency(data.federalLTCGTax)],
            ['Net Investment Income Tax (NIIT)', formatCurrency(data.niitTax)],
            ['State Capital Gains Tax', formatCurrency(data.stateTax)],
          ].map(([label, value], i) => (
            <div key={i} className="flex justify-between px-4 py-2.5 text-sm">
              <span className="text-gray-600">{label}</span>
              <span className="font-medium">{value}</span>
            </div>
          ))}
          <div className="flex justify-between px-4 py-3 text-sm bg-red-50 font-semibold">
            <span className="text-red-800">Total Tax on Liquidation</span>
            <span className="text-red-800">{formatCurrency(data.totalTax)}</span>
          </div>
          <div className="flex justify-between px-4 py-2.5 text-sm">
            <span className="text-gray-600">Net After-Tax Proceeds</span>
            <span className="font-medium">{formatCurrency(data.netAfterTaxProceeds)}</span>
          </div>
        </div>
      </div>

      {/* Gross-Up Calculation */}
      <div className="card p-4">
        <h3 className="font-semibold text-sm mb-3">Gross-Up Required</h3>
        <p className="text-xs text-gray-500 mb-3">To receive the requested net amount, you must sell more to cover taxes.</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center p-3 bg-orange-50 rounded-lg">
            <p className="text-xs text-gray-500 mb-1">Must Sell (Gross-Up)</p>
            <p className="text-xl font-bold text-orange-700">{formatCurrency(data.grossUpAmount)}</p>
          </div>
          <div className="text-center p-3 bg-red-50 rounded-lg">
            <p className="text-xs text-gray-500 mb-1">Total Tax on Gross-Up</p>
            <p className="text-xl font-bold text-red-700">{formatCurrency(data.grossUpTax)}</p>
          </div>
        </div>
      </div>

      {/* AGI Impact */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
          <h3 className="font-semibold text-sm">AGI Impact Analysis</h3>
        </div>
        <div className="divide-y divide-gray-100">
          <div className="flex justify-between px-4 py-2.5 text-sm">
            <span className="text-gray-600">Current AGI</span>
            <span className="font-medium">{formatCurrency(data.agiImpact.currentAGI)}</span>
          </div>
          <div className="flex justify-between px-4 py-2.5 text-sm">
            <span className="text-gray-600">AGI After Sale</span>
            <span className="font-medium text-red-600">{formatCurrency(data.agiImpact.agiAfterSale)}</span>
          </div>
          <div className="flex justify-between px-4 py-2.5 text-sm">
            <span className="text-gray-600">IRMAA Medicare Surcharge</span>
            <span className="font-medium text-red-600">
              {data.agiImpact.irmaaSurcharge > 0 ? formatCurrency(data.agiImpact.irmaaSurcharge) + '/yr' : 'No impact'}
            </span>
          </div>
        </div>
      </div>

      {/* Total Cost Comparison */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
          <h3 className="font-semibold text-sm">Total Economic Cost: Sell vs. Borrow</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="text-left px-4 py-2 font-medium text-gray-600">Cost Component</th>
                <th className="text-right px-4 py-2 font-medium text-red-600">Sell Assets</th>
                <th className="text-right px-4 py-2 font-medium text-blue-600">Box Spread</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-gray-100">
                <td className="px-4 py-2">Capital Gains Tax</td>
                <td className="px-4 py-2 text-right text-red-600">{formatCurrency(data.totalTax)}</td>
                <td className="px-4 py-2 text-right text-blue-600">$0</td>
              </tr>
              <tr className="border-t border-gray-100">
                <td className="px-4 py-2">IRMAA Surcharge</td>
                <td className="px-4 py-2 text-right text-red-600">{formatCurrency(data.agiImpact.irmaaSurcharge)}</td>
                <td className="px-4 py-2 text-right text-blue-600">$0</td>
              </tr>
              <tr className="border-t border-gray-100">
                <td className="px-4 py-2">Interest Cost (after-tax)</td>
                <td className="px-4 py-2 text-right">$0</td>
                <td className="px-4 py-2 text-right">{formatCurrency(data.totalCostComparison.borrowTotal)}</td>
              </tr>
              <tr className="border-t-2 border-gray-300 bg-gray-50 font-semibold">
                <td className="px-4 py-2">Total Economic Cost</td>
                <td className="px-4 py-2 text-right text-red-700">{formatCurrency(data.totalCostComparison.sellTotal)}</td>
                <td className="px-4 py-2 text-right text-blue-700">{formatCurrency(data.totalCostComparison.borrowTotal)}</td>
              </tr>
              <tr className="bg-green-50 font-bold">
                <td className="px-4 py-2 text-green-800">Net Advantage of Borrowing</td>
                <td className="px-4 py-2 text-right"></td>
                <td className="px-4 py-2 text-right text-green-700">{formatCurrency(data.totalCostComparison.netAdvantage)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
