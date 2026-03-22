'use client';

import React, { useState, useCallback } from 'react';
import Link from 'next/link';
import { useAuth, useToast } from '@/lib/tax-planning/auth-context';
import type { AutoLoanResult } from '@/lib/debt-engine/types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const fmtPct = new Intl.NumberFormat('en-US', { style: 'percent', minimumFractionDigits: 2 });

// ---------------------------------------------------------------------------
// Sub-Components
// ---------------------------------------------------------------------------

function InputField({ label, value, onChange, type = 'number', suffix, step }: {
  label: string;
  value: number | string;
  onChange: (v: string) => void;
  type?: string;
  suffix?: string;
  step?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-white/50 mb-1">{label}</label>
      <div className="relative">
        <input
          type={type}
          value={value}
          step={step}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-2xl border border-white/[0.06] bg-white/[0.07] backdrop-blur-xl px-3 py-2 text-sm text-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-hidden"
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/30">{suffix}</span>
        )}
      </div>
    </div>
  );
}

function ResultCard({ label, value, note, noteColor }: {
  label: string;
  value: string;
  note?: string;
  noteColor?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.07] backdrop-blur-xl p-4">
      <p className="text-xs font-medium text-white/50 mb-1">{label}</p>
      <p className="text-lg font-bold text-white">{value}</p>
      {note && <p className={`text-xs mt-1 ${noteColor || 'text-white/30'}`}>{note}</p>}
    </div>
  );
}

