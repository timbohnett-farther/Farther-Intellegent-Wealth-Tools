'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth, useToast } from '@/lib/tax-planning/auth-context';
import type { Holding } from '@/lib/proposal-engine/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ScanRecord {
  scanId: string;
  filename: string;
  institution: string;
  holdingsCount: number;
  totalValue: number;
  confidence: number;
  scannedAt: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SUPPORTED_INSTITUTIONS = [
  'Schwab', 'Fidelity', 'Vanguard', 'TD Ameritrade', 'E*TRADE', 'Merrill Lynch',
  'Morgan Stanley', 'UBS', 'Raymond James', 'LPL Financial', 'Pershing', 'Interactive Brokers',
];

const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

function holdingsToCsv(holdings: Holding[]): string {
  const headers = ['Ticker', 'Name', 'Asset Class', 'Shares', 'Price', 'Market Value', 'Expense Ratio'];
  const rows = holdings.map((h) => [
    h.ticker, `"${(h.name || h.description || '').replace(/"/g, '""')}"`, h.assetClass, h.shares ?? h.quantity,
    (h.price as number) / 100, (h.marketValue as number) / 100, h.expenseRatio ?? 0,
  ]);
  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

// ---------------------------------------------------------------------------
// Statement Scanner Page
// ---------------------------------------------------------------------------

export default function StatementScannerPage() {
  const { token } = useAuth();
  const { addToast } = useToast();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [scanFile, setScanFile] = useState<File | null>(null);
  const [scanning, setScanning] = useState(false);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [recentScans, setRecentScans] = useState<ScanRecord[]>([]);
  const [showInstitutions, setShowInstitutions] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // Fetch recent scans
  useEffect(() => {
    if (!token) return;
    setLoadingHistory(true);
    fetch('/api/v1/scanner/history', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.ok ? r.json() : [])
      .then((data) => setRecentScans(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoadingHistory(false));
  }, [token]);

  const handleScan = useCallback(async () => {
    if (!scanFile || !token) return;
    setScanning(true);
    try {
      const formData = new FormData();
      formData.append('file', scanFile);
      const res = await fetch('/api/v1/scanner/scan', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) throw new Error('Scan failed');
      const data = await res.json();
      const scanned: Holding[] = data.holdings || [];
      setHoldings(scanned);
      addToast(`Extracted ${scanned.length} holdings`, 'success');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Scan failed', 'error');
    } finally {
      setScanning(false);
    }
  }, [scanFile, token, addToast]);

  const handleExportCsv = useCallback(() => {
    if (holdings.length === 0) {
      addToast('No holdings to export', 'warning');
      return;
    }
    const csv = holdingsToCsv(holdings);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `holdings-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    addToast('Holdings exported to CSV', 'success');
  }, [holdings, addToast]);

  const totalValue = holdings.reduce((s, h) => s + (h.marketValue as number), 0);

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-charcoal-900">Statement Scanner</h1>
          <p className="mt-1 text-sm text-charcoal-500">Upload brokerage statements to extract holdings using AI.</p>
        </div>
        <div className="flex items-center gap-3">
          {holdings.length > 0 && (
            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex items-center gap-2 rounded-lg border border-limestone-300 px-4 py-2.5 text-sm font-medium text-charcoal-700 hover:bg-limestone-50"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              Export CSV
            </button>
          )}
          <Link href="/tax-planning/proposals" className="text-sm font-medium text-charcoal-500 hover:text-charcoal-700">
            Back to Proposals
          </Link>
        </div>
      </div>

      {/* Upload zone */}
      <div className="rounded-lg border border-limestone-200 bg-white p-6 shadow-sm">
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const file = e.dataTransfer.files[0];
            if (file) setScanFile(file);
          }}
          className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-limestone-300 bg-limestone-50 p-12 cursor-pointer hover:border-brand-400 hover:bg-brand-50/20 transition-colors"
        >
          <svg className="h-12 w-12 text-charcoal-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
          <p className="text-sm font-medium text-charcoal-700">
            {scanFile ? scanFile.name : 'Drop a brokerage statement here or click to browse'}
          </p>
          <p className="text-xs text-charcoal-500 mt-1">PDF, PNG, or JPG up to 10MB</p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) setScanFile(file);
            }}
          />
        </div>
        {scanFile && (
          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              onClick={handleScan}
              disabled={scanning}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
            >
              {scanning ? (
                <><div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> Scanning...</>
              ) : 'Scan Statement'}
            </button>
            <button
              type="button"
              onClick={() => setScanFile(null)}
              className="text-sm text-charcoal-500 hover:text-charcoal-700"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Supported Institutions */}
      <div className="rounded-lg border border-limestone-200 bg-white shadow-sm overflow-hidden">
        <button
          type="button"
          onClick={() => setShowInstitutions(!showInstitutions)}
          className="flex w-full items-center justify-between px-6 py-4 text-left"
        >
          <span className="text-sm font-semibold text-charcoal-900">Supported Institutions</span>
          <svg className={`h-4 w-4 text-charcoal-500 transition-transform ${showInstitutions ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </button>
        {showInstitutions && (
          <div className="border-t border-limestone-200 px-6 py-4">
            <div className="flex flex-wrap gap-2">
              {SUPPORTED_INSTITUTIONS.map((inst) => (
                <span key={inst} className="rounded-full bg-limestone-100 px-3 py-1 text-xs font-medium text-charcoal-700">{inst}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Scan results */}
      {holdings.length > 0 && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="rounded-lg border border-limestone-200 bg-white p-4 shadow-sm">
              <p className="text-xs text-charcoal-500">Total Value</p>
              <p className="text-lg font-bold text-charcoal-900 tabular-nums">{fmt.format(totalValue / 100)}</p>
            </div>
            <div className="rounded-lg border border-limestone-200 bg-white p-4 shadow-sm">
              <p className="text-xs text-charcoal-500">Holdings</p>
              <p className="text-lg font-bold text-charcoal-900 tabular-nums">{holdings.length}</p>
            </div>
            <div className="rounded-lg border border-limestone-200 bg-white p-4 shadow-sm">
              <p className="text-xs text-charcoal-500">Avg Expense Ratio</p>
              <p className="text-lg font-bold text-charcoal-900 tabular-nums">
                {holdings.length > 0
                  ? (holdings.reduce((s, h) => s + (h.expenseRatio ?? 0) * ((h.marketValue as number) / (totalValue || 1)), 0) * 100).toFixed(2) + '%'
                  : '--'}
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-limestone-200 bg-white shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-limestone-200">
              <h3 className="text-sm font-semibold text-charcoal-900">Extracted Holdings</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-limestone-200">
                <thead className="bg-limestone-50">
                  <tr>
                    {['Ticker', 'Name', 'Asset Class', 'Shares', 'Price', 'Market Value', 'Confidence'].map((h) => (
                      <th key={h} className="px-4 py-2 text-left text-xs font-semibold uppercase text-charcoal-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-limestone-100">
                  {holdings.map((h, idx) => (
                    <tr key={(h.ticker || '') + idx} className="hover:bg-limestone-50">
                      <td className="px-4 py-2 text-sm font-medium text-charcoal-900">{h.ticker}</td>
                      <td className="px-4 py-2 text-sm text-charcoal-700 max-w-[200px] truncate">{h.name || h.description}</td>
                      <td className="px-4 py-2 text-xs text-charcoal-500">{h.assetClass.replace(/_/g, ' ')}</td>
                      <td className="px-4 py-2 text-sm text-charcoal-700 tabular-nums">{(h.shares ?? h.quantity).toLocaleString()}</td>
                      <td className="px-4 py-2 text-sm text-charcoal-700 tabular-nums">${((h.price as number) / 100).toFixed(2)}</td>
                      <td className="px-4 py-2 text-sm text-charcoal-700 tabular-nums">{fmt.format((h.marketValue as number) / 100)}</td>
                      <td className="px-4 py-2">
                        <span className="inline-flex items-center rounded-full bg-success-100 px-2 py-0.5 text-xs font-medium text-success-700">High</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Recent scans history */}
      <div className="rounded-lg border border-limestone-200 bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-limestone-200">
          <h3 className="text-sm font-semibold text-charcoal-900">Recent Scans</h3>
        </div>
        {loadingHistory ? (
          <div className="p-6 space-y-3 animate-pulse">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex gap-4 py-2">
                <div className="h-4 w-40 rounded bg-limestone-200" />
                <div className="h-4 w-20 rounded bg-limestone-200" />
                <div className="h-4 w-24 rounded bg-limestone-200 flex-1" />
              </div>
            ))}
          </div>
        ) : recentScans.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm text-charcoal-500">No recent scans. Upload a statement above to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-limestone-200">
              <thead className="bg-limestone-50">
                <tr>
                  {['Filename', 'Institution', 'Holdings', 'Total Value', 'Confidence', 'Scanned'].map((h) => (
                    <th key={h} className="px-4 py-2 text-left text-xs font-semibold uppercase text-charcoal-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-limestone-100">
                {recentScans.map((scan) => (
                  <tr key={scan.scanId} className="hover:bg-limestone-50">
                    <td className="px-4 py-2 text-sm font-medium text-charcoal-900">{scan.filename}</td>
                    <td className="px-4 py-2 text-sm text-charcoal-700">{scan.institution}</td>
                    <td className="px-4 py-2 text-sm text-charcoal-700 tabular-nums">{scan.holdingsCount}</td>
                    <td className="px-4 py-2 text-sm text-charcoal-700 tabular-nums">{fmt.format(scan.totalValue / 100)}</td>
                    <td className="px-4 py-2">
                      <span className={`text-xs font-medium ${scan.confidence >= 0.9 ? 'text-success-700' : scan.confidence >= 0.7 ? 'text-warning-700' : 'text-critical-700'}`}>
                        {(scan.confidence * 100).toFixed(0)}%
                      </span>
                    </td>
                    <td className="px-4 py-2 text-sm text-charcoal-500">{formatDate(scan.scannedAt)}</td>
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
