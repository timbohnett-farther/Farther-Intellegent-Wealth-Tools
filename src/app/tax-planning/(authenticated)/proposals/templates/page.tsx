'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, useToast } from '@/lib/tax-planning/auth-context';
import type { InvestmentModel, RiskLabel } from '@/lib/proposal-engine/types';

// ---------------------------------------------------------------------------
// Types & Constants
// ---------------------------------------------------------------------------

type ModelTab = 'firm' | 'platform' | 'third_party' | 'custom';
type SortField = 'riskScore' | 'historicalReturn' | 'weightedExpenseRatio';

const TAB_CONFIG: Array<{ id: ModelTab; label: string; filterFn: (m: InvestmentModel) => boolean }> = [
  { id: 'firm', label: 'Firm Models', filterFn: (m) => !!m.firmId && m.category !== 'CUSTOM' },
  { id: 'platform', label: 'Platform Models', filterFn: (m) => !m.firmId && m.category !== 'CUSTOM' },
  { id: 'third_party', label: 'Third-Party (SMA)', filterFn: (m) => m.category === 'TACTICAL' || m.category === 'ESG' || m.category === 'FACTOR' },
  { id: 'custom', label: 'Custom', filterFn: (m) => m.category === 'CUSTOM' },
];

const SORT_OPTIONS: Array<{ field: SortField; label: string }> = [
  { field: 'riskScore', label: 'Risk Score' },
  { field: 'historicalReturn', label: 'Return' },
  { field: 'weightedExpenseRatio', label: 'Expense Ratio' },
];

const RISK_COLORS: Record<RiskLabel, string> = {
  CONSERVATIVE: 'bg-info-100 text-info-700',
  MODERATELY_CONSERVATIVE: 'bg-info-100 text-info-700',
  MODERATE: 'bg-warning-100 text-warning-700',
  MODERATELY_AGGRESSIVE: 'bg-warning-100 text-warning-700',
  AGGRESSIVE: 'bg-critical-100 text-critical-700',
};

const fmtPct = (n: number) => (n * 100).toFixed(2) + '%';

// ---------------------------------------------------------------------------
// Investment Models Library Page
// ---------------------------------------------------------------------------

