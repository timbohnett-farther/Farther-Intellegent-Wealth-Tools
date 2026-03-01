'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth, useToast } from '@/lib/tax-planning/auth-context';
import type { Proposal, ProposalStatus } from '@/lib/proposal-engine/types';
import { ProposalStatusBadge } from '@/components/proposal-engine/ProposalStatusBadge';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ComplianceFilter = 'ALL' | 'COMPLETE' | 'PARTIAL' | 'MISSING';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const COMPLIANCE_FILTERS: { value: ComplianceFilter; label: string }[] = [
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
// Skeleton
// ---------------------------------------------------------------------------

function TableSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 py-3">
          <div className="h-4 w-32 rounded bg-limestone-200" />
          <div className="h-4 w-24 rounded bg-limestone-200" />
          <div className="h-4 w-16 rounded bg-limestone-200" />
          <div className="h-4 w-16 rounded bg-limestone-200" />
          <div className="h-4 w-20 rounded bg-limestone-200 flex-1" />
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Compliance Status Indicator
// ---------------------------------------------------------------------------

function ComplianceIndicator({ generated }: { generated: boolean }) {
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

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function ComplianceDashboardPage() {
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
  const getComplianceStatus = (p: Proposal): ComplianceFilter => {
    if (p.ipsGenerated && p.regBIGenerated) return 'COMPLETE';
    if (p.ipsGenerated || p.regBIGenerated) return 'PARTIAL';
    return 'MISSING';
  };

  const filtered = proposals.filter((p) => {
    if (filter !== 'ALL' && getComplianceStatus(p) !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!p.clientName.toLowerCase().includes(q) && !p.proposalType.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Stats
  const statsComplete = proposals.filter((p) => p.ipsGenerated && p.regBIGenerated).length;
  const statsPartial = proposals.filter((p) => (p.ipsGenerated || p.regBIGenerated) && !(p.ipsGenerated && p.regBIGenerated)).length;
  const statsMissing = proposals.filter((p) => !p.ipsGenerated && !p.regBIGenerated).length;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-charcoal-900">Compliance Dashboard</h1>
          <p className="mt-1 text-sm text-charcoal-500">
            Monitor IPS and Reg BI document status across all proposals.
          </p>
        </div>
        <Link
          href="/tax-planning/proposals"
          className="inline-flex items-center gap-2 text-sm font-medium text-charcoal-500 hover:text-charcoal-700 transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Back to Proposals
        </Link>
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
        <div className="flex gap-1 rounded-lg bg-limestone-100 p-1">
          {COMPLIANCE_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => { setFilter(f.value); setPage(1); }}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                filter === f.value
                  ? 'bg-white text-brand-700 shadow-sm'
                  : 'text-charcoal-500 hover:text-charcoal-700'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-sm">
          <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            placeholder="Search by client name..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full border border-limestone-300 rounded-lg pl-9 pr-3 py-2 text-sm focus:ring-2 focus:ring-brand-400 focus:border-brand-400"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-limestone-200 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-6"><TableSkeleton /></div>
        ) : error ? (
          <div className="p-8 text-center">
            <p className="text-sm text-critical-700">{error}</p>
            <button type="button" onClick={fetchProposals} className="mt-3 text-sm font-medium text-brand-700 hover:text-brand-600">
              Try again
            </button>
          </div>
        ) : paginated.length === 0 ? (
          <div className="p-12 text-center">
            <svg className="mx-auto h-12 w-12 text-charcoal-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-6-2.247V6.75A2.25 2.25 0 0112 4.5c.621 0 1.192.254 1.6.664l.3.3a2.25 2.25 0 003.182 0l.3-.3A2.25 2.25 0 0119.5 4.5v.006c0 .345-.08.68-.23.978l-.498.996M3.53 14.28l4.97 4.97 4.97-4.97" />
            </svg>
            <p className="text-sm font-medium text-charcoal-700">No proposals match the current filter.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-limestone-200">
                <thead className="bg-limestone-50">
                  <tr>
                    {['Client', 'Proposal Type', 'Status', 'IPS Generated', 'Reg BI Generated', 'Last Updated', 'Actions'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-charcoal-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-limestone-100">
                  {paginated.map((p) => (
                    <tr key={p.proposalId} className="transition-colors hover:bg-limestone-50">
                      <td className="px-4 py-3 text-sm font-medium text-charcoal-900 whitespace-nowrap">
                        <Link href={`/tax-planning/proposals/${p.proposalId}`} className="hover:text-brand-700">
                          {p.clientName}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-sm text-charcoal-700 whitespace-nowrap">
                        {p.proposalType.replace(/_/g, ' ')}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <ProposalStatusBadge status={p.status} />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <ComplianceIndicator generated={p.ipsGenerated} />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <ComplianceIndicator generated={p.regBIGenerated} />
                      </td>
                      <td className="px-4 py-3 text-sm text-charcoal-500 whitespace-nowrap">
                        {formatDate(p.updatedAt)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Link
                          href={`/tax-planning/proposals/${p.proposalId}`}
                          className="text-sm font-medium text-brand-700 hover:text-brand-600"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between border-t border-limestone-200 px-4 py-3">
              <p className="text-sm text-charcoal-500">
                Showing {(page - 1) * PAGE_SIZE + 1}--{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="rounded-md border border-limestone-300 px-3 py-1.5 text-sm font-medium text-charcoal-700 disabled:opacity-40 hover:bg-limestone-50"
                >
                  Previous
                </button>
                <span className="text-sm text-charcoal-500">Page {page} of {totalPages}</span>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded-md border border-limestone-300 px-3 py-1.5 text-sm font-medium text-charcoal-700 disabled:opacity-40 hover:bg-limestone-50"
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
