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
  ScrollText,
  Plus,
  FileText,
  Shield,
  Gift,
  Scale,
  Users,
  GitBranch,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Trash2,
  Edit3,
  Info,
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
  { key: 'overview', label: 'Overview', icon: ScrollText },
  { key: 'documents', label: 'Documents', icon: FileText },
  { key: 'gifting', label: 'Gifting', icon: Gift },
  { key: 'trusts', label: 'Trusts', icon: Shield },
  { key: 'tax', label: 'Estate Tax', icon: Scale },
  { key: 'beneficiaries', label: 'Beneficiaries', icon: Users },
  { key: 'diagram', label: 'Estate Diagram', icon: GitBranch },
] as const;

type TabKey = (typeof TABS)[number]['key'];

// ---------------------------------------------------------------------------
// Demo Data
// ---------------------------------------------------------------------------

const ESTATE_VALUE = 8_750_000;
const EXEMPTION_2026 = 13_610_000;
const EXEMPTION_2027 = 7_000_000; // sunset
const TAXABLE_ESTATE_NOW = 0;
const TAXABLE_ESTATE_SUNSET = Math.max(0, ESTATE_VALUE - EXEMPTION_2027);
const ESTATE_TAX_SUNSET = TAXABLE_ESTATE_SUNSET * 0.40;

const ESTATE_DOCS = [
  { id: '1', name: 'Revocable Living Trust', type: 'Trust', lastUpdated: '2024-03-15', status: 'current' as const },
  { id: '2', name: 'Pour-Over Will — Sarah', type: 'Will', lastUpdated: '2024-03-15', status: 'current' as const },
  { id: '3', name: 'Pour-Over Will — Michael', type: 'Will', lastUpdated: '2024-03-15', status: 'current' as const },
  { id: '4', name: 'Durable Power of Attorney — Sarah', type: 'POA', lastUpdated: '2023-11-01', status: 'current' as const },
  { id: '5', name: 'Durable Power of Attorney — Michael', type: 'POA', lastUpdated: '2023-11-01', status: 'current' as const },
  { id: '6', name: 'Healthcare Directive — Sarah', type: 'Healthcare', lastUpdated: '2023-11-01', status: 'current' as const },
  { id: '7', name: 'Healthcare Directive — Michael', type: 'Healthcare', lastUpdated: '2023-11-01', status: 'current' as const },
  { id: '8', name: 'ILIT — Chen Family', type: 'Trust', lastUpdated: '2022-06-20', status: 'review' as const },
];

const KEY_ROLES = [
  { role: 'Executor', primary: 'Sarah Chen', alternate: 'James Chen (brother)' },
  { role: 'Trustee', primary: 'Michael Chen', alternate: 'First Republic Trust Co.' },
  { role: 'Guardian', primary: 'Lisa Park (sister)', alternate: 'James Chen' },
  { role: 'Healthcare Agent — Sarah', primary: 'Michael Chen', alternate: 'Lisa Park' },
  { role: 'Healthcare Agent — Michael', primary: 'Sarah Chen', alternate: 'David Chen (father)' },
  { role: 'Financial POA — Sarah', primary: 'Michael Chen', alternate: 'James Chen' },
  { role: 'Financial POA — Michael', primary: 'Sarah Chen', alternate: 'Lisa Park' },
];

const GIFT_HISTORY = [
  { year: 2024, annual: 72_000, total529: 90_000, charitableGiving: 45_000, lifetimeUsed: 90_000 },
  { year: 2023, annual: 68_000, total529: 0, charitableGiving: 40_000, lifetimeUsed: 0 },
  { year: 2022, annual: 64_000, total529: 0, charitableGiving: 35_000, lifetimeUsed: 0 },
];

const TRUSTS = [
  { id: '1', name: 'Chen Family Revocable Trust', type: 'Revocable Living Trust', funded: 4_200_000, status: 'Active', grantor: 'Sarah & Michael' },
  { id: '2', name: 'Chen ILIT', type: 'Irrevocable Life Insurance Trust', funded: 2_000_000, status: 'Active', grantor: 'Sarah & Michael' },
  { id: '3', name: 'Chen Education Trust', type: 'Dynasty Trust', funded: 500_000, status: 'Active', grantor: 'Sarah' },
];

