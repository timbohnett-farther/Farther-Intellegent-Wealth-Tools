'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/tax-planning/auth-context';
import { useToast } from '@/lib/tax-planning/auth-context';
import { HouseholdTable } from '@/components/tax-planning/HouseholdTable';
import { CreateHouseholdModal } from '@/components/tax-planning/CreateHouseholdModal';
import type { Household } from '@/lib/tax-planning/types';

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function TableSkeleton() {
  return (
    <div className="w-full animate-pulse">
      <div className="mb-4 flex items-center justify-between">
        <div className="h-10 w-64 rounded-lg bg-surface-subtle" />
        <div className="h-10 w-40 rounded-lg bg-surface-subtle" />
      </div>
      <div className="overflow-hidden rounded-2xl border border-border-subtle bg-surface-soft backdrop-blur-xl shadow-sm">
        <div className="border-b border-border-subtle bg-transparent px-4 py-3">
          <div className="flex gap-8">
            <div className="h-4 w-24 rounded bg-surface-subtle" />
            <div className="h-4 w-16 rounded bg-surface-subtle" />
            <div className="h-4 w-28 rounded bg-surface-subtle" />
          </div>
        </div>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="border-b border-limestone-100 px-4 py-4 last:border-b-0">
            <div className="flex items-center gap-8">
              <div className="h-4 w-40 rounded bg-surface-subtle" />
              <div className="h-4 w-10 rounded bg-surface-subtle" />
              <div className="h-4 w-24 rounded bg-surface-subtle" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Households Page
// ---------------------------------------------------------------------------

export default function HouseholdsPage() {
  const { token } = useAuth();
  const { addToast } = useToast();
  const router = useRouter();

  const [households, setHouseholds] = useState<Household[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState('');

  const fetchHouseholds = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/v1/households', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error('Failed to fetch households');
      }

      const data: Household[] = await res.json();
      setHouseholds(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
      addToast(message, 'error');
    } finally {
      setLoading(false);
    }
  }, [token, addToast]);

  useEffect(() => {
    fetchHouseholds();
  }, [fetchHouseholds]);

  const handleSelectHousehold = useCallback(
    (householdId: string) => {
      router.push(`/tax-planning/households/${householdId}`);
    },
    [router]
  );

  const handleCreateHousehold = useCallback(
    async (data: { displayName: string; primaryState?: string }) => {
      if (!token) return;

      try {
        const res = await fetch('/api/v1/households', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            displayName: data.displayName,
            primaryState: data.primaryState,
          }),
        });

        if (!res.ok) {
          throw new Error('Failed to create household');
        }

        addToast('Household created successfully', 'success');
        setModalOpen(false);
        await fetchHouseholds();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create household';
        addToast(message, 'error');
      }
    },
    [token, addToast, fetchHouseholds]
  );

  const filteredHouseholds = useMemo(() => {
    if (!search.trim()) return households;
    const query = search.toLowerCase();
    return households.filter(
      (h) =>
        h.display_name.toLowerCase().includes(query) ||
        (h.primary_state && h.primary_state.toLowerCase().includes(query))
    );
  }, [households, search]);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">Households</h1>
          <p className="mt-1 text-sm text-text-muted">
            Manage tax planning households and their associated returns.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent-primary px-5 py-2.5 text-sm font-medium text-text shadow-sm transition-colors hover:bg-accent-primary/80 active:bg-accent-primary/60"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Create Household
        </button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 rounded-lg border border-border-subtle bg-transparent px-3 transition-colors focus-within:border-accent-primary focus-within:ring-2 focus-within:ring-accent-primarySoft/50 sm:max-w-sm">
        <svg className="h-4 w-4 shrink-0 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search households..."
          className="w-full bg-transparent py-2 text-sm text-text outline-hidden placeholder:text-text-faint"
        />
      </div>

      {/* Content */}
      {loading ? (
        <TableSkeleton />
      ) : error ? (
        <div className="rounded-lg border border-critical-200 bg-critical-50 p-8 text-center">
          <svg className="mx-auto h-10 w-10 text-critical-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <p className="text-sm font-medium text-critical-700">{error}</p>
          <button
            type="button"
            onClick={fetchHouseholds}
            className="mt-3 text-sm font-medium text-accent-primarySoft hover:text-accent-primarySoft"
          >
            Try again
          </button>
        </div>
      ) : filteredHouseholds.length === 0 && households.length === 0 ? (
        <div className="rounded-2xl border border-border-subtle bg-surface-soft backdrop-blur-xl p-12 text-center shadow-sm">
          <svg className="mx-auto h-12 w-12 text-text-faint mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
          </svg>
          <p className="text-lg font-medium text-text">No households found</p>
          <p className="mt-1 text-sm text-text-muted">
            Get started by creating your first household.
          </p>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-accent-primary px-5 py-2.5 text-sm font-medium text-text shadow-sm transition-colors hover:bg-accent-primary/80"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Create Household
          </button>
        </div>
      ) : (
        <HouseholdTable
          households={filteredHouseholds}
          onSelect={handleSelectHousehold}
          onCreateNew={() => setModalOpen(true)}
        />
      )}

      {/* Create Household Modal */}
      <CreateHouseholdModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleCreateHousehold}
      />
    </div>
  );
}
