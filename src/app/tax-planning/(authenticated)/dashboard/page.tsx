'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/tax-planning/auth-context';
import { useToast } from '@/lib/tax-planning/auth-context';
import type { Household, TaxReturn, ReturnDocument } from '@/lib/tax-planning/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DashboardStats {
  totalHouseholds: number;
  activeReturns: number;
  pendingDocuments: number;
  recentComputations: number;
}

interface RecentActivity {
  id: string;
  description: string;
  timestamp: string;
  type: 'household' | 'return' | 'document' | 'computation';
}

// ---------------------------------------------------------------------------
// Skeleton Components
// ---------------------------------------------------------------------------

function StatCardSkeleton() {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.07] backdrop-blur-xl p-6 shadow-sm animate-pulse">
      <div className="h-4 w-24 rounded bg-white/[0.06] mb-3" />
      <div className="h-8 w-16 rounded bg-white/[0.06]" />
    </div>
  );
}

function ActivitySkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="flex items-center gap-3 animate-pulse">
          <div className="h-8 w-8 rounded-full bg-white/[0.06]" />
          <div className="flex-1">
            <div className="h-4 w-3/4 rounded bg-white/[0.06] mb-1" />
            <div className="h-3 w-1/3 rounded bg-white/[0.06]" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stat Card
// ---------------------------------------------------------------------------

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}

function StatCard({ label, value, icon, color }: StatCardProps) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.07] backdrop-blur-xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-white/40 uppercase tracking-wider">{label}</p>
        <div className={`flex items-center justify-center h-10 w-10 rounded-lg ${color}`}>
          {icon}
        </div>
      </div>
      <p className="text-3xl font-bold text-white tabular-nums">{value}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Activity Icon
// ---------------------------------------------------------------------------

