'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth, useToast } from '@/lib/tax-planning/auth-context';
import type {
  FederalRepaymentPlan,
  EmployerType,
  RepaymentPlanResult,
  PSLFAnalysis,
  StudentLoanOptimizerResult,
  StudentLoanTaxResult,
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

type StudentLoanTab = 'plans' | 'pslf' | 'tax';

const TABS: { key: StudentLoanTab; label: string }[] = [
  { key: 'plans', label: 'Federal Plan Comparison' },
  { key: 'pslf', label: 'PSLF Tracker' },
  { key: 'tax', label: 'Tax Optimization' },
];

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PLAN_LABELS: Record<FederalRepaymentPlan, string> = {
  STANDARD_10YR: 'Standard (10-yr)',
  EXTENDED_25YR: 'Extended (25-yr)',
  GRADUATED: 'Graduated',
  IBR_NEW: 'IBR (New)',
  IBR_OLD: 'IBR (Old)',
  PAYE: 'PAYE',
  SAVE: 'SAVE',
  ICR: 'ICR',
};

const ALL_PLANS: FederalRepaymentPlan[] = [
  'STANDARD_10YR', 'EXTENDED_25YR', 'GRADUATED', 'IBR_NEW', 'IBR_OLD', 'PAYE', 'SAVE', 'ICR',
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function CardSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="rounded-lg border border-limestone-200 bg-white p-6 animate-pulse space-y-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-4 rounded bg-limestone-200" style={{ width: `${65 + Math.random() * 35}%` }} />
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
      <label className="block text-xs font-medium text-charcoal-500 mb-1">{label}</label>
      <div className="relative">
        {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-charcoal-400">{prefix}</span>}
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          min={min}
          max={max}
          step={step}
          className={`w-full rounded-lg border border-limestone-200 bg-white py-2 text-sm text-charcoal-900 placeholder:text-charcoal-300 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 ${prefix ? 'pl-7 pr-3' : suffix ? 'pl-3 pr-8' : 'px-3'}`}
        />
        {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-charcoal-400">{suffix}</span>}
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
      <label className="block text-xs font-medium text-charcoal-500 mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-limestone-200 bg-white py-2 px-3 text-sm text-charcoal-900 focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Federal Plan Comparison Tab
// ---------------------------------------------------------------------------

function FederalPlanTab({ token }: { token: string | null }) {
  const { addToast } = useToast();
  const [balance, setBalance] = useState('85000');
  const [agi, setAgi] = useState('65000');
  const [familySize, setFamilySize] = useState('1');
  const [employerType, setEmployerType] = useState<EmployerType>('FOR_PROFIT');
  const [isPSLF, setIsPSLF] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<StudentLoanOptimizerResult | null>(null);

  const analyze = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/v1/debt-iq/analysis/student-loans/compare', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          totalBalance: Number(balance),
          agi: Number(agi),
          familySize: Number(familySize),
          employerType,
          isPSLFEligible: isPSLF,
        }),
      });
      if (!res.ok) throw new Error('Plan comparison failed');
      setResult(await res.json());
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Analysis failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-limestone-200 bg-white p-6">
        <h3 className="text-sm font-semibold text-charcoal-900 mb-4">Loan & Income Details</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <InputField label="Total Federal Balance" value={balance} onChange={setBalance} prefix="$" />
          <InputField label="Adjusted Gross Income" value={agi} onChange={setAgi} prefix="$" />
          <InputField label="Family Size" value={familySize} onChange={setFamilySize} min={1} max={12} />
          <SelectField label="Employer Type" value={employerType} onChange={(v) => setEmployerType(v as EmployerType)} options={[
            { value: 'FOR_PROFIT', label: 'For-Profit' },
            { value: 'NONPROFIT_501C3', label: 'Nonprofit (501c3)' },
            { value: 'GOVERNMENT', label: 'Government' },
            { value: 'TRIBAL', label: 'Tribal Organization' },
            { value: 'SELF_EMPLOYED', label: 'Self-Employed' },
          ]} />
          <div className="flex items-end">
            <label className="flex items-center gap-2 pb-2 cursor-pointer">
              <input type="checkbox" checked={isPSLF} onChange={(e) => setIsPSLF(e.target.checked)}
                className="rounded border-limestone-300 text-brand-700 focus:ring-brand-500" />
              <span className="text-sm text-charcoal-700">PSLF Eligible</span>
            </label>
          </div>
        </div>
        <button onClick={analyze} disabled={loading} className="mt-4 rounded-lg bg-brand-700 px-6 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50 transition-colors shadow-sm">
          {loading ? 'Comparing Plans...' : 'Compare All Plans'}
        </button>
      </div>

      {loading && <CardSkeleton rows={10} />}

      {result && result.plans && (
        <div className="space-y-4">
          {/* Recommendation banner */}
          <div className="rounded-lg border border-success-300 bg-success-50/30 p-4">
            <div className="flex items-center gap-3 mb-1">
              <span className="inline-flex rounded-full bg-success-100 px-3 py-1 text-xs font-semibold text-success-700">Recommended</span>
              <span className="text-sm font-semibold text-charcoal-900">{PLAN_LABELS[result.recommendation]}</span>
            </div>
            <p className="text-sm text-charcoal-600">{result.recommendationReason}</p>
          </div>

          {/* Comparison table */}
          <div className="rounded-lg border border-limestone-200 bg-white overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-limestone-100 bg-limestone-50/50">
                  <th className="px-4 py-3 text-xs font-semibold uppercase text-charcoal-400 sticky left-0 bg-limestone-50/50">Plan</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase text-charcoal-400 text-right">Monthly Payment</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase text-charcoal-400 text-right">Total Paid</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase text-charcoal-400 text-right">Forgiveness</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase text-charcoal-400 text-right">Tax on Forgiveness</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase text-charcoal-400 text-right">Net Cost</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase text-charcoal-400 text-right">NPV</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-limestone-100">
                {ALL_PLANS.map((plan) => {
                  const data = result.plans[plan];
                  if (!data) return null;
                  const isRec = result.recommendation === plan;
                  return (
                    <tr key={plan} className={isRec ? 'bg-success-50/20' : 'hover:bg-limestone-50/50'}>
                      <td className={`px-4 py-3 font-medium sticky left-0 ${isRec ? 'text-success-700 bg-success-50/20' : 'text-charcoal-900 bg-white'}`}>
                        {PLAN_LABELS[plan]}
                        {isRec && <span className="ml-2 inline-flex h-2 w-2 rounded-full bg-success-500" />}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-charcoal-700">{fmtDec.format(data.monthlyPaymentNow)}</td>
                      <td className="px-4 py-3 text-right font-mono text-charcoal-700">{fmt.format(data.totalPaid)}</td>
                      <td className="px-4 py-3 text-right font-mono text-success-700">{data.forgiveness > 0 ? fmt.format(data.forgiveness) : '--'}</td>
                      <td className="px-4 py-3 text-right font-mono text-charcoal-500">{data.taxOnForgiveness > 0 ? fmt.format(data.taxOnForgiveness) : '--'}</td>
                      <td className="px-4 py-3 text-right font-mono font-semibold text-charcoal-900">{fmt.format(data.netCost)}</td>
                      <td className="px-4 py-3 text-right font-mono text-charcoal-700">{fmt.format(data.npv)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Key insights */}
          {result.topInsights && result.topInsights.length > 0 && (
            <div className="rounded-lg border border-info-200 bg-info-50 p-4">
              <p className="text-xs font-semibold uppercase text-info-600 mb-2">Key Insights</p>
              <ul className="space-y-1">
                {result.topInsights.map((insight, i) => (
                  <li key={i} className="text-sm text-info-700 flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-info-500 flex-shrink-0" />
                    {insight}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {!loading && !result && (
        <div className="rounded-lg border border-limestone-200 bg-white p-12 text-center">
          <p className="text-sm text-charcoal-500">Enter your loan details and click Compare All Plans to see a side-by-side comparison.</p>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// PSLF Tracker Tab
// ---------------------------------------------------------------------------

function PSLFTab({ token }: { token: string | null }) {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [pslf, setPslf] = useState<PSLFAnalysis | null>(null);
  const [qualifyingPayments, setQualifyingPayments] = useState('48');
  const [balance, setBalance] = useState('120000');

  const analyze = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/v1/debt-iq/analysis/student-loans/pslf', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ qualifyingPaymentsMade: Number(qualifyingPayments), totalBalance: Number(balance) }),
      });
      if (!res.ok) throw new Error('PSLF analysis failed');
      setPslf(await res.json());
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Analysis failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const paymentsRemaining = pslf ? pslf.paymentsRemaining : 120 - Number(qualifyingPayments);
  const progressPct = (Number(qualifyingPayments) / 120) * 100;

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-limestone-200 bg-white p-6">
        <h3 className="text-sm font-semibold text-charcoal-900 mb-4">PSLF Inputs</h3>
        <div className="grid grid-cols-2 gap-4">
          <InputField label="Qualifying Payments Made" value={qualifyingPayments} onChange={setQualifyingPayments} min={0} max={120} />
          <InputField label="Total Loan Balance" value={balance} onChange={setBalance} prefix="$" />
        </div>
        <button onClick={analyze} disabled={loading} className="mt-4 rounded-lg bg-brand-700 px-6 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50 transition-colors shadow-sm">
          {loading ? 'Analyzing...' : 'Analyze PSLF Progress'}
        </button>
      </div>

      {loading && <CardSkeleton rows={6} />}

      {/* Progress visualization */}
      <div className="rounded-lg border border-limestone-200 bg-white p-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-charcoal-900">Payment Progress</h3>
          <span className="text-sm font-bold text-brand-700">{Number(qualifyingPayments)} / 120 payments</span>
        </div>
        <div className="h-4 rounded-full bg-limestone-100 overflow-hidden mb-2">
          <div className="h-full rounded-full bg-linear-to-r from-brand-500 to-brand-700 transition-all duration-500" style={{ width: `${progressPct}%` }} />
        </div>
        <div className="flex justify-between text-xs text-charcoal-400">
          <span>0</span>
          <span>30</span>
          <span>60</span>
          <span>90</span>
          <span>120</span>
        </div>
        <p className="mt-3 text-sm text-charcoal-600">
          <span className="font-semibold">{paymentsRemaining}</span> payments remaining ({Math.ceil(paymentsRemaining / 12)} years, {paymentsRemaining % 12} months)
        </p>
      </div>

      {pslf && (
        <div className="space-y-4">
          {/* Forgiveness stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="rounded-lg border border-limestone-200 bg-white p-4">
              <p className="text-xs text-charcoal-500">Eligible</p>
              <p className={`text-xl font-bold ${pslf.isEligible ? 'text-success-700' : 'text-critical-700'}`}>
                {pslf.isEligible ? 'Yes' : 'No'}
              </p>
            </div>
            <div className="rounded-lg border border-limestone-200 bg-white p-4">
              <p className="text-xs text-charcoal-500">Projected Forgiveness</p>
              <p className="text-xl font-bold text-success-700">{fmt.format(pslf.projectedForgiveness)}</p>
            </div>
            <div className="rounded-lg border border-limestone-200 bg-white p-4">
              <p className="text-xs text-charcoal-500">Tax-Free Value</p>
              <p className="text-xl font-bold text-charcoal-900">{fmt.format(pslf.taxFreeForgivenessValue)}</p>
            </div>
            <div className="rounded-lg border border-limestone-200 bg-white p-4">
              <p className="text-xs text-charcoal-500">Total Paid Under PSLF</p>
              <p className="text-xl font-bold text-charcoal-900">{fmt.format(pslf.totalPaidUnderPSLF)}</p>
            </div>
          </div>

          {/* Optimal IDR recommendation */}
          <div className="rounded-lg border border-brand-200 bg-brand-50/30 p-4">
            <p className="text-xs font-semibold uppercase text-brand-600 mb-1">Optimal IDR Plan for PSLF</p>
            <p className="text-base font-semibold text-brand-700">{PLAN_LABELS[pslf.shouldPursueOptimalIDR]}</p>
            <p className="text-sm text-charcoal-600 mt-1">This plan minimizes your total cost while pursuing forgiveness under PSLF.</p>
          </div>

          {/* vs Private Refinance */}
          <div className="rounded-lg border border-limestone-200 bg-white p-6">
            <h4 className="text-sm font-semibold text-charcoal-900 mb-3">PSLF vs. Private Refinance</h4>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="text-center">
                <p className="text-xs text-charcoal-500 mb-1">Private Payoff Total</p>
                <p className="text-lg font-bold text-charcoal-900">{fmt.format(pslf.vsPrivateRefinance.privatePayoff)}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-charcoal-500 mb-1">PSLF Net Cost</p>
                <p className="text-lg font-bold text-charcoal-900">{fmt.format(pslf.vsPrivateRefinance.pslfNetCost)}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-charcoal-500 mb-1">PSLF Advantage</p>
                <p className={`text-lg font-bold ${pslf.vsPrivateRefinance.pslfAdvantage > 0 ? 'text-success-700' : 'text-critical-700'}`}>
                  {fmt.format(pslf.vsPrivateRefinance.pslfAdvantage)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {!loading && !pslf && (
        <div className="rounded-lg border border-limestone-200 bg-white p-12 text-center">
          <p className="text-sm text-charcoal-500">Enter your qualifying payments and balance to see your PSLF analysis.</p>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tax Optimization Tab
// ---------------------------------------------------------------------------

function TaxOptimizationTab({ token }: { token: string | null }) {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<StudentLoanTaxResult | null>(null);
  const [agi, setAgi] = useState('85000');
  const [spouseAgi, setSpouseAgi] = useState('60000');

  const analyze = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/v1/debt-iq/analysis/student-loans/tax', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ agi: Number(agi), spouseAgi: Number(spouseAgi) }),
      });
      if (!res.ok) throw new Error('Tax optimization analysis failed');
      setResult(await res.json());
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Analysis failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-limestone-200 bg-white p-6">
        <h3 className="text-sm font-semibold text-charcoal-900 mb-4">Income Details</h3>
        <div className="grid grid-cols-2 gap-4">
          <InputField label="Your AGI" value={agi} onChange={setAgi} prefix="$" />
          <InputField label="Spouse AGI" value={spouseAgi} onChange={setSpouseAgi} prefix="$" />
        </div>
        <button onClick={analyze} disabled={loading} className="mt-4 rounded-lg bg-brand-700 px-6 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50 transition-colors shadow-sm">
          {loading ? 'Analyzing...' : 'Analyze Tax Strategies'}
        </button>
      </div>

      {loading && <CardSkeleton rows={8} />}

      {result && (
        <div className="space-y-6">
          {/* AGI Reduction Strategies */}
          <div className="rounded-lg border border-limestone-200 bg-white overflow-hidden">
            <div className="px-6 py-4 border-b border-limestone-100">
              <h3 className="text-sm font-semibold text-charcoal-900">AGI-Reducing Strategies</h3>
              <p className="text-xs text-charcoal-500 mt-1">Impact on IDR payments and tax savings</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-limestone-100 bg-limestone-50/50">
                    <th className="px-4 py-3 text-xs font-semibold uppercase text-charcoal-400">Strategy</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase text-charcoal-400 text-right">AGI Reduction</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase text-charcoal-400 text-right">Annual Payment Savings</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase text-charcoal-400 text-right">Tax Savings</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase text-charcoal-400 text-right">Combined Benefit</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase text-charcoal-400">Recommendation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-limestone-100">
                  {result.strategies.map((s, i) => (
                    <tr key={i} className="hover:bg-limestone-50/50">
                      <td className="px-4 py-3 font-medium text-charcoal-900">{s.strategy}</td>
                      <td className="px-4 py-3 text-right font-mono text-charcoal-700">{fmt.format(s.agiReduction)}</td>
                      <td className="px-4 py-3 text-right font-mono text-success-700">{fmt.format(s.annualPaymentSavings)}</td>
                      <td className="px-4 py-3 text-right font-mono text-success-700">{fmt.format(s.taxSavings)}</td>
                      <td className="px-4 py-3 text-right font-mono font-semibold text-success-700">{fmt.format(s.combinedAnnualBenefit)}</td>
                      <td className="px-4 py-3 text-charcoal-600">{s.recommendation}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Marriage Penalty */}
          <div className="rounded-lg border border-limestone-200 bg-white p-6">
            <h3 className="text-sm font-semibold text-charcoal-900 mb-4">Marriage Penalty Analysis</h3>
            <p className="text-xs text-charcoal-500 mb-4">Comparing MFJ (Married Filing Jointly) vs MFS (Married Filing Separately)</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
              <div className="rounded-lg bg-limestone-50 p-4 text-center">
                <p className="text-xs text-charcoal-500 mb-1">Paying Jointly (MFJ)</p>
                <p className="text-xl font-bold text-charcoal-900">{fmtDec.format(result.marriagePenalty.payingJointly)}/mo</p>
              </div>
              <div className="rounded-lg bg-limestone-50 p-4 text-center">
                <p className="text-xs text-charcoal-500 mb-1">Paying Separately (MFS)</p>
                <p className="text-xl font-bold text-charcoal-900">{fmtDec.format(result.marriagePenalty.payingSeparately)}/mo</p>
              </div>
              <div className="rounded-lg bg-limestone-50 p-4 text-center">
                <p className="text-xs text-charcoal-500 mb-1">Annual Penalty</p>
                <p className={`text-xl font-bold ${result.marriagePenalty.annualPenalty > 0 ? 'text-critical-700' : 'text-success-700'}`}>
                  {fmt.format(result.marriagePenalty.annualPenalty)}
                </p>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-charcoal-500">Should File Separately?</span>
                <span className={`font-semibold ${result.marriagePenalty.shouldFileSeparately ? 'text-warning-700' : 'text-charcoal-700'}`}>
                  {result.marriagePenalty.shouldFileSeparately ? 'Yes - Consider MFS' : 'No - Stay MFJ'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-charcoal-500">Tax Cost of Filing Separately</span>
                <span className="font-mono text-charcoal-700">{fmt.format(result.marriagePenalty.taxCostOfFilingSeparately)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-charcoal-500">Net Advantage of MFS</span>
                <span className={`font-mono font-semibold ${result.marriagePenalty.netAdvantage > 0 ? 'text-success-700' : 'text-critical-700'}`}>
                  {fmt.format(result.marriagePenalty.netAdvantage)}
                </span>
              </div>
            </div>
          </div>

          {/* Interest Deduction */}
          <div className="rounded-lg border border-limestone-200 bg-white p-6">
            <h3 className="text-sm font-semibold text-charcoal-900 mb-3">Student Loan Interest Deduction</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-xs text-charcoal-500">Interest Paid</p>
                <p className="text-lg font-bold text-charcoal-900">{fmt.format(result.interestDeduction.paidThisYear)}</p>
              </div>
              <div>
                <p className="text-xs text-charcoal-500">Deductible Amount</p>
                <p className="text-lg font-bold text-charcoal-900">{fmt.format(result.interestDeduction.deductibleAmount)}</p>
              </div>
              <div>
                <p className="text-xs text-charcoal-500">Tax Savings</p>
                <p className="text-lg font-bold text-success-700">{fmt.format(result.interestDeduction.taxSavings)}</p>
              </div>
              <div>
                <p className="text-xs text-charcoal-500">Phase-Out</p>
                <p className={`text-lg font-bold ${result.interestDeduction.isPhaseOut ? 'text-warning-700' : 'text-success-700'}`}>
                  {result.interestDeduction.isPhaseOut ? `Reduced by ${fmt.format(result.interestDeduction.phaseOutReduction)}` : 'Full deduction'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {!loading && !result && (
        <div className="rounded-lg border border-limestone-200 bg-white p-12 text-center">
          <p className="text-sm text-charcoal-500">Enter income details to see tax optimization strategies for your student loans.</p>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function StudentLoansPage() {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState<StudentLoanTab>('plans');

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header */}
      <div>
        <nav className="flex items-center gap-1 text-sm text-charcoal-400 mb-1">
          <Link href="/tax-planning/debt-iq" className="hover:text-brand-700 transition-colors">Debt IQ</Link>
          <span>/</span>
          <span className="text-charcoal-700">Student Loan Optimizer</span>
        </nav>
        <h1 className="text-2xl font-bold text-charcoal-900">Student Loan Optimizer</h1>
        <p className="mt-1 text-sm text-charcoal-500">Federal repayment plan comparison, PSLF tracking, and tax optimization</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-limestone-200">
        <nav className="flex gap-6" role="tablist">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              role="tab"
              aria-selected={activeTab === tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-brand-700 text-brand-700'
                  : 'border-transparent text-charcoal-400 hover:text-charcoal-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      {activeTab === 'plans' && <FederalPlanTab token={token} />}
      {activeTab === 'pslf' && <PSLFTab token={token} />}
      {activeTab === 'tax' && <TaxOptimizationTab token={token} />}
    </div>
  );
}
