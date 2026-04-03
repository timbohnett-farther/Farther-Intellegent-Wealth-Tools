/**
 * SMA Provider Admin
 *
 * Manage the registry of top 50 SMA providers.
 * View provider details, edit discovery configuration, monitor provider status.
 */

import { db } from '@/lib/db';
import { smaProviders } from '@/lib/db/schema';
import { desc, asc, count, eq } from 'drizzle-orm';

export const metadata = {
  title: 'SMA Providers - Admin | FMSS',
  description: 'Manage SMA provider registry and discovery configuration',
};

export const dynamic = 'force-dynamic';

async function getProviders() {
  const providers = await db
    .select()
    .from(smaProviders)
    .orderBy(asc(smaProviders.provider_rank));

  return providers;
}

async function getProviderStats() {
  const total = await db
    .select({ count: count() })
    .from(smaProviders);

  const tierCounts = await db
    .select({
      tier: smaProviders.provider_tier,
      count: count(),
    })
    .from(smaProviders)
    .groupBy(smaProviders.provider_tier);

  const activeCount = await db
    .select({ count: count() })
    .from(smaProviders)
    .where(eq(smaProviders.discovery_mode, 'active'));

  return {
    total: total[0].count,
    tierCounts,
    activeCount: activeCount[0].count,
  };
}

export default async function SMAProvidersPage() {
  const providers = await getProviders();
  const stats = await getProviderStats();

  return (
    <div className="min-h-screen bg-surface-muted p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-text-primary">SMA Provider Registry</h1>
            <p className="mt-1 text-sm text-text-secondary">
              Top 50 wealth managers tracked for SMA fact sheet monitoring
            </p>
          </div>
          <button
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
          >
            + Add Provider
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-border bg-surface p-5">
            <div className="text-sm font-medium text-text-secondary">Total Providers</div>
            <div className="mt-2 text-3xl font-bold text-text-primary">{stats.total}</div>
          </div>
          <div className="rounded-xl border border-border bg-surface p-5">
            <div className="text-sm font-medium text-text-secondary">Active Discovery</div>
            <div className="mt-2 text-3xl font-bold text-success">{stats.activeCount}</div>
          </div>
          <div className="rounded-xl border border-border bg-surface p-5">
            <div className="text-sm font-medium text-text-secondary">Tier 1 (≥$50B)</div>
            <div className="mt-2 text-3xl font-bold text-brand-500">
              {stats.tierCounts.find((t) => t.tier === 'tier_1')?.count || 0}
            </div>
          </div>
          <div className="rounded-xl border border-border bg-surface p-5">
            <div className="text-sm font-medium text-text-secondary">Tier 2 ($10-50B)</div>
            <div className="mt-2 text-3xl font-bold text-text-secondary">
              {stats.tierCounts.find((t) => t.tier === 'tier_2')?.count || 0}
            </div>
          </div>
        </div>

        {/* Provider Table */}
        <div className="rounded-xl border border-border bg-surface">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-surface-muted text-left text-sm font-medium text-text-secondary">
                  <th className="px-4 py-3">Rank</th>
                  <th className="px-4 py-3">Provider</th>
                  <th className="px-4 py-3">AUM</th>
                  <th className="px-4 py-3">Strategies</th>
                  <th className="px-4 py-3">Tier</th>
                  <th className="px-4 py-3">Discovery</th>
                  <th className="px-4 py-3">Auth</th>
                  <th className="px-4 py-3">Last Run</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {providers.map((provider) => (
                  <tr
                    key={provider.id}
                    className="text-sm text-text-primary hover:bg-surface-subtle"
                  >
                    <td className="px-4 py-3 font-mono text-text-secondary">
                      #{provider.provider_rank}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{provider.provider_name}</div>
                      <div className="text-xs text-text-muted">{provider.website_domain}</div>
                    </td>
                    <td className="px-4 py-3 font-mono">
                      ${parseFloat(provider.aum_bn || '0').toFixed(1)}B
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="rounded-full bg-surface-subtle px-2 py-1 text-xs font-medium">
                        {provider.strategy_count_estimate}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                          provider.provider_tier === 'tier_1'
                            ? 'bg-brand-500/10 text-brand-500'
                            : provider.provider_tier === 'tier_2'
                            ? 'bg-info/10 text-info'
                            : 'bg-surface-subtle text-text-secondary'
                        }`}
                      >
                        {provider.provider_tier?.replace('tier_', 'Tier ')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                          provider.discovery_mode === 'active'
                            ? 'bg-success/10 text-success'
                            : provider.discovery_mode === 'paused'
                            ? 'bg-warning/10 text-warning'
                            : 'bg-surface-subtle text-text-secondary'
                        }`}
                      >
                        {provider.discovery_mode}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                          provider.auth_sensitivity === 'public'
                            ? 'bg-success/10 text-success'
                            : provider.auth_sensitivity === 'login_required'
                            ? 'bg-warning/10 text-warning'
                            : 'bg-error/10 text-error'
                        }`}
                      >
                        {provider.auth_sensitivity}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-text-muted">
                      {provider.last_discovery_run
                        ? new Date(provider.last_discovery_run).toLocaleDateString()
                        : 'Never'}
                    </td>
                    <td className="px-4 py-3">
                      <button className="text-sm font-medium text-brand-500 hover:text-brand-600">
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Stats */}
        <div className="rounded-xl border border-border bg-surface p-4 text-sm text-text-secondary">
          <div className="flex items-center justify-between">
            <div>
              Showing {providers.length} providers • Last updated:{' '}
              {new Date().toLocaleString()}
            </div>
            <div className="text-text-muted">
              Next discovery run: Daily at 5:00 UTC (Phase 7)
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
