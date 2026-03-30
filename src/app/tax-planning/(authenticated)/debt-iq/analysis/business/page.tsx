'use client';

import React, { useState, useCallback } from 'react';
import Link from 'next/link';
import { useAuth, useToast } from '@/lib/tax-planning/auth-context';
import type {
  BusinessType,
  BusinessDebtType,
  BusinessDebtResult,
  RiskLevel,
} from '@/lib/debt-engine/types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const fmtPct = new Intl.NumberFormat('en-US', { style: 'percent', minimumFractionDigits: 2 });
const fmtX = (v: number) => `${v.toFixed(2)}x`;

const BUSINESS_TYPES: Array<{ value: BusinessType; label: string }> = [
  { value: 'SOLE_PROP', label: 'Sole Proprietorship' },
  { value: 'S_CORP', label: 'S Corporation' },
  { value: 'C_CORP', label: 'C Corporation' },
  { value: 'LLC', label: 'LLC' },
  { value: 'PARTNERSHIP', label: 'Partnership' },
];

const DEBT_TYPES: Array<{ value: BusinessDebtType; label: string }> = [
  { value: 'SBA_LOAN', label: 'SBA Loan' },
  { value: 'COMMERCIAL_REAL_ESTATE', label: 'Commercial RE' },
  { value: 'EQUIPMENT', label: 'Equipment' },
  { value: 'LINE_OF_CREDIT', label: 'Line of Credit' },
  { value: 'SELLER_NOTE', label: 'Seller Note' },
  { value: 'PARTNER_LOAN', label: 'Partner Loan' },
];

const RISK_STYLES: Record<RiskLevel, string> = {
  LOW: 'bg-success-100 text-success-700',
  MODERATE: 'bg-warning-100 text-warning-700',
  HIGH: 'bg-critical-100 text-critical-700',
  CRITICAL: 'bg-critical-200 text-critical-800',
};

