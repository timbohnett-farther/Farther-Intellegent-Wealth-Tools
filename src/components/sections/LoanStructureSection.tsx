'use client';

import React from 'react';
import { LoanStructureResult, LoanConfig } from '@/lib/types';
import { formatCurrency, formatPercent } from '@/lib/format';

interface Props {
  data: LoanStructureResult;
  config: LoanConfig;
}

export default function LoanStructureSection({ data, config }: Props) {
  return (
    <div className="space-y-4">
      {/* Box Spread Construction */}
      <div className="card p-4">
        <h3 className="font-semibold text-sm mb-3">Box Spread Construction</h3>
        <div className="bg-linear-to-r from-brand-50 to-brand-100 rounded-lg p-4">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="bg-surface-soft rounded-lg p-3 shadow-sm border border-brand-100">
              <p className="text-xs text-text-muted mb-1">Bull Call Spread</p>
              <div className="text-sm">
                <p className="text-success-500 font-medium">Buy Call K1</p>
                <p className="text-critical-500 font-medium">Sell Call K2</p>
              </div>
            </div>
            <div className="bg-surface-soft rounded-lg p-3 shadow-sm border border-brand-100">
              <p className="text-xs text-text-muted mb-1">Bear Put Spread</p>
              <div className="text-sm">
                <p className="text-success-500 font-medium">Buy Put K2</p>
                <p className="text-critical-500 font-medium">Sell Put K1</p>
              </div>
            </div>
          </div>
          <div className="mt-3 text-center">
            <p className="text-xs text-text-muted">Strike Width: {data.strikeWidth} points | Multiplier: ${data.multiplier} | Contracts: {data.contracts}</p>
          </div>
        </div>
      </div>

      {/* Pricing Details */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-border-subtle bg-transparent">
          <h3 className="font-semibold text-sm">Loan Structure & Pricing</h3>
        </div>
        <div className="divide-y divide-limestone-100">
          {[
            ['Strike Width (K2 - K1)', `${data.strikeWidth} points`],
            ['Multiplier', `$${data.multiplier}`],
            ['Contracts Needed', data.contracts.toString()],
            ['Face Value at Expiration', formatCurrency(data.faceValue)],
            ['Net Premium Received Today', formatCurrency(data.netPremium)],
            ['Implied Interest Cost', formatCurrency(data.impliedInterestCost)],
            ['Annualized Rate (365-day)', formatPercent(data.annualizedRate)],
            ['+ Manager Fee', formatPercent(config.managerFee)],
          ].map(([label, value], i) => (
            <div key={i} className="flex justify-between px-4 py-2.5 text-sm">
              <span className="text-text-muted">{label}</span>
              <span className="font-medium">{value}</span>
            </div>
          ))}
          <div className="flex justify-between px-4 py-3 text-sm bg-accent-primary/10 font-semibold">
            <span className="text-accent-primarySoft">All-In Borrowing Rate</span>
            <span className="text-accent-primarySoft">{formatPercent(data.allInRate)}</span>
          </div>
        </div>
      </div>

      {/* Actual Proceeds */}
      <div className="card p-4">
        <h3 className="font-semibold text-sm mb-3">Proceeds Summary</h3>
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-3 bg-success-50 rounded-lg">
            <p className="text-xs text-text-muted mb-1">Proceeds Received</p>
            <p className="text-lg font-bold text-success-700">{formatCurrency(data.actualProceeds)}</p>
          </div>
          <div className="text-center p-3 bg-critical-50 rounded-lg">
            <p className="text-xs text-text-muted mb-1">Repayment Due</p>
            <p className="text-lg font-bold text-critical-700">{formatCurrency(data.actualRepayment)}</p>
          </div>
          <div className="text-center p-3 bg-transparent rounded-lg">
            <p className="text-xs text-text-muted mb-1">Interest Paid</p>
            <p className="text-lg font-bold text-text-muted">{formatCurrency(data.interestPaid)}</p>
          </div>
        </div>
        <p className="text-xs text-text-muted mt-3 text-center">
          To borrow approximately {formatCurrency(config.loanAmount)}, you would need {data.contracts} contracts with a {data.strikeWidth}-point strike width.
        </p>
      </div>
    </div>
  );
}
