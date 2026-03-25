'use client';

import React, { useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { PlanNav } from '@/components/prism/layouts/PlanNav';
import {
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from 'recharts';
import {
  Layers,
  TrendingUp,
  Building2,
  ShieldCheck,
  CreditCard,
  Gem,
  Droplets,
  FileSpreadsheet,
  Plus,
  AlertTriangle,
  DollarSign,
  Percent,
  ArrowUpRight,
  X,
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

function fmtX(v: number): string {
  return `${v.toFixed(2)}x`;
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

const ALTS_COLORS = ['#6366F1', '#7B68EE', '#EC4899', '#f59e0b', '#22c55e', '#4E7082'];

const ALLOCATION_DATA = [
  { name: 'Private Equity', value: 2_800_000, color: '#6366F1' },
  { name: 'Venture Capital', value: 1_200_000, color: '#7B68EE' },
  { name: 'Real Estate', value: 3_500_000, color: '#EC4899' },
  { name: 'Hedge Funds', value: 1_800_000, color: '#f59e0b' },
  { name: 'Private Credit', value: 1_500_000, color: '#22c55e' },
  { name: 'Other', value: 700_000, color: '#4E7082' },
];

const TOTAL_ALTS_AUM = ALLOCATION_DATA.reduce((s, d) => s + d.value, 0);

const SUMMARY_FUNDS = [
  { name: 'Sequoia Capital Fund XVIII', vintage: 2021, type: 'Venture Capital', committed: 1_000_000, called: 750_000, nav: 1_200_000, distributions: 0, tvpi: 1.6, dpi: 0, irr: 22.4 },
  { name: 'KKR Americas XII', vintage: 2020, type: 'PE Buyout', committed: 2_000_000, called: 1_800_000, nav: 2_800_000, distributions: 400_000, tvpi: 1.78, dpi: 0.22, irr: 18.5 },
  { name: 'Blackstone RE Partners X', vintage: 2019, type: 'Real Estate', committed: 2_500_000, called: 2_500_000, nav: 3_500_000, distributions: 800_000, tvpi: 1.72, dpi: 0.32, irr: 15.2 },
  { name: 'Citadel Wellington', vintage: 2022, type: 'Hedge Fund', committed: 1_800_000, called: 1_800_000, nav: 1_800_000, distributions: 0, tvpi: 1.0, dpi: 0.0, irr: 8.7 },
  { name: 'Ares Capital Direct Lending IV', vintage: 2021, type: 'Private Credit', committed: 1_500_000, called: 1_200_000, nav: 1_350_000, distributions: 150_000, tvpi: 1.25, dpi: 0.13, irr: 11.3 },
  { name: 'Hamilton Lane Secondary V', vintage: 2020, type: 'PE Secondaries', committed: 1_000_000, called: 900_000, nav: 1_150_000, distributions: 200_000, tvpi: 1.5, dpi: 0.22, irr: 16.8 },
];

const PE_FUNDS = [
  { name: 'KKR Americas XII', vintage: 2020, assetClass: 'PE Buyout', committed: 2_000_000, called: 1_800_000, distributions: 400_000, nav: 2_800_000, tvpi: 1.78, dpi: 0.22, rvpi: 1.56, irr: 18.5, expectedExit: 2027 },
  { name: 'Sequoia Capital Fund XVIII', vintage: 2021, assetClass: 'Venture Capital', committed: 1_000_000, called: 750_000, distributions: 0, nav: 1_200_000, tvpi: 1.6, dpi: 0.0, rvpi: 1.6, irr: 22.4, expectedExit: 2029 },
  { name: 'Hamilton Lane Secondary V', vintage: 2020, assetClass: 'PE Secondaries', committed: 1_000_000, called: 900_000, distributions: 200_000, nav: 1_150_000, tvpi: 1.5, dpi: 0.22, rvpi: 1.28, irr: 16.8, expectedExit: 2026 },
  { name: 'Insight Partners XII', vintage: 2022, assetClass: 'Growth Equity', committed: 500_000, called: 200_000, distributions: 0, nav: 210_000, tvpi: 1.05, dpi: 0.0, rvpi: 1.05, irr: 5.2, expectedExit: 2030 },
];

const J_CURVE_DATA = [
  { year: 0, cashFlow: -500_000, cumulative: -500_000 },
  { year: 1, cashFlow: -400_000, cumulative: -900_000 },
  { year: 2, cashFlow: -300_000, cumulative: -1_200_000 },
  { year: 3, cashFlow: -100_000, cumulative: -1_300_000 },
  { year: 4, cashFlow: 50_000, cumulative: -1_250_000 },
  { year: 5, cashFlow: 200_000, cumulative: -1_050_000 },
  { year: 6, cashFlow: 400_000, cumulative: -650_000 },
  { year: 7, cashFlow: 500_000, cumulative: -150_000 },
  { year: 8, cashFlow: 600_000, cumulative: 450_000 },
  { year: 9, cashFlow: 450_000, cumulative: 900_000 },
  { year: 10, cashFlow: 300_000, cumulative: 1_200_000 },
];

const REAL_ESTATE = [
  { property: '250 Park Ave, Unit 42A', type: 'Luxury Condo', value: 1_800_000, noi: 72_000, capRate: 4.0, leveragedReturn: 8.2, location: 'New York, NY' },
  { property: 'Sunstone Industrial Park', type: 'Industrial', value: 950_000, noi: 66_500, capRate: 7.0, leveragedReturn: 12.5, location: 'Dallas, TX' },
  { property: 'Pacific Heights Duplex', type: 'Multifamily', value: 750_000, noi: 45_000, capRate: 6.0, leveragedReturn: 10.8, location: 'San Francisco, CA' },
];

const HEDGE_FUNDS = [
  { name: 'Citadel Wellington', strategy: 'Multi-Strategy', aum: 1_000_000, ytd: 12.4, threeYr: 14.2, mgmtFee: 2.0, perfFee: 20.0, liquidity: 'Quarterly, 90-day notice' },
  { name: 'Bridgewater All Weather', strategy: 'Risk Parity', aum: 500_000, ytd: 6.8, threeYr: 7.5, mgmtFee: 1.5, perfFee: 15.0, liquidity: 'Monthly, 30-day notice' },
  { name: 'Third Point Offshore', strategy: 'Event-Driven', aum: 300_000, ytd: -2.1, threeYr: 9.3, mgmtFee: 1.5, perfFee: 20.0, liquidity: 'Quarterly, 60-day notice' },
];

const HEDGE_PERF = [
  { month: 'Jan', citadel: 1.2, bridgewater: 0.5, thirdPoint: -0.3 },
  { month: 'Feb', citadel: 0.8, bridgewater: 0.7, thirdPoint: 1.1 },
  { month: 'Mar', citadel: 2.1, bridgewater: -0.2, thirdPoint: 0.9 },
  { month: 'Apr', citadel: 1.5, bridgewater: 0.4, thirdPoint: -1.2 },
  { month: 'May', citadel: 0.9, bridgewater: 0.6, thirdPoint: 0.5 },
  { month: 'Jun', citadel: 1.8, bridgewater: 0.3, thirdPoint: -0.8 },
  { month: 'Jul', citadel: 1.1, bridgewater: 0.9, thirdPoint: 1.4 },
  { month: 'Aug', citadel: 0.6, bridgewater: 0.2, thirdPoint: -0.5 },
  { month: 'Sep', citadel: 1.4, bridgewater: 0.8, thirdPoint: 0.7 },
  { month: 'Oct', citadel: -0.3, bridgewater: 0.5, thirdPoint: -1.8 },
  { month: 'Nov', citadel: 0.8, bridgewater: 0.4, thirdPoint: 1.2 },
  { month: 'Dec', citadel: 0.5, bridgewater: 0.7, thirdPoint: -0.2 },
];

const CREDIT_INVESTMENTS = [
  { name: 'Ares Capital Direct Lending IV', type: 'Direct Lending', amount: 800_000, yield: 10.5, maturity: '2027', rating: 'BB+' },
  { name: 'Golub Capital BDC', type: 'Senior Secured', amount: 400_000, yield: 9.2, maturity: '2026', rating: 'BBB-' },
  { name: 'Owl Rock Mezzanine Fund', type: 'Mezzanine', amount: 300_000, yield: 13.5, maturity: '2028', rating: 'B+' },
];

const CREDIT_INCOME = [
  { year: 2025, directLending: 84_000, senior: 36_800, mezzanine: 40_500, total: 161_300 },
  { year: 2026, directLending: 84_000, senior: 36_800, mezzanine: 40_500, total: 161_300 },
  { year: 2027, directLending: 84_000, senior: 0, mezzanine: 40_500, total: 124_500 },
  { year: 2028, directLending: 0, senior: 0, mezzanine: 40_500, total: 40_500 },
];

const COMMODITIES = [
  { name: 'SPDR Gold Trust (GLD)', type: 'Commodity ETF', value: 350_000, allocation: 3.0, ytd: 8.2 },
  { name: 'Vintage Wine Collection', type: 'Collectible', value: 180_000, allocation: 1.5, ytd: 5.4 },
  { name: 'Bitcoin (BTC)', type: 'Cryptocurrency', value: 120_000, allocation: 1.0, ytd: 45.2 },
  { name: 'Art Collection (Basquiat)', type: 'Collectible', value: 50_000, allocation: 0.4, ytd: 12.0 },
];

const LIQUIDITY_CALLS = [
  { year: 2025, projected: 450_000, cumulative: 450_000 },
  { year: 2026, projected: 380_000, cumulative: 830_000 },
  { year: 2027, projected: 250_000, cumulative: 1_080_000 },
  { year: 2028, projected: 120_000, cumulative: 1_200_000 },
  { year: 2029, projected: 50_000, cumulative: 1_250_000 },
];

const LIQUID_ASSETS = 1_600_000;
const UNFUNDED_TOTAL = 1_250_000;

const K1_ENTITIES = [
  { entity: 'KKR Americas XII', type: 'LP Interest', ownership: 0.02, ordinary: 12_500, ltcg: 85_000, seIncome: 0, taxExempt: 0, qbi: 12_500, ubti: 0, state: 'DE' },
  { entity: 'Sequoia Capital Fund XVIII', type: 'LP Interest', ownership: 0.01, ordinary: 0, ltcg: 0, seIncome: 0, taxExempt: 0, qbi: 0, ubti: 0, state: 'DE' },
  { entity: 'Ares Capital Direct Lending IV', type: 'LP Interest', ownership: 0.03, ordinary: 45_000, ltcg: 8_000, seIncome: 0, taxExempt: 0, qbi: 45_000, ubti: 15_000, state: 'CA' },
  { entity: 'Blackstone RE Partners X', type: 'LP Interest', ownership: 0.015, ordinary: 28_000, ltcg: 52_000, seIncome: 0, taxExempt: 3_500, qbi: 28_000, ubti: 0, state: 'NY' },
  { entity: 'Hamilton Lane Secondary V', type: 'LP Interest', ownership: 0.02, ordinary: 8_200, ltcg: 32_000, seIncome: 0, taxExempt: 0, qbi: 8_200, ubti: 0, state: 'PA' },
];

const K1_PRIOR_YEAR = [
  { entity: 'KKR Americas XII', ordinary: 10_000, ltcg: 70_000 },
  { entity: 'Sequoia Capital Fund XVIII', ordinary: 0, ltcg: 0 },
  { entity: 'Ares Capital Direct Lending IV', ordinary: 42_000, ltcg: 5_000 },
  { entity: 'Blackstone RE Partners X', ordinary: 25_000, ltcg: 45_000 },
  { entity: 'Hamilton Lane Secondary V', ordinary: 6_000, ltcg: 28_000 },
];

// ---------------------------------------------------------------------------
// Tab Definitions
// ---------------------------------------------------------------------------

const TABS = [
  { key: 'summary', label: 'Alts Portfolio Summary', icon: Layers },
  { key: 'pe-vc', label: 'Private Equity & Venture', icon: TrendingUp },
  { key: 'real-estate', label: 'Private Real Estate', icon: Building2 },
  { key: 'hedge', label: 'Hedge Funds', icon: ShieldCheck },
  { key: 'credit', label: 'Private Credit', icon: CreditCard },
  { key: 'commodities', label: 'Commodities & Other', icon: Gem },
  { key: 'liquidity', label: 'Liquidity Analysis', icon: Droplets },
  { key: 'k1', label: 'K-1 Tracker', icon: FileSpreadsheet },
] as const;

type TabKey = (typeof TABS)[number]['key'];

// ---------------------------------------------------------------------------
// Custom Tooltip
// ---------------------------------------------------------------------------

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string | number }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.07] backdrop-blur-xl px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-semibold text-white">{label}</p>
      {payload.map((e) => (
        <div key={e.name} className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: e.color }} />
          <span className="text-white/50">{e.name}:</span>
          <span className="font-medium tabular-nums text-white">{fmtCompact(e.value)}</span>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Add Fund Modal
// ---------------------------------------------------------------------------

function AddFundModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-lg rounded-xl bg-white/[0.07] backdrop-blur-xl p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Add PE/VC Fund</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-white/[0.06]"><X size={18} className="text-white/50" /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-white/60 mb-1">Fund Name</label>
            <input className="w-full rounded-lg border border-white/[0.10] px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-hidden" placeholder="e.g. Andreessen Horowitz Fund VII" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-white/60 mb-1">Vintage Year</label>
              <input type="number" className="w-full rounded-lg border border-white/[0.10] px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-hidden" placeholder="2024" />
            </div>
            <div>
              <label className="block text-xs font-medium text-white/60 mb-1">Asset Class</label>
              <select className="w-full rounded-lg border border-white/[0.10] px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-hidden">
                <option>PE Buyout</option>
                <option>Venture Capital</option>
                <option>Growth Equity</option>
                <option>PE Secondaries</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-white/60 mb-1">Committed Capital</label>
              <input type="number" className="w-full rounded-lg border border-white/[0.10] px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-hidden" placeholder="1,000,000" />
            </div>
            <div>
              <label className="block text-xs font-medium text-white/60 mb-1">Called Capital</label>
              <input type="number" className="w-full rounded-lg border border-white/[0.10] px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-hidden" placeholder="500,000" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-white/60 mb-1">Distributions</label>
              <input type="number" className="w-full rounded-lg border border-white/[0.10] px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-hidden" placeholder="0" />
            </div>
            <div>
              <label className="block text-xs font-medium text-white/60 mb-1">Current NAV</label>
              <input type="number" className="w-full rounded-lg border border-white/[0.10] px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-hidden" placeholder="0" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-white/60 mb-1">Expected Exit Year</label>
            <input type="number" className="w-full rounded-lg border border-white/[0.10] px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-hidden" placeholder="2030" />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-white/60 rounded-lg border border-white/[0.10] hover:bg-white/[0.04]">Cancel</button>
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-white bg-teal-500 rounded-lg hover:bg-teal-400">Add Fund</button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab Content Components
// ---------------------------------------------------------------------------

function SummaryTab() {
  const weightedIrr = useMemo(() => {
    let totalWeight = 0;
    let weightedSum = 0;
    SUMMARY_FUNDS.forEach((f) => {
      weightedSum += f.irr * f.nav;
      totalWeight += f.nav;
    });
    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }, []);

  const weightedTvpi = useMemo(() => {
    let totalWeight = 0;
    let weightedSum = 0;
    SUMMARY_FUNDS.forEach((f) => {
      weightedSum += f.tvpi * f.called;
      totalWeight += f.called;
    });
    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }, []);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white/[0.07] rounded-xl border border-white/[0.06] p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-8 w-8 rounded-lg bg-teal-500/10 flex items-center justify-center">
              <DollarSign size={16} className="text-teal-300" />
            </div>
            <span className="text-xs font-medium text-white/50 uppercase tracking-wide">Total Alts AUM</span>
          </div>
          <p className="text-2xl font-bold text-white tabular-nums">{fmt$(TOTAL_ALTS_AUM)}</p>
        </div>
        <div className="bg-white/[0.07] rounded-xl border border-white/[0.06] p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-8 w-8 rounded-lg bg-warning-50 flex items-center justify-center">
              <AlertTriangle size={16} className="text-warning-500" />
            </div>
            <span className="text-xs font-medium text-white/50 uppercase tracking-wide">Unfunded Commitments</span>
          </div>
          <p className="text-2xl font-bold text-white tabular-nums">{fmt$(UNFUNDED_TOTAL)}</p>
        </div>
        <div className="bg-white/[0.07] rounded-xl border border-white/[0.06] p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center">
              <Percent size={16} className="text-emerald-600" />
            </div>
            <span className="text-xs font-medium text-white/50 uppercase tracking-wide">Weighted IRR</span>
          </div>
          <p className="text-2xl font-bold text-white tabular-nums">{fmtPct(weightedIrr)}</p>
        </div>
        <div className="bg-white/[0.07] rounded-xl border border-white/[0.06] p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-8 w-8 rounded-lg bg-teal-500/10 flex items-center justify-center">
              <ArrowUpRight size={16} className="text-teal-300" />
            </div>
            <span className="text-xs font-medium text-white/50 uppercase tracking-wide">Weighted TVPI</span>
          </div>
          <p className="text-2xl font-bold text-white tabular-nums">{fmtX(weightedTvpi)}</p>
        </div>
      </div>

      {/* Allocation Pie Chart */}
      <div className="bg-white/[0.07] rounded-xl border border-white/[0.06] p-6">
        <h2 className="text-sm font-semibold text-white mb-1">Allocation by Asset Class</h2>
        <p className="text-xs text-white/50 mb-4">Current NAV distribution across alternative asset classes</p>
        <div className="flex flex-col lg:flex-row items-center gap-8">
          <div className="w-64 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={ALLOCATION_DATA} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" nameKey="name" stroke="none">
                  {ALLOCATION_DATA.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => fmt$(v)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex-1 grid grid-cols-2 gap-3">
            {ALLOCATION_DATA.map((d) => (
              <div key={d.name} className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                <span className="text-xs text-white/50">{d.name}</span>
                <span className="text-xs font-medium text-white ml-auto tabular-nums">{fmt$(d.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Summary Table */}
      <div className="bg-white/[0.07] rounded-xl border border-white/[0.06] p-6">
        <h2 className="text-sm font-semibold text-white mb-4">All Alternative Investments</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="text-left py-2 pr-4 font-medium text-white/50">Fund Name</th>
                <th className="text-right py-2 px-3 font-medium text-white/50">Vintage</th>
                <th className="text-left py-2 px-3 font-medium text-white/50">Type</th>
                <th className="text-right py-2 px-3 font-medium text-white/50">Committed</th>
                <th className="text-right py-2 px-3 font-medium text-white/50">Called</th>
                <th className="text-right py-2 px-3 font-medium text-white/50">NAV</th>
                <th className="text-right py-2 px-3 font-medium text-white/50">Dist.</th>
                <th className="text-right py-2 px-3 font-medium text-white/50">TVPI</th>
                <th className="text-right py-2 px-3 font-medium text-white/50">DPI</th>
                <th className="text-right py-2 pl-3 font-medium text-white/50">IRR</th>
              </tr>
            </thead>
            <tbody>
              {SUMMARY_FUNDS.map((f) => (
                <tr key={f.name} className="border-b border-limestone-100 hover:bg-white/[0.04]">
                  <td className="py-2.5 pr-4 font-medium text-white">{f.name}</td>
                  <td className="py-2.5 px-3 text-right tabular-nums text-white/60">{f.vintage}</td>
                  <td className="py-2.5 px-3 text-white/60">{f.type}</td>
                  <td className="py-2.5 px-3 text-right tabular-nums text-white/60">{fmt$(f.committed)}</td>
                  <td className="py-2.5 px-3 text-right tabular-nums text-white/60">{fmt$(f.called)}</td>
                  <td className="py-2.5 px-3 text-right tabular-nums text-white font-medium">{fmt$(f.nav)}</td>
                  <td className="py-2.5 px-3 text-right tabular-nums text-white/60">{fmt$(f.distributions)}</td>
                  <td className="py-2.5 px-3 text-right tabular-nums text-white/60">{fmtX(f.tvpi)}</td>
                  <td className="py-2.5 px-3 text-right tabular-nums text-white/60">{fmtX(f.dpi)}</td>
                  <td className="py-2.5 pl-3 text-right tabular-nums font-medium text-emerald-600">{fmtPct(f.irr)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function PeVcTab() {
  const [showModal, setShowModal] = useState(false);
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white">Private Equity & Venture Capital Funds</h2>
        <button onClick={() => setShowModal(true)} className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-teal-500 text-white rounded-lg hover:bg-teal-400 transition-colors">
          <Plus size={16} />
          Add PE/VC Fund
        </button>
      </div>
      <AddFundModal open={showModal} onClose={() => setShowModal(false)} />

      {/* Fund Detail Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {PE_FUNDS.map((f) => (
          <div key={f.name} className="bg-white/[0.07] rounded-xl border border-white/[0.06] p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white">{f.name}</h3>
              <span className="text-xs px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-300 font-medium">{f.assetClass}</span>
            </div>
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div><span className="text-white/50">Vintage</span><p className="font-medium text-white tabular-nums">{f.vintage}</p></div>
              <div><span className="text-white/50">Committed</span><p className="font-medium text-white tabular-nums">{fmt$(f.committed)}</p></div>
              <div><span className="text-white/50">Called</span><p className="font-medium text-white tabular-nums">{fmt$(f.called)}</p></div>
              <div><span className="text-white/50">Distributions</span><p className="font-medium text-white tabular-nums">{fmt$(f.distributions)}</p></div>
              <div><span className="text-white/50">NAV</span><p className="font-medium text-white tabular-nums">{fmt$(f.nav)}</p></div>
              <div><span className="text-white/50">IRR</span><p className="font-medium text-emerald-600 tabular-nums">{fmtPct(f.irr)}</p></div>
              <div><span className="text-white/50">TVPI</span><p className="font-medium text-white tabular-nums">{fmtX(f.tvpi)}</p></div>
              <div><span className="text-white/50">DPI</span><p className="font-medium text-white tabular-nums">{fmtX(f.dpi)}</p></div>
              <div><span className="text-white/50">RVPI</span><p className="font-medium text-white tabular-nums">{fmtX(f.rvpi)}</p></div>
            </div>
            <div className="mt-3 pt-3 border-t border-limestone-100 flex items-center justify-between text-xs">
              <span className="text-white/50">Expected Exit</span>
              <span className="font-medium text-white">{f.expectedExit}</span>
            </div>
          </div>
        ))}
      </div>

      {/* J-Curve */}
      <div className="bg-white/[0.07] rounded-xl border border-white/[0.06] p-6">
        <h2 className="text-sm font-semibold text-white mb-1">J-Curve Visualization</h2>
        <p className="text-xs text-white/50 mb-4">Cumulative cash flow over fund life (aggregate PE/VC portfolio)</p>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={J_CURVE_DATA}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="year" tick={{ fontSize: 11 }} label={{ value: 'Year', position: 'insideBottom', offset: -5, fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={fmtCompact} />
              <Tooltip content={<ChartTooltip />} />
              <ReferenceLine y={0} stroke="#A09888" strokeDasharray="3 3" />
              <Line type="monotone" dataKey="cumulative" name="Cumulative Cash Flow" stroke="#6366F1" strokeWidth={2} dot={{ r: 4, fill: '#6366F1' }} />
              <Line type="monotone" dataKey="cashFlow" name="Annual Cash Flow" stroke="#7B68EE" strokeWidth={1.5} strokeDasharray="5 5" dot={{ r: 3, fill: '#7B68EE' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function RealEstateTab() {
  const [selected, setSelected] = useState<number | null>(null);
  return (
    <div className="space-y-6">
      <div className="bg-white/[0.07] rounded-xl border border-white/[0.06] p-6">
        <h2 className="text-sm font-semibold text-white mb-4">Investment Properties</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="text-left py-2 pr-4 font-medium text-white/50">Property</th>
                <th className="text-left py-2 px-3 font-medium text-white/50">Type</th>
                <th className="text-right py-2 px-3 font-medium text-white/50">Value</th>
                <th className="text-right py-2 px-3 font-medium text-white/50">NOI</th>
                <th className="text-right py-2 px-3 font-medium text-white/50">Cap Rate</th>
                <th className="text-right py-2 px-3 font-medium text-white/50">Leveraged Return</th>
                <th className="text-left py-2 pl-3 font-medium text-white/50">Location</th>
                <th className="py-2 pl-3"></th>
              </tr>
            </thead>
            <tbody>
              {REAL_ESTATE.map((p, i) => (
                <tr key={p.property} className="border-b border-limestone-100 hover:bg-white/[0.04] cursor-pointer" onClick={() => setSelected(selected === i ? null : i)}>
                  <td className="py-2.5 pr-4 font-medium text-white">{p.property}</td>
                  <td className="py-2.5 px-3 text-white/60">{p.type}</td>
                  <td className="py-2.5 px-3 text-right tabular-nums text-white font-medium">{fmt$(p.value)}</td>
                  <td className="py-2.5 px-3 text-right tabular-nums text-white/60">{fmt$(p.noi)}</td>
                  <td className="py-2.5 px-3 text-right tabular-nums text-white/60">{fmtPct(p.capRate)}</td>
                  <td className="py-2.5 px-3 text-right tabular-nums text-emerald-600 font-medium">{fmtPct(p.leveragedReturn)}</td>
                  <td className="py-2.5 pl-3 text-white/60">{p.location}</td>
                  <td className="py-2.5 pl-3"><ChevronRight size={14} className={`text-white/30 transition-transform ${selected === i ? 'rotate-90' : ''}`} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Panel */}
      {selected !== null && (
        <div className="bg-white/[0.07] rounded-xl border border-white/[0.06] p-6">
          <h3 className="text-sm font-semibold text-white mb-4">{REAL_ESTATE[selected].property} - Income/Expense Breakdown</h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div className="rounded-lg bg-transparent p-3">
              <span className="text-white/50">Gross Rental Income</span>
              <p className="text-sm font-bold text-white tabular-nums mt-1">{fmt$(Math.round(REAL_ESTATE[selected].noi * 1.35))}</p>
            </div>
            <div className="rounded-lg bg-transparent p-3">
              <span className="text-white/50">Operating Expenses</span>
              <p className="text-sm font-bold text-critical-500 tabular-nums mt-1">-{fmt$(Math.round(REAL_ESTATE[selected].noi * 0.25))}</p>
            </div>
            <div className="rounded-lg bg-transparent p-3">
              <span className="text-white/50">Property Taxes</span>
              <p className="text-sm font-bold text-critical-500 tabular-nums mt-1">-{fmt$(Math.round(REAL_ESTATE[selected].value * 0.012))}</p>
            </div>
            <div className="rounded-lg bg-emerald-50 p-3">
              <span className="text-white/50">Net Operating Income</span>
              <p className="text-sm font-bold text-emerald-700 tabular-nums mt-1">{fmt$(REAL_ESTATE[selected].noi)}</p>
            </div>
            <div className="rounded-lg bg-transparent p-3">
              <span className="text-white/50">Mortgage Payment</span>
              <p className="text-sm font-bold text-critical-500 tabular-nums mt-1">-{fmt$(Math.round(REAL_ESTATE[selected].value * 0.04))}</p>
            </div>
            <div className="rounded-lg bg-transparent p-3">
              <span className="text-white/50">Insurance</span>
              <p className="text-sm font-bold text-critical-500 tabular-nums mt-1">-{fmt$(Math.round(REAL_ESTATE[selected].value * 0.005))}</p>
            </div>
            <div className="rounded-lg bg-transparent p-3">
              <span className="text-white/50">Depreciation</span>
              <p className="text-sm font-bold text-teal-300 tabular-nums mt-1">{fmt$(Math.round(REAL_ESTATE[selected].value * 0.036))}</p>
            </div>
            <div className="rounded-lg bg-transparent p-3">
              <span className="text-white/50">Cash-on-Cash Return</span>
              <p className="text-sm font-bold text-white tabular-nums mt-1">{fmtPct(REAL_ESTATE[selected].leveragedReturn)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function HedgeFundsTab() {
  return (
    <div className="space-y-6">
      <div className="bg-white/[0.07] rounded-xl border border-white/[0.06] p-6">
        <h2 className="text-sm font-semibold text-white mb-4">Hedge Fund Investments</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="text-left py-2 pr-4 font-medium text-white/50">Fund Name</th>
                <th className="text-left py-2 px-3 font-medium text-white/50">Strategy</th>
                <th className="text-right py-2 px-3 font-medium text-white/50">AUM Invested</th>
                <th className="text-right py-2 px-3 font-medium text-white/50">YTD Return</th>
                <th className="text-right py-2 px-3 font-medium text-white/50">3yr Return</th>
                <th className="text-right py-2 px-3 font-medium text-white/50">Mgmt Fee</th>
                <th className="text-right py-2 px-3 font-medium text-white/50">Perf Fee</th>
                <th className="text-left py-2 pl-3 font-medium text-white/50">Liquidity</th>
              </tr>
            </thead>
            <tbody>
              {HEDGE_FUNDS.map((h) => (
                <tr key={h.name} className="border-b border-limestone-100 hover:bg-white/[0.04]">
                  <td className="py-2.5 pr-4 font-medium text-white">{h.name}</td>
                  <td className="py-2.5 px-3 text-white/60">{h.strategy}</td>
                  <td className="py-2.5 px-3 text-right tabular-nums text-white font-medium">{fmt$(h.aum)}</td>
                  <td className={`py-2.5 px-3 text-right tabular-nums font-medium ${h.ytd >= 0 ? 'text-emerald-600' : 'text-critical-500'}`}>{fmtPct(h.ytd)}</td>
                  <td className="py-2.5 px-3 text-right tabular-nums text-white/60">{fmtPct(h.threeYr)}</td>
                  <td className="py-2.5 px-3 text-right tabular-nums text-white/60">{fmtPct(h.mgmtFee)}</td>
                  <td className="py-2.5 px-3 text-right tabular-nums text-white/60">{fmtPct(h.perfFee)}</td>
                  <td className="py-2.5 pl-3 text-white/50 max-w-[180px] truncate">{h.liquidity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Performance Chart */}
      <div className="bg-white/[0.07] rounded-xl border border-white/[0.06] p-6">
        <h2 className="text-sm font-semibold text-white mb-1">Monthly Performance (YTD)</h2>
        <p className="text-xs text-white/50 mb-4">Cumulative monthly return by fund</p>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={HEDGE_PERF}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
              <Tooltip formatter={(v: number) => `${v.toFixed(1)}%`} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="citadel" name="Citadel Wellington" stroke="#6366F1" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="bridgewater" name="Bridgewater All Weather" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="thirdPoint" name="Third Point Offshore" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function PrivateCreditTab() {
  return (
    <div className="space-y-6">
      <div className="bg-white/[0.07] rounded-xl border border-white/[0.06] p-6">
        <h2 className="text-sm font-semibold text-white mb-4">Private Credit Investments</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="text-left py-2 pr-4 font-medium text-white/50">Fund / Note</th>
                <th className="text-left py-2 px-3 font-medium text-white/50">Type</th>
                <th className="text-right py-2 px-3 font-medium text-white/50">Amount</th>
                <th className="text-right py-2 px-3 font-medium text-white/50">Yield</th>
                <th className="text-right py-2 px-3 font-medium text-white/50">Maturity</th>
                <th className="text-left py-2 pl-3 font-medium text-white/50">Rating</th>
              </tr>
            </thead>
            <tbody>
              {CREDIT_INVESTMENTS.map((c) => (
                <tr key={c.name} className="border-b border-limestone-100 hover:bg-white/[0.04]">
                  <td className="py-2.5 pr-4 font-medium text-white">{c.name}</td>
                  <td className="py-2.5 px-3 text-white/60">{c.type}</td>
                  <td className="py-2.5 px-3 text-right tabular-nums text-white font-medium">{fmt$(c.amount)}</td>
                  <td className="py-2.5 px-3 text-right tabular-nums text-emerald-600 font-medium">{fmtPct(c.yield)}</td>
                  <td className="py-2.5 px-3 text-right tabular-nums text-white/60">{c.maturity}</td>
                  <td className="py-2.5 pl-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${c.rating.startsWith('BBB') || c.rating.startsWith('BB') ? 'bg-warning-50 text-warning-700' : 'bg-critical-50 text-critical-700'}`}>{c.rating}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Income Projection */}
      <div className="bg-white/[0.07] rounded-xl border border-white/[0.06] p-6">
        <h2 className="text-sm font-semibold text-white mb-4">Income Projection</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="text-left py-2 pr-4 font-medium text-white/50">Year</th>
                <th className="text-right py-2 px-3 font-medium text-white/50">Direct Lending</th>
                <th className="text-right py-2 px-3 font-medium text-white/50">Senior Secured</th>
                <th className="text-right py-2 px-3 font-medium text-white/50">Mezzanine</th>
                <th className="text-right py-2 pl-3 font-medium text-white/50">Total Income</th>
              </tr>
            </thead>
            <tbody>
              {CREDIT_INCOME.map((r) => (
                <tr key={r.year} className="border-b border-limestone-100 hover:bg-white/[0.04]">
                  <td className="py-2.5 pr-4 font-medium text-white">{r.year}</td>
                  <td className="py-2.5 px-3 text-right tabular-nums text-white/60">{fmt$(r.directLending)}</td>
                  <td className="py-2.5 px-3 text-right tabular-nums text-white/60">{fmt$(r.senior)}</td>
                  <td className="py-2.5 px-3 text-right tabular-nums text-white/60">{fmt$(r.mezzanine)}</td>
                  <td className="py-2.5 pl-3 text-right tabular-nums font-medium text-emerald-600">{fmt$(r.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function CommoditiesTab() {
  return (
    <div className="space-y-6">
      <div className="bg-white/[0.07] rounded-xl border border-white/[0.06] p-6">
        <h2 className="text-sm font-semibold text-white mb-4">Commodities, Collectibles & Other Holdings</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="text-left py-2 pr-4 font-medium text-white/50">Name</th>
                <th className="text-left py-2 px-3 font-medium text-white/50">Type</th>
                <th className="text-right py-2 px-3 font-medium text-white/50">Current Value</th>
                <th className="text-right py-2 px-3 font-medium text-white/50">Allocation</th>
                <th className="text-right py-2 pl-3 font-medium text-white/50">YTD Return</th>
              </tr>
            </thead>
            <tbody>
              {COMMODITIES.map((c) => (
                <tr key={c.name} className="border-b border-limestone-100 hover:bg-white/[0.04]">
                  <td className="py-2.5 pr-4 font-medium text-white">{c.name}</td>
                  <td className="py-2.5 px-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      c.type === 'Cryptocurrency' ? 'bg-orange-50 text-orange-700' :
                      c.type === 'Collectible' ? 'bg-teal-500/10 text-teal-300' :
                      'bg-teal-500/10 text-teal-300'
                    }`}>{c.type}</span>
                  </td>
                  <td className="py-2.5 px-3 text-right tabular-nums text-white font-medium">{fmt$(c.value)}</td>
                  <td className="py-2.5 px-3 text-right tabular-nums text-white/60">{fmtPct(c.allocation)}</td>
                  <td className={`py-2.5 pl-3 text-right tabular-nums font-medium ${c.ytd >= 0 ? 'text-emerald-600' : 'text-critical-500'}`}>{fmtPct(c.ytd)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-white/[0.06]">
                <td className="py-2.5 pr-4 font-semibold text-white" colSpan={2}>Total</td>
                <td className="py-2.5 px-3 text-right tabular-nums font-bold text-white">{fmt$(COMMODITIES.reduce((s, c) => s + c.value, 0))}</td>
                <td className="py-2.5 px-3 text-right tabular-nums font-medium text-white/60">{fmtPct(COMMODITIES.reduce((s, c) => s + c.allocation, 0))}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Valuation Tracking */}
      <div className="bg-white/[0.07] rounded-xl border border-white/[0.06] p-6">
        <h2 className="text-sm font-semibold text-white mb-4">Valuation Tracking Notes</h2>
        <div className="space-y-3">
          {COMMODITIES.map((c) => (
            <div key={c.name} className="flex items-center justify-between rounded-lg border border-limestone-100 bg-transparent px-4 py-3">
              <div>
                <p className="text-xs font-medium text-white">{c.name}</p>
                <p className="text-xs text-white/50 mt-0.5">
                  {c.type === 'Commodity ETF' ? 'Market-priced daily via exchange' :
                   c.type === 'Cryptocurrency' ? 'Market-priced 24/7 via exchange' :
                   'Appraised annually - last appraisal Jan 2025'}
                </p>
              </div>
              <span className="text-xs font-medium tabular-nums text-white">{fmt$(c.value)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function LiquidityTab() {
  const shortfall = LIQUID_ASSETS - UNFUNDED_TOTAL;
  const hasShortfall = shortfall < 0;

  return (
    <div className="space-y-6">
      {/* Warning Banner */}
      {hasShortfall && (
        <div className="flex items-center gap-3 rounded-xl border border-critical-100 bg-critical-50 p-4">
          <AlertTriangle size={20} className="text-critical-500 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-critical-700">Liquidity Shortfall Warning</p>
            <p className="text-xs text-critical-700 mt-0.5">Projected unfunded commitments exceed available liquid assets by {fmt$(Math.abs(shortfall))}.</p>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white/[0.07] rounded-xl border border-white/[0.06] p-5">
          <span className="text-xs font-medium text-white/50 uppercase tracking-wide">Available Liquid Assets</span>
          <p className="text-2xl font-bold text-white tabular-nums mt-2">{fmt$(LIQUID_ASSETS)}</p>
        </div>
        <div className="bg-white/[0.07] rounded-xl border border-white/[0.06] p-5">
          <span className="text-xs font-medium text-white/50 uppercase tracking-wide">Total Unfunded Commitments</span>
          <p className="text-2xl font-bold text-warning-500 tabular-nums mt-2">{fmt$(UNFUNDED_TOTAL)}</p>
        </div>
        <div className={`bg-white/[0.07] rounded-xl border p-5 ${hasShortfall ? 'border-critical-100' : 'border-white/[0.06]'}`}>
          <span className="text-xs font-medium text-white/50 uppercase tracking-wide">Net Liquidity Buffer</span>
          <p className={`text-2xl font-bold tabular-nums mt-2 ${hasShortfall ? 'text-critical-500' : 'text-emerald-600'}`}>{fmt$(shortfall)}</p>
        </div>
      </div>

      {/* Capital Call Schedule Table */}
      <div className="bg-white/[0.07] rounded-xl border border-white/[0.06] p-6">
        <h2 className="text-sm font-semibold text-white mb-4">Projected Capital Call Schedule</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="text-left py-2 pr-4 font-medium text-white/50">Year</th>
                <th className="text-right py-2 px-3 font-medium text-white/50">Projected Calls</th>
                <th className="text-right py-2 px-3 font-medium text-white/50">Cumulative</th>
                <th className="text-right py-2 px-3 font-medium text-white/50">Remaining Liquidity</th>
                <th className="text-left py-2 pl-3 font-medium text-white/50">Status</th>
              </tr>
            </thead>
            <tbody>
              {LIQUIDITY_CALLS.map((r) => {
                const remaining = LIQUID_ASSETS - r.cumulative;
                const warning = remaining < 200_000;
                const danger = remaining < 0;
                return (
                  <tr key={r.year} className="border-b border-limestone-100 hover:bg-white/[0.04]">
                    <td className="py-2.5 pr-4 font-medium text-white">{r.year}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums text-white/60">{fmt$(r.projected)}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums text-white/60">{fmt$(r.cumulative)}</td>
                    <td className={`py-2.5 px-3 text-right tabular-nums font-medium ${danger ? 'text-critical-500' : warning ? 'text-warning-500' : 'text-emerald-600'}`}>{fmt$(remaining)}</td>
                    <td className="py-2.5 pl-3">
                      {danger ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-critical-50 text-critical-700 text-xs font-medium"><AlertTriangle size={12} /> Shortfall</span>
                      ) : warning ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-warning-50 text-warning-700 text-xs font-medium"><AlertTriangle size={12} /> Low</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium">OK</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Liquidity Waterfall Chart */}
      <div className="bg-white/[0.07] rounded-xl border border-white/[0.06] p-6">
        <h2 className="text-sm font-semibold text-white mb-1">Liquidity Waterfall</h2>
        <p className="text-xs text-white/50 mb-4">Projected capital calls vs available liquidity by year</p>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={LIQUIDITY_CALLS}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="year" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={fmtCompact} />
              <Tooltip content={<ChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <ReferenceLine y={LIQUID_ASSETS} stroke="#22c55e" strokeDasharray="5 5" label={{ value: `Liquid Assets: ${fmtCompact(LIQUID_ASSETS)}`, position: 'top', fontSize: 10, fill: '#22c55e' }} />
              <Bar dataKey="projected" name="Annual Capital Calls" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              <Bar dataKey="cumulative" name="Cumulative Calls" fill="#6366F1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function K1Tab() {
  const priorMap = useMemo(() => {
    const m = new Map<string, { ordinary: number; ltcg: number }>();
    K1_PRIOR_YEAR.forEach((p) => m.set(p.entity, { ordinary: p.ordinary, ltcg: p.ltcg }));
    return m;
  }, []);

  const totalUbti = K1_ENTITIES.reduce((s, e) => s + e.ubti, 0);

  return (
    <div className="space-y-6">
      {/* UBTI Warning */}
      {totalUbti > 1_000 && (
        <div className="flex items-center gap-3 rounded-xl border border-warning-100 bg-warning-50 p-4">
          <AlertTriangle size={20} className="text-warning-500 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-warning-700">UBTI Warning</p>
            <p className="text-xs text-warning-700 mt-0.5">
              Total UBTI of {fmt$(totalUbti)} exceeds $1,000 threshold. If held in an IRA, this may trigger UBIT. Review LP interests in tax-advantaged accounts.
            </p>
          </div>
        </div>
      )}

      {/* K-1 Income Table */}
      <div className="bg-white/[0.07] rounded-xl border border-white/[0.06] p-6">
        <h2 className="text-sm font-semibold text-white mb-4">K-1 Income by Entity (Current Year)</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="text-left py-2 pr-3 font-medium text-white/50">Entity Name</th>
                <th className="text-left py-2 px-2 font-medium text-white/50">Type</th>
                <th className="text-right py-2 px-2 font-medium text-white/50">Own %</th>
                <th className="text-right py-2 px-2 font-medium text-white/50">Ordinary</th>
                <th className="text-right py-2 px-2 font-medium text-white/50">LTCG</th>
                <th className="text-right py-2 px-2 font-medium text-white/50">SE Inc</th>
                <th className="text-right py-2 px-2 font-medium text-white/50">Tax-Exempt</th>
                <th className="text-right py-2 px-2 font-medium text-white/50">QBI</th>
                <th className="text-right py-2 px-2 font-medium text-white/50">UBTI</th>
                <th className="text-left py-2 pl-2 font-medium text-white/50">State</th>
              </tr>
            </thead>
            <tbody>
              {K1_ENTITIES.map((e) => (
                <tr key={e.entity} className="border-b border-limestone-100 hover:bg-white/[0.04]">
                  <td className="py-2.5 pr-3 font-medium text-white">{e.entity}</td>
                  <td className="py-2.5 px-2 text-white/60">{e.type}</td>
                  <td className="py-2.5 px-2 text-right tabular-nums text-white/60">{fmtPct(e.ownership * 100)}</td>
                  <td className="py-2.5 px-2 text-right tabular-nums text-white/60">{fmt$(e.ordinary)}</td>
                  <td className="py-2.5 px-2 text-right tabular-nums text-white/60">{fmt$(e.ltcg)}</td>
                  <td className="py-2.5 px-2 text-right tabular-nums text-white/60">{fmt$(e.seIncome)}</td>
                  <td className="py-2.5 px-2 text-right tabular-nums text-white/60">{fmt$(e.taxExempt)}</td>
                  <td className="py-2.5 px-2 text-right tabular-nums text-white/60">{fmt$(e.qbi)}</td>
                  <td className={`py-2.5 px-2 text-right tabular-nums font-medium ${e.ubti > 0 ? 'text-warning-500' : 'text-white/60'}`}>{fmt$(e.ubti)}</td>
                  <td className="py-2.5 pl-2 text-white/60">{e.state}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-white/[0.06]">
                <td className="py-2.5 pr-3 font-semibold text-white" colSpan={3}>Total</td>
                <td className="py-2.5 px-2 text-right tabular-nums font-bold text-white">{fmt$(K1_ENTITIES.reduce((s, e) => s + e.ordinary, 0))}</td>
                <td className="py-2.5 px-2 text-right tabular-nums font-bold text-white">{fmt$(K1_ENTITIES.reduce((s, e) => s + e.ltcg, 0))}</td>
                <td className="py-2.5 px-2 text-right tabular-nums font-bold text-white">{fmt$(K1_ENTITIES.reduce((s, e) => s + e.seIncome, 0))}</td>
                <td className="py-2.5 px-2 text-right tabular-nums font-bold text-white">{fmt$(K1_ENTITIES.reduce((s, e) => s + e.taxExempt, 0))}</td>
                <td className="py-2.5 px-2 text-right tabular-nums font-bold text-white">{fmt$(K1_ENTITIES.reduce((s, e) => s + e.qbi, 0))}</td>
                <td className="py-2.5 px-2 text-right tabular-nums font-bold text-warning-500">{fmt$(totalUbti)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Prior Year Comparison */}
      <div className="bg-white/[0.07] rounded-xl border border-white/[0.06] p-6">
        <h2 className="text-sm font-semibold text-white mb-4">Prior Year Comparison</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="text-left py-2 pr-4 font-medium text-white/50">Entity</th>
                <th className="text-right py-2 px-3 font-medium text-white/50">Prior Ordinary</th>
                <th className="text-right py-2 px-3 font-medium text-white/50">Current Ordinary</th>
                <th className="text-right py-2 px-3 font-medium text-white/50">Change</th>
                <th className="text-right py-2 px-3 font-medium text-white/50">Prior LTCG</th>
                <th className="text-right py-2 px-3 font-medium text-white/50">Current LTCG</th>
                <th className="text-right py-2 pl-3 font-medium text-white/50">Change</th>
              </tr>
            </thead>
            <tbody>
              {K1_ENTITIES.map((e) => {
                const prior = priorMap.get(e.entity) ?? { ordinary: 0, ltcg: 0 };
                const ordDiff = e.ordinary - prior.ordinary;
                const ltcgDiff = e.ltcg - prior.ltcg;
                return (
                  <tr key={e.entity} className="border-b border-limestone-100 hover:bg-white/[0.04]">
                    <td className="py-2.5 pr-4 font-medium text-white">{e.entity}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums text-white/50">{fmt$(prior.ordinary)}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums text-white">{fmt$(e.ordinary)}</td>
                    <td className={`py-2.5 px-3 text-right tabular-nums font-medium ${ordDiff > 0 ? 'text-critical-500' : ordDiff < 0 ? 'text-emerald-600' : 'text-white/50'}`}>
                      {ordDiff > 0 ? '+' : ''}{fmt$(ordDiff)}
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums text-white/50">{fmt$(prior.ltcg)}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums text-white">{fmt$(e.ltcg)}</td>
                    <td className={`py-2.5 pl-3 text-right tabular-nums font-medium ${ltcgDiff > 0 ? 'text-critical-500' : ltcgDiff < 0 ? 'text-emerald-600' : 'text-white/50'}`}>
                      {ltcgDiff > 0 ? '+' : ''}{fmt$(ltcgDiff)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page Component
// ---------------------------------------------------------------------------

export default function AlternativesPage() {
  const params = useParams();
  const planId = params.planId as string;
  const [activeTab, setActiveTab] = useState<TabKey>('summary');

  const renderTab = () => {
    switch (activeTab) {
      case 'summary': return <SummaryTab />;
      case 'pe-vc': return <PeVcTab />;
      case 'real-estate': return <RealEstateTab />;
      case 'hedge': return <HedgeFundsTab />;
      case 'credit': return <PrivateCreditTab />;
      case 'commodities': return <CommoditiesTab />;
      case 'liquidity': return <LiquidityTab />;
      case 'k1': return <K1Tab />;
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

      <div className="min-h-screen bg-transparent">
        <div className="max-w-content mx-auto px-6 py-6">
          {/* Module header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Layers size={20} className="text-teal-300" />
                <h1 className="text-xl font-bold text-white">Alternative Investments</h1>
              </div>
              <p className="text-sm text-white/50">
                Track private equity, venture capital, real estate, hedge funds, credit, and other alternative holdings.
              </p>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="mb-6 border-b border-white/[0.06]">
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
                        ? 'border-brand-500 text-teal-300'
                        : 'border-transparent text-white/50 hover:text-white/60 hover:border-white/[0.10]'
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
