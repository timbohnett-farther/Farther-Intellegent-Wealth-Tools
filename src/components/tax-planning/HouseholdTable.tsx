'use client';

import React, { useState, useMemo } from 'react';
import { cn } from '@/lib/utils/cn';
import { Plus, Search, ChevronRight } from 'lucide-react';
import type { Household } from '@/lib/tax-planning/types';
import { Badge } from '@/components/prism/atoms/Badge';

export interface HouseholdTableProps {
  /** List of households to display */
  households: Household[];
  /** Callback when a household row is selected */
  onSelect: (householdId: string) => void;
  /** Callback to create a new household */
  onCreateNew: () => void;
}

export const HouseholdTable: React.FC<HouseholdTableProps> = ({
  households,
  onSelect,
  onCreateNew,
}) => {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return households;
    const query = search.toLowerCase();
    return households.filter(
      (h) =>
        h.display_name.toLowerCase().includes(query) ||
        (h.primary_state && h.primary_state.toLowerCase().includes(query))
    );
  }, [households, search]);

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return iso;
    }
  };

  return (
    <div className="w-full">
      {/* Toolbar */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div
          className={cn(
            'flex items-center gap-2 rounded-lg border border-border-subtle bg-transparent px-3',
            'transition-colors focus-within:border-accent-primary focus-within:ring-2 focus-within:ring-brand-100'
          )}
        >
          <Search className="h-4 w-4 shrink-0 text-text-muted" aria-hidden="true" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search households..."
            className="w-full bg-transparent py-2 text-sm text-text outline-hidden placeholder:text-text-faint sm:w-64"
          />
        </div>

        <button
          type="button"
          onClick={onCreateNew}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent-primary px-5 py-2.5 text-sm font-medium text-text shadow-sm transition-colors hover:bg-brand-400 active:bg-brand-600"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          New Household
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-border-subtle bg-surface-soft backdrop-blur-xl shadow-sm">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border-subtle bg-transparent">
              <th className="whitespace-nowrap px-4 py-3 font-medium text-text-muted">
                Name
              </th>
              <th className="whitespace-nowrap px-4 py-3 font-medium text-text-muted">
                State
              </th>
              <th className="whitespace-nowrap px-4 py-3 font-medium text-text-muted">
                Last Updated
              </th>
              <th className="w-10 px-4 py-3" aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-12 text-center text-text-muted"
                >
                  {households.length === 0
                    ? 'No households yet. Click "New Household" to get started.'
                    : 'No households match your search.'}
                </td>
              </tr>
            ) : (
              filtered.map((household) => (
                <tr
                  key={household.household_id}
                  onClick={() => onSelect(household.household_id)}
                  className="cursor-pointer border-b border-limestone-100 transition-colors last:border-b-0 hover:bg-surface-subtle"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelect(household.household_id);
                    }
                  }}
                >
                  <td className="px-4 py-3 font-medium text-text">
                    {household.display_name}
                  </td>
                  <td className="px-4 py-3">
                    {household.primary_state ? (
                      <Badge variant="neutral">{household.primary_state}</Badge>
                    ) : (
                      <span className="text-text-faint">&mdash;</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-text-muted">
                    {formatDate(household.updated_at)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <ChevronRight className="inline-block h-4 w-4 text-text-faint" aria-hidden="true" />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

HouseholdTable.displayName = 'HouseholdTable';
