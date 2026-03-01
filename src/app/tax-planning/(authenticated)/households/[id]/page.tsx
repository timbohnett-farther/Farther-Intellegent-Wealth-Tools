'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/tax-planning/auth-context';
import { useToast } from '@/lib/tax-planning/auth-context';
import { HouseholdHeader } from '@/components/tax-planning/HouseholdHeader';
import { ReturnsPanel } from '@/components/tax-planning/ReturnsPanel';
import { DocsPanel } from '@/components/tax-planning/DocsPanel';
import { PeoplePanel } from '@/components/tax-planning/PeoplePanel';
import type { Household, Person, TaxReturn, ReturnDocument } from '@/lib/tax-planning/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TabId = 'overview' | 'returns' | 'documents' | 'people';

interface Tab {
  id: TabId;
  label: string;
}

const TABS: Tab[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'returns', label: 'Returns' },
  { id: 'documents', label: 'Documents' },
  { id: 'people', label: 'People' },
];

// ---------------------------------------------------------------------------
// Skeletons
// ---------------------------------------------------------------------------

function HeaderSkeleton() {
  return (
    <div className="rounded-lg border border-limestone-200 bg-white p-6 shadow-sm animate-pulse">
      <div className="flex items-start justify-between">
        <div>
          <div className="h-7 w-48 rounded bg-limestone-200 mb-3" />
          <div className="h-4 w-32 rounded bg-limestone-200" />
        </div>
        <div className="flex gap-6">
          <div className="h-12 w-20 rounded bg-limestone-200" />
          <div className="h-12 w-20 rounded bg-limestone-200" />
        </div>
      </div>
    </div>
  );
}

function ContentSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-lg border border-limestone-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-limestone-200" />
            <div className="flex-1">
              <div className="h-4 w-40 rounded bg-limestone-200 mb-2" />
              <div className="h-3 w-24 rounded bg-limestone-200" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Overview Tab Content
// ---------------------------------------------------------------------------

interface OverviewTabProps {
  household: Household;
  personsCount: number;
  returnsCount: number;
  docsCount: number;
}

