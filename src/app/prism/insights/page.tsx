'use client';

import React, { useState, useMemo } from 'react';
import {
  Lightbulb,
  AlertTriangle,
  TrendingUp,
  Shield,
  Heart,
  DollarSign,
  BarChart3,
  Target,
  Filter,
  Download,
  Mail,
  X,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Clock,
  Search,
  Zap,
  Eye,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Severity = 'critical' | 'warning' | 'info';
type Category = 'tax' | 'retirement' | 'estate' | 'insurance' | 'investments' | 'cash_flow' | 'goals';
type InsightType = 'opportunity' | 'risk' | 'action_required' | 'informational';

interface Insight {
  id: string;
  rank: number;
  severity: Severity;
  category: Category;
  type: InsightType;
  title: string;
  clientName: string;
  clientAge: number;
  wealthTier: string;
  summary: string;
  detail: string;
  estimatedImpact: { type: string; amount: number; timeframe: string };
  actions: Array<{ label: string; type: string; target: string }>;
  aiGenerated: boolean;
  createdAt: string;
  dismissed: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmt$(v: number): string {
  return v.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

const CATEGORY_ICONS: Record<Category, React.ReactNode> = {
  tax: <DollarSign size={16} />,
  retirement: <TrendingUp size={16} />,
  estate: <Shield size={16} />,
  insurance: <Heart size={16} />,
  investments: <BarChart3 size={16} />,
  cash_flow: <DollarSign size={16} />,
  goals: <Target size={16} />,
};

const CATEGORY_COLORS: Record<Category, string> = {
  tax: 'bg-brand-50 text-brand-700 border-brand-200',
  retirement: 'bg-brand-50 text-brand-700 border-brand-200',
  estate: 'bg-brand-50 text-brand-700 border-brand-200',
  insurance: 'bg-pink-50 text-pink-700 border-pink-200',
  investments: 'bg-brand-50 text-brand-700 border-brand-200',
  cash_flow: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  goals: 'bg-orange-50 text-orange-700 border-orange-200',
};

const SEVERITY_STYLES: Record<Severity, string> = {
  critical: 'bg-critical-100 text-critical-700 border-critical-300',
  warning: 'bg-warning-100 text-warning-700 border-warning-300',
  info: 'bg-brand-100 text-brand-700 border-brand-300',
};

// ---------------------------------------------------------------------------
// Demo Data
// ---------------------------------------------------------------------------

const DEMO_INSIGHTS: Insight[] = [
  {
    id: '1', rank: 1, severity: 'critical', category: 'tax', type: 'action_required',
    title: 'Estimated Tax Underpayment Risk',
    clientName: 'Sarah & Michael Chen', clientAge: 55, wealthTier: 'HNW',
    summary: 'Based on current income and withholding, the Chens may owe $18,400 at year-end with potential underpayment penalties.',
    detail: 'YTD income of $485,000 against withholding of $92,000 leaves a projected shortfall. Q2 estimated payment of $8,200 recommended by June 16.',
    estimatedImpact: { type: 'tax_savings', amount: 18400, timeframe: 'This tax year' },
    actions: [{ label: 'View Tax Module', type: 'navigate_to_module', target: '/tax' }, { label: 'Draft Client Email', type: 'open_form', target: '/email' }],
    aiGenerated: true, createdAt: '2026-03-01T08:00:00Z', dismissed: false,
  },
  {
    id: '2', rank: 2, severity: 'critical', category: 'retirement', type: 'risk',
    title: 'Plan Success Rate Below 70%',
    clientName: 'Robert Johnson', clientAge: 62, wealthTier: 'Mass Affluent',
    summary: 'Plan success rate has dropped to 64% after recent market decline. Immediate review recommended.',
    detail: 'Portfolio value declined 12% in the past month. Top actions: delay retirement 2 years, reduce discretionary spending by $15K/year, or increase savings by $8K/year.',
    estimatedImpact: { type: 'risk_reduction', amount: 0, timeframe: 'Immediate' },
    actions: [{ label: 'View Plan', type: 'navigate_to_module', target: '/plan' }, { label: 'Schedule Meeting', type: 'schedule_meeting', target: '/calendar' }],
    aiGenerated: true, createdAt: '2026-03-01T08:00:00Z', dismissed: false,
  },
  {
    id: '3', rank: 3, severity: 'warning', category: 'tax', type: 'opportunity',
    title: 'Roth Conversion Opportunity',
    clientName: 'Sarah & Michael Chen', clientAge: 55, wealthTier: 'HNW',
    summary: 'The Chens have $31,400 of headroom in the 24% bracket. Converting now saves an estimated $12,400 in lifetime taxes.',
    detail: 'Current taxable income of $350,600 leaves room before the 32% bracket at $382,000. A $31,400 Roth conversion at 24% costs $7,536 now but avoids future taxation at an expected 32% rate in retirement.',
    estimatedImpact: { type: 'tax_savings', amount: 12400, timeframe: 'Lifetime' },
    actions: [{ label: 'Run Roth Analysis', type: 'run_analysis', target: '/roth' }],
    aiGenerated: true, createdAt: '2026-03-01T08:00:00Z', dismissed: false,
  },
  {
    id: '4', rank: 4, severity: 'warning', category: 'estate', type: 'action_required',
    title: 'Estate Documents Need Review',
    clientName: 'Patricia Williams', clientAge: 71, wealthTier: 'UHNW',
    summary: 'Revocable trust was last updated 6 years ago. Tax law changes and family changes may require updates.',
    detail: 'Trust was drafted in 2020 before SECURE 2.0 and current estate exemption levels. Two grandchildren born since then. Attorney review recommended.',
    estimatedImpact: { type: 'estate_transfer', amount: 250000, timeframe: '5-10 years' },
    actions: [{ label: 'View Estate Module', type: 'navigate_to_module', target: '/estate' }],
    aiGenerated: true, createdAt: '2026-02-28T08:00:00Z', dismissed: false,
  },
  {
    id: '5', rank: 5, severity: 'warning', category: 'insurance', type: 'risk',
    title: 'Life Insurance Coverage Gap',
    clientName: 'David & Maria Garcia', clientAge: 42, wealthTier: 'HNW',
    summary: 'Analysis indicates a $1.2M gap between current coverage ($500K) and estimated need ($1.7M).',
    detail: 'With two young children, a $650K mortgage, and Maria as primary earner at $280K/year, current $500K term policy is insufficient. A 20-year $1.2M term policy estimated at $85/month.',
    estimatedImpact: { type: 'risk_reduction', amount: 1200000, timeframe: '20 years' },
    actions: [{ label: 'View Insurance', type: 'navigate_to_module', target: '/insurance' }],
    aiGenerated: true, createdAt: '2026-02-28T08:00:00Z', dismissed: false,
  },
  {
    id: '6', rank: 6, severity: 'warning', category: 'retirement', type: 'action_required',
    title: 'RMD Begins Next Year',
    clientName: 'Patricia Williams', clientAge: 71, wealthTier: 'UHNW',
    summary: 'Patricia turns 73 in 2028. First RMD of approximately $145,000 from $3.97M in tax-deferred accounts.',
    detail: 'Consider accelerating Roth conversions this year and next to reduce future RMD amounts and lifetime tax burden. Current bracket headroom allows $85K conversion at 32%.',
    estimatedImpact: { type: 'tax_savings', amount: 42000, timeframe: '10+ years' },
    actions: [{ label: 'Run Roth Analysis', type: 'run_analysis', target: '/roth' }],
    aiGenerated: true, createdAt: '2026-02-28T08:00:00Z', dismissed: false,
  },
  {
    id: '7', rank: 7, severity: 'warning', category: 'investments', type: 'risk',
    title: 'Portfolio Value Drop — Re-evaluation Needed',
    clientName: 'James & Lisa Park', clientAge: 58, wealthTier: 'HNW',
    summary: 'Portfolio declined 11% ($132K) since last month. Plan success rate moved from 82% to 74%.',
    detail: 'Technology sector concentration (35% of portfolio) contributed to outsized decline. Consider rebalancing to target allocation and reviewing risk tolerance.',
    estimatedImpact: { type: 'risk_reduction', amount: 132000, timeframe: 'Immediate' },
    actions: [{ label: 'View Investments', type: 'navigate_to_module', target: '/investments' }, { label: 'Schedule Review', type: 'schedule_meeting', target: '/calendar' }],
    aiGenerated: true, createdAt: '2026-02-27T08:00:00Z', dismissed: false,
  },
  {
    id: '8', rank: 8, severity: 'info', category: 'tax', type: 'opportunity',
    title: 'IRMAA Threshold Proximity',
    clientName: 'Patricia Williams', clientAge: 71, wealthTier: 'UHNW',
    summary: 'Projected MAGI of $310K is within $24K of the next IRMAA bracket ($334K). Additional Roth conversions could trigger $4,800/year surcharge.',
    detail: 'Current Part B premium of $259/month. Crossing $334K bracket adds $185/month ($2,220/year) for Part B plus $33/month for Part D. Limit Roth conversions to $24K to stay below.',
    estimatedImpact: { type: 'tax_savings', amount: 4800, timeframe: 'Per year' },
    actions: [{ label: 'View Medicare', type: 'navigate_to_module', target: '/medicare' }],
    aiGenerated: true, createdAt: '2026-02-27T08:00:00Z', dismissed: false,
  },
  {
    id: '9', rank: 9, severity: 'info', category: 'tax', type: 'opportunity',
    title: '401(k) Not Maximized',
    clientName: 'David & Maria Garcia', clientAge: 42, wealthTier: 'HNW',
    summary: 'David is contributing $15,000/year to his 401(k) but the 2026 limit is $23,500. Increasing saves ~$3,145/year in taxes.',
    detail: 'At 37% marginal rate, increasing contributions by $8,500 saves $3,145 in federal tax. Employer match of 50% on first 6% adds additional $4,200/year.',
    estimatedImpact: { type: 'tax_savings', amount: 3145, timeframe: 'Per year' },
    actions: [{ label: 'View Retirement', type: 'navigate_to_module', target: '/retirement' }],
    aiGenerated: true, createdAt: '2026-02-27T08:00:00Z', dismissed: false,
  },
  {
    id: '10', rank: 10, severity: 'info', category: 'estate', type: 'opportunity',
    title: 'Annual Gift Exclusion Underutilized',
    clientName: 'Patricia Williams', clientAge: 71, wealthTier: 'UHNW',
    summary: 'Only $38K of $152K annual gift exclusion capacity used. 40 weeks remain to transfer $114K tax-free to 8 beneficiaries.',
    detail: 'With 4 children and 4 grandchildren, Patricia can gift $19K each ($152K total) annually without touching lifetime exemption. Consider funding 529 plans or custodial accounts.',
    estimatedImpact: { type: 'estate_transfer', amount: 114000, timeframe: 'This year' },
    actions: [{ label: 'View Gifting', type: 'navigate_to_module', target: '/estate' }],
    aiGenerated: true, createdAt: '2026-02-26T08:00:00Z', dismissed: false,
  },
  {
    id: '11', rank: 11, severity: 'info', category: 'retirement', type: 'informational',
    title: 'Social Security Claiming Decision Approaching',
    clientName: 'Robert Johnson', clientAge: 62, wealthTier: 'Mass Affluent',
    summary: 'Robert is approaching age 62. Based on health, income needs, and break-even analysis, delaying to age 70 is recommended (break-even: age 82).',
    detail: 'Claiming at 62: $2,100/mo. At FRA (67): $3,000/mo. At 70: $3,720/mo. With average life expectancy of 85, total lifetime benefits are maximized by delaying to 70.',
    estimatedImpact: { type: 'additional_income', amount: 194400, timeframe: 'Lifetime (to 85)' },
    actions: [{ label: 'View SS Module', type: 'navigate_to_module', target: '/social-security' }],
    aiGenerated: true, createdAt: '2026-02-26T08:00:00Z', dismissed: false,
  },
  {
    id: '12', rank: 12, severity: 'info', category: 'cash_flow', type: 'informational',
    title: 'Beneficiary Review Due',
    clientName: 'James & Lisa Park', clientAge: 58, wealthTier: 'HNW',
    summary: 'Beneficiary designations on 6 accounts have not been reviewed in 3+ years. Life events may require updates.',
    detail: 'Last review was March 2023. Since then, no life events recorded but annual review is best practice. Verify all 401(k), IRA, and life insurance beneficiary designations are current.',
    estimatedImpact: { type: 'risk_reduction', amount: 0, timeframe: 'Ongoing' },
    actions: [{ label: 'View Beneficiaries', type: 'navigate_to_module', target: '/estate' }],
    aiGenerated: false, createdAt: '2026-02-25T08:00:00Z', dismissed: false,
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function InsightsPage() {
  const [categoryFilter, setCategoryFilter] = useState<Category | 'all'>('all');
  const [severityFilter, setSeverityFilter] = useState<Severity | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  const filteredInsights = useMemo(() => {
    return DEMO_INSIGHTS.filter((i) => {
      if (dismissedIds.has(i.id)) return false;
      if (categoryFilter !== 'all' && i.category !== categoryFilter) return false;
      if (severityFilter !== 'all' && i.severity !== severityFilter) return false;
      if (searchQuery && !i.title.toLowerCase().includes(searchQuery.toLowerCase()) && !i.clientName.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [categoryFilter, severityFilter, searchQuery, dismissedIds]);

  const criticalCount = DEMO_INSIGHTS.filter((i) => i.severity === 'critical' && !dismissedIds.has(i.id)).length;
  const warningCount = DEMO_INSIGHTS.filter((i) => i.severity === 'warning' && !dismissedIds.has(i.id)).length;
  const infoCount = DEMO_INSIGHTS.filter((i) => i.severity === 'info' && !dismissedIds.has(i.id)).length;
  const totalImpact = DEMO_INSIGHTS.filter((i) => !dismissedIds.has(i.id)).reduce((s, i) => s + i.estimatedImpact.amount, 0);

  return (
    <div className="max-w-content mx-auto px-6 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Lightbulb size={20} className="text-brand-500" />
            <h1 className="text-xl font-bold text-charcoal-900">AI Insights</h1>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-brand-50 text-brand-700">
              <Zap size={11} /> AI-Powered
            </span>
          </div>
          <p className="text-sm text-charcoal-500">Proactive action items and planning recommendations across your practice.</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-charcoal-700 bg-white rounded-lg border border-limestone-200 hover:bg-limestone-50">
            <Download size={14} /> Export
          </button>
          <button className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-brand-500 rounded-lg hover:bg-brand-600">
            <Mail size={14} /> Generate Emails
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Critical', count: criticalCount, color: 'text-critical-500', bg: 'bg-critical-50 border-critical-100' },
          { label: 'Warning', count: warningCount, color: 'text-warning-500', bg: 'bg-warning-50 border-warning-100' },
          { label: 'Informational', count: infoCount, color: 'text-brand-700', bg: 'bg-brand-50 border-brand-200' },
          { label: 'Total Impact', count: null, value: fmt$(totalImpact), color: 'text-success-500', bg: 'bg-success-50 border-success-100' },
        ].map((card) => (
          <div key={card.label} className={`rounded-xl border p-4 ${card.bg}`}>
            <p className="text-xs font-medium text-charcoal-500 mb-1">{card.label}</p>
            <p className={`text-2xl font-bold ${card.color}`}>{card.value ?? card.count}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-charcoal-300" />
          <input
            type="text"
            placeholder="Search by client or insight..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-limestone-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <select
          className="px-3 py-2 text-sm border border-limestone-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-brand-500/20"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value as Category | 'all')}
        >
          <option value="all">All Categories</option>
          {(['tax', 'retirement', 'estate', 'insurance', 'investments', 'cash_flow', 'goals'] as Category[]).map((c) => (
            <option key={c} value={c}>{c.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>
          ))}
        </select>
        <select
          className="px-3 py-2 text-sm border border-limestone-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-brand-500/20"
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value as Severity | 'all')}
        >
          <option value="all">All Severity</option>
          <option value="critical">Critical</option>
          <option value="warning">Warning</option>
          <option value="info">Info</option>
        </select>
        <span className="text-sm text-charcoal-500">{filteredInsights.length} insights</span>
      </div>

      {/* Insight cards (3-column masonry grid) */}
      <div className="grid grid-cols-3 gap-4">
        {filteredInsights.map((insight) => {
          const isExpanded = expandedId === insight.id;
          return (
            <div key={insight.id} className="bg-white rounded-xl border border-limestone-200 shadow-sm p-4 flex flex-col">
              {/* Header */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg ${CATEGORY_COLORS[insight.category]}`}>
                    {CATEGORY_ICONS[insight.category]}
                  </span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${SEVERITY_STYLES[insight.severity]}`}>
                    {insight.severity}
                  </span>
                </div>
                {insight.aiGenerated && (
                  <span className="inline-flex items-center gap-0.5 text-xs text-brand-600"><Zap size={10} /> AI</span>
                )}
              </div>

              {/* Title */}
              <h3 className="text-sm font-semibold text-charcoal-900 mb-1">{insight.title}</h3>
              <p className="text-xs text-charcoal-500 mb-2">{insight.clientName} &middot; Age {insight.clientAge} &middot; {insight.wealthTier}</p>

              {/* Summary */}
              <p className="text-sm text-charcoal-500 mb-3 flex-1">{insight.summary}</p>

              {/* Expanded detail */}
              {isExpanded && (
                <div className="mb-3 p-3 rounded-lg bg-limestone-50 text-sm text-charcoal-700 border border-limestone-100">
                  {insight.detail}
                </div>
              )}

              {/* Impact */}
              <div className="flex items-center gap-1 mb-3 text-xs font-medium text-success-700">
                <TrendingUp size={12} />
                <span>
                  {insight.estimatedImpact.amount > 0 ? fmt$(insight.estimatedImpact.amount) : 'Risk reduction'} &middot; {insight.estimatedImpact.timeframe}
                </span>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-3 border-t border-limestone-100">
                <button className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-brand-500 text-white rounded-lg hover:bg-brand-600">
                  <ChevronRight size={12} /> Take Action
                </button>
                <button
                  onClick={() => setExpandedId(isExpanded ? null : insight.id)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-charcoal-500 bg-limestone-100 rounded-lg hover:bg-limestone-200"
                >
                  <Eye size={12} /> {isExpanded ? 'Less' : 'Details'}
                </button>
                <button
                  onClick={() => setDismissedIds((prev) => new Set([...prev, insight.id]))}
                  className="ml-auto text-charcoal-300 hover:text-charcoal-500"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredInsights.length === 0 && (
        <div className="text-center py-16">
          <CheckCircle2 size={32} className="mx-auto text-success-500 mb-3" />
          <h3 className="text-sm font-semibold text-charcoal-700">All caught up</h3>
          <p className="text-sm text-charcoal-500 mt-1">No insights match your current filters.</p>
        </div>
      )}
    </div>
  );
}
