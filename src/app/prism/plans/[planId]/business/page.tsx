'use client';

import React, { useState } from 'react';
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
  Building2,
  Calculator,
  DollarSign,
  Users,
  Shield,
  Briefcase,
  UserCheck,
  Plus,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Info,
  ArrowRight,
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

function fmtX(v: number): string {
  return `${v.toFixed(1)}x`;
}

// ---------------------------------------------------------------------------
// Tab configuration
// ---------------------------------------------------------------------------

const TABS = [
  { key: 'overview', label: 'Overview', icon: Building2 },
  { key: 'valuation', label: 'Valuation', icon: Calculator },
  { key: 'exit', label: 'Exit / Sale', icon: DollarSign },
  { key: 'buysell', label: 'Buy-Sell', icon: Users },
  { key: 'succession', label: 'Succession', icon: Briefcase },
  { key: 'ownercomp', label: 'Owner Comp', icon: UserCheck },
  { key: 'keyperson', label: 'Key Person', icon: Shield },
] as const;

type TabKey = (typeof TABS)[number]['key'];

// ---------------------------------------------------------------------------
// Demo Data
// ---------------------------------------------------------------------------

const BUSINESS = {
  name: 'Chen Digital Solutions LLC',
  entityType: 'LLC (S-Corp Election)',
  ownership: '100% — Michael Chen',
  industry: 'Technology Consulting',
  yearsInBusiness: 12,
  employees: 28,
  revenue: 4_200_000,
  ebitda: 980_000,
  netIncome: 720_000,
  ownerComp: 350_000,
  estimatedValue: 4_410_000,
};

const HISTORICAL_FINANCIALS = [
  { year: 2020, revenue: 2_800_000, ebitda: 560_000, netIncome: 380_000 },
  { year: 2021, revenue: 3_100_000, ebitda: 650_000, netIncome: 450_000 },
  { year: 2022, revenue: 3_500_000, ebitda: 770_000, netIncome: 540_000 },
  { year: 2023, revenue: 3_800_000, ebitda: 870_000, netIncome: 620_000 },
  { year: 2024, revenue: 4_200_000, ebitda: 980_000, netIncome: 720_000 },
];

const VALUATION_METHODS = [
  { method: 'EBITDA Multiple', multiple: 4.5, value: 4_410_000, weight: 0.50 },
  { method: 'Revenue Multiple', multiple: 1.2, value: 5_040_000, weight: 0.25 },
  { method: 'DCF (5-Year)', discount: 15, value: 3_850_000, weight: 0.25 },
];

const VALUATION_COMPS = [
  { company: 'Tech Consulting Peer A', ebitdaMultiple: 5.0, revMultiple: 1.3 },
  { company: 'Tech Consulting Peer B', ebitdaMultiple: 4.2, revMultiple: 1.1 },
  { company: 'Tech Consulting Peer C', ebitdaMultiple: 4.8, revMultiple: 1.4 },
  { company: 'Industry Median', ebitdaMultiple: 4.5, revMultiple: 1.2 },
];

const SALE_SCENARIOS = [
  { scenario: 'Full Sale (Stock)', grossProceeds: 4_410_000, taxRate: 23.8, taxes: 1_049_580, netProceeds: 3_360_420 },
  { scenario: 'Full Sale (Asset)', grossProceeds: 4_410_000, taxRate: 32.5, taxes: 1_433_250, netProceeds: 2_976_750 },
  { scenario: 'Partial Sale (60%)', grossProceeds: 2_646_000, taxRate: 23.8, taxes: 629_748, netProceeds: 2_016_252 },
  { scenario: 'Installment (5yr)', grossProceeds: 4_410_000, taxRate: 23.8, taxes: 1_049_580, netProceeds: 3_600_000 },
];

const SUCCESSION_TIMELINE = [
  { year: 2026, phase: 'Identify & develop successor', milestone: 'Select internal candidate' },
  { year: 2027, phase: 'Leadership transition begins', milestone: 'Successor takes COO role' },
  { year: 2028, phase: 'Gradual ownership transfer', milestone: 'Transfer 20% equity' },
  { year: 2029, phase: 'Reduced involvement', milestone: 'Transfer additional 30%' },
  { year: 2030, phase: 'Advisory role only', milestone: 'Complete transition' },
];

