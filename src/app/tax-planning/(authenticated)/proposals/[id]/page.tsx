'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth, useToast } from '@/lib/tax-planning/auth-context';
import type {
  Proposal,
  ProposalStatus,
  PortfolioAnalytics,
  FeeAnalysis,
  TaxTransitionAnalysis,
  StressTestResult,
  StressScenario,
} from '@/lib/proposal-engine/types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

type DetailTab = 'overview' | 'analysis' | 'tracking' | 'compliance';

const STATUS_COLORS: Record<ProposalStatus, string> = {
  DRAFT: 'bg-limestone-100 text-charcoal-700',
  READY: 'bg-brand-100 text-brand-700',
  REVIEW: 'bg-info-100 text-info-700',
  APPROVED: 'bg-brand-100 text-brand-700',
  SENT: 'bg-warning-100 text-warning-700',
  VIEWED: 'bg-purple-100 text-purple-700',
  ACCEPTED: 'bg-success-100 text-success-700',
  DECLINED: 'bg-critical-100 text-critical-700',
  EXPIRED: 'bg-limestone-100 text-charcoal-500',
};

const STRESS_SCENARIOS: Array<{ id: StressScenario; name: string }> = [
  { id: '2008_FINANCIAL_CRISIS', name: '2008 Financial Crisis' },
  { id: 'COVID_2020', name: 'COVID-19 Crash' },
  { id: '2022_RATE_SHOCK', name: '2022 Rate Shock' },
  { id: '2000_DOTCOM', name: 'Dot-Com Bust' },
];

const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const fmtPct = (n: number) => (n * 100).toFixed(1) + '%';

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: ProposalStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[status] || 'bg-limestone-100 text-charcoal-700'}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-64 rounded bg-limestone-200" />
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-lg bg-limestone-200" />
        ))}
      </div>
      <div className="h-48 rounded-lg bg-limestone-200" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Proposal Detail Page
// ---------------------------------------------------------------------------

