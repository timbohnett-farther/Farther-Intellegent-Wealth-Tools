'use client';

import React, { useMemo } from 'react';
import { cn } from '@/lib/utils/cn';
import {
  DollarSign,
  Layers,
  Landmark,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import type {
  CurrentPortfolio,
  Holding,
  AssetClass,
  MoneyCents,
} from '@/lib/proposal-engine/types';
import { QualityFlagsList } from './QualityFlagsList';
import { AllocationBar } from './AllocationBar';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PortfolioSummaryProps {
  /** The current portfolio data. */
  portfolio: CurrentPortfolio;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmtDollars(cents: MoneyCents): string {
  const d = (cents as number) / 100;
  return d.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function fmtPct(ratio: number): string {
  return `${(ratio * 100).toFixed(2)}%`;
}

function fmtMoney(cents: MoneyCents): string {
  const dollars = (cents as number) / 100;
  const isNeg = dollars < 0;
  const formatted = Math.abs(dollars).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return isNeg ? `-$${formatted}` : `$${formatted}`;
}

function fmtAssetClass(ac: AssetClass): string {
  return ac
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace('Us', 'US')
    .replace('Intl', "Int'l");
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PortfolioSummary({ portfolio }: PortfolioSummaryProps) {
  const { metrics, holdings, accounts, qualityFlags } = portfolio;

  // Top 5 holdings by market value
  const topHoldings = useMemo(() => {
    return [...holdings]
      .sort((a, b) => (b.marketValue as number) - (a.marketValue as number))
      .slice(0, 5);
  }, [holdings]);

  // Stat cards
  const statCards = [
    {
      label: 'Total Value',
      value: fmtDollars(metrics.totalValue as MoneyCents),
      icon: DollarSign,
    },
    {
      label: 'Accounts',
      value: accounts.length.toString(),
      icon: Landmark,
    },
    {
      label: 'Holdings',
      value: metrics.holdingCount.toString(),
      icon: Layers,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-3">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="rounded-lg border border-limestone-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-charcoal-400" aria-hidden="true" />
                <span className="text-xs font-medium uppercase tracking-wide text-charcoal-500">
                  {card.label}
                </span>
              </div>
              <p className="mt-1.5 text-xl font-bold tabular-nums text-charcoal-900">
                {card.value}
              </p>
            </div>
          );
        })}
      </div>

      {/* Allocation bar */}
      <div className="rounded-lg border border-limestone-200 bg-white p-5 shadow-sm">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-charcoal-500 mb-3">
          Asset Allocation
        </h4>
        <AllocationBar
          equity={metrics.equityPct}
          fixedIncome={metrics.fixedIncomePct}
          alternatives={metrics.alternativesPct}
          cash={metrics.cashPct}
          showLabels
          height={32}
        />
      </div>

      {/* Quality flags */}
      {qualityFlags.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-charcoal-900 mb-3">
            Quality Flags
          </h4>
          <QualityFlagsList flags={qualityFlags} />
        </div>
      )}

      {/* Top 5 holdings table */}
      <div className="rounded-lg border border-limestone-200 bg-white shadow-sm">
        <div className="border-b border-limestone-200 px-5 py-3">
          <h4 className="text-sm font-semibold text-charcoal-900">
            Top Holdings
          </h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-limestone-100 bg-limestone-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-charcoal-500">
                  Ticker
                </th>
                <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-charcoal-500">
                  Description
                </th>
                <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-charcoal-500">
                  Asset Class
                </th>
                <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wide text-charcoal-500">
                  Value
                </th>
                <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wide text-charcoal-500">
                  % of Total
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-limestone-100">
              {topHoldings.map((h, i) => {
                const pctOfTotal =
                  (metrics.totalValue as number) > 0
                    ? ((h.marketValue as number) / (metrics.totalValue as number)) * 100
                    : 0;
                return (
                  <tr key={i} className="hover:bg-limestone-50 transition-colors">
                    <td className="px-4 py-2.5 font-mono font-semibold text-charcoal-900">
                      {h.ticker ?? '--'}
                    </td>
                    <td className="px-4 py-2.5 text-charcoal-700 truncate max-w-[200px]">
                      {h.description}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-charcoal-600">
                      {fmtAssetClass(h.assetClass)}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-charcoal-900 font-medium">
                      {fmtMoney(h.marketValue)}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-charcoal-500">
                      {pctOfTotal.toFixed(1)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

PortfolioSummary.displayName = 'PortfolioSummary';