const TAX_TIMELINE = [
  { year: 2026, estateValue: 8_750_000, exemption: 13_610_000, taxableEstate: 0, estateTax: 0 },
  { year: 2027, estateValue: 9_100_000, exemption: 7_000_000, taxableEstate: 2_100_000, estateTax: 840_000 },
  { year: 2028, estateValue: 9_464_000, exemption: 7_140_000, taxableEstate: 2_324_000, estateTax: 929_600 },
  { year: 2029, estateValue: 9_842_560, exemption: 7_283_000, taxableEstate: 2_559_560, estateTax: 1_023_824 },
  { year: 2030, estateValue: 10_236_262, exemption: 7_429_000, taxableEstate: 2_807_262, estateTax: 1_122_905 },
  { year: 2031, estateValue: 10_645_713, exemption: 7_577_000, taxableEstate: 3_068_713, estateTax: 1_227_485 },
  { year: 2032, estateValue: 11_071_541, exemption: 7_729_000, taxableEstate: 3_342_541, estateTax: 1_337_016 },
  { year: 2033, estateValue: 11_514_403, exemption: 7_883_000, taxableEstate: 3_631_403, estateTax: 1_452_561 },
];

const SCENARIO_COMPARISON = [
  { scenario: 'No Action', estateTax: 840_000, toHeirs: 8_260_000, toCharity: 0 },
  { scenario: 'Max Gifting', estateTax: 320_000, toHeirs: 8_580_000, toCharity: 0 },
  { scenario: 'GRAT + Gifts', estateTax: 0, toHeirs: 8_700_000, toCharity: 0 },
  { scenario: 'CRT + Gifts', estateTax: 150_000, toHeirs: 7_200_000, toCharity: 1_400_000 },
];

const BENEFICIARIES = [
  { name: 'Emily Chen', relationship: 'Daughter', accounts: ['Revocable Trust', 'UTMA', '529'], designationStatus: 'complete' as const },
  { name: 'James Chen', relationship: 'Son', accounts: ['Revocable Trust', 'UTMA', '529'], designationStatus: 'complete' as const },
  { name: 'Lisa Park', relationship: 'Sister', accounts: ['Life Insurance (Contingent)'], designationStatus: 'complete' as const },
  { name: 'Chen Family Foundation', relationship: 'Charity', accounts: ['DAF', 'CRT Remainder'], designationStatus: 'complete' as const },
];

const READINESS_CHECKLIST = [
  { item: 'Wills up to date', done: true },
  { item: 'Revocable trust funded', done: true },
  { item: 'Beneficiary designations reviewed', done: true },
  { item: 'Power of Attorney documents', done: true },
  { item: 'Healthcare directives', done: true },
  { item: 'ILIT premium payments current', done: false },
  { item: 'Sunset planning strategy selected', done: false },
  { item: 'Digital asset inventory', done: false },
];

