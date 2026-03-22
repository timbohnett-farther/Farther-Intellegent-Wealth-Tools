'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth, useToast } from '@/lib/tax-planning/auth-context';
import type {
  Proposal,
  ProposalStatus,
  ProposalSection,
  StressTestResult,
} from '@/lib/proposal-engine/types';
import { ProposalStatusBadge } from '@/components/proposal-engine/ProposalStatusBadge';
import { RiskScoreGauge } from '@/components/proposal-engine/RiskScoreGauge';
import { AllocationBar } from '@/components/proposal-engine/AllocationBar';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TabKey = 'overview' | 'portfolio' | 'risk' | 'analysis' | 'output' | 'tracking';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TABS: { key: TabKey; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'portfolio', label: 'Portfolio' },
  { key: 'risk', label: 'Risk' },
  { key: 'analysis', label: 'Analysis' },
  { key: 'output', label: 'Output' },
  { key: 'tracking', label: 'Tracking' },
];

const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const fmtPct = (v: number) => `${(v * 100).toFixed(1)}%`;

const formatDate = (iso?: string | null) => {
  if (!iso) return '--';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const formatDateTime = (iso?: string | null) => {
  if (!iso) return '--';
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function DetailSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center gap-4">
        <div className="h-8 w-48 rounded bg-white/[0.06]" />
        <div className="h-6 w-20 rounded-full bg-white/[0.06]" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-white/[0.06] bg-white/[0.07] backdrop-blur-xl p-6">
            <div className="h-4 w-20 rounded bg-white/[0.06] mb-3" />
            <div className="h-8 w-28 rounded bg-white/[0.06]" />
          </div>
        ))}
      </div>
      <div className="h-10 w-full rounded bg-white/[0.06]" />
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.07] backdrop-blur-xl p-6">
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-4 w-full rounded bg-white/[0.06]" />
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Metric Card
// ---------------------------------------------------------------------------

