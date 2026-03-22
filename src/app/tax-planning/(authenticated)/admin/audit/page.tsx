'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth, useToast } from '@/lib/tax-planning/auth-context';
import { AuditTable } from '@/components/tax-planning/AuditTable';
import { FilterBar } from '@/components/tax-planning/FilterBar';
import type { AuditEvent } from '@/lib/tax-planning/types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const EVENT_TYPE_OPTIONS = [
  { value: 'auth.login', label: 'Auth Login' },
  { value: 'auth.logout', label: 'Auth Logout' },
  { value: 'auth.token_refresh', label: 'Token Refresh' },
  { value: 'household.create', label: 'Household Create' },
  { value: 'household.update', label: 'Household Update' },
  { value: 'household.delete', label: 'Household Delete' },
  { value: 'person.create', label: 'Person Create' },
  { value: 'person.update', label: 'Person Update' },
  { value: 'person.delete', label: 'Person Delete' },
  { value: 'doc.upload', label: 'Doc Upload' },
  { value: 'doc.extract', label: 'Doc Extract' },
  { value: 'doc.delete', label: 'Doc Delete' },
  { value: 'return.create', label: 'Return Create' },
  { value: 'return.update', label: 'Return Update' },
  { value: 'scenario.create', label: 'Scenario Create' },
  { value: 'scenario.update', label: 'Scenario Update' },
  { value: 'scenario.delete', label: 'Scenario Delete' },
  { value: 'scenario.compute', label: 'Scenario Compute' },
  { value: 'override.create', label: 'Override Create' },
  { value: 'override.update', label: 'Override Update' },
  { value: 'override.delete', label: 'Override Delete' },
];

const PAGE_SIZE = 20;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AuditResponse {
  events: AuditEvent[];
  total: number;
}