export default function ModelsLibraryPage() {
  const { token } = useAuth();
  const { addToast } = useToast();
  const router = useRouter();

  const [models, setModels] = useState<InvestmentModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ModelTab>('firm');
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('riskScore');
  const [selectedModel, setSelectedModel] = useState<InvestmentModel | null>(null);

  const fetchModels = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/models', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch models');
      const data = await res.json();
      setModels(Array.isArray(data) ? data : []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load models';
      setError(msg);
      addToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  }, [token, addToast]);

  useEffect(() => { fetchModels(); }, [fetchModels]);

  const tabConfig = TAB_CONFIG.find((t) => t.id === activeTab);
  const filtered = models
    .filter((m) => m.isActive)
    .filter((m) => tabConfig ? tabConfig.filterFn(m) : true)
    .filter((m) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return m.name.toLowerCase().includes(q) || (m.description || '').toLowerCase().includes(q);
    })
    .sort((a, b) => {
      const av = (a[sortField] ?? 0) as number;
      const bv = (b[sortField] ?? 0) as number;
      return sortField === 'weightedExpenseRatio' ? av - bv : bv - av;
    });

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">Investment Models</h1>
          <p className="mt-1 text-sm text-text-muted">Browse and manage investment model templates.</p>
        </div>
        <button
          type="button"
          onClick={() => addToast('Custom model builder coming soon', 'info')}
          className="inline-flex items-center gap-2 rounded-lg bg-accent-primary px-4 py-2.5 text-sm font-medium text-text hover:bg-accent-primary/80"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Create Custom Model
        </button>
      </div>

      <div className="flex border-b border-border-subtle">
        {TAB_CONFIG.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => { setActiveTab(tab.id); setSelectedModel(null); }}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === tab.id
                ? 'border-accent-primary text-accent-primarySoft'
                : 'border-transparent text-text-muted hover:text-text-muted'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-faint" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            placeholder="Search models..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border border-border-subtle rounded-sm pl-9 pr-3 py-2 text-sm focus:ring-2 focus:ring-accent-primary/80"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-muted">Sort by:</span>
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.field}
              type="button"
              onClick={() => setSortField(opt.field)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                sortField === opt.field ? 'bg-accent-primary text-text' : 'bg-surface-subtle text-text-muted hover:bg-surface-subtle'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-2xl border border-border-subtle bg-surface-soft backdrop-blur-xl p-5 animate-pulse">
                  <div className="h-5 w-36 rounded bg-surface-subtle mb-2" />
                  <div className="h-3 w-24 rounded bg-surface-subtle mb-3" />
                  <div className="h-16 rounded bg-surface-subtle" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="rounded-lg border border-critical-200 bg-critical-50 p-8 text-center">
              <p className="text-sm text-critical-700">{error}</p>
              <button type="button" onClick={fetchModels} className="mt-3 text-sm font-medium text-accent-primarySoft hover:text-accent-primarySoft">Try again</button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-border-subtle bg-surface-soft backdrop-blur-xl p-12 text-center">
              <p className="text-sm font-medium text-text-muted">No models found</p>
              <p className="text-xs text-text-muted mt-1">Try adjusting your search or filter.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filtered.map((model) => (
                <button
                  key={model.modelId}
                  type="button"
                  onClick={() => setSelectedModel(model)}
                  className={`rounded-lg border p-5 text-left transition-all ${
                    selectedModel?.modelId === model.modelId
                      ? 'border-accent-primary bg-accent-primary/10 ring-2 ring-accent-primarySoft'
                      : 'border-border-subtle bg-surface-soft hover:border-accent-primarySoft shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-semibold text-text">{model.name}</p>
                    {model.riskLabel && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${RISK_COLORS[model.riskLabel]}`}>
                        {model.riskLabel.replace(/_/g, ' ')}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-text-muted line-clamp-2 mb-3">{model.description || ''}</p>
                  {model.targetAllocation && (
                    <div className="flex h-2 w-full overflow-hidden rounded-full mb-2">
                      <div className="bg-accent-primary" style={{ width: `${model.targetAllocation.equity}%` }} />
                      <div className="bg-info-500" style={{ width: `${model.targetAllocation.fixedIncome}%` }} />
                      <div className="bg-warning-500" style={{ width: `${model.targetAllocation.alternatives}%` }} />
                      <div className="bg-surface-strong" style={{ width: `${model.targetAllocation.cash}%` }} />
                    </div>
                  )}
                  <div className="flex gap-4 text-xs text-text-muted">
                    <span>Risk: {model.riskScore}</span>
                    {model.weightedExpenseRatio != null && <span>ER: {fmtPct(model.weightedExpenseRatio)}</span>}
                    {model.historicalReturn != null && <span>Ret: {fmtPct(model.historicalReturn)}</span>}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          {selectedModel ? (
            <div className="rounded-2xl border border-border-subtle bg-surface-soft backdrop-blur-xl p-6 shadow-sm sticky top-4">
              <h3 className="text-base font-semibold text-text mb-1">{selectedModel.name}</h3>
              {selectedModel.riskLabel && (
                <span className={`inline-flex text-xs px-2 py-0.5 rounded-full font-medium mb-4 ${RISK_COLORS[selectedModel.riskLabel]}`}>
                  {selectedModel.riskLabel.replace(/_/g, ' ')}
                </span>
              )}
              <p className="text-sm text-text-muted mb-4">{selectedModel.description || ''}</p>
              <div className="space-y-2 mb-4 border-t border-border-subtle pt-4">
                <div className="flex justify-between text-sm"><span className="text-text-muted">Risk Score</span><span className="font-medium text-text">{selectedModel.riskScore}</span></div>
                <div className="flex justify-between text-sm"><span className="text-text-muted">Expense Ratio</span><span className="font-medium text-text">{selectedModel.weightedExpenseRatio != null ? fmtPct(selectedModel.weightedExpenseRatio) : '--'}</span></div>
                <div className="flex justify-between text-sm"><span className="text-text-muted">Category</span><span className="font-medium text-text">{selectedModel.category}</span></div>
                <div className="flex justify-between text-sm"><span className="text-text-muted">Tax Efficiency</span><span className="font-medium text-text">{selectedModel.taxEfficiency}</span></div>
                {selectedModel.historicalReturn != null && (
                  <div className="flex justify-between text-sm"><span className="text-text-muted">Historical Return</span><span className="font-medium text-text">{fmtPct(selectedModel.historicalReturn)}</span></div>
                )}
                {selectedModel.historicalVolatility != null && (
                  <div className="flex justify-between text-sm"><span className="text-text-muted">Volatility</span><span className="font-medium text-text">{fmtPct(selectedModel.historicalVolatility)}</span></div>
                )}
                {selectedModel.historicalMaxDrawdown != null && (
                  <div className="flex justify-between text-sm"><span className="text-text-muted">Max Drawdown</span><span className="font-medium text-critical-700">{fmtPct(selectedModel.historicalMaxDrawdown)}</span></div>
                )}
              </div>
              <div className="border-t border-border-subtle pt-4">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-3">Allocation Breakdown</h4>
                <div className="space-y-1.5 max-h-64 overflow-y-auto">
                  {(selectedModel.allocations || selectedModel.allocation || []).map((a) => (
                    <div key={a.ticker} className="flex items-center justify-between py-1">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-text truncate">{a.ticker}</p>
                        <p className="text-[10px] text-text-muted truncate">{a.name}</p>
                      </div>
                      <div className="flex items-center gap-2 ml-2">
                        <div className="w-16 h-1.5 rounded-full bg-surface-subtle">
                          <div className="h-1.5 rounded-full bg-accent-primary" style={{ width: ((a.targetWeight ?? a.targetPct ?? 0) * 100) + '%' }} />
                        </div>
                        <span className="text-xs text-text-muted tabular-nums w-12 text-right">{((a.targetWeight ?? a.targetPct ?? 0) * 100).toFixed(1)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {selectedModel.targetAllocation && (
              <div className="border-t border-border-subtle pt-4 mt-4">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-3">Target Allocation</h4>
                <div className="space-y-2">
                  {Object.entries(selectedModel.targetAllocation).map(([key, val]) => (
                    <div key={key} className="flex items-center justify-between text-xs">
                      <span className="text-text-muted capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                      <span className="font-medium text-text">{val}%</span>
                    </div>
                  ))}
                </div>
              </div>
              )}
            </div>
          ) : (
            <div className="rounded-lg border border-border-subtle bg-transparent p-8 text-center">
              <p className="text-sm text-text-muted">Select a model to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
