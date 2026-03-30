'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth, useToast } from '@/lib/tax-planning/auth-context';
import type { Proposal, ProposalStatus } from '@/lib/proposal-engine/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ProposalStats {
  totalCreated90d: number;
  sent: number;
  conversionRate: number;
  aumWon: number;
}

interface FunnelStep {
  label: string;
  count: number;
  color: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_COLORS: Record<ProposalStatus, string> = {
  DRAFT: 'bg-surface-subtle text-text-muted',
  READY: 'bg-info-100 text-info-700',
  REVIEW: 'bg-info-100 text-info-700',
  APPROVED: 'bg-accent-primary/15 text-accent-primarySoft',
  SENT: 'bg-warning-100 text-warning-700',
  VIEWED: 'bg-purple-100 text-purple-700',
  ACCEPTED: 'bg-success-100 text-success-700',
  DECLINED: 'bg-critical-100 text-critical-700',
  EXPIRED: 'bg-surface-subtle text-text-muted',
};

const PROPOSAL_TYPES = ['All Types', 'New Client', 'Rebalance', 'Rollover', 'Transfer'];
const STATUS_OPTIONS: Array<ProposalStatus | 'ALL'> = [
  'ALL', 'DRAFT', 'REVIEW', 'APPROVED', 'SENT', 'VIEWED', 'ACCEPTED', 'DECLINED', 'EXPIRED',
];

const PAGE_SIZE = 10;

const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const fmtPct = new Intl.NumberFormat('en-US', { style: 'percent', minimumFractionDigits: 1 });

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function TableSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 py-3">
          <div className="h-4 w-28 rounded bg-surface-subtle" />
          <div className="h-4 w-20 rounded bg-surface-subtle" />
          <div className="h-5 w-16 rounded-full bg-surface-subtle" />
          <div className="h-4 w-24 rounded bg-surface-subtle flex-1" />
          <div className="h-4 w-20 rounded bg-surface-subtle" />
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Status Badge
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: ProposalStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[status]}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Proposals Dashboard Page
// ---------------------------------------------------------------------------