interface FilterState {
  eventType: string;
  user: string;
  dateFrom: string;
  dateTo: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AuditLogPage() {
  const { user, token } = useAuth();
  const { addToast } = useToast();

  // State
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [totalEvents, setTotalEvents] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    eventType: '',
    user: '',
    dateFrom: '',
    dateTo: '',
  });

  // -----------------------------------------------------------------------
  // Access check
  // -----------------------------------------------------------------------

  const hasAccess = user?.role === 'ADMIN' || user?.role === 'OPS';

  // -----------------------------------------------------------------------
  // Fetch audit events
  // -----------------------------------------------------------------------

  const fetchAuditEvents = useCallback(async () => {
    if (!token || !hasAccess) return;
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('pageSize', String(PAGE_SIZE));

      if (filters.eventType) params.set('eventType', filters.eventType);
      if (filters.user) params.set('userId', filters.user);
      if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.set('dateTo', filters.dateTo);

      const res = await fetch(`/api/v1/admin/audit?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('Failed to load audit events.');

      const data: AuditResponse = await res.json();
      setEvents(data.events ?? []);
      setTotalEvents(data.total ?? 0);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred.';
      setError(msg);
      addToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  }, [token, hasAccess, page, filters, addToast]);

  useEffect(() => {
    if (hasAccess) {
      fetchAuditEvents();
    }
  }, [fetchAuditEvents, hasAccess]);

  // -----------------------------------------------------------------------
  // Filter handlers
  // -----------------------------------------------------------------------

  const handleFilterChange = useCallback((key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1); // Reset to first page when filters change
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilters({
      eventType: '',
      user: '',
      dateFrom: '',
      dateTo: '',
    });
    setPage(1);
  }, []);

  // -----------------------------------------------------------------------
  // Pagination handler
  // -----------------------------------------------------------------------

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  // -----------------------------------------------------------------------
  // Export CSV handler (placeholder)
  // -----------------------------------------------------------------------

  const handleExportCsv = useCallback(() => {
    addToast('CSV export coming soon.', 'info');
  }, [addToast]);

  // -----------------------------------------------------------------------
  // Access denied
  // -----------------------------------------------------------------------

  if (!hasAccess) {
    return (
      <div className="bg-canvas">
        <div className="rounded-lg border border-critical-200 bg-critical-50 p-12 text-center">
          <svg
            className="mx-auto h-12 w-12 text-critical-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
            />
          </svg>
          <h2 className="mt-4 text-lg font-semibold text-critical-700">
            Access Denied
          </h2>
          <p className="mt-2 text-sm text-critical-600">
            You do not have permission to view the audit log. This page is
            restricted to users with the ADMIN or OPS role.
          </p>
          <p className="mt-1 text-xs text-critical-500">
            Your current role: {user?.role ?? 'Unknown'}
          </p>
        </div>
      </div>
    );
  }

  // -----------------------------------------------------------------------
  // Loading skeleton
  // -----------------------------------------------------------------------

  if (loading && events.length === 0) {
    return (
      <div className="space-y-6 bg-canvas">
        <div className="h-8 w-32 rounded bg-white/[0.06] animate-pulse" />
        {/* Filter bar skeleton */}
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.07] backdrop-blur-xl p-4 shadow-sm">
          <div className="flex flex-wrap gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-9 w-40 rounded bg-white/[0.06] animate-pulse" />
            ))}
          </div>
        </div>
        {/* Table skeleton */}
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.07] backdrop-blur-xl p-6 shadow-sm space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-5 rounded bg-white/[0.06] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  // -----------------------------------------------------------------------
  // Error state
  // -----------------------------------------------------------------------

  if (error && events.length === 0) {
    return (
      <div className="bg-canvas">
        <div className="rounded-lg border border-critical-200 bg-critical-50 p-8 text-center">
          <h2 className="text-lg font-semibold text-critical-700">
            Error Loading Audit Log
          </h2>
          <p className="mt-2 text-sm text-critical-600">{error}</p>
          <button
            type="button"
            onClick={fetchAuditEvents}
            className="mt-4 inline-flex h-10 items-center rounded-lg bg-teal-500 px-5 text-sm font-medium text-white hover:bg-teal-400 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // -----------------------------------------------------------------------
  // Build filter definitions for FilterBar component
  // -----------------------------------------------------------------------

  const filterDefinitions = [
    {
      key: 'eventType',
      label: 'Event Type',
      type: 'select' as const,
      options: EVENT_TYPE_OPTIONS,
      value: filters.eventType,
    },
    {
      key: 'user',
      label: 'User',
      type: 'text' as const,
      value: filters.user,
    },
    {
      key: 'dateFrom',
      label: 'Date From',
      type: 'date' as const,
      value: filters.dateFrom,
    },
    {
      key: 'dateTo',
      label: 'Date To',
      type: 'date' as const,
      value: filters.dateTo,
    },
  ];

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <div className="space-y-6 bg-canvas">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Audit Log</h1>
          <p className="mt-1 text-sm text-white/50">
            {totalEvents.toLocaleString()} total event{totalEvents !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={handleExportCsv}
          className="inline-flex h-10 items-center gap-2 rounded-2xl border border-white/[0.06] bg-white/[0.07] backdrop-blur-xl px-5 text-sm font-medium text-white/60 hover:bg-white/[0.04] transition-colors"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
            />
          </svg>
          Export CSV
        </button>
      </div>

      {/* Filter bar */}
      <FilterBar
        filters={filterDefinitions}
        onFilterChange={handleFilterChange}
        onClear={handleClearFilters}
      />

      {/* Loading overlay for subsequent loads */}
      {loading && events.length > 0 && (
        <div className="flex items-center gap-2 text-sm text-white/50">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-teal-500 border-t-transparent" />
          Refreshing...
        </div>
      )}

      {/* Audit table */}
      <AuditTable
        events={events}
        total={totalEvents}
        page={page}
        onPageChange={handlePageChange}
      />

      {/* Empty state */}
      {!loading && events.length === 0 && (
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.07] backdrop-blur-xl p-12 text-center shadow-sm">
          <svg
            className="mx-auto h-10 w-10 text-white/30"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
            />
          </svg>
          <p className="mt-3 text-sm font-medium text-white/60">
            No audit events found
          </p>
          <p className="mt-1 text-xs text-white/50">
            Try adjusting your filters or check back later.
          </p>
        </div>
      )}
    </div>
  );
}