function MetricCard({ label, value, subtext }: { label: string; value: string; subtext?: string }) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.07] backdrop-blur-xl p-5 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-white/50">{label}</p>
      <p className="mt-2 text-2xl font-bold text-white tabular-nums">{value}</p>
      {subtext && <p className="mt-1 text-xs text-white/30">{subtext}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function ProposalDetailPage() {
  const { token } = useAuth();
  const { addToast } = useToast();
  const router = useRouter();
  const params = useParams();
  const proposalId = params.proposalId as string;

  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('overview');

  const fetchProposal = useCallback(async () => {
    if (!token || !proposalId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/proposals/${proposalId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch proposal');
      const data: Proposal = await res.json();
      setProposal(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load proposal';
      setError(msg);
      addToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  }, [token, proposalId, addToast]);

  useEffect(() => { fetchProposal(); }, [fetchProposal]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl space-y-6">
        <DetailSkeleton />
      </div>
    );
  }

  if (error || !proposal) {
    return (
      <div className="mx-auto max-w-7xl">
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.07] backdrop-blur-xl p-12 text-center shadow-sm">
          <svg className="mx-auto h-12 w-12 text-white/30 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <p className="text-sm font-medium text-white/60">{error ?? 'Proposal not found'}</p>
          <div className="mt-4 flex items-center justify-center gap-3">
            <button type="button" onClick={fetchProposal} className="text-sm font-medium text-teal-300 hover:text-teal-300">
              Try again
            </button>
            <Link href="/tax-planning/proposals" className="text-sm text-white/50 hover:text-white/60">
              Back to proposals
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link href="/tax-planning/proposals" className="text-white/30 hover:text-white/50 transition-colors">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white">{proposal.clientName}</h1>
              <ProposalStatusBadge status={proposal.status} />
            </div>
            <p className="mt-0.5 text-sm text-white/50">
              {proposal.proposalType.replace(/_/g, ' ')} -- Created {formatDate(proposal.createdAt)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/tax-planning/proposals/new?resume=${proposal.proposalId}`}
            className="inline-flex items-center gap-2 rounded-lg border border-white/[0.10] bg-white/[0.07] backdrop-blur-xl px-4 py-2 text-sm font-medium text-white/60 hover:bg-white/[0.04] transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
            </svg>
            Edit
          </Link>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Assets in Scope"
          value={fmt.format((proposal.assetsInScope as number) / 100)}
          subtext={proposal.relationshipTier.replace(/_/g, ' ')}
        />
        <MetricCard
          label="Wizard Step"
          value={`${proposal.wizardStep}/6`}
          subtext={proposal.status === 'DRAFT' ? 'In progress' : 'Complete'}
        />
        <MetricCard
          label="Sections"
          value={`${proposal.sections.filter((s) => s.included).length}`}
          subtext={`of ${proposal.sections.length} total`}
        />
        <MetricCard
          label="Compliance"
          value={
            proposal.ipsGenerated && proposal.regBIGenerated
              ? 'Complete'
              : proposal.ipsGenerated || proposal.regBIGenerated
              ? 'Partial'
              : 'Pending'
          }
          subtext={`IPS: ${proposal.ipsGenerated ? 'Yes' : 'No'} | Reg BI: ${proposal.regBIGenerated ? 'Yes' : 'No'}`}
        />
      </div>

      {/* Tabs */}
      <div className="border-b border-white/[0.06]">
        <nav className="flex gap-6" aria-label="Proposal tabs">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`relative pb-3 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'text-teal-300'
                  : 'text-white/50 hover:text-white/60'
              }`}
            >
              {tab.label}
              {activeTab === tab.key && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-500 rounded-full" />
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.07] backdrop-blur-xl p-6 shadow-sm">
        {/* ---- Overview ---- */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-white">Proposal Overview</h2>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Key Details */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-white/60">Details</h3>
                <dl className="space-y-3">
                  {[
                    { label: 'Client', value: proposal.clientName },
                    { label: 'Proposal Type', value: proposal.proposalType.replace(/_/g, ' ') },
                    { label: 'Occasion', value: proposal.occasion.replace(/_/g, ' ') },
                    { label: 'Relationship Tier', value: proposal.relationshipTier.replace(/_/g, ' ') },
                    { label: 'Created', value: formatDateTime(proposal.createdAt) },
                    { label: 'Last Updated', value: formatDateTime(proposal.updatedAt) },
                    { label: 'Sent', value: formatDateTime(proposal.sentAt) },
                  ].map((item) => (
                    <div key={item.label} className="flex justify-between border-b border-limestone-100 pb-2 last:border-0">
                      <dt className="text-sm text-white/50">{item.label}</dt>
                      <dd className="text-sm font-medium text-white">{item.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>

              {/* Timeline */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-white/60">Timeline</h3>
                <div className="space-y-4">
                  {[
                    { label: 'Created', date: proposal.createdAt, done: true },
                    { label: 'Sent', date: proposal.sentAt, done: !!proposal.sentAt },
                    { label: 'Viewed', date: proposal.tracking?.firstOpenedAt, done: !!proposal.tracking?.firstOpenedAt },
                    { label: 'Outcome', date: proposal.tracking?.outcomeDate, done: !!proposal.tracking?.outcomeDate },
                  ].map((event, idx) => (
                    <div key={event.label} className="flex items-start gap-3">
                      <div className={`mt-0.5 flex h-6 w-6 items-center justify-center rounded-full ${
                        event.done ? 'bg-success-100' : 'bg-white/[0.06]'
                      }`}>
                        {event.done ? (
                          <svg className="h-3.5 w-3.5 text-success-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <span className="h-2 w-2 rounded-full bg-white/[0.10]" />
                        )}
                      </div>
                      <div>
                        <p className={`text-sm font-medium ${event.done ? 'text-white' : 'text-white/30'}`}>
                          {event.label}
                        </p>
                        <p className="text-xs text-white/50">
                          {event.date ? formatDateTime(event.date) : 'Pending'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Notes */}
                {proposal.notes && (
                  <div className="mt-4">
                    <h3 className="text-sm font-semibold text-white/60 mb-2">Notes</h3>
                    <p className="text-sm text-white/50 bg-transparent rounded-lg p-4">
                      {proposal.notes}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ---- Portfolio ---- */}
        {activeTab === 'portfolio' && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-white">Current Portfolio</h2>
            {proposal.currentPortfolio ? (
              <>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <MetricCard label="Total Value" value={fmt.format((proposal.currentPortfolio.totalValue as number) / 100)} />
                  <MetricCard label="Holdings" value={String(proposal.currentPortfolio.holdings.length)} />
                  <MetricCard label="Expense Ratio" value={fmtPct(proposal.currentPortfolio.metrics.weightedExpenseRatio)} />
                  <MetricCard label="Annual Cost" value={fmt.format((proposal.currentPortfolio.metrics.estimatedAnnualCost as number) / 100)} />
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-white/60 mb-3">Allocation</h3>
                  <AllocationBar
                    equity={proposal.currentPortfolio.metrics.equityPct}
                    fixedIncome={proposal.currentPortfolio.metrics.fixedIncomePct}
                    alternatives={proposal.currentPortfolio.metrics.alternativesPct}
                    cash={proposal.currentPortfolio.metrics.cashPct}
                    showLabels
                    height={32}
                  />
                </div>

                {/* Holdings Table */}
                <div>
                  <h3 className="text-sm font-semibold text-white/60 mb-3">
                    Holdings ({proposal.currentPortfolio.holdings.length})
                  </h3>
                  <div className="overflow-x-auto rounded-lg border border-white/[0.06]">
                    <table className="min-w-full text-sm">
                      <thead className="border-b border-white/[0.06] bg-transparent">
                        <tr>
                          {['Ticker', 'Description', 'Asset Class', 'Market Value', 'Cost Basis', 'Expense Ratio'].map((h) => (
                            <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-white/50">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-limestone-100">
                        {proposal.currentPortfolio.holdings.map((h, i) => (
                          <tr key={`${h.ticker}-${i}`} className="hover:bg-white/[0.04]">
                            <td className="px-4 py-2 font-mono font-semibold text-white">{h.ticker ?? '--'}</td>
                            <td className="px-4 py-2 text-white/60 truncate max-w-[200px]">{h.description}</td>
                            <td className="px-4 py-2 text-xs text-white/50">{h.assetClass.replace(/_/g, ' ')}</td>
                            <td className="px-4 py-2 text-right tabular-nums text-white/60">{fmt.format((h.marketValue as number) / 100)}</td>
                            <td className="px-4 py-2 text-right tabular-nums text-white/50">{h.costBasis ? fmt.format((h.costBasis as number) / 100) : '--'}</td>
                            <td className="px-4 py-2 text-right tabular-nums text-white/50">{h.expenseRatio != null ? fmtPct(h.expenseRatio) : '--'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : (
              <div className="py-12 text-center">
                <svg className="mx-auto h-12 w-12 text-white/30 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
                </svg>
                <p className="text-sm font-medium text-white/60">No portfolio data yet.</p>
                <p className="mt-1 text-sm text-white/50">Portfolio will be available after Step 2 of the wizard.</p>
              </div>
            )}
          </div>
        )}

        {/* ---- Risk ---- */}
        {activeTab === 'risk' && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-white">Risk Profile</h2>
            {proposal.riskProfile ? (
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* Gauges */}
                <div className="flex flex-col items-center gap-6 rounded-2xl border border-white/[0.06] bg-white/[0.07] backdrop-blur-xl p-6">
                  <RiskScoreGauge score={proposal.riskProfile.compositeScore} label={proposal.riskProfile.compositeLabel.replace(/_/g, ' ')} size="lg" />
                  <p className="text-xs text-white/50">Composite Risk Score</p>
                </div>

                {/* 3 Dimensions */}
                <div className="lg:col-span-2 grid grid-cols-3 gap-4">
                  <div className="rounded-2xl border border-white/[0.06] bg-white/[0.07] backdrop-blur-xl p-5 text-center">
                    <RiskScoreGauge score={proposal.riskProfile.behavioralScore} label="Behavioral" size="sm" />
                    <p className="mt-2 text-xs text-white/50">{proposal.riskProfile.behavioralLabel.replace(/_/g, ' ')}</p>
                  </div>
                  <div className="rounded-2xl border border-white/[0.06] bg-white/[0.07] backdrop-blur-xl p-5 text-center">
                    <RiskScoreGauge score={proposal.riskProfile.capacityScore} label="Capacity" size="sm" />
                    <p className="mt-2 text-xs text-white/30">Horizon: {proposal.riskProfile.capacityFactors.timeHorizon}yr</p>
                  </div>
                  <div className="rounded-2xl border border-white/[0.06] bg-white/[0.07] backdrop-blur-xl p-5 text-center">
                    <RiskScoreGauge score={proposal.riskProfile.requiredScore} label="Required" size="sm" />
                    <p className="mt-2 text-xs text-white/30">Return: {fmtPct(proposal.riskProfile.requiredReturn)}</p>
                  </div>
                </div>

                {/* Recommended Allocation */}
                <div className="lg:col-span-3">
                  <h3 className="text-sm font-semibold text-white/60 mb-3">Recommended Allocation</h3>
                  <AllocationBar
                    equity={proposal.riskProfile.recommendedAllocation.equity}
                    fixedIncome={proposal.riskProfile.recommendedAllocation.fixedIncome}
                    alternatives={proposal.riskProfile.recommendedAllocation.alternatives}
                    cash={proposal.riskProfile.recommendedAllocation.cash}
                    showLabels
                    height={32}
                  />
                </div>

                {/* Risk Gap */}
                <div className="lg:col-span-3 rounded-lg border border-white/[0.06] bg-transparent p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-white">Risk Gap Analysis</p>
                      <p className="mt-0.5 text-xs text-white/50">{proposal.riskProfile.riskGapLabel}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <p className="text-[10px] font-medium uppercase text-white/30">Current</p>
                        <p className="text-lg font-bold tabular-nums text-white/60">{proposal.riskProfile.currentPortfolioRisk}</p>
                      </div>
                      <svg className="h-5 w-5 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                      </svg>
                      <div className="text-center">
                        <p className="text-[10px] font-medium uppercase text-teal-300">Recommended</p>
                        <p className="text-lg font-bold tabular-nums text-teal-300">{proposal.riskProfile.compositeScore}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center">
                <p className="text-sm font-medium text-white/60">No risk profile yet.</p>
                <p className="mt-1 text-sm text-white/50">Risk profile will be available after Step 3 of the wizard.</p>
              </div>
            )}
          </div>
        )}

        {/* ---- Analysis ---- */}
        {activeTab === 'analysis' && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-white">Analysis</h2>
            {proposal.analytics.current || proposal.analytics.proposed ? (
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Analytics Comparison */}
                {proposal.analytics.current && proposal.analytics.proposed && (
                  <div className="lg:col-span-2 rounded-2xl border border-white/[0.06] bg-white/[0.07] backdrop-blur-xl p-5">
                    <h3 className="text-sm font-semibold text-white mb-4">Portfolio Comparison</h3>
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead>
                          <tr className="border-b border-white/[0.06]">
                            <th className="py-2 text-left text-xs font-semibold uppercase text-white/50">Metric</th>
                            <th className="py-2 text-right text-xs font-semibold uppercase text-white/50">Current</th>
                            <th className="py-2 text-right text-xs font-semibold uppercase text-teal-300">Proposed</th>
                            <th className="py-2 text-right text-xs font-semibold uppercase text-white/30">Difference</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-limestone-100">
                          {[
                            { label: 'Sharpe Ratio', c: proposal.analytics.current.sharpeRatio, p: proposal.analytics.proposed.sharpeRatio, fmt: (v: number) => v.toFixed(2) },
                            { label: 'Sortino Ratio', c: proposal.analytics.current.sortinoRatio, p: proposal.analytics.proposed.sortinoRatio, fmt: (v: number) => v.toFixed(2) },
                            { label: 'Max Drawdown', c: proposal.analytics.current.maxDrawdown, p: proposal.analytics.proposed.maxDrawdown, fmt: fmtPct },
                            { label: 'Std Deviation', c: proposal.analytics.current.standardDeviation, p: proposal.analytics.proposed.standardDeviation, fmt: fmtPct },
                            { label: 'Beta', c: proposal.analytics.current.beta, p: proposal.analytics.proposed.beta, fmt: (v: number) => v.toFixed(2) },
                            { label: 'Alpha', c: proposal.analytics.current.alpha, p: proposal.analytics.proposed.alpha, fmt: fmtPct },
                            { label: 'Dividend Yield', c: proposal.analytics.current.dividendYield, p: proposal.analytics.proposed.dividendYield, fmt: fmtPct },
                          ].map((row) => {
                            const diff = row.p - row.c;
                            return (
                              <tr key={row.label}>
                                <td className="py-2 text-white/60">{row.label}</td>
                                <td className="py-2 text-right tabular-nums text-white/50">{row.fmt(row.c)}</td>
                                <td className="py-2 text-right tabular-nums font-medium text-teal-300">{row.fmt(row.p)}</td>
                                <td className={`py-2 text-right tabular-nums font-medium ${diff >= 0 ? 'text-success-700' : 'text-critical-700'}`}>
                                  {diff >= 0 ? '+' : ''}{row.fmt(diff)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Stress Tests */}
                {proposal.stressTests.length > 0 && (
                  <div className="rounded-2xl border border-white/[0.06] bg-white/[0.07] backdrop-blur-xl p-5">
                    <h3 className="text-sm font-semibold text-white mb-4">Stress Tests</h3>
                    <div className="space-y-2">
                      {proposal.stressTests.map((test) => (
                        <div key={test.scenario} className="flex items-center justify-between py-2 border-b border-limestone-100 last:border-0">
                          <span className="text-xs text-white/60">{test.scenarioLabel}</span>
                          <div className="flex items-center gap-3">
                            <span className={`text-xs font-medium tabular-nums ${test.portfolioReturn < 0 ? 'text-critical-700' : 'text-success-700'}`}>
                              {fmtPct(test.portfolioReturn)}
                            </span>
                            <span className="text-[10px] text-white/30">{test.recoveryMonths}mo</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Fee Analysis */}
                {proposal.feeAnalysis && (
                  <div className="rounded-2xl border border-white/[0.06] bg-white/[0.07] backdrop-blur-xl p-5">
                    <h3 className="text-sm font-semibold text-white mb-4">Fee Analysis</h3>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="rounded-lg bg-transparent p-3 text-center">
                          <p className="text-[10px] font-medium uppercase text-white/30">Current All-In</p>
                          <p className="mt-1 text-lg font-bold tabular-nums text-white/60">{fmtPct(proposal.feeAnalysis.current.totalRate)}</p>
                          <p className="text-xs text-white/30">{fmt.format((proposal.feeAnalysis.current.totalDollars as number) / 100)}/yr</p>
                        </div>
                        <div className="rounded-lg bg-teal-500/10 p-3 text-center">
                          <p className="text-[10px] font-medium uppercase text-teal-300">Proposed All-In</p>
                          <p className="mt-1 text-lg font-bold tabular-nums text-teal-300">{fmtPct(proposal.feeAnalysis.proposed.totalRate)}</p>
                          <p className="text-xs text-teal-300">{fmt.format((proposal.feeAnalysis.proposed.totalDollars as number) / 100)}/yr</p>
                        </div>
                      </div>
                      <div className="rounded-lg border border-success-200 bg-success-50 px-4 py-3 text-center">
                        <p className="text-xs text-success-600">Annual Savings</p>
                        <p className="text-lg font-bold text-success-700 tabular-nums">
                          {fmt.format((proposal.feeAnalysis.annualSavings as number) / 100)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tax Transition */}
                {proposal.taxTransition && (
                  <div className="rounded-2xl border border-white/[0.06] bg-white/[0.07] backdrop-blur-xl p-5 lg:col-span-2">
                    <h3 className="text-sm font-semibold text-white mb-4">Tax Transition</h3>
                    <div className="rounded-lg bg-transparent p-4 mb-4">
                      <p className="text-sm font-medium text-white">
                        Recommended: {proposal.taxTransition.recommendedStrategy.replace(/_/g, ' ')}
                      </p>
                      <p className="mt-1 text-xs text-white/50">{proposal.taxTransition.recommendationRationale}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                      <div className="text-center">
                        <p className="text-[10px] font-medium uppercase text-white/30">Cost Basis</p>
                        <p className="mt-0.5 text-sm font-bold tabular-nums text-white/60">{fmt.format((proposal.taxTransition.totalCostBasis as number) / 100)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] font-medium uppercase text-white/30">Market Value</p>
                        <p className="mt-0.5 text-sm font-bold tabular-nums text-white/60">{fmt.format((proposal.taxTransition.currentMarketValue as number) / 100)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] font-medium uppercase text-white/30">Unrealized Gains</p>
                        <p className="mt-0.5 text-sm font-bold tabular-nums text-success-700">{fmt.format((proposal.taxTransition.totalUnrealizedGain as number) / 100)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] font-medium uppercase text-white/30">Unrealized Losses</p>
                        <p className="mt-0.5 text-sm font-bold tabular-nums text-critical-700">{fmt.format((proposal.taxTransition.totalUnrealizedLoss as number) / 100)}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-12 text-center">
                <p className="text-sm font-medium text-white/60">No analysis data yet.</p>
                <p className="mt-1 text-sm text-white/50">Analysis will be available after Step 5 of the wizard.</p>
              </div>
            )}
          </div>
        )}

        {/* ---- Output ---- */}
        {activeTab === 'output' && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-white">Output</h2>

            {/* Sections List */}
            <div>
              <h3 className="text-sm font-semibold text-white/60 mb-3">Included Sections</h3>
              <div className="space-y-2">
                {proposal.sections
                  .filter((s) => s.included)
                  .sort((a, b) => a.order - b.order)
                  .map((section) => (
                    <div
                      key={section.key}
                      className="flex items-center justify-between rounded-2xl border border-white/[0.06] bg-white/[0.07] backdrop-blur-xl px-4 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex h-6 w-6 items-center justify-center rounded bg-white/[0.06] text-xs font-semibold text-white/50 tabular-nums">
                          {section.order}
                        </span>
                        <span className="text-sm font-medium text-white">{section.label}</span>
                        {section.required && (
                          <span className="rounded bg-white/[0.06] px-1.5 py-0.5 text-[10px] font-semibold uppercase text-white/30">
                            Required
                          </span>
                        )}
                      </div>
                      <svg className="h-4 w-4 text-success-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  ))}
              </div>
            </div>

            {/* Compliance Status */}
            <div>
              <h3 className="text-sm font-semibold text-white/60 mb-3">Compliance Status</h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className={`rounded-lg border p-4 ${
                  proposal.ipsGenerated
                    ? 'border-success-200 bg-success-50'
                    : 'border-warning-200 bg-warning-50'
                }`}>
                  <div className="flex items-center gap-2">
                    {proposal.ipsGenerated ? (
                      <svg className="h-5 w-5 text-success-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5 text-warning-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                      </svg>
                    )}
                    <span className={`text-sm font-medium ${proposal.ipsGenerated ? 'text-success-700' : 'text-warning-700'}`}>
                      Investment Policy Statement
                    </span>
                  </div>
                  <p className="mt-1 ml-7 text-xs text-white/50">
                    {proposal.ipsGenerated ? 'Generated and ready' : 'Not yet generated'}
                  </p>
                </div>
                <div className={`rounded-lg border p-4 ${
                  proposal.regBIGenerated
                    ? 'border-success-200 bg-success-50'
                    : 'border-warning-200 bg-warning-50'
                }`}>
                  <div className="flex items-center gap-2">
                    {proposal.regBIGenerated ? (
                      <svg className="h-5 w-5 text-success-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5 text-warning-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                      </svg>
                    )}
                    <span className={`text-sm font-medium ${proposal.regBIGenerated ? 'text-success-700' : 'text-warning-700'}`}>
                      Reg BI Disclosure
                    </span>
                  </div>
                  <p className="mt-1 ml-7 text-xs text-white/50">
                    {proposal.regBIGenerated ? 'Generated and ready' : 'Not yet generated'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ---- Tracking ---- */}
        {activeTab === 'tracking' && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-white">Tracking</h2>
            {proposal.tracking ? (
              <div className="space-y-6">
                {/* Delivery Info */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <MetricCard label="Delivery Method" value={proposal.tracking.deliveryMethod.replace(/_/g, ' ')} />
                  <MetricCard label="Sent To" value={proposal.tracking.sentTo.join(', ') || '--'} />
                  <MetricCard label="Total Opens" value={String(proposal.tracking.totalOpenCount)} />
                </div>

                {/* Open Events */}
                {proposal.tracking.opens.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-white/60 mb-3">View Events</h3>
                    <div className="overflow-x-auto rounded-lg border border-white/[0.06]">
                      <table className="min-w-full text-sm">
                        <thead className="border-b border-white/[0.06] bg-transparent">
                          <tr>
                            <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase text-white/50">Opened At</th>
                            <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase text-white/50">Duration</th>
                            <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase text-white/50">Pages Viewed</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-limestone-100">
                          {proposal.tracking.opens.map((open, i) => (
                            <tr key={i} className="hover:bg-white/[0.04]">
                              <td className="px-4 py-2 text-white/60">{formatDateTime(open.openedAt)}</td>
                              <td className="px-4 py-2 text-white/50 tabular-nums">
                                {Math.round(open.durationMs / 1000)}s
                              </td>
                              <td className="px-4 py-2 text-white/50 tabular-nums">
                                {open.pagesViewed.length} pages
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Outcome */}
                <div className="rounded-lg border border-white/[0.06] bg-transparent p-5">
                  <h3 className="text-sm font-semibold text-white mb-3">Outcome</h3>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div>
                      <p className="text-xs text-white/50">Status</p>
                      <p className={`mt-0.5 text-sm font-semibold ${
                        proposal.tracking.outcome === 'ACCEPTED' ? 'text-success-700' :
                        proposal.tracking.outcome === 'DECLINED' ? 'text-critical-700' :
                        'text-white/60'
                      }`}>
                        {proposal.tracking.outcome.replace(/_/g, ' ')}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-white/50">Date</p>
                      <p className="mt-0.5 text-sm font-medium text-white/60">
                        {formatDate(proposal.tracking.outcomeDate)}
                      </p>
                    </div>
                    {proposal.tracking.aumWon && (
                      <div>
                        <p className="text-xs text-white/50">AUM Won</p>
                        <p className="mt-0.5 text-sm font-bold text-success-700 tabular-nums">
                          {fmt.format((proposal.tracking.aumWon as number) / 100)}
                        </p>
                      </div>
                    )}
                  </div>
                  {proposal.tracking.declineReason && (
                    <div className="mt-3">
                      <p className="text-xs text-white/50">Decline Reason</p>
                      <p className="mt-0.5 text-sm text-white/50">{proposal.tracking.declineReason}</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="py-12 text-center">
                <svg className="mx-auto h-12 w-12 text-white/30 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                </svg>
                <p className="text-sm font-medium text-white/60">No tracking data yet.</p>
                <p className="mt-1 text-sm text-white/50">Tracking begins after the proposal is sent to the client.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
