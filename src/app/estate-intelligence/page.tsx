'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// ───────────────────────────────────────────────────────────────────────────
// Types
// ───────────────────────────────────────────────────────────────────────────

interface Analysis {
  id: string;
  client_name: string;
  status: 'PENDING' | 'ANALYZING' | 'COMPLETE' | 'ERROR';
  document_count: number;
  finding_count: number;
  tax_exposure: number;
  created_at: string;
  updated_at: string;
}

interface DashboardStats {
  total: number;
  active: number;
  avgFindings: number;
  totalExposure: number;
}

// ───────────────────────────────────────────────────────────────────────────
// Components
// ───────────────────────────────────────────────────────────────────────────

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-border-subtle bg-surface-soft backdrop-blur-xl p-6 shadow-sm">
      <p className="text-sm font-medium text-text-muted">{label}</p>
      <p className="mt-2 text-3xl font-bold text-text tabular-nums">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: Analysis['status'] }) {
  const variants = {
    PENDING: 'bg-surface-subtle text-text-muted border-border',
    ANALYZING: 'bg-info-100 text-info-700 border-info-200 animate-pulse',
    COMPLETE: 'bg-success-100 text-success-700 border-success-200',
    ERROR: 'bg-critical-100 text-critical-700 border-critical-200',
  };

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${variants[status]}`}>
      {status === 'ANALYZING' && (
        <svg className="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      )}
      {status}
    </span>
  );
}

function AnalysisCard({ analysis }: { analysis: Analysis }) {
  return (
    <Link href={`/estate-intelligence/${analysis.id}`}>
      <div className="rounded-2xl border border-border-subtle bg-surface-soft backdrop-blur-xl p-6 shadow-sm transition-all hover:border-accent-primary hover:shadow-md">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-text">{analysis.client_name}</h3>
            <p className="text-xs text-text-muted mt-1">
              Created {new Date(analysis.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
          <StatusBadge status={analysis.status} />
        </div>

        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-text-muted">Documents</p>
            <p className="font-semibold text-text tabular-nums">{analysis.document_count}</p>
          </div>
          <div>
            <p className="text-text-muted">Findings</p>
            <p className="font-semibold text-text tabular-nums">{analysis.finding_count}</p>
          </div>
          <div>
            <p className="text-text-muted">Tax Exposure</p>
            <p className="font-semibold text-text tabular-nums">
              {analysis.tax_exposure > 0 ? `$${(analysis.tax_exposure / 1000000).toFixed(1)}M` : '—'}
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-border-subtle bg-surface-soft backdrop-blur-xl p-16 text-center">
      <svg className="mx-auto h-12 w-12 text-text-faint mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
      <h3 className="text-lg font-semibold text-text mb-2">No analyses yet</h3>
      <p className="text-sm text-text-muted max-w-md mx-auto mb-6">
        Upload trust documents, estate plans, and related legal agreements to begin AI-powered estate intelligence analysis.
      </p>
      <Link href="/estate-intelligence/new">
        <button className="rounded-lg bg-accent-primary px-6 py-2.5 text-sm font-semibold text-text-onBrand transition-colors hover:bg-accent-primarySoft">
          + New Analysis
        </button>
      </Link>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Main Page
// ───────────────────────────────────────────────────────────────────────────

export default function EstateIntelligencePage() {
  const router = useRouter();
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAnalyses() {
      try {
        const res = await fetch('/api/v1/estate-analyses');
        if (!res.ok) throw new Error('Failed to fetch analyses');

        const data: Analysis[] = await res.json();
        setAnalyses(data);

        // Calculate stats
        const active = data.filter(a => a.status === 'ANALYZING' || a.status === 'PENDING').length;
        const complete = data.filter(a => a.status === 'COMPLETE');
        const avgFindings = complete.length > 0
          ? complete.reduce((sum, a) => sum + a.finding_count, 0) / complete.length
          : 0;
        const totalExposure = data.reduce((sum, a) => sum + a.tax_exposure, 0);

        setStats({
          total: data.length,
          active,
          avgFindings: Math.round(avgFindings),
          totalExposure,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    fetchAnalyses();
  }, []);

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="flex items-center justify-between">
          <div className="h-8 w-64 rounded bg-surface-subtle animate-pulse" />
          <div className="h-10 w-32 rounded-lg bg-surface-subtle animate-pulse" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-24 rounded-2xl bg-surface-subtle animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">Trust & Estate Intelligence</h1>
          <p className="mt-1 text-sm text-text-muted">
            AI-powered analysis of trust documents, wills, and estate plans
          </p>
        </div>
        <button
          onClick={() => router.push('/estate-intelligence/new')}
          className="rounded-lg bg-accent-primary px-6 py-2.5 text-sm font-semibold text-text-onBrand transition-colors hover:bg-accent-primarySoft"
        >
          + New Analysis
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total Analyses" value={stats.total} />
          <StatCard label="Active" value={stats.active} />
          <StatCard label="Average Findings" value={stats.avgFindings} />
          <StatCard
            label="Total Tax Exposure Identified"
            value={stats.totalExposure > 0 ? `$${(stats.totalExposure / 1000000).toFixed(1)}M` : '$0'}
          />
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="rounded-lg border border-critical-200 bg-critical-50 p-4 text-sm text-critical-700">
          {error}
        </div>
      )}

      {/* Analyses List or Empty State */}
      {analyses.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {analyses.map(analysis => (
            <AnalysisCard key={analysis.id} analysis={analysis} />
          ))}
        </div>
      )}
    </div>
  );
}
