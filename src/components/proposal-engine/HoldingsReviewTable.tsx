'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils/cn';
import {
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Trash2,
  Pencil,
} from 'lucide-react';
import type { Holding, AssetClass, MoneyCents } from '@/lib/proposal-engine/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface HoldingsReviewTableProps {
  /** Array of holdings to display. */
  holdings: Holding[];
  /** Callback when a holding is edited (editable mode). */
  onEdit?: (index: number, holding: Holding) => void;
  /** Callback when a holding is removed (editable mode). */
  onRemove?: (index: number) => void;
  /** Callback to add a new holding row. */
  onAdd?: () => void;
  /** Whether the table is in editable mode. */
  editable?: boolean;
}

// ---------------------------------------------------------------------------
// Column configuration
// ---------------------------------------------------------------------------

type SortKey =
  | 'ticker'
  | 'description'
  | 'assetClass'
  | 'quantity'
  | 'price'
  | 'marketValue'
  | 'costBasis'
  | 'gainLoss'
  | 'expenseRatio';

type SortDir = 'asc' | 'desc';

interface ColumnDef {
  key: SortKey;
  label: string;
  align: 'left' | 'right' | 'center';
  width?: string;
}

const COLUMNS: ColumnDef[] = [
  { key: 'ticker', label: 'Ticker', align: 'left', width: 'w-20' },
  { key: 'description', label: 'Description', align: 'left' },
  { key: 'assetClass', label: 'Asset Class', align: 'left', width: 'w-36' },
  { key: 'quantity', label: 'Shares', align: 'right', width: 'w-20' },
  { key: 'price', label: 'Price', align: 'right', width: 'w-24' },
  { key: 'marketValue', label: 'Market Value', align: 'right', width: 'w-28' },
  { key: 'costBasis', label: 'Cost Basis', align: 'right', width: 'w-28' },
  { key: 'gainLoss', label: 'Gain/Loss', align: 'right', width: 'w-28' },
  { key: 'expenseRatio', label: 'Exp Ratio', align: 'right', width: 'w-24' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmtMoney(cents: number | null | undefined): string {
  if (cents === undefined || cents === null) return '--';
  const dollars = (cents as number) / 100;
  return dollars < 0
    ? `-$${Math.abs(dollars).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : `$${dollars.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtPct(ratio: number | null | undefined): string {
  if (ratio === undefined || ratio === null) return '--';
  return `${(ratio * 100).toFixed(2)}%`;
}

function fmtShares(quantity: number): string {
  return quantity.toLocaleString('en-US', { maximumFractionDigits: 4 });
}

function fmtAssetClass(ac: AssetClass): string {
  return ac
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace('Us', 'US')
    .replace('Intl', "Int'l");
}

function getSortValue(h: Holding, key: SortKey): string | number {
  switch (key) {
    case 'ticker':
      return h.ticker ?? '';
    case 'description':
      return h.description;
    case 'assetClass':
      return h.assetClass;
    case 'quantity':
      return h.quantity;
    case 'price':
      return h.price as number;
    case 'marketValue':
      return h.marketValue as number;
    case 'costBasis':
      return (h.costBasis as number) ?? 0;
    case 'gainLoss':
      return (h.unrealizedGain as number) ?? 0;
    case 'expenseRatio':
      return h.expenseRatio ?? 0;
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function HoldingsReviewTable({
  holdings,
  onEdit,
  onRemove,
  editable = false,
}: HoldingsReviewTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('marketValue');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  // ------- Sorting -------

  const handleSort = useCallback(
    (key: SortKey) => {
      if (sortKey === key) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortKey(key);
        setSortDir('asc');
      }
    },
    [sortKey],
  );

  const sortedIndices = useMemo(() => {
    const indices = holdings.map((_, i) => i);
    indices.sort((a, b) => {
      const va = getSortValue(holdings[a], sortKey);
      const vb = getSortValue(holdings[b], sortKey);

      if (typeof va === 'string' && typeof vb === 'string') {
        return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
      }
      return sortDir === 'asc'
        ? (va as number) - (vb as number)
        : (vb as number) - (va as number);
    });
    return indices;
  }, [holdings, sortKey, sortDir]);

  // ------- Totals -------

  const totals = useMemo(() => {
    let totalValue = 0;
    let totalCostBasis = 0;
    let totalGL = 0;
    let totalShares = 0;
    let hasCostBasis = false;

    for (const h of holdings) {
      totalValue += h.marketValue as number;
      totalShares += h.quantity;
      if (h.costBasis !== null) {
        totalCostBasis += h.costBasis as number;
        hasCostBasis = true;
      }
      if (h.unrealizedGain !== null) {
        totalGL += h.unrealizedGain as number;
      }
    }

    const weightedExpRatio = holdings.reduce((sum, h) => {
      const weight = totalValue > 0 ? (h.marketValue as number) / totalValue : 0;
      return sum + (h.expenseRatio ?? 0) * weight;
    }, 0);

    return {
      totalValue,
      totalCostBasis: hasCostBasis ? totalCostBasis : null,
      totalGL: hasCostBasis ? totalGL : null,
      totalShares,
      weightedExpRatio,
    };
  }, [holdings]);

  // ------- Render -------

  return (
    <div className="w-full space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text">
          Holdings ({holdings.length})
        </h3>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-border-subtle">
        <table className="w-full text-sm">
          <thead className="border-b border-border-subtle bg-transparent">
            <tr>
              {COLUMNS.map((col) => {
                const isSorted = sortKey === col.key;
                return (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col.key)}
                    className={cn(
                      'px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-text-muted cursor-pointer select-none',
                      col.align === 'right' && 'text-right',
                      col.align === 'center' && 'text-center',
                      col.width,
                    )}
                  >
                    <span className="inline-flex items-center gap-1">
                      {col.label}
                      <span className="text-text-faint">
                        {isSorted && sortDir === 'asc' && <ArrowUp className="h-3 w-3" />}
                        {isSorted && sortDir === 'desc' && <ArrowDown className="h-3 w-3" />}
                        {!isSorted && <ArrowUpDown className="h-3 w-3" />}
                      </span>
                    </span>
                  </th>
                );
              })}
              {editable && <th className="w-20 px-3 py-2.5" />}
            </tr>
          </thead>

          <tbody className="divide-y divide-limestone-100 bg-text">
            {sortedIndices.map((origIdx) => {
              const h = holdings[origIdx];
              const gl = h.unrealizedGain;

              return (
                <tr
                  key={origIdx}
                  className="transition-colors hover:bg-surface-subtle"
                >
                  {/* Ticker */}
                  <td className="px-3 py-2 font-mono font-semibold text-text">
                    {h.ticker ?? '--'}
                  </td>

                  {/* Description */}
                  <td className="px-3 py-2 text-text-muted truncate max-w-[200px]">
                    {h.description}
                  </td>

                  {/* Asset Class */}
                  <td className="px-3 py-2 text-xs text-text-muted">
                    {fmtAssetClass(h.assetClass)}
                  </td>

                  {/* Shares */}
                  <td className="px-3 py-2 text-right tabular-nums text-text-muted">
                    {fmtShares(h.quantity)}
                  </td>

                  {/* Price */}
                  <td className="px-3 py-2 text-right tabular-nums text-text-muted">
                    {fmtMoney(h.price)}
                  </td>

                  {/* Market Value */}
                  <td className="px-3 py-2 text-right tabular-nums text-text font-medium">
                    {fmtMoney(h.marketValue)}
                  </td>

                  {/* Cost Basis */}
                  <td className="px-3 py-2 text-right tabular-nums text-text-muted">
                    {fmtMoney(h.costBasis)}
                  </td>

                  {/* Gain/Loss */}
                  <td
                    className={cn(
                      'px-3 py-2 text-right tabular-nums font-medium',
                      gl !== null && (gl as number) >= 0 && 'text-success-700',
                      gl !== null && (gl as number) < 0 && 'text-critical-700',
                      gl === null && 'text-text-faint',
                    )}
                  >
                    {gl !== null ? fmtMoney(gl) : '--'}
                    {h.gainPct !== null && gl !== null && (
                      <span className="ml-1 text-[10px]">
                        ({(h.gainPct * 100).toFixed(1)}%)
                      </span>
                    )}
                  </td>

                  {/* Expense Ratio */}
                  <td className="px-3 py-2 text-right tabular-nums text-text-muted">
                    {fmtPct(h.expenseRatio)}
                  </td>

                  {/* Actions */}
                  {editable && (
                    <td className="px-3 py-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {onEdit && (
                          <button
                            type="button"
                            onClick={() => onEdit(origIdx, h)}
                            className="rounded p-1 text-text-faint hover:bg-accent-primary/10 hover:text-accent-primarySoft transition-colors"
                            aria-label={`Edit ${h.ticker ?? h.description}`}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {onRemove && (
                          <button
                            type="button"
                            onClick={() => onRemove(origIdx)}
                            className="rounded p-1 text-text-faint hover:bg-critical-50 hover:text-critical-600 transition-colors"
                            aria-label={`Remove ${h.ticker ?? h.description}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>

          {/* Totals row */}
          {holdings.length > 0 && (
            <tfoot className="border-t-2 border-border-subtle bg-transparent">
              <tr className="font-semibold">
                <td className="px-3 py-2.5 text-text" colSpan={3}>
                  Total ({holdings.length} holdings)
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums text-text-muted">
                  {fmtShares(totals.totalShares)}
                </td>
                <td className="px-3 py-2.5" />
                <td className="px-3 py-2.5 text-right tabular-nums text-text">
                  {fmtMoney(totals.totalValue as MoneyCents)}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums text-text-muted">
                  {totals.totalCostBasis !== null ? fmtMoney(totals.totalCostBasis as MoneyCents) : '--'}
                </td>
                <td
                  className={cn(
                    'px-3 py-2.5 text-right tabular-nums',
                    totals.totalGL !== null && totals.totalGL >= 0 && 'text-success-700',
                    totals.totalGL !== null && totals.totalGL < 0 && 'text-critical-700',
                  )}
                >
                  {totals.totalGL !== null ? fmtMoney(totals.totalGL as MoneyCents) : '--'}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums text-text-muted">
                  {fmtPct(totals.weightedExpRatio)}
                </td>
                {editable && <td className="px-3 py-2.5" />}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}

HoldingsReviewTable.displayName = 'HoldingsReviewTable';