export default function ProposalsDashboardPage() {
  const { token } = useAuth();
  const { addToast } = useToast();
  const router = useRouter();

  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [stats, setStats] = useState<ProposalStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<ProposalStatus | 'ALL'>('ALL');
  const [typeFilter, setTypeFilter] = useState('All Types');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const [proposalsRes, statsRes] = await Promise.all([
        fetch('/api/v1/proposals', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/v1/proposals/stats', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (!proposalsRes.ok) throw new Error('Failed to fetch proposals');
      const proposalsData: Proposal[] = await proposalsRes.json();
      setProposals(proposalsData);

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      } else {
        // Compute stats from proposals if endpoint unavailable
        const now = new Date();
        const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        const recent = proposalsData.filter((p) => new Date(p.createdAt) >= ninetyDaysAgo);
        const sent = proposalsData.filter((p) => p.sentAt);
        const accepted = proposalsData.filter((p) => p.status === 'ACCEPTED');
        const aumWon = accepted.reduce((sum, p) => sum + (p.proposedPortfolioValue ?? 0), 0);
        setStats({
          totalCreated90d: recent.length,
          sent: sent.length,
          conversionRate: sent.length > 0 ? accepted.length / sent.length : 0,
          aumWon,
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load proposals';
      setError(msg);
      addToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  }, [token, addToast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Filtering
  const filtered = proposals.filter((p) => {
    if (statusFilter !== 'ALL' && p.status !== statusFilter) return false;
    if (typeFilter !== 'All Types' && !(p.title ?? '').toLowerCase().includes(typeFilter.toLowerCase())) return false;
    if (search && !p.clientName.toLowerCase().includes(search.toLowerCase()) && !(p.title ?? '').toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Funnel
  const funnel: FunnelStep[] = [
    { label: 'Created', count: proposals.length, color: 'bg-accent-primary' },
    { label: 'Sent', count: proposals.filter((p) => p.sentAt).length, color: 'bg-warning-500' },
    { label: 'Viewed', count: proposals.filter((p) => !!p.viewedAt).length, color: 'bg-purple-500' },
    { label: 'Accepted', count: proposals.filter((p) => p.status === 'ACCEPTED').length, color: 'bg-success-500' },
  ];
  const maxFunnel = Math.max(1, funnel[0].count);

  const formatDate = (iso?: string) => {
    if (!iso) return '--';
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">Portfolio Proposals</h1>
          <p className="mt-1 text-sm text-text-muted">Create, manage, and track portfolio proposals for your clients.</p>
        </div>
        <button
          type="button"
          onClick={() => router.push('/tax-planning/proposals/new')}
          className="inline-flex items-center gap-2 rounded-lg bg-accent-primary px-4 py-2.5 text-sm font-medium text-text shadow-sm transition-colors hover:bg-accent-primary/80"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New Proposal
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-border-subtle bg-surface-soft backdrop-blur-xl p-6 shadow-sm animate-pulse">
              <div className="h-4 w-24 rounded bg-surface-subtle mb-3" />
              <div className="h-8 w-20 rounded bg-surface-subtle" />
            </div>
          ))
        ) : stats ? (
          <>
            <div className="rounded-2xl border border-border-subtle bg-surface-soft backdrop-blur-xl p-6 shadow-sm">
              <p className="text-sm font-medium text-text-muted">Created (90d)</p>
              <p className="mt-2 text-3xl font-bold text-text tabular-nums">{stats.totalCreated90d}</p>
            </div>
            <div className="rounded-2xl border border-border-subtle bg-surface-soft backdrop-blur-xl p-6 shadow-sm">
              <p className="text-sm font-medium text-text-muted">Sent</p>
              <p className="mt-2 text-3xl font-bold text-text tabular-nums">{stats.sent}</p>
            </div>
            <div className="rounded-2xl border border-border-subtle bg-surface-soft backdrop-blur-xl p-6 shadow-sm">
              <p className="text-sm font-medium text-text-muted">Conversion Rate</p>
              <p className="mt-2 text-3xl font-bold text-text tabular-nums">{fmtPct.format(stats.conversionRate)}</p>
            </div>
            <div className="rounded-2xl border border-border-subtle bg-surface-soft backdrop-blur-xl p-6 shadow-sm">
              <p className="text-sm font-medium text-text-muted">AUM Won</p>
              <p className="mt-2 text-3xl font-bold text-text tabular-nums">{fmt.format(stats.aumWon / 100)}</p>
            </div>
          </>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        {/* Main table area */}
        <div className="lg:col-span-3 space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value as ProposalStatus | 'ALL'); setPage(1); }}
              className="border border-border-subtle rounded-sm px-3 py-2 text-sm focus:ring-2 focus:ring-accent-primary/80 bg-surface-subtle"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{s === 'ALL' ? 'All Statuses' : s.replace(/_/g, ' ')}</option>
              ))}
            </select>
            <select
              value={typeFilter}
              onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
              className="border border-border-subtle rounded-sm px-3 py-2 text-sm focus:ring-2 focus:ring-accent-primary/80 bg-surface-subtle"
            >
              {PROPOSAL_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <div className="relative flex-1">
              <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-faint" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input
                type="text"
                placeholder="Search by client name..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="w-full border border-border-subtle rounded-sm pl-9 pr-3 py-2 text-sm focus:ring-2 focus:ring-accent-primary/80"
              />
            </div>
          </div>

          {/* Table */}
          <div className="rounded-2xl border border-border-subtle bg-surface-soft backdrop-blur-xl shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-6"><TableSkeleton /></div>
            ) : error ? (
              <div className="p-8 text-center">
                <p className="text-sm text-critical-700">{error}</p>
                <button type="button" onClick={fetchData} className="mt-3 text-sm font-medium text-accent-primarySoft hover:text-accent-primarySoft">Try again</button>
              </div>
            ) : paginated.length === 0 ? (
              <div className="p-12 text-center">
                <svg className="mx-auto h-12 w-12 text-text-faint mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
                <p className="text-sm font-medium text-text-muted">No proposals yet.</p>
                <p className="mt-1 text-sm text-text-muted">Create your first proposal to get started.</p>
                <button
                  type="button"
                  onClick={() => router.push('/tax-planning/proposals/new')}
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-accent-primary px-4 py-2 text-sm font-medium text-text hover:bg-accent-primary/80"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  Create First Proposal
                </button>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-limestone-200">
                    <thead className="bg-transparent">
                      <tr>
                        {['Client', 'Type', 'Status', 'AUM', 'Created', 'Sent', 'Viewed', 'Actions'].map((h) => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-muted">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-limestone-100">
                      {paginated.map((p) => (
                        <tr key={p.proposalId} className="transition-colors hover:bg-surface-subtle">
                          <td className="px-4 py-3 text-sm font-medium text-text whitespace-nowrap">
                            <Link href={`/tax-planning/proposals/${p.proposalId}`} className="hover:text-accent-primarySoft">
                              {p.clientName}
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-sm text-text-muted whitespace-nowrap">{p.title ?? '--'}</td>
                          <td className="px-4 py-3 whitespace-nowrap"><StatusBadge status={p.status} /></td>
                          <td className="px-4 py-3 text-sm text-text-muted tabular-nums whitespace-nowrap">{fmt.format(((p.currentPortfolioValue ?? 0) as number) / 100)}</td>
                          <td className="px-4 py-3 text-sm text-text-muted whitespace-nowrap">{formatDate(p.createdAt)}</td>
                          <td className="px-4 py-3 text-sm text-text-muted whitespace-nowrap">{formatDate(p.sentAt ?? undefined)}</td>
                          <td className="px-4 py-3 text-sm text-text-muted whitespace-nowrap">{formatDate(p.viewedAt)}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <Link
                                href={`/tax-planning/proposals/${p.proposalId}`}
                                className="text-sm font-medium text-accent-primarySoft hover:text-accent-primarySoft"
                              >
                                View
                              </Link>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(p.proposalId);
                                  addToast('Proposal ID copied', 'info');
                                }}
                                className="text-sm text-text-muted hover:text-text-muted"
                              >
                                Copy ID
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between border-t border-border-subtle px-4 py-3">
                  <p className="text-sm text-text-muted">
                    Showing {(page - 1) * PAGE_SIZE + 1}--{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => p - 1)}
                      className="rounded-md border border-border-subtle px-3 py-1.5 text-sm font-medium text-text-muted disabled:opacity-40 hover:bg-surface-subtle"
                    >
                      Previous
                    </button>
                    <span className="text-sm text-text-muted">Page {page} of {totalPages}</span>
                    <button
                      type="button"
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => p + 1)}
                      className="rounded-md border border-border-subtle px-3 py-1.5 text-sm font-medium text-text-muted disabled:opacity-40 hover:bg-surface-subtle"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Conversion Funnel Sidebar */}
        <div className="rounded-2xl border border-border-subtle bg-surface-soft backdrop-blur-xl p-6 shadow-sm">
          <h2 className="text-base font-semibold text-text mb-4">Conversion Funnel</h2>
          <div className="space-y-4">
            {funnel.map((step) => (
              <div key={step.label}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-text-muted">{step.label}</span>
                  <span className="text-sm font-semibold text-text tabular-nums">{step.count}</span>
                </div>
                <div className="h-2 w-full rounded-full bg-surface-subtle">
                  <div
                    className={`h-2 rounded-full transition-all ${step.color}`}
                    style={{ width: `${(step.count / maxFunnel) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          {!loading && proposals.length > 0 && (
            <div className="mt-6 border-t border-border-subtle pt-4">
              <p className="text-xs text-text-muted mb-1">Overall Conversion</p>
              <p className="text-2xl font-bold text-text tabular-nums">
                {proposals.length > 0
                  ? fmtPct.format(proposals.filter((p) => p.status === 'ACCEPTED').length / proposals.length)
                  : '0%'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
