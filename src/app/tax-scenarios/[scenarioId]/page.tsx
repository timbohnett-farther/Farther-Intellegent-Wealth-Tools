'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth, useToast } from '@/lib/tax-planning/auth-context';
import { ScenarioSideNav } from '@/components/tax-planning/ScenarioSideNav';
import { OverrideGrid } from '@/components/tax-planning/OverrideGrid';
import { ComputeButton } from '@/components/tax-planning/ComputeButton';
import type {
  Scenario,
  ScenarioOverride,
  ComputeResult,
  MoneyCents,
  OverrideMode,
  TaxLineRef,
} from '@/lib/tax-planning/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const fmtCurrency = (cents: number): string =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);

const fmtPercent = (bps: number): string =>
  `${(bps / 100).toFixed(2)}%`;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ScenarioWithOverrides extends Scenario {
  overrides: ScenarioOverride[];
}

interface ComparisonRow {
  label: string;
  baselineCents: number;
  scenarioCents: number;
  deltaCents: number;
  isRate?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ScenarioBuilderPage() {
  const params = useParams();
  const router = useRouter();
  const { token } = useAuth();
  const { addToast } = useToast();

  const scenarioId = params.scenarioId as string;

  // State
  const [scenario, setScenario] = useState<ScenarioWithOverrides | null>(null);
  const [allScenarios, setAllScenarios] = useState<Scenario[]>([]);
  const [overrides, setOverrides] = useState<ScenarioOverride[]>([]);
  const [computeResult, setComputeResult] = useState<ComputeResult | null>(null);
  const [baselineResult, setBaselineResult] = useState<ComputeResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState('');
  const [savingOverrides, setSavingOverrides] = useState(false);

  // -----------------------------------------------------------------------
  // Fetch scenario data
  // -----------------------------------------------------------------------

  const fetchScenario = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);