const GAUGE_COLORS: Record<string, { color: string; label: string }> = {
  healthy: { color: 'bg-success-500', label: 'Healthy' },
  watch: { color: 'bg-warning-500', label: 'Watch' },
  danger: { color: 'bg-critical-500', label: 'Danger' },
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DebtRow {
  id: number;
  type: BusinessDebtType;
  balance: number;
  rate: number;
  termMonths: number;
  isPersonallyGuaranteed: boolean;
  collateral: string;
  taxDeductible: boolean;
  section163jApplies: boolean;
}

// ---------------------------------------------------------------------------
// Sub-Components
// ---------------------------------------------------------------------------

function MetricGauge({ label, value, format, thresholds }: {
  label: string;
  value: number;
  format: (v: number) => string;
  thresholds: { healthy: number; watch: number };
}) {
  const status = value <= thresholds.healthy ? 'healthy' : value <= thresholds.watch ? 'watch' : 'danger';
  const gauge = GAUGE_COLORS[status];
  const pct = Math.min(100, (value / (thresholds.watch * 1.5)) * 100);

  return (
    <div className="rounded-2xl border border-border-subtle bg-surface-soft backdrop-blur-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium text-text-muted">{label}</p>
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
          status === 'healthy' ? 'bg-success-100 text-success-700' :
          status === 'watch' ? 'bg-warning-100 text-warning-700' :
          'bg-critical-100 text-critical-700'
        }`}>
          {gauge.label}
        </span>
      </div>
      <p className="text-xl font-bold text-text mb-2">{format(value)}</p>
      <div className="h-2 rounded-full bg-surface-subtle overflow-hidden">
        <div className={`h-full rounded-full ${gauge.color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function BusinessDebtAnalysisPage() {
  const { token } = useAuth();
  const { addToast } = useToast();

  // Business info
  const [businessType, setBusinessType] = useState<BusinessType>('LLC');
  const [businessIncome, setBusinessIncome] = useState(500000);
  const [ebitda, setEbitda] = useState(150000);
  const [netWorth, setNetWorth] = useState(2000000);

  // Debt rows
  const [debtRows, setDebtRows] = useState<DebtRow[]>([
    { id: 1, type: 'SBA_LOAN', balance: 250000, rate: 0.065, termMonths: 120, isPersonallyGuaranteed: true, collateral: 'Business assets', taxDeductible: true, section163jApplies: false },
  ]);
  const [nextId, setNextId] = useState(2);

  // Results
  const [computing, setComputing] = useState(false);
  const [result, setResult] = useState<BusinessDebtResult | null>(null);

  const addDebt = () => {
    setDebtRows([...debtRows, {
      id: nextId, type: 'LINE_OF_CREDIT', balance: 0, rate: 0.07,
      termMonths: 60, isPersonallyGuaranteed: false, collateral: '',
      taxDeductible: true, section163jApplies: false,
    }]);
    setNextId(nextId + 1);
  };

  const removeDebt = (id: number) => {
    setDebtRows(debtRows.filter(d => d.id !== id));
  };

  const updateDebt = (id: number, field: keyof DebtRow, value: unknown) => {
    setDebtRows(debtRows.map(d => d.id === id ? { ...d, [field]: value } : d));
  };

  const runAnalysis = useCallback(async () => {
    if (!token) return;
    setComputing(true);

    try {
      const res = await fetch('/api/v1/debt-iq/analyze-business-debt', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessType, businessIncome, ebitda, netWorth,
          businessDebts: debtRows.map(d => ({
            type: d.type, balance: d.balance, rate: d.rate, termMonths: d.termMonths,
            isPersonallyGuaranteed: d.isPersonallyGuaranteed, collateral: d.collateral,
            taxDeductible: d.taxDeductible, section163jApplies: d.section163jApplies,
          })),
        }),
      });
      if (!res.ok) throw new Error('Analysis failed');
      const data: BusinessDebtResult = await res.json();
      setResult(data);
      addToast('Business debt analysis complete', 'success');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Analysis failed', 'error');
    } finally {
      setComputing(false);
    }
  }, [token, businessType, businessIncome, ebitda, netWorth, debtRows, addToast]);

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Link href="/tax-planning/debt-iq" className="text-sm text-accent-primarySoft hover:text-accent-primarySoft">Debt Analysis</Link>
          <span className="text-text-faint">/</span>
          <span className="text-sm text-text-muted">Business Debt Analyzer</span>
        </div>
        <h1 className="text-2xl font-bold text-text">Business Debt Analyzer</h1>
        <p className="mt-1 text-sm text-text-muted">Leverage metrics, personal exposure, and Section 163(j) analysis</p>
      </div>

      {/* Business Info */}
      <div className="rounded-2xl border border-border-subtle bg-surface-soft backdrop-blur-xl p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-text mb-4">Business Profile</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Entity Type</label>
            <select
              value={businessType}
              onChange={(e) => setBusinessType(e.target.value as BusinessType)}
              className="w-full rounded-2xl border border-border-subtle bg-surface-soft backdrop-blur-xl px-3 py-2 text-sm text-text focus:border-accent-primary focus:ring-1 focus:ring-accent-primary outline-hidden"
            >
              {BUSINESS_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Annual Revenue</label>
            <input type="number" value={businessIncome} onChange={e => setBusinessIncome(Number(e.target.value))}
              className="w-full rounded-2xl border border-border-subtle bg-surface-soft backdrop-blur-xl px-3 py-2 text-sm text-text focus:border-accent-primary focus:ring-1 focus:ring-accent-primary outline-hidden" />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">EBITDA</label>
            <input type="number" value={ebitda} onChange={e => setEbitda(Number(e.target.value))}
              className="w-full rounded-2xl border border-border-subtle bg-surface-soft backdrop-blur-xl px-3 py-2 text-sm text-text focus:border-accent-primary focus:ring-1 focus:ring-accent-primary outline-hidden" />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Personal Net Worth</label>
            <input type="number" value={netWorth} onChange={e => setNetWorth(Number(e.target.value))}
              className="w-full rounded-2xl border border-border-subtle bg-surface-soft backdrop-blur-xl px-3 py-2 text-sm text-text focus:border-accent-primary focus:ring-1 focus:ring-accent-primary outline-hidden" />
          </div>
        </div>
      </div>

      {/* Debt Table */}
      <div className="rounded-2xl border border-border-subtle bg-surface-soft backdrop-blur-xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-limestone-100">
          <h3 className="text-sm font-semibold text-text">Business Debts</h3>
          <button onClick={addDebt} className="text-sm font-medium text-accent-primarySoft hover:text-accent-primarySoft">+ Add Debt</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-limestone-100 bg-transparent/50">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-text-faint">Type</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-text-faint">Balance</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-text-faint">Rate</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-text-faint">Term (mo)</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-text-faint">PG</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-text-faint">163(j)</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase text-text-faint" />
              </tr>
            </thead>
            <tbody className="divide-y divide-limestone-100">
              {debtRows.map(d => (
                <tr key={d.id}>
                  <td className="px-4 py-2">
                    <select value={d.type} onChange={e => updateDebt(d.id, 'type', e.target.value)}
                      className="w-full rounded border border-border-subtle px-2 py-1.5 text-sm focus:border-accent-primary outline-hidden">
                      {DEBT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-2">
                    <input type="number" value={d.balance} onChange={e => updateDebt(d.id, 'balance', Number(e.target.value))}
                      className="w-24 rounded border border-border-subtle px-2 py-1.5 text-sm text-right focus:border-accent-primary outline-hidden" />
                  </td>
                  <td className="px-4 py-2">
                    <input type="number" value={(d.rate * 100).toFixed(2)} step="0.01"
                      onChange={e => updateDebt(d.id, 'rate', Number(e.target.value) / 100)}
                      className="w-20 rounded border border-border-subtle px-2 py-1.5 text-sm text-right focus:border-accent-primary outline-hidden" />
                  </td>
                  <td className="px-4 py-2">
                    <input type="number" value={d.termMonths} onChange={e => updateDebt(d.id, 'termMonths', Number(e.target.value))}
                      className="w-16 rounded border border-border-subtle px-2 py-1.5 text-sm text-right focus:border-accent-primary outline-hidden" />
                  </td>
                  <td className="px-4 py-2 text-center">
                    <input type="checkbox" checked={d.isPersonallyGuaranteed}
                      onChange={e => updateDebt(d.id, 'isPersonallyGuaranteed', e.target.checked)}
                      className="h-4 w-4 rounded border-border-subtle text-accent-primarySoft focus:ring-accent-primary" />
                  </td>
                  <td className="px-4 py-2 text-center">
                    <input type="checkbox" checked={d.section163jApplies}
                      onChange={e => updateDebt(d.id, 'section163jApplies', e.target.checked)}
                      className="h-4 w-4 rounded border-border-subtle text-accent-primarySoft focus:ring-accent-primary" />
                  </td>
                  <td className="px-4 py-2 text-center">
                    <button onClick={() => removeDebt(d.id)} className="text-xs text-critical-600 hover:text-critical-700">Remove</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 border-t border-limestone-100 flex justify-end">
          <button onClick={runAnalysis} disabled={computing}
            className="rounded-lg bg-accent-primary px-6 py-2.5 text-sm font-medium text-text hover:bg-accent-primary/80 transition-colors shadow-sm disabled:opacity-50">
            {computing ? 'Analyzing...' : 'Run Analysis'}
          </button>
        </div>
      </div>

      {/* Results */}
      {result && (
        <>
          {/* Leverage Metrics */}
          <div>
            <h3 className="text-sm font-semibold uppercase text-text-faint mb-3">Business Leverage Metrics</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <MetricGauge label="Debt-to-EBITDA" value={result.businessLeverageMetrics.debtToEBITDA}
                format={fmtX} thresholds={{ healthy: 3, watch: 5 }} />
              <MetricGauge label="Debt Service Coverage" value={result.businessLeverageMetrics.debtServiceCoverage}
                format={fmtX} thresholds={{ healthy: 2, watch: 1.25 }} />
              <MetricGauge label="Debt-to-Revenue" value={result.businessLeverageMetrics.totalDebtToRevenue}
                format={(v) => fmtPct.format(v)} thresholds={{ healthy: 0.5, watch: 1.0 }} />
            </div>
          </div>

          {/* Personal Exposure */}
          <div className="rounded-2xl border border-border-subtle bg-surface-soft backdrop-blur-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold uppercase text-text-faint">Personal Exposure</h3>
              <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${RISK_STYLES[result.personalExposure.riskRating]}`}>
                {result.personalExposure.riskRating}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex justify-between text-sm py-2 border-b border-limestone-100">
                <span className="text-text-muted">Personally Guaranteed</span>
                <span className="font-mono font-semibold text-text">{fmt.format(result.personalExposure.personallyGuaranteed)}</span>
              </div>
              <div className="flex justify-between text-sm py-2 border-b border-limestone-100">
                <span className="text-text-muted">% of Net Worth</span>
                <span className="font-mono font-semibold text-text">{fmtPct.format(result.personalExposure.percentOfNetWorth)}</span>
              </div>
            </div>
          </div>

          {/* Tax Deductibility */}
          <div className="rounded-2xl border border-border-subtle bg-surface-soft backdrop-blur-xl p-6 shadow-sm">
            <h3 className="text-sm font-semibold uppercase text-text-faint mb-4">Section 163(j) Interest Deduction</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-text-muted mb-1">163(j) Limit (30% EBITDA)</p>
                <p className="text-lg font-bold text-text">{fmt.format(result.taxDeductibility.section163jLimit)}</p>
              </div>
              <div>
                <p className="text-xs text-text-muted mb-1">Deductible This Year</p>
                <p className="text-lg font-bold text-success-700">{fmt.format(result.taxDeductibility.deductibleThisYear)}</p>
              </div>
              <div>
                <p className="text-xs text-text-muted mb-1">Disallowed Carryforward</p>
                <p className="text-lg font-bold text-warning-700">{fmt.format(result.taxDeductibility.disallowedCarryforward)}</p>
              </div>
              <div>
                <p className="text-xs text-text-muted mb-1">Tax Savings</p>
                <p className="text-lg font-bold text-success-700">{fmt.format(result.taxDeductibility.taxSavings)}</p>
              </div>
            </div>
          </div>

          {/* Recommendations */}
          {result.recommendations.length > 0 && (
            <div className="rounded-xl border border-brand-200 bg-accent-primary/10 p-6">
              <h3 className="text-sm font-semibold text-accent-primarySoft mb-3">Recommendations</h3>
              <ul className="space-y-2">
                {result.recommendations.map((rec, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-text-muted">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-accent-primary flex-shrink-0" />
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}
