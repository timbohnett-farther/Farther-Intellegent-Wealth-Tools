'use client';

import React, { useState, useEffect, useContext, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AuthContext, ToastContext } from '@/lib/tax-planning/auth-context';
import type { RolloverAnalysis } from '@/lib/rollover-engine/types';
import { StatusBadge } from '@/components/rollover/StatusBadge';

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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    fetch(`/api/v1/rollover/analyses/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Not found');
        return res.json();
      })
      .then(setAnalysis)
      .catch(() => {
        addToast('Analysis not found.', 'error');
        router.push('/tax-planning/rollover');
      })
      .finally(() => setLoading(false));
  }, [id, token, router, addToast]);

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link
            href="/tax-planning/rollover"
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
        <StatusBadge status={analysis.status} />
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
            {analysis.recommendation_tier ?? 'Not yet scored'}
          </p>
        </div>
      </div>

      {/* Details */}
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

      {/* Action buttons (placeholders for Week 2+) */}
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          className="rounded-lg bg-accent-primary px-4 py-2 text-sm font-medium text-text-onBrand opacity-50"
          disabled
          title="Coming in Week 2"
        >
          Score Analysis
        </button>
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
