'use client';

import React from 'react';

interface BenchmarkChartProps {
  planFeeBps: number;
  fartherFeeBps: number;
  peerMedianBps: number;
  peer25thBps: number;
  peer75thBps: number;
  tier: string;
}

export function BenchmarkChart({
  planFeeBps,
  fartherFeeBps,
  peerMedianBps,
  peer25thBps,
  peer75thBps,
  tier,
}: BenchmarkChartProps) {
  const maxBps = Math.max(planFeeBps, fartherFeeBps, peer75thBps, peerMedianBps) * 1.3;

  function barWidth(bps: number): string {
    return `${Math.max(2, (bps / maxBps) * 100)}%`;
  }

  function formatBps(bps: number): string {
    return `${(bps / 100).toFixed(2)}%`;
  }

  return (
    <div
      className="rounded-lg border p-5"
      style={{
        background: 'var(--s-card-bg, #fff)',
        borderColor: 'var(--s-border-subtle)',
      }}
    >
      <h3 className="mb-4 text-sm font-semibold text-text">Fee Comparison — {tier} Tier</h3>

      <div className="space-y-4">
        {/* Current Plan */}
        <div>
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="font-medium text-text">Current 401(k) Plan</span>
            <span className="font-semibold text-text">{formatBps(planFeeBps)} ({planFeeBps} bps)</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full" style={{ background: 'var(--s-border-subtle)' }}>
            <div
              className="h-full rounded-full bg-amber-500 transition-all"
              style={{ width: barWidth(planFeeBps) }}
            />
          </div>
        </div>

        {/* Farther IRA */}
        <div>
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="font-medium text-text">Farther IRA</span>
            <span className="font-semibold text-emerald-600">{formatBps(fartherFeeBps)} ({fartherFeeBps} bps)</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full" style={{ background: 'var(--s-border-subtle)' }}>
            <div
              className="h-full rounded-full bg-emerald-500 transition-all"
              style={{ width: barWidth(fartherFeeBps) }}
            />
          </div>
        </div>

        {/* Peer Median */}
        <div>
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="font-medium text-text-muted">Peer Median (50th %ile)</span>
            <span className="text-text-muted">{formatBps(peerMedianBps)} ({peerMedianBps} bps)</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full" style={{ background: 'var(--s-border-subtle)' }}>
            <div
              className="h-full rounded-full bg-gray-400 transition-all"
              style={{ width: barWidth(peerMedianBps) }}
            />
          </div>
        </div>

        {/* Peer Range */}
        <div className="mt-3 flex items-center gap-2 text-[10px] text-text-faint">
          <span>25th: {formatBps(peer25thBps)}</span>
          <span>&middot;</span>
          <span>Median: {formatBps(peerMedianBps)}</span>
          <span>&middot;</span>
          <span>75th: {formatBps(peer75thBps)}</span>
        </div>
      </div>

      {/* Savings callout */}
      {planFeeBps > fartherFeeBps && (
        <div
          className="mt-4 rounded-lg p-3 text-sm"
          style={{ background: 'rgba(16, 185, 129, 0.08)' }}
        >
          <p className="font-medium text-emerald-700 dark:text-emerald-400">
            Potential annual savings: {formatBps(planFeeBps - fartherFeeBps)} ({planFeeBps - fartherFeeBps} bps)
          </p>
        </div>
      )}
    </div>
  );
}
