'use client';

import React from 'react';
import { X } from 'lucide-react';

export interface FilterBarProps {
  /** Array of filter definitions */
  filters: Array<{
    key: string;
    label: string;
    type: 'text' | 'select' | 'date';
    options?: Array<{ value: string; label: string }>;
    value: string;
  }>;
  /** Callback when any filter value changes */
  onFilterChange: (key: string, value: string) => void;
  /** Callback to clear all filters */
  onClear: () => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  onFilterChange,
  onClear,
}) => {
  const hasActiveFilters = filters.some((f) => f.value.trim() !== '');

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-border-subtle bg-surface-soft backdrop-blur-xl p-4 shadow-sm">
      {filters.map((filter) => (
        <div key={filter.key} className="flex flex-col gap-1.5 min-w-[160px]">
          <label
            htmlFor={`filter-${filter.key}`}
            className="text-xs font-medium text-text-muted"
          >
            {filter.label}
          </label>

          {filter.type === 'text' && (
            <input
              id={`filter-${filter.key}`}
              type="text"
              value={filter.value}
              onChange={(e) => onFilterChange(filter.key, e.target.value)}
              placeholder={`Filter by ${filter.label.toLowerCase()}...`}
              className="h-9 w-full rounded-lg border-[1.5px] border-border-subtle bg-surface-soft backdrop-blur-xl px-3 text-sm text-text placeholder:text-text-faint transition-colors focus:outline-hidden focus:border-accent-primary focus:shadow-focus"
            />
          )}

          {filter.type === 'select' && (
            <select
              id={`filter-${filter.key}`}
              value={filter.value}
              onChange={(e) => onFilterChange(filter.key, e.target.value)}
              className="h-9 w-full appearance-none rounded-lg border-[1.5px] border-border-subtle bg-text pl-3 pr-9 text-sm text-text transition-colors focus:outline-hidden focus:border-accent-primary focus:shadow-focus"
            >
              <option value="">All</option>
              {filter.options?.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          )}

          {filter.type === 'date' && (
            <input
              id={`filter-${filter.key}`}
              type="date"
              value={filter.value}
              onChange={(e) => onFilterChange(filter.key, e.target.value)}
              className="h-9 w-full rounded-lg border-[1.5px] border-border-subtle bg-surface-soft backdrop-blur-xl px-3 text-sm text-text transition-colors focus:outline-hidden focus:border-accent-primary focus:shadow-focus"
            />
          )}
        </div>
      ))}

      {/* Clear all button */}
      {hasActiveFilters && (
        <button
          type="button"
          onClick={onClear}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-sm font-medium text-text-muted hover:bg-surface-subtle hover:text-text-muted transition-colors self-end"
        >
          <X className="h-3.5 w-3.5" />
          Clear all
        </button>
      )}
    </div>
  );
};

FilterBar.displayName = 'FilterBar';
