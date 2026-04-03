'use client';

import React, { useState, useEffect, useContext, useCallback } from 'react';
import Link from 'next/link';
import { AuthContext } from '@/lib/tax-planning/auth-context';

interface EngineStats {
  total_analyses: number;
  by_status: Record<string, number>;
  total_scored: number;
  total_narratives: number;
  total_reports: number;
  total_hubspot_syncs: number;
  total_plans: number;
  total_benchmarks: number;
  average_score: number | null;
  recommendation_distribution: Record<string, number>;
}

export default function RolloverAdminPage() {
  const { token } = useContext(AuthContext);
  const [stats, setStats] = useState<EngineStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/v1/rollover/admin', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setStats(await res.json());
        setError(null);
      } else {
        const err = await res.json();
        setError(err.error?.message ?? 'Failed to load stats');
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent-primary border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-critical-300 bg-critical-50 p-6 text-center">
        <p className="text-sm font-medium text-critical-700">{error}</p>
        <p className="mt-1 text-xs text-critical-600">Admin access required.</p>
      </div>
    );
  }

  if (!stats) return null;

  const statCards = [
    { label: 'Total Analyses', value: stats.total_analyses },
    { label: 'Scored', value: stats.total_scored },
    { label: 'Narratives Generated', value: stats.total_narratives },
    { label: 'Reports Generated', value: stats.total_reports },
    { label: 'HubSpot Syncs', value: stats.total_hubspot_syncs },
    { label: 'Plans in DB', value: stats.total_plans },
    { label: 'Benchmarks', value: stats.total_benchmarks },
    { label: 'Avg RRS Score', value: stats.average_score ?? '—' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
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
          <h1 className="text-2xl font-bold text-text">Rollover Engine Admin</h1>
          <p className="text-sm text-text-muted">CCO oversight panel — engine health and compliance metrics.</p>
        </div>
        <button
          type="button"
          onClick={fetchStats}
          className="rounded-lg border px-3 py-1.5 text-xs font-medium text-text-muted hover:text-text"
          style={{ borderColor: 'var(--s-border-subtle)' }}
        >
          Refresh
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="rounded-lg border p-4"
            style={{ background: 'var(--s-card-bg)', borderColor: 'var(--s-border-subtle)' }}
          >
            <p className="text-xs font-medium text-text-muted">{card.label}</p>
            <p className="mt-1 text-2xl font-bold text-text">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Status Distribution */}
      <div
        className="rounded-lg border p-6"
        style={{ background: 'var(--s-card-bg)', borderColor: 'var(--s-border-subtle)' }}
      >
        <h2 className="mb-4 text-sm font-semibold text-text">Analysis Status Distribution</h2>
        <div className="space-y-2">
          {Object.entries(stats.by_status).map(([status, count]) => (
            <div key={status} className="flex items-center gap-3">
              <span className="w-40 text-xs text-text-muted">{status.replace(/_/g, ' ')}</span>
              <div className="flex-1 h-2 rounded-full" style={{ background: 'var(--s-border-subtle)' }}>
                <div
                  className="h-full rounded-full bg-accent-primary"
                  style={{ width: `${Math.max(2, (count / Math.max(stats.total_analyses, 1)) * 100)}%` }}
                />
              </div>
              <span className="text-xs font-medium text-text">{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recommendation Distribution */}
      {Object.keys(stats.recommendation_distribution).length > 0 && (
        <div
          className="rounded-lg border p-6"
          style={{ background: 'var(--s-card-bg)', borderColor: 'var(--s-border-subtle)' }}
        >
          <h2 className="mb-4 text-sm font-semibold text-text">Recommendation Distribution</h2>
          <div className="space-y-2">
            {Object.entries(stats.recommendation_distribution).map(([tier, count]) => (
              <div key={tier} className="flex items-center gap-3">
                <span className="w-40 text-xs text-text-muted">{tier.replace(/_/g, ' ')}</span>
                <div className="flex-1 h-2 rounded-full" style={{ background: 'var(--s-border-subtle)' }}>
                  <div
                    className="h-full rounded-full bg-emerald-500"
                    style={{ width: `${Math.max(2, (count / Math.max(stats.total_scored, 1)) * 100)}%` }}
                  />
                </div>
                <span className="text-xs font-medium text-text">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
