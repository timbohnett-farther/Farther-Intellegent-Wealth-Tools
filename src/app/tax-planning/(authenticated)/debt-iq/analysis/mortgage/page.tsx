'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth, useToast } from '@/lib/tax-planning/auth-context';
import type {
  RefinanceCurrentLoan,
  RefinanceProposedLoan,
  RefinanceScenarioResult,
  HomeEquityResult,
  MortgageVsInvestResult,
  PMIResult,
  EquityPurpose,
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

type MortgageTab = 'refinance' | 'equity' | 'invest' | 'pmi';

const TABS: { key: MortgageTab; label: string }[] = [
  { key: 'refinance', label: 'Refinance Calculator' },
  { key: 'equity', label: 'Home Equity Analyzer' },
  { key: 'invest', label: 'Mortgage vs. Invest' },
  { key: 'pmi', label: 'PMI Elimination' },
];

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function CardSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.07] backdrop-blur-xl p-6 animate-pulse space-y-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-4 rounded bg-white/[0.06]" style={{ width: `${70 + Math.random() * 30}%` }} />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared input component helpers
// ---------------------------------------------------------------------------

function InputField({ label, value, onChange, type = 'number', prefix, suffix, min, max, step, disabled }: {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  type?: string;
  prefix?: string;
  suffix?: string;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-white/50 mb-1">{label}</label>
      <div className="relative">
        {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-white/30">{prefix}</span>}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
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
// Refinance Calculator Tab
// ---------------------------------------------------------------------------

interface ProposedScenario {
  label: string;
  rate: string;
  termMonths: string;
  closingCosts: string;
}

function RefinanceTab({ token }: { token: string | null }) {
  const { addToast } = useToast();
  const [balance, setBalance] = useState('400000');
  const [rate, setRate] = useState('6.5');
  const [remainingTerm, setRemainingTerm] = useState('300');
  const [payment, setPayment] = useState('2800');
  const [scenarios, setScenarios] = useState<ProposedScenario[]>([
    { label: 'Scenario A', rate: '5.75', termMonths: '360', closingCosts: '6000' },
  ]);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<RefinanceScenarioResult[] | null>(null);

  const addScenario = () => {
    if (scenarios.length >= 3) return;
    setScenarios((prev) => [...prev, { label: `Scenario ${String.fromCharCode(65 + prev.length)}`, rate: '', termMonths: '360', closingCosts: '0' }]);
  };

  const removeScenario = (idx: number) => {
    setScenarios((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateScenario = (idx: number, field: keyof ProposedScenario, value: string) => {
    setScenarios((prev) => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s));
  };

  const runAnalysis = async () => {
    if (!token) return;
    setLoading(true);
    setResults(null);
    try {
      const body = {
        currentLoan: { balance: Number(balance), rate: Number(rate) / 100, remainingTermMonths: Number(remainingTerm), monthlyPayment: Number(payment) },
        proposedLoans: scenarios.map((s) => ({ label: s.label, newRate: Number(s.rate) / 100, newTermMonths: Number(s.termMonths), closingCosts: Number(s.closingCosts), discountPoints: 0, lenderCredit: 0 })),
      };
      const res = await fetch('/api/v1/debt-iq/analysis/mortgage/refinance', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Refinance analysis failed');
      const data = await res.json();
      setResults(data.scenarios ?? []);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Analysis failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Current loan */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.07] backdrop-blur-xl p-6">
        <h3 className="text-sm font-semibold text-white mb-4">Current Loan</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <InputField label="Balance" value={balance} onChange={setBalance} prefix="$" />
          <InputField label="Rate (%)" value={rate} onChange={setRate} suffix="%" step={0.125} />
          <InputField label="Remaining Term (mo)" value={remainingTerm} onChange={setRemainingTerm} />
          <InputField label="Monthly Payment" value={payment} onChange={setPayment} prefix="$" />
        </div>
      </div>

      {/* Proposed scenarios */}
      {scenarios.map((s, idx) => (
        <div key={idx} className="rounded-2xl border border-white/[0.06] bg-white/[0.07] backdrop-blur-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">{s.label}</h3>
            {scenarios.length > 1 && (
              <button onClick={() => removeScenario(idx)} className="text-xs text-critical-600 hover:text-critical-700">Remove</button>
            )}
          </div>
          <div className="grid grid-cols-3 gap-4">
            <InputField label="New Rate (%)" value={s.rate} onChange={(v) => updateScenario(idx, 'rate', v)} suffix="%" step={0.125} />
            <InputField label="New Term (months)" value={s.termMonths} onChange={(v) => updateScenario(idx, 'termMonths', v)} />
            <InputField label="Closing Costs" value={s.closingCosts} onChange={(v) => updateScenario(idx, 'closingCosts', v)} prefix="$" />
          </div>
        </div>
      ))}

      <div className="flex items-center gap-3">
        {scenarios.length < 3 && (
          <button onClick={addScenario} className="rounded-2xl border border-white/[0.06] bg-white/[0.07] backdrop-blur-xl px-4 py-2 text-sm font-medium text-white/60 hover:bg-white/[0.04] transition-colors">
            + Add Scenario
          </button>
        )}
        <button onClick={runAnalysis} disabled={loading} className="rounded-lg bg-teal-500 px-6 py-2 text-sm font-medium text-white hover:bg-teal-400 disabled:opacity-50 transition-colors shadow-sm">
          {loading ? 'Analyzing...' : 'Run Refinance Analysis'}
        </button>
      </div>

      {/* Results */}
      {loading && <CardSkeleton rows={6} />}
      {results && results.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold uppercase text-white/30">Results</h3>
          {results.map((r, idx) => (
            <div key={idx} className={`rounded-lg border p-6 ${r.recommendRefinance ? 'border-success-300 bg-success-50/30' : 'border-white/[0.06] bg-white/[0.07]'}`}>
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-base font-semibold text-white">{r.scenario}</h4>
                <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${r.recommendRefinance ? 'bg-success-100 text-success-700' : 'bg-warning-100 text-warning-700'}`}>
                  {r.recommendRefinance ? 'Recommended' : 'Not Recommended'}
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <p className="text-xs text-white/50">New Payment</p>
                  <p className="text-lg font-bold text-white">{fmtDec.format(r.newMonthlyPayment)}</p>
                </div>
                <div>
                  <p className="text-xs text-white/50">Monthly Savings</p>
                  <p className={`text-lg font-bold ${r.monthlyChange < 0 ? 'text-success-700' : 'text-critical-700'}`}>{fmtDec.format(Math.abs(r.monthlyChange))}/mo</p>
                </div>
                <div>
                  <p className="text-xs text-white/50">Break-Even</p>
                  <p className="text-lg font-bold text-white">{r.willBreakEven ? `${r.breakEvenMonths} months` : 'Never'}</p>
                </div>
                <div>
                  <p className="text-xs text-white/50">Total Interest Saved</p>
                  <p className="text-lg font-bold text-success-700">{fmt.format(r.totalInterestSavings)}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex justify-between"><span className="text-white/50">Current Total Interest</span><span className="font-mono text-white/60">{fmt.format(r.totalInterestCurrent)}</span></div>
                <div className="flex justify-between"><span className="text-white/50">New Total Interest</span><span className="font-mono text-white/60">{fmt.format(r.totalInterestNew)}</span></div>
                <div className="flex justify-between"><span className="text-white/50">After-Tax NPV</span><span className="font-mono text-white/60">{fmt.format(r.afterTaxNPV)}</span></div>
                <div className="flex justify-between"><span className="text-white/50">Net Savings After Costs</span><span className="font-mono text-success-700">{fmt.format(r.netSavingsAfterCosts)}</span></div>
              </div>
              <p className="mt-4 text-sm text-white/50 bg-transparent rounded-lg p-3">{r.recommendation}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Home Equity Analyzer Tab
// ---------------------------------------------------------------------------

function HomeEquityTab({ token }: { token: string | null }) {
  const { addToast } = useToast();
  const [homeValue, setHomeValue] = useState('600000');
  const [mortgageBalance, setMortgageBalance] = useState('350000');
  const [creditScore, setCreditScore] = useState('740');
  const [purpose, setPurpose] = useState<EquityPurpose>('HOME_IMPROVEMENT');
  const [amount, setAmount] = useState('50000');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<HomeEquityResult | null>(null);

  const analyze = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/v1/debt-iq/analysis/mortgage/home-equity', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ homeValue: Number(homeValue), mortgageBalance: Number(mortgageBalance), creditScore: Number(creditScore), purpose, amountNeeded: Number(amount) }),
      });
      if (!res.ok) throw new Error('Home equity analysis failed');
      setResult(await res.json());
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Analysis failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.07] backdrop-blur-xl p-6">
        <h3 className="text-sm font-semibold text-white mb-4">Property & Need</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <InputField label="Home Value" value={homeValue} onChange={setHomeValue} prefix="$" />
          <InputField label="Mortgage Balance" value={mortgageBalance} onChange={setMortgageBalance} prefix="$" />
          <InputField label="Credit Score" value={creditScore} onChange={setCreditScore} min={300} max={850} />
          <SelectField label="Purpose" value={purpose} onChange={(v) => setPurpose(v as EquityPurpose)} options={[
            { value: 'HOME_IMPROVEMENT', label: 'Home Improvement' },
            { value: 'DEBT_CONSOLIDATION', label: 'Debt Consolidation' },
            { value: 'INVESTMENT', label: 'Investment' },
            { value: 'EDUCATION', label: 'Education' },
            { value: 'EMERGENCY', label: 'Emergency' },
            { value: 'BUSINESS', label: 'Business' },
          ]} />
          <InputField label="Amount Needed" value={amount} onChange={setAmount} prefix="$" />
        </div>
        <button onClick={analyze} disabled={loading} className="mt-4 rounded-lg bg-teal-500 px-6 py-2 text-sm font-medium text-white hover:bg-teal-400 disabled:opacity-50 transition-colors shadow-sm">
          {loading ? 'Analyzing...' : 'Compare Options'}
        </button>
      </div>

      {loading && <CardSkeleton rows={8} />}

      {result && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.07] backdrop-blur-xl p-4 text-center">
              <p className="text-xs text-white/50">Current Equity</p>
              <p className="text-xl font-bold text-white">{fmt.format(result.currentEquity)}</p>
            </div>
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.07] backdrop-blur-xl p-4 text-center">
              <p className="text-xs text-white/50">Current LTV</p>
              <p className="text-xl font-bold text-white">{fmtPct.format(result.currentLTV)}</p>
            </div>
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.07] backdrop-blur-xl p-4 text-center">
              <p className="text-xs text-white/50">Max Borrowable</p>
              <p className="text-xl font-bold text-white">{fmt.format(result.maxBorrowable)}</p>
            </div>
          </div>

          {/* Comparison table */}
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.07] backdrop-blur-xl overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-limestone-100 bg-transparent/50">
                  <th className="px-4 py-3 text-xs font-semibold uppercase text-white/30">Feature</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase text-white/30">HELOC</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase text-white/30">Home Equity Loan</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase text-white/30">Cash-Out Refi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-limestone-100">
                <tr>
                  <td className="px-4 py-3 font-medium text-white/60">Rate</td>
                  <td className="px-4 py-3 font-mono">{fmtPct.format(result.options.heloc.estimatedRate)}</td>
                  <td className="px-4 py-3 font-mono">{fmtPct.format(result.options.homeEquityLoan.estimatedRate)}</td>
                  <td className="px-4 py-3 font-mono">{fmtPct.format(result.options.cashOutRefi.estimatedRate)}</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium text-white/60">Monthly Payment</td>
                  <td className="px-4 py-3 font-mono">{fmtDec.format(result.options.heloc.monthlyInterestOnly)}</td>
                  <td className="px-4 py-3 font-mono">{fmtDec.format(result.options.homeEquityLoan.monthlyPayment)}</td>
                  <td className="px-4 py-3 font-mono">{fmtDec.format(result.options.cashOutRefi.newMonthlyPayment)}</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium text-white/60">Total Interest</td>
                  <td className="px-4 py-3 font-mono">Variable</td>
                  <td className="px-4 py-3 font-mono">{fmt.format(result.options.homeEquityLoan.totalInterest)}</td>
                  <td className="px-4 py-3 font-mono">{fmt.format(result.options.cashOutRefi.totalInterest)}</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium text-white/60">Tax Deductible</td>
                  <td className="px-4 py-3">{result.options.heloc.interestDeductible ? 'Yes' : 'No'}</td>
                  <td className="px-4 py-3">{result.options.homeEquityLoan.interestDeductible ? 'Yes' : 'No'}</td>
                  <td className="px-4 py-3">Yes (mortgage interest)</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium text-white/60">Closing Costs</td>
                  <td className="px-4 py-3 font-mono">Low / None</td>
                  <td className="px-4 py-3 font-mono">Low</td>
                  <td className="px-4 py-3 font-mono">{fmt.format(result.options.cashOutRefi.closingCosts)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="rounded-lg border border-info-200 bg-info-50 p-4">
            <p className="text-sm font-medium text-info-700">{result.recommendation}</p>
            {result.taxNote && <p className="text-xs text-info-600 mt-1">{result.taxNote}</p>}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Mortgage vs Invest Tab
// ---------------------------------------------------------------------------

function MortgageVsInvestTab({ token }: { token: string | null }) {
  const { addToast } = useToast();
  const [balance, setBalance] = useState('350000');
  const [rate, setRate] = useState('6.5');
  const [extra, setExtra] = useState('1000');
  const [investReturn, setInvestReturn] = useState(8);
  const [horizon, setHorizon] = useState('20');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MortgageVsInvestResult | null>(null);

  const analyze = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/v1/debt-iq/analysis/mortgage/vs-invest', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ mortgageBalance: Number(balance), mortgageRate: Number(rate) / 100, monthlyExtraCapacity: Number(extra), investmentReturn: investReturn / 100, timeHorizon: Number(horizon) }),
      });
      if (!res.ok) throw new Error('Analysis failed');
      setResult(await res.json());
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Analysis failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const MILESTONES = [5, 10, 20, 30];

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.07] backdrop-blur-xl p-6">
        <h3 className="text-sm font-semibold text-white mb-4">Inputs</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <InputField label="Mortgage Balance" value={balance} onChange={setBalance} prefix="$" />
          <InputField label="Mortgage Rate (%)" value={rate} onChange={(v) => setRate(v)} suffix="%" step={0.125} />
          <InputField label="Extra Monthly Capacity" value={extra} onChange={setExtra} prefix="$" />
          <InputField label="Time Horizon (years)" value={horizon} onChange={setHorizon} />
        </div>
        <div className="mt-4">
          <label className="block text-xs font-medium text-white/50 mb-1">Investment Return: {investReturn}%</label>
          <input type="range" min={2} max={15} step={0.5} value={investReturn} onChange={(e) => setInvestReturn(Number(e.target.value))}
            className="w-full h-2 rounded-full bg-white/[0.06] accent-brand-700" />
          <div className="flex justify-between text-xs text-white/30 mt-1"><span>2%</span><span>15%</span></div>
        </div>
        <button onClick={analyze} disabled={loading} className="mt-4 rounded-lg bg-teal-500 px-6 py-2 text-sm font-medium text-white hover:bg-teal-400 disabled:opacity-50 transition-colors shadow-sm">
          {loading ? 'Analyzing...' : 'Compare Paths'}
        </button>
      </div>

      {loading && <CardSkeleton rows={6} />}

      {result && (
        <div className="space-y-4">
          <div className={`rounded-lg border p-4 ${result.recommendation === 'PAY_MORTGAGE' ? 'border-success-300 bg-success-50/30' : result.recommendation === 'INVEST' ? 'border-teal-300 bg-teal-500/10/30' : 'border-warning-300 bg-warning-50/30'}`}>
            <div className="flex items-center gap-3">
              <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${result.recommendation === 'PAY_MORTGAGE' ? 'bg-success-100 text-success-700' : result.recommendation === 'INVEST' ? 'bg-teal-500/15 text-teal-300' : 'bg-warning-100 text-warning-700'}`}>
                {result.recommendation.replace(/_/g, ' ')}
              </span>
              <span className="text-xs text-white/50">Confidence: {result.confidenceLevel.replace(/_/g, ' ')}</span>
            </div>
            <p className="text-sm text-white/60 mt-2">{result.narrative}</p>
          </div>

          {/* Net worth comparison table */}
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.07] backdrop-blur-xl overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-limestone-100 bg-transparent/50">
                  <th className="px-4 py-3 text-xs font-semibold uppercase text-white/30">Year</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase text-white/30 text-right">Pay Mortgage</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase text-white/30 text-right">Invest Instead</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase text-white/30 text-right">Difference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-limestone-100">
                {MILESTONES.map((yr) => {
                  const mortgageNW = result.pathA_MortgageFree.netWorthAt[yr] ?? 0;
                  const investNW = result.pathB_Invest.netWorthAt[yr] ?? 0;
                  const diff = result.netWorthDifference[yr] ?? 0;
                  return (
                    <tr key={yr}>
                      <td className="px-4 py-3 font-medium text-white/60">{yr} years</td>
                      <td className="px-4 py-3 text-right font-mono text-white">{fmt.format(mortgageNW)}</td>
                      <td className="px-4 py-3 text-right font-mono text-white">{fmt.format(investNW)}</td>
                      <td className={`px-4 py-3 text-right font-mono font-semibold ${diff >= 0 ? 'text-success-700' : 'text-critical-700'}`}>
                        {diff >= 0 ? '+' : ''}{fmt.format(diff)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {result.crossoverYear !== null && (
            <p className="text-sm text-white/50">Crossover year: investing surpasses mortgage payoff at <span className="font-semibold">year {result.crossoverYear}</span>.</p>
          )}
          <p className="text-sm text-white/50">Break-even investment return needed: <span className="font-semibold">{fmtPct.format(result.breakEvenInvestmentReturn)}</span></p>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// PMI Elimination Tab
// ---------------------------------------------------------------------------

function PMITab({ token }: { token: string | null }) {
  const { addToast } = useToast();
  const [homeValue, setHomeValue] = useState('500000');
  const [balance, setBalance] = useState('420000');
  const [monthlyPMI, setMonthlyPMI] = useState('175');
  const [lumpSum, setLumpSum] = useState('15000');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PMIResult | null>(null);

  const analyze = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/v1/debt-iq/analysis/mortgage/pmi', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ homeValue: Number(homeValue), currentBalance: Number(balance), monthlyPMI: Number(monthlyPMI), lumpSumAvailable: Number(lumpSum) }),
      });
      if (!res.ok) throw new Error('PMI analysis failed');
      setResult(await res.json());
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Analysis failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.07] backdrop-blur-xl p-6">
        <h3 className="text-sm font-semibold text-white mb-4">Current Mortgage & PMI</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <InputField label="Home Value" value={homeValue} onChange={setHomeValue} prefix="$" />
          <InputField label="Mortgage Balance" value={balance} onChange={setBalance} prefix="$" />
          <InputField label="Monthly PMI" value={monthlyPMI} onChange={setMonthlyPMI} prefix="$" />
          <InputField label="Lump Sum Available" value={lumpSum} onChange={setLumpSum} prefix="$" />
        </div>
        <button onClick={analyze} disabled={loading} className="mt-4 rounded-lg bg-teal-500 px-6 py-2 text-sm font-medium text-white hover:bg-teal-400 disabled:opacity-50 transition-colors shadow-sm">
          {loading ? 'Analyzing...' : 'Analyze PMI Elimination'}
        </button>
      </div>

      {loading && <CardSkeleton rows={6} />}

      {result && (
        <div className="space-y-4">
          {/* LTV overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.07] backdrop-blur-xl p-4">
              <p className="text-xs text-white/50">Current LTV</p>
              <p className={`text-xl font-bold ${result.currentLTV > 0.8 ? 'text-critical-700' : 'text-success-700'}`}>{fmtPct.format(result.currentLTV)}</p>
            </div>
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.07] backdrop-blur-xl p-4">
              <p className="text-xs text-white/50">Target LTV</p>
              <p className="text-xl font-bold text-white">{fmtPct.format(result.targetLTVForRemoval)}</p>
            </div>
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.07] backdrop-blur-xl p-4">
              <p className="text-xs text-white/50">Principal Needed</p>
              <p className="text-xl font-bold text-white">{fmt.format(result.principalNeeded)}</p>
            </div>
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.07] backdrop-blur-xl p-4">
              <p className="text-xs text-white/50">Auto Removal</p>
              <p className="text-xl font-bold text-white">{result.monthsToAutomaticRemoval} months</p>
            </div>
          </div>

          {/* LTV progress bar */}
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.07] backdrop-blur-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-white/50">LTV Progress to 80%</span>
              <span className="text-xs font-semibold text-white/60">{fmtPct.format(result.currentLTV)}</span>
            </div>
            <div className="h-3 rounded-full bg-white/[0.06] overflow-hidden relative">
              <div className="h-full rounded-full bg-teal-500 transition-all" style={{ width: `${Math.min(100, (1 - result.currentLTV) * 500)}%` }} />
              <div className="absolute right-[20%] top-0 bottom-0 w-0.5 bg-success-500" title="80% LTV target" />
            </div>
          </div>

          {/* Strategies */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.07] backdrop-blur-xl p-6">
              <h4 className="text-sm font-semibold text-white mb-3">Lump Sum Strategy</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-white/50">Lump Sum Needed</span><span className="font-mono font-semibold text-white">{fmt.format(result.lumpSumStrategy.lumpSumNeeded)}</span></div>
                <div className="flex justify-between"><span className="text-white/50">Months Saved</span><span className="font-semibold text-white">{result.lumpSumStrategy.monthsSaved}</span></div>
                <div className="flex justify-between"><span className="text-white/50">PMI Saved</span><span className="font-semibold text-success-700">{fmt.format(result.lumpSumStrategy.pmiSaved)}</span></div>
                <div className="flex justify-between"><span className="text-white/50">ROI on Lump Sum</span><span className="font-semibold text-success-700">{fmtPct.format(result.lumpSumStrategy.roiOnLumpSum)}</span></div>
              </div>
            </div>
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.07] backdrop-blur-xl p-6">
              <h4 className="text-sm font-semibold text-white mb-3">Extra Payment Strategy</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-white/50">Extra Monthly Needed</span><span className="font-mono font-semibold text-white">{fmtDec.format(result.extraPaymentStrategy.extraMonthlyNeeded)}</span></div>
                <div className="flex justify-between"><span className="text-white/50">Break-Even</span><span className="font-semibold text-white">{result.extraPaymentStrategy.breakEvenMonths} months</span></div>
                <div className="flex justify-between"><span className="text-white/50">PMI Savings</span><span className="font-semibold text-success-700">{fmt.format(result.extraPaymentStrategy.pmiSavings)}</span></div>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-info-200 bg-info-50 p-4">
            <p className="text-sm font-medium text-info-700">{result.recommendation}</p>
            {result.appealAppraisal && (
              <p className="text-xs text-info-600 mt-1">Consider requesting a new appraisal -- recent home price appreciation may put you below 80% LTV already.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function MortgageAnalysisPage() {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState<MortgageTab>('refinance');

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <nav className="flex items-center gap-1 text-sm text-white/30 mb-1">
            <Link href="/tax-planning/debt-iq" className="hover:text-teal-300 transition-colors">Debt IQ</Link>
            <span>/</span>
            <span className="text-white/60">Mortgage Analysis</span>
          </nav>
          <h1 className="text-2xl font-bold text-white">Mortgage Analysis</h1>
          <p className="mt-1 text-sm text-white/50">Refinance, equity access, payoff-vs-invest, and PMI optimization</p>
        </div>
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
      {activeTab === 'refinance' && <RefinanceTab token={token} />}
      {activeTab === 'equity' && <HomeEquityTab token={token} />}
      {activeTab === 'invest' && <MortgageVsInvestTab token={token} />}
      {activeTab === 'pmi' && <PMITab token={token} />}
    </div>
  );
}
