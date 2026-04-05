'use client';

import React from 'react';
import { cn } from '@/lib/utils/cn';
import { FileText, Calendar } from 'lucide-react';
import type { InvestmentPolicyStatement } from '@/lib/proposal-engine/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface IPSPreviewProps {
  /** The generated IPS document to display. */
  ips: InvestmentPolicyStatement;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function IPSPreview({ ips }: IPSPreviewProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-xl border border-border-subtle bg-surface-soft p-6 shadow-sm">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-500/10">
              <FileText className="h-5 w-5 text-primary-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-text">
                Investment Policy Statement
              </h2>
              <p className="text-sm text-text-muted">{ips.clientName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-text-muted">
            <Calendar className="h-3.5 w-3.5" />
            <span>Generated {formatDate(ips.generatedAt)}</span>
          </div>
        </div>
      </div>

      {/* Investment Objective */}
      <div className="rounded-xl border border-border-subtle bg-surface-soft p-4">
        <h3 className="mb-2 text-sm font-semibold text-text">Investment Objective</h3>
        <p className="text-sm leading-relaxed text-text-muted">
          {ips.investmentObjective}
        </p>
      </div>

      {/* Risk Tolerance */}
      <div className="rounded-xl border border-border-subtle bg-surface-soft p-4">
        <h3 className="mb-2 text-sm font-semibold text-text">Risk Tolerance</h3>
        <p className="text-sm leading-relaxed text-text-muted">
          {ips.riskTolerance}
        </p>
      </div>

      {/* Time Horizon */}
      <div className="rounded-xl border border-border-subtle bg-surface-soft p-4">
        <h3 className="mb-2 text-sm font-semibold text-text">Time Horizon</h3>
        <p className="text-sm leading-relaxed text-text-muted">
          {ips.timeHorizon}
        </p>
      </div>

      {/* Liquidity Needs */}
      <div className="rounded-xl border border-border-subtle bg-surface-soft p-4">
        <h3 className="mb-2 text-sm font-semibold text-text">Liquidity Needs</h3>
        <p className="text-sm leading-relaxed text-text-muted">
          {ips.liquidityNeeds}
        </p>
      </div>

      {/* Target Allocation Table */}
      <div className="rounded-xl border border-border-subtle bg-surface-soft p-4">
        <h3 className="mb-3 text-sm font-semibold text-text">Target Allocation</h3>
        <div className="overflow-hidden rounded-lg border border-border-subtle">
          <table className="w-full text-sm">
            <thead className="border-b border-border-subtle bg-transparent">
              <tr>
                <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-text-muted">
                  Asset Class
                </th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-text-muted">
                  Target
                </th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-text-muted">
                  Min
                </th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-text-muted">
                  Max
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle bg-text">
              {ips.targetAllocation.map((alloc, idx) => (
                <tr key={idx} className="hover:bg-surface-subtle transition-colors">
                  <td className="px-4 py-3 font-medium text-text">
                    {alloc.assetClass}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums font-semibold text-text">
                    {alloc.targetPct}%
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-text-muted">
                    {alloc.minPct}%
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-text-muted">
                    {alloc.maxPct}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Benchmarks Table */}
      <div className="rounded-xl border border-border-subtle bg-surface-soft p-4">
        <h3 className="mb-3 text-sm font-semibold text-text">Composite Benchmark</h3>
        <div className="overflow-hidden rounded-lg border border-border-subtle">
          <table className="w-full text-sm">
            <thead className="border-b border-border-subtle bg-transparent">
              <tr>
                <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-text-muted">
                  Component
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-text-muted">
                  Benchmark
                </th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-text-muted">
                  Weight
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle bg-text">
              {ips.benchmarks.map((bench, idx) => (
                <tr key={idx} className="hover:bg-surface-subtle transition-colors">
                  <td className="px-4 py-3 font-medium text-text">
                    {bench.component}
                  </td>
                  <td className="px-4 py-3 text-text-muted">
                    {bench.benchmark}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-text">
                    {(bench.weight * 100).toFixed(0)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Rebalancing Info */}
      <div className="rounded-xl border border-border-subtle bg-surface-soft p-4">
        <h3 className="mb-3 text-sm font-semibold text-text">Rebalancing Policy</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
              Threshold
            </p>
            <p className="mt-1 text-sm font-semibold text-text">
              ±{ips.rebalancingThreshold}%
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
              Frequency
            </p>
            <p className="mt-1 text-sm font-semibold text-text">
              {ips.rebalancingFrequency}
            </p>
          </div>
        </div>
      </div>

      {/* Dates */}
      <div className="rounded-xl border border-border-subtle bg-surface-soft p-4">
        <h3 className="mb-3 text-sm font-semibold text-text">Document Dates</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
              Effective Date
            </p>
            <p className="mt-1 text-sm font-semibold text-text">
              {formatDate(ips.effectiveDate)}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
              Next Review
            </p>
            <p className="mt-1 text-sm font-semibold text-text">
              {formatDate(ips.reviewDate)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

IPSPreview.displayName = 'IPSPreview';
