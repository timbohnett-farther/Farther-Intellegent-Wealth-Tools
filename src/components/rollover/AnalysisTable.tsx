'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import type { AnalysisListItem } from '@/lib/rollover-engine/types';
import { StatusBadge, TierBadge } from './StatusBadge';

interface AnalysisTableProps {
  analyses: AnalysisListItem[];
  loading?: boolean;
}

type SortField = 'client_name' | 'plan_name' | 'participant_balance_cents' | 'status' | 'created_at';
type SortDir = 'asc' | 'desc';

export function AnalysisTable({ analyses, loading }: AnalysisTableProps) {
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  }

  const sorted = [...analyses].sort((a, b) => {
    const valA = a[sortField];
    const valB = b[sortField];
    if (valA == null && valB == null) return 0;
    if (valA == null) return 1;
    if (valB == null) return -1;
    const cmp = typeof valA === 'string'
      ? valA.localeCompare(valB as string)
      : (valA as number) - (valB as number);
    return sortDir === 'asc' ? cmp : -cmp;
  });

  function formatDollars(cents: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(cents / 100);
  }

  function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return null;
    return (
      <svg className="ml-1 inline h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        {sortDir === 'asc' ? (
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
        ) : (
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        )}
      </svg>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent-primary border-t-transparent" />
      </div>
    );
  }

  if (analyses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <svg className="mb-3 h-10 w-10 text-text-faint" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
        <p className="text-sm font-medium text-text-muted">No analyses yet</p>
        <p className="text-xs text-text-faint">Create a new rollover analysis to get started.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border" style={{ borderColor: 'var(--s-border-subtle)' }}>
      <table className="w-full text-sm">
        <thead>
          <tr style={{ background: 'var(--s-table-header-bg, rgba(0,0,0,0.02))' }}>
            <th className="px-4 py-3 text-left font-medium text-text-muted">
              <button type="button" onClick={() => handleSort('client_name')} className="flex items-center">
                Client <SortIcon field="client_name" />
              </button>
            </th>
            <th className="px-4 py-3 text-left font-medium text-text-muted">
              <button type="button" onClick={() => handleSort('plan_name')} className="flex items-center">
                Plan <SortIcon field="plan_name" />
              </button>
            </th>
            <th className="px-4 py-3 text-right font-medium text-text-muted">
              <button type="button" onClick={() => handleSort('participant_balance_cents')} className="flex items-center justify-end">
                Balance <SortIcon field="participant_balance_cents" />
              </button>
            </th>
            <th className="px-4 py-3 text-left font-medium text-text-muted">
              <button type="button" onClick={() => handleSort('status')} className="flex items-center">
                Status <SortIcon field="status" />
              </button>
            </th>
            <th className="px-4 py-3 text-left font-medium text-text-muted">Score</th>
            <th className="px-4 py-3 text-left font-medium text-text-muted">
              <button type="button" onClick={() => handleSort('created_at')} className="flex items-center">
                Created <SortIcon field="created_at" />
              </button>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y" style={{ borderColor: 'var(--s-border-subtle)' }}>
          {sorted.map((analysis) => (
            <tr
              key={analysis.analysis_id}
              className="transition-colors hover:bg-accent-primary/5"
            >
              <td className="px-4 py-3">
                <Link
                  href={`/rollover/${analysis.analysis_id}`}
                  className="font-medium text-accent-primary hover:underline"
                >
                  {analysis.client_name}
                </Link>
              </td>
              <td className="px-4 py-3">
                <div>
                  <p className="text-text">{analysis.plan_name || 'Unnamed Plan'}</p>
                  <p className="text-xs text-text-faint">{analysis.plan_ein}</p>
                </div>
              </td>
              <td className="px-4 py-3 text-right font-medium text-text">
                {formatDollars(analysis.participant_balance_cents)}
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={analysis.status} />
              </td>
              <td className="px-4 py-3">
                {analysis.composite_score != null ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-text">
                      {analysis.composite_score}
                    </span>
                    {analysis.recommendation_tier && (
                      <TierBadge tier={analysis.recommendation_tier} />
                    )}
                  </div>
                ) : (
                  <span className="text-xs text-text-faint">--</span>
                )}
              </td>
              <td className="px-4 py-3 text-text-muted">
                {formatDate(analysis.created_at)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
