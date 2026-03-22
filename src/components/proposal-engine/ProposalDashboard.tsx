'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { cn } from '@/lib/utils/cn';
import {
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  FileText,
  Send,
  BarChart3,
  DollarSign,
  ExternalLink,
  MoreHorizontal,
  Filter,
} from 'lucide-react';
import type {
  ProposalListItem,
  ProposalDashboardStats,
  ProposalStatus,
  ProposalType,
} from '@/lib/proposal-engine/types';
import { ProposalStatusBadge } from './ProposalStatusBadge';
import { ConversionFunnel } from './ConversionFunnel';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ProposalDashboardProps {
  /** List of proposals. */
  proposals: ProposalListItem[];
  /** Dashboard statistics. */
  stats: ProposalDashboardStats;
  /** Callback to create a new proposal. */
  onCreateNew: () => void;
  /** Callback when a proposal is selected. */
  onSelect: (proposalId: string) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmtDollars(cents: number): string {
  const d = cents / 100;
  if (d >= 1_000_000) return `$${(d / 1_000_000).toFixed(1)}M`;
  if (d >= 1_000) return `$${(d / 1_000).toFixed(0)}K`;
  return `$${d.toFixed(0)}`;
}

function fmtFullDollars(cents: number): string {
  const d = cents / 100;
  return d.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function fmtRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return fmtDate(iso);
}

const PROPOSAL_TYPE_LABELS: Partial<Record<ProposalType, string>> = {
  NEW_RELATIONSHIP: 'New Relationship',
  ACCOUNT_REVIEW: 'Account Review',
  ASSET_TRANSFER: 'Asset Transfer',
  SPECIFIC_GOAL: 'Specific Goal',
  ALTERNATIVE_INVESTMENT: 'Alt Investment',
  ROTH_CONVERSION: 'Roth Conversion',
  IPS_UPDATE: 'IPS Update',
  INITIAL_PROPOSAL: 'Initial',
  REBALANCE: 'Rebalance',
  TAX_LOSS_HARVEST: 'TLH',
  RETIREMENT_TRANSITION: 'Retirement',
  CONSOLIDATION: 'Consolidation',
  RISK_ADJUSTMENT: 'Risk Adj.',
  CUSTOM: 'Custom',
};

const STATUS_FILTER_OPTIONS: { value: ProposalStatus | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'REVIEW', label: 'Review' },
  { value: 'SENT', label: 'Sent' },
  { value: 'VIEWED', label: 'Viewed' },
  { value: 'ACCEPTED', label: 'Accepted' },
  { value: 'DECLINED', label: 'Declined' },
  { value: 'EXPIRED', label: 'Expired' },
];

