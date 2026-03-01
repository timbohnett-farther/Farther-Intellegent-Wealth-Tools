'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { PlanNav } from '@/components/prism/layouts/PlanNav';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import {
  DollarSign,
  Percent,
  ArrowUpRight,
  AlertTriangle,
  ThumbsUp,
  ThumbsDown,
  Download,
  Calculator,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CashFlowEntry {
  year: number;
  clientAge: number;
  agi: number;
  federalTax: number;
  stateTax: number;
  seTax: number;
  niit: number;
  totalTax: number;
  effectiveFedRate: number;
  rmdIncome: number;
  socialSecurityTaxable: number;
  socialSecurityClientGross: number;
  taxableIncome?: number;
  marginalRate?: number;
  provisionalIncome?: number;
}

interface BracketHeadroomEntry {
  rate: number;
  headroom: number;
  irmaaTrigger: boolean;
  irmaaThreshold: number;
}

interface RothConversionOpportunity {
  recommendedConversionAmount: number;
  taxOnConversion: number;
  marginalRateOnConversion: number;
  irmaaImpact: number;
  netTaxCostNow: number;
  projectedTaxSavingsLifetime: number;
  netBenefit: number;
  worthConverting: boolean;
  bracketHeadroom: BracketHeadroomEntry[];
  conversionStrategy: string;
}

interface PlanResultData {
  cashFlows: CashFlowEntry[];
  rothConversionOpportunities: RothConversionOpportunity[];
  annualMarginalRate: Array<{ year: number; amount: number }>;
  annualEffectiveRate: Array<{ year: number; amount: number }>;
}

// ---------------------------------------------------------------------------
// 2025 Federal Tax Brackets (MFJ)
// ---------------------------------------------------------------------------

const FEDERAL_BRACKETS = [
  { rate: 10, floor: 0, ceiling: 23_850, color: '#E4DDD4' },       // gray-200
  { rate: 12, floor: 23_850, ceiling: 96_950, color: '#DBEAFE' },   // blue-100
  { rate: 22, floor: 96_950, ceiling: 206_700, color: '#BFDBFE' },  // blue-200
  { rate: 24, floor: 206_700, ceiling: 394_600, color: '#93C5FD' }, // blue-300
  { rate: 32, floor: 394_600, ceiling: 501_050, color: '#60A5FA' }, // blue-400
  { rate: 35, floor: 501_050, ceiling: 751_600, color: '#3B5A69' }, // blue-500
  { rate: 37, floor: 751_600, ceiling: 1_200_000, color: '#C0392B' }, // red-500
];

const STANDARD_DEDUCTION_MFJ = 30_000;

// ---------------------------------------------------------------------------
// IRMAA thresholds (2025 MFJ)
// ---------------------------------------------------------------------------