const KEY_PERSON_RISKS = [
  { person: 'Michael Chen', role: 'CEO / Founder', revenueAtRisk: 0.65, insuranceCoverage: 2_000_000, gap: 1_000_000 },
  { person: 'Sarah Lin', role: 'VP Sales', revenueAtRisk: 0.25, insuranceCoverage: 500_000, gap: 0 },
  { person: 'David Park', role: 'CTO', revenueAtRisk: 0.30, insuranceCoverage: 0, gap: 750_000 },
];

const PIE_COLORS = ['#4E7082', '#22c55e', '#f59e0b', '#ef4444', '#7B68EE'];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function BusinessPage() {
  const params = useParams();
  const planId = params.planId as string;
  const [activeTab, setActiveTab] = useState<TabKey>('overview');

  return (
    <div>
      <PlanNav planId={planId} clientName="Sarah & Michael Chen" planName="Comprehensive Financial Plan" />

      <div className="max-w-content mx-auto px-6 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Building2 size={20} className="text-teal-300" />
              <h1 className="text-xl font-bold text-white">Business Planning</h1>
            </div>
            <p className="text-sm text-white/50">Analyze business interests, succession planning, and key-person strategies.</p>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 border-b border-white/[0.06] mb-6 overflow-x-auto">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = activeTab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                  active ? 'border-brand-500 text-teal-300' : 'border-transparent text-white/50 hover:text-white/60'
                }`}
              >
                <Icon size={15} />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        {activeTab === 'overview' && <OverviewTab />}
        {activeTab === 'valuation' && <ValuationTab />}
        {activeTab === 'exit' && <ExitTab />}
        {activeTab === 'buysell' && <BuySellTab />}
        {activeTab === 'succession' && <SuccessionTab />}
        {activeTab === 'ownercomp' && <OwnerCompTab />}
        {activeTab === 'keyperson' && <KeyPersonTab />}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Overview Tab
// ---------------------------------------------------------------------------

function OverviewTab() {
  return (
    <div className="space-y-6">
      {/* Business card */}
      <div className="bg-white/[0.07] rounded-xl border border-white/[0.06] shadow-sm p-5">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-base font-bold text-white">{BUSINESS.name}</h3>
            <p className="text-sm text-white/50 mt-0.5">{BUSINESS.entityType} &middot; {BUSINESS.industry}</p>
            <p className="text-sm text-white/50">{BUSINESS.ownership} &middot; {BUSINESS.yearsInBusiness} years &middot; {BUSINESS.employees} employees</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-medium text-white/50">Estimated Value</p>
            <p className="text-xl font-bold text-white">{fmt$(BUSINESS.estimatedValue)}</p>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Annual Revenue', value: fmt$(BUSINESS.revenue), sub: `${fmtPct(((BUSINESS.revenue - 3_800_000) / 3_800_000) * 100)} YoY growth` },
          { label: 'EBITDA', value: fmt$(BUSINESS.ebitda), sub: `${fmtPct((BUSINESS.ebitda / BUSINESS.revenue) * 100)} margin` },
          { label: 'Net Income', value: fmt$(BUSINESS.netIncome), sub: `${fmtPct((BUSINESS.netIncome / BUSINESS.revenue) * 100)} margin` },
          { label: 'Owner Compensation', value: fmt$(BUSINESS.ownerComp), sub: 'Salary + distributions' },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white/[0.07] rounded-xl border border-white/[0.06] shadow-sm p-4">
            <p className="text-xs font-medium text-white/50 mb-1">{kpi.label}</p>
            <p className="text-lg font-bold text-white">{kpi.value}</p>
            <p className="text-xs text-white/30 mt-0.5">{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* Financial trends */}
      <div className="bg-white/[0.07] rounded-xl border border-white/[0.06] shadow-sm p-5">
        <h3 className="text-sm font-semibold text-white mb-4">Financial Trends (5-Year)</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={HISTORICAL_FINANCIALS}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="year" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={(v: number) => fmtCompact(v)} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v: number) => fmt$(v)} />
              <Legend />
              <Bar dataKey="revenue" fill="#4E7082" name="Revenue" radius={[4, 4, 0, 0]} />
              <Bar dataKey="ebitda" fill="#22c55e" name="EBITDA" radius={[4, 4, 0, 0]} />
              <Bar dataKey="netIncome" fill="#f59e0b" name="Net Income" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Planning alerts */}
      <div className="grid grid-cols-2 gap-4">
        {[
          { title: 'No Buy-Sell Agreement', desc: 'Business has no buy-sell agreement. This creates risk in the event of death, disability, or dispute.', severity: 'high' as const },
          { title: 'Key Person Insurance Gap', desc: 'CTO has no key-person insurance coverage. $750K gap identified.', severity: 'high' as const },
          { title: 'Succession Plan Needed', desc: 'No formal succession plan exists. Michael is 52 — planning should begin.', severity: 'medium' as const },
          { title: 'Entity Structure Review', desc: 'Consider C-Corp election for QSBS exclusion if planning sale within 5 years.', severity: 'info' as const },
        ].map((a) => (
          <div key={a.title} className={`flex items-start gap-3 p-4 rounded-xl border ${
            a.severity === 'high' ? 'bg-critical-50 border-critical-100' : a.severity === 'medium' ? 'bg-warning-50 border-warning-100' : 'bg-teal-500/10 border-brand-200'
          }`}>
            {a.severity === 'high' ? <AlertTriangle size={18} className="text-critical-500 flex-shrink-0 mt-0.5" /> :
             a.severity === 'medium' ? <AlertTriangle size={18} className="text-warning-500 flex-shrink-0 mt-0.5" /> :
             <Info size={18} className="text-teal-300 flex-shrink-0 mt-0.5" />}
            <div>
              <p className={`text-sm font-semibold ${a.severity === 'high' ? 'text-critical-700' : a.severity === 'medium' ? 'text-warning-700' : 'text-teal-400'}`}>{a.title}</p>
              <p className={`text-xs mt-0.5 ${a.severity === 'high' ? 'text-critical-700' : a.severity === 'medium' ? 'text-warning-700' : 'text-teal-300'}`}>{a.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Valuation Tab
// ---------------------------------------------------------------------------

function ValuationTab() {
  const weightedValue = VALUATION_METHODS.reduce((acc, m) => acc + m.value * m.weight, 0);

  return (
    <div className="space-y-6">
      {/* Weighted valuation */}
      <div className="bg-white/[0.07] rounded-xl border border-white/[0.06] shadow-sm p-5">
        <h3 className="text-sm font-semibold text-white mb-4">Blended Valuation Estimate</h3>
        <div className="text-center mb-4">
          <p className="text-3xl font-bold text-white">{fmt$(weightedValue)}</p>
          <p className="text-sm text-white/50">Weighted average of three approaches</p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-limestone-100 text-left">
              <th className="pb-2 text-xs font-medium text-white/50 uppercase">Method</th>
              <th className="pb-2 text-xs font-medium text-white/50 uppercase text-right">Multiple / Rate</th>
              <th className="pb-2 text-xs font-medium text-white/50 uppercase text-right">Value</th>
              <th className="pb-2 text-xs font-medium text-white/50 uppercase text-right">Weight</th>
              <th className="pb-2 text-xs font-medium text-white/50 uppercase text-right">Contribution</th>
            </tr>
          </thead>
          <tbody>
            {VALUATION_METHODS.map((m) => (
              <tr key={m.method} className="border-b border-limestone-50">
                <td className="py-2.5 font-medium text-white">{m.method}</td>
                <td className="py-2.5 text-white/50 text-right">{m.multiple ? `${fmtX(m.multiple)}` : `${m.discount}%`}</td>
                <td className="py-2.5 text-white/50 text-right">{fmt$(m.value)}</td>
                <td className="py-2.5 text-white/50 text-right">{fmtPct(m.weight * 100)}</td>
                <td className="py-2.5 text-white/60 text-right font-medium">{fmt$(m.value * m.weight)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Comparable companies */}
      <div className="bg-white/[0.07] rounded-xl border border-white/[0.06] shadow-sm p-5">
        <h3 className="text-sm font-semibold text-white mb-3">Comparable Transactions</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-limestone-100 text-left">
              <th className="pb-2 text-xs font-medium text-white/50 uppercase">Company</th>
              <th className="pb-2 text-xs font-medium text-white/50 uppercase text-right">EBITDA Multiple</th>
              <th className="pb-2 text-xs font-medium text-white/50 uppercase text-right">Revenue Multiple</th>
            </tr>
          </thead>
          <tbody>
            {VALUATION_COMPS.map((c) => (
              <tr key={c.company} className={`border-b border-limestone-50 ${c.company === 'Industry Median' ? 'font-semibold' : ''}`}>
                <td className="py-2.5 text-white">{c.company}</td>
                <td className="py-2.5 text-white/50 text-right">{fmtX(c.ebitdaMultiple)}</td>
                <td className="py-2.5 text-white/50 text-right">{fmtX(c.revMultiple)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Valuation sensitivity */}
      <div className="bg-white/[0.07] rounded-xl border border-white/[0.06] shadow-sm p-5">
        <h3 className="text-sm font-semibold text-white mb-3">Valuation Sensitivity (EBITDA Multiple)</h3>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={[3.0, 3.5, 4.0, 4.5, 5.0, 5.5, 6.0].map((m) => ({ multiple: `${m}x`, value: BUSINESS.ebitda * m }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="multiple" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={(v: number) => fmtCompact(v)} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v: number) => fmt$(v)} />
              <Bar dataKey="value" name="Business Value" radius={[4, 4, 0, 0]}>
                {[3.0, 3.5, 4.0, 4.5, 5.0, 5.5, 6.0].map((m, i) => (
                  <Cell key={i} fill={m === 4.5 ? '#4E7082' : '#99B6C3'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="text-xs text-white/50 text-center mt-2">Current estimate uses 4.5x EBITDA multiple (highlighted)</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Exit / Sale Tab
// ---------------------------------------------------------------------------

function ExitTab() {
  return (
    <div className="space-y-6">
      {/* Sale scenario comparison */}
      <div className="bg-white/[0.07] rounded-xl border border-white/[0.06] shadow-sm p-5">
        <h3 className="text-sm font-semibold text-white mb-4">Sale Scenario Comparison</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={SALE_SCENARIOS}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="scenario" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={(v: number) => fmtCompact(v)} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v: number) => fmt$(v)} />
              <Legend />
              <Bar dataKey="netProceeds" fill="#4E7082" name="Net Proceeds" radius={[4, 4, 0, 0]} />
              <Bar dataKey="taxes" fill="#ef4444" name="Taxes" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed comparison */}
      <div className="bg-white/[0.07] rounded-xl border border-white/[0.06] shadow-sm p-5">
        <h3 className="text-sm font-semibold text-white mb-3">Detailed Tax Analysis</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-limestone-100 text-left">
              <th className="pb-2 text-xs font-medium text-white/50 uppercase">Scenario</th>
              <th className="pb-2 text-xs font-medium text-white/50 uppercase text-right">Gross Proceeds</th>
              <th className="pb-2 text-xs font-medium text-white/50 uppercase text-right">Eff. Tax Rate</th>
              <th className="pb-2 text-xs font-medium text-white/50 uppercase text-right">Total Taxes</th>
              <th className="pb-2 text-xs font-medium text-white/50 uppercase text-right">Net to Owner</th>
            </tr>
          </thead>
          <tbody>
            {SALE_SCENARIOS.map((s) => (
              <tr key={s.scenario} className="border-b border-limestone-50">
                <td className="py-2.5 font-medium text-white">{s.scenario}</td>
                <td className="py-2.5 text-white/50 text-right">{fmt$(s.grossProceeds)}</td>
                <td className="py-2.5 text-white/50 text-right">{fmtPct(s.taxRate)}</td>
                <td className="py-2.5 text-critical-500 text-right">{fmt$(s.taxes)}</td>
                <td className="py-2.5 text-white text-right font-medium">{fmt$(s.netProceeds)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Tax optimization strategies */}
      <div className="bg-white/[0.07] rounded-xl border border-white/[0.06] shadow-sm p-5">
        <h3 className="text-sm font-semibold text-white mb-3">Tax Optimization Strategies</h3>
        <div className="space-y-3">
          {[
            { title: 'QSBS Exclusion (Section 1202)', desc: 'If converted to C-Corp and held 5+ years, could exclude up to $10M or 10x basis of gain.', savings: 'Up to $1.05M tax savings' },
            { title: 'Installment Sale', desc: 'Spread gain recognition over 5 years to stay in lower brackets. Interest income offsets deferral.', savings: 'Up to $240K additional after-tax' },
            { title: 'Charitable Remainder Trust', desc: 'Transfer business interest to CRT before sale. Defer taxes and receive income stream.', savings: 'Defer $1.05M in capital gains taxes' },
            { title: 'Opportunity Zone Reinvestment', desc: 'Reinvest capital gains into QOZ within 180 days for deferral and potential exclusion.', savings: 'Defer up to $1.05M in taxes' },
          ].map((s) => (
            <div key={s.title} className="flex items-start gap-3 p-3 rounded-lg bg-transparent">
              <DollarSign size={16} className="text-success-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-white">{s.title}</p>
                <p className="text-xs text-white/50 mt-0.5">{s.desc}</p>
                <p className="text-xs font-medium text-success-500 mt-1">{s.savings}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Buy-Sell Tab
// ---------------------------------------------------------------------------

function BuySellTab() {
  return (
    <div className="space-y-6">
      {/* Status alert */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-critical-50 border border-critical-100">
        <AlertTriangle size={20} className="text-critical-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-critical-700">No Buy-Sell Agreement in Place</p>
          <p className="text-sm text-critical-700 mt-1">
            The business currently has no buy-sell agreement. This creates significant risk in the event of death, disability,
            divorce, or dispute among owners. We recommend establishing a cross-purchase or entity-redemption agreement.
          </p>
        </div>
      </div>

      {/* Buy-sell types */}
      <div className="bg-white/[0.07] rounded-xl border border-white/[0.06] shadow-sm p-5">
        <h3 className="text-sm font-semibold text-white mb-4">Buy-Sell Agreement Options</h3>
        <div className="grid grid-cols-3 gap-4">
          {[
            { type: 'Cross-Purchase', pros: ['Stepped-up basis for buyers', 'Simple with few owners', 'Life insurance owned by individuals'], cons: ['Complex with many owners', 'Requires multiple policies'], recommended: false },
            { type: 'Entity Redemption', pros: ['Single policy per owner', 'Simpler administration', 'Works well with many owners'], cons: ['No stepped-up basis', 'Entity owns all policies'], recommended: true },
            { type: 'Wait-and-See (Hybrid)', pros: ['Maximum flexibility', 'Adapts to tax law changes', 'Can choose best option at trigger'], cons: ['More complex drafting', 'Potential uncertainty'], recommended: false },
          ].map((opt) => (
            <div key={opt.type} className={`rounded-xl border p-4 ${opt.recommended ? 'border-teal-300 bg-teal-500/10/30' : 'border-white/[0.06]'}`}>
              <div className="flex items-center gap-2 mb-3">
                <h4 className="text-sm font-semibold text-white">{opt.type}</h4>
                {opt.recommended && <span className="text-xs font-medium text-teal-300 bg-teal-500/15 px-2 py-0.5 rounded-full">Recommended</span>}
              </div>
              <div className="space-y-2">
                <div>
                  <p className="text-xs font-medium text-success-700 mb-1">Advantages</p>
                  <ul className="space-y-0.5">
                    {opt.pros.map((p) => (
                      <li key={p} className="text-xs text-white/50 flex items-start gap-1">
                        <CheckCircle2 size={11} className="text-success-500 mt-0.5 flex-shrink-0" /> {p}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-xs font-medium text-critical-700 mb-1">Considerations</p>
                  <ul className="space-y-0.5">
                    {opt.cons.map((c) => (
                      <li key={c} className="text-xs text-white/50 flex items-start gap-1">
                        <AlertTriangle size={11} className="text-warning-500 mt-0.5 flex-shrink-0" /> {c}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Funding */}
      <div className="bg-white/[0.07] rounded-xl border border-white/[0.06] shadow-sm p-5">
        <h3 className="text-sm font-semibold text-white mb-3">Funding Requirement</h3>
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Business Value', value: fmt$(BUSINESS.estimatedValue) },
            { label: 'Life Insurance Needed', value: fmt$(BUSINESS.estimatedValue) },
            { label: 'Est. Annual Premium', value: fmt$(12_500) },
          ].map((k) => (
            <div key={k.label} className="p-3 rounded-lg bg-transparent text-center">
              <p className="text-xs text-white/50">{k.label}</p>
              <p className="text-sm font-bold text-white mt-0.5">{k.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Succession Tab
// ---------------------------------------------------------------------------

function SuccessionTab() {
  return (
    <div className="space-y-6">
      {/* Timeline */}
      <div className="bg-white/[0.07] rounded-xl border border-white/[0.06] shadow-sm p-5">
        <h3 className="text-sm font-semibold text-white mb-4">5-Year Succession Timeline</h3>
        <div className="space-y-4">
          {SUCCESSION_TIMELINE.map((s, i) => (
            <div key={s.year} className="flex items-start gap-4">
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                  i === 0 ? 'bg-teal-500 text-white' : 'bg-white/[0.06] text-white/50'
                }`}>
                  {s.year}
                </div>
                {i < SUCCESSION_TIMELINE.length - 1 && <div className="w-px h-8 bg-white/[0.06] mt-1" />}
              </div>
              <div className="flex-1 pb-4">
                <p className="text-sm font-medium text-white">{s.phase}</p>
                <p className="text-xs text-white/50 mt-0.5">{s.milestone}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Succession readiness */}
      <div className="bg-white/[0.07] rounded-xl border border-white/[0.06] shadow-sm p-5">
        <h3 className="text-sm font-semibold text-white mb-3">Succession Readiness Assessment</h3>
        <div className="space-y-3">
          {[
            { area: 'Internal candidate identified', status: 'incomplete' as const },
            { area: 'Management team depth', status: 'partial' as const },
            { area: 'Documented processes & SOPs', status: 'partial' as const },
            { area: 'Client relationship transition plan', status: 'incomplete' as const },
            { area: 'Valuation & buyout terms defined', status: 'incomplete' as const },
            { area: 'Tax-efficient transfer structure', status: 'incomplete' as const },
            { area: 'Emergency succession plan', status: 'complete' as const },
          ].map((item) => (
            <div key={item.area} className="flex items-center justify-between py-2 border-b border-limestone-50">
              <span className="text-sm text-white/60">{item.area}</span>
              <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                item.status === 'complete' ? 'bg-success-50 text-success-700' :
                item.status === 'partial' ? 'bg-warning-50 text-warning-700' :
                'bg-critical-50 text-critical-700'
              }`}>
                {item.status === 'complete' ? <CheckCircle2 size={11} /> : <AlertTriangle size={11} />}
                {item.status === 'complete' ? 'Complete' : item.status === 'partial' ? 'In Progress' : 'Not Started'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Owner Comp Tab
// ---------------------------------------------------------------------------

function OwnerCompTab() {
  const compBreakdown = [
    { name: 'W-2 Salary', value: 200_000 },
    { name: 'S-Corp Distributions', value: 150_000 },
    { name: 'Health Insurance', value: 24_000 },
    { name: 'Retirement Contributions', value: 66_000 },
    { name: 'Vehicle / Expense Acct', value: 12_000 },
  ];
  const totalComp = compBreakdown.reduce((s, c) => s + c.value, 0);

  return (
    <div className="space-y-6">
      {/* Total comp */}
      <div className="bg-white/[0.07] rounded-xl border border-white/[0.06] shadow-sm p-5">
        <h3 className="text-sm font-semibold text-white mb-4">Owner Compensation Breakdown</h3>
        <div className="grid grid-cols-2 gap-8">
          <div>
            <div className="text-center mb-4">
              <p className="text-xs text-white/50">Total Compensation</p>
              <p className="text-2xl font-bold text-white">{fmt$(totalComp)}</p>
            </div>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={compBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={40}>
                    {compBreakdown.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => fmt$(v)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-limestone-100 text-left">
                  <th className="pb-2 text-xs font-medium text-white/50 uppercase">Component</th>
                  <th className="pb-2 text-xs font-medium text-white/50 uppercase text-right">Amount</th>
                  <th className="pb-2 text-xs font-medium text-white/50 uppercase text-right">% of Total</th>
                </tr>
              </thead>
              <tbody>
                {compBreakdown.map((c, i) => (
                  <tr key={c.name} className="border-b border-limestone-50">
                    <td className="py-2 flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[i] }} />
                      <span className="text-white">{c.name}</span>
                    </td>
                    <td className="py-2 text-white/50 text-right">{fmt$(c.value)}</td>
                    <td className="py-2 text-white/50 text-right">{fmtPct((c.value / totalComp) * 100)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Reasonable comp analysis */}
      <div className="bg-white/[0.07] rounded-xl border border-white/[0.06] shadow-sm p-5">
        <h3 className="text-sm font-semibold text-white mb-3">Reasonable Compensation Analysis</h3>
        <div className="flex items-start gap-2 p-3 rounded-lg bg-teal-500/10 text-sm text-teal-400">
          <Info size={16} className="flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">S-Corp Salary: {fmt$(200_000)}</p>
            <p className="mt-1">IRS comparable data suggests a reasonable salary range of $175K—$225K for a CEO of a technology
              consulting firm with {fmt$(BUSINESS.revenue)} in revenue. Current salary of {fmt$(200_000)} falls within acceptable range,
              reducing audit risk while allowing {fmt$(150_000)} in distributions that avoid FICA/SE taxes.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Key Person Tab
// ---------------------------------------------------------------------------

function KeyPersonTab() {
  return (
    <div className="space-y-6">
      {/* Key person risk table */}
      <div className="bg-white/[0.07] rounded-xl border border-white/[0.06] shadow-sm p-5">
        <h3 className="text-sm font-semibold text-white mb-4">Key Person Risk Assessment</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-limestone-100 text-left">
              <th className="pb-2 text-xs font-medium text-white/50 uppercase">Key Person</th>
              <th className="pb-2 text-xs font-medium text-white/50 uppercase">Role</th>
              <th className="pb-2 text-xs font-medium text-white/50 uppercase text-right">Revenue at Risk</th>
              <th className="pb-2 text-xs font-medium text-white/50 uppercase text-right">Insurance Coverage</th>
              <th className="pb-2 text-xs font-medium text-white/50 uppercase text-right">Coverage Gap</th>
              <th className="pb-2 text-xs font-medium text-white/50 uppercase">Status</th>
            </tr>
          </thead>
          <tbody>
            {KEY_PERSON_RISKS.map((kp) => (
              <tr key={kp.person} className="border-b border-limestone-50">
                <td className="py-2.5 font-medium text-white">{kp.person}</td>
                <td className="py-2.5 text-white/50">{kp.role}</td>
                <td className="py-2.5 text-white/50 text-right">{fmtPct(kp.revenueAtRisk * 100)}</td>
                <td className="py-2.5 text-white/50 text-right">{fmt$(kp.insuranceCoverage)}</td>
                <td className="py-2.5 text-right font-medium">
                  <span className={kp.gap > 0 ? 'text-critical-500' : 'text-success-500'}>
                    {kp.gap > 0 ? fmt$(kp.gap) : 'Covered'}
                  </span>
                </td>
                <td className="py-2.5">
                  <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                    kp.gap > 0 ? 'bg-critical-50 text-critical-700' : 'bg-success-50 text-success-700'
                  }`}>
                    {kp.gap > 0 ? <AlertTriangle size={11} /> : <CheckCircle2 size={11} />}
                    {kp.gap > 0 ? 'Gap' : 'Adequate'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Recommendations */}
      <div className="bg-white/[0.07] rounded-xl border border-white/[0.06] shadow-sm p-5">
        <h3 className="text-sm font-semibold text-white mb-3">Recommendations</h3>
        <div className="space-y-3">
          {[
            { title: 'CTO Key Person Policy', desc: 'Obtain $750K key-person life and disability policy for David Park. Estimated annual premium: $2,400.', priority: 'High' },
            { title: 'Increase Founder Coverage', desc: 'Current $2M coverage may be insufficient. Consider increasing to $3M given 65% revenue dependency.', priority: 'Medium' },
            { title: 'Cross-Training Program', desc: 'Reduce single-point-of-failure risk by implementing knowledge transfer and cross-training.', priority: 'Medium' },
          ].map((r) => (
            <div key={r.title} className="flex items-start gap-3 p-3 rounded-lg bg-transparent">
              <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${r.priority === 'High' ? 'bg-critical-500' : 'bg-warning-500'}`} />
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-white">{r.title}</p>
                  <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${r.priority === 'High' ? 'bg-critical-100 text-critical-700' : 'bg-warning-100 text-warning-700'}`}>{r.priority}</span>
                </div>
                <p className="text-xs text-white/50 mt-0.5">{r.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