function RecommendationBadge({ rec }: { rec: string }) {
  const styles: Record<string, string> = {
    PAY_OFF: 'bg-success-100 text-success-700',
    INVEST_INSTEAD: 'bg-teal-500/15 text-teal-300',
    NEUTRAL: 'bg-white/[0.06] text-white/50',
    LEASE: 'bg-info-100 text-info-700',
    BUY: 'bg-success-100 text-success-700',
    DEPENDS: 'bg-warning-100 text-warning-700',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${styles[rec] ?? styles.NEUTRAL}`}>
      {rec.replace(/_/g, ' ')}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function AutoLoanAnalysisPage() {
  const { token } = useAuth();
  const { addToast } = useToast();

  // Loan inputs
  const [vehicleValue, setVehicleValue] = useState(32000);
  const [loanBalance, setLoanBalance] = useState(24200);
  const [interestRate, setInterestRate] = useState(0.0499);
  const [remainingMonths, setRemainingMonths] = useState(42);
  const [monthlyPayment, setMonthlyPayment] = useState(468);
  const [lumpSum, setLumpSum] = useState(15000);
  const [investmentReturn, setInvestmentReturn] = useState(0.08);

  // Lease inputs
  const [showLease, setShowLease] = useState(false);
  const [monthlyLease, setMonthlyLease] = useState(399);
  const [leaseTerm, setLeaseTerm] = useState(36);
  const [residualValue, setResidualValue] = useState(18000);
  const [acquisitionFee, setAcquisitionFee] = useState(895);
  const [moneyFactor, setMoneyFactor] = useState(0.00125);
  const [allowedMileage, setAllowedMileage] = useState(12000);
  const [mileageOverage, setMileageOverage] = useState(0.25);

  // Results
  const [computing, setComputing] = useState(false);
  const [result, setResult] = useState<AutoLoanResult | null>(null);

  const runAnalysis = useCallback(async () => {
    if (!token) return;
    setComputing(true);

    try {
      const body: Record<string, unknown> = {
        vehicleValue, loanBalance, interestRate, remainingMonths,
        monthlyPayment, lumpSumAvailable: lumpSum, investmentReturn,
      };
      if (showLease) {
        body.leaseOption = {
          monthlyLease, leaseTerm, residualValue, acquisitionFee,
          moneyFactor, allowedMileage, mileageOverageFee: mileageOverage,
        };
      }

      const res = await fetch('/api/v1/debt-iq/analyze-auto-loan', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Analysis failed');
      const data: AutoLoanResult = await res.json();
      setResult(data);
      addToast('Auto loan analysis complete', 'success');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Analysis failed', 'error');
    } finally {
      setComputing(false);
    }
  }, [token, vehicleValue, loanBalance, interestRate, remainingMonths, monthlyPayment, lumpSum, investmentReturn, showLease, monthlyLease, leaseTerm, residualValue, acquisitionFee, moneyFactor, allowedMileage, mileageOverage, addToast]);

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Link href="/tax-planning/debt-iq" className="text-sm text-teal-300 hover:text-teal-300">Debt Analysis</Link>
          <span className="text-white/30">/</span>
          <span className="text-sm text-white/50">Auto Loan Analyzer</span>
        </div>
        <h1 className="text-2xl font-bold text-white">Auto Loan Analyzer</h1>
        <p className="mt-1 text-sm text-white/50">Payoff analysis, opportunity cost, and lease vs. buy comparison</p>
      </div>

      {/* Input Form */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.07] backdrop-blur-xl p-6 shadow-sm space-y-6">
        <h3 className="text-sm font-semibold text-white">Current Auto Loan</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <InputField label="Vehicle Value" value={vehicleValue} onChange={(v) => setVehicleValue(Number(v))} suffix="$" />
          <InputField label="Loan Balance" value={loanBalance} onChange={(v) => setLoanBalance(Number(v))} suffix="$" />
          <InputField label="Interest Rate" value={(interestRate * 100).toFixed(2)} onChange={(v) => setInterestRate(Number(v) / 100)} suffix="%" step="0.01" />
          <InputField label="Remaining Months" value={remainingMonths} onChange={(v) => setRemainingMonths(Number(v))} />
          <InputField label="Monthly Payment" value={monthlyPayment} onChange={(v) => setMonthlyPayment(Number(v))} suffix="$" />
          <InputField label="Lump Sum Available" value={lumpSum} onChange={(v) => setLumpSum(Number(v))} suffix="$" />
          <InputField label="Expected Inv. Return" value={(investmentReturn * 100).toFixed(1)} onChange={(v) => setInvestmentReturn(Number(v) / 100)} suffix="%" step="0.1" />
        </div>

        {/* Lease toggle */}
        <div className="pt-4 border-t border-limestone-100">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={showLease}
              onChange={(e) => setShowLease(e.target.checked)}
              className="h-4 w-4 rounded border-white/[0.10] text-teal-300 focus:ring-teal-500"
            />
            <span className="text-sm font-medium text-white/60">Include Lease vs. Buy Comparison</span>
          </label>
        </div>

        {showLease && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
            <InputField label="Monthly Lease" value={monthlyLease} onChange={(v) => setMonthlyLease(Number(v))} suffix="$" />
            <InputField label="Lease Term (months)" value={leaseTerm} onChange={(v) => setLeaseTerm(Number(v))} />
            <InputField label="Residual Value" value={residualValue} onChange={(v) => setResidualValue(Number(v))} suffix="$" />
            <InputField label="Acquisition Fee" value={acquisitionFee} onChange={(v) => setAcquisitionFee(Number(v))} suffix="$" />
            <InputField label="Money Factor" value={moneyFactor} onChange={(v) => setMoneyFactor(Number(v))} step="0.00001" />
            <InputField label="Allowed Mileage/yr" value={allowedMileage} onChange={(v) => setAllowedMileage(Number(v))} />
            <InputField label="Overage $/mi" value={mileageOverage} onChange={(v) => setMileageOverage(Number(v))} suffix="$" step="0.01" />
          </div>
        )}

        <div className="flex justify-end">
          <button
            onClick={runAnalysis}
            disabled={computing}
            className="rounded-lg bg-teal-500 px-6 py-2.5 text-sm font-medium text-white hover:bg-teal-400 transition-colors shadow-sm disabled:opacity-50"
          >
            {computing ? 'Analyzing...' : 'Run Analysis'}
          </button>
        </div>
      </div>

      {/* Results */}
      {result && (
        <>
          {/* Current Status */}
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.07] backdrop-blur-xl p-6 shadow-sm">
            <h3 className="text-sm font-semibold uppercase text-white/30 mb-4">Current Status</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <ResultCard label="Equity" value={fmt.format(result.currentStatus.equity)}
                note={result.currentStatus.isUnderwaterFlag ? 'Underwater' : 'Positive equity'}
                noteColor={result.currentStatus.isUnderwaterFlag ? 'text-critical-700' : 'text-success-700'} />
              <ResultCard label="LTV" value={fmtPct.format(result.currentStatus.ltv)} />
              <ResultCard label="Effective APR" value={fmtPct.format(result.currentStatus.effectiveAPR)} />
              <ResultCard label="Interest Remaining" value={fmt.format(result.currentStatus.totalInterestRemaining)} />
              <ResultCard label="Underwater" value={result.currentStatus.isUnderwaterFlag ? 'Yes' : 'No'}
                noteColor={result.currentStatus.isUnderwaterFlag ? 'text-critical-700' : 'text-success-700'} />
            </div>
          </div>

          {/* Payoff Analysis */}
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.07] backdrop-blur-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold uppercase text-white/30">Pay Off vs. Invest</h3>
              <RecommendationBadge rec={result.payoffAnalysis.recommendation} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <ResultCard label="Interest Saved by Payoff" value={fmt.format(result.payoffAnalysis.totalInterestSavedByPayoff)} />
              <ResultCard label="Opportunity Cost" value={fmt.format(result.payoffAnalysis.opportunityCostOfPayoff)}
                note="If invested instead" />
              <ResultCard label="Net Advantage" value={fmt.format(result.payoffAnalysis.netAdvantage)}
                note={result.payoffAnalysis.netAdvantage > 0 ? 'Favors payoff' : 'Favors investing'}
                noteColor={result.payoffAnalysis.netAdvantage > 0 ? 'text-success-700' : 'text-teal-300'} />
            </div>
          </div>

          {/* Lease vs Buy */}
          {result.leaseVsBuyAnalysis && (
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.07] backdrop-blur-xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold uppercase text-white/30">Lease vs. Buy</h3>
                <RecommendationBadge rec={result.leaseVsBuyAnalysis.recommendation} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-white/60">Lease</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-white/50">Total Outflow</span>
                      <span className="font-mono font-medium text-white">{fmt.format(result.leaseVsBuyAnalysis.totalLeaseOutflow)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-white/50">Net Cost (nothing retained)</span>
                      <span className="font-mono font-medium text-white">{fmt.format(result.leaseVsBuyAnalysis.netLeaseCost)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-white/50">Money Factor as APR</span>
                      <span className="font-mono font-medium text-white/60">{fmtPct.format(result.leaseVsBuyAnalysis.moneyFactorAsAPR)}</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-white/60">Buy</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-white/50">Total Outflow</span>
                      <span className="font-mono font-medium text-white">{fmt.format(result.leaseVsBuyAnalysis.totalBuyOutflow)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-white/50">Vehicle Value Retained</span>
                      <span className="font-mono font-medium text-success-700">{fmt.format(result.leaseVsBuyAnalysis.vehicleValueRetained)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-white/50">Net Cost</span>
                      <span className="font-mono font-medium text-white">{fmt.format(result.leaseVsBuyAnalysis.netBuyCost)}</span>
                    </div>
                  </div>
                </div>
              </div>
              {result.leaseVsBuyAnalysis.taxNote && (
                <p className="mt-4 pt-4 border-t border-limestone-100 text-xs text-white/50">
                  {result.leaseVsBuyAnalysis.taxNote}
                </p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