const IRMAA_THRESHOLDS = [
  { threshold: 206_000, partBSurcharge: 0, label: 'Base' },
  { threshold: 258_000, partBSurcharge: 70.0, label: 'Tier 1' },
  { threshold: 322_000, partBSurcharge: 175.0, label: 'Tier 2' },
  { threshold: 386_000, partBSurcharge: 280.0, label: 'Tier 3' },
  { threshold: 750_000, partBSurcharge: 384.9, label: 'Tier 4' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmt$(value: number): string {
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function fmtPct(value: number): string {
  return `${value.toFixed(1)}%`;
}

function fmtCompactAxis(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
}

function findCurrentBracket(taxableIncome: number) {
  for (let i = FEDERAL_BRACKETS.length - 1; i >= 0; i--) {
    if (taxableIncome > FEDERAL_BRACKETS[i].floor) {
      return FEDERAL_BRACKETS[i];
    }
  }
  return FEDERAL_BRACKETS[0];
}

function computeHeadroom(taxableIncome: number): number {
  const bracket = findCurrentBracket(taxableIncome);
  return Math.max(0, bracket.ceiling - taxableIncome);
}

function nearestIrmaaThreshold(magi: number): { threshold: number; distance: number; surcharge: number; label: string } {
  let nearest = IRMAA_THRESHOLDS[0];
  let minDist = Math.abs(magi - nearest.threshold);
  for (const t of IRMAA_THRESHOLDS) {
    const d = Math.abs(magi - t.threshold);
    if (d < minDist) {
      minDist = d;
      nearest = t;
    }
  }
  return {
    threshold: nearest.threshold,
    distance: nearest.threshold - magi,
    surcharge: nearest.partBSurcharge,
    label: nearest.label,
  };
}

// ---------------------------------------------------------------------------
// Social Security taxation chart helpers
// ---------------------------------------------------------------------------

interface SSChartDataPoint {
  year: number;
  age: number;
  provisionalIncome: number;
  zone0: number | null;
  zone50: number | null;
  zone85: number | null;
}

function buildSSChartData(cashFlows: CashFlowEntry[]): SSChartDataPoint[] {
  // MFJ thresholds
  const lower = 32_000;
  const upper = 44_000;

  return cashFlows.map((cf) => {
    const pi = cf.provisionalIncome ?? cf.agi * 0.85;
    let zone0: number | null = null;
    let zone50: number | null = null;
    let zone85: number | null = null;

    if (pi <= lower) {
      zone0 = pi;
    } else if (pi <= upper) {
      zone0 = lower;
      zone50 = pi - lower;
    } else {
      zone0 = lower;
      zone50 = upper - lower;
      zone85 = pi - upper;
    }

    return { year: cf.year, age: cf.clientAge, provisionalIncome: pi, zone0, zone50, zone85 };
  });
}

// ---------------------------------------------------------------------------
// CSV export
// ---------------------------------------------------------------------------

function exportCsv(cashFlows: CashFlowEntry[], marginalRates: Array<{ year: number; amount: number }>) {
  const rateMap = new Map(marginalRates.map((r) => [r.year, r.amount]));
  const headers = [
    'Year', 'Age', 'AGI', 'Taxable Income', 'Fed Tax', 'State Tax',
    'Eff Rate', 'Marginal Rate', 'RMD', 'SS Taxable',
  ];

  const rows = cashFlows.map((cf) => {
    const taxable = cf.taxableIncome ?? Math.max(0, cf.agi - STANDARD_DEDUCTION_MFJ);
    const marginal = cf.marginalRate ?? rateMap.get(cf.year) ?? 0;
    return [
      cf.year, cf.clientAge, cf.agi, taxable, cf.federalTax, cf.stateTax,
      (cf.effectiveFedRate * 100).toFixed(1) + '%',
      (marginal * 100).toFixed(1) + '%',
      cf.rmdIncome, cf.socialSecurityTaxable,
    ].join(',');
  });

  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'tax-projection.csv';
  a.click();
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Custom Tooltips
// ---------------------------------------------------------------------------

interface SSTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string | number;
}

function SSTooltip({ active, payload, label }: SSTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-limestone-200 bg-white px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-semibold text-charcoal-900">Year {label}</p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-charcoal-500">{entry.name}:</span>
          <span className="font-medium tabular-nums text-charcoal-900">{fmt$(entry.value)}</span>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function TaxPage() {
  const params = useParams();
  const planId = params.planId as string;

  const [data, setData] = useState<PlanResultData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [runningRoth, setRunningRoth] = useState(false);

  // ---- fetch results ----
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`/api/prism/plans/${planId}/results`);
        if (res.status === 404) {
          if (!cancelled) setNotFound(true);
          return;
        }
        if (!res.ok) throw new Error('Failed to load');
        const json = await res.json();
        if (!cancelled) setData(json);
      } catch {
        // silently fail -- will show empty state
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [planId]);

  // ---- Roth analysis trigger ----
  const runRothAnalysis = useCallback(async () => {
    setRunningRoth(true);
    try {
      const res = await fetch(`/api/prism/plans/${planId}/calculate`, { method: 'POST' });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch {
      // handle error silently
    } finally {
      setRunningRoth(false);
    }
  }, [planId]);

  // ---- derived values ----
  const currentYear = useMemo(() => {
    if (!data?.cashFlows?.length) return null;
    return data.cashFlows[0];
  }, [data]);

  const marginalRateMap = useMemo(() => {
    if (!data?.annualMarginalRate) return new Map<number, number>();
    return new Map(data.annualMarginalRate.map((r) => [r.year, r.amount]));
  }, [data]);

  const currentTaxableIncome = useMemo(() => {
    if (!currentYear) return 0;
    return currentYear.taxableIncome ?? Math.max(0, currentYear.agi - STANDARD_DEDUCTION_MFJ);
  }, [currentYear]);

  const currentBracket = useMemo(() => findCurrentBracket(currentTaxableIncome), [currentTaxableIncome]);
  const headroom = useMemo(() => computeHeadroom(currentTaxableIncome), [currentTaxableIncome]);
  const nextBracketRate = useMemo(() => {
    const next = FEDERAL_BRACKETS.find((b) => b.rate > currentBracket.rate);
    return next ? next.rate : currentBracket.rate;
  }, [currentBracket]);

  const ssChartData = useMemo(() => {
    if (!data?.cashFlows) return [];
    return buildSSChartData(data.cashFlows);
  }, [data]);

  // ---- IRMAA rows ----
  const irmaaRows = useMemo(() => {
    if (!data?.cashFlows) return [];
    return data.cashFlows.map((cf) => {
      const info = nearestIrmaaThreshold(cf.agi);
      return {
        year: cf.year,
        age: cf.clientAge,
        magi: cf.agi,
        nearestThreshold: info.threshold,
        distance: info.distance,
        surcharge: info.surcharge,
        label: info.label,
        danger: Math.abs(info.distance) < 20_000,
      };
    });
  }, [data]);

  // ---- render ----

  if (loading) {
    return (
      <div>
        <PlanNav planId={planId} clientName="Sarah & Michael Chen" planName="Comprehensive Financial Plan" />
        <div className="min-h-screen bg-limestone-50">
          <div className="max-w-content mx-auto px-6 py-6">
            <div className="flex items-center gap-2 mb-6">
              <Calculator size={20} className="text-brand-500" />
              <h1 className="text-xl font-bold text-charcoal-900">Tax Center</h1>
            </div>
            <div className="flex items-center justify-center py-32">
              <div className="flex flex-col items-center gap-3">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-limestone-200 border-t-brand-500" />
                <p className="text-sm text-charcoal-500">Loading tax analysis...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (notFound || !data) {
    return (
      <div>
        <PlanNav planId={planId} clientName="Sarah & Michael Chen" planName="Comprehensive Financial Plan" />
        <div className="min-h-screen bg-limestone-50">
          <div className="max-w-content mx-auto px-6 py-6">
            <div className="flex items-center gap-2 mb-6">
              <Calculator size={20} className="text-brand-500" />
              <h1 className="text-xl font-bold text-charcoal-900">Tax Center</h1>
            </div>
            <div className="bg-white rounded-xl border border-limestone-200 shadow-sm p-8">
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center mb-4">
                  <AlertTriangle size={24} className="text-orange-400" />
                </div>
                <h3 className="text-sm font-semibold text-charcoal-900 mb-1">No results yet</h3>
                <p className="text-sm text-charcoal-500 max-w-sm">
                  Run the plan calculation first to generate tax analysis data.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const cashFlows = data.cashFlows ?? [];
  const rothOpportunities = data.rothConversionOpportunities ?? [];

  // Build bracket visualizer data
  const maxBracketCeiling = FEDERAL_BRACKETS[FEDERAL_BRACKETS.length - 1].ceiling;
  const visualizerMax = Math.max(currentTaxableIncome + STANDARD_DEDUCTION_MFJ, maxBracketCeiling) * 1.05;

  return (
    <div>
      <PlanNav planId={planId} clientName="Sarah & Michael Chen" planName="Comprehensive Financial Plan" />

      <div className="min-h-screen bg-limestone-50">
        <div className="max-w-content mx-auto px-6 py-6">
          {/* Module header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Calculator size={20} className="text-brand-500" />
                <h1 className="text-xl font-bold text-charcoal-900">Tax Center</h1>
              </div>
              <p className="text-sm text-charcoal-500">
                Analyze federal and state tax obligations, Roth conversions, and tax-efficient withdrawal strategies.
              </p>
            </div>
          </div>

          {/* ================================================================
              ROW 1: Current Year Tax Summary Cards
          ================================================================ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Card 1: Estimated Federal Tax */}
            <div className="bg-white rounded-xl border border-limestone-200 p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-8 w-8 rounded-lg bg-brand-50 flex items-center justify-center">
                  <DollarSign size={16} className="text-brand-700" />
                </div>
                <span className="text-xs font-medium text-charcoal-500 uppercase tracking-wide">Est. Federal Tax</span>
              </div>
              <p className="text-2xl font-bold text-charcoal-900 tabular-nums">
                {currentYear ? fmt$(currentYear.federalTax) : '--'}
              </p>
              <p className="text-xs text-charcoal-500 mt-1">
                Effective rate: {currentYear ? fmtPct(currentYear.effectiveFedRate * 100) : '--'}
              </p>
            </div>

            {/* Card 2: Estimated State Tax */}
            <div className="bg-white rounded-xl border border-limestone-200 p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <DollarSign size={16} className="text-emerald-600" />
                </div>
                <span className="text-xs font-medium text-charcoal-500 uppercase tracking-wide">Est. State Tax</span>
              </div>
              <p className="text-2xl font-bold text-charcoal-900 tabular-nums">
                {currentYear ? fmt$(currentYear.stateTax) : '--'}
              </p>
              <p className="text-xs text-charcoal-500 mt-1">
                Total tax: {currentYear ? fmt$(currentYear.totalTax) : '--'}
              </p>
            </div>

            {/* Card 3: Marginal Federal Rate */}
            <div className="bg-white rounded-xl border border-limestone-200 p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-8 w-8 rounded-lg bg-warning-50 flex items-center justify-center">
                  <Percent size={16} className="text-warning-500" />
                </div>
                <span className="text-xs font-medium text-charcoal-500 uppercase tracking-wide">Marginal Rate</span>
              </div>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold text-charcoal-900 tabular-nums">
                  {fmtPct(currentBracket.rate)}
                </p>
                <span
                  className="inline-block h-3 w-3 rounded-full"
                  style={{ backgroundColor: currentBracket.color }}
                />
              </div>
              <p className="text-xs text-charcoal-500 mt-1">
                Federal bracket
              </p>
            </div>

            {/* Card 4: Bracket Headroom */}
            <div className="bg-white rounded-xl border border-limestone-200 p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-8 w-8 rounded-lg bg-brand-50 flex items-center justify-center">
                  <ArrowUpRight size={16} className="text-brand-700" />
                </div>
                <span className="text-xs font-medium text-charcoal-500 uppercase tracking-wide">Bracket Headroom</span>
              </div>
              <p className="text-2xl font-bold text-charcoal-900 tabular-nums">
                {fmt$(headroom)}
              </p>
              <p className="text-xs text-charcoal-500 mt-1">
                to next bracket ({fmtPct(nextBracketRate)})
              </p>
            </div>
          </div>

          {/* ================================================================
              ROW 2: Tax Bracket Visualizer
          ================================================================ */}
          <div className="bg-white rounded-xl border border-limestone-200 p-6 mb-6">
            <h2 className="text-sm font-semibold text-charcoal-900 mb-1">Tax Bracket Visualizer</h2>
            <p className="text-xs text-charcoal-500 mb-4">Income layered through 2025 federal brackets (MFJ)</p>

            <div className="relative">
              {/* Bar */}
              <div className="flex h-12 rounded-lg overflow-hidden border border-limestone-200">
                {/* Standard Deduction segment */}
                <div
                  className="relative flex items-center justify-center text-[10px] font-medium text-charcoal-700 bg-success-100 border-r border-white/60"
                  style={{ width: `${(STANDARD_DEDUCTION_MFJ / visualizerMax) * 100}%` }}
                  title={`Standard Deduction: ${fmt$(STANDARD_DEDUCTION_MFJ)}`}
                >
                  {(STANDARD_DEDUCTION_MFJ / visualizerMax) * 100 > 5 && (
                    <span className="truncate px-1">Std Ded {fmt$(STANDARD_DEDUCTION_MFJ)}</span>
                  )}
                </div>

                {/* Bracket segments */}
                {FEDERAL_BRACKETS.map((bracket) => {
                  const bracketWidth = bracket.ceiling - bracket.floor;
                  const incomeInBracket = Math.max(
                    0,
                    Math.min(currentTaxableIncome, bracket.ceiling) - bracket.floor,
                  );
                  const widthPct = (bracketWidth / visualizerMax) * 100;
                  const fillPct = bracketWidth > 0 ? (incomeInBracket / bracketWidth) * 100 : 0;

                  return (
                    <div
                      key={bracket.rate}
                      className="relative border-r border-white/60 overflow-hidden"
                      style={{ width: `${widthPct}%` }}
                      title={`${bracket.rate}% bracket: ${fmt$(incomeInBracket)} of ${fmt$(bracketWidth)}`}
                    >
                      {/* Filled portion */}
                      <div
                        className="absolute inset-y-0 left-0"
                        style={{
                          width: `${fillPct}%`,
                          backgroundColor: bracket.color,
                          opacity: incomeInBracket > 0 ? 1 : 0.3,
                        }}
                      />
                      {/* Unfilled portion */}
                      <div
                        className="absolute inset-y-0 right-0 bg-limestone-50"
                        style={{ width: `${100 - fillPct}%`, opacity: 0.5 }}
                      />
                      {/* Label */}
                      {widthPct > 4 && (
                        <div className="relative z-10 flex flex-col items-center justify-center h-full text-[10px] font-medium text-charcoal-700">
                          <span>{bracket.rate}%</span>
                          {incomeInBracket > 0 && widthPct > 6 && (
                            <span className="text-[9px] text-charcoal-500">{fmt$(incomeInBracket)}</span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Income marker line */}
              {currentTaxableIncome > 0 && (
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-critical-500 z-20"
                  style={{
                    left: `${((currentTaxableIncome + STANDARD_DEDUCTION_MFJ) / visualizerMax) * 100}%`,
                  }}
                >
                  <div className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-critical-500 px-1.5 py-0.5 text-[10px] font-medium text-white">
                    {fmt$(currentTaxableIncome)} taxable
                  </div>
                </div>
              )}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-3 mt-4">
              <div className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-sm bg-success-100 border border-success-100" />
                <span className="text-[10px] text-charcoal-500">Std Deduction</span>
              </div>
              {FEDERAL_BRACKETS.map((b) => (
                <div key={b.rate} className="flex items-center gap-1.5">
                  <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: b.color }} />
                  <span className="text-[10px] text-charcoal-500">{b.rate}%</span>
                </div>
              ))}
              <div className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-0.5 bg-critical-500" />
                <span className="text-[10px] text-charcoal-500">Your income</span>
              </div>
            </div>
          </div>

          {/* ================================================================
              ROW 3: Roth Conversion Opportunity Panel
          ================================================================ */}
          <div className="bg-white rounded-xl border border-limestone-200 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-charcoal-900 mb-1">Roth Conversion Opportunities</h2>
                <p className="text-xs text-charcoal-500">10-year Roth conversion analysis by year</p>
              </div>
              <button
                type="button"
                onClick={runRothAnalysis}
                disabled={runningRoth}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {runningRoth ? (
                  <>
                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Running...
                  </>
                ) : (
                  <>
                    <Calculator size={14} />
                    Run Roth Analysis
                  </>
                )}
              </button>
            </div>

            {rothOpportunities.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-limestone-200">
                      <th className="py-2 pr-4 text-left font-semibold text-charcoal-500">Year</th>
                      <th className="py-2 pr-4 text-left font-semibold text-charcoal-500">Age</th>
                      <th className="py-2 pr-4 text-left font-semibold text-charcoal-500">Bracket</th>
                      <th className="py-2 pr-4 text-right font-semibold text-charcoal-500">Headroom</th>
                      <th className="py-2 pr-4 text-right font-semibold text-charcoal-500">Rec. Amount</th>
                      <th className="py-2 pr-4 text-right font-semibold text-charcoal-500">Tax Cost</th>
                      <th className="py-2 pr-4 text-right font-semibold text-charcoal-500">IRMAA Impact</th>
                      <th className="py-2 pr-4 text-right font-semibold text-charcoal-500">Net Benefit</th>
                      <th className="py-2 text-center font-semibold text-charcoal-500">Rec.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rothOpportunities.map((opp, idx) => {
                      const cf = cashFlows[idx];
                      const year = cf?.year ?? new Date().getFullYear() + idx;
                      const age = cf?.clientAge ?? 65 + idx;
                      const marginalRate = opp.marginalRateOnConversion * 100;
                      const topHeadroom = opp.bracketHeadroom?.[0]?.headroom ?? 0;

                      return (
                        <tr key={year} className={idx % 2 === 0 ? 'bg-white' : 'bg-limestone-50'}>
                          <td className="py-2 pr-4 text-charcoal-900 tabular-nums">{year}</td>
                          <td className="py-2 pr-4 text-charcoal-700 tabular-nums">{age}</td>
                          <td className="py-2 pr-4 text-charcoal-700">{fmtPct(marginalRate)}</td>
                          <td className="py-2 pr-4 text-right text-charcoal-700 tabular-nums">{fmt$(topHeadroom)}</td>
                          <td className="py-2 pr-4 text-right text-charcoal-900 font-medium tabular-nums">{fmt$(opp.recommendedConversionAmount)}</td>
                          <td className="py-2 pr-4 text-right text-charcoal-700 tabular-nums">{fmt$(opp.taxOnConversion)}</td>
                          <td className="py-2 pr-4 text-right text-charcoal-700 tabular-nums">{fmt$(opp.irmaaImpact)}</td>
                          <td className={`py-2 pr-4 text-right font-medium tabular-nums ${opp.netBenefit >= 0 ? 'text-emerald-600' : 'text-critical-500'}`}>
                            {fmt$(opp.netBenefit)}
                          </td>
                          <td className="py-2 text-center">
                            {opp.worthConverting ? (
                              <ThumbsUp size={14} className="text-emerald-500 inline-block" />
                            ) : (
                              <ThumbsDown size={14} className="text-critical-500 inline-block" />
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Calculator size={20} className="text-charcoal-300 mb-2" />
                <p className="text-xs text-charcoal-500">Click &quot;Run Roth Analysis&quot; to generate conversion recommendations.</p>
              </div>
            )}
          </div>

          {/* ================================================================
              ROW 4: Social Security Taxation Chart
          ================================================================ */}
          <div className="bg-white rounded-xl border border-limestone-200 p-6 mb-6">
            <h2 className="text-sm font-semibold text-charcoal-900 mb-1">Social Security Taxation</h2>
            <p className="text-xs text-charcoal-500 mb-4">Provisional income relative to SS taxation thresholds (MFJ)</p>

            {ssChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={340}>
                <AreaChart data={ssChartData} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F5F1EC" />
                  <XAxis
                    dataKey="year"
                    tick={{ fontSize: 11, fill: '#7A7265' }}
                    axisLine={{ stroke: '#E4DDD4' }}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={fmtCompactAxis}
                    tick={{ fontSize: 11, fill: '#7A7265' }}
                    axisLine={false}
                    tickLine={false}
                    width={65}
                  />
                  <Tooltip content={<SSTooltip />} />

                  {/* 0% zone */}
                  <Area
                    type="monotone"
                    dataKey="zone0"
                    name="0% Taxable"
                    stackId="ss"
                    fill="#D1FAE5"
                    stroke="#6EE7B7"
                    strokeWidth={1}
                    fillOpacity={0.8}
                  />
                  {/* 50% zone */}
                  <Area
                    type="monotone"
                    dataKey="zone50"
                    name="50% Taxable"
                    stackId="ss"
                    fill="#FEF3C7"
                    stroke="#FCD34D"
                    strokeWidth={1}
                    fillOpacity={0.8}
                  />
                  {/* 85% zone */}
                  <Area
                    type="monotone"
                    dataKey="zone85"
                    name="85% Taxable"
                    stackId="ss"
                    fill="#FEE2E2"
                    stroke="#FCA5A5"
                    strokeWidth={1}
                    fillOpacity={0.8}
                  />

                  {/* Threshold reference lines (MFJ) */}
                  <ReferenceLine
                    y={32_000}
                    stroke="#2E8B57"
                    strokeDasharray="6 3"
                    label={{ value: '$32K (MFJ lower)', position: 'right', fontSize: 10, fill: '#7A7265' }}
                  />
                  <ReferenceLine
                    y={44_000}
                    stroke="#D4860B"
                    strokeDasharray="6 3"
                    label={{ value: '$44K (MFJ upper)', position: 'right', fontSize: 10, fill: '#7A7265' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center py-16">
                <p className="text-xs text-charcoal-300">No cash flow data available for chart</p>
              </div>
            )}

            {/* Legend */}
            <div className="flex flex-wrap gap-4 mt-3">
              <div className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-5 rounded-sm bg-success-200" />
                <span className="text-[10px] text-charcoal-500">0% SS Taxable</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-5 rounded-sm bg-warning-100" />
                <span className="text-[10px] text-charcoal-500">50% SS Taxable</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-5 rounded-sm bg-critical-100" />
                <span className="text-[10px] text-charcoal-500">85% SS Taxable</span>
              </div>
            </div>
          </div>

          {/* ================================================================
              ROW 5: IRMAA Warning Panel
          ================================================================ */}
          <div className="bg-white rounded-xl border border-limestone-200 p-6 mb-6">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle size={16} className="text-warning-500" />
              <h2 className="text-sm font-semibold text-charcoal-900">IRMAA Threshold Analysis</h2>
            </div>
            <p className="text-xs text-charcoal-500 mb-4">Years where MAGI approaches Medicare IRMAA surcharge thresholds</p>

            {irmaaRows.length > 0 ? (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-limestone-200">
                        <th className="py-2 pr-4 text-left font-semibold text-charcoal-500">Year</th>
                        <th className="py-2 pr-4 text-left font-semibold text-charcoal-500">Age</th>
                        <th className="py-2 pr-4 text-right font-semibold text-charcoal-500">MAGI</th>
                        <th className="py-2 pr-4 text-right font-semibold text-charcoal-500">Nearest Threshold</th>
                        <th className="py-2 pr-4 text-right font-semibold text-charcoal-500">Distance</th>
                        <th className="py-2 pr-4 text-right font-semibold text-charcoal-500">IRMAA Surcharge</th>
                        <th className="py-2 text-center font-semibold text-charcoal-500">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {irmaaRows.map((row, idx) => (
                        <tr
                          key={row.year}
                          className={`${idx % 2 === 0 ? 'bg-white' : 'bg-limestone-50'} ${row.danger ? 'ring-1 ring-inset ring-warning-100 bg-warning-50' : ''}`}
                        >
                          <td className="py-2 pr-4 text-charcoal-900 tabular-nums">{row.year}</td>
                          <td className="py-2 pr-4 text-charcoal-700 tabular-nums">{row.age}</td>
                          <td className="py-2 pr-4 text-right text-charcoal-900 font-medium tabular-nums">{fmt$(row.magi)}</td>
                          <td className="py-2 pr-4 text-right text-charcoal-700 tabular-nums">{fmt$(row.nearestThreshold)}</td>
                          <td className={`py-2 pr-4 text-right font-medium tabular-nums ${row.distance > 0 ? 'text-emerald-600' : 'text-critical-500'}`}>
                            {row.distance > 0 ? '+' : ''}{fmt$(row.distance)}
                          </td>
                          <td className="py-2 pr-4 text-right text-charcoal-700 tabular-nums">
                            {row.surcharge > 0 ? `$${row.surcharge.toFixed(1)}/mo` : '--'}
                          </td>
                          <td className="py-2 text-center">
                            {row.danger ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-warning-100 px-2 py-0.5 text-[10px] font-medium text-warning-700">
                                <AlertTriangle size={10} />
                                Danger Zone
                              </span>
                            ) : row.distance < 0 ? (
                              <span className="inline-flex items-center rounded-full bg-critical-100 px-2 py-0.5 text-[10px] font-medium text-critical-700">
                                Over Threshold
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-full bg-success-100 px-2 py-0.5 text-[10px] font-medium text-success-700">
                                Clear
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-4 rounded-lg bg-warning-50 border border-warning-100 px-4 py-3">
                  <p className="text-xs text-warning-700">
                    <strong>Recommended actions for danger-zone years:</strong> Consider deferring income, maximizing pre-tax contributions,
                    or timing Roth conversions to stay below IRMAA thresholds. A $1 over the threshold triggers the full surcharge for the year.
                  </p>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center py-12">
                <p className="text-xs text-charcoal-300">No data available</p>
              </div>
            )}
          </div>

          {/* ================================================================
              ROW 6: Multi-Year Tax Projection Table
          ================================================================ */}
          <div className="bg-white rounded-xl border border-limestone-200 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-charcoal-900 mb-1">Multi-Year Tax Projection</h2>
                <p className="text-xs text-charcoal-500">Comprehensive year-by-year tax breakdown</p>
              </div>
              <button
                type="button"
                onClick={() => exportCsv(cashFlows, data.annualMarginalRate ?? [])}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-charcoal-700 bg-limestone-100 rounded-lg hover:bg-limestone-200 transition-colors"
              >
                <Download size={14} />
                Export CSV
              </button>
            </div>

            {cashFlows.length > 0 ? (
              <div className="overflow-x-auto max-h-[500px] overflow-y-auto relative">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 z-10 bg-white">
                    <tr className="border-b-2 border-limestone-200">
                      <th className="py-2 pr-3 text-left font-semibold text-charcoal-500 bg-white">Year</th>
                      <th className="py-2 pr-3 text-left font-semibold text-charcoal-500 bg-white">Age</th>
                      <th className="py-2 pr-3 text-right font-semibold text-charcoal-500 bg-white">AGI</th>
                      <th className="py-2 pr-3 text-right font-semibold text-charcoal-500 bg-white">Taxable Income</th>
                      <th className="py-2 pr-3 text-right font-semibold text-charcoal-500 bg-white">Fed Tax</th>
                      <th className="py-2 pr-3 text-right font-semibold text-charcoal-500 bg-white">State Tax</th>
                      <th className="py-2 pr-3 text-right font-semibold text-charcoal-500 bg-white">Eff Rate</th>
                      <th className="py-2 pr-3 text-right font-semibold text-charcoal-500 bg-white">Marginal</th>
                      <th className="py-2 pr-3 text-right font-semibold text-charcoal-500 bg-white">RMD</th>
                      <th className="py-2 text-right font-semibold text-charcoal-500 bg-white">SS Taxable</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cashFlows.map((cf, idx) => {
                      const taxable = cf.taxableIncome ?? Math.max(0, cf.agi - STANDARD_DEDUCTION_MFJ);
                      const marginal = cf.marginalRate ?? marginalRateMap.get(cf.year) ?? 0;

                      return (
                        <tr
                          key={cf.year}
                          className={idx % 2 === 0 ? 'bg-white' : 'bg-limestone-50'}
                        >
                          <td className="py-2 pr-3 text-charcoal-900 font-medium tabular-nums">{cf.year}</td>
                          <td className="py-2 pr-3 text-charcoal-700 tabular-nums">{cf.clientAge}</td>
                          <td className="py-2 pr-3 text-right text-charcoal-900 tabular-nums">{fmt$(cf.agi)}</td>
                          <td className="py-2 pr-3 text-right text-charcoal-700 tabular-nums">{fmt$(taxable)}</td>
                          <td className="py-2 pr-3 text-right text-charcoal-900 font-medium tabular-nums">{fmt$(cf.federalTax)}</td>
                          <td className="py-2 pr-3 text-right text-charcoal-700 tabular-nums">{fmt$(cf.stateTax)}</td>
                          <td className="py-2 pr-3 text-right text-charcoal-700 tabular-nums">{fmtPct(cf.effectiveFedRate * 100)}</td>
                          <td className="py-2 pr-3 text-right text-charcoal-700 tabular-nums">{fmtPct(marginal * 100)}</td>
                          <td className="py-2 pr-3 text-right text-charcoal-700 tabular-nums">{fmt$(cf.rmdIncome)}</td>
                          <td className="py-2 text-right text-charcoal-700 tabular-nums">{fmt$(cf.socialSecurityTaxable)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex items-center justify-center py-12">
                <p className="text-xs text-charcoal-300">No projection data available</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
