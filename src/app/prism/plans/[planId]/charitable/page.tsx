'use client';

import React, { useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { PlanNav } from '@/components/prism/layouts/PlanNav';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from 'recharts';
import {
  Heart,
  Landmark,
  Gift,
  Scale,
  Building,
  Calculator,
  FileText,
  DollarSign,
  Percent,
  ArrowDownRight,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Info,
  ChevronRight,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmt$(v: number): string {
  return v.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmtPct(v: number): string {
  return `${v.toFixed(1)}%`;
}

function fmtCompact(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

// ---------------------------------------------------------------------------
// Mock Data
// ---------------------------------------------------------------------------

const CLIENT_AGI = 850_000;
const CLIENT_AGE = 72;
const STANDARD_DEDUCTION_MFJ = 30_000;
const RMD_AMOUNT = 48_000;
const DAF_BALANCE = 320_000;

const GIVING_HISTORY = [
  { year: 2020, cash: 25_000, nonCash: 50_000, qcds: 0, dafGrants: 15_000, total: 90_000, deduction: 75_000 },
  { year: 2021, cash: 30_000, nonCash: 0, qcds: 10_000, dafGrants: 20_000, total: 60_000, deduction: 50_000 },
  { year: 2022, cash: 35_000, nonCash: 75_000, qcds: 15_000, dafGrants: 25_000, total: 150_000, deduction: 135_000 },
  { year: 2023, cash: 40_000, nonCash: 0, qcds: 20_000, dafGrants: 30_000, total: 90_000, deduction: 70_000 },
  { year: 2024, cash: 45_000, nonCash: 100_000, qcds: 25_000, dafGrants: 35_000, total: 205_000, deduction: 180_000 },
  { year: 2025, cash: 50_000, nonCash: 0, qcds: 48_000, dafGrants: 40_000, total: 138_000, deduction: 90_000 },
];

const TOTAL_GIVING = GIVING_HISTORY[GIVING_HISTORY.length - 1].total;
const TOTAL_DEDUCTION = GIVING_HISTORY[GIVING_HISTORY.length - 1].deduction;
const NET_COST = TOTAL_GIVING - Math.round(TOTAL_DEDUCTION * 0.37);

const BUNCHING_ANNUAL_BUDGET = 50_000;
const BUNCHING_STD_DEDUCTION = STANDARD_DEDUCTION_MFJ;

const QCD_COMPARISON = [
  { metric: 'Gift Amount', qcd: '$48,000', cash: '$48,000' },
  { metric: 'AGI Impact', qcd: 'Reduces AGI by $48,000', cash: 'No reduction to AGI' },
  { metric: 'Deduction Type', qcd: 'Not a deduction (above-the-line)', cash: 'Itemized deduction (Sch A)' },
  { metric: 'SS Taxation Impact', qcd: 'Lowers provisional income', cash: 'No change to provisional income' },
  { metric: 'IRMAA Impact', qcd: 'May avoid IRMAA surcharge', cash: 'No IRMAA benefit' },
  { metric: 'Net Tax Savings', qcd: '$21,120', cash: '$17,760' },
];

const CRT_DEFAULTS = {
  assetValue: 1_000_000,
  costBasis: 200_000,
  payoutRate: 5.0,
  term: 20,
  rate7520: 5.2,
};

const DAF_VS_FOUNDATION = [
  { feature: 'Minimum to Establish', daf: '$5,000 - $25,000', foundation: '$1,000,000+' },
  { feature: 'Annual Distribution Req.', daf: 'None (recommended)', foundation: '5% of assets annually' },
  { feature: 'Tax Deduction (Cash)', daf: '60% AGI limit', foundation: '30% AGI limit' },
  { feature: 'Tax Deduction (Stock)', daf: '30% AGI (FMV)', foundation: '20% AGI (FMV)' },
  { feature: 'Administrative Cost', daf: 'Low (0.20-0.60%)', foundation: 'High ($15K-$50K/yr)' },
  { feature: 'Privacy', daf: 'Can be anonymous', foundation: 'Form 990-PF is public' },
  { feature: 'Family Involvement', daf: 'Successor advisors', foundation: 'Board positions, salaries' },
  { feature: 'Investment Control', daf: 'Limited choices', foundation: 'Full control' },
  { feature: 'Grant Flexibility', daf: 'US public charities', foundation: 'Broader (intl, individuals)' },
];

const GIVING_METHODS = [
  { method: 'Cash', deduction: 50_000, taxSavings: 18_500, cgAvoided: 0, agiImpact: 'None', netCost: 31_500 },
  { method: 'Appreciated Stock', deduction: 50_000, taxSavings: 18_500, cgAvoided: 9_520, agiImpact: 'None', netCost: 21_980 },
  { method: 'DAF (Stock)', deduction: 50_000, taxSavings: 18_500, cgAvoided: 9_520, agiImpact: 'None', netCost: 21_980 },
  { method: 'QCD', deduction: 0, taxSavings: 21_120, cgAvoided: 0, agiImpact: 'Reduces by $48K', netCost: 26_880 },
  { method: 'CRT', deduction: 35_200, taxSavings: 13_024, cgAvoided: 47_600, agiImpact: 'None', netCost: -10_624 },
];

const MULTI_YEAR_PROJECTION = [
  { year: 2025, giving: 138_000, deduction: 90_000, taxSavings: 33_300, netCost: 104_700 },
  { year: 2026, giving: 145_000, deduction: 95_000, taxSavings: 35_150, netCost: 109_850 },
  { year: 2027, giving: 152_000, deduction: 100_000, taxSavings: 37_000, netCost: 115_000 },
  { year: 2028, giving: 160_000, deduction: 105_000, taxSavings: 38_850, netCost: 121_150 },
  { year: 2029, giving: 168_000, deduction: 110_000, taxSavings: 40_700, netCost: 127_300 },
];

// ---------------------------------------------------------------------------
// Tab Definitions
// ---------------------------------------------------------------------------

const TABS = [
  { key: 'overview', label: 'Charitable Overview', icon: Heart },
  { key: 'daf', label: 'Donor-Advised Fund (DAF)', icon: Landmark },
  { key: 'qcd', label: 'QCD', icon: Gift },
  { key: 'trusts', label: 'Charitable Trusts', icon: Scale },
  { key: 'foundation', label: 'Private Foundation', icon: Building },
  { key: 'optimizer', label: 'Deduction Optimizer', icon: Calculator },
  { key: 'strategy', label: 'Giving Strategy', icon: FileText },
] as const;

type TabKey = (typeof TABS)[number]['key'];

// ---------------------------------------------------------------------------
// Custom Tooltip
// ---------------------------------------------------------------------------

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string | number }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-gray-200 bg-white px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-semibold text-gray-900">{label}</p>
      {payload.map((e) => (
        <div key={e.name} className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: e.color }} />
          <span className="text-gray-600">{e.name}:</span>
          <span className="font-medium tabular-nums text-gray-900">{fmtCompact(e.value)}</span>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab Content Components
// ---------------------------------------------------------------------------

function OverviewTab() {
  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-8 w-8 rounded-lg bg-pink-50 flex items-center justify-center">
              <Heart size={16} className="text-pink-600" />
            </div>
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Annual Giving</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 tabular-nums">{fmt$(TOTAL_GIVING)}</p>
          <p className="text-xs text-gray-500 mt-1">Current year total</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center">
              <DollarSign size={16} className="text-emerald-600" />
            </div>
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Tax Deductions</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 tabular-nums">{fmt$(TOTAL_DEDUCTION)}</p>
          <p className="text-xs text-gray-500 mt-1">Deductions generated</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center">
              <ArrowDownRight size={16} className="text-blue-600" />
            </div>
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Net Cost of Giving</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 tabular-nums">{fmt$(NET_COST)}</p>
          <p className="text-xs text-gray-500 mt-1">After tax savings at 37%</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-8 w-8 rounded-lg bg-indigo-50 flex items-center justify-center">
              <Landmark size={16} className="text-indigo-600" />
            </div>
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">DAF Balance</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 tabular-nums">{fmt$(DAF_BALANCE)}</p>
          <p className="text-xs text-gray-500 mt-1">Available for grants</p>
        </div>
      </div>

      {/* Giving History Table */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Giving History</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 pr-4 font-medium text-gray-500">Year</th>
                <th className="text-right py-2 px-3 font-medium text-gray-500">Cash Gifts</th>
                <th className="text-right py-2 px-3 font-medium text-gray-500">Non-Cash</th>
                <th className="text-right py-2 px-3 font-medium text-gray-500">QCDs</th>
                <th className="text-right py-2 px-3 font-medium text-gray-500">DAF Grants</th>
                <th className="text-right py-2 px-3 font-medium text-gray-500">Total</th>
                <th className="text-right py-2 pl-3 font-medium text-gray-500">Deduction</th>
              </tr>
            </thead>
            <tbody>
              {GIVING_HISTORY.map((r) => (
                <tr key={r.year} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-2.5 pr-4 font-medium text-gray-900">{r.year}</td>
                  <td className="py-2.5 px-3 text-right tabular-nums text-gray-700">{fmt$(r.cash)}</td>
                  <td className="py-2.5 px-3 text-right tabular-nums text-gray-700">{fmt$(r.nonCash)}</td>
                  <td className="py-2.5 px-3 text-right tabular-nums text-gray-700">{fmt$(r.qcds)}</td>
                  <td className="py-2.5 px-3 text-right tabular-nums text-gray-700">{fmt$(r.dafGrants)}</td>
                  <td className="py-2.5 px-3 text-right tabular-nums text-gray-900 font-medium">{fmt$(r.total)}</td>
                  <td className="py-2.5 pl-3 text-right tabular-nums font-medium text-emerald-600">{fmt$(r.deduction)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Annual Giving Chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-1">Annual Giving Over Time</h2>
        <p className="text-xs text-gray-500 mb-4">Breakdown by giving method</p>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={GIVING_HISTORY}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="year" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={fmtCompact} />
              <Tooltip content={<ChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="cash" name="Cash Gifts" stackId="a" fill="#6366F1" />
              <Bar dataKey="nonCash" name="Non-Cash" stackId="a" fill="#8B5CF6" />
              <Bar dataKey="qcds" name="QCDs" stackId="a" fill="#10B981" />
              <Bar dataKey="dafGrants" name="DAF Grants" stackId="a" fill="#F59E0B" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function DafTab() {
  const [bunchingYears, setBunchingYears] = useState(3);
  const cashDeductionLimit = CLIENT_AGI * 0.6;
  const stockDeductionLimit = CLIENT_AGI * 0.3;
  const bunchingTotal = BUNCHING_ANNUAL_BUDGET * bunchingYears;
  const bunchingDeduction = bunchingTotal;
  const bunchingItemized = bunchingDeduction + 25_000; // SALT + mortgage interest etc.
  const bunchingStdYears = bunchingYears - 1;
  const annualItemized = BUNCHING_ANNUAL_BUDGET + 25_000;
  const noBunchingTotalDeductions = annualItemized > BUNCHING_STD_DEDUCTION
    ? annualItemized * bunchingYears
    : BUNCHING_STD_DEDUCTION * bunchingYears;
  const bunchingTotalDeductions = bunchingItemized + (BUNCHING_STD_DEDUCTION * bunchingStdYears);
  const bunchingSavings = Math.round((bunchingTotalDeductions - noBunchingTotalDeductions) * 0.37);

  return (
    <div className="space-y-6">
      {/* DAF Details */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">DAF Account Details</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
            <span className="text-xs text-gray-500">Institution</span>
            <p className="text-sm font-semibold text-gray-900 mt-1">Fidelity Charitable</p>
          </div>
          <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
            <span className="text-xs text-gray-500">Current Balance</span>
            <p className="text-sm font-semibold text-gray-900 mt-1 tabular-nums">{fmt$(DAF_BALANCE)}</p>
          </div>
          <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
            <span className="text-xs text-gray-500">Annual Grants (2025)</span>
            <p className="text-sm font-semibold text-gray-900 mt-1 tabular-nums">{fmt$(40_000)}</p>
          </div>
        </div>
      </div>

      {/* Funding Strategy Comparison */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-1">Funding Strategy Comparison</h2>
        <p className="text-xs text-gray-500 mb-4">Compare methods for funding your DAF (assuming $100,000 contribution)</p>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Option A: Cash */}
          <div className="rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="h-6 w-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">A</span>
              <h3 className="text-sm font-semibold text-gray-900">Fund with Cash</h3>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between"><span className="text-gray-500">Contribution</span><span className="font-medium text-gray-900">$100,000</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Deduction</span><span className="font-medium text-emerald-600">$100,000</span></div>
              <div className="flex justify-between"><span className="text-gray-500">AGI Limit</span><span className="font-medium text-gray-900">60% ({fmt$(cashDeductionLimit)})</span></div>
              <div className="flex justify-between"><span className="text-gray-500">CG Tax Avoided</span><span className="font-medium text-gray-700">$0</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Tax Savings (37%)</span><span className="font-medium text-emerald-600">$37,000</span></div>
              <div className="flex justify-between border-t border-gray-100 pt-2 mt-2"><span className="font-semibold text-gray-900">Net Cost</span><span className="font-bold text-gray-900">$63,000</span></div>
            </div>
          </div>

          {/* Option B: Appreciated Stock */}
          <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50/30 p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="h-6 w-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold">B</span>
              <h3 className="text-sm font-semibold text-gray-900">Fund with Appreciated Stock</h3>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium ml-auto">Recommended</span>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between"><span className="text-gray-500">Contribution (FMV)</span><span className="font-medium text-gray-900">$100,000</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Deduction (FMV)</span><span className="font-medium text-emerald-600">$100,000</span></div>
              <div className="flex justify-between"><span className="text-gray-500">AGI Limit</span><span className="font-medium text-gray-900">30% ({fmt$(stockDeductionLimit)})</span></div>
              <div className="flex justify-between"><span className="text-gray-500">CG Tax Avoided</span><span className="font-medium text-emerald-600">$19,040</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Tax Savings (37%)</span><span className="font-medium text-emerald-600">$37,000</span></div>
              <div className="flex justify-between border-t border-gray-100 pt-2 mt-2"><span className="font-semibold text-gray-900">Net Cost</span><span className="font-bold text-emerald-700">$43,960</span></div>
            </div>
          </div>

          {/* Option C: Bunching */}
          <div className="rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="h-6 w-6 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-xs font-bold">C</span>
              <h3 className="text-sm font-semibold text-gray-900">Bunching Strategy</h3>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between"><span className="text-gray-500">Annual Budget</span><span className="font-medium text-gray-900">{fmt$(BUNCHING_ANNUAL_BUDGET)}/yr</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Bunch 3 Years</span><span className="font-medium text-gray-900">{fmt$(BUNCHING_ANNUAL_BUDGET * 3)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Itemize Year 1</span><span className="font-medium text-emerald-600">{fmt$(BUNCHING_ANNUAL_BUDGET * 3 + 25_000)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Std Ded Years 2-3</span><span className="font-medium text-gray-900">{fmt$(BUNCHING_STD_DEDUCTION)} x 2</span></div>
              <div className="flex justify-between"><span className="text-gray-500">3yr Total Deductions</span><span className="font-medium text-emerald-600">{fmt$(bunchingTotalDeductions)}</span></div>
              <div className="flex justify-between border-t border-gray-100 pt-2 mt-2"><span className="font-semibold text-gray-900">Extra Tax Savings</span><span className="font-bold text-emerald-700">{fmt$(bunchingSavings > 0 ? bunchingSavings : 0)}</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* Bunching Optimizer */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-1">Bunching Optimizer</h2>
        <p className="text-xs text-gray-500 mb-4">Adjust the bunching interval to find the optimal tax savings</p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Annual Giving Budget</label>
              <input type="text" readOnly value={fmt$(BUNCHING_ANNUAL_BUDGET)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-gray-50 tabular-nums" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Standard Deduction (MFJ)</label>
              <input type="text" readOnly value={fmt$(BUNCHING_STD_DEDUCTION)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-gray-50 tabular-nums" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Bunching Interval (Years)</label>
              <div className="flex items-center gap-3">
                {[2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => setBunchingYears(n)}
                    className={`px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${
                      bunchingYears === n
                        ? 'border-brand-500 bg-brand-50 text-brand-700'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {n} Years
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-5">
            <h3 className="text-xs font-semibold text-gray-900 uppercase tracking-wide mb-3">Results</h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between"><span className="text-gray-500">Total Giving (bunched)</span><span className="font-medium text-gray-900 tabular-nums">{fmt$(bunchingTotal)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Itemized Deduction (Year 1)</span><span className="font-medium text-gray-900 tabular-nums">{fmt$(bunchingItemized)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Std Deduction (Years 2-{bunchingYears})</span><span className="font-medium text-gray-900 tabular-nums">{fmt$(BUNCHING_STD_DEDUCTION)} x {bunchingStdYears}</span></div>
              <div className="flex justify-between border-t border-gray-200 pt-2 mt-2"><span className="text-gray-500">{bunchingYears}-Year Total Deductions (Bunching)</span><span className="font-bold text-gray-900 tabular-nums">{fmt$(bunchingTotalDeductions)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">{bunchingYears}-Year Total Deductions (No Bunching)</span><span className="font-medium text-gray-700 tabular-nums">{fmt$(noBunchingTotalDeductions)}</span></div>
              <div className="flex justify-between border-t border-gray-200 pt-2 mt-2"><span className="font-semibold text-gray-900">Incremental Tax Savings</span><span className="font-bold text-emerald-700 tabular-nums">{fmt$(bunchingSavings > 0 ? bunchingSavings : 0)}</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function QcdTab() {
  const eligible = CLIENT_AGE >= 70.5;
  const maxQcd = 105_000; // 2025 limit
  const provisionalIncomeBefore = CLIENT_AGI * 0.85 + 15_000; // simplified
  const provisionalIncomeAfter = (CLIENT_AGI - RMD_AMOUNT) * 0.85 + 15_000;

  return (
    <div className="space-y-6">
      {/* Eligibility Check */}
      <div className={`flex items-center gap-3 rounded-xl border p-4 ${eligible ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'}`}>
        {eligible ? <CheckCircle2 size={20} className="text-emerald-600 flex-shrink-0" /> : <AlertTriangle size={20} className="text-red-600 flex-shrink-0" />}
        <div>
          <p className={`text-sm font-semibold ${eligible ? 'text-emerald-900' : 'text-red-900'}`}>
            {eligible ? 'QCD Eligible' : 'Not QCD Eligible'}
          </p>
          <p className={`text-xs mt-0.5 ${eligible ? 'text-emerald-700' : 'text-red-700'}`}>
            Client age: {CLIENT_AGE}. {eligible ? `QCD limit: ${fmt$(maxQcd)} per person for 2025.` : 'Must be age 70.5 or older for QCD eligibility.'}
          </p>
        </div>
      </div>

      {/* QCD vs Cash Comparison */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-1">QCD vs Cash Giving Comparison</h2>
        <p className="text-xs text-gray-500 mb-4">For a {fmt$(RMD_AMOUNT)} charitable gift using full RMD amount</p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 pr-4 font-medium text-gray-500">Metric</th>
                <th className="text-left py-2 px-3 font-medium text-emerald-600">QCD</th>
                <th className="text-left py-2 pl-3 font-medium text-gray-500">Cash Gift</th>
              </tr>
            </thead>
            <tbody>
              {QCD_COMPARISON.map((row) => (
                <tr key={row.metric} className="border-b border-gray-100">
                  <td className="py-2.5 pr-4 font-medium text-gray-900">{row.metric}</td>
                  <td className="py-2.5 px-3 text-emerald-700">{row.qcd}</td>
                  <td className="py-2.5 pl-3 text-gray-700">{row.cash}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Use QCD for Full RMD */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Use QCD for Full RMD</h2>
            <p className="text-xs text-gray-500 mt-0.5">Direct your entire RMD of {fmt$(RMD_AMOUNT)} to qualified charities via QCD</p>
          </div>
          <button className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors">
            <Gift size={16} />
            Apply QCD to RMD
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
            <span className="text-xs text-gray-500">RMD Amount</span>
            <p className="text-sm font-bold text-gray-900 mt-1 tabular-nums">{fmt$(RMD_AMOUNT)}</p>
          </div>
          <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
            <span className="text-xs text-gray-500">AGI Reduction</span>
            <p className="text-sm font-bold text-emerald-600 mt-1 tabular-nums">-{fmt$(RMD_AMOUNT)}</p>
          </div>
          <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
            <span className="text-xs text-gray-500">Tax Savings (37%)</span>
            <p className="text-sm font-bold text-emerald-600 mt-1 tabular-nums">{fmt$(Math.round(RMD_AMOUNT * 0.37))}</p>
          </div>
          <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
            <span className="text-xs text-gray-500">Additional IRMAA Savings</span>
            <p className="text-sm font-bold text-emerald-600 mt-1 tabular-nums">{fmt$(3_360)}</p>
          </div>
        </div>
      </div>

      {/* Provisional Income / IRMAA Impact */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Impact on Provisional Income & IRMAA</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-3">Provisional Income</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
                <span className="text-xs text-gray-600">Before QCD</span>
                <span className="text-sm font-bold text-gray-900 tabular-nums">{fmt$(Math.round(provisionalIncomeBefore))}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3">
                <span className="text-xs text-emerald-700">After QCD</span>
                <span className="text-sm font-bold text-emerald-700 tabular-nums">{fmt$(Math.round(provisionalIncomeAfter))}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
                <span className="text-xs text-gray-600">Reduction</span>
                <span className="text-sm font-bold text-emerald-600 tabular-nums">-{fmt$(Math.round(provisionalIncomeBefore - provisionalIncomeAfter))}</span>
              </div>
            </div>
          </div>
          <div>
            <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-3">IRMAA Bracket Impact</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-lg border border-amber-100 bg-amber-50 px-4 py-3">
                <span className="text-xs text-amber-700">Current MAGI Bracket</span>
                <span className="text-sm font-bold text-amber-700">Tier 4 (&gt;$750K)</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
                <span className="text-xs text-gray-600">Monthly Part B Surcharge</span>
                <span className="text-sm font-bold text-gray-900 tabular-nums">$384.90/person</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
                <span className="text-xs text-gray-600">Annual IRMAA Cost (2 persons)</span>
                <span className="text-sm font-bold text-red-600 tabular-nums">{fmt$(Math.round(384.9 * 12 * 2))}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TrustsTab() {
  const [crtAssetValue, setCrtAssetValue] = useState(CRT_DEFAULTS.assetValue);
  const [crtPayoutRate, setCrtPayoutRate] = useState(CRT_DEFAULTS.payoutRate);
  const [crtTerm, setCrtTerm] = useState(CRT_DEFAULTS.term);
  const [crtRate7520, setCrtRate7520] = useState(CRT_DEFAULTS.rate7520);

  const crtAnnualIncome = Math.round(crtAssetValue * (crtPayoutRate / 100));
  const crtRemainderFactor = Math.pow(1 - crtPayoutRate / 100, crtTerm);
  const crtPvRemainder = Math.round(crtAssetValue * crtRemainderFactor);
  const crtDeduction = Math.round(crtPvRemainder * (crtRate7520 / 100) * crtTerm * 0.04);
  const crtCapitalGainAvoided = Math.round((crtAssetValue - CRT_DEFAULTS.costBasis) * 0.238);

  // CLT calculations
  const cltAssetValue = 5_000_000;
  const cltAnnuityRate = 6.0;
  const cltTerm = 15;
  const cltAnnualPayment = Math.round(cltAssetValue * (cltAnnuityRate / 100));
  const cltGrowthRate = 7.0;
  const cltProjectedValue = Math.round(cltAssetValue * Math.pow(1 + cltGrowthRate / 100, cltTerm));
  const cltTotalToCharity = cltAnnualPayment * cltTerm;
  const cltRemainderToHeirs = Math.round(cltProjectedValue - cltTotalToCharity);

  return (
    <div className="space-y-6">
      {/* CRT Section */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-1">Charitable Remainder Trust (CRT)</h2>
        <p className="text-xs text-gray-500 mb-4">Transfer appreciated assets, receive income stream, avoid capital gains, charitable deduction for remainder</p>

        <div className="flex items-center gap-2 rounded-lg bg-blue-50 border border-blue-100 px-4 py-3 mb-4">
          <Info size={16} className="text-blue-600 flex-shrink-0" />
          <p className="text-xs text-blue-700">CRT sells contributed assets without triggering capital gains tax. You receive annual payouts, and the remainder passes to charity at the end of the term.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Calculator Inputs */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Calculator Inputs</h3>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Asset Value</label>
              <input type="number" value={crtAssetValue} onChange={(e) => setCrtAssetValue(Number(e.target.value))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none tabular-nums" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Payout Rate (%)</label>
              <input type="number" step="0.1" value={crtPayoutRate} onChange={(e) => setCrtPayoutRate(Number(e.target.value))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none tabular-nums" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Term (Years)</label>
              <input type="number" value={crtTerm} onChange={(e) => setCrtTerm(Number(e.target.value))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none tabular-nums" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Section 7520 Rate (%)</label>
              <input type="number" step="0.1" value={crtRate7520} onChange={(e) => setCrtRate7520(Number(e.target.value))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none tabular-nums" />
            </div>
          </div>

          {/* Calculator Results */}
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-5">
            <h3 className="text-xs font-semibold text-gray-900 uppercase tracking-wide mb-4">CRT Results</h3>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between"><span className="text-gray-500">Annual Income</span><span className="font-medium text-gray-900 tabular-nums">{fmt$(crtAnnualIncome)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Total Income ({crtTerm} years)</span><span className="font-medium text-gray-900 tabular-nums">{fmt$(crtAnnualIncome * crtTerm)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Charitable Deduction</span><span className="font-medium text-emerald-600 tabular-nums">{fmt$(crtDeduction)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Capital Gains Tax Avoided</span><span className="font-medium text-emerald-600 tabular-nums">{fmt$(crtCapitalGainAvoided)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">PV of Remainder to Charity</span><span className="font-medium text-gray-900 tabular-nums">{fmt$(crtPvRemainder)}</span></div>
              <div className="flex justify-between border-t border-gray-200 pt-3 mt-3">
                <span className="font-semibold text-gray-900">Tax Savings (Ded + CG Avoided)</span>
                <span className="font-bold text-emerald-700 tabular-nums">{fmt$(Math.round(crtDeduction * 0.37) + crtCapitalGainAvoided)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CLT Section */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-1">Charitable Lead Trust (CLT)</h2>
        <p className="text-xs text-gray-500 mb-4">Charity receives annual payments during the term; remainder passes to heirs at reduced gift/estate tax</p>

        <div className="flex items-center gap-2 rounded-lg bg-purple-50 border border-purple-100 px-4 py-3 mb-4">
          <Info size={16} className="text-purple-600 flex-shrink-0" />
          <p className="text-xs text-purple-700">A CLT is ideal for transferring wealth to heirs while supporting charities. If assets grow faster than the Section 7520 rate, the excess passes to heirs free of gift/estate tax.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
            <span className="text-xs text-gray-500">Asset Value</span>
            <p className="text-sm font-bold text-gray-900 mt-1 tabular-nums">{fmt$(cltAssetValue)}</p>
          </div>
          <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
            <span className="text-xs text-gray-500">Annuity Rate / Term</span>
            <p className="text-sm font-bold text-gray-900 mt-1 tabular-nums">{fmtPct(cltAnnuityRate)} / {cltTerm} years</p>
          </div>
          <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
            <span className="text-xs text-gray-500">Annual Payment to Charity</span>
            <p className="text-sm font-bold text-emerald-600 mt-1 tabular-nums">{fmt$(cltAnnualPayment)}</p>
          </div>
          <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
            <span className="text-xs text-gray-500">Total to Charity</span>
            <p className="text-sm font-bold text-emerald-600 mt-1 tabular-nums">{fmt$(cltTotalToCharity)}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <div className="rounded-lg border border-purple-100 bg-purple-50 p-4">
            <span className="text-xs text-purple-700">Projected Portfolio Value at End of Term (7% growth)</span>
            <p className="text-lg font-bold text-purple-900 mt-1 tabular-nums">{fmt$(cltProjectedValue)}</p>
          </div>
          <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-4">
            <span className="text-xs text-emerald-700">Estimated Remainder to Heirs</span>
            <p className="text-lg font-bold text-emerald-900 mt-1 tabular-nums">{fmt$(cltRemainderToHeirs > 0 ? cltRemainderToHeirs : 0)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function FoundationTab() {
  return (
    <div className="space-y-6">
      {/* Foundation Overview */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-1">Private Foundation Overview</h2>
        <p className="text-xs text-gray-500 mb-4">Establish and manage a private family foundation for long-term philanthropic impact</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
            <span className="text-xs text-gray-500">Foundation Assets</span>
            <p className="text-sm font-bold text-gray-900 mt-1 tabular-nums">{fmt$(2_500_000)}</p>
          </div>
          <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
            <span className="text-xs text-gray-500">Annual Distribution Req. (5%)</span>
            <p className="text-sm font-bold text-amber-600 mt-1 tabular-nums">{fmt$(125_000)}</p>
          </div>
          <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
            <span className="text-xs text-gray-500">Annual Admin Costs</span>
            <p className="text-sm font-bold text-red-600 mt-1 tabular-nums">{fmt$(35_000)}</p>
          </div>
          <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
            <span className="text-xs text-gray-500">Excise Tax (1.39%)</span>
            <p className="text-sm font-bold text-red-600 mt-1 tabular-nums">{fmt$(34_750)}</p>
          </div>
        </div>

        {/* Requirements */}
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 mb-6">
          <h3 className="text-xs font-semibold text-amber-900 uppercase tracking-wide mb-2">Annual Distribution Requirements</h3>
          <p className="text-xs text-amber-800">Private foundations must distribute at least 5% of net investment assets annually for charitable purposes. This includes grants, program-related investments, and reasonable administrative expenses related to charitable activities.</p>
        </div>

        {/* Admin Costs */}
        <div className="rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Administrative Costs & Compliance</h3>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-2 border-b border-gray-100"><span className="text-gray-600">Legal & Accounting</span><span className="font-medium text-gray-900 tabular-nums">{fmt$(15_000)}</span></div>
            <div className="flex justify-between py-2 border-b border-gray-100"><span className="text-gray-600">Investment Management</span><span className="font-medium text-gray-900 tabular-nums">{fmt$(12_500)}</span></div>
            <div className="flex justify-between py-2 border-b border-gray-100"><span className="text-gray-600">Insurance & Filing</span><span className="font-medium text-gray-900 tabular-nums">{fmt$(5_000)}</span></div>
            <div className="flex justify-between py-2 border-b border-gray-100"><span className="text-gray-600">Office & Misc</span><span className="font-medium text-gray-900 tabular-nums">{fmt$(2_500)}</span></div>
            <div className="flex justify-between py-2 font-semibold"><span className="text-gray-900">Total Annual Admin</span><span className="text-gray-900 tabular-nums">{fmt$(35_000)}</span></div>
          </div>
        </div>
      </div>

      {/* DAF vs Foundation Comparison */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">DAF vs Private Foundation Comparison</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 pr-4 font-medium text-gray-500">Feature</th>
                <th className="text-left py-2 px-3 font-medium text-indigo-600">DAF</th>
                <th className="text-left py-2 pl-3 font-medium text-purple-600">Private Foundation</th>
              </tr>
            </thead>
            <tbody>
              {DAF_VS_FOUNDATION.map((row) => (
                <tr key={row.feature} className="border-b border-gray-100">
                  <td className="py-2.5 pr-4 font-medium text-gray-900">{row.feature}</td>
                  <td className="py-2.5 px-3 text-gray-700">{row.daf}</td>
                  <td className="py-2.5 pl-3 text-gray-700">{row.foundation}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function OptimizerTab() {
  const bestMethod = useMemo(() => {
    return GIVING_METHODS.reduce((best, m) => (m.netCost < best.netCost ? m : best), GIVING_METHODS[0]);
  }, []);

  return (
    <div className="space-y-6">
      {/* Recommended Strategy Banner */}
      <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
        <CheckCircle2 size={20} className="text-emerald-600 flex-shrink-0" />
        <div>
          <p className="text-sm font-semibold text-emerald-900">Optimal Strategy: {bestMethod.method}</p>
          <p className="text-xs text-emerald-700 mt-0.5">
            Net cost of {fmt$(bestMethod.netCost)} for a $50,000 equivalent gift. {bestMethod.method === 'CRT' ? 'CRT generates income over time, producing a negative net cost.' : ''}
          </p>
        </div>
      </div>

      {/* Comparison Table */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-1">Charitable Giving Method Comparison</h2>
        <p className="text-xs text-gray-500 mb-4">Side-by-side analysis for a $50,000 equivalent charitable gift (37% marginal rate, 23.8% LTCG rate)</p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 pr-4 font-medium text-gray-500">Method</th>
                <th className="text-right py-2 px-3 font-medium text-gray-500">Deduction</th>
                <th className="text-right py-2 px-3 font-medium text-gray-500">Tax Savings</th>
                <th className="text-right py-2 px-3 font-medium text-gray-500">CG Avoided</th>
                <th className="text-left py-2 px-3 font-medium text-gray-500">AGI Impact</th>
                <th className="text-right py-2 pl-3 font-medium text-gray-500">Net Cost</th>
              </tr>
            </thead>
            <tbody>
              {GIVING_METHODS.map((m) => (
                <tr key={m.method} className={`border-b border-gray-100 hover:bg-gray-50 ${m.method === bestMethod.method ? 'bg-emerald-50/50' : ''}`}>
                  <td className="py-2.5 pr-4 font-medium text-gray-900">
                    <div className="flex items-center gap-2">
                      {m.method}
                      {m.method === bestMethod.method && <span className="text-xs px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">Best</span>}
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-right tabular-nums text-gray-700">{fmt$(m.deduction)}</td>
                  <td className="py-2.5 px-3 text-right tabular-nums text-emerald-600 font-medium">{fmt$(m.taxSavings)}</td>
                  <td className="py-2.5 px-3 text-right tabular-nums text-emerald-600 font-medium">{fmt$(m.cgAvoided)}</td>
                  <td className="py-2.5 px-3 text-gray-700">{m.agiImpact}</td>
                  <td className={`py-2.5 pl-3 text-right tabular-nums font-bold ${m.netCost < 0 ? 'text-emerald-600' : 'text-gray-900'}`}>{fmt$(m.netCost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Visual Comparison */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-1">Net Cost Comparison</h2>
        <p className="text-xs text-gray-500 mb-4">Lower net cost = more tax-efficient giving method</p>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={GIVING_METHODS} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={fmtCompact} />
              <YAxis type="category" dataKey="method" tick={{ fontSize: 11 }} width={120} />
              <Tooltip formatter={(v: number) => fmt$(v)} />
              <Bar dataKey="netCost" name="Net Cost" radius={[0, 4, 4, 0]}>
                {GIVING_METHODS.map((entry, i) => (
                  <Cell key={i} fill={entry.netCost < 0 ? '#10B981' : entry.method === bestMethod.method ? '#10B981' : '#6366F1'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function StrategyTab() {
  return (
    <div className="space-y-6">
      {/* Annual Giving Plan */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Annual Giving Plan (2025)</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 pr-4 font-medium text-gray-500">Action</th>
                <th className="text-left py-2 px-3 font-medium text-gray-500">Method</th>
                <th className="text-right py-2 px-3 font-medium text-gray-500">Amount</th>
                <th className="text-left py-2 px-3 font-medium text-gray-500">Timing</th>
                <th className="text-right py-2 pl-3 font-medium text-gray-500">Tax Benefit</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-2.5 pr-4 font-medium text-gray-900">Direct IRA RMD to charity</td>
                <td className="py-2.5 px-3 text-gray-700">QCD</td>
                <td className="py-2.5 px-3 text-right tabular-nums text-gray-900">{fmt$(48_000)}</td>
                <td className="py-2.5 px-3 text-gray-700">Q1 2025</td>
                <td className="py-2.5 pl-3 text-right tabular-nums text-emerald-600 font-medium">{fmt$(21_120)}</td>
              </tr>
              <tr className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-2.5 pr-4 font-medium text-gray-900">Fund DAF with appreciated AAPL stock</td>
                <td className="py-2.5 px-3 text-gray-700">DAF (Stock)</td>
                <td className="py-2.5 px-3 text-right tabular-nums text-gray-900">{fmt$(50_000)}</td>
                <td className="py-2.5 px-3 text-gray-700">Q4 2025</td>
                <td className="py-2.5 pl-3 text-right tabular-nums text-emerald-600 font-medium">{fmt$(28_020)}</td>
              </tr>
              <tr className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-2.5 pr-4 font-medium text-gray-900">DAF grants to operating charities</td>
                <td className="py-2.5 px-3 text-gray-700">DAF Grant</td>
                <td className="py-2.5 px-3 text-right tabular-nums text-gray-900">{fmt$(40_000)}</td>
                <td className="py-2.5 px-3 text-gray-700">Throughout year</td>
                <td className="py-2.5 pl-3 text-right tabular-nums text-gray-500">Deducted at funding</td>
              </tr>
              <tr className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-2.5 pr-4 font-medium text-gray-900">Explore CRT for rental property</td>
                <td className="py-2.5 px-3 text-gray-700">CRT</td>
                <td className="py-2.5 px-3 text-right tabular-nums text-gray-900">TBD</td>
                <td className="py-2.5 px-3 text-gray-700">Q2 2025 (evaluate)</td>
                <td className="py-2.5 pl-3 text-right tabular-nums text-gray-500">Significant potential</td>
              </tr>
            </tbody>
            <tfoot>
              <tr className="border-t border-gray-200">
                <td className="py-2.5 font-semibold text-gray-900" colSpan={2}>Total Planned Giving</td>
                <td className="py-2.5 px-3 text-right tabular-nums font-bold text-gray-900">{fmt$(138_000)}</td>
                <td></td>
                <td className="py-2.5 pl-3 text-right tabular-nums font-bold text-emerald-600">{fmt$(49_140)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Recommended Strategy Narrative */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Recommended Strategy</h2>
        <div className="space-y-3 text-xs text-gray-700 leading-relaxed">
          <p>
            <strong className="text-gray-900">1. Maximize QCD usage:</strong> At age {CLIENT_AGE}, direct the full RMD of {fmt$(RMD_AMOUNT)} via QCD to reduce AGI, lower provisional income for Social Security taxation, and potentially avoid higher IRMAA brackets. This is the single most tax-efficient giving strategy available.
          </p>
          <p>
            <strong className="text-gray-900">2. Fund DAF with appreciated stock:</strong> Contribute highly appreciated securities (AAPL, MSFT) to the DAF rather than cash. This provides a full FMV deduction while avoiding capital gains tax on the appreciation. Target {fmt$(50_000)} contribution in Q4.
          </p>
          <p>
            <strong className="text-gray-900">3. Evaluate CRT for concentrated position:</strong> The rental property with significant unrealized gains is an excellent CRT candidate. Transferring to a CRT would eliminate capital gains on the sale, provide a charitable deduction, and generate an annual income stream of approximately 5% of the initial value.
          </p>
          <p>
            <strong className="text-gray-900">4. Consider bunching in 2026:</strong> If itemized deductions are close to the standard deduction threshold, consider accelerating 2026-2027 giving into a single DAF contribution in 2026 to maximize itemization benefit.
          </p>
        </div>
      </div>

      {/* Multi-Year Projection */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-1">Multi-Year Giving & Tax Impact Projection</h2>
        <p className="text-xs text-gray-500 mb-4">Projected annual giving and associated tax savings over the next 5 years</p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 pr-3 font-medium text-gray-500">Year</th>
                  <th className="text-right py-2 px-2 font-medium text-gray-500">Giving</th>
                  <th className="text-right py-2 px-2 font-medium text-gray-500">Deduction</th>
                  <th className="text-right py-2 px-2 font-medium text-gray-500">Tax Savings</th>
                  <th className="text-right py-2 pl-2 font-medium text-gray-500">Net Cost</th>
                </tr>
              </thead>
              <tbody>
                {MULTI_YEAR_PROJECTION.map((r) => (
                  <tr key={r.year} className="border-b border-gray-100">
                    <td className="py-2.5 pr-3 font-medium text-gray-900">{r.year}</td>
                    <td className="py-2.5 px-2 text-right tabular-nums text-gray-700">{fmt$(r.giving)}</td>
                    <td className="py-2.5 px-2 text-right tabular-nums text-gray-700">{fmt$(r.deduction)}</td>
                    <td className="py-2.5 px-2 text-right tabular-nums text-emerald-600 font-medium">{fmt$(r.taxSavings)}</td>
                    <td className="py-2.5 pl-2 text-right tabular-nums text-gray-900 font-medium">{fmt$(r.netCost)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-200">
                  <td className="py-2.5 font-semibold text-gray-900">Total</td>
                  <td className="py-2.5 px-2 text-right tabular-nums font-bold text-gray-900">{fmt$(MULTI_YEAR_PROJECTION.reduce((s, r) => s + r.giving, 0))}</td>
                  <td className="py-2.5 px-2 text-right tabular-nums font-bold text-gray-900">{fmt$(MULTI_YEAR_PROJECTION.reduce((s, r) => s + r.deduction, 0))}</td>
                  <td className="py-2.5 px-2 text-right tabular-nums font-bold text-emerald-600">{fmt$(MULTI_YEAR_PROJECTION.reduce((s, r) => s + r.taxSavings, 0))}</td>
                  <td className="py-2.5 pl-2 text-right tabular-nums font-bold text-gray-900">{fmt$(MULTI_YEAR_PROJECTION.reduce((s, r) => s + r.netCost, 0))}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={MULTI_YEAR_PROJECTION}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={fmtCompact} />
                <Tooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="giving" name="Total Giving" stroke="#6366F1" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="taxSavings" name="Tax Savings" stroke="#10B981" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="netCost" name="Net Cost" stroke="#F59E0B" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Action Items */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Action Items</h2>
        <div className="space-y-3">
          {[
            { priority: 'High', action: 'Execute QCD for full RMD amount before April 1, 2025', status: 'Pending' },
            { priority: 'High', action: 'Identify most appreciated stock positions for DAF contribution', status: 'In Progress' },
            { priority: 'Medium', action: 'Schedule meeting with trust attorney to evaluate CRT feasibility', status: 'Pending' },
            { priority: 'Medium', action: 'Review DAF grant pipeline and update recommended charities', status: 'Pending' },
            { priority: 'Low', action: 'Model 2026 bunching scenario with updated income projections', status: 'Pending' },
            { priority: 'Low', action: 'Evaluate private foundation vs expanded DAF for long-term strategy', status: 'Pending' },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                item.priority === 'High' ? 'bg-red-100 text-red-700' :
                item.priority === 'Medium' ? 'bg-amber-100 text-amber-700' :
                'bg-gray-100 text-gray-600'
              }`}>{item.priority}</span>
              <span className="text-xs text-gray-900 flex-1">{item.action}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                item.status === 'In Progress' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
              }`}>{item.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page Component
// ---------------------------------------------------------------------------

export default function CharitablePage() {
  const params = useParams();
  const planId = params.planId as string;
  const [activeTab, setActiveTab] = useState<TabKey>('overview');

  const renderTab = () => {
    switch (activeTab) {
      case 'overview': return <OverviewTab />;
      case 'daf': return <DafTab />;
      case 'qcd': return <QcdTab />;
      case 'trusts': return <TrustsTab />;
      case 'foundation': return <FoundationTab />;
      case 'optimizer': return <OptimizerTab />;
      case 'strategy': return <StrategyTab />;
      default: return null;
    }
  };

  return (
    <div>
      <PlanNav
        planId={planId}
        clientName="Sarah & Michael Chen"
        planName="Comprehensive Financial Plan"
      />

      <div className="min-h-screen bg-gray-50">
        <div className="max-w-content mx-auto px-6 py-6">
          {/* Module header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Heart size={20} className="text-brand-500" />
                <h1 className="text-xl font-bold text-gray-900">Charitable Planning</h1>
              </div>
              <p className="text-sm text-gray-500">
                Plan charitable giving strategies including DAFs, CRTs, QCDs, and private foundations.
              </p>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="mb-6 border-b border-gray-200">
            <nav className="-mb-px flex gap-1 overflow-x-auto" aria-label="Tabs">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-xs font-medium transition-colors ${
                      isActive
                        ? 'border-brand-500 text-brand-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon size={14} />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Tab Content */}
          {renderTab()}
        </div>
      </div>
    </div>
  );
}
