'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth, useToast } from '@/lib/tax-planning/auth-context';
import { ReturnLineTable } from '@/components/tax-planning/ReturnLineTable';
import { ReconcileBanner } from '@/components/tax-planning/ReconcileBanner';
import type {
  TaxReturn,
  Scenario,
  ExtractedField,
  MoneyCents,
  FilingStatus,
} from '@/lib/tax-planning/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const fmtCurrency = (cents: number): string =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);

const FILING_STATUS_LABELS: Record<FilingStatus, string> = {
  SINGLE: 'Single',
  MFJ: 'Married Filing Jointly',
  MFS: 'Married Filing Separately',
  HOH: 'Head of Household',
  QW: 'Qualifying Widow(er)',
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ReturnLine {
  taxLineRef: string;
  valueCents: number;
  source: string;
  confidence?: number;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ReturnOverviewPage() {
  const params = useParams();
  const router = useRouter();
  const { token } = useAuth();
  const { addToast } = useToast();

  const returnId = params.returnId as string;

  const [taxReturn, setTaxReturn] = useState<TaxReturn | null>(null);
  const [lines, setLines] = useState<ReturnLine[]>([]);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creatingScenario, setCreatingScenario] = useState(false);
  const [showScenarios, setShowScenarios] = useState(false);

  // -----------------------------------------------------------------------
  // Fetch return details + extracted lines
  // -----------------------------------------------------------------------

  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);

    try {
      // Fetch return details
      const returnRes = await fetch(`/api/v1/returns/${returnId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!returnRes.ok) throw new Error('Failed to load tax return details.');
      const returnData: TaxReturn = await returnRes.json();
      setTaxReturn(returnData);

      // Fetch extracted lines
      const linesRes = await fetch(`/api/v1/returns/${returnId}/lines`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!linesRes.ok) throw new Error('Failed to load extracted fields.');
      const linesData: ExtractedField[] = await linesRes.json();
      setLines(
        linesData.map((f) => ({
          taxLineRef: f.tax_line_ref as string,
          valueCents: (f.value_cents ?? 0) as number,
          source: f.source_kind,
          confidence: f.confidence,
        })),
      );

      // Fetch scenarios for this return
      const scenariosRes = await fetch(
        `/api/v1/scenarios?returnId=${returnData.return_id}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (scenariosRes.ok) {
        const scenariosData: Scenario[] = await scenariosRes.json();
        setScenarios(scenariosData);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred.';
      setError(msg);
      addToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  }, [token, returnId, addToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // -----------------------------------------------------------------------
  // Actions
  // -----------------------------------------------------------------------

  const handleCreateScenario = useCallback(async () => {
    if (!token || !taxReturn) return;
    setCreatingScenario(true);
    try {
      const res = await fetch('/api/v1/scenarios', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          returnId: taxReturn.return_id,
          name: `What-If Scenario ${scenarios.length + 1}`,
          isBaseline: false,
        }),
      });
      if (!res.ok) throw new Error('Failed to create scenario.');
      const newScenario: Scenario = await res.json();
      addToast('Scenario created successfully.', 'success');
      router.push(`/tax-planning/scenarios/${newScenario.scenario_id}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create scenario.';
      addToast(msg, 'error');
    } finally {
      setCreatingScenario(false);
    }
  }, [token, taxReturn, scenarios.length, addToast, router]);

  const handleReconcile = useCallback(() => {
    addToast('Reconciliation review will be available in a future update.', 'info');
  }, [addToast]);

  // -----------------------------------------------------------------------
  // Derived state
  // -----------------------------------------------------------------------

  const lowConfidenceCount = lines.filter(
    (l) => l.confidence !== undefined && l.confidence < 0.9,
  ).length;

  // -----------------------------------------------------------------------
  // Loading skeleton
  // -----------------------------------------------------------------------

  if (loading) {
    return (
      <div className="space-y-6 bg-canvas">
        {/* Title skeleton */}
        <div className="h-8 w-72 rounded bg-surface-subtle animate-pulse" />

        {/* Summary cards skeleton */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-border-subtle bg-surface-soft backdrop-blur-xl p-5 shadow-sm"
            >
              <div className="h-3 w-20 rounded bg-surface-subtle animate-pulse mb-3" />
              <div className="h-6 w-32 rounded bg-surface-subtle animate-pulse" />
            </div>
          ))}
        </div>

        {/* Table skeleton */}
        <div className="rounded-2xl border border-border-subtle bg-surface-soft backdrop-blur-xl p-6 shadow-sm">
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-4 rounded bg-surface-subtle animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // -----------------------------------------------------------------------
  // Error state
  // -----------------------------------------------------------------------

  if (error || !taxReturn) {
    return (
      <div className="bg-canvas">
        <div className="rounded-lg border border-critical-200 bg-critical-50 p-8 text-center">
          <h2 className="text-lg font-semibold text-critical-700">
            Error Loading Tax Return
          </h2>
          <p className="mt-2 text-sm text-critical-600">
            {error || 'Tax return not found.'}
          </p>
          <button
            type="button"
            onClick={fetchData}
            className="mt-4 inline-flex h-10 items-center rounded-lg bg-accent-primary px-5 text-sm font-medium text-text hover:bg-accent-primary/80 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <div className="space-y-6 bg-canvas">
      {/* Page title */}
      <div>
        <h1 className="text-2xl font-bold text-text">
          {taxReturn.tax_year} Tax Return &ndash;{' '}
          {FILING_STATUS_LABELS[taxReturn.filing_status] ?? taxReturn.filing_status}
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          Return ID: {taxReturn.return_id}
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-border-subtle bg-surface-soft backdrop-blur-xl p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
            Filing Status
          </p>
          <p className="mt-1 text-lg font-semibold text-text">
            {FILING_STATUS_LABELS[taxReturn.filing_status] ?? taxReturn.filing_status}
          </p>
        </div>

        <div className="rounded-2xl border border-border-subtle bg-surface-soft backdrop-blur-xl p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
            Adjusted Gross Income
          </p>
          <p className="mt-1 text-lg font-semibold text-text">
            {taxReturn.agi_cents != null
              ? fmtCurrency(taxReturn.agi_cents as number)
              : '--'}
          </p>
        </div>

        <div className="rounded-2xl border border-border-subtle bg-surface-soft backdrop-blur-xl p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
            Taxable Income
          </p>
          <p className="mt-1 text-lg font-semibold text-text">
            {taxReturn.taxable_income_cents != null
              ? fmtCurrency(taxReturn.taxable_income_cents as number)
              : '--'}
          </p>
        </div>

        <div className="rounded-2xl border border-border-subtle bg-surface-soft backdrop-blur-xl p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
            Total Tax
          </p>
          <p className="mt-1 text-lg font-semibold text-text">
            {(() => {
              const taxLine = lines.find((l) =>
                l.taxLineRef.includes('l16:tax'),
              );
              return taxLine ? fmtCurrency(taxLine.valueCents) : '--';
            })()}
          </p>
        </div>
      </div>

      {/* Reconcile banner */}
      {lowConfidenceCount > 0 && (
        <ReconcileBanner
          lowConfidenceCount={lowConfidenceCount}
          onReconcile={handleReconcile}
        />
      )}

      {/* Extracted fields table */}
      <div>
        <h2 className="mb-3 text-lg font-semibold text-text">
          Extracted Fields
        </h2>
        {lines.length === 0 ? (
          <div className="rounded-2xl border border-border-subtle bg-surface-soft backdrop-blur-xl p-8 text-center shadow-sm">
            <p className="text-sm text-text-muted">
              No extracted fields available for this return.
            </p>
          </div>
        ) : (
          <ReturnLineTable lines={lines} />
        )}
      </div>

      {/* Actions */}
      <div className="rounded-2xl border border-border-subtle bg-surface-soft backdrop-blur-xl p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-text">Actions</h2>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleCreateScenario}
            disabled={creatingScenario}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-accent-primary px-5 text-sm font-medium text-text hover:bg-accent-primary/80 disabled:opacity-50 disabled:pointer-events-none transition-colors"
          >
            {creatingScenario ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-text border-t-transparent" />
                Creating...
              </>
            ) : (
              'Create Scenario'
            )}
          </button>

          {scenarios.length > 0 && (
            <button
              type="button"
              onClick={() => setShowScenarios((v) => !v)}
              className="inline-flex h-10 items-center rounded-2xl border border-border-subtle bg-surface-soft backdrop-blur-xl px-5 text-sm font-medium text-text-muted hover:bg-surface-subtle transition-colors"
            >
              View Scenarios ({scenarios.length})
            </button>
          )}
        </div>

        {/* Scenario list */}
        {showScenarios && scenarios.length > 0 && (
          <div className="mt-4 space-y-2">
            {scenarios.map((s) => (
              <button
                key={s.scenario_id}
                type="button"
                onClick={() =>
                  router.push(`/tax-planning/scenarios/${s.scenario_id}`)
                }
                className="flex w-full items-center justify-between rounded-lg border border-border-subtle bg-transparent px-4 py-3 text-left text-sm transition-colors hover:bg-surface-subtle"
              >
                <span className="font-medium text-text">{s.name}</span>
                {s.is_baseline && (
                  <span className="rounded-full bg-accent-primary/15 px-2 py-0.5 text-[10px] font-semibold text-accent-primarySoft">
                    Baseline
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
