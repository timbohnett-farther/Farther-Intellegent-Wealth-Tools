'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth, useToast } from '@/lib/tax-planning/auth-context';
import type { StatementScanResult, Holding } from '@/lib/proposal-engine/types';
import { StatementUploader } from '@/components/proposal-engine/StatementUploader';
import { HoldingsReviewTable } from '@/components/proposal-engine/HoldingsReviewTable';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function holdingsToCsv(holdings: Holding[]): string {
  const headers = [
    'Ticker',
    'Description',
    'Asset Class',
    'Quantity',
    'Price',
    'Market Value',
    'Cost Basis',
    'Unrealized G/L',
    'Holding Period',
    'Expense Ratio',
    'Dividend Yield',
    'Account Type',
    'Account Name',
  ];

  const rows = holdings.map((h) => [
    h.ticker ?? '',
    `"${(h.description ?? '').replace(/"/g, '""')}"`,
    h.assetClass,
    h.quantity,
    (h.price as number) / 100,
    (h.marketValue as number) / 100,
    h.costBasis != null ? (h.costBasis as number) / 100 : '',
    h.unrealizedGain != null ? (h.unrealizedGain as number) / 100 : '',
    h.holdingPeriod ?? '',
    h.expenseRatio != null ? h.expenseRatio : '',
    h.dividendYield != null ? h.dividendYield : '',
    h.accountType,
    `"${(h.accountName ?? '').replace(/"/g, '""')}"`,
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

function downloadCsv(csv: string, filename: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function StatementScannerPage() {
  const { token } = useAuth();
  const { addToast } = useToast();
  const router = useRouter();

  const [scanResults, setScanResults] = useState<StatementScanResult[]>([]);
  const [holdings, setHoldings] = useState<Holding[]>([]);

  const handleScanComplete = useCallback((results: StatementScanResult[]) => {
    setScanResults(results);
    const allHoldings = results.flatMap((r) => r.holdings);
    setHoldings(allHoldings);
    addToast(`Scanned ${results.length} statement(s), ${allHoldings.length} holdings found`, 'success');
  }, [addToast]);

  const handleHoldingEdit = useCallback((index: number, updates: Partial<Holding>) => {
    setHoldings((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], ...updates };
      return updated;
    });
  }, []);

  const handleHoldingRemove = useCallback((index: number) => {
    setHoldings((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleHoldingAdd = useCallback(() => {
    setHoldings((prev) => [
      ...prev,
      {
        ticker: '',
        cusip: null,
        description: '',
        assetClass: 'OTHER',
        quantity: 0,
        price: 0 as any,
        marketValue: 0 as any,
        costBasis: null,
        unrealizedGain: null,
        gainPct: null,
        holdingPeriod: null,
        expenseRatio: null,
        dividendYield: null,
        accountType: 'TAXABLE',
        accountName: 'Manual Entry',
      },
    ]);
  }, []);

  const handleExportCsv = useCallback(() => {
    if (holdings.length === 0) {
      addToast('No holdings to export', 'error');
      return;
    }
    const csv = holdingsToCsv(holdings);
    const timestamp = new Date().toISOString().slice(0, 10);
    downloadCsv(csv, `holdings-export-${timestamp}.csv`);
    addToast('Holdings exported to CSV', 'success');
  }, [holdings, addToast]);

  // Aggregate stats
  const totalValue = holdings.reduce((sum, h) => sum + (h.marketValue as number), 0);
  const totalHoldings = holdings.length;
  const accountCount = new Set(holdings.map((h) => h.accountName)).size;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-charcoal-900">Statement Scanner</h1>
          <p className="mt-1 text-sm text-charcoal-500">
            Upload brokerage statements to extract and review holdings data.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {holdings.length > 0 && (
            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex items-center gap-2 rounded-lg border border-limestone-300 bg-white px-4 py-2.5 text-sm font-medium text-charcoal-700 hover:bg-limestone-50 transition-colors"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              Export CSV
            </button>
          )}
          <Link
            href="/tax-planning/proposals"
            className="text-sm font-medium text-charcoal-500 hover:text-charcoal-700 transition-colors"
          >
            Back to Proposals
          </Link>
        </div>
      </div>

      {/* Stats Bar (shown when holdings exist) */}
      {holdings.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-limestone-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-charcoal-500">Total Value</p>
            <p className="mt-2 text-2xl font-bold text-charcoal-900 tabular-nums">{fmt.format(totalValue / 100)}</p>
          </div>
          <div className="rounded-lg border border-limestone-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-charcoal-500">Holdings</p>
            <p className="mt-2 text-2xl font-bold text-charcoal-900 tabular-nums">{totalHoldings}</p>
          </div>
          <div className="rounded-lg border border-limestone-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-charcoal-500">Accounts</p>
            <p className="mt-2 text-2xl font-bold text-charcoal-900 tabular-nums">{accountCount}</p>
          </div>
        </div>
      )}

      {/* Statement Uploader */}
      <div className="rounded-lg border border-limestone-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-charcoal-900 mb-4">Upload Statements</h2>
        <StatementUploader
          onScanComplete={handleScanComplete}
          existingScans={scanResults}
        />
      </div>

      {/* Holdings Review */}
      {holdings.length > 0 && (
        <div className="rounded-lg border border-limestone-200 bg-white p-6 shadow-sm">
          <HoldingsReviewTable
            holdings={holdings}
            onEdit={handleHoldingEdit}
            onRemove={handleHoldingRemove}
            onAdd={handleHoldingAdd}
          />
        </div>
      )}

      {/* Empty state */}
      {holdings.length === 0 && scanResults.length === 0 && (
        <div className="rounded-lg border border-limestone-200 bg-white p-12 text-center shadow-sm">
          <svg className="mx-auto h-16 w-16 text-charcoal-200 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
          <p className="text-base font-semibold text-charcoal-700">No statements scanned yet</p>
          <p className="mt-2 text-sm text-charcoal-500">
            Upload brokerage statements above to extract holdings data. Supports PDF, JPG, PNG, and TIFF files.
          </p>
        </div>
      )}
    </div>
  );
}
