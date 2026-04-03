import { Suspense } from "react";
import { db } from "@/lib/db";
import { smaChangeEvents, smaFactSheetDocuments, smaProviders } from "@/lib/db/schema";
import { desc, asc, count, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

async function ChangesContent() {
  // Get stats
  const [totalChanges] = await db
    .select({ count: count() })
    .from(smaChangeEvents);

  const [highSeverity] = await db
    .select({ count: count() })
    .from(smaChangeEvents)
    .where(eq(smaChangeEvents.severity, 'high'));

  const [mediumSeverity] = await db
    .select({ count: count() })
    .from(smaChangeEvents)
    .where(eq(smaChangeEvents.severity, 'medium'));

  const [actionRequired] = await db
    .select({ count: count() })
    .from(smaChangeEvents)
    .where(eq(smaChangeEvents.advisor_action_required, true));

  // Get recent change events
  const changes = await db
    .select({
      id: smaChangeEvents.id,
      document_id: smaChangeEvents.document_id,
      change_summary: smaChangeEvents.change_summary,
      material_changes_json: smaChangeEvents.material_changes_json,
      severity: smaChangeEvents.severity,
      advisor_action_required: smaChangeEvents.advisor_action_required,
      field_changes_json: smaChangeEvents.field_changes_json,
      detected_at: smaChangeEvents.detected_at,
      document_url: smaFactSheetDocuments.url,
      provider_key: smaProviders.provider_key,
      provider_name: smaProviders.provider_name,
    })
    .from(smaChangeEvents)
    .leftJoin(smaFactSheetDocuments, eq(smaChangeEvents.document_id, smaFactSheetDocuments.id))
    .leftJoin(smaProviders, eq(smaFactSheetDocuments.provider_id, smaProviders.id))
    .orderBy(desc(smaChangeEvents.detected_at))
    .limit(100);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Change Events</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Detected material changes in SMA fact sheets
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-surface p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-text-secondary">Total Changes</p>
          </div>
          <p className="mt-2 text-3xl font-semibold text-text-primary">
            {totalChanges.count.toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-text-muted">All detected changes</p>
        </div>

        <div className="rounded-xl border border-border bg-surface p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-text-secondary">High Severity</p>
          </div>
          <p className="mt-2 text-3xl font-semibold text-error">
            {highSeverity.count.toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-text-muted">
            {totalChanges.count > 0
              ? `${((highSeverity.count / totalChanges.count) * 100).toFixed(1)}% of total`
              : '0% of total'
            }
          </p>
        </div>

        <div className="rounded-xl border border-border bg-surface p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-text-secondary">Medium Severity</p>
          </div>
          <p className="mt-2 text-3xl font-semibold text-warning">
            {mediumSeverity.count.toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-text-muted">
            {totalChanges.count > 0
              ? `${((mediumSeverity.count / totalChanges.count) * 100).toFixed(1)}% of total`
              : '0% of total'
            }
          </p>
        </div>

        <div className="rounded-xl border border-border bg-surface p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-text-secondary">Action Required</p>
          </div>
          <p className="mt-2 text-3xl font-semibold text-brand-500">
            {actionRequired.count.toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-text-muted">Requires advisor review</p>
        </div>
      </div>

      {/* Change Events Table */}
      <div className="rounded-xl border border-border bg-surface">
        <div className="border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold text-text-primary">Recent Changes</h2>
          <p className="mt-1 text-sm text-text-secondary">
            Last 100 detected material changes
          </p>
        </div>

        <div className="divide-y divide-border">
          {changes.map((change) => {
            const materialChanges = change.material_changes_json
              ? (typeof change.material_changes_json === 'string'
                  ? JSON.parse(change.material_changes_json)
                  : change.material_changes_json)
              : [];

            const fieldChanges = change.field_changes_json
              ? (typeof change.field_changes_json === 'string'
                  ? JSON.parse(change.field_changes_json)
                  : change.field_changes_json)
              : [];

            return (
              <div key={change.id} className="p-6 hover:bg-surface-subtle">
                {/* Header Row */}
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-medium text-text-primary">
                        {change.provider_name}
                      </h3>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        change.severity === 'high'
                          ? 'bg-error/10 text-error dark:bg-error/20'
                          : change.severity === 'medium'
                          ? 'bg-warning/10 text-warning dark:bg-warning/20'
                          : 'bg-surface-subtle text-text-secondary'
                      }`}>
                        {change.severity} severity
                      </span>
                      {change.advisor_action_required && (
                        <span className="inline-flex items-center rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-medium text-brand-700 dark:bg-brand-900 dark:text-brand-300">
                          Action Required
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-text-muted">{change.provider_key}</p>
                  </div>
                  <div className="text-right text-sm text-text-secondary">
                    {new Date(change.detected_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>

                {/* Change Summary */}
                <div className="mt-4">
                  <p className="text-sm text-text-primary">
                    {change.change_summary || 'Content updated'}
                  </p>
                </div>

                {/* Material Changes */}
                {materialChanges.length > 0 && (
                  <div className="mt-4">
                    <p className="text-xs font-medium uppercase tracking-wider text-text-secondary">
                      Material Changes
                    </p>
                    <ul className="mt-2 space-y-1">
                      {materialChanges.map((materialChange: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-text-primary">
                          <span className="text-brand-500">•</span>
                          <span>{materialChange}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Field Changes */}
                {fieldChanges.length > 0 && (
                  <div className="mt-4">
                    <p className="text-xs font-medium uppercase tracking-wider text-text-secondary">
                      Field Changes ({fieldChanges.length})
                    </p>
                    <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {fieldChanges.slice(0, 4).map((fieldChange: any, idx: number) => (
                        <div key={idx} className="rounded-md border border-border bg-surface-subtle p-3">
                          <p className="text-xs font-medium text-text-primary">
                            {fieldChange.field.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                          </p>
                          <div className="mt-1 flex items-center gap-2 text-xs">
                            <span className="text-text-muted line-through">
                              {String(fieldChange.old_value).substring(0, 20)}
                            </span>
                            <span className="text-text-muted">→</span>
                            <span className="text-text-primary font-medium">
                              {String(fieldChange.new_value).substring(0, 20)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                    {fieldChanges.length > 4 && (
                      <p className="mt-2 text-xs text-text-muted">
                        +{fieldChanges.length - 4} more changes
                      </p>
                    )}
                  </div>
                )}

                {/* Document URL */}
                {change.document_url && (
                  <div className="mt-4">
                    <a
                      href={change.document_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-brand-500 hover:text-brand-600 hover:underline"
                    >
                      View source document →
                    </a>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {changes.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-sm text-text-muted">No change events found</p>
            <p className="mt-1 text-xs text-text-muted">
              Changes will appear here as documents are updated
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SMAChangesPage() {
  return (
    <Suspense fallback={
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent"></div>
      </div>
    }>
      <ChangesContent />
    </Suspense>
  );
}