function OverviewTab({ household, personsCount, returnsCount, docsCount }: OverviewTabProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div className="rounded-lg border border-limestone-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-brand-50">
            <svg className="h-4 w-4 text-brand-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
            </svg>
          </div>
          <h3 className="text-sm font-semibold text-charcoal-900">Primary State</h3>
        </div>
        <p className="text-2xl font-bold text-charcoal-900">
          {household.primary_state || 'Not set'}
        </p>
        <p className="mt-1 text-xs text-charcoal-500">State of primary residence</p>
      </div>

      <div className="rounded-lg border border-limestone-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-info-100">
            <svg className="h-4 w-4 text-info-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          </div>
          <h3 className="text-sm font-semibold text-charcoal-900">Total Returns</h3>
        </div>
        <p className="text-2xl font-bold text-charcoal-900 tabular-nums">{returnsCount}</p>
        <p className="mt-1 text-xs text-charcoal-500">
          Tax returns on file
        </p>
      </div>

      <div className="rounded-lg border border-limestone-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-success-100">
            <svg className="h-4 w-4 text-success-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
            </svg>
          </div>
          <h3 className="text-sm font-semibold text-charcoal-900">People</h3>
        </div>
        <p className="text-2xl font-bold text-charcoal-900 tabular-nums">{personsCount}</p>
        <p className="mt-1 text-xs text-charcoal-500">
          Household members
        </p>
      </div>

      {/* Created/Updated info */}
      <div className="sm:col-span-2 lg:col-span-3 rounded-lg border border-limestone-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-charcoal-900 mb-3">Details</h3>
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium text-charcoal-500">Household ID</dt>
            <dd className="mt-0.5 text-sm font-mono text-charcoal-900">
              {household.household_id}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-charcoal-500">Firm ID</dt>
            <dd className="mt-0.5 text-sm font-mono text-charcoal-900">
              {household.firm_id}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-charcoal-500">Created</dt>
            <dd className="mt-0.5 text-sm text-charcoal-900">
              {new Date(household.created_at).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-charcoal-500">Last Updated</dt>
            <dd className="mt-0.5 text-sm text-charcoal-900">
              {new Date(household.updated_at).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-charcoal-500">Documents</dt>
            <dd className="mt-0.5 text-sm text-charcoal-900 tabular-nums">{docsCount}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Household Detail Page
// ---------------------------------------------------------------------------

export default function HouseholdDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { token } = useAuth();
  const { addToast } = useToast();

  const householdId = params.id as string;

  const [household, setHousehold] = useState<Household | null>(null);
  const [persons, setPersons] = useState<Person[]>([]);
  const [returns, setReturns] = useState<TaxReturn[]>([]);
  const [documents, setDocuments] = useState<ReturnDocument[]>([]);
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHouseholdData = useCallback(async () => {
    if (!token || !householdId) return;
    setLoading(true);
    setError(null);

    try {
      const [householdRes, personsRes, returnsRes, docsRes] = await Promise.all([
        fetch(`/api/v1/households/${householdId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`/api/v1/households/${householdId}/persons`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`/api/v1/households/${householdId}/returns`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`/api/v1/households/${householdId}/documents`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (!householdRes.ok) {
        throw new Error('Household not found');
      }

      const householdData: Household = await householdRes.json();
      setHousehold(householdData);

      const personsData: Person[] = personsRes.ok ? await personsRes.json() : [];
      setPersons(personsData);

      const returnsData: TaxReturn[] = returnsRes.ok ? await returnsRes.json() : [];
      setReturns(returnsData);

      const docsData: ReturnDocument[] = docsRes.ok ? await docsRes.json() : [];
      setDocuments(docsData);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load household';
      setError(message);
      addToast(message, 'error');
    } finally {
      setLoading(false);
    }
  }, [token, householdId, addToast]);

  useEffect(() => {
    fetchHouseholdData();
  }, [fetchHouseholdData]);

  const handleSelectReturn = useCallback(
    (returnId: string) => {
      router.push(`/tax-planning/returns/${returnId}`);
    },
    [router]
  );

  const handleUploadReturn = useCallback(() => {
    router.push(`/tax-planning/households/${householdId}/upload`);
  }, [router, householdId]);

  const handleSelectDoc = useCallback(
    (docId: string) => {
      addToast(`Viewing document ${docId.slice(0, 8)}...`, 'info');
    },
    [addToast]
  );

  const handleAddPerson = useCallback(() => {
    addToast('Add person functionality coming soon', 'info');
  }, [addToast]);

  const handleEditPerson = useCallback(
    (personId: string) => {
      addToast(`Editing person ${personId.slice(0, 8)}...`, 'info');
    },
    [addToast]
  );

  // Error state
  if (error && !household) {
    return (
      <div className="mx-auto max-w-7xl">
        <div className="rounded-lg border border-critical-200 bg-critical-50 p-8 text-center">
          <svg className="mx-auto h-10 w-10 text-critical-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <p className="text-sm font-medium text-critical-700">{error}</p>
          <div className="mt-4 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => router.push('/tax-planning/households')}
              className="text-sm font-medium text-charcoal-600 hover:text-charcoal-900"
            >
              Back to Households
            </button>
            <button
              type="button"
              onClick={fetchHouseholdData}
              className="text-sm font-medium text-brand-700 hover:text-brand-600"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header */}
      {loading ? (
        <HeaderSkeleton />
      ) : household ? (
        <>
          <HouseholdHeader
            household={{
              displayName: household.display_name,
              primaryState: household.primary_state,
              householdId: household.household_id,
            }}
            personCount={persons.length}
            returnCount={returns.length}
          />

          {/* Upload Return Button */}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleUploadReturn}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-700 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-600 active:bg-brand-800"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
              Upload Return
            </button>
          </div>
        </>
      ) : null}

      {/* Tab Navigation */}
      <div className="border-b border-limestone-200">
        <nav className="-mb-px flex gap-6" aria-label="Household tabs">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`whitespace-nowrap border-b-2 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'border-brand-700 text-brand-700'
                  : 'border-transparent text-charcoal-500 hover:border-charcoal-300 hover:text-charcoal-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {loading ? (
          <ContentSkeleton />
        ) : (
          <>
            {activeTab === 'overview' && household && (
              <OverviewTab
                household={household}
                personsCount={persons.length}
                returnsCount={returns.length}
                docsCount={documents.length}
              />
            )}

            {activeTab === 'returns' && (
              <ReturnsPanel
                returns={returns}
                onSelect={handleSelectReturn}
                onUploadNew={handleUploadReturn}
              />
            )}

            {activeTab === 'documents' && (
              <DocsPanel
                documents={documents}
                onSelect={handleSelectDoc}
              />
            )}

            {activeTab === 'people' && (
              <PeoplePanel
                people={persons}
                onAdd={handleAddPerson}
                onEdit={handleEditPerson}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
