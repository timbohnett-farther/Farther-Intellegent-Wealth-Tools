'use client';

import React, { useState, useEffect, useCallback, useContext } from 'react';
import Link from 'next/link';
import { AuthContext } from '@/lib/tax-planning/auth-context';
import type { AnalysisListItem } from '@/lib/rollover-engine/types';
import { PlanSearchInput } from '@/components/rollover/PlanSearchInput';
import { AnalysisTable } from '@/components/rollover/AnalysisTable';

export default function RolloverDashboardPage() {
  const { user, token } = useContext(AuthContext);
  const [analyses, setAnalyses] = useState<AnalysisListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchAnalyses = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/v1/rollover/analyses?limit=50', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAnalyses(data.analyses ?? []);
        setTotal(data.total ?? 0);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchAnalyses();
  }, [fetchAnalyses]);

  // Quick stats
  const draftCount = analyses.filter((a) => a.status === 'DRAFT').length;
  const scoredCount = analyses.filter((a) => a.composite_score != null).length;
  const approvedCount = analyses.filter((a) => a.status === 'APPROVED' || a.status === 'DELIVERED').length;
  const totalBalance = analyses.reduce((sum, a) => sum + a.participant_balance_cents, 0);

  function formatDollars(cents: number): string {
    if (cents >= 100000000) {
      return `$${(cents / 100000000).toFixed(1)}M`;
    }
    if (cents >= 100000) {
      return `$${(cents / 100000).toFixed(0)}K`;
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(cents / 100);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">Rollover Insight Engine</h1>
          <p className="text-sm text-text-muted">
            Generate defensible 401(k) rollover analyses for your clients.
          </p>
        </div>
        <Link
          href="/rollover/new"
          className="inline-flex items-center gap-2 rounded-lg bg-accent-primary px-4 py-2.5 text-sm font-medium text-text-onBrand transition-colors hover:bg-accent-primary/90"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New Analysis
        </Link>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: 'Total Analyses', value: total.toString(), icon: '📊' },
          { label: 'In Draft', value: draftCount.toString(), icon: '📝' },
          { label: 'Scored', value: scoredCount.toString(), icon: '🎯' },
          { label: 'Pipeline Value', value: formatDollars(totalBalance), icon: '💰' },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-lg border p-4"
            style={{
              background: 'var(--s-card-bg, #fff)',
              borderColor: 'var(--s-border-subtle)',
            }}
          >
            <p className="text-xs font-medium text-text-muted">{stat.label}</p>
            <p className="mt-1 text-2xl font-bold text-text">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Plan Search */}
      <div
        className="rounded-lg border p-4"
        style={{
          background: 'var(--s-card-bg, #fff)',
          borderColor: 'var(--s-border-subtle)',
        }}
      >
        <h2 className="mb-3 text-sm font-semibold text-text">Quick Plan Search</h2>
        {token && (
          <PlanSearchInput
            token={token}
            onSelect={(plan) => {
              // Navigate to new analysis with plan pre-selected
              window.location.href = `/rollover/new?plan_id=${plan.plan_id}`;
            }}
          />
        )}
      </div>

      {/* Recent Analyses */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-text">Recent Analyses</h2>
        <AnalysisTable analyses={analyses} loading={loading} />
      </div>
    </div>
  );
}
