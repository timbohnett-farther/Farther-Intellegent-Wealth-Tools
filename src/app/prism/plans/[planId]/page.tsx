'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { PlanNav } from '@/components/prism/layouts/PlanNav';
import {
  TrendingUp, DollarSign, Landmark, Receipt, Shield,
  CheckCircle2, Circle, Loader2,
  Edit3, Share2, Download, PlayCircle,
} from 'lucide-react';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
  AreaChart, Area, ReferenceLine,
} from 'recharts';

interface PlanMeta {
  clientName: string;
  planName: string;
  status: string;
  lastUpdated: string;
}

interface PlanResultData {
  probabilityOfSuccess: number;
  projectedEstateValue: number;
  totalTaxesLifetime: number;
  avgEffectiveTaxRate: number;
  cashFlows: Array<{
    year: number;
    clientAge: number;
    isRetired: boolean;
    totalGrossIncome: number;
    totalExpenses: number;
    totalTax: number;
    netCashFlow: number;
    totalInvestablePortfolio: number;
    netWorth: number;
    totalAssets: number;
    totalLiabilities: number;
    rmdIncome: number;
    socialSecurityClientGross: number;
    federalTax: number;
    stateTax: number;
  }>;
  annualPercentileBands: Array<{
    year: number;
    p5: number; p10: number; p25: number;
    p50: number; p75: number; p90: number; p95: number;
  }>;
  goalResults: Array<{
    goalId: string;
    name: string;
    type: string;
    targetAmount: number;
    targetYear: number;
    fundedRatio: number;
    probability: number;
    status: string;
  }>;
}

const MODULES = [
  { label: 'Profile', segment: '/profile', complete: true },
  { label: 'Income', segment: '/income', complete: true },
  { label: 'Expenses', segment: '/expenses', complete: true },
  { label: 'Net Worth', segment: '/net-worth', complete: true },
  { label: 'Goals', segment: '/goals', complete: true },
  { label: 'Retirement', segment: '/retirement', complete: true },
  { label: 'Tax', segment: '/tax', complete: true },
  { label: 'Social Security', segment: '/social-security', complete: true },
  { label: 'Medicare', segment: '/medicare', complete: false },
  { label: 'Insurance', segment: '/insurance', complete: true },
  { label: 'Education', segment: '/education', complete: false },
  { label: 'Estate', segment: '/estate', complete: true },
  { label: 'Business', segment: '/business', complete: false },
];

function formatCurrency(value: number): string {
  if (Math.abs(value) >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (Math.abs(value) >= 1000) return `$${(value / 1000).toFixed(0)}K`;
  return `$${value.toLocaleString()}`;
}

function formatAxisCurrency(value: number): string {
  if (Math.abs(value) >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (Math.abs(value) >= 1000) return `$${(value / 1000).toFixed(0)}K`;
  return `$${value}`;
}

function SuccessGauge({ value }: { value: number }) {
  const radius = 40;
  const circumference = Math.PI * radius;
  const pct = Math.min(100, Math.max(0, value));
  const offset = circumference - (pct / 100) * circumference;
  const color = pct >= 85 ? '#22c55e' : pct >= 70 ? '#f59e0b' : '#ef4444';

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="100" height="60" viewBox="0 0 100 60">
        <path d="M 10 55 A 40 40 0 0 1 90 55" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" strokeLinecap="round" />
        <path d="M 10 55 A 40 40 0 0 1 90 55" fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset} />
      </svg>
      <span className="absolute bottom-0 text-xl font-bold text-text" style={{ fontFeatureSettings: '"tnum"' }}>
        {Math.round(pct)}%
      </span>
    </div>
  );
}

