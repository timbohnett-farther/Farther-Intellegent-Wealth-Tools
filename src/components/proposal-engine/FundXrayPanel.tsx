'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils/cn';
import { Layers, AlertTriangle, Search, BarChart3 } from 'lucide-react';
import type { FundXrayResult, DecomposedHolding, ConcentrationAlert } from '@/lib/proposal-engine/analytics/fund-xray';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FundXrayPanelProps {
  result: FundXrayResult;
}

type TabKey = 'holdings' | 'sectors' | 'overlaps' | 'alerts';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmtPct(value: number, decimals = 2): string {
  return `${value.toFixed(decimals)}%`;
}

function getSeverityColor(severity: 'HIGH' | 'MEDIUM' | 'LOW'): string {
  if (severity === 'HIGH') return 'text-critical-700 bg-critical-500/10 border-critical-500/20';
  if (severity === 'MEDIUM') return 'text-warning-700 bg-warning-500/10 border-warning-500/20';
  return 'text-text-muted bg-surface-subtle border-border-subtle';
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function FundXrayPanel({ result }: FundXrayPanelProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('holdings');

  const tabs: Array<{ key: TabKey; label: string; icon: typeof Layers }> = [
    { key: 'holdings', label: 'Decomposed', icon: Layers },
    { key: 'sectors', label: 'Sectors', icon: BarChart3 },
    { key: 'overlaps', label: 'Overlaps', icon: Search },
    { key: 'alerts', label: `Alerts (${result.hiddenConcentrations.length})`, icon: AlertTriangle },
  ];

  return (
    <div className="space-y-4">
      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-border-subtle bg-surface-soft p-4 text-center">
          <div className="text-2xl font-bold tabular-nums text-text">{result.totalSecuritiesCount}</div>
          <div className="text-xs text-text-muted mt-1">Underlying Securities</div>
        </div>
        <div className="rounded-xl border border-border-subtle bg-surface-soft p-4 text-center">
          <div className="text-2xl font-bold tabular-nums text-text">{fmtPct(result.top10Concentration)}</div>
          <div className="text-xs text-text-muted mt-1">Top 10 Concentration</div>
        </div>
        <div className="rounded-xl border border-border-subtle bg-surface-soft p-4 text-center">
          <div className={cn('text-2xl font-bold tabular-nums', result.hiddenConcentrations.length > 0 ? 'text-warning-700' : 'text-success-700')}>
            {result.hiddenConcentrations.length}
          </div>
          <div className="text-xs text-text-muted mt-1">Concentration Alerts</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-surface-subtle p-1">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all',
                activeTab === tab.key
                  ? 'bg-surface-soft text-accent-primarySoft shadow-sm'
                  : 'text-text-muted hover:text-text'
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {activeTab === 'holdings' && (
        <div className="overflow-x-auto rounded-lg border border-border-subtle shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b border-border-subtle">
              <tr>
                <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-text-muted">Ticker</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-text-muted">Name</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-text-muted">Eff. Weight</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-text-muted">Appears In</th>
                <th className="px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-text-muted">Type</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {result.decomposedHoldings.slice(0, 30).map((h) => (
                <tr key={h.ticker} className="hover:bg-surface-subtle transition-colors">
                  <td className="px-4 py-2 font-medium text-text">{h.ticker}</td>
                  <td className="px-4 py-2 text-text-muted max-w-[200px] truncate">{h.name}</td>
                  <td className="px-4 py-2 text-right tabular-nums font-semibold text-text">{fmtPct(h.effectiveWeight)}</td>
                  <td className="px-4 py-2 text-text-muted text-xs">{h.appearsIn.join(', ')}</td>
                  <td className="px-4 py-2 text-center">
                    <span className={cn(
                      'inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium',
                      h.isDirectHolding ? 'bg-accent-primary/10 text-accent-primarySoft' : 'bg-surface-subtle text-text-muted'
                    )}>
                      {h.isDirectHolding ? 'Direct' : 'Underlying'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {result.decomposedHoldings.length > 30 && (
            <div className="px-4 py-2 text-xs text-text-muted text-center border-t border-border-subtle">
              Showing 30 of {result.decomposedHoldings.length} securities
            </div>
          )}
        </div>
      )}

      {activeTab === 'sectors' && (
        <div className="space-y-2">
          {Object.entries(result.sectorExposure)
            .sort(([,a], [,b]) => b - a)
            .map(([sector, weight]) => (
              <div key={sector} className="flex items-center gap-3">
                <div className="w-40 text-xs text-text-muted truncate">{sector}</div>
                <div className="flex-1 h-5 rounded-full bg-surface-subtle overflow-hidden">
                  <div
                    className="h-full rounded-full bg-accent-primary/60 transition-all duration-500"
                    style={{ width: `${Math.min(weight, 100)}%` }}
                  />
                </div>
                <div className="w-12 text-right text-xs tabular-nums font-semibold text-text">{fmtPct(weight, 1)}</div>
              </div>
            ))}
        </div>
      )}

      {activeTab === 'overlaps' && (
        <div className="space-y-2">
          {result.overlapAnalysis.length === 0 ? (
            <div className="rounded-xl border border-border-subtle bg-surface-soft p-8 text-center">
              <Search className="mx-auto h-8 w-8 text-text-faint mb-2" />
              <p className="text-sm text-text-muted">No overlapping securities detected.</p>
            </div>
          ) : (
            result.overlapAnalysis.map((o) => (
              <div key={o.ticker} className="rounded-lg border border-warning-500/20 bg-warning-500/5 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-text">{o.ticker}</span>
                    <span className="ml-2 text-xs text-text-muted">{o.name}</span>
                  </div>
                  <span className="text-sm font-bold tabular-nums text-warning-700">{fmtPct(o.effectiveWeight)}</span>
                </div>
                <p className="text-xs text-text-muted mt-1">
                  Appears in: {o.funds.map(f => f.fundTicker).join(', ')}
                </p>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'alerts' && (
        <div className="space-y-2">
          {result.hiddenConcentrations.length === 0 ? (
            <div className="rounded-xl border border-success-500/20 bg-success-500/5 p-8 text-center">
              <AlertTriangle className="mx-auto h-8 w-8 text-success-700 mb-2" />
              <p className="text-sm text-success-700 font-medium">No concentration alerts</p>
            </div>
          ) : (
            result.hiddenConcentrations.map((alert) => (
              <div key={alert.ticker} className={cn('rounded-lg border p-3', getSeverityColor(alert.severity))}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="font-semibold">{alert.ticker}</span>
                    <span className="text-[10px] font-bold uppercase">{alert.severity}</span>
                  </div>
                  <span className="text-sm font-bold tabular-nums">{fmtPct(alert.effectiveWeight)}</span>
                </div>
                <p className="text-xs mt-1 opacity-80">{alert.message}</p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

FundXrayPanel.displayName = 'FundXrayPanel';
