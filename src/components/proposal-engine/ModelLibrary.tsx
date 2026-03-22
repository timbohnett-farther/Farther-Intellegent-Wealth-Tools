'use client';

import React, { useState, useMemo } from 'react';
import { cn } from '@/lib/utils/cn';
import { Search, ArrowUpDown, Star } from 'lucide-react';
import type { InvestmentModel, ModelCategory } from '@/lib/proposal-engine/types';
import { ModelCard } from './ModelCard';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ModelLibraryProps {
  /** Array of investment models to display. */
  models: InvestmentModel[];
  /** Client risk score for best-match highlighting. */
  riskScore?: number;
  /** Callback when a model is selected. */
  onSelect: (modelId: string) => void;
  /** Currently selected model ID. */
  selectedModelId?: string;
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

type SortOption = 'risk' | 'name';

const CATEGORY_TABS: Array<{ key: ModelCategory | 'ALL'; label: string }> = [
  { key: 'ALL', label: 'All' },
  { key: 'STRATEGIC', label: 'Strategic' },
  { key: 'TACTICAL', label: 'Tactical' },
  { key: 'FACTOR', label: 'Factor' },
  { key: 'ESG', label: 'ESG' },
  { key: 'TAX_EFFICIENT', label: 'Tax Efficient' },
  { key: 'INCOME', label: 'Income' },
  { key: 'ALTERNATIVES', label: 'Alternatives' },
  { key: 'CUSTOM', label: 'Custom' },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ModelLibrary({
  models,
  riskScore,
  onSelect,
  selectedModelId,
}: ModelLibraryProps) {
  const [activeCategory, setActiveCategory] = useState<ModelCategory | 'ALL'>('ALL');
  const [sortBy, setSortBy] = useState<SortOption>('risk');
  const [search, setSearch] = useState('');

  // Filter and sort
  const filteredModels = useMemo(() => {
    let filtered = models.filter((m) => m.isActive && m.approvedForUse);

    // Category filter
    if (activeCategory !== 'ALL') {
      filtered = filtered.filter((m) => m.category === activeCategory);
    }

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.category.toLowerCase().includes(q),
      );
    }

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      // Sort by risk score, with best-match first if riskScore is provided
      if (riskScore !== undefined) {
        const diffA = Math.abs(a.riskScore - riskScore);
        const diffB = Math.abs(b.riskScore - riskScore);
        return diffA - diffB;
      }
      return a.riskScore - b.riskScore;
    });

    return filtered;
  }, [models, activeCategory, sortBy, search, riskScore]);

  // Determine which tabs have models
  const categoriesWithModels = useMemo(() => {
    const set = new Set<string>();
    set.add('ALL');
    for (const m of models) {
      if (m.isActive && m.approvedForUse) set.add(m.category);
    }
    return set;
  }, [models]);

  // Best match indicator
  const bestMatchId = useMemo(() => {
    if (riskScore === undefined || filteredModels.length === 0) return null;
    return filteredModels.reduce((best, m) =>
      Math.abs(m.riskScore - riskScore) < Math.abs(best.riskScore - riskScore)
        ? m
        : best,
    ).modelId;
  }, [filteredModels, riskScore]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-sm font-semibold text-charcoal-900">
          Model Library ({filteredModels.length})
        </h3>

        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-charcoal-400" />
            <input
              type="text"
              placeholder="Search models..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="rounded-lg border border-limestone-200 bg-white py-2 pl-8 pr-3 text-xs text-charcoal-700 placeholder:text-charcoal-400 outline-hidden focus:border-brand-700 focus:ring-1 focus:ring-brand-700"
            />
          </div>

          {/* Sort toggle */}
          <button
            type="button"
            onClick={() => setSortBy((s) => (s === 'risk' ? 'name' : 'risk'))}
            className="inline-flex items-center gap-1.5 rounded-lg border border-limestone-200 bg-white px-3 py-2 text-xs font-medium text-charcoal-600 hover:bg-limestone-50 transition-colors"
          >
            <ArrowUpDown className="h-3.5 w-3.5" />
            {sortBy === 'risk' ? 'Risk Score' : 'Name'}
          </button>
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex gap-1 overflow-x-auto rounded-lg bg-limestone-100 p-1">
        {CATEGORY_TABS.filter((tab) => categoriesWithModels.has(tab.key)).map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveCategory(tab.key)}
            className={cn(
              'shrink-0 rounded-md px-3 py-1.5 text-xs font-medium transition-all',
              activeCategory === tab.key
                ? 'bg-white text-brand-700 shadow-sm'
                : 'text-charcoal-500 hover:text-charcoal-700',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Risk score banner */}
      {riskScore !== undefined && (
        <div className="flex items-center gap-2 rounded-lg border border-info-200 bg-info-50 px-4 py-2">
          <Star className="h-4 w-4 text-info-600" />
          <span className="text-xs text-info-700">
            Models sorted by closest match to client risk score of{' '}
            <strong className="font-semibold">{riskScore}</strong>
          </span>
        </div>
      )}

      {/* Grid of ModelCards */}
      {filteredModels.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredModels.map((model) => (
            <div key={model.modelId} className="relative">
              {bestMatchId === model.modelId && riskScore !== undefined && (
                <div className="absolute -top-2 left-4 z-10 inline-flex items-center gap-1 rounded-full bg-success-600 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                  <Star className="h-3 w-3" />
                  Best Match
                </div>
              )}
              <ModelCard
                model={model}
                selected={selectedModelId === model.modelId}
                onSelect={onSelect}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-limestone-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm text-charcoal-500">
            No models match your current filters.
          </p>
        </div>
      )}
    </div>
  );
}

ModelLibrary.displayName = 'ModelLibrary';