export default function PlanOverviewPage() {
  const params = useParams();
  const planId = params.planId as string;
  const [results, setResults] = useState<PlanResultData | null>(null);
  const [meta, setMeta] = useState<PlanMeta>({
    clientName: 'Loading...',
    planName: 'Financial Plan',
    status: 'active',
    lastUpdated: '',
  });
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchResults = useCallback(async () => {
    try {
      const res = await fetch(`/api/prism/plans/${planId}/results`);
      if (res.ok) {
        const data = await res.json();
        // Use the full resultData blob which contains cashFlows, percentile bands, etc.
        const rd = data.resultData;
        if (rd) {
          const mapped: PlanResultData = {
            probabilityOfSuccess: rd.probabilityOfSuccess ?? data.summary?.probabilityOfSuccess ?? 0,
            projectedEstateValue: rd.projectedEstateValue ?? data.summary?.projectedEstateValue ?? 0,
            totalTaxesLifetime: rd.totalTaxesLifetime ?? data.summary?.totalTaxesLifetime ?? 0,
            avgEffectiveTaxRate: rd.avgEffectiveTaxRate ?? data.summary?.avgEffectiveTaxRate ?? 0,
            cashFlows: rd.cashFlows ?? [],
            annualPercentileBands: rd.annualPercentileBands ?? [],
            goalResults: rd.goalResults ?? data.goalResults ?? [],
          };
          setResults(mapped);
        } else {
          // Fallback to structured fields
          const mapped: PlanResultData = {
            probabilityOfSuccess: data.summary?.probabilityOfSuccess ?? 0,
            projectedEstateValue: data.summary?.projectedEstateValue ?? 0,
            totalTaxesLifetime: data.summary?.totalTaxesLifetime ?? 0,
            avgEffectiveTaxRate: data.summary?.avgEffectiveTaxRate ?? 0,
            cashFlows: [],
            annualPercentileBands: [],
            goalResults: data.goalResults ?? [],
          };
          setResults(mapped);
        }
      }
    } catch {
      // Results may not exist yet
    } finally {
      setLoading(false);
    }
  }, [planId]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  const runPlan = async () => {
    setCalculating(true);
    setError(null);
    try {
      const res = await fetch(`/api/prism/plans/${planId}/calculate`, { method: 'POST' });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Calculation failed');
        return;
      }
      await fetchResults();
    } catch (e) {
      setError('Failed to run calculation');
    } finally {
      setCalculating(false);
    }
  };

  const currentYear = results?.cashFlows?.[0];
  const lastYear = results?.cashFlows?.[results.cashFlows.length - 1];
  const probabilityOfSuccess = results?.probabilityOfSuccess ?? 0;
  const netWorth = currentYear?.netWorth ?? 0;
  const projectedEstate = results?.projectedEstateValue ?? lastYear?.netWorth ?? 0;
  const annualTax = currentYear?.totalTax ?? 0;
  const isRetirementReady = probabilityOfSuccess >= 85;
  const retirementYear = results?.cashFlows?.find(cf => cf.isRetired)?.year;

  return (
    <div>
      <PlanNav planId={planId} clientName={meta.clientName} planName={meta.planName} />

      <div className="max-w-content mx-auto px-6 py-6">
        {/* Plan header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-xl font-bold text-text">{meta.planName}</h1>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-success-100 text-success-700">
                Active
              </span>
            </div>
            {meta.lastUpdated && (
              <p className="text-sm text-text-muted">Last updated: {meta.lastUpdated}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button className="inline-flex items-center gap-1.5 px-3 py-2 text-sm border border-border-subtle rounded-lg hover:bg-surface-subtle text-text-muted">
              <Edit3 size={14} /> Edit
            </button>
            <button className="inline-flex items-center gap-1.5 px-3 py-2 text-sm border border-border-subtle rounded-lg hover:bg-surface-subtle text-text-muted">
              <Share2 size={14} /> Share
            </button>
            <button className="inline-flex items-center gap-1.5 px-3 py-2 text-sm border border-border-subtle rounded-lg hover:bg-surface-subtle text-text-muted">
              <Download size={14} /> Export
            </button>
            <button
              onClick={runPlan}
              disabled={calculating}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm bg-accent-primary text-text rounded-lg hover:bg-accent-primary/80 disabled:opacity-50"
            >
              {calculating ? (
                <><Loader2 size={14} className="animate-spin" /> Calculating...</>
              ) : (
                <><PlayCircle size={14} /> Run Plan</>
              )}
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-critical-50 border border-critical-100 rounded-lg text-sm text-critical-700">
            {error}
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <div className="bg-surface-soft rounded-xl border border-border-subtle shadow-sm p-5 flex flex-col items-center">
            <p className="text-xs text-text-muted mb-2">Probability of Success</p>
            {loading ? (
              <Loader2 size={24} className="animate-spin text-text-faint" />
            ) : results ? (
              <SuccessGauge value={probabilityOfSuccess * 100} />
            ) : (
              <p className="text-sm text-text-faint">Run plan</p>
            )}
          </div>
          <div className="bg-surface-soft rounded-xl border border-border-subtle shadow-sm p-5">
            <div className="flex items-center gap-2 mb-2">
              <Shield size={16} className={isRetirementReady ? 'text-success-500' : 'text-warning-500'} />
              <p className="text-xs text-text-muted">Retirement Ready?</p>
            </div>
            <p className={`text-xl font-bold ${isRetirementReady ? 'text-success-500' : 'text-warning-500'}`}>
              {results ? (isRetirementReady ? 'Yes' : 'At Risk') : '--'}
            </p>
            {retirementYear && (
              <p className="text-xs text-text-faint mt-1">Target: {retirementYear}</p>
            )}
          </div>
          <div className="bg-surface-soft rounded-xl border border-border-subtle shadow-sm p-5">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign size={16} className="text-accent-primarySoft" />
              <p className="text-xs text-text-muted">Total Net Worth</p>
            </div>
            <p className="text-xl font-bold text-text" style={{ fontFeatureSettings: '"tnum"' }}>
              {results ? formatCurrency(netWorth) : '--'}
            </p>
          </div>
          <div className="bg-surface-soft rounded-xl border border-border-subtle shadow-sm p-5">
            <div className="flex items-center gap-2 mb-2">
              <Landmark size={16} className="text-accent-primarySoft" />
              <p className="text-xs text-text-muted">Projected Estate</p>
            </div>
            <p className="text-xl font-bold text-text" style={{ fontFeatureSettings: '"tnum"' }}>
              {results ? formatCurrency(projectedEstate) : '--'}
            </p>
          </div>
          <div className="bg-surface-soft rounded-xl border border-border-subtle shadow-sm p-5">
            <div className="flex items-center gap-2 mb-2">
              <Receipt size={16} className="text-warning-500" />
              <p className="text-xs text-text-muted">Annual Tax Est.</p>
            </div>
            <p className="text-xl font-bold text-text" style={{ fontFeatureSettings: '"tnum"' }}>
              {results ? formatCurrency(annualTax) : '--'}
            </p>
          </div>
        </div>

        {/* Planning Modules Status */}
        <div className="bg-surface-soft rounded-xl border border-border-subtle shadow-sm p-5 mb-8">
          <h3 className="font-semibold text-text mb-4">Planning Modules</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2">
            {MODULES.map((mod) => (
              <Link
                key={mod.segment}
                href={`/prism/plans/${planId}${mod.segment}`}
                className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-limestone-100 hover:border-brand-200 hover:bg-accent-primary/10 transition-colors group"
              >
                {mod.complete ? (
                  <CheckCircle2 size={16} className="text-success-500 flex-shrink-0" />
                ) : (
                  <Circle size={16} className="text-text-faint flex-shrink-0" />
                )}
                <span className="text-xs font-medium text-text-muted group-hover:text-accent-primarySoft truncate">
                  {mod.label}
                </span>
              </Link>
            ))}
          </div>
        </div>

        {/* Monte Carlo Fan Chart */}
        {results?.annualPercentileBands && results.annualPercentileBands.length > 0 && (
          <div className="bg-surface-soft rounded-xl border border-border-subtle shadow-sm p-5 mb-6">
            <h3 className="font-semibold text-text mb-4">Portfolio Projection (Monte Carlo)</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={results.annualPercentileBands} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={formatAxisCurrency} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  {retirementYear && (
                    <ReferenceLine x={retirementYear} stroke="#A09888" strokeDasharray="5 5" label="Retirement" />
                  )}
                  <Area type="monotone" dataKey="p95" stackId="band" fill="transparent" stroke="none" />
                  <Area type="monotone" dataKey="p75" stackId="band2" fill="#047857" fillOpacity={0.1} stroke="none" />
                  <Area type="monotone" dataKey="p50" stackId="band3" fill="#22c55e" fillOpacity={0.15} stroke="#22c55e" strokeWidth={2} />
                  <Area type="monotone" dataKey="p25" stackId="band4" fill="#f59e0b" fillOpacity={0.1} stroke="none" />
                  <Area type="monotone" dataKey="p5" stackId="band5" fill="#ef4444" fillOpacity={0.1} stroke="none" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center gap-4 mt-2 text-xs text-text-muted">
              <span className="flex items-center gap-1"><span className="w-3 h-2 bg-success-500 rounded" /> Median (p50)</span>
              <span className="flex items-center gap-1"><span className="w-3 h-2 bg-success-100 rounded" /> p25-p75</span>
              <span className="flex items-center gap-1"><span className="w-3 h-2 bg-warning-100 rounded" /> p10-p25</span>
              <span className="flex items-center gap-1"><span className="w-3 h-2 bg-critical-100 rounded" /> p5-p10</span>
            </div>
          </div>
        )}

        {/* Bottom row - Cash Flow Chart + Goals summary */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-surface-soft backdrop-blur-xl rounded-xl border border-border-subtle shadow-sm p-5">
            <h3 className="font-semibold text-text mb-4">Cash Flow Summary</h3>
            {results?.cashFlows && results.cashFlows.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={results.cashFlows} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={formatAxisCurrency} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: number) => formatCurrency(v)} />
                    <Legend />
                    <Bar dataKey="totalGrossIncome" name="Income" fill="#4E7082" stackId="a" />
                    <Bar dataKey="totalExpenses" name="Expenses" fill="#f59e0b" stackId="b" />
                    <Bar dataKey="totalTax" name="Taxes" fill="#ef4444" stackId="b" />
                    <Line type="monotone" dataKey="netCashFlow" name="Net" stroke="#22c55e" strokeWidth={2} dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center bg-transparent rounded-lg border border-dashed border-border-subtle">
                <div className="text-center">
                  <TrendingUp size={32} className="mx-auto mb-2 text-text-faint" />
                  <p className="text-sm text-text-faint">Click "Run Plan" to generate cash flow projections</p>
                </div>
              </div>
            )}
          </div>

          <div className="bg-surface-soft rounded-xl border border-border-subtle shadow-sm">
            <div className="px-5 py-4 border-b border-limestone-100">
              <h3 className="font-semibold text-text">Goals Summary</h3>
            </div>
            <div className="divide-y divide-limestone-50">
              {results?.goalResults && results.goalResults.length > 0 ? (
                results.goalResults.map((goal) => {
                  const pct = Math.round((goal.fundedRatio ?? 0) * 100);
                  const isFunded = goal.status === 'funded' || goal.status === 'on_track';
                  return (
                    <div key={goal.goalId} className="px-5 py-3 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text truncate">{goal.name}</p>
                        <div className="mt-1 w-full h-1.5 bg-surface-subtle rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${isFunded ? 'bg-success-500' : pct >= 50 ? 'bg-warning-500' : 'bg-critical-500'}`}
                            style={{ width: `${Math.min(100, pct)}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-xs font-medium text-text-muted" style={{ fontFeatureSettings: '"tnum"' }}>
                        {pct}%
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className="px-5 py-8 text-center text-sm text-text-faint">
                  Run plan to see goal funding analysis
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Net Worth Timeline */}
        {results?.cashFlows && results.cashFlows.length > 0 && (
          <div className="bg-surface-soft rounded-xl border border-border-subtle shadow-sm p-5 mt-6">
            <h3 className="font-semibold text-text mb-4">Net Worth Over Time</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={results.cashFlows} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={formatAxisCurrency} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Legend />
                  {retirementYear && (
                    <ReferenceLine x={retirementYear} stroke="#A09888" strokeDasharray="5 5" label="Retirement" />
                  )}
                  <Area type="monotone" dataKey="totalAssets" name="Total Assets" fill="#4E7082" fillOpacity={0.2} stroke="#4E7082" />
                  <Area type="monotone" dataKey="netWorth" name="Net Worth" fill="#0A1628" fillOpacity={0.1} stroke="#0A1628" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