const PAGE_SIZE = 10;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ProposalDashboard({
  proposals,
  stats,
  onCreateNew,
  onSelect,
}: ProposalDashboardProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProposalStatus | 'ALL'>('ALL');
  const [page, setPage] = useState(0);
  const [showFunnel, setShowFunnel] = useState(false);

  // Filter proposals
  const filtered = useMemo(() => {
    let result = proposals;

    if (statusFilter !== 'ALL') {
      result = result.filter((p) => p.status === statusFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.clientName.toLowerCase().includes(q) ||
          p.proposalId.toLowerCase().includes(q),
      );
    }

    // Sort by most recent
    return [...result].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
  }, [proposals, statusFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageStart = page * PAGE_SIZE;
  const pageEnd = pageStart + PAGE_SIZE;
  const pageItems = filtered.slice(pageStart, pageEnd);

  const handlePageChange = useCallback(
    (delta: number) => {
      setPage((p) => Math.max(0, Math.min(totalPages - 1, p + delta)));
    },
    [totalPages],
  );

  // Count proposals by status for funnel
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of proposals) {
      counts[p.status] = (counts[p.status] ?? 0) + 1;
    }
    return counts;
  }, [proposals]);

  const funnelCreated = proposals.length;
  const funnelSent =
    (statusCounts['SENT'] ?? 0) +
    (statusCounts['VIEWED'] ?? 0) +
    (statusCounts['ACCEPTED'] ?? 0) +
    (statusCounts['DECLINED'] ?? 0);
  const funnelViewed =
    (statusCounts['VIEWED'] ?? 0) +
    (statusCounts['ACCEPTED'] ?? 0) +
    (statusCounts['DECLINED'] ?? 0);
  const funnelAccepted = statusCounts['ACCEPTED'] ?? 0;

  return (
    <div className="space-y-6">
      {/* KPI stat cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.07] backdrop-blur-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <FileText className="h-4 w-4 text-white/30" />
            <span className="text-[10px] font-medium uppercase tracking-wide text-white/50">
              Created (90d)
            </span>
          </div>
          <p className="text-2xl font-bold tabular-nums text-white">
            {stats.created90d ?? stats.totalCreated90Days}
          </p>
        </div>

        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.07] backdrop-blur-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <Send className="h-4 w-4 text-white/30" />
            <span className="text-[10px] font-medium uppercase tracking-wide text-white/50">
              Sent
            </span>
          </div>
          <p className="text-2xl font-bold tabular-nums text-white">
            {stats.sent ?? stats.totalSent}
          </p>
        </div>

        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.07] backdrop-blur-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="h-4 w-4 text-white/30" />
            <span className="text-[10px] font-medium uppercase tracking-wide text-white/50">
              Conversion
            </span>
          </div>
          <p className="text-2xl font-bold tabular-nums text-teal-300">
            {(stats.conversionRate * 100).toFixed(1)}%
          </p>
        </div>

        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.07] backdrop-blur-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="h-4 w-4 text-white/30" />
            <span className="text-[10px] font-medium uppercase tracking-wide text-white/50">
              AUM Won
            </span>
          </div>
          <p className="text-2xl font-bold tabular-nums text-success-700">
            {fmtDollars(stats.aumWon)}
          </p>
        </div>
      </div>

      {/* Conversion funnel toggle */}
      <div>
        <button
          type="button"
          onClick={() => setShowFunnel((v) => !v)}
          className="inline-flex items-center gap-2 rounded-2xl border border-white/[0.06] bg-white/[0.07] backdrop-blur-xl px-4 py-2 text-sm font-medium text-white/60 hover:bg-white/[0.04] transition-colors"
        >
          <BarChart3 className="h-4 w-4 text-white/30" />
          {showFunnel ? 'Hide' : 'Show'} Conversion Funnel
        </button>

        {showFunnel && (
          <div className="mt-4 rounded-2xl border border-white/[0.06] bg-white/[0.07] backdrop-blur-xl p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-white mb-4">
              Conversion Funnel
            </h3>
            <ConversionFunnel
              created={funnelCreated}
              sent={funnelSent}
              viewed={funnelViewed}
              accepted={funnelAccepted}
            />
          </div>
        )}
      </div>

      {/* Toolbar: Search + Filter + Create */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="flex items-center gap-2 rounded-2xl border border-white/[0.06] bg-white/[0.07] backdrop-blur-xl px-3 py-2">
            <Search className="h-4 w-4 text-white/30" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(0);
              }}
              placeholder="Search proposals..."
              className="w-48 bg-transparent text-sm text-white/60 outline-hidden placeholder:text-white/30"
            />
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-1.5 rounded-2xl border border-white/[0.06] bg-white/[0.07] backdrop-blur-xl px-3 py-2">
            <Filter className="h-3.5 w-3.5 text-white/30" />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as ProposalStatus | 'ALL');
                setPage(0);
              }}
              className="bg-transparent text-sm font-medium text-white/60 outline-hidden"
            >
              {STATUS_FILTER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Create new */}
        <button
          type="button"
          onClick={onCreateNew}
          className="inline-flex items-center gap-2 rounded-lg bg-teal-500 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-teal-400 active:bg-teal-600 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Proposal
        </button>
      </div>

      {/* Proposal table */}
      <div className="overflow-x-auto rounded-lg border border-white/[0.06] shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b border-white/[0.06] bg-transparent">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-white/50">
                Client
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-white/50">
                Type
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-white/50">
                Status
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-white/50">
                Portfolio Value
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-white/50">
                Created
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-white/50">
                Updated
              </th>
              <th className="px-4 py-3 w-12" />
            </tr>
          </thead>
          <tbody className="divide-y divide-limestone-100 bg-white">
            {pageItems.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-sm text-white/30">
                  {searchQuery || statusFilter !== 'ALL'
                    ? 'No proposals match the current filters.'
                    : 'No proposals yet. Create your first one!'}
                </td>
              </tr>
            ) : (
              pageItems.map((proposal) => (
                <tr
                  key={proposal.proposalId}
                  onClick={() => onSelect(proposal.proposalId)}
                  className="cursor-pointer transition-colors hover:bg-white/[0.04]"
                >
                  {/* Client name */}
                  <td className="px-4 py-3">
                    <span className="font-medium text-white">
                      {proposal.clientName}
                    </span>
                  </td>

                  {/* Type */}
                  <td className="px-4 py-3">
                    <span className="rounded bg-white/[0.06] px-2 py-0.5 text-xs font-medium text-white/50">
                      {PROPOSAL_TYPE_LABELS[proposal.proposalType] ?? proposal.proposalType}
                    </span>
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3 text-center">
                    <ProposalStatusBadge status={proposal.status} />
                  </td>

                  {/* Portfolio value */}
                  <td className="px-4 py-3 text-right tabular-nums text-white/60">
                    {fmtFullDollars((proposal.portfolioValue ?? proposal.assetsInScope) as number)}
                  </td>

                  {/* Created */}
                  <td className="px-4 py-3 text-right text-xs text-white/50">
                    {fmtRelative(proposal.createdAt)}
                  </td>

                  {/* Updated */}
                  <td className="px-4 py-3 text-right text-xs text-white/50">
                    {fmtRelative(proposal.updatedAt)}
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3 text-center">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelect(proposal.proposalId);
                      }}
                      className="rounded p-1 text-white/30 hover:bg-white/[0.06] hover:text-white/60 transition-colors"
                      aria-label={`Open ${proposal.clientName} proposal`}
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {filtered.length > PAGE_SIZE && (
        <div className="flex items-center justify-between text-sm text-white/50">
          <span className="text-xs tabular-nums">
            {pageStart + 1}--{Math.min(pageEnd, filtered.length)} of {filtered.length}
          </span>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => handlePageChange(-1)}
              disabled={page === 0}
              className={cn(
                'rounded-md p-1.5 transition-colors',
                page === 0
                  ? 'text-white/30 cursor-not-allowed'
                  : 'text-white/50 hover:bg-white/[0.06]',
              )}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <span className="px-2 text-xs tabular-nums">
              Page {page + 1} of {totalPages}
            </span>

            <button
              type="button"
              onClick={() => handlePageChange(1)}
              disabled={page >= totalPages - 1}
              className={cn(
                'rounded-md p-1.5 transition-colors',
                page >= totalPages - 1
                  ? 'text-white/30 cursor-not-allowed'
                  : 'text-white/50 hover:bg-white/[0.06]',
              )}
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

ProposalDashboard.displayName = 'ProposalDashboard';