const OPPORTUNITIES = [
  { title: 'Exemption Sunset Planning', description: 'Lock in current $13.6M exemption before potential 2026 sunset.', impact: 'high' as const },
  { title: 'GRAT for Growth Assets', description: 'Transfer appreciation above 7520 rate tax-free to heirs.', impact: 'high' as const },
  { title: 'Annual Gift Strategy', description: 'Maximize $18K/person annual exclusion gifts systematically.', impact: 'medium' as const },
  { title: 'ILIT Review', description: 'Review ILIT policy and Crummey letter compliance.', impact: 'medium' as const },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function EstatePage() {
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
              <ScrollText size={20} className="text-teal-300" />
              <h1 className="text-xl font-bold text-white">Estate Planning</h1>
            </div>
            <p className="text-sm text-white/50">Review estate documents, beneficiary designations, and projected estate taxes.</p>
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
        {activeTab === 'documents' && <DocumentsTab />}
        {activeTab === 'gifting' && <GiftingTab />}
        {activeTab === 'trusts' && <TrustsTab />}
        {activeTab === 'tax' && <EstateTaxTab />}
        {activeTab === 'beneficiaries' && <BeneficiariesTab />}
        {activeTab === 'diagram' && <DiagramTab />}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Overview Tab
// ---------------------------------------------------------------------------

function OverviewTab() {
  const completedCount = READINESS_CHECKLIST.filter((c) => c.done).length;
  const totalCount = READINESS_CHECKLIST.length;

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Gross Estate', value: fmt$(ESTATE_VALUE), sub: 'Current value' },
          { label: '2026 Exemption', value: fmt$(EXEMPTION_2026), sub: 'Per person' },
          { label: 'Projected Tax (Sunset)', value: fmt$(ESTATE_TAX_SUNSET), sub: 'If exemption drops to $7M' },
          { label: 'Readiness Score', value: `${completedCount}/${totalCount}`, sub: `${Math.round((completedCount / totalCount) * 100)}% complete` },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white/[0.07] rounded-xl border border-white/[0.06] shadow-sm p-4">
            <p className="text-xs font-medium text-white/50 mb-1">{kpi.label}</p>
            <p className="text-lg font-bold text-white">{kpi.value}</p>
            <p className="text-xs text-white/30 mt-0.5">{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* Estate Tax Timeline Chart */}
      <div className="bg-white/[0.07] rounded-xl border border-white/[0.06] shadow-sm p-5">
        <h3 className="text-sm font-semibold text-white mb-4">Estate Tax Projection vs Exemption</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={TAX_TIMELINE}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="year" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={(v: number) => fmtCompact(v)} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v: number) => fmt$(v)} />
              <Legend />
              <Line type="monotone" dataKey="estateValue" stroke="#6366f1" strokeWidth={2} name="Estate Value" dot={false} />
              <Line type="monotone" dataKey="exemption" stroke="#10b981" strokeWidth={2} name="Exemption" strokeDasharray="5 5" dot={false} />
              <Line type="monotone" dataKey="estateTax" stroke="#ef4444" strokeWidth={2} name="Estate Tax" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Readiness checklist */}
        <div className="bg-white/[0.07] rounded-xl border border-white/[0.06] shadow-sm p-5">
          <h3 className="text-sm font-semibold text-white mb-3">Estate Readiness Checklist</h3>
          <ul className="space-y-2">
            {READINESS_CHECKLIST.map((c) => (
              <li key={c.item} className="flex items-center gap-2 text-sm">
                {c.done ? (
                  <CheckCircle2 size={16} className="text-success-500 flex-shrink-0" />
                ) : (
                  <AlertTriangle size={16} className="text-warning-500 flex-shrink-0" />
                )}
                <span className={c.done ? 'text-white/50' : 'text-white font-medium'}>{c.item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Opportunities */}
        <div className="bg-white/[0.07] rounded-xl border border-white/[0.06] shadow-sm p-5">
          <h3 className="text-sm font-semibold text-white mb-3">Planning Opportunities</h3>
          <div className="space-y-3">
            {OPPORTUNITIES.map((o) => (
              <div key={o.title} className="flex items-start gap-3 p-3 rounded-lg bg-transparent">
                <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${o.impact === 'high' ? 'bg-critical-500' : 'bg-warning-500'}`} />
                <div>
                  <p className="text-sm font-medium text-white">{o.title}</p>
                  <p className="text-xs text-white/50 mt-0.5">{o.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Documents Tab
// ---------------------------------------------------------------------------

function DocumentsTab() {
  return (
    <div className="space-y-6">
      <div className="bg-white/[0.07] rounded-xl border border-white/[0.06] shadow-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-limestone-100">
          <h3 className="text-sm font-semibold text-white">Estate Documents</h3>
          <button className="inline-flex items-center gap-1 text-sm font-medium text-teal-300 hover:text-teal-300">
            <Plus size={14} /> Add Document
          </button>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-limestone-100 text-left">
              <th className="px-5 py-3 text-xs font-medium text-white/50 uppercase">Document</th>
              <th className="px-5 py-3 text-xs font-medium text-white/50 uppercase">Type</th>
              <th className="px-5 py-3 text-xs font-medium text-white/50 uppercase">Last Updated</th>
              <th className="px-5 py-3 text-xs font-medium text-white/50 uppercase">Status</th>
              <th className="px-5 py-3 text-xs font-medium text-white/50 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody>
            {ESTATE_DOCS.map((doc) => (
              <tr key={doc.id} className="border-b border-limestone-50 hover:bg-white/[0.04]/50">
                <td className="px-5 py-3 font-medium text-white">{doc.name}</td>
                <td className="px-5 py-3 text-white/50">{doc.type}</td>
                <td className="px-5 py-3 text-white/50">{doc.lastUpdated}</td>
                <td className="px-5 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    doc.status === 'current' ? 'bg-success-50 text-success-700' : 'bg-warning-50 text-warning-700'
                  }`}>
                    {doc.status === 'current' ? 'Current' : 'Needs Review'}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <button className="text-white/30 hover:text-white/50"><Edit3 size={14} /></button>
                    <button className="text-white/30 hover:text-critical-500"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Key roles */}
      <div className="bg-white/[0.07] rounded-xl border border-white/[0.06] shadow-sm p-5">
        <h3 className="text-sm font-semibold text-white mb-3">Key Roles & Designations</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-limestone-100 text-left">
              <th className="pb-2 text-xs font-medium text-white/50 uppercase">Role</th>
              <th className="pb-2 text-xs font-medium text-white/50 uppercase">Primary</th>
              <th className="pb-2 text-xs font-medium text-white/50 uppercase">Alternate</th>
            </tr>
          </thead>
          <tbody>
            {KEY_ROLES.map((r) => (
              <tr key={r.role} className="border-b border-limestone-50">
                <td className="py-2.5 font-medium text-white">{r.role}</td>
                <td className="py-2.5 text-white/50">{r.primary}</td>
                <td className="py-2.5 text-white/50">{r.alternate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Gifting Tab
// ---------------------------------------------------------------------------

function GiftingTab() {
  const annualExclusion = 18_000;
  const lifetimeExemptionUsed = 90_000;
  const lifetimeExemptionTotal = 13_610_000;

  return (
    <div className="space-y-6">
      {/* Gifting KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Annual Exclusion', value: fmt$(annualExclusion), sub: 'Per person (2024)' },
          { label: '2024 Annual Gifts', value: fmt$(72_000), sub: '4 recipients' },
          { label: 'Lifetime Exemption Used', value: fmt$(lifetimeExemptionUsed), sub: `of ${fmt$(lifetimeExemptionTotal)}` },
          { label: 'Remaining Exemption', value: fmt$(lifetimeExemptionTotal - lifetimeExemptionUsed), sub: fmtPct(((lifetimeExemptionTotal - lifetimeExemptionUsed) / lifetimeExemptionTotal) * 100) + ' remaining' },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white/[0.07] rounded-xl border border-white/[0.06] shadow-sm p-4">
            <p className="text-xs font-medium text-white/50 mb-1">{kpi.label}</p>
            <p className="text-lg font-bold text-white">{kpi.value}</p>
            <p className="text-xs text-white/30 mt-0.5">{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* Gift history table */}
      <div className="bg-white/[0.07] rounded-xl border border-white/[0.06] shadow-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-limestone-100">
          <h3 className="text-sm font-semibold text-white">Gift History</h3>
          <button className="inline-flex items-center gap-1 text-sm font-medium text-teal-300 hover:text-teal-300">
            <Plus size={14} /> Record Gift
          </button>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-limestone-100 text-left">
              <th className="px-5 py-3 text-xs font-medium text-white/50 uppercase">Year</th>
              <th className="px-5 py-3 text-xs font-medium text-white/50 uppercase text-right">Annual Gifts</th>
              <th className="px-5 py-3 text-xs font-medium text-white/50 uppercase text-right">529 Superfunding</th>
              <th className="px-5 py-3 text-xs font-medium text-white/50 uppercase text-right">Charitable</th>
              <th className="px-5 py-3 text-xs font-medium text-white/50 uppercase text-right">Lifetime Exemption Used</th>
            </tr>
          </thead>
          <tbody>
            {GIFT_HISTORY.map((g) => (
              <tr key={g.year} className="border-b border-limestone-50">
                <td className="px-5 py-3 font-medium text-white">{g.year}</td>
                <td className="px-5 py-3 text-white/50 text-right">{fmt$(g.annual)}</td>
                <td className="px-5 py-3 text-white/50 text-right">{g.total529 > 0 ? fmt$(g.total529) : '—'}</td>
                <td className="px-5 py-3 text-white/50 text-right">{fmt$(g.charitableGiving)}</td>
                <td className="px-5 py-3 text-white/50 text-right">{g.lifetimeUsed > 0 ? fmt$(g.lifetimeUsed) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Gifting strategies */}
      <div className="bg-white/[0.07] rounded-xl border border-white/[0.06] shadow-sm p-5">
        <h3 className="text-sm font-semibold text-white mb-3">Strategic Gifting Opportunities</h3>
        <div className="grid grid-cols-2 gap-4">
          {[
            { title: 'Maximize Annual Exclusion', desc: 'Gift $18K per person to children and grandchildren. For 4 recipients = $144K/year removed from estate.', savings: '$57,600 estate tax saved/year' },
            { title: '529 Superfunding', desc: 'Front-load 5 years of annual exclusion ($90K) per child into 529 plans for education.', savings: '$36,000 estate tax saved' },
            { title: 'GRAT Series', desc: 'Use 2-year rolling GRATs to transfer growth above 7520 rate (currently 5.4%).', savings: 'Potentially $500K+ transferred tax-free' },
            { title: 'Lock in Exemption Pre-Sunset', desc: 'Use remaining exemption before potential 2026 drop to $7M.', savings: '$2.6M+ additional exemption utilized' },
          ].map((s) => (
            <div key={s.title} className="p-4 rounded-lg border border-limestone-100">
              <p className="text-sm font-medium text-white">{s.title}</p>
              <p className="text-xs text-white/50 mt-1">{s.desc}</p>
              <p className="text-xs font-medium text-success-500 mt-2">{s.savings}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Trusts Tab
// ---------------------------------------------------------------------------

function TrustsTab() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Trust Structures</h3>
        <button className="inline-flex items-center gap-1 text-sm font-medium text-teal-300 hover:text-teal-300">
          <Plus size={14} /> Add Trust
        </button>
      </div>

      <div className="grid gap-4">
        {TRUSTS.map((trust) => (
          <div key={trust.id} className="bg-white/[0.07] rounded-xl border border-white/[0.06] shadow-sm p-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Shield size={16} className="text-teal-300" />
                  <h4 className="text-sm font-semibold text-white">{trust.name}</h4>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-success-50 text-success-700">
                    {trust.status}
                  </span>
                </div>
                <p className="text-xs text-white/50 mt-1">{trust.type}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-white">{fmt$(trust.funded)}</p>
                <p className="text-xs text-white/50">Funded Amount</p>
              </div>
            </div>
            <div className="flex items-center gap-4 mt-3 pt-3 border-t border-limestone-100 text-xs text-white/50">
              <span>Grantor: {trust.grantor}</span>
              <span className="flex items-center gap-1 text-teal-300 hover:text-teal-300 cursor-pointer">
                View Details <ChevronRight size={12} />
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* GRAT analysis */}
      <div className="bg-white/[0.07] rounded-xl border border-white/[0.06] shadow-sm p-5">
        <h3 className="text-sm font-semibold text-white mb-3">GRAT Analysis</h3>
        <div className="grid grid-cols-3 gap-4 mb-4">
          {[
            { label: 'Initial Transfer', value: fmt$(2_000_000) },
            { label: '7520 Rate', value: '5.40%' },
            { label: 'Projected Remainder to Heirs', value: fmt$(412_000) },
          ].map((k) => (
            <div key={k.label} className="p-3 rounded-lg bg-transparent">
              <p className="text-xs text-white/50">{k.label}</p>
              <p className="text-sm font-bold text-white mt-0.5">{k.value}</p>
            </div>
          ))}
        </div>
        <div className="flex items-start gap-2 p-3 rounded-lg bg-teal-500/10 text-sm text-teal-300">
          <Info size={16} className="flex-shrink-0 mt-0.5" />
          <p>A 2-year GRAT with an 8% expected return would transfer approximately $412,000 tax-free to beneficiaries — the growth above the 5.40% 7520 rate.</p>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Estate Tax Tab
// ---------------------------------------------------------------------------

function EstateTaxTab() {
  const worksheetItems = [
    { label: 'Gross Estate', value: ESTATE_VALUE },
    { label: 'Less: Marital Deduction', value: -4_000_000 },
    { label: 'Less: Charitable Deduction', value: -250_000 },
    { label: 'Less: Admin Expenses', value: -50_000 },
    { label: 'Taxable Estate', value: 4_450_000 },
    { label: 'Less: Unified Credit', value: -13_610_000 },
    { label: 'Federal Estate Tax', value: 0 },
  ];

  return (
    <div className="space-y-6">
      {/* Tax worksheet */}
      <div className="bg-white/[0.07] rounded-xl border border-white/[0.06] shadow-sm p-5">
        <h3 className="text-sm font-semibold text-white mb-4">Federal Estate Tax Worksheet</h3>
        <div className="space-y-2">
          {worksheetItems.map((item, i) => {
            const isTotal = item.label === 'Taxable Estate' || item.label === 'Federal Estate Tax';
            return (
              <div key={i} className={`flex items-center justify-between py-2 ${isTotal ? 'border-t border-white/[0.06] font-semibold' : ''}`}>
                <span className={`text-sm ${isTotal ? 'text-white' : 'text-white/50'}`}>{item.label}</span>
                <span className={`text-sm ${item.value < 0 ? 'text-critical-500' : isTotal ? 'text-white' : 'text-white/60'}`}>
                  {item.value < 0 ? `(${fmt$(Math.abs(item.value))})` : fmt$(item.value)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Scenario comparison */}
      <div className="bg-white/[0.07] rounded-xl border border-white/[0.06] shadow-sm p-5">
        <h3 className="text-sm font-semibold text-white mb-4">Scenario Comparison (Post-Sunset)</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={SCENARIO_COMPARISON}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="scenario" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={(v: number) => fmtCompact(v)} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v: number) => fmt$(v)} />
              <Legend />
              <Bar dataKey="toHeirs" fill="#6366f1" name="To Heirs" radius={[4, 4, 0, 0]} />
              <Bar dataKey="estateTax" fill="#ef4444" name="Estate Tax" radius={[4, 4, 0, 0]} />
              <Bar dataKey="toCharity" fill="#10b981" name="To Charity" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Sunset alert */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-warning-50 border border-warning-200">
        <AlertTriangle size={20} className="text-warning-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-warning-700">Exemption Sunset Alert</p>
          <p className="text-sm text-warning-700 mt-1">
            The current $13.6M exemption is scheduled to sunset at the end of 2025, reverting to approximately $7M per person.
            Without action, the Chen estate could face approximately {fmt$(ESTATE_TAX_SUNSET)} in estate taxes. Consider accelerated
            gifting and trust strategies to lock in the higher exemption.
          </p>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Beneficiaries Tab
// ---------------------------------------------------------------------------

function BeneficiariesTab() {
  return (
    <div className="space-y-6">
      <div className="bg-white/[0.07] rounded-xl border border-white/[0.06] shadow-sm">
        <div className="px-5 py-4 border-b border-limestone-100">
          <h3 className="text-sm font-semibold text-white">Beneficiary Designations</h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-limestone-100 text-left">
              <th className="px-5 py-3 text-xs font-medium text-white/50 uppercase">Beneficiary</th>
              <th className="px-5 py-3 text-xs font-medium text-white/50 uppercase">Relationship</th>
              <th className="px-5 py-3 text-xs font-medium text-white/50 uppercase">Linked Accounts / Trusts</th>
              <th className="px-5 py-3 text-xs font-medium text-white/50 uppercase">Status</th>
            </tr>
          </thead>
          <tbody>
            {BENEFICIARIES.map((b) => (
              <tr key={b.name} className="border-b border-limestone-50 hover:bg-white/[0.04]/50">
                <td className="px-5 py-3 font-medium text-white">{b.name}</td>
                <td className="px-5 py-3 text-white/50">{b.relationship}</td>
                <td className="px-5 py-3">
                  <div className="flex flex-wrap gap-1">
                    {b.accounts.map((a) => (
                      <span key={a} className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-white/[0.06] text-white/60">{a}</span>
                    ))}
                  </div>
                </td>
                <td className="px-5 py-3">
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-success-700">
                    <CheckCircle2 size={13} /> Complete
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Issues */}
      <div className="bg-white/[0.07] rounded-xl border border-white/[0.06] shadow-sm p-5">
        <h3 className="text-sm font-semibold text-white mb-3">Beneficiary Review Items</h3>
        <div className="space-y-2">
          {[
            { issue: 'Confirm contingent beneficiaries on 401(k) accounts', severity: 'info' as const },
            { issue: 'Review trust-as-beneficiary designation for IRA to ensure See-Through provisions', severity: 'warn' as const },
            { issue: 'Verify ILIT is designated as owner/beneficiary of life insurance policy', severity: 'warn' as const },
          ].map((item, i) => (
            <div key={i} className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
              item.severity === 'warn' ? 'bg-warning-50 text-warning-700' : 'bg-teal-500/10 text-teal-300'
            }`}>
              {item.severity === 'warn' ? <AlertTriangle size={15} /> : <Info size={15} />}
              {item.issue}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Diagram Tab
// ---------------------------------------------------------------------------

function DiagramTab() {
  const nodes = {
    clients: { label: 'Sarah & Michael Chen', value: fmt$(ESTATE_VALUE) },
    revTrust: { label: 'Revocable Trust', value: fmt$(4_200_000) },
    ilit: { label: 'ILIT', value: fmt$(2_000_000) },
    eduTrust: { label: 'Education Trust', value: fmt$(500_000) },
    retirement: { label: 'Retirement Accounts', value: fmt$(1_500_000) },
    taxable: { label: 'Taxable Accounts', value: fmt$(550_000) },
    emily: { label: 'Emily Chen' },
    james: { label: 'James Chen' },
    charity: { label: 'Chen Family Foundation' },
  };

  return (
    <div className="space-y-6">
      <div className="bg-white/[0.07] rounded-xl border border-white/[0.06] shadow-sm p-6">
        <h3 className="text-sm font-semibold text-white mb-6 text-center">Estate Flow Diagram</h3>

        {/* Level 1: Clients */}
        <div className="flex justify-center mb-8">
          <div className="px-6 py-3 rounded-xl bg-teal-500/15 border-2 border-brand-200 text-center">
            <p className="text-sm font-bold text-teal-300">{nodes.clients.label}</p>
            <p className="text-xs text-teal-300">{nodes.clients.value}</p>
          </div>
        </div>

        {/* Connector lines */}
        <div className="flex justify-center mb-2">
          <div className="w-px h-6 bg-white/[0.06]" />
        </div>
        <div className="flex justify-center mb-2">
          <div className="w-3/4 h-px bg-white/[0.06] relative">
            <div className="absolute left-0 top-0 w-px h-4 bg-white/[0.06]" />
            <div className="absolute left-1/4 top-0 w-px h-4 bg-white/[0.06]" />
            <div className="absolute left-1/2 top-0 w-px h-4 bg-white/[0.06]" />
            <div className="absolute left-3/4 top-0 w-px h-4 bg-white/[0.06]" />
            <div className="absolute right-0 top-0 w-px h-4 bg-white/[0.06]" />
          </div>
        </div>

        {/* Level 2: Vehicles */}
        <div className="grid grid-cols-5 gap-3 mb-8">
          {[
            { ...nodes.revTrust, color: 'bg-teal-500/10 border-brand-200 text-teal-300' },
            { ...nodes.ilit, color: 'bg-teal-500/10 border-brand-200 text-teal-300' },
            { ...nodes.eduTrust, color: 'bg-teal-500/10 border-brand-200 text-teal-300' },
            { ...nodes.retirement, color: 'bg-orange-50 border-orange-200 text-orange-900' },
            { ...nodes.taxable, color: 'bg-transparent border-white/[0.06] text-white' },
          ].map((n) => (
            <div key={n.label} className={`px-3 py-2.5 rounded-lg border text-center ${n.color}`}>
              <p className="text-xs font-semibold">{n.label}</p>
              <p className="text-xs mt-0.5">{n.value}</p>
            </div>
          ))}
        </div>

        {/* Connector lines */}
        <div className="flex justify-center mb-2">
          <div className="w-1/2 h-px bg-white/[0.06] relative">
            <div className="absolute left-0 top-0 w-px h-4 bg-white/[0.06]" />
            <div className="absolute left-1/2 top-0 w-px h-4 bg-white/[0.06]" />
            <div className="absolute right-0 top-0 w-px h-4 bg-white/[0.06]" />
          </div>
        </div>

        {/* Level 3: Beneficiaries */}
        <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
          {[nodes.emily, nodes.james, nodes.charity].map((n) => (
            <div key={n.label} className="px-3 py-2.5 rounded-lg border border-success-200 bg-success-50 text-center">
              <p className="text-xs font-semibold text-success-900">{n.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-start gap-2 p-3 rounded-lg bg-transparent text-xs text-white/50">
        <Info size={14} className="flex-shrink-0 mt-0.5" />
        <p>This diagram shows the current estate structure. Arrows indicate asset flow at death or upon trust termination. Review beneficiary designations annually for accuracy.</p>
      </div>
    </div>
  );
}
