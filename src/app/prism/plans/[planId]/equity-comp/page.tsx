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
  PieChart,
  Pie,
} from 'recharts';
import {
  TrendingUp,
  Award,
  Calendar,
  Shield,
  Zap,
  Plus,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Info,
  ArrowUpRight,
  ArrowDownRight,
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
// Tab configuration
// ---------------------------------------------------------------------------

const TABS = [
  { key: 'holdings', label: 'Holdings', icon: TrendingUp },
  { key: 'rsu', label: 'RSU', icon: Award },
  { key: 'options', label: 'Stock Options', icon: Zap },
  { key: 'espp', label: 'ESPP', icon: DollarSign },
  { key: 'vesting', label: 'Vesting Calendar', icon: Calendar },
  { key: 'concentration', label: 'Concentration', icon: Shield },
  { key: 'optimizer', label: 'Exercise Optimizer', icon: TrendingUp },
] as const;

type TabKey = (typeof TABS)[number]['key'];

// ---------------------------------------------------------------------------
// Demo Data
// ---------------------------------------------------------------------------

const CURRENT_PRICE = 185.50;
const COMPANY = 'TechCorp Inc. (TECH)';

const GRANTS = [
  { id: '1', type: 'RSU' as const, grantDate: '2022-03-15', shares: 2000, vested: 1000, unvested: 1000, vestPrice: 0, currentValue: 185_500, grantPrice: 0 },
  { id: '2', type: 'RSU' as const, grantDate: '2023-08-01', shares: 1500, vested: 375, unvested: 1125, vestPrice: 0, currentValue: 69_563, grantPrice: 0 },
  { id: '3', type: 'NQSO' as const, grantDate: '2021-01-10', shares: 5000, vested: 3750, unvested: 1250, vestPrice: 0, currentValue: 327_500, grantPrice: 120.00 },
  { id: '4', type: 'ISO' as const, grantDate: '2023-03-01', shares: 3000, vested: 750, unvested: 2250, vestPrice: 0, currentValue: 138_375, grantPrice: 145.00 },
  { id: '5', type: 'ESPP' as const, grantDate: '2024-01-01', shares: 500, vested: 500, unvested: 0, vestPrice: 148.40, currentValue: 92_750, grantPrice: 148.40 },
];

const TOTAL_VALUE = GRANTS.reduce((s, g) => s + g.currentValue, 0);
const TOTAL_PORTFOLIO = 3_200_000;
const CONCENTRATION_PCT = (TOTAL_VALUE / TOTAL_PORTFOLIO) * 100;

const VESTING_SCHEDULE = [
  { date: 'Mar 2026', type: 'RSU', shares: 250, value: 46_375 },
  { date: 'Jun 2026', type: 'RSU', shares: 250, value: 46_375 },
  { date: 'Jul 2026', type: 'NQSO', shares: 312, value: 20_436 },
  { date: 'Aug 2026', type: 'RSU', shares: 375, value: 69_563 },
  { date: 'Sep 2026', type: 'RSU', shares: 250, value: 46_375 },
  { date: 'Oct 2026', type: 'NQSO', shares: 313, value: 20_502 },
  { date: 'Nov 2026', type: 'RSU', shares: 375, value: 69_563 },
  { date: 'Dec 2026', type: 'ISO', shares: 750, value: 30_375 },
  { date: 'Mar 2027', type: 'ISO', shares: 750, value: 30_375 },
  { date: 'Jun 2027', type: 'NQSO', shares: 312, value: 20_436 },
  { date: 'Sep 2027', type: 'NQSO', shares: 313, value: 20_502 },
  { date: 'Dec 2027', type: 'ISO', shares: 750, value: 30_375 },
];

const RSU_VEST_HISTORY = [
  { date: '2024-09-15', shares: 250, vestPrice: 172.30, fmv: 172.30, taxWithheld: 15_124 },
  { date: '2024-06-15', shares: 250, vestPrice: 168.50, fmv: 168.50, taxWithheld: 14_790 },
  { date: '2024-03-15', shares: 250, vestPrice: 155.20, fmv: 155.20, taxWithheld: 13_622 },
  { date: '2023-12-15', shares: 250, vestPrice: 148.90, fmv: 148.90, taxWithheld: 13_069 },
];

const OPTIONS_DATA = [
  { id: '3', type: 'NQSO', grantDate: '2021-01-10', exercisePrice: 120.00, shares: 5000, vested: 3750, intrinsicValue: (CURRENT_PRICE - 120) * 3750, expiration: '2031-01-10' },
  { id: '4', type: 'ISO', grantDate: '2023-03-01', exercisePrice: 145.00, shares: 3000, vested: 750, intrinsicValue: (CURRENT_PRICE - 145) * 750, expiration: '2033-03-01' },
];

const EXERCISE_SCENARIOS = [
  { scenario: 'Exercise All NQSOs Now', shares: 3750, spread: (CURRENT_PRICE - 120) * 3750, ordinaryTax: (CURRENT_PRICE - 120) * 3750 * 0.37, niit: (CURRENT_PRICE - 120) * 3750 * 0.038, totalTax: (CURRENT_PRICE - 120) * 3750 * 0.408, netProceeds: (CURRENT_PRICE - 120) * 3750 * 0.592 },
  { scenario: 'Exercise 50% NQSOs', shares: 1875, spread: (CURRENT_PRICE - 120) * 1875, ordinaryTax: (CURRENT_PRICE - 120) * 1875 * 0.35, niit: (CURRENT_PRICE - 120) * 1875 * 0.038, totalTax: (CURRENT_PRICE - 120) * 1875 * 0.388, netProceeds: (CURRENT_PRICE - 120) * 1875 * 0.612 },
  { scenario: 'Exercise All ISOs', shares: 750, spread: (CURRENT_PRICE - 145) * 750, ordinaryTax: 0, niit: 0, totalTax: (CURRENT_PRICE - 145) * 750 * 0.28, netProceeds: (CURRENT_PRICE - 145) * 750 * 0.72 },
];

const PIE_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function EquityCompPage() {
  const params = useParams();
  const planId = params.planId as string;
  const [activeTab, setActiveTab] = useState<TabKey>('holdings');

  return (
    <div>
      <PlanNav planId={planId} clientName="Sarah & Michael Chen" planName="Comprehensive Financial Plan" />

      <div className="max-w-content mx-auto px-6 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp size={20} className="text-brand-500" />
              <h1 className="text-xl font-bold text-gray-900">Equity Compensation</h1>
            </div>
            <p className="text-sm text-gray-500">Model stock options, RSUs, and other equity compensation strategies.</p>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 border-b border-gray-200 mb-6 overflow-x-auto">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = activeTab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                  active ? 'border-brand-500 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon size={15} />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        {activeTab === 'holdings' && <HoldingsTab />}
        {activeTab === 'rsu' && <RSUTab />}
        {activeTab === 'options' && <OptionsTab />}
        {activeTab === 'espp' && <ESPPTab />}
        {activeTab === 'vesting' && <VestingTab />}
        {activeTab === 'concentration' && <ConcentrationTab />}
        {activeTab === 'optimizer' && <OptimizerTab />}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Holdings Tab
// ---------------------------------------------------------------------------

function HoldingsTab() {
  const byType = useMemo(() => {
    const map: Record<string, number> = {};
    for (const g of GRANTS) {
      map[g.type] = (map[g.type] || 0) + g.currentValue;
    }
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, []);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Equity Value', value: fmt$(TOTAL_VALUE), sub: COMPANY },
          { label: 'Vested Value', value: fmt$(GRANTS.reduce((s, g) => s + (g.type === 'NQSO' || g.type === 'ISO' ? Math.max(0, CURRENT_PRICE - g.grantPrice) * g.vested : CURRENT_PRICE * g.vested), 0)), sub: 'Exercisable / sellable' },
          { label: 'Unvested Value', value: fmt$(GRANTS.reduce((s, g) => s + (g.type === 'NQSO' || g.type === 'ISO' ? Math.max(0, CURRENT_PRICE - g.grantPrice) * g.unvested : CURRENT_PRICE * g.unvested), 0)), sub: 'Future vesting' },
          { label: 'Concentration', value: fmtPct(CONCENTRATION_PCT), sub: `of ${fmt$(TOTAL_PORTFOLIO)} portfolio` },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <p className="text-xs font-medium text-gray-500 mb-1">{kpi.label}</p>
            <p className="text-lg font-bold text-gray-900">{kpi.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* Holdings by type chart + table */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Value by Grant Type</h3>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={byType} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={40} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {byType.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => fmt$(v)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">All Grants</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left">
                <th className="pb-2 text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="pb-2 text-xs font-medium text-gray-500 uppercase">Grant Date</th>
                <th className="pb-2 text-xs font-medium text-gray-500 uppercase text-right">Shares</th>
                <th className="pb-2 text-xs font-medium text-gray-500 uppercase text-right">Value</th>
              </tr>
            </thead>
            <tbody>
              {GRANTS.map((g) => (
                <tr key={g.id} className="border-b border-gray-50">
                  <td className="py-2">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      g.type === 'RSU' ? 'bg-indigo-50 text-indigo-700' :
                      g.type === 'NQSO' ? 'bg-amber-50 text-amber-700' :
                      g.type === 'ISO' ? 'bg-green-50 text-green-700' :
                      'bg-purple-50 text-purple-700'
                    }`}>{g.type}</span>
                  </td>
                  <td className="py-2 text-gray-600">{g.grantDate}</td>
                  <td className="py-2 text-gray-600 text-right">{g.shares.toLocaleString()}</td>
                  <td className="py-2 text-gray-900 text-right font-medium">{fmt$(g.currentValue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Current stock info */}
      <div className="flex items-center gap-4 p-4 rounded-xl bg-gray-50 border border-gray-200">
        <div>
          <p className="text-sm font-semibold text-gray-900">{COMPANY}</p>
          <p className="text-xs text-gray-500">Current Stock Price</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold text-gray-900">${CURRENT_PRICE.toFixed(2)}</span>
          <span className="inline-flex items-center gap-0.5 text-sm font-medium text-green-600">
            <ArrowUpRight size={14} /> 8.2% YTD
          </span>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// RSU Tab
// ---------------------------------------------------------------------------

function RSUTab() {
  const rsuGrants = GRANTS.filter((g) => g.type === 'RSU');
  const totalRSUValue = rsuGrants.reduce((s, g) => s + g.currentValue, 0);

  return (
    <div className="space-y-6">
      {/* RSU summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total RSU Value', value: fmt$(totalRSUValue) },
          { label: 'Vested Shares', value: rsuGrants.reduce((s, g) => s + g.vested, 0).toLocaleString() },
          { label: 'Unvested Shares', value: rsuGrants.reduce((s, g) => s + g.unvested, 0).toLocaleString() },
        ].map((k) => (
          <div key={k.label} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <p className="text-xs font-medium text-gray-500 mb-1">{k.label}</p>
            <p className="text-lg font-bold text-gray-900">{k.value}</p>
          </div>
        ))}
      </div>

      {/* RSU grants */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">RSU Grants</h3>
        {rsuGrants.map((g) => (
          <div key={g.id} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
            <div>
              <p className="text-sm font-medium text-gray-900">{g.shares.toLocaleString()} shares — Grant {g.grantDate}</p>
              <p className="text-xs text-gray-500">{g.vested.toLocaleString()} vested / {g.unvested.toLocaleString()} unvested</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-gray-900">{fmt$(g.currentValue)}</p>
              <div className="w-32 h-2 bg-gray-100 rounded-full mt-1">
                <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${(g.vested / g.shares) * 100}%` }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Vest history */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Recent Vesting Events</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left">
              <th className="pb-2 text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="pb-2 text-xs font-medium text-gray-500 uppercase text-right">Shares</th>
              <th className="pb-2 text-xs font-medium text-gray-500 uppercase text-right">FMV at Vest</th>
              <th className="pb-2 text-xs font-medium text-gray-500 uppercase text-right">Tax Withheld</th>
              <th className="pb-2 text-xs font-medium text-gray-500 uppercase text-right">Current Value</th>
            </tr>
          </thead>
          <tbody>
            {RSU_VEST_HISTORY.map((v) => (
              <tr key={v.date} className="border-b border-gray-50">
                <td className="py-2.5 text-gray-900">{v.date}</td>
                <td className="py-2.5 text-gray-600 text-right">{v.shares}</td>
                <td className="py-2.5 text-gray-600 text-right">${v.fmv.toFixed(2)}</td>
                <td className="py-2.5 text-red-600 text-right">{fmt$(v.taxWithheld)}</td>
                <td className="py-2.5 text-gray-900 text-right font-medium">{fmt$(v.shares * CURRENT_PRICE)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Tax note */}
      <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 text-sm text-blue-800">
        <Info size={16} className="flex-shrink-0 mt-0.5" />
        <p>RSUs are taxed as ordinary income (W-2) at vest. Employer typically withholds shares at a flat supplemental rate (22% federal).
          Any gain after vesting is treated as capital gain (short or long-term based on holding period from vest date).</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Options Tab
// ---------------------------------------------------------------------------

function OptionsTab() {
  return (
    <div className="space-y-6">
      {/* Options summary */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Stock Option Grants</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left">
              <th className="pb-2 text-xs font-medium text-gray-500 uppercase">Type</th>
              <th className="pb-2 text-xs font-medium text-gray-500 uppercase">Grant Date</th>
              <th className="pb-2 text-xs font-medium text-gray-500 uppercase text-right">Exercise Price</th>
              <th className="pb-2 text-xs font-medium text-gray-500 uppercase text-right">Shares</th>
              <th className="pb-2 text-xs font-medium text-gray-500 uppercase text-right">Vested</th>
              <th className="pb-2 text-xs font-medium text-gray-500 uppercase text-right">In-the-Money</th>
              <th className="pb-2 text-xs font-medium text-gray-500 uppercase text-right">Intrinsic Value</th>
              <th className="pb-2 text-xs font-medium text-gray-500 uppercase">Expires</th>
            </tr>
          </thead>
          <tbody>
            {OPTIONS_DATA.map((o) => (
              <tr key={o.id} className="border-b border-gray-50">
                <td className="py-2.5">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                    o.type === 'NQSO' ? 'bg-amber-50 text-amber-700' : 'bg-green-50 text-green-700'
                  }`}>{o.type}</span>
                </td>
                <td className="py-2.5 text-gray-600">{o.grantDate}</td>
                <td className="py-2.5 text-gray-600 text-right">${o.exercisePrice.toFixed(2)}</td>
                <td className="py-2.5 text-gray-600 text-right">{o.shares.toLocaleString()}</td>
                <td className="py-2.5 text-gray-600 text-right">{o.vested.toLocaleString()}</td>
                <td className="py-2.5 text-right">
                  <span className="text-green-600 font-medium">${(CURRENT_PRICE - o.exercisePrice).toFixed(2)}</span>
                </td>
                <td className="py-2.5 text-gray-900 text-right font-medium">{fmt$(o.intrinsicValue)}</td>
                <td className="py-2.5 text-gray-600">{o.expiration}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* NQSO vs ISO comparison */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-amber-200 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-amber-800 mb-3">NQSO Tax Treatment</h3>
          <ul className="space-y-2 text-sm text-gray-700">
            <li className="flex items-start gap-2"><span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" /> Spread at exercise taxed as ordinary income (W-2)</li>
            <li className="flex items-start gap-2"><span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" /> Subject to income tax withholding at exercise</li>
            <li className="flex items-start gap-2"><span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" /> Further gain after exercise is capital gain</li>
            <li className="flex items-start gap-2"><span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" /> No AMT implications</li>
          </ul>
        </div>
        <div className="bg-white rounded-xl border border-green-200 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-green-800 mb-3">ISO Tax Treatment</h3>
          <ul className="space-y-2 text-sm text-gray-700">
            <li className="flex items-start gap-2"><span className="w-1.5 h-1.5 rounded-full bg-green-400 mt-1.5 flex-shrink-0" /> No regular tax at exercise (if qualifying disposition)</li>
            <li className="flex items-start gap-2"><span className="w-1.5 h-1.5 rounded-full bg-green-400 mt-1.5 flex-shrink-0" /> Spread is AMT preference item</li>
            <li className="flex items-start gap-2"><span className="w-1.5 h-1.5 rounded-full bg-green-400 mt-1.5 flex-shrink-0" /> Must hold 2 years from grant, 1 year from exercise</li>
            <li className="flex items-start gap-2"><span className="w-1.5 h-1.5 rounded-full bg-green-400 mt-1.5 flex-shrink-0" /> All gain taxed as LTCG if qualifying disposition</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ESPP Tab
// ---------------------------------------------------------------------------

function ESPPTab() {
  const purchasePrice = 148.40;
  const discount = 0.15;
  const lookbackFMV = 174.60;
  const discountedPrice = lookbackFMV * (1 - discount);
  const shares = 500;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'ESPP Shares Held', value: shares.toLocaleString() },
          { label: 'Purchase Price', value: `$${purchasePrice.toFixed(2)}` },
          { label: 'Current Value', value: fmt$(shares * CURRENT_PRICE) },
          { label: 'Unrealized Gain', value: fmt$(shares * (CURRENT_PRICE - purchasePrice)), sub: fmtPct(((CURRENT_PRICE - purchasePrice) / purchasePrice) * 100) },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <p className="text-xs font-medium text-gray-500 mb-1">{kpi.label}</p>
            <p className="text-lg font-bold text-gray-900">{kpi.value}</p>
            {kpi.sub && <p className="text-xs text-green-600 mt-0.5">{kpi.sub}</p>}
          </div>
        ))}
      </div>

      {/* ESPP details */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">ESPP Purchase Details</h3>
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            {[
              { label: 'Offering Period', value: 'Jan 2024 — Jun 2024' },
              { label: 'Lookback FMV', value: `$${lookbackFMV.toFixed(2)}` },
              { label: 'Discount', value: fmtPct(discount * 100) },
              { label: 'Purchase Price', value: `$${purchasePrice.toFixed(2)}` },
              { label: 'Purchase Date', value: 'Jun 30, 2024' },
              { label: 'Shares Purchased', value: shares.toLocaleString() },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between py-1.5">
                <span className="text-sm text-gray-500">{item.label}</span>
                <span className="text-sm font-medium text-gray-900">{item.value}</span>
              </div>
            ))}
          </div>
          <div className="space-y-2">
            {[
              { label: 'Qualifying Disposition Date', value: 'Jul 1, 2026' },
              { label: 'Ordinary Income (at QD)', value: fmt$((lookbackFMV - discountedPrice) * shares) },
              { label: 'Current Unrealized Gain', value: fmt$((CURRENT_PRICE - purchasePrice) * shares) },
              { label: 'If Sold Today (Disqualifying)', value: '' },
              { label: '  Ordinary Income', value: fmt$((lookbackFMV * discount) * shares) },
              { label: '  Capital Gain', value: fmt$((CURRENT_PRICE - lookbackFMV) * shares) },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between py-1.5">
                <span className="text-sm text-gray-500">{item.label}</span>
                <span className="text-sm font-medium text-gray-900">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 text-sm text-amber-800">
        <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
        <p>Selling before Jul 1, 2026 triggers a disqualifying disposition — the discount portion is taxed as ordinary income instead of potentially favorable capital gains treatment. Consider holding until the qualifying disposition date.</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Vesting Calendar Tab
// ---------------------------------------------------------------------------

function VestingTab() {
  const totalUpcoming = VESTING_SCHEDULE.reduce((s, v) => s + v.value, 0);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-900">Upcoming Vesting Events</h3>
          <span className="text-sm text-gray-500">Total upcoming: <span className="font-semibold text-gray-900">{fmt$(totalUpcoming)}</span></span>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={VESTING_SCHEDULE}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={60} />
              <YAxis tickFormatter={(v: number) => fmtCompact(v)} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v: number) => fmt$(v)} />
              <Bar dataKey="value" name="Vest Value" radius={[4, 4, 0, 0]}>
                {VESTING_SCHEDULE.map((v, i) => (
                  <Cell key={i} fill={v.type === 'RSU' ? '#6366f1' : v.type === 'NQSO' ? '#f59e0b' : '#10b981'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-indigo-500" /> RSU</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-500" /> NQSO</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-500" /> ISO</span>
        </div>
      </div>

      {/* Detailed schedule */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Detailed Schedule</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left">
              <th className="pb-2 text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="pb-2 text-xs font-medium text-gray-500 uppercase">Type</th>
              <th className="pb-2 text-xs font-medium text-gray-500 uppercase text-right">Shares</th>
              <th className="pb-2 text-xs font-medium text-gray-500 uppercase text-right">Est. Value</th>
              <th className="pb-2 text-xs font-medium text-gray-500 uppercase text-right">Est. Tax</th>
            </tr>
          </thead>
          <tbody>
            {VESTING_SCHEDULE.map((v, i) => {
              const taxRate = v.type === 'RSU' ? 0.37 : v.type === 'NQSO' ? 0.37 : 0.28;
              return (
                <tr key={i} className="border-b border-gray-50">
                  <td className="py-2.5 text-gray-900">{v.date}</td>
                  <td className="py-2.5">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      v.type === 'RSU' ? 'bg-indigo-50 text-indigo-700' :
                      v.type === 'NQSO' ? 'bg-amber-50 text-amber-700' :
                      'bg-green-50 text-green-700'
                    }`}>{v.type}</span>
                  </td>
                  <td className="py-2.5 text-gray-600 text-right">{v.shares.toLocaleString()}</td>
                  <td className="py-2.5 text-gray-900 text-right font-medium">{fmt$(v.value)}</td>
                  <td className="py-2.5 text-red-600 text-right">{fmt$(v.value * taxRate)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Concentration Tab
// ---------------------------------------------------------------------------

function ConcentrationTab() {
  const portfolioAllocation = [
    { name: COMPANY, value: TOTAL_VALUE },
    { name: 'Diversified Equities', value: 1_200_000 },
    { name: 'Fixed Income', value: 600_000 },
    { name: 'Real Estate', value: 400_000 },
    { name: 'Cash', value: 186_312 },
  ];

  const diversificationScenarios = [
    { strategy: 'Current (No Action)', companyPct: CONCENTRATION_PCT, riskScore: 'High', expectedReturn: 12.5, volatility: 28.4 },
    { strategy: 'Sell 25% of Vested', companyPct: CONCENTRATION_PCT * 0.75, riskScore: 'Moderate-High', expectedReturn: 10.8, volatility: 22.1 },
    { strategy: 'Sell 50% of Vested', companyPct: CONCENTRATION_PCT * 0.5, riskScore: 'Moderate', expectedReturn: 9.5, volatility: 18.3 },
    { strategy: '10b5-1 Plan (Quarterly)', companyPct: CONCENTRATION_PCT * 0.6, riskScore: 'Moderate', expectedReturn: 10.0, volatility: 19.8 },
  ];

  return (
    <div className="space-y-6">
      {/* Concentration warning */}
      {CONCENTRATION_PCT > 20 && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
          <AlertTriangle size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">High Concentration Risk</p>
            <p className="text-sm text-amber-700 mt-1">
              {COMPANY} represents {fmtPct(CONCENTRATION_PCT)} of your total portfolio. We recommend reducing single-stock exposure
              to below 10-15% through systematic diversification strategies.
            </p>
          </div>
        </div>
      )}

      {/* Portfolio allocation */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Portfolio Concentration</h3>
        <div className="grid grid-cols-2 gap-8">
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={portfolioAllocation} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={40}>
                  {portfolioAllocation.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => fmt$(v)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div>
            {portfolioAllocation.map((a, i) => (
              <div key={a.name} className="flex items-center justify-between py-2 border-b border-gray-50">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                  <span className="text-sm text-gray-700">{a.name}</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-medium text-gray-900">{fmt$(a.value)}</span>
                  <span className="text-xs text-gray-500 ml-2">{fmtPct((a.value / TOTAL_PORTFOLIO) * 100)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Diversification scenarios */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Diversification Scenarios</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left">
              <th className="pb-2 text-xs font-medium text-gray-500 uppercase">Strategy</th>
              <th className="pb-2 text-xs font-medium text-gray-500 uppercase text-right">Company %</th>
              <th className="pb-2 text-xs font-medium text-gray-500 uppercase">Risk</th>
              <th className="pb-2 text-xs font-medium text-gray-500 uppercase text-right">Exp. Return</th>
              <th className="pb-2 text-xs font-medium text-gray-500 uppercase text-right">Volatility</th>
            </tr>
          </thead>
          <tbody>
            {diversificationScenarios.map((s) => (
              <tr key={s.strategy} className="border-b border-gray-50">
                <td className="py-2.5 font-medium text-gray-900">{s.strategy}</td>
                <td className="py-2.5 text-gray-600 text-right">{fmtPct(s.companyPct)}</td>
                <td className="py-2.5">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    s.riskScore === 'High' ? 'bg-red-50 text-red-700' :
                    s.riskScore === 'Moderate-High' ? 'bg-amber-50 text-amber-700' :
                    'bg-green-50 text-green-700'
                  }`}>{s.riskScore}</span>
                </td>
                <td className="py-2.5 text-gray-600 text-right">{fmtPct(s.expectedReturn)}</td>
                <td className="py-2.5 text-gray-600 text-right">{fmtPct(s.volatility)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Exercise Optimizer Tab
// ---------------------------------------------------------------------------

function OptimizerTab() {
  return (
    <div className="space-y-6">
      {/* Exercise scenarios */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Exercise Scenario Analysis</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left">
              <th className="pb-2 text-xs font-medium text-gray-500 uppercase">Scenario</th>
              <th className="pb-2 text-xs font-medium text-gray-500 uppercase text-right">Shares</th>
              <th className="pb-2 text-xs font-medium text-gray-500 uppercase text-right">Spread</th>
              <th className="pb-2 text-xs font-medium text-gray-500 uppercase text-right">Income Tax</th>
              <th className="pb-2 text-xs font-medium text-gray-500 uppercase text-right">NIIT</th>
              <th className="pb-2 text-xs font-medium text-gray-500 uppercase text-right">Total Tax</th>
              <th className="pb-2 text-xs font-medium text-gray-500 uppercase text-right">Net Proceeds</th>
            </tr>
          </thead>
          <tbody>
            {EXERCISE_SCENARIOS.map((s) => (
              <tr key={s.scenario} className="border-b border-gray-50">
                <td className="py-2.5 font-medium text-gray-900">{s.scenario}</td>
                <td className="py-2.5 text-gray-600 text-right">{s.shares.toLocaleString()}</td>
                <td className="py-2.5 text-gray-600 text-right">{fmt$(s.spread)}</td>
                <td className="py-2.5 text-red-600 text-right">{fmt$(s.ordinaryTax)}</td>
                <td className="py-2.5 text-red-600 text-right">{fmt$(s.niit)}</td>
                <td className="py-2.5 text-red-600 text-right font-medium">{fmt$(s.totalTax)}</td>
                <td className="py-2.5 text-green-700 text-right font-medium">{fmt$(s.netProceeds)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Tax visualization */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Net Proceeds Comparison</h3>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={EXERCISE_SCENARIOS}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="scenario" tick={{ fontSize: 10 }} />
              <YAxis tickFormatter={(v: number) => fmtCompact(v)} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v: number) => fmt$(v)} />
              <Legend />
              <Bar dataKey="netProceeds" fill="#10b981" name="Net Proceeds" radius={[4, 4, 0, 0]} />
              <Bar dataKey="totalTax" fill="#ef4444" name="Total Tax" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Optimization recommendations */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Optimization Strategies</h3>
        <div className="space-y-3">
          {[
            { title: 'Stagger NQSO Exercises Across Tax Years', desc: 'Exercise 50% of NQSOs this year, 50% next year to potentially stay in lower brackets.', savings: 'Potential $18K tax savings' },
            { title: 'Exercise ISOs Under AMT Threshold', desc: 'Limit ISO exercises to keep AMT preference below AMT exemption amount.', savings: 'Avoid triggering AMT' },
            { title: 'Charitable Stock Donation', desc: 'Donate appreciated vested shares to DAF to avoid capital gains and receive full FMV deduction.', savings: 'Up to 23.8% capital gains tax saved' },
            { title: '10b5-1 Systematic Sale Plan', desc: 'Establish automated trading plan to sell vested shares on schedule, reducing timing risk and insider trading concerns.', savings: 'Reduced concentration risk' },
          ].map((s) => (
            <div key={s.title} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50">
              <DollarSign size={16} className="text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-900">{s.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">{s.desc}</p>
                <p className="text-xs font-medium text-green-600 mt-1">{s.savings}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
