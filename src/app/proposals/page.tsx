'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, FileText, Send, BarChart3, DollarSign } from 'lucide-react';
import type {
  ProposalListItem,
  ProposalDashboardStats,
  ProposalStatus,
} from '@/lib/proposal-engine/types';
import { formatCurrency, formatCompact } from '@/lib/proposal-engine/types';
import { ProposalStatusBadge } from '@/components/proposal-engine/ProposalStatusBadge';

export default function ProposalsPage() {
  const [proposals, setProposals] = useState<ProposalListItem[]>([]);
  const [stats, setStats] = useState<ProposalDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ProposalStatus | 'ALL'>('ALL');

  useEffect(() => {
    async function load() {
      try {
        const [proposalsRes, statsRes] = await Promise.all([
          fetch('/api/v1/proposals'),
          fetch('/api/v1/proposals/stats'),
        ]);
        if (proposalsRes.ok) {
          const data = await proposalsRes.json();
          setProposals(data.proposals ?? data ?? []);
        }
        if (statsRes.ok) {
          const data = await statsRes.json();
          setStats(data);
        }
      } catch (err) {
        console.error('Failed to load proposals:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = filter === 'ALL'
    ? proposals
    : proposals.filter(p => p.status === filter);

  return (
    <div className="min-h-screen bg-surface-base p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text">Proposals</h1>
            <p className="text-sm text-text-muted">
              Create and manage investment proposals for clients
            </p>
          </div>
          <Link
            href="/proposals/new"
            className="inline-flex items-center gap-2 rounded-lg bg-accent-primary px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-brand-400 transition-colors"
          >
            <Plus className="h-4 w-4" />
            New Proposal
          </Link>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              icon={FileText}
              label="Created (90d)"
              value={String(stats.totalCreated90Days)}
            />
            <StatCard
              icon={Send}
              label="Sent"
              value={String(stats.totalSent)}
            />
            <StatCard
              icon={BarChart3}
              label="Win Rate"
              value={`${(stats.conversionRate * 100).toFixed(0)}%`}
            />
            <StatCard
              icon={DollarSign}
              label="AUM Won"
              value={formatCompact(stats.aumWon)}
            />
          </div>
        )}

        {/* Filter tabs */}
        <div className="flex gap-1 rounded-lg bg-surface-subtle p-1">
          {(['ALL', 'DRAFT', 'SENT', 'VIEWED', 'ACCEPTED', 'DECLINED'] as const).map(status => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                filter === status
                  ? 'bg-surface-soft text-accent-primarySoft shadow-sm'
                  : 'text-text-muted hover:text-text'
              }`}
            >
              {status === 'ALL' ? 'All' : status.charAt(0) + status.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        {/* Proposals list */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-primary border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-border-subtle bg-surface-soft p-12 text-center">
            <FileText className="mx-auto h-12 w-12 text-text-faint" />
            <h3 className="mt-3 text-sm font-semibold text-text">No proposals yet</h3>
            <p className="mt-1 text-xs text-text-muted">
              Create your first proposal to get started
            </p>
            <Link
              href="/proposals/new"
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-accent-primary px-5 py-2 text-sm font-medium text-white hover:bg-brand-400 transition-colors"
            >
              <Plus className="h-4 w-4" />
              New Proposal
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border-subtle">
            <table className="w-full text-sm">
              <thead className="border-b border-border-subtle bg-transparent">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-muted">Client</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-muted">Type</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-text-muted">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-text-muted">Assets</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-text-muted">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {filtered.map(p => (
                  <tr key={p.proposalId} className="hover:bg-surface-subtle transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/proposals/${p.proposalId}`} className="font-medium text-text hover:text-accent-primarySoft">
                        {p.clientName}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-text-muted text-xs">
                      {p.proposalType.replace(/_/g, ' ')}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <ProposalStatusBadge status={p.status} />
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-text-muted">
                      {formatCompact(p.assetsInScope)}
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-text-muted">
                      {new Date(p.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border-subtle bg-surface-soft backdrop-blur-xl p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="h-4 w-4 text-text-faint" />
        <span className="text-xs font-medium uppercase tracking-wide text-text-muted">{label}</span>
      </div>
      <p className="text-xl font-bold tabular-nums text-text">{value}</p>
    </div>
  );
}