export default function ProposalDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { token } = useAuth();
  const { addToast } = useToast();
  const proposalId = params.id as string;

  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<DetailTab>('overview');
  const [activeScenario, setActiveScenario] = useState<StressScenario>('2008_FINANCIAL_CRISIS');

  const fetchProposal = useCallback(async () => {
    if (!token || !proposalId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/proposals/' + proposalId, {
        headers: { Authorization: 'Bearer ' + token },
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

  const handleSend = async () => {
    if (!token || !proposalId) return;
    try {
      const res = await fetch('/api/v1/proposals/' + proposalId + '/send', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token },
      });
      if (!res.ok) throw new Error('Failed to send');
      addToast('Proposal sent to client', 'success');
      fetchProposal();
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Send failed', 'error');
    }
  };

  const handleDuplicate = async () => {
    if (!token || !proposalId) return;
    try {
      const res = await fetch('/api/v1/proposals/' + proposalId + '/duplicate', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token },
      });
      if (!res.ok) throw new Error('Failed to duplicate');
      const data = await res.json();
      addToast('Proposal duplicated', 'success');
      router.push('/tax-planning/proposals/' + data.proposalId);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Duplicate failed', 'error');
    }
  };

  const handleArchive = async () => {
    if (!token || !proposalId) return;
    try {
      const res = await fetch('/api/v1/proposals/' + proposalId, {
        method: 'DELETE',
        headers: { Authorization: 'Bearer ' + token },
      });
      if (!res.ok) throw new Error('Failed to archive');
      addToast('Proposal archived', 'success');
      router.push('/tax-planning/proposals');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Archive failed', 'error');
    }
  };

  const formatDate = (iso?: string | null) => {
    if (!iso) return '--';
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (loading) return <div className="mx-auto max-w-5xl"><LoadingSkeleton /></div>;
  if (error) {
    return (
      <div className="mx-auto max-w-5xl text-center py-12">
        <p className="text-sm text-critical-700">{error}</p>
        <button type="button" onClick={fetchProposal} className="mt-3 text-sm font-medium text-brand-700 hover:text-brand-600">Try again</button>
      </div>
    );
  }
  if (!proposal) return null;

  const analytics = proposal.analytics;
  const feeAnalysis = proposal.feeAnalysis;
  const taxTransition = proposal.taxTransition;
  const stressTests = proposal.stressTests || [];
  const tracking = proposal.tracking;
  const currentPortfolio = proposal.currentPortfolio;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm">
        <Link href="/tax-planning/proposals" className="text-charcoal-500 hover:text-charcoal-700">Proposals</Link>
        <svg className="h-4 w-4 text-charcoal-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
        <span className="font-medium text-charcoal-900">{proposal.clientName}</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-charcoal-900">{proposal.clientName}</h1>
            <StatusBadge status={proposal.status} />
          </div>
          <p className="text-sm text-charcoal-500">
            {proposal.title || 'Portfolio Proposal'} &middot; Created {formatDate(proposal.createdAt)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => router.push('/tax-planning/proposals/new?edit=' + proposalId)} className="rounded-lg border border-limestone-300 px-3 py-2 text-sm font-medium text-charcoal-700 hover:bg-limestone-50">Edit</button>
          <button type="button" onClick={handleSend} className="rounded-lg bg-brand-700 px-3 py-2 text-sm font-medium text-white hover:bg-brand-600">Send</button>
          <button type="button" onClick={handleDuplicate} className="rounded-lg border border-limestone-300 px-3 py-2 text-sm font-medium text-charcoal-700 hover:bg-limestone-50">Duplicate</button>
          <button type="button" onClick={() => addToast('Downloading PDF...', 'info')} className="rounded-lg border border-limestone-300 px-3 py-2 text-sm font-medium text-charcoal-700 hover:bg-limestone-50">Download PDF</button>
          <button type="button" onClick={handleArchive} className="rounded-lg border border-critical-200 px-3 py-2 text-sm font-medium text-critical-700 hover:bg-critical-50">Archive</button>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="flex border-b border-limestone-200">
        {(['overview', 'analysis', 'tracking', 'compliance'] as DetailTab[]).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px capitalize ${
              activeTab === tab
                ? 'border-brand-700 text-brand-700'
                : 'border-transparent text-charcoal-500 hover:text-charcoal-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ================================================================== */}
      {/* Overview Tab */}
      {/* ================================================================== */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="rounded-lg border border-limestone-200 bg-white p-4 shadow-sm">
              <p className="text-xs text-charcoal-500">Client</p>
              <p className="text-sm font-semibold text-charcoal-900 mt-1">{proposal.clientName}</p>
            </div>
            <div className="rounded-lg border border-limestone-200 bg-white p-4 shadow-sm">
              <p className="text-xs text-charcoal-500">Current AUM</p>
              <p className="text-sm font-semibold text-charcoal-900 mt-1 tabular-nums">
                {proposal.currentPortfolioValue != null ? fmt.format((proposal.currentPortfolioValue as number) / 100) : '--'}
              </p>
            </div>
            <div className="rounded-lg border border-limestone-200 bg-white p-4 shadow-sm">
              <p className="text-xs text-charcoal-500">Risk Score</p>
              <p className="text-sm font-semibold text-charcoal-900 mt-1">{proposal.riskProfile?.compositeScore ?? '--'}</p>
            </div>
            <div className="rounded-lg border border-limestone-200 bg-white p-4 shadow-sm">
              <p className="text-xs text-charcoal-500">Selected Model</p>
              <p className="text-sm font-semibold text-charcoal-900 mt-1">{proposal.proposedModel?.name || '--'}</p>
            </div>
          </div>

          {/* Allocation comparison */}
          <div className="rounded-lg border border-limestone-200 bg-white p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-charcoal-900 mb-4">Current vs Proposed Allocation</h3>
            {analytics?.current && analytics?.proposed ? (
              <div className="space-y-4">
                {(['sectorAllocation'] as const).map(() => {
                  const currentAlloc = analytics.current?.sectorAllocation || {};
                  const proposedAlloc = analytics.proposed?.sectorAllocation || {};
                  const allSectors = [...new Set([...Object.keys(currentAlloc), ...Object.keys(proposedAlloc)])].slice(0, 6);
                  return allSectors.map((sector) => {
                    const currentVal = currentAlloc[sector] ?? 0;
                    const proposedVal = proposedAlloc[sector] ?? 0;
                    return (
                      <div key={sector}>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-charcoal-700 font-medium">{sector}</span>
                          <span className="text-charcoal-500">{currentVal.toFixed(1)}% / {proposedVal.toFixed(1)}%</span>
                        </div>
                        <div className="flex gap-1">
                          <div className="flex-1">
                            <div className="h-3 w-full rounded-full bg-limestone-100">
                              <div className="h-3 rounded-full bg-brand-700 opacity-60" style={{ width: currentVal + '%' }} />
                            </div>
                          </div>
                          <div className="flex-1">
                            <div className="h-3 w-full rounded-full bg-limestone-100">
                              <div className="h-3 rounded-full bg-brand-700" style={{ width: proposedVal + '%' }} />
                            </div>
                          </div>
                        </div>
                        <div className="flex justify-between text-[10px] text-charcoal-400 mt-0.5">
                          <span>Current</span>
                          <span>Proposed</span>
                        </div>
                      </div>
                    );
                  });
                })}
              </div>
            ) : (
              <p className="text-sm text-charcoal-400">No analytics data available.</p>
            )}
          </div>

          {/* Key metrics */}
          {analytics && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="rounded-lg bg-limestone-50 p-4">
                <p className="text-xs text-charcoal-500">Current Holdings</p>
                <p className="text-lg font-bold text-charcoal-900">{currentPortfolio?.holdings?.length ?? '--'}</p>
              </div>
              <div className="rounded-lg bg-limestone-50 p-4">
                <p className="text-xs text-charcoal-500">Proposed Model</p>
                <p className="text-lg font-bold text-charcoal-900">{proposal.proposedModel?.name || '--'}</p>
              </div>
              <div className="rounded-lg bg-limestone-50 p-4">
                <p className="text-xs text-charcoal-500">Sharpe (Current)</p>
                <p className="text-lg font-bold text-charcoal-900">{analytics.current?.sharpeRatio?.toFixed(2) ?? '--'}</p>
              </div>
              <div className="rounded-lg bg-limestone-50 p-4">
                <p className="text-xs text-charcoal-500">Sharpe (Proposed)</p>
                <p className="text-lg font-bold text-success-700">{analytics.proposed?.sharpeRatio?.toFixed(2) ?? '--'}</p>
              </div>
            </div>
          )}

          {/* Quality Flags */}
          {currentPortfolio?.qualityFlags && currentPortfolio.qualityFlags.length > 0 && (
            <div className="rounded-lg border border-limestone-200 bg-white p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-charcoal-900 mb-3">Quality Flags</h3>
              <div className="space-y-2">
                {currentPortfolio.qualityFlags.map((flag, idx) => (
                  <div key={idx} className="flex items-start gap-2 rounded-md bg-warning-50 border border-warning-200 p-3">
                    <svg className="h-4 w-4 text-warning-600 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
                    </svg>
                    <div>
                      <p className="text-xs font-medium text-warning-800">{flag.title || flag.category}</p>
                      <p className="text-xs text-warning-700">{flag.message || flag.description || ''}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================================================================== */}
      {/* Analysis Tab */}
      {/* ================================================================== */}
      {activeTab === 'analysis' && (
        <div className="space-y-6">
          {/* Side-by-side */}
          <div className="rounded-lg border border-limestone-200 bg-white shadow-sm overflow-hidden">
            <div className="bg-limestone-50 px-6 py-3 border-b border-limestone-200">
              <h3 className="text-sm font-semibold text-charcoal-900">Side-by-Side Comparison</h3>
            </div>
            <div className="grid grid-cols-2 divide-x divide-limestone-200 p-6">
              {analytics ? (
                <>
                  <div className="pr-6 space-y-2">
                    <h4 className="text-xs font-semibold uppercase text-charcoal-500">Current</h4>
                    <div className="flex justify-between text-sm"><span className="text-charcoal-500">Sharpe Ratio</span><span className="font-medium">{analytics.current?.sharpeRatio?.toFixed(2) ?? '--'}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-charcoal-500">Max Drawdown</span><span className="font-medium">{analytics.current?.maxDrawdown != null ? fmtPct(analytics.current.maxDrawdown) : '--'}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-charcoal-500">Std. Deviation</span><span className="font-medium">{analytics.current?.standardDeviation != null ? fmtPct(analytics.current.standardDeviation) : '--'}</span></div>
                  </div>
                  <div className="pl-6 space-y-2">
                    <h4 className="text-xs font-semibold uppercase text-charcoal-500">Proposed</h4>
                    <div className="flex justify-between text-sm"><span className="text-charcoal-500">Sharpe Ratio</span><span className="font-medium">{analytics.proposed?.sharpeRatio?.toFixed(2) ?? '--'}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-charcoal-500">Max Drawdown</span><span className="font-medium">{analytics.proposed?.maxDrawdown != null ? fmtPct(analytics.proposed.maxDrawdown) : '--'}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-charcoal-500">Std. Deviation</span><span className="font-medium">{analytics.proposed?.standardDeviation != null ? fmtPct(analytics.proposed.standardDeviation) : '--'}</span></div>
                  </div>
                </>
              ) : (
                <p className="col-span-2 text-sm text-charcoal-400 text-center py-4">No analytics available</p>
              )}
            </div>
          </div>

          {/* Stress tests */}
          <div className="rounded-lg border border-limestone-200 bg-white shadow-sm overflow-hidden">
            <div className="bg-limestone-50 px-6 py-3 border-b border-limestone-200">
              <h3 className="text-sm font-semibold text-charcoal-900">Stress Testing</h3>
            </div>
            <div className="p-6">
              <div className="flex flex-wrap gap-2 mb-4">
                {STRESS_SCENARIOS.map((sc) => (
                  <button
                    key={sc.id}
                    type="button"
                    onClick={() => setActiveScenario(sc.id)}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                      activeScenario === sc.id ? 'bg-brand-700 text-white' : 'bg-limestone-100 text-charcoal-700 hover:bg-limestone-200'
                    }`}
                  >
                    {sc.name}
                  </button>
                ))}
              </div>
              {stressTests.length > 0 ? (
                (() => {
                  const result = stressTests.find((r) => r.scenario === activeScenario);
                  if (!result) return <p className="text-sm text-charcoal-400">No data for this scenario</p>;
                  return (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="rounded-lg bg-limestone-50 p-3 text-center">
                        <p className="text-xs text-charcoal-500">Portfolio Return</p>
                        <p className="text-sm font-bold text-critical-700">{fmtPct(result.portfolioReturn)}</p>
                      </div>
                      <div className="rounded-lg bg-limestone-50 p-3 text-center">
                        <p className="text-xs text-charcoal-500">Benchmark Return</p>
                        <p className="text-sm font-bold text-charcoal-900">{fmtPct(result.benchmarkReturn)}</p>
                      </div>
                      <div className="rounded-lg bg-critical-50 p-3 text-center">
                        <p className="text-xs text-charcoal-500">Max Drawdown</p>
                        <p className="text-sm font-bold text-critical-700">{fmtPct(result.maxDrawdown)}</p>
                      </div>
                      <div className="rounded-lg bg-limestone-50 p-3 text-center">
                        <p className="text-xs text-charcoal-500">Recovery (months)</p>
                        <p className="text-sm font-bold text-charcoal-900">{result.recoveryMonths}</p>
                      </div>
                    </div>
                  );
                })()
              ) : (
                <p className="text-sm text-charcoal-400">No stress test data available.</p>
              )}
            </div>
          </div>

          {/* Fee analysis */}
          <div className="rounded-lg border border-limestone-200 bg-white shadow-sm overflow-hidden">
            <div className="bg-limestone-50 px-6 py-3 border-b border-limestone-200">
              <h3 className="text-sm font-semibold text-charcoal-900">Fee Analysis</h3>
            </div>
            <div className="p-6">
              {feeAnalysis ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-charcoal-500">Current All-In Fees</p>
                      <p className="text-lg font-bold text-charcoal-900">{fmt.format((feeAnalysis.current.totalDollars as number) / 100)}/yr</p>
                    </div>
                    <div>
                      <p className="text-xs text-charcoal-500">Proposed All-In Fees</p>
                      <p className="text-lg font-bold text-success-700">{fmt.format((feeAnalysis.proposed.totalDollars as number) / 100)}/yr</p>
                    </div>
                    <div>
                      <p className="text-xs text-charcoal-500">Annual Savings</p>
                      <p className="text-lg font-bold text-success-700">{fmt.format((feeAnalysis.annualSavings as number) / 100)}/yr</p>
                    </div>
                  </div>
                  {feeAnalysis.compoundingImpact.length > 0 && (
                    <div className="rounded-lg bg-success-50 p-4 border border-success-200">
                      <p className="text-sm font-medium text-success-700">
                        {feeAnalysis.compoundingImpact.length > 0
                          ? '10-year compounded savings: ' + fmt.format((feeAnalysis.compoundingImpact[feeAnalysis.compoundingImpact.length - 1]?.difference as number) / 100)
                          : ''}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-charcoal-400">No fee analysis available.</p>
              )}
            </div>
          </div>

          {/* Tax transition */}
          <div className="rounded-lg border border-limestone-200 bg-white shadow-sm overflow-hidden">
            <div className="bg-limestone-50 px-6 py-3 border-b border-limestone-200">
              <h3 className="text-sm font-semibold text-charcoal-900">Tax Transition</h3>
            </div>
            <div className="p-6">
              {taxTransition ? (
                <div className="space-y-3">
                  <div className="rounded-lg bg-brand-50 p-3 border border-brand-200">
                    <p className="text-sm font-medium text-brand-700">
                      Recommended: {taxTransition.strategies.find((s) => s.strategy === taxTransition.recommendedStrategy)?.strategyName || taxTransition.strategies.find((s) => s.strategy === taxTransition.recommendedStrategy)?.label || taxTransition.recommendedStrategy}
                    </p>
                    {taxTransition.recommendationRationale && (
                      <p className="text-xs text-brand-600 mt-1">{taxTransition.recommendationRationale}</p>
                    )}
                  </div>
                  {taxTransition.strategies.map((s) => (
                    <div key={String(s.strategy)} className="flex items-center justify-between rounded-lg border border-limestone-200 p-3">
                      <span className="text-sm text-charcoal-900">{s.strategyName || s.label || String(s.strategy)}</span>
                      <span className="text-sm font-medium text-charcoal-700">{fmt.format(s.estimatedTaxCost / 100)} tax cost</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-charcoal-400">No tax transition data available.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* Tracking Tab */}
      {/* ================================================================== */}
      {activeTab === 'tracking' && (
        <div className="space-y-6">
          {/* Timeline */}
          <div className="rounded-lg border border-limestone-200 bg-white p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-charcoal-900 mb-4">Activity Timeline</h3>
            <div className="space-y-4">
              {[
                { label: 'Created', date: proposal.createdAt, completed: true },
                { label: 'Sent', date: proposal.sentAt || tracking?.sentAt, completed: !!(proposal.sentAt || tracking?.sentAt) },
                { label: 'First Viewed', date: proposal.viewedAt || tracking?.firstOpenedAt, completed: !!(proposal.viewedAt || tracking?.firstOpenedAt) },
                { label: 'Client Response', date: tracking?.outcomeDate, completed: !!tracking?.outcomeDate },
              ].map((event) => (
                <div key={event.label} className="flex items-start gap-3">
                  <div className={`mt-0.5 flex h-6 w-6 items-center justify-center rounded-full flex-shrink-0 ${
                    event.completed ? 'bg-success-100' : 'bg-limestone-100'
                  }`}>
                    {event.completed ? (
                      <svg className="h-3.5 w-3.5 text-success-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    ) : (
                      <div className="h-2 w-2 rounded-full bg-limestone-300" />
                    )}
                  </div>
                  <div>
                    <p className={`text-sm font-medium ${event.completed ? 'text-charcoal-900' : 'text-charcoal-400'}`}>{event.label}</p>
                    <p className="text-xs text-charcoal-500">{event.date ? formatDate(event.date) : 'Pending'}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* View metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-lg border border-limestone-200 bg-white p-4 shadow-sm">
              <p className="text-xs text-charcoal-500">View Count</p>
              <p className="text-2xl font-bold text-charcoal-900 mt-1">{tracking?.totalOpenCount ?? '--'}</p>
              <p className="text-xs text-charcoal-400 mt-0.5">Times opened by client</p>
            </div>
            <div className="rounded-lg border border-limestone-200 bg-white p-4 shadow-sm">
              <p className="text-xs text-charcoal-500">Delivery Method</p>
              <p className="text-2xl font-bold text-charcoal-900 mt-1">{tracking?.deliveryMethod?.replace(/_/g, ' ') ?? '--'}</p>
              <p className="text-xs text-charcoal-400 mt-0.5">How proposal was delivered</p>
            </div>
            <div className="rounded-lg border border-limestone-200 bg-white p-4 shadow-sm">
              <p className="text-xs text-charcoal-500">Most Viewed Section</p>
              <p className="text-2xl font-bold text-charcoal-900 mt-1">{tracking?.mostViewedSection ?? '--'}</p>
              <p className="text-xs text-charcoal-400 mt-0.5">Client focused area</p>
            </div>
          </div>

          {/* Outcome */}
          <div className="rounded-lg border border-limestone-200 bg-white p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-charcoal-900 mb-3">Outcome</h3>
            <StatusBadge status={proposal.status} />
            {tracking?.outcome && tracking.outcome !== 'PENDING' && (
              <p className="text-sm text-charcoal-500 mt-2">
                Outcome: {tracking.outcome} on {formatDate(tracking.outcomeDate)}
                {tracking.aumWon != null && ' - AUM won: ' + fmt.format((tracking.aumWon as number) / 100)}
              </p>
            )}
            {tracking?.declineReason && (
              <p className="text-sm text-charcoal-500 mt-1">Reason: {tracking.declineReason}</p>
            )}
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* Compliance Tab */}
      {/* ================================================================== */}
      {activeTab === 'compliance' && (
        <div className="space-y-6">
          <div className="rounded-lg border border-limestone-200 bg-white p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-charcoal-900 mb-4">Compliance Documents</h3>
            <div className="space-y-3">
              {/* IPS */}
              <div className="flex items-center justify-between rounded-lg border border-limestone-200 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded bg-info-100">
                    <svg className="h-4 w-4 text-info-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-charcoal-900">Investment Policy Statement (IPS)</p>
                    <p className="text-xs text-charcoal-500">Auto-generated from risk profile and model selection</p>
                  </div>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  proposal.ipsGenerated ? 'bg-success-100 text-success-700' : 'bg-limestone-100 text-charcoal-500'
                }`}>
                  {proposal.ipsGenerated ? 'Generated' : 'Not Generated'}
                </span>
              </div>

              {/* Reg BI */}
              <div className="flex items-center justify-between rounded-lg border border-limestone-200 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded bg-warning-100">
                    <svg className="h-4 w-4 text-warning-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-charcoal-900">Reg BI Documentation</p>
                    <p className="text-xs text-charcoal-500">Best interest obligation documentation</p>
                  </div>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  proposal.regBIGenerated ? 'bg-success-100 text-success-700' : 'bg-limestone-100 text-charcoal-500'
                }`}>
                  {proposal.regBIGenerated ? 'Generated' : 'Pending'}
                </span>
              </div>

              {/* Disclosure checklist */}
              <div className="flex items-center justify-between rounded-lg border border-limestone-200 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded bg-success-100">
                    <svg className="h-4 w-4 text-success-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-charcoal-900">Disclosure Checklist</p>
                    <p className="text-xs text-charcoal-500">Required disclosures included in proposal</p>
                  </div>
                </div>
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-success-100 text-success-700">
                  Complete
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