    try {
      // Fetch current scenario with overrides
      const res = await fetch(`/api/v1/scenarios/${scenarioId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load scenario.');
      const data: ScenarioWithOverrides = await res.json();
      setScenario(data);
      setOverrides(data.overrides ?? []);
      setNameValue(data.name);

      // Fetch all scenarios for this return (side nav)
      const scenariosRes = await fetch(
        `/api/v1/scenarios?returnId=${data.return_id}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (scenariosRes.ok) {
        const scenariosData: Scenario[] = await scenariosRes.json();
        setAllScenarios(scenariosData);

        // If not baseline, fetch baseline result for comparison
        if (!data.is_baseline) {
          const baseline = scenariosData.find((s) => s.is_baseline);
          if (baseline) {
            try {
              const baselineRes = await fetch(
                `/api/v1/scenarios/${baseline.scenario_id}/compute`,
                {
                  method: 'POST',
                  headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                  },
                },
              );
              if (baselineRes.ok) {
                const baselineData: ComputeResult = await baselineRes.json();
                setBaselineResult(baselineData);
              }
            } catch {
              // Baseline comparison is optional; continue without it
            }
          }
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred.';
      setError(msg);
      addToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  }, [token, scenarioId, addToast]);

  useEffect(() => {
    fetchScenario();
  }, [fetchScenario]);

  // -----------------------------------------------------------------------
  // Override management
  // -----------------------------------------------------------------------

  const handleAddOverride = useCallback(() => {
    const newOverride: ScenarioOverride = {
      override_id: `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      scenario_id: scenarioId,
      target_tax_line_ref: '' as TaxLineRef,
      mode: 'ABSOLUTE' as OverrideMode,
      amount_cents: 0 as MoneyCents,
    };
    setOverrides((prev) => [...prev, newOverride]);
  }, [scenarioId]);

  const handleRemoveOverride = useCallback((overrideId: string) => {
    setOverrides((prev) => prev.filter((o) => o.override_id !== overrideId));
  }, []);

  const handleChangeOverride = useCallback(
    (overrideId: string, updates: Partial<ScenarioOverride>) => {
      setOverrides((prev) =>
        prev.map((o) => (o.override_id === overrideId ? { ...o, ...updates } : o)),
      );
    },
    [],
  );

  // -----------------------------------------------------------------------
  // Save overrides
  // -----------------------------------------------------------------------

  const saveOverrides = useCallback(async () => {
    if (!token || !scenario) return;
    setSavingOverrides(true);
    try {
      const res = await fetch(`/api/v1/scenarios/${scenarioId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: nameValue,
          overrides: overrides.map((o) => ({
            target_tax_line_ref: o.target_tax_line_ref,
            mode: o.mode,
            amount_cents: o.amount_cents,
          })),
        }),
      });
      if (!res.ok) throw new Error('Failed to save overrides.');
      addToast('Overrides saved successfully.', 'success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save overrides.';
      addToast(msg, 'error');
    } finally {
      setSavingOverrides(false);
    }
  }, [token, scenarioId, scenario, nameValue, overrides, addToast]);

  // -----------------------------------------------------------------------
  // Compute scenario
  // -----------------------------------------------------------------------

  const handleCompute = useCallback(
    async (id: string) => {
      if (!token) return;

      // Save overrides first
      await saveOverrides();

      const res = await fetch(`/api/v1/scenarios/${id}/compute`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!res.ok) throw new Error('Computation failed.');
      const result: ComputeResult = await res.json();
      setComputeResult(result);
      addToast('Computation completed successfully.', 'success');
    },
    [token, saveOverrides, addToast],
  );

  // -----------------------------------------------------------------------
  // Scenario name editing
  // -----------------------------------------------------------------------

  const handleNameSave = useCallback(async () => {
    if (!token || !nameValue.trim()) return;
    setEditingName(false);
    try {
      const res = await fetch(`/api/v1/scenarios/${scenarioId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: nameValue.trim() }),
      });
      if (!res.ok) throw new Error('Failed to update scenario name.');
      setScenario((prev) => (prev ? { ...prev, name: nameValue.trim() } : prev));
      addToast('Scenario name updated.', 'success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update name.';
      addToast(msg, 'error');
    }
  }, [token, scenarioId, nameValue, addToast]);

  // -----------------------------------------------------------------------
  // Side nav handlers
  // -----------------------------------------------------------------------

  const handleSelectScenario = useCallback(
    (id: string) => {
      router.push(`/tax-planning/scenarios/${id}`);
    },
    [router],
  );

  const handleCreateNewScenario = useCallback(async () => {
    if (!token || !scenario) return;
    try {
      const res = await fetch('/api/v1/scenarios', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          returnId: scenario.return_id,
          name: `What-If Scenario ${allScenarios.length + 1}`,
          isBaseline: false,
        }),
      });
      if (!res.ok) throw new Error('Failed to create scenario.');
      const newScenario: Scenario = await res.json();
      addToast('Scenario created.', 'success');
      router.push(`/tax-planning/scenarios/${newScenario.scenario_id}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create scenario.';
      addToast(msg, 'error');
    }
  }, [token, scenario, allScenarios.length, addToast, router]);

  // -----------------------------------------------------------------------
  // Derived: comparison table rows
  // -----------------------------------------------------------------------

  const comparisonRows: ComparisonRow[] = (() => {
    if (!computeResult || !baselineResult || scenario?.is_baseline) return [];

    const bMetrics = baselineResult.metrics;
    const sMetrics = computeResult.metrics;

    const taxableKey = 'federal.taxable_income';
    const totalTaxKey = 'federal.total_tax';
    const effectiveRateKey = 'federal.effective_rate';
    const emrKey = 'federal.emr_next_1000';

    return [
      {
        label: 'Federal Taxable Income',
        baselineCents: (bMetrics[taxableKey] ?? 0) as number,
        scenarioCents: (sMetrics[taxableKey] ?? 0) as number,
        deltaCents: ((sMetrics[taxableKey] ?? 0) as number) - ((bMetrics[taxableKey] ?? 0) as number),
      },
      {
        label: 'Total Tax',
        baselineCents: (bMetrics[totalTaxKey] ?? 0) as number,
        scenarioCents: (sMetrics[totalTaxKey] ?? 0) as number,
        deltaCents: ((sMetrics[totalTaxKey] ?? 0) as number) - ((bMetrics[totalTaxKey] ?? 0) as number),
      },
      {
        label: 'Effective Tax Rate',
        baselineCents: (bMetrics[effectiveRateKey] ?? 0) as number,
        scenarioCents: (sMetrics[effectiveRateKey] ?? 0) as number,
        deltaCents: ((sMetrics[effectiveRateKey] ?? 0) as number) - ((bMetrics[effectiveRateKey] ?? 0) as number),
        isRate: true,
      },
      {
        label: 'EMR on Next $1,000',
        baselineCents: (bMetrics[emrKey] ?? 0) as number,
        scenarioCents: (sMetrics[emrKey] ?? 0) as number,
        deltaCents: ((sMetrics[emrKey] ?? 0) as number) - ((bMetrics[emrKey] ?? 0) as number),
        isRate: true,
      },
    ];
  })();

  // -----------------------------------------------------------------------
  // Loading skeleton
  // -----------------------------------------------------------------------

  if (loading) {
    return (
      <div className="flex gap-6 bg-canvas">
        {/* Side nav skeleton */}
        <div className="w-[280px] flex-shrink-0 space-y-3">
          <div className="h-4 w-24 rounded bg-surface-subtle animate-pulse" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-10 rounded bg-surface-subtle animate-pulse" />
          ))}
        </div>
        {/* Main area skeleton */}
        <div className="flex-1 space-y-6">
          <div className="h-8 w-64 rounded bg-surface-subtle animate-pulse" />
          <div className="rounded-2xl border border-border-subtle bg-surface-soft backdrop-blur-xl p-6 shadow-sm space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 rounded bg-surface-subtle animate-pulse" />
            ))}
          </div>
          <div className="h-10 w-48 rounded bg-surface-subtle animate-pulse" />
          <div className="grid grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 rounded-2xl border border-border-subtle bg-surface-soft backdrop-blur-xl p-4 shadow-sm">
                <div className="h-3 w-20 rounded bg-surface-subtle animate-pulse mb-2" />
                <div className="h-6 w-28 rounded bg-surface-subtle animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // -----------------------------------------------------------------------
  // Error state
  // -----------------------------------------------------------------------

  if (error || !scenario) {
    return (
      <div className="bg-canvas">
        <div className="rounded-lg border border-critical-200 bg-critical-50 p-8 text-center">
          <h2 className="text-lg font-semibold text-critical-700">
            Error Loading Scenario
          </h2>
          <p className="mt-2 text-sm text-critical-600">
            {error || 'Scenario not found.'}
          </p>
          <button
            type="button"
            onClick={fetchScenario}
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

  const metricsFromResult = computeResult?.metrics ?? {};
  const taxableIncome = (metricsFromResult['federal.taxable_income'] ?? 0) as number;
  const totalTax = (metricsFromResult['federal.total_tax'] ?? 0) as number;
  const effectiveRate = (metricsFromResult['federal.effective_rate'] ?? 0) as number;
  const emr = (metricsFromResult['federal.emr_next_1000'] ?? 0) as number;

  return (
    <div className="flex gap-6 bg-canvas min-h-[calc(100vh-8rem)]">
      {/* Left panel: Scenario side nav */}
      <div className="w-[280px] flex-shrink-0 rounded-2xl border border-border-subtle bg-surface-soft backdrop-blur-xl py-4 shadow-sm self-start">
        <ScenarioSideNav
          scenarios={allScenarios.map((s) => ({
            scenarioId: s.scenario_id,
            name: s.name,
            isBaseline: s.is_baseline,
          }))}
          activeScenarioId={scenarioId}
          onSelect={handleSelectScenario}
          onCreateNew={handleCreateNewScenario}
        />
      </div>

      {/* Main area */}
      <div className="flex-1 space-y-6 min-w-0">
        {/* Top section: Name + Baseline badge */}
        <div className="flex items-center gap-3">
          {editingName ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={nameValue}
                onChange={(e) => setNameValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleNameSave();
                  if (e.key === 'Escape') {
                    setEditingName(false);
                    setNameValue(scenario.name);
                  }
                }}
                className="h-10 rounded-lg border-[1.5px] border-accent-primary bg-surface-soft backdrop-blur-xl px-3 text-xl font-bold text-text focus:outline-hidden focus:shadow-focus"
                autoFocus
              />
              <button
                type="button"
                onClick={handleNameSave}
                className="inline-flex h-10 items-center rounded-lg bg-accent-primary px-4 text-sm font-medium text-text hover:bg-accent-primary/80 transition-colors"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditingName(false);
                  setNameValue(scenario.name);
                }}
                className="inline-flex h-10 items-center rounded-2xl border border-border-subtle bg-surface-soft backdrop-blur-xl px-4 text-sm font-medium text-text-muted hover:bg-surface-subtle transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setEditingName(true)}
              className="text-2xl font-bold text-text hover:text-accent-primarySoft transition-colors text-left"
              title="Click to edit scenario name"
            >
              {scenario.name}
            </button>
          )}

          {scenario.is_baseline && (
            <span className="inline-flex items-center rounded-full bg-accent-primary/15 px-3 py-1 text-xs font-semibold text-accent-primarySoft">
              Baseline
            </span>
          )}
        </div>

        {/* Middle section: Overrides */}
        <div className="rounded-2xl border border-border-subtle bg-surface-soft backdrop-blur-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-text">Overrides</h2>
            {overrides.length > 0 && (
              <button
                type="button"
                onClick={saveOverrides}
                disabled={savingOverrides}
                className="inline-flex h-9 items-center gap-2 rounded-2xl border border-border-subtle bg-surface-soft backdrop-blur-xl px-4 text-sm font-medium text-text-muted hover:bg-surface-subtle disabled:opacity-50 transition-colors"
              >
                {savingOverrides ? (
                  <>
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-text-faint border-t-transparent" />
                    Saving...
                  </>
                ) : (
                  'Save Overrides'
                )}
              </button>
            )}
          </div>
          <OverrideGrid
            overrides={overrides}
            onAdd={handleAddOverride}
            onRemove={handleRemoveOverride}
            onChange={handleChangeOverride}
          />
        </div>

        {/* Bottom section: Compute + Results */}
        <div className="space-y-6">
          <ComputeButton
            scenarioId={scenarioId}
            onCompute={handleCompute}
          />

          {/* Results area */}
          {computeResult && (
            <div className="space-y-6">
              {/* Key Metrics grid */}
              <div>
                <h2 className="mb-3 text-lg font-semibold text-text">
                  Results
                </h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-2xl border border-border-subtle bg-surface-soft backdrop-blur-xl p-5 shadow-sm">
                    <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
                      Federal Taxable Income
                    </p>
                    <p className="mt-1 text-lg font-semibold text-text">
                      {fmtCurrency(taxableIncome)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border-subtle bg-surface-soft backdrop-blur-xl p-5 shadow-sm">
                    <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
                      Total Tax
                    </p>
                    <p className="mt-1 text-lg font-semibold text-text">
                      {fmtCurrency(totalTax)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border-subtle bg-surface-soft backdrop-blur-xl p-5 shadow-sm">
                    <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
                      Effective Tax Rate
                    </p>
                    <p className="mt-1 text-lg font-semibold text-text">
                      {fmtPercent(effectiveRate)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border-subtle bg-surface-soft backdrop-blur-xl p-5 shadow-sm">
                    <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
                      EMR on Next $1,000
                    </p>
                    <p className="mt-1 text-lg font-semibold text-text">
                      {fmtPercent(emr)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Comparison table (only for non-baseline scenarios with baseline data) */}
              {!scenario.is_baseline && baselineResult && comparisonRows.length > 0 && (
                <div className="rounded-2xl border border-border-subtle bg-surface-soft backdrop-blur-xl shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-border-subtle">
                    <h3 className="text-base font-semibold text-text">
                      Comparison to Baseline
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border-subtle bg-transparent">
                          <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-muted">
                            Metric
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-text-muted">
                            Baseline
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-text-muted">
                            This Scenario
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-text-muted">
                            Delta
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {comparisonRows.map((row) => (
                          <tr
                            key={row.label}
                            className="border-b border-limestone-100 last:border-b-0"
                          >
                            <td className="px-6 py-3 font-medium text-text">
                              {row.label}
                            </td>
                            <td className="px-6 py-3 text-right tabular-nums text-text-muted">
                              {row.isRate
                                ? fmtPercent(row.baselineCents)
                                : fmtCurrency(row.baselineCents)}
                            </td>
                            <td className="px-6 py-3 text-right tabular-nums text-text-muted">
                              {row.isRate
                                ? fmtPercent(row.scenarioCents)
                                : fmtCurrency(row.scenarioCents)}
                            </td>
                            <td
                              className={`px-6 py-3 text-right tabular-nums font-semibold ${
                                row.deltaCents < 0
                                  ? 'text-success-600'
                                  : row.deltaCents > 0
                                    ? 'text-critical-600'
                                    : 'text-text-muted'
                              }`}
                            >
                              {row.deltaCents > 0 ? '+' : ''}
                              {row.isRate
                                ? fmtPercent(row.deltaCents)
                                : fmtCurrency(row.deltaCents)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Empty results state */}
          {!computeResult && (
            <div className="rounded-2xl border border-border-subtle bg-surface-soft backdrop-blur-xl p-8 text-center shadow-sm">
              <p className="text-sm text-text-muted">
                Configure overrides above and click &quot;Compute Scenario&quot; to see
                results.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
