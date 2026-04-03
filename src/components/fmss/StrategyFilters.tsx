"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";

interface StrategyFiltersProps {
  providers: Array<{ key: string; name: string }>;
}

export function StrategyFilters({ providers }: StrategyFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [provider, setProvider] = useState(searchParams.get("provider") || "");
  const [minAUM, setMinAUM] = useState(searchParams.get("minAUM") || "");
  const [maxAUM, setMaxAUM] = useState(searchParams.get("maxAUM") || "");
  const [minFee, setMinFee] = useState(searchParams.get("minFee") || "");
  const [maxFee, setMaxFee] = useState(searchParams.get("maxFee") || "");
  const [minReturn, setMinReturn] = useState(searchParams.get("minReturn") || "");

  const handleApplyFilters = () => {
    const params = new URLSearchParams();

    if (search) params.set("search", search);
    if (provider) params.set("provider", provider);
    if (minAUM) params.set("minAUM", minAUM);
    if (maxAUM) params.set("maxAUM", maxAUM);
    if (minFee) params.set("minFee", minFee);
    if (maxFee) params.set("maxFee", maxFee);
    if (minReturn) params.set("minReturn", minReturn);

    router.push(`/fmss/sma?${params.toString()}`);
  };

  const handleClearFilters = () => {
    setSearch("");
    setProvider("");
    setMinAUM("");
    setMaxAUM("");
    setMinFee("");
    setMaxFee("");
    setMinReturn("");
    router.push("/fmss/sma");
  };

  const hasActiveFilters = search || provider || minAUM || maxAUM || minFee || maxFee || minReturn;

  return (
    <div className="rounded-xl border border-border bg-surface p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-text-primary">Filters</h3>
        {hasActiveFilters && (
          <button
            onClick={handleClearFilters}
            className="text-sm text-brand-500 hover:text-brand-600 hover:underline"
          >
            Clear all
          </button>
        )}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Search */}
        <div>
          <label className="block text-sm font-medium text-text-secondary">
            Search Strategy
          </label>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Strategy name or manager..."
            className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200 dark:focus:ring-brand-700/30"
          />
        </div>

        {/* Provider */}
        <div>
          <label className="block text-sm font-medium text-text-secondary">
            Provider
          </label>
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200 dark:focus:ring-brand-700/30"
          >
            <option value="">All Providers</option>
            {providers.map((p) => (
              <option key={p.key} value={p.key}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* Min AUM */}
        <div>
          <label className="block text-sm font-medium text-text-secondary">
            Min AUM (millions)
          </label>
          <input
            type="number"
            value={minAUM}
            onChange={(e) => setMinAUM(e.target.value)}
            placeholder="e.g., 100"
            className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200 dark:focus:ring-brand-700/30"
          />
        </div>

        {/* Max AUM */}
        <div>
          <label className="block text-sm font-medium text-text-secondary">
            Max AUM (millions)
          </label>
          <input
            type="number"
            value={maxAUM}
            onChange={(e) => setMaxAUM(e.target.value)}
            placeholder="e.g., 10000"
            className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200 dark:focus:ring-brand-700/30"
          />
        </div>

        {/* Min Fee */}
        <div>
          <label className="block text-sm font-medium text-text-secondary">
            Min Fee (bps)
          </label>
          <input
            type="number"
            value={minFee}
            onChange={(e) => setMinFee(e.target.value)}
            placeholder="e.g., 0"
            className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200 dark:focus:ring-brand-700/30"
          />
        </div>

        {/* Max Fee */}
        <div>
          <label className="block text-sm font-medium text-text-secondary">
            Max Fee (bps)
          </label>
          <input
            type="number"
            value={maxFee}
            onChange={(e) => setMaxFee(e.target.value)}
            placeholder="e.g., 100"
            className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200 dark:focus:ring-brand-700/30"
          />
        </div>

        {/* Min 1Y Return */}
        <div>
          <label className="block text-sm font-medium text-text-secondary">
            Min 1Y Return (%)
          </label>
          <input
            type="number"
            value={minReturn}
            onChange={(e) => setMinReturn(e.target.value)}
            placeholder="e.g., 5"
            step="0.1"
            className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200 dark:focus:ring-brand-700/30"
          />
        </div>
      </div>

      {/* Apply Button */}
      <div className="mt-4 flex justify-end">
        <button
          onClick={handleApplyFilters}
          className="rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
        >
          Apply Filters
        </button>
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="mt-4 flex flex-wrap gap-2">
          {search && (
            <span className="inline-flex items-center gap-1 rounded-full bg-brand-100 px-3 py-1 text-xs text-brand-700 dark:bg-brand-900 dark:text-brand-300">
              Search: {search}
            </span>
          )}
          {provider && (
            <span className="inline-flex items-center gap-1 rounded-full bg-brand-100 px-3 py-1 text-xs text-brand-700 dark:bg-brand-900 dark:text-brand-300">
              Provider: {providers.find(p => p.key === provider)?.name}
            </span>
          )}
          {minAUM && (
            <span className="inline-flex items-center gap-1 rounded-full bg-brand-100 px-3 py-1 text-xs text-brand-700 dark:bg-brand-900 dark:text-brand-300">
              Min AUM: ${minAUM}M
            </span>
          )}
          {maxAUM && (
            <span className="inline-flex items-center gap-1 rounded-full bg-brand-100 px-3 py-1 text-xs text-brand-700 dark:bg-brand-900 dark:text-brand-300">
              Max AUM: ${maxAUM}M
            </span>
          )}
          {minFee && (
            <span className="inline-flex items-center gap-1 rounded-full bg-brand-100 px-3 py-1 text-xs text-brand-700 dark:bg-brand-900 dark:text-brand-300">
              Min Fee: {minFee} bps
            </span>
          )}
          {maxFee && (
            <span className="inline-flex items-center gap-1 rounded-full bg-brand-100 px-3 py-1 text-xs text-brand-700 dark:bg-brand-900 dark:text-brand-300">
              Max Fee: {maxFee} bps
            </span>
          )}
          {minReturn && (
            <span className="inline-flex items-center gap-1 rounded-full bg-brand-100 px-3 py-1 text-xs text-brand-700 dark:bg-brand-900 dark:text-brand-300">
              Min 1Y Return: {minReturn}%
            </span>
          )}
        </div>
      )}
    </div>
  );
}
