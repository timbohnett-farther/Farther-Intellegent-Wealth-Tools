import { Suspense } from "react";
import { db } from "@/lib/db";
import { smaProviderRuns, smaProviders } from "@/lib/db/schema";
import { desc, asc, count, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

async function RunsContent() {
  // Get stats
  const [totalRuns] = await db
    .select({ count: count() })
    .from(smaProviderRuns);

  const [successfulRuns] = await db
    .select({ count: count() })
    .from(smaProviderRuns)
    .where(eq(smaProviderRuns.status, 'success'));

  const [failedRuns] = await db
    .select({ count: count() })
    .from(smaProviderRuns)
    .where(eq(smaProviderRuns.status, 'failed'));

  const [runningRuns] = await db
    .select({ count: count() })
    .from(smaProviderRuns)
    .where(eq(smaProviderRuns.status, 'running'));

  // Get recent runs
  const runs = await db
    .select({
      id: smaProviderRuns.id,
      provider_key: smaProviders.provider_key,
      provider_name: smaProviders.provider_name,
      run_type: smaProviderRuns.run_type,
      status: smaProviderRuns.status,
      urls_discovered: smaProviderRuns.urls_discovered,
      documents_acquired: smaProviderRuns.documents_acquired,
      errors_encountered: smaProviderRuns.errors_encountered,
      duration_seconds: smaProviderRuns.duration_seconds,
      triggered_by: smaProviderRuns.triggered_by,
      started_at: smaProviderRuns.started_at,
      completed_at: smaProviderRuns.completed_at,
    })
    .from(smaProviderRuns)
    .leftJoin(smaProviders, eq(smaProviderRuns.provider_id, smaProviders.id))
    .orderBy(desc(smaProviderRuns.started_at))
    .limit(100);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">SMA Worker Runs</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Discovery, acquisition, and parsing run history
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-surface p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-text-secondary">Total Runs</p>
          </div>
          <p className="mt-2 text-3xl font-semibold text-text-primary">
            {totalRuns.count.toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-text-muted">All worker executions</p>
        </div>

        <div className="rounded-xl border border-border bg-surface p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-text-secondary">Successful</p>
          </div>
          <p className="mt-2 text-3xl font-semibold text-success">
            {successfulRuns.count.toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-text-muted">
            {totalRuns.count > 0
              ? `${((successfulRuns.count / totalRuns.count) * 100).toFixed(1)}% success rate`
              : '0% success rate'
            }
          </p>
        </div>

        <div className="rounded-xl border border-border bg-surface p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-text-secondary">Failed</p>
          </div>
          <p className="mt-2 text-3xl font-semibold text-error">
            {failedRuns.count.toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-text-muted">
            {totalRuns.count > 0
              ? `${((failedRuns.count / totalRuns.count) * 100).toFixed(1)}% failure rate`
              : '0% failure rate'
            }
          </p>
        </div>

        <div className="rounded-xl border border-border bg-surface p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-text-secondary">Running</p>
          </div>
          <p className="mt-2 text-3xl font-semibold text-warning">
            {runningRuns.count.toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-text-muted">Currently executing</p>
        </div>
      </div>

      {/* Runs Table */}
      <div className="rounded-xl border border-border bg-surface">
        <div className="border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold text-text-primary">Recent Runs</h2>
          <p className="mt-1 text-sm text-text-secondary">
            Last 100 worker executions
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-border bg-surface-subtle">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-secondary">
                  Provider
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-secondary">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-secondary">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-secondary">
                  Results
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-secondary">
                  Duration
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-secondary">
                  Started
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-secondary">
                  Triggered By
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {runs.map((run) => (
                <tr key={run.id} className="hover:bg-surface-subtle">
                  <td className="px-6 py-4 text-sm">
                    <div>
                      <p className="font-medium text-text-primary">{run.provider_name || 'All Providers'}</p>
                      {run.provider_key && (
                        <p className="text-xs text-text-muted">{run.provider_key}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      run.run_type === 'discovery'
                        ? 'bg-brand-100 text-brand-700 dark:bg-brand-900 dark:text-brand-300'
                        : run.run_type === 'acquisition'
                        ? 'bg-info/10 text-info'
                        : 'bg-success/10 text-success'
                    }`}>
                      {run.run_type}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      run.status === 'success'
                        ? 'bg-success/10 text-success dark:bg-success/20'
                        : run.status === 'failed'
                        ? 'bg-error/10 text-error dark:bg-error/20'
                        : 'bg-warning/10 text-warning dark:bg-warning/20'
                    }`}>
                      {run.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <div className="space-y-1">
                      {run.urls_discovered !== null && (
                        <p className="text-text-primary">
                          <span className="font-medium">{run.urls_discovered}</span>{' '}
                          <span className="text-text-muted">discovered</span>
                        </p>
                      )}
                      {run.documents_acquired !== null && (
                        <p className="text-text-primary">
                          <span className="font-medium">{run.documents_acquired}</span>{' '}
                          <span className="text-text-muted">acquired</span>
                        </p>
                      )}
                      {run.errors_encountered !== null && run.errors_encountered > 0 && (
                        <p className="text-error">
                          <span className="font-medium">{run.errors_encountered}</span>{' '}
                          <span>errors</span>
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-text-secondary">
                    {run.duration_seconds !== null
                      ? run.duration_seconds >= 60
                        ? `${Math.floor(run.duration_seconds / 60)}m ${run.duration_seconds % 60}s`
                        : `${run.duration_seconds}s`
                      : run.status === 'running'
                      ? 'In progress...'
                      : '-'
                    }
                  </td>
                  <td className="px-6 py-4 text-sm text-text-secondary">
                    {new Date(run.started_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </td>
                  <td className="px-6 py-4 text-sm text-text-muted">
                    {run.triggered_by || 'Unknown'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {runs.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-sm text-text-muted">No runs found</p>
            <p className="mt-1 text-xs text-text-muted">
              Worker executions will appear here
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SMARunsPage() {
  return (
    <Suspense fallback={
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent"></div>
      </div>
    }>
      <RunsContent />
    </Suspense>
  );
}
