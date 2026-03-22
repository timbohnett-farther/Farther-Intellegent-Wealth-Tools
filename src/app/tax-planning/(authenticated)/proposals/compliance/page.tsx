'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth, useToast } from '@/lib/tax-planning/auth-context';
import type { Proposal, ProposalStatus } from '@/lib/proposal-engine/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ComplianceFilter = 'ALL' | 'COMPLETE' | 'PARTIAL' | 'MISSING';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_COLORS: Record<ProposalStatus, string> = {
  DRAFT: 'bg-white/[0.06] text-white/60',
  READY: 'bg-teal-500/15 text-teal-300',
  REVIEW: 'bg-info-100 text-info-700',
  APPROVED: 'bg-teal-500/15 text-teal-300',
  SENT: 'bg-warning-100 text-warning-700',
  VIEWED: 'bg-purple-100 text-purple-700',
  ACCEPTED: 'bg-success-100 text-success-700',
  DECLINED: 'bg-critical-100 text-critical-700',
  EXPIRED: 'bg-white/[0.06] text-white/50',
};

const COMPLIANCE_FILTERS: Array<{ value: ComplianceFilter; label: string }> = [
  { value: 'ALL', label: 'All Proposals' },
  { value: 'COMPLETE', label: 'Complete' },
  { value: 'PARTIAL', label: 'Partial' },
  { value: 'MISSING', label: 'Missing' },
];

const PAGE_SIZE = 15;

const formatDate = (iso?: string | null) => {
  if (!iso) return '--';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function hasIps(p: Proposal): boolean {
  return !!p.riskProfile;
}

function hasRegBI(p: Proposal): boolean {
  return p.status === 'SENT' || p.status === 'VIEWED' || p.status === 'ACCEPTED';
}

function getComplianceStatus(p: Proposal): ComplianceFilter {
  const ips = hasIps(p);
  const regbi = hasRegBI(p);
  if (ips && regbi) return 'COMPLETE';
  if (ips || regbi) return 'PARTIAL';
  return 'MISSING';
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: ProposalStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[status] || 'bg-white/[0.06] text-white/60'}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}

function ComplianceIndicator({ generated, label }: { generated: boolean; label: string }) {
  return generated ? (
    <span className="inline-flex items-center gap-1">
      <svg className="h-4 w-4 text-success-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span className="text-xs font-medium text-success-700">Generated</span>
    </span>
  ) : (
    <span className="inline-flex items-center gap-1">
      <svg className="h-4 w-4 text-warning-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
      </svg>
      <span className="text-xs font-medium text-warning-700">Missing</span>
    </span>
  );
}

function TableSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 py-3">
          <div className="h-4 w-32 rounded bg-white/[0.06]" />
          <div className="h-4 w-24 rounded bg-white/[0.06]" />
          <div className="h-4 w-16 rounded bg-white/[0.06]" />
          <div className="h-4 w-16 rounded bg-white/[0.06]" />
          <div className="h-4 w-20 rounded bg-white/[0.06] flex-1" />
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Compliance Archive Page
// ---------------------------------------------------------------------------

