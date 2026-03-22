'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth, useToast } from '@/lib/tax-planning/auth-context';
import type {
  SBLOCResult,
  MarginLoanResult,
  LTVRating,
  MarginCallAnalysis,
} from '@/lib/debt-engine/types';

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------

const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const fmtDec = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtPct = new Intl.NumberFormat('en-US', { style: 'percent', minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ---------------------------------------------------------------------------
// Tab type
// ---------------------------------------------------------------------------

type SecuritiesTab = 'sbloc' | 'margin';

const TABS: { key: SecuritiesTab; label: string }[] = [
  { key: 'sbloc', label: 'SBLOC Analyzer' },
  { key: 'margin', label: 'Margin Loan Risk' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function CardSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.07] backdrop-blur-xl p-6 animate-pulse space-y-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-4 rounded bg-white/[0.06]" style={{ width: `${65 + Math.random() * 35}%` }} />
      ))}
    </div>
  );
}

function InputField({ label, value, onChange, prefix, suffix, min, max, step }: {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  prefix?: string;
  suffix?: string;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-white/50 mb-1">{label}</label>
      <div className="relative">
        {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-white/30">{prefix}</span>}
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          min={min}
          max={max}
          step={step}
          className={`w-full rounded-2xl border border-white/[0.06] bg-white/[0.07] backdrop-blur-xl py-2 text-sm text-white placeholder:text-white/30 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 ${prefix ? 'pl-7 pr-3' : suffix ? 'pl-3 pr-8' : 'px-3'}`}
        />
        {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-white/30">{suffix}</span>}
      </div>
    </div>
  );
}

function SelectField({ label, value, onChange, options }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-white/50 mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl border border-white/[0.06] bg-white/[0.07] backdrop-blur-xl py-2 px-3 text-sm text-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

// ---------------------------------------------------------------------------
// LTV Rating Badge
// ---------------------------------------------------------------------------

const LTV_STYLES: Record<LTVRating, { bg: string; text: string }> = {
  CONSERVATIVE: { bg: 'bg-success-100', text: 'text-success-700' },
  MODERATE: { bg: 'bg-warning-100', text: 'text-warning-700' },
  AGGRESSIVE: { bg: 'bg-critical-100', text: 'text-critical-700' },
};

function LTVBadge({ rating }: { rating: LTVRating }) {
  const style = LTV_STYLES[rating];
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${style.bg} ${style.text}`}>
      {rating}
    </span>
  );
}

// ---------------------------------------------------------------------------
// SBLOC Analyzer Tab
// ---------------------------------------------------------------------------

function SBLOCTab({ token }: { token: string | null }) {
  const { addToast } = useToast();
  const [portfolioValue, setPortfolioValue] = useState('2000000');
  const [eligibleCollateral, setEligibleCollateral] = useState('1600000');
  const [loanAmount, setLoanAmount] = useState('500000');
  const [rate, setRate] = useState('5.25');
  const [purpose, setPurpose] = useState('REAL_ESTATE');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SBLOCResult | null>(null);

  const analyze = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/v1/debt-iq/analysis/securities/sbloc', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          portfolio: { totalValue: Number(portfolioValue), eligibleCollateral: Number(eligibleCollateral) },
          proposedLoan: { amount: Number(loanAmount), purpose, rate: Number(rate) / 100, termMonths: 60, interestOnly: true },
        }),
      });
      if (!res.ok) throw new Error('SBLOC analysis failed');
      setResult(await res.json());
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Analysis failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Inputs */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.07] backdrop-blur-xl p-6">
        <h3 className="text-sm font-semibold text-white mb-4">Portfolio & Loan Details</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <InputField label="Portfolio Value" value={portfolioValue} onChange={setPortfolioValue} prefix="$" />
          <InputField label="Eligible Collateral" value={eligibleCollateral} onChange={setEligibleCollateral} prefix="$" />
          <InputField label="Loan Amount" value={loanAmount} onChange={setLoanAmount} prefix="$" />
          <InputField label="Rate (%)" value={rate} onChange={setRate} suffix="%" step={0.25} />
          <SelectField label="Purpose" value={purpose} onChange={setPurpose} options={[
            { value: 'REAL_ESTATE', label: 'Real Estate Purchase' },
            { value: 'BRIDGE_LOAN', label: 'Bridge Loan' },
            { value: 'TAX_PLANNING', label: 'Tax Planning' },
            { value: 'BUSINESS', label: 'Business Investment' },
            { value: 'LIFESTYLE', label: 'Lifestyle / Purchase' },
            { value: 'OTHER', label: 'Other' },
          ]} />
        </div>
        <button onClick={analyze} disabled={loading} className="mt-4 rounded-lg bg-teal-500 px-6 py-2 text-sm font-medium text-white hover:bg-teal-400 disabled:opacity-50 transition-colors shadow-sm">
          {loading ? 'Analyzing...' : 'Analyze SBLOC'}
        </button>
      </div>

      {loading && <CardSkeleton rows={10} />}

      {result && (
        <div className="space-y-6">
          {/* Key metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.07] backdrop-blur-xl p-4">
              <p className="text-xs text-white/50">Max Borrowing Power</p>
              <p className="text-xl font-bold text-white">{fmt.format(result.maxBorrowingPower)}</p>
            </div>
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.07] backdrop-blur-xl p-4">
              <p className="text-xs text-white/50">Loan-to-Value</p>
              <p className="text-xl font-bold text-white">{fmtPct.format(result.loanToValue)}</p>
            </div>
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.07] backdrop-blur-xl p-4">
              <p className="text-xs text-white/50">LTV Rating</p>
              <div className="mt-1"><LTVBadge rating={result.ltvRating} /></div>
            </div>
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.07] backdrop-blur-xl p-4">
              <p className="text-xs text-white/50">Annual Interest Cost</p>
              <p className="text-xl font-bold text-white">{fmt.format(result.costAnalysis.annualInterestCost)}</p>
            </div>
          </div>

          {/* Margin call analysis */}
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.07] backdrop-blur-xl p-6">
            <h3 className="text-sm font-semibold text-white mb-4">Margin Call Analysis</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div>
                <p className="text-xs text-white/50">Call Threshold</p>
                <p className="text-lg font-bold text-white">{fmtPct.format(result.marginCallAnalysis.marginCallThreshold)}</p>
              </div>
              <div>
                <p className="text-xs text-white/50">Buffer Amount</p>
                <p className="text-lg font-bold text-white">{fmt.format(result.marginCallAnalysis.bufferAmount)}</p>
              </div>
              <div>
                <p className="text-xs text-white/50">Portfolio Drop to Call</p>
                <p className={`text-lg font-bold ${result.marginCallAnalysis.portfolioDropToCall < -0.3 ? 'text-success-700' : result.marginCallAnalysis.portfolioDropToCall < -0.15 ? 'text-warning-700' : 'text-critical-700'}`}>
                  {fmtPct.format(result.marginCallAnalysis.portfolioDropToCall)}
                </p>
              </div>
              <div>
                <p className="text-xs text-white/50">Maintenance Call</p>
                <p className="text-lg font-bold text-white">{fmt.format(result.marginCallAnalysis.maintenanceCallAmount)}</p>
              </div>
            </div>

            {/* Probability estimates */}
            <div className="rounded-lg bg-transparent p-4">
              <p className="text-xs font-semibold uppercase text-white/30 mb-3">Margin Call Probability</p>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="text-center">
                  <p className="text-xs text-white/50 mb-1">Next 6 Months</p>
                  <p className={`text-lg font-bold ${result.marginCallAnalysis.probabilityOfCall.next6Months < 0.1 ? 'text-success-700' : result.marginCallAnalysis.probabilityOfCall.next6Months < 0.25 ? 'text-warning-700' : 'text-critical-700'}`}>
                    {fmtPct.format(result.marginCallAnalysis.probabilityOfCall.next6Months)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-white/50 mb-1">Next 12 Months</p>
                  <p className={`text-lg font-bold ${result.marginCallAnalysis.probabilityOfCall.next12Months < 0.15 ? 'text-success-700' : result.marginCallAnalysis.probabilityOfCall.next12Months < 0.3 ? 'text-warning-700' : 'text-critical-700'}`}>
                    {fmtPct.format(result.marginCallAnalysis.probabilityOfCall.next12Months)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-white/50 mb-1">Next Bear Market</p>
                  <p className={`text-lg font-bold ${result.marginCallAnalysis.probabilityOfCall.nextBearMarket < 0.3 ? 'text-warning-700' : 'text-critical-700'}`}>
                    {fmtPct.format(result.marginCallAnalysis.probabilityOfCall.nextBearMarket)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Cost comparison */}
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.07] backdrop-blur-xl p-6">
            <h3 className="text-sm font-semibold text-white mb-4">Cost Comparison</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* vs Liquidating */}
              <div className="rounded-lg bg-transparent p-4">
                <p className="text-xs font-semibold uppercase text-white/30 mb-3">vs. Liquidating Portfolio</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-white/50">Capital Gains Tax Avoided</span>
                    <span className="font-mono text-success-700">{fmt.format(result.costAnalysis.vsLiquidatingPortfolio.capitalGainsTaxAvoided)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/50">Portfolio Growth Lost</span>
                    <span className="font-mono text-critical-700">{fmt.format(result.costAnalysis.vsLiquidatingPortfolio.portfolioGrowthLost)}</span>
                  </div>
                  <div className="flex justify-between border-t border-white/[0.06] pt-2">
                    <span className="text-white/60 font-medium">Net Advantage of SBLOC</span>
                    <span className={`font-mono font-semibold ${result.costAnalysis.vsLiquidatingPortfolio.netAdvantageOfSBLOC > 0 ? 'text-success-700' : 'text-critical-700'}`}>
                      {fmt.format(result.costAnalysis.vsLiquidatingPortfolio.netAdvantageOfSBLOC)}
                    </span>
                  </div>
                </div>
              </div>
              {/* vs Mortgage */}
              <div className="rounded-lg bg-transparent p-4">
                <p className="text-xs font-semibold uppercase text-white/30 mb-3">vs. Mortgage</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-white/50">Mortgage Interest</span>
                    <span className="font-mono text-white/60">{fmt.format(result.costAnalysis.vsMortgage.mortgageInterest)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/50">SBLOC Interest</span>
                    <span className="font-mono text-white/60">{fmt.format(result.costAnalysis.vsMortgage.sblocInterest)}</span>
                  </div>
                  <div className="flex justify-between border-t border-white/[0.06] pt-2">
                    <span className="text-white/60 font-medium">Net Difference</span>
                    <span className="font-mono font-semibold text-white">{fmt.format(result.costAnalysis.vsMortgage.netDifference)}</span>
                  </div>
                  <p className="text-xs text-white/50">{result.costAnalysis.vsMortgage.speedAdvantage}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Rate stress test */}
          {result.rateStressTest && result.rateStressTest.length > 0 && (
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.07] backdrop-blur-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-limestone-100">
                <h3 className="text-sm font-semibold text-white">Rate Stress Test</h3>
              </div>
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-limestone-100 bg-transparent/50">
                    <th className="px-4 py-3 text-xs font-semibold uppercase text-white/30">Scenario</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase text-white/30 text-right">New Monthly Payment</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase text-white/30 text-right">Annual Cost Increase</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase text-white/30">Recommendation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-limestone-100">
                  {result.rateStressTest.map((test, i) => (
                    <tr key={i} className="hover:bg-white/[0.04]/50">
                      <td className="px-4 py-3 font-medium text-white">{test.rateScenario}</td>
                      <td className="px-4 py-3 text-right font-mono text-white/60">{fmtDec.format(test.newMonthlyPayment)}</td>
                      <td className="px-4 py-3 text-right font-mono text-critical-700">{fmt.format(test.annualCostIncrease)}</td>
                      <td className="px-4 py-3 text-white/50">{test.recommendation}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Risk warnings */}
          {result.riskWarnings && result.riskWarnings.length > 0 && (
            <div className="rounded-lg border border-warning-200 bg-warning-50 p-4">
              <p className="text-xs font-semibold uppercase text-warning-600 mb-2">Risk Warnings</p>
              <ul className="space-y-1">
                {result.riskWarnings.map((warning, i) => (
                  <li key={i} className="text-sm text-warning-700 flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-warning-500 flex-shrink-0" />
                    {warning}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Recommendation */}
          <div className="rounded-lg border border-info-200 bg-info-50 p-4">
            <p className="text-sm font-medium text-info-700">{result.recommendation}</p>
            {result.taxStrategy && (
              <p className="text-xs text-info-600 mt-1">{result.taxStrategy}</p>
            )}
          </div>
        </div>
      )}

      {!loading && !result && (
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.07] backdrop-blur-xl p-12 text-center">
          <p className="text-sm text-white/50">Enter your portfolio and loan details to analyze a Securities-Backed Line of Credit.</p>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Margin Loan Risk Tab
// ---------------------------------------------------------------------------

function MarginLoanTab({ token }: { token: string | null }) {
  const { addToast } = useToast();
  const [portfolioValue, setPortfolioValue] = useState('1000000');
  const [marginableValue, setMarginableValue] = useState('900000');
  const [proposedBorrow, setProposedBorrow] = useState('300000');
  const [marginRate, setMarginRate] = useState('7.5');
  const [volatility, setVolatility] = useState('16');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MarginLoanResult | null>(null);

  const analyze = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/v1/debt-iq/analysis/securities/margin', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          portfolioValue: Number(portfolioValue),
          marginableValue: Number(marginableValue),
          proposedBorrow: Number(proposedBorrow),
          marginRate: Number(marginRate) / 100,
          portfolioVolatility: Number(volatility) / 100,
        }),
      });
      if (!res.ok) throw new Error('Margin loan analysis failed');
      setResult(await res.json());
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Analysis failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Inputs */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.07] backdrop-blur-xl p-6">
        <h3 className="text-sm font-semibold text-white mb-4">Margin Loan Details</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <InputField label="Portfolio Value" value={portfolioValue} onChange={setPortfolioValue} prefix="$" />
          <InputField label="Marginable Value" value={marginableValue} onChange={setMarginableValue} prefix="$" />
          <InputField label="Proposed Borrow" value={proposedBorrow} onChange={setProposedBorrow} prefix="$" />
          <InputField label="Margin Rate (%)" value={marginRate} onChange={setMarginRate} suffix="%" step={0.25} />
          <InputField label="Portfolio Volatility (%)" value={volatility} onChange={setVolatility} suffix="%" step={1} />
        </div>
        <button onClick={analyze} disabled={loading} className="mt-4 rounded-lg bg-teal-500 px-6 py-2 text-sm font-medium text-white hover:bg-teal-400 disabled:opacity-50 transition-colors shadow-sm">
          {loading ? 'Analyzing...' : 'Analyze Margin Risk'}
        </button>
      </div>

      {loading && <CardSkeleton rows={8} />}

      {result && (
        <div className="space-y-6">
          {/* Margin requirements */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.07] backdrop-blur-xl p-4">
              <p className="text-xs text-white/50">Reg T Initial Margin</p>
              <p className="text-xl font-bold text-white">{fmt.format(result.initialMarginRequired)}</p>
            </div>
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.07] backdrop-blur-xl p-4">
              <p className="text-xs text-white/50">Maintenance Margin</p>
              <p className="text-xl font-bold text-white">{fmtPct.format(result.maintenanceMarginLevel)}</p>
            </div>
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.07] backdrop-blur-xl p-4">
              <p className="text-xs text-white/50">Current Equity</p>
              <p className="text-xl font-bold text-white">{fmt.format(result.currentEquity)}</p>
            </div>
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.07] backdrop-blur-xl p-4">
              <p className="text-xs text-white/50">Equity Buffer</p>
              <p className={`text-xl font-bold ${result.bufferToMarginCall > 0 ? 'text-success-700' : 'text-critical-700'}`}>
                {fmt.format(result.bufferToMarginCall)}
              </p>
            </div>
          </div>

          {/* Risk metrics */}
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.07] backdrop-blur-xl p-6">
            <h3 className="text-sm font-semibold text-white mb-4">Risk Metrics</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-white/50">Drop to Margin Call</p>
                <p className={`text-lg font-bold ${result.portfolioDropToCall < -0.25 ? 'text-success-700' : result.portfolioDropToCall < -0.15 ? 'text-warning-700' : 'text-critical-700'}`}>
                  {fmtPct.format(result.portfolioDropToCall)}
                </p>
              </div>
              <div>
                <p className="text-xs text-white/50">Daily VaR (95%)</p>
                <p className="text-lg font-bold text-white">{fmt.format(result.dailyVaR)}</p>
              </div>
              <div>
                <p className="text-xs text-white/50">Margin Call Probability</p>
                <p className={`text-lg font-bold ${result.marginCallProbability < 0.1 ? 'text-success-700' : result.marginCallProbability < 0.25 ? 'text-warning-700' : 'text-critical-700'}`}>
                  {fmtPct.format(result.marginCallProbability)}
                </p>
              </div>
              <div>
                <p className="text-xs text-white/50">Annual Interest Cost</p>
                <p className="text-lg font-bold text-white">{fmt.format(result.annualInterestCost)}</p>
              </div>
            </div>
          </div>

          {/* Visual gauge for margin safety */}
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.07] backdrop-blur-xl p-6">
            <h3 className="text-sm font-semibold text-white mb-3">Margin Safety Gauge</h3>
            <div className="relative">
              <div className="h-4 rounded-full bg-linear-to-r from-critical-500 via-warning-500 to-success-500 overflow-hidden" />
              <div
                className="absolute top-0 h-4 w-1 bg-[#1a1a1a] rounded"
                style={{ left: `${Math.min(100, Math.max(0, Math.abs(result.portfolioDropToCall) * 200))}%` }}
                title={`Drop tolerance: ${fmtPct.format(result.portfolioDropToCall)}`}
              />
            </div>
            <div className="flex justify-between mt-1 text-xs text-white/30">
              <span>Danger (0%)</span>
              <span>Caution (25%)</span>
              <span>Safe (50%+)</span>
            </div>
          </div>

          {/* Red flags */}
          {result.redFlags && result.redFlags.length > 0 && (
            <div className="rounded-lg border border-critical-200 bg-critical-50 p-4">
              <p className="text-xs font-semibold uppercase text-critical-600 mb-2">Red Flags</p>
              <ul className="space-y-1">
                {result.redFlags.map((flag, i) => (
                  <li key={i} className="text-sm text-critical-700 flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-critical-500 flex-shrink-0" />
                    {flag}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Recommendation */}
          <div className="rounded-lg border border-info-200 bg-info-50 p-4">
            <p className="text-sm font-medium text-info-700">{result.recommendation}</p>
          </div>
        </div>
      )}

      {!loading && !result && (
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.07] backdrop-blur-xl p-12 text-center">
          <p className="text-sm text-white/50">Enter your portfolio and margin loan details to analyze risk exposure.</p>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function SecuritiesLendingPage() {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState<SecuritiesTab>('sbloc');

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header */}
      <div>
        <nav className="flex items-center gap-1 text-sm text-white/30 mb-1">
          <Link href="/tax-planning/debt-iq" className="hover:text-teal-300 transition-colors">Debt IQ</Link>
          <span>/</span>
          <span className="text-white/60">Securities-Backed Lending</span>
        </nav>
        <h1 className="font-serif text-3xl text-white tracking-wide">Securities-Backed Lending</h1>
        <p className="mt-1 text-sm text-white/50">SBLOC analysis, margin call risk, and cost comparison tools</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-white/[0.06]">
        <nav className="flex gap-6" role="tablist">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              role="tab"
              aria-selected={activeTab === tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-teal-500 text-teal-300'
                  : 'border-transparent text-white/30 hover:text-white/60'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      {activeTab === 'sbloc' && <SBLOCTab token={token} />}
      {activeTab === 'margin' && <MarginLoanTab token={token} />}
    </div>
  );
}
