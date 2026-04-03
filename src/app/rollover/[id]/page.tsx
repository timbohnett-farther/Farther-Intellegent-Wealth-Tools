'use client';

import React, { useState, useEffect, useContext, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AuthContext, ToastContext } from '@/lib/tax-planning/auth-context';
import type { RolloverAnalysis, RolloverScore } from '@/lib/rollover-engine/types';
import { StatusBadge, TierBadge } from '@/components/rollover/StatusBadge';
import { ScoreGauge } from '@/components/rollover/ScoreGauge';
import { FactorBreakdownGrid } from '@/components/rollover/FactorBreakdownGrid';
import { BenchmarkChart } from '@/components/rollover/BenchmarkChart';

export default function AnalysisDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { token } = useContext(AuthContext);
  const { addToast } = useContext(ToastContext);

  const [analysis, setAnalysis] = useState<RolloverAnalysis | null>(null);
  const [score, setScore] = useState<RolloverScore | null>(null);
  const [loading, setLoading] = useState(true);
  const [scoring, setScoring] = useState(false);

  const fetchAnalysis = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/rollover/analyses/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Not found');
      const data = await res.json();
      setAnalysis(data);

      // Also fetch score if it exists
      if (data.score_id) {
        const scoreRes = await fetch(`/api/v1/rollover/analyses/${id}/score`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (scoreRes.ok) {
          setScore(await scoreRes.json());
        }
      }
    } catch {
      addToast('Analysis not found.', 'error');
      router.push('/rollover');
    } finally {
      setLoading(false);
    }
  }, [id, token, router, addToast]);

  useEffect(() => {
    fetchAnalysis();
  }, [fetchAnalysis]);

  async function handleScore() {
    if (!token) return;
    setScoring(true);
    try {
      const res = await fetch(`/api/v1/rollover/analyses/${id}/score`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const scoreData = await res.json();
        setScore(scoreData);
        addToast(`Scored: ${scoreData.composite_score}/100 — ${scoreData.recommendation_tier.replace(/_/g, ' ')}`, 'success');
        // Refresh analysis to get updated status
        fetchAnalysis();
      } else {
        const err = await res.json();
        addToast(err.error?.message ?? 'Scoring failed.', 'error');
      }
    } catch {
      addToast('Scoring failed. Please try again.', 'error');
    } finally {
      setScoring(false);
    }
  }

  function formatDollars(cents: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(cents / 100);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent-primary border-t-transparent" />
      </div>
    );
  }

  if (!analysis) return null;

  // Extract fee data from score for benchmark chart
  const feeFactorData = score?.factor_scores.find((f) => f.factor_name === 'FEE_COMPARISON')?.data_points as
    | { plan_fee_bps?: number; farther_fee_bps?: number; peer_median_bps?: number; plan_percentile?: number } | undefined;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link
            href="/rollover"
            className="mb-2 flex items-center gap-1 text-sm text-text-muted hover:text-text"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            Back to Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-text">{analysis.client_name}</h1>
          <p className="text-sm text-text-muted">
            {analysis.plan_name} &middot; EIN: {analysis.plan_ein}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {analysis.recommendation_tier && <TierBadge tier={analysis.recommendation_tier} />}
          <StatusBadge status={analysis.status} />
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border p-4" style={{ background: 'var(--s-card-bg)', borderColor: 'var(--s-border-subtle)' }}>
          <p className="text-xs font-medium text-text-muted">Account Balance</p>
          <p className="mt-1 text-xl font-bold text-text">{formatDollars(analysis.participant_balance_cents)}</p>
        </div>
        <div className="rounded-lg border p-4" style={{ background: 'var(--s-card-bg)', borderColor: 'var(--s-border-subtle)' }}>
          <p className="text-xs font-medium text-text-muted">Participant Age</p>
          <p className="mt-1 text-xl font-bold text-text">{analysis.participant_age}</p>
        </div>
        <div className="rounded-lg border p-4" style={{ background: 'var(--s-card-bg)', borderColor: 'var(--s-border-subtle)' }}>
          <p className="text-xs font-medium text-text-muted">Years of Service</p>
          <p className="mt-1 text-xl font-bold text-text">{analysis.years_of_service}</p>
        </div>
        <div className="rounded-lg border p-4" style={{ background: 'var(--s-card-bg)', borderColor: 'var(--s-border-subtle)' }}>
          <p className="text-xs font-medium text-text-muted">RRS Score</p>
          <p className="mt-1 text-xl font-bold text-text">
            {analysis.composite_score ?? '—'}
          </p>
          <p className="text-xs text-text-faint">
            {analysis.recommendation_tier?.replace(/_/g, ' ') ?? 'Not yet scored'}
          </p>
        </div>
      </div>

      {/* Score Section */}
      {score ? (
        <div className="space-y-6">
          {/* Score Overview */}
          <div
            className="rounded-lg border p-6"
            style={{ background: 'var(--s-card-bg)', borderColor: 'var(--s-border-subtle)' }}
          >
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
              <ScoreGauge score={score.composite_score} />
              <div className="flex-1 text-center sm:text-left">
                <h2 className="text-lg font-semibold text-text">
                  Rollover Recommendation Score
                </h2>
                <p className="mt-1 text-sm text-text-muted">
                  {score.recommendation_tier === 'STRONG_ROLLOVER' && 'Analysis strongly supports rolling over to a Farther IRA.'}
                  {score.recommendation_tier === 'MODERATE_ROLLOVER' && 'Analysis moderately supports rolling over to a Farther IRA.'}
                  {score.recommendation_tier === 'NEUTRAL' && 'Factors are balanced. Advisor judgment should guide the decision.'}
                  {score.recommendation_tier === 'MODERATE_STAY' && 'Some factors favor staying in the current plan.'}
                  {score.recommendation_tier === 'STRONG_STAY' && 'Multiple factors favor staying in the current plan.'}
                </p>
                <div className="mt-3 flex items-center gap-4 text-xs text-text-faint">
                  <span>Scored: {new Date(score.scored_at).toLocaleDateString()}</span>
                  <span>Version: {score.scoring_version}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleScore}
                className="rounded-lg border px-3 py-1.5 text-xs font-medium text-text-muted hover:text-text"
                style={{ borderColor: 'var(--s-border-subtle)' }}
                disabled={scoring}
              >
                {scoring ? 'Rescoring...' : 'Rescore'}
              </button>
            </div>
          </div>

          {/* Benchmark Chart */}
          {feeFactorData && (
            <BenchmarkChart
              planFeeBps={feeFactorData.plan_fee_bps ?? 0}
              fartherFeeBps={feeFactorData.farther_fee_bps ?? 0}
              peerMedianBps={feeFactorData.peer_median_bps ?? 0}
              peer25thBps={Math.round((feeFactorData.peer_median_bps ?? 0) * 0.6)}
              peer75thBps={Math.round((feeFactorData.peer_median_bps ?? 0) * 1.5)}
              tier={analysis.plan_name}
            />
          )}

          {/* 10-Factor Breakdown */}
          <div>
            <h2 className="mb-4 text-lg font-semibold text-text">10-Factor Breakdown</h2>
            <FactorBreakdownGrid factorScores={score.factor_scores} />
          </div>
        </div>
      ) : (
        /* No score yet — show score button */
        <div
          className="flex flex-col items-center justify-center rounded-lg border p-8"
          style={{ background: 'var(--s-card-bg)', borderColor: 'var(--s-border-subtle)' }}
        >
          <svg className="mb-3 h-12 w-12 text-text-faint" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
          </svg>
          <h3 className="text-lg font-semibold text-text">Ready to Score</h3>
          <p className="mb-4 text-sm text-text-muted">
            Run the 10-factor analysis to generate a Rollover Recommendation Score.
          </p>
          <button
            type="button"
            onClick={handleScore}
            className="rounded-lg bg-accent-primary px-6 py-2.5 text-sm font-medium text-text-onBrand transition-colors hover:bg-accent-primary/90 disabled:opacity-50"
            disabled={scoring}
          >
            {scoring ? (
              <span className="flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Scoring...
              </span>
            ) : (
              'Score Analysis'
            )}
          </button>
        </div>
      )}

      {/* Analysis Details */}
      <div
        className="rounded-lg border p-6"
        style={{ background: 'var(--s-card-bg)', borderColor: 'var(--s-border-subtle)' }}
      >
        <h2 className="mb-4 text-lg font-semibold text-text">Analysis Details</h2>
        <div className="grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <p className="text-text-faint">State of Residence</p>
            <p className="font-medium text-text">{analysis.state_of_residence}</p>
          </div>
          <div>
            <p className="text-text-faint">Retirement Target Age</p>
            <p className="font-medium text-text">{analysis.retirement_target_age}</p>
          </div>
          <div>
            <p className="text-text-faint">Outstanding Loan</p>
            <p className="font-medium text-text">
              {analysis.has_outstanding_loan
                ? formatDollars(analysis.outstanding_loan_cents)
                : 'None'}
            </p>
          </div>
          <div>
            <p className="text-text-faint">Employer Stock</p>
            <p className="font-medium text-text">
              {analysis.has_employer_stock
                ? `Basis: ${formatDollars(analysis.employer_stock_cost_basis_cents)}`
                : 'None'}
            </p>
          </div>
          <div>
            <p className="text-text-faint">Narrative Template</p>
            <p className="font-medium text-text">{analysis.narrative_template}</p>
          </div>
          <div>
            <p className="text-text-faint">Created</p>
            <p className="font-medium text-text">
              {new Date(analysis.created_at).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </p>
          </div>
        </div>
        {analysis.notes && (
          <div className="mt-4">
            <p className="text-text-faint">Notes</p>
            <p className="text-sm text-text">{analysis.notes}</p>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          className="rounded-lg border px-4 py-2 text-sm font-medium text-text-muted opacity-50"
          style={{ borderColor: 'var(--s-border-subtle)' }}
          disabled
          title="Coming in Week 3"
        >
          Generate Narrative
        </button>
        <button
          type="button"
          className="rounded-lg border px-4 py-2 text-sm font-medium text-text-muted opacity-50"
          style={{ borderColor: 'var(--s-border-subtle)' }}
          disabled
          title="Coming in Week 3"
        >
          Generate Report
        </button>
      </div>
    </div>
  );
}
