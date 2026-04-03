/**
 * SMA Seed URL Admin
 *
 * Manage discovery seed URLs for SMA providers.
 * View, add, edit, and prioritize starting points for fact sheet crawling.
 */

import { db } from '@/lib/db';
import { smaProviderSeedUrls, smaProviders } from '@/lib/db/schema';
import { desc, asc, count, eq } from 'drizzle-orm';

export const metadata = {
  title: 'SMA Seed URLs - Admin | FMSS',
  description: 'Manage SMA discovery seed URLs and crawl starting points',
};

export const dynamic = 'force-dynamic';

async function getSeedUrls() {
  const seedUrls = await db
    .select({
      id: smaProviderSeedUrls.id,
      seed_url: smaProviderSeedUrls.seed_url,
      url_type: smaProviderSeedUrls.url_type,
      url_label: smaProviderSeedUrls.url_label,
      crawl_depth: smaProviderSeedUrls.crawl_depth,
      is_active: smaProviderSeedUrls.is_active,
      priority: smaProviderSeedUrls.priority,
      last_crawled: smaProviderSeedUrls.last_crawled,
      last_success: smaProviderSeedUrls.last_success,
      consecutive_failures: smaProviderSeedUrls.consecutive_failures,
      created_at: smaProviderSeedUrls.created_at,
      provider_id: smaProviderSeedUrls.provider_id,
      provider_name: smaProviders.provider_name,
      provider_key: smaProviders.provider_key,
      provider_rank: smaProviders.provider_rank,
    })
    .from(smaProviderSeedUrls)
    .leftJoin(smaProviders, eq(smaProviderSeedUrls.provider_id, smaProviders.id))
    .orderBy(desc(smaProviderSeedUrls.priority), asc(smaProviders.provider_rank));

  return seedUrls;
}

async function getSeedUrlStats() {
  const total = await db
    .select({ count: count() })
    .from(smaProviderSeedUrls);

  const active = await db
    .select({ count: count() })
    .from(smaProviderSeedUrls)
    .where(eq(smaProviderSeedUrls.is_active, true));

  const typeCounts = await db
    .select({
      type: smaProviderSeedUrls.url_type,
      count: count(),
    })
    .from(smaProviderSeedUrls)
    .groupBy(smaProviderSeedUrls.url_type);

  return {
    total: total[0].count,
    active: active[0].count,
    typeCounts,
  };
}

export default async function SMASeedURLsPage() {
  const seedUrls = await getSeedUrls();
  const stats = await getSeedUrlStats();

  return (
    <div className="min-h-screen bg-surface-muted p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-text-primary">SMA Seed URLs</h1>
            <p className="mt-1 text-sm text-text-secondary">
              Discovery starting points for SMA fact sheet crawling
            </p>
          </div>
          <button
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
          >
            + Add Seed URL
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-border bg-surface p-5">
            <div className="text-sm font-medium text-text-secondary">Total Seed URLs</div>
            <div className="mt-2 text-3xl font-bold text-text-primary">{stats.total}</div>
          </div>
          <div className="rounded-xl border border-border bg-surface p-5">
            <div className="text-sm font-medium text-text-secondary">Active URLs</div>
            <div className="mt-2 text-3xl font-bold text-success">{stats.active}</div>
          </div>
          <div className="rounded-xl border border-border bg-surface p-5">
            <div className="text-sm font-medium text-text-secondary">Strategy Lists</div>
            <div className="mt-2 text-3xl font-bold text-brand-500">
              {stats.typeCounts.find((t) => t.type === 'strategy_list')?.count || 0}
            </div>
          </div>
          <div className="rounded-xl border border-border bg-surface p-5">
            <div className="text-sm font-medium text-text-secondary">PDF Indexes</div>
            <div className="mt-2 text-3xl font-bold text-info">
              {stats.typeCounts.find((t) => t.type === 'pdf_index')?.count || 0}
            </div>
          </div>
        </div>

        {/* Seed URL Table */}
        <div className="rounded-xl border border-border bg-surface">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-surface-muted text-left text-sm font-medium text-text-secondary">
                  <th className="px-4 py-3">Priority</th>
                  <th className="px-4 py-3">Provider</th>
                  <th className="px-4 py-3">URL & Label</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Depth</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Last Crawled</th>
                  <th className="px-4 py-3">Failures</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {seedUrls.map((url) => (
                  <tr
                    key={url.id}
                    className="text-sm text-text-primary hover:bg-surface-subtle"
                  >
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex h-8 w-8 items-center justify-center rounded-full font-mono text-xs font-bold ${
                          (url.priority || 0) >= 90
                            ? 'bg-error/10 text-error'
                            : (url.priority || 0) >= 70
                            ? 'bg-brand-500/10 text-brand-500'
                            : 'bg-surface-subtle text-text-muted'
                        }`}
                      >
                        {url.priority || 50}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium">
                        #{url.provider_rank} {url.provider_name}
                      </div>
                      <div className="text-xs text-text-muted">{url.provider_key}</div>
                    </td>
                    <td className="px-4 py-3 max-w-md">
                      <div className="font-medium text-brand-500 truncate">{url.url_label}</div>
                      <div className="text-xs text-text-muted truncate">{url.seed_url}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                          url.url_type === 'strategy_list'
                            ? 'bg-brand-500/10 text-brand-500'
                            : url.url_type === 'pdf_index'
                            ? 'bg-info/10 text-info'
                            : url.url_type === 'sitemap'
                            ? 'bg-success/10 text-success'
                            : 'bg-surface-subtle text-text-secondary'
                        }`}
                      >
                        {url.url_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center font-mono text-text-secondary">
                      {url.crawl_depth}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                          url.is_active
                            ? 'bg-success/10 text-success'
                            : 'bg-surface-subtle text-text-muted'
                        }`}
                      >
                        {url.is_active ? 'Active' : 'Paused'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-text-muted">
                      {url.last_crawled
                        ? new Date(url.last_crawled).toLocaleDateString()
                        : 'Never'}
                      {url.last_success && (
                        <div className="text-success">
                          ✓ {new Date(url.last_success).toLocaleDateString()}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {(url.consecutive_failures || 0) > 0 ? (
                        <span className="inline-flex rounded-full bg-error/10 px-2 py-1 text-xs font-medium text-error">
                          {url.consecutive_failures}
                        </span>
                      ) : (
                        <span className="text-text-muted">0</span>
                      )}
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
              Showing {seedUrls.length} seed URLs • Last updated:{' '}
              {new Date().toLocaleString()}
            </div>
            <div className="text-text-muted">
              Weekly discovery runs: Monday 4:00 UTC (Phase 7)
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