export default function ComplianceArchivePage() {
  const { token } = useAuth();
  const { addToast } = useToast();
  const router = useRouter();

  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<ComplianceFilter>('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const fetchProposals = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/proposals', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch proposals');
      const data: Proposal[] = await res.json();
      setProposals(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load proposals';
      setError(msg);
      addToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  }, [token, addToast]);

  useEffect(() => { fetchProposals(); }, [fetchProposals]);

  // Filtering
  const filtered = proposals.filter((p) => {
    if (filter !== 'ALL' && getComplianceStatus(p) !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!p.clientName.toLowerCase().includes(q) && !(p.title ?? '').toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Stats
  const statsComplete = proposals.filter((p) => getComplianceStatus(p) === 'COMPLETE').length;
  const statsPartial = proposals.filter((p) => getComplianceStatus(p) === 'PARTIAL').length;
  const statsMissing = proposals.filter((p) => getComplianceStatus(p) === 'MISSING').length;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-3xl text-white tracking-wide">Compliance Archive</h1>
          <p className="mt-1 text-sm text-white/50">
            Monitor IPS and Reg BI document status across all proposals.
          </p>
        </div>
        <Link
          href="/tax-planning/proposals"
          className="inline-flex items-center gap-2 text-sm font-medium text-white/50 hover:text-white/60 transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Back to Proposals
        </Link>
      </div>

      {/* Info banner */}
      <div className="rounded-lg border border-info-200 bg-info-50 px-4 py-3 flex items-start gap-3">
        <svg className="h-5 w-5 text-info-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
        </svg>
        <div>
          <p className="text-sm font-medium text-info-700">Compliance Requirement</p>
          <p className="text-xs text-info-600 mt-0.5">All proposals with &quot;Sent&quot; status must have corresponding compliance documents on file. Documents are automatically locked after proposal delivery.</p>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-success-200 bg-success-50 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <svg className="h-5 w-5 text-success-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm font-medium text-success-700">Complete</p>
          </div>
          <p className="text-3xl font-bold text-success-700 tabular-nums">{loading ? '--' : statsComplete}</p>
          <p className="mt-1 text-xs text-success-600">IPS + Reg BI generated</p>
        </div>
        <div className="rounded-lg border border-warning-200 bg-warning-50 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <svg className="h-5 w-5 text-warning-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            <p className="text-sm font-medium text-warning-700">Partial</p>
          </div>
          <p className="text-3xl font-bold text-warning-700 tabular-nums">{loading ? '--' : statsPartial}</p>
          <p className="mt-1 text-xs text-warning-600">One document missing</p>
        </div>
        <div className="rounded-lg border border-critical-200 bg-critical-50 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <svg className="h-5 w-5 text-critical-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm font-medium text-critical-700">Missing</p>
          </div>
          <p className="text-3xl font-bold text-critical-700 tabular-nums">{loading ? '--' : statsMissing}</p>
          <p className="mt-1 text-xs text-critical-600">No compliance documents</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex gap-1 rounded-lg bg-white/[0.06] p-1">
          {COMPLIANCE_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => { setFilter(f.value); setPage(1); }}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                filter === f.value
                  ? 'bg-white/[0.07] text-teal-300 shadow-sm'
                  : 'text-white/50 hover:text-white/60'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-sm">
          <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            placeholder="Search by client name..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full border border-white/[0.10] rounded-sm pl-9 pr-3 py-2 text-sm focus:ring-2 focus:ring-teal-400"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.07] backdrop-blur-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-6"><TableSkeleton /></div>
        ) : error ? (
          <div className="p-8 text-center">
            <p className="text-sm text-critical-700">{error}</p>
            <button type="button" onClick={fetchProposals} className="mt-3 text-sm font-medium text-teal-300 hover:text-teal-300">Try again</button>
          </div>
        ) : paginated.length === 0 ? (
          <div className="p-12 text-center">
            <svg className="mx-auto h-12 w-12 text-white/30 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
            <p className="text-sm font-medium text-white/60">No proposals match the current filter.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-limestone-200">
                <thead className="bg-transparent">
                  <tr>
                    {['Client', 'Document Type', 'Proposal', 'Generated Date', 'Status (Locked/Draft)', 'Actions'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/50">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-limestone-100">
                  {paginated.map((p) => (
                    <React.Fragment key={p.proposalId}>
                      {/* IPS row */}
                      <tr className="transition-colors hover:bg-white/[0.04]">
                        <td className="px-4 py-3 text-sm font-medium text-white whitespace-nowrap">
                          <Link href={`/tax-planning/proposals/${p.proposalId}`} className="hover:text-teal-300">{p.clientName}</Link>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-info-100 text-info-700">IPS</span>
                        </td>
                        <td className="px-4 py-3 text-sm text-white/60 whitespace-nowrap">{p.title || 'Portfolio Proposal'}</td>
                        <td className="px-4 py-3 text-sm text-white/50 whitespace-nowrap">{hasIps(p) ? formatDate(p.updatedAt) : '--'}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <ComplianceIndicator generated={hasIps(p)} label="IPS" />
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Link href={`/tax-planning/proposals/${p.proposalId}`} className="text-sm font-medium text-teal-300 hover:text-teal-300">View</Link>
                            <button type="button" onClick={() => addToast('Downloading IPS...', 'info')} className="text-sm text-white/50 hover:text-white/60">Download</button>
                          </div>
                        </td>
                      </tr>
                      {/* Reg BI row */}
                      <tr className="transition-colors hover:bg-white/[0.04] bg-transparent/30">
                        <td className="px-4 py-3 text-sm text-white/50 whitespace-nowrap">{p.clientName}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-warning-100 text-warning-700">Reg BI</span>
                        </td>
                        <td className="px-4 py-3 text-sm text-white/60 whitespace-nowrap">{p.title || 'Portfolio Proposal'}</td>
                        <td className="px-4 py-3 text-sm text-white/50 whitespace-nowrap">{hasRegBI(p) ? formatDate(p.sentAt) : '--'}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <ComplianceIndicator generated={hasRegBI(p)} label="Reg BI" />
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Link href={`/tax-planning/proposals/${p.proposalId}`} className="text-sm font-medium text-teal-300 hover:text-teal-300">View</Link>
                            <button type="button" onClick={() => addToast('Downloading Reg BI doc...', 'info')} className="text-sm text-white/50 hover:text-white/60">Download</button>
                          </div>
                        </td>
                      </tr>
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between border-t border-white/[0.06] px-4 py-3">
              <p className="text-sm text-white/50">
                Showing {(page - 1) * PAGE_SIZE + 1}--{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((prev) => prev - 1)}
                  className="rounded-md border border-white/[0.10] px-3 py-1.5 text-sm font-medium text-white/60 disabled:opacity-40 hover:bg-white/[0.04]"
                >
                  Previous
                </button>
                <span className="text-sm text-white/50">Page {page} of {totalPages}</span>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((prev) => prev + 1)}
                  className="rounded-md border border-white/[0.10] px-3 py-1.5 text-sm font-medium text-white/60 disabled:opacity-40 hover:bg-white/[0.04]"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
