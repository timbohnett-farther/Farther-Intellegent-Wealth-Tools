'use client';

import React from 'react';
import { CalculatorInputs, FilingStatus, MarginType, PortfolioComposition, LoanTerm } from '@/lib/types';
import { STATE_TAX_RATES } from '@/lib/data/stateTaxRates';

interface InputPanelProps {
  inputs: CalculatorInputs;
  onChange: (inputs: CalculatorInputs) => void;
}

const FILING_STATUSES: { value: FilingStatus; label: string }[] = [
  { value: 'single', label: 'Single' },
  { value: 'mfj', label: 'Married Filing Jointly' },
  { value: 'mfs', label: 'Married Filing Separately' },
  { value: 'hoh', label: 'Head of Household' },
];

const LOAN_TERMS: { value: LoanTerm; label: string }[] = [
  { value: 0.5, label: '6 months' },
  { value: 1, label: '1 year' },
  { value: 2, label: '2 years' },
  { value: 3, label: '3 years' },
  { value: 5, label: '5 years' },
];

const states = Object.entries(STATE_TAX_RATES)
  .map(([abbr, info]) => ({ value: abbr, label: info.name }))
  .sort((a, b) => a.label.localeCompare(b.label));

export default function InputPanel({ inputs, onChange }: InputPanelProps) {
  const [showAdvanced, setShowAdvanced] = React.useState(false);

  const update = (path: string, value: number | string) => {
    const newInputs = JSON.parse(JSON.stringify(inputs)) as CalculatorInputs;
    const parts = path.split('.');
    let obj: Record<string, unknown> = newInputs as unknown as Record<string, unknown>;
    for (let i = 0; i < parts.length - 1; i++) {
      obj = obj[parts[i]] as Record<string, unknown>;
    }
    obj[parts[parts.length - 1]] = value;
    onChange(newInputs as CalculatorInputs);
  };

  const CurrencyInput = ({ label, value, path, tooltip }: { label: string; value: number; path: string; tooltip?: string }) => (
    <div className="mb-3">
      <label className="label" title={tooltip}>{label}</label>
      <div className="relative">
        <span className="absolute left-3 top-2 text-gray-400 text-sm">$</span>
        <input
          type="text"
          className="input-field pl-7"
          value={value ? value.toLocaleString() : ''}
          onChange={(e) => {
            const raw = e.target.value.replace(/[^0-9]/g, '');
            update(path, raw ? parseInt(raw) : 0);
          }}
        />
      </div>
    </div>
  );

  const PercentInput = ({ label, value, path, min = 0, max = 100, step = 0.05, tooltip }: {
    label: string; value: number; path: string; min?: number; max?: number; step?: number; tooltip?: string;
  }) => (
    <div className="mb-3">
      <label className="label" title={tooltip}>{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="range"
          className="flex-1 h-1.5 accent-blue-500"
          min={min}
          max={max}
          step={step}
          value={value * 100}
          onChange={(e) => update(path, parseFloat(e.target.value) / 100)}
        />
        <span className="text-sm font-mono w-16 text-right">{(value * 100).toFixed(2)}%</span>
      </div>
    </div>
  );

  const maxLoan = inputs.loan.portfolioValue * 0.50;

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <h3 className="text-sm font-semibold text-gray-800 mb-3 uppercase tracking-wider">Portfolio & Loan</h3>

        <CurrencyInput
          label="Portfolio Value"
          value={inputs.loan.portfolioValue}
          path="loan.portfolioValue"
          tooltip="Total taxable brokerage account value"
        />

        <CurrencyInput
          label="Loan Amount Needed"
          value={inputs.loan.loanAmount}
          path="loan.loanAmount"
          tooltip={`Max: ${maxLoan.toLocaleString()} (50% Reg T)`}
        />
        {inputs.loan.loanAmount > maxLoan && (
          <p className="text-xs text-danger -mt-2 mb-2">Exceeds 50% Reg T maximum</p>
        )}

        <div className="mb-3">
          <label className="label">Loan Term</label>
          <select
            className="input-field"
            value={inputs.loan.termYears}
            onChange={(e) => update('loan.termYears', parseFloat(e.target.value))}
          >
            {LOAN_TERMS.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        <CurrencyInput
          label="Cost Basis of Portfolio"
          value={inputs.portfolio.costBasis}
          path="portfolio.costBasis"
        />
      </div>

      <div className="card p-4">
        <h3 className="text-sm font-semibold text-gray-800 mb-3 uppercase tracking-wider">Tax Information</h3>

        <div className="mb-3">
          <label className="label">Filing Status</label>
          <select
            className="input-field"
            value={inputs.tax.filingStatus}
            onChange={(e) => update('tax.filingStatus', e.target.value)}
          >
            {FILING_STATUSES.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>

        <CurrencyInput
          label="Taxable Income"
          value={inputs.tax.taxableIncome}
          path="tax.taxableIncome"
        />

        <div className="mb-3">
          <label className="label">State</label>
          <select
            className="input-field"
            value={inputs.tax.state}
            onChange={(e) => update('tax.state', e.target.value)}
          >
            {states.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>

        <CurrencyInput
          label="Annual Capital Gains Realized"
          value={inputs.tax.annualCGRealized}
          path="tax.annualCGRealized"
          tooltip="For tax offset modeling"
        />
      </div>

      <div className="card p-4">
        <h3 className="text-sm font-semibold text-gray-800 mb-3 uppercase tracking-wider">Rates</h3>

        <PercentInput label="Box Spread Implied Rate" value={inputs.loan.boxRate} path="loan.boxRate" min={2} max={8} step={0.05} />
        <PercentInput label="Manager/Platform Fee" value={inputs.loan.managerFee} path="loan.managerFee" min={0} max={1.5} step={0.05} />

        <div className="border-t border-gray-200 mt-3 pt-3">
          <p className="text-xs text-gray-500 mb-2 uppercase tracking-wider">Comparison Rates</p>
          <PercentInput label="Margin Loan Rate" value={inputs.comparison.marginRate} path="comparison.marginRate" min={3} max={15} step={0.1} />
          <PercentInput label="SBLOC Rate" value={inputs.comparison.sblocRate} path="comparison.sblocRate" min={2} max={12} step={0.1} />
          <PercentInput label="HELOC Rate" value={inputs.comparison.helocRate} path="comparison.helocRate" min={3} max={15} step={0.1} />
        </div>
      </div>

      <div className="card p-4">
        <button
          className="flex items-center justify-between w-full text-sm font-semibold text-gray-800 uppercase tracking-wider"
          onClick={() => setShowAdvanced(!showAdvanced)}
        >
          <span>Advanced Settings</span>
          <span className="text-lg">{showAdvanced ? '\u25B2' : '\u25BC'}</span>
        </button>

        {showAdvanced && (
          <div className="mt-3 space-y-1">
            <PercentInput label="Expected Portfolio Return" value={inputs.portfolio.expectedReturn} path="portfolio.expectedReturn" min={0} max={20} step={0.5} />
            <PercentInput label="Portfolio Volatility (Std Dev)" value={inputs.portfolio.volatility} path="portfolio.volatility" min={5} max={40} step={0.5} />

            <div className="mb-3">
              <label className="label">Margin Type</label>
              <div className="flex gap-2">
                {(['reg_t', 'portfolio_margin'] as MarginType[]).map(mt => (
                  <button
                    key={mt}
                    className={`flex-1 py-1.5 px-3 text-xs rounded-lg border transition-colors ${
                      inputs.loan.marginType === mt
                        ? 'bg-blue-50 border-blue-500 text-blue-700'
                        : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                    }`}
                    onClick={() => update('loan.marginType', mt)}
                  >
                    {mt === 'reg_t' ? 'Reg T' : 'Portfolio Margin'}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-3">
              <label className="label">Portfolio Composition</label>
              <select
                className="input-field"
                value={inputs.loan.portfolioComposition}
                onChange={(e) => update('loan.portfolioComposition', e.target.value)}
              >
                <option value="equities">All Equities</option>
                <option value="etfs">All ETFs</option>
                <option value="mixed">Mixed</option>
              </select>
            </div>
          </div>
        )}
      </div>

      <div className="text-[10px] text-gray-400 leading-tight px-1">
        This tool is for educational and illustrative purposes only and does not constitute investment, tax, or legal advice.
      </div>
    </div>
  );
}