function getActivityIcon(type: RecentActivity['type']): React.ReactNode {
  const base = 'h-4 w-4';
  switch (type) {
    case 'household':
      return (
        <svg className={`${base} text-teal-300`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
        </svg>
      );
    case 'return':
      return (
        <svg className={`${base} text-info-700`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
      );
    case 'document':
      return (
        <svg className={`${base} text-warning-700`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
        </svg>
      );
    case 'computation':
      return (
        <svg className={`${base} text-success-700`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 15.75V18m-7.5-6.75h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V13.5zm0 2.25h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V18zm2.498-6.75h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007V13.5zm0 2.25h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007V18zm2.504-6.75h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V13.5zm0 2.25h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V18zm2.498-6.75h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V13.5zM8.25 6h7.5v2.25h-7.5V6zM12 2.25c-1.892 0-3.758.11-5.593.322C5.307 2.7 4.5 3.65 4.5 4.757V19.5a2.25 2.25 0 002.25 2.25h10.5a2.25 2.25 0 002.25-2.25V4.757c0-1.108-.806-2.057-1.907-2.185A48.507 48.507 0 0012 2.25z" />
        </svg>
      );
  }
}

function getActivityBg(type: RecentActivity['type']): string {
  switch (type) {
    case 'household':
      return 'bg-teal-500/10';
    case 'return':
      return 'bg-info-100';
    case 'document':
      return 'bg-warning-100';
    case 'computation':
      return 'bg-success-100';
  }
}

// ---------------------------------------------------------------------------
// Dashboard Page
// ---------------------------------------------------------------------------

export default function DashboardPage() {
  const { user, token } = useAuth();
  const { addToast } = useToast();
  const router = useRouter();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/v1/households', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error('Failed to fetch dashboard data');
      }

      const households: Household[] = await res.json();

      // Fetch returns and documents for all households in parallel
      const [returnsResults, docsResults] = await Promise.all([
        Promise.all(
          households.map((h) =>
            fetch(`/api/v1/households/${h.household_id}/returns`, {
              headers: { Authorization: `Bearer ${token}` },
            }).then((r) => (r.ok ? r.json() : []))
          )
        ),
        Promise.all(
          households.map((h) =>
            fetch(`/api/v1/households/${h.household_id}/documents`, {
              headers: { Authorization: `Bearer ${token}` },
            }).then((r) => (r.ok ? r.json() : []))
          )
        ),
      ]);

      const allReturns: TaxReturn[] = returnsResults.flat();
      const allDocs: ReturnDocument[] = docsResults.flat();

      const pendingDocs = allDocs.filter(
        (d) => d.ingest_status === 'UPLOADED' || d.ingest_status === 'QUEUED' || d.ingest_status === 'PROCESSING'
      );

      setStats({
        totalHouseholds: households.length,
        activeReturns: allReturns.length,
        pendingDocuments: pendingDocs.length,
        recentComputations: 0,
      });

      // Build recent activity from the data
      const activities: RecentActivity[] = [];

      households
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
        .slice(0, 3)
        .forEach((h) => {
          activities.push({
            id: `h-${h.household_id}`,
            description: `Household "${h.display_name}" updated`,
            timestamp: h.updated_at,
            type: 'household',
          });
        });

      allReturns
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
        .slice(0, 3)
        .forEach((r) => {
          activities.push({
            id: `r-${r.return_id}`,
            description: `Tax Year ${r.tax_year} return (${r.filing_status}) updated`,
            timestamp: r.updated_at,
            type: 'return',
          });
        });

      allDocs
        .sort((a, b) => new Date(b.ingested_at).getTime() - new Date(a.ingested_at).getTime())
        .slice(0, 2)
        .forEach((d) => {
          activities.push({
            id: `d-${d.doc_id}`,
            description: `Document "${d.original_filename || 'Untitled'}" ${d.ingest_status.toLowerCase()}`,
            timestamp: d.ingested_at,
            type: 'document',
          });
        });

      activities.sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      setRecentActivity(activities.slice(0, 8));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
      addToast(message, 'error');
    } finally {
      setLoading(false);
    }
  }, [token, addToast]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const formatTimestamp = (iso: string): string => {
    try {
      const date = new Date(iso);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return iso;
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      {/* Welcome Header */}
      <div>
        <h1 className="font-serif text-3xl text-white tracking-wide">
          Welcome back, {user?.first_name || 'there'}
        </h1>
        <p className="mt-1 text-sm text-white/50">
          Here is an overview of your tax planning activity.
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : error ? (
          <div className="col-span-full rounded-lg border border-critical-200 bg-critical-50 p-6 text-center">
            <p className="text-sm font-medium text-critical-700">{error}</p>
            <button
              type="button"
              onClick={fetchDashboardData}
              className="mt-3 text-sm font-medium text-teal-300 hover:text-teal-300"
            >
              Try again
            </button>
          </div>
        ) : stats ? (
          <>
            <StatCard
              label="Total Households"
              value={stats.totalHouseholds}
              color="bg-teal-500/10"
              icon={
                <svg className="h-5 w-5 text-teal-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                </svg>
              }
            />
            <StatCard
              label="Active Returns"
              value={stats.activeReturns}
              color="bg-info-100"
              icon={
                <svg className="h-5 w-5 text-info-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
              }
            />
            <StatCard
              label="Pending Documents"
              value={stats.pendingDocuments}
              color="bg-warning-100"
              icon={
                <svg className="h-5 w-5 text-warning-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
            <StatCard
              label="Recent Computations"
              value={stats.recentComputations}
              color="bg-success-100"
              icon={
                <svg className="h-5 w-5 text-success-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 15.75V18m-7.5-6.75h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V13.5zm0 2.25h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V18zm2.498-6.75h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007V13.5zm0 2.25h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007V18zm2.504-6.75h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V13.5zm0 2.25h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V18zm2.498-6.75h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V13.5zM8.25 6h7.5v2.25h-7.5V6zM12 2.25c-1.892 0-3.758.11-5.593.322C5.307 2.7 4.5 3.65 4.5 4.757V19.5a2.25 2.25 0 002.25 2.25h10.5a2.25 2.25 0 002.25-2.25V4.757c0-1.108-.806-2.057-1.907-2.185A48.507 48.507 0 0012 2.25z" />
                </svg>
              }
            />
          </>
        ) : null}
      </div>

      {/* Quick Actions + Recent Activity */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Quick Actions */}
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.07] backdrop-blur-xl p-6 shadow-sm">
          <h2 className="font-serif text-lg text-white mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => router.push('/tax-planning/households')}
              className="flex w-full items-center gap-3 rounded-lg border border-white/[0.06] px-4 py-3 text-left transition-colors hover:border-teal-300 hover:bg-teal-500/10/30"
            >
              <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-teal-500/10">
                <svg className="h-4 w-4 text-teal-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-white">Upload Return</p>
                <p className="text-xs text-white/50">Upload a new tax return PDF</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                router.push('/tax-planning/households');
                addToast('Navigate to Households to create a new one', 'info');
              }}
              className="flex w-full items-center gap-3 rounded-lg border border-white/[0.06] px-4 py-3 text-left transition-colors hover:border-teal-300 hover:bg-teal-500/10/30"
            >
              <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-success-100">
                <svg className="h-4 w-4 text-success-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-white">Create Household</p>
                <p className="text-xs text-white/50">Set up a new household</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => router.push('/tax-planning/households')}
              className="flex w-full items-center gap-3 rounded-lg border border-white/[0.06] px-4 py-3 text-left transition-colors hover:border-teal-300 hover:bg-teal-500/10/30"
            >
              <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-info-100">
                <svg className="h-4 w-4 text-info-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-white">View All Households</p>
                <p className="text-xs text-white/50">Browse and manage households</p>
              </div>
            </button>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-2 rounded-2xl border border-white/[0.06] bg-white/[0.07] backdrop-blur-xl p-6 shadow-sm">
          <h2 className="font-serif text-lg text-white mb-4">Recent Activity</h2>

          {loading ? (
            <ActivitySkeleton />
          ) : recentActivity.length === 0 ? (
            <div className="py-8 text-center">
              <svg className="mx-auto h-10 w-10 text-white/30 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-white/50">No recent activity</p>
              <p className="text-xs text-white/30 mt-1">
                Activity will appear here as you work with households and returns.
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {recentActivity.map((activity) => (
                <li
                  key={activity.id}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-white/[0.04]"
                >
                  <div className={`flex items-center justify-center h-8 w-8 rounded-full flex-shrink-0 ${getActivityBg(activity.type)}`}>
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">
                      {activity.description}
                    </p>
                    <p className="text-xs text-white/30">
                      {formatTimestamp(activity.timestamp)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
