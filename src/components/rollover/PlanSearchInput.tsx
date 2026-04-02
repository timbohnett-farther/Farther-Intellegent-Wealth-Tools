'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { PlanSearchResult } from '@/lib/rollover-engine/types';

interface PlanSearchInputProps {
  token?: string;
  onSelect: (plan: PlanSearchResult) => void;
  placeholder?: string;
}

export function PlanSearchInput({
  token,
  onSelect,
  placeholder = 'Search by plan name, sponsor, or EIN...',
}: PlanSearchInputProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PlanSearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const fetchResults = useCallback(
    async (searchQuery: string) => {
      if (searchQuery.length < 2) {
        setResults([]);
        return;
      }

      setLoading(true);
      try {
        const headers: HeadersInit = {};
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const res = await fetch(
          `/api/v1/rollover/plans/search?q=${encodeURIComponent(searchQuery)}`,
          { headers },
        );
        if (res.ok) {
          const data = await res.json();
          setResults(data.plans ?? []);
          setIsOpen(true);
        }
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [token],
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchResults(query), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, fetchResults]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && selectedIndex >= 0 && results[selectedIndex]) {
      e.preventDefault();
      handleSelect(results[selectedIndex]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  }

  function handleSelect(plan: PlanSearchResult) {
    onSelect(plan);
    setQuery(plan.plan_name);
    setIsOpen(false);
    setSelectedIndex(-1);
  }

  function formatDollars(cents: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(cents / 100);
  }

  return (
    <div ref={dropdownRef} className="relative">
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-faint"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelectedIndex(-1);
          }}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full rounded-lg border py-2.5 pl-10 pr-4 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
          style={{
            background: 'var(--s-input-bg, #fff)',
            borderColor: 'var(--s-border-subtle)',
            color: 'var(--s-text)',
          }}
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-accent-primary border-t-transparent" />
          </div>
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div
          className="absolute z-50 mt-1 w-full rounded-lg border shadow-lg"
          style={{
            background: 'var(--s-card-bg, #fff)',
            borderColor: 'var(--s-border-subtle)',
          }}
        >
          <ul className="max-h-72 overflow-y-auto py-1">
            {results.map((plan, index) => (
              <li key={plan.plan_id}>
                <button
                  type="button"
                  onClick={() => handleSelect(plan)}
                  className={`flex w-full items-start gap-3 px-3 py-2.5 text-left transition-colors hover:bg-accent-primary/5 ${
                    index === selectedIndex ? 'bg-accent-primary/10' : ''
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-text">
                      {plan.plan_name}
                    </p>
                    <p className="text-xs text-text-muted">
                      {plan.sponsor_name} &middot; EIN: {plan.ein}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-medium text-text-subtle">
                      {formatDollars(plan.total_assets_cents)}
                    </p>
                    <p className="text-[10px] text-text-faint">
                      {plan.participant_count.toLocaleString()} participants
                    </p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
