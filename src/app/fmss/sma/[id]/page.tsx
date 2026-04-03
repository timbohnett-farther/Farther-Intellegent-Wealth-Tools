import { Suspense } from "react";
import { db } from "@/lib/db";
import {
  smaParsedDocuments,
  smaFactSheetDocuments,
  smaProviders,
  smaChangeEvents,
  smaFactSheetVersions
} from "@/lib/db/schema";
import { desc, eq, and } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

async function StrategyDetailContent({ documentId }: { documentId: string }) {
  // Get strategy details
  const [strategy] = await db
    .select({
      id: smaParsedDocuments.id,
      document_id: smaParsedDocuments.document_id,
      strategy_name: smaParsedDocuments.strategy_name,
      manager_name: smaParsedDocuments.manager_name,
      inception_date: smaParsedDocuments.inception_date,
      aum_amount: smaParsedDocuments.aum_amount,
      minimum_investment: smaParsedDocuments.minimum_investment,
      management_fee_bps: smaParsedDocuments.management_fee_bps,
      benchmark: smaParsedDocuments.benchmark,
      ytd_return: smaParsedDocuments.ytd_return,
      one_year_return: smaParsedDocuments.one_year_return,
      three_year_return: smaParsedDocuments.three_year_return,
      five_year_return: smaParsedDocuments.five_year_return,
      ten_year_return: smaParsedDocuments.ten_year_return,
      inception_return: smaParsedDocuments.inception_return,
      raw_text: smaParsedDocuments.raw_text,
      parsed_at: smaParsedDocuments.parsed_at,
      provider_key: smaProviders.provider_key,
      provider_name: smaProviders.provider_name,
      document_url: smaFactSheetDocuments.url,
      document_type: smaFactSheetDocuments.document_type,
      version_count: smaFactSheetDocuments.version_count,
    })
    .from(smaParsedDocuments)
    .leftJoin(smaFactSheetDocuments, eq(smaParsedDocuments.document_id, smaFactSheetDocuments.id))
    .leftJoin(smaProviders, eq(smaFactSheetDocuments.provider_id, smaProviders.id))
    .where(eq(smaParsedDocuments.document_id, documentId))
    .limit(1);

  if (!strategy) {
    notFound();
  }

  // Get change history
  const changeHistory = await db
    .select({
      id: smaChangeEvents.id,
      change_summary: smaChangeEvents.change_summary,
      material_changes_json: smaChangeEvents.material_changes_json,
      severity: smaChangeEvents.severity,
      advisor_action_required: smaChangeEvents.advisor_action_required,
      field_changes_json: smaChangeEvents.field_changes_json,
      detected_at: smaChangeEvents.detected_at,
    })
    .from(smaChangeEvents)
    .where(eq(smaChangeEvents.document_id, documentId))
    .orderBy(desc(smaChangeEvents.detected_at))
    .limit(20);

  // Get version history
  const versions = await db
    .select({
      id: smaFactSheetVersions.id,
      version_number: smaFactSheetVersions.version_number,
      file_size_bytes: smaFactSheetVersions.file_size_bytes,
      acquired_at: smaFactSheetVersions.acquired_at,
    })
    .from(smaFactSheetVersions)
    .where(eq(smaFactSheetVersions.document_id, documentId))
    .orderBy(desc(smaFactSheetVersions.acquired_at))
    .limit(10);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link
            href="/fmss/sma"
            className="text-sm text-brand-500 hover:text-brand-600 hover:underline"
          >
            ← Back to SMA Strategies
          </Link>
          <h1 className="mt-2 text-2xl font-semibold text-text-primary">
            {strategy.strategy_name}
          </h1>
          {strategy.manager_name && (
            <p className="mt-1 text-sm text-text-secondary">
              Managed by {strategy.manager_name}
            </p>
          )}
          <div className="mt-2 flex items-center gap-2">
            <span className="text-sm text-text-muted">{strategy.provider_name}</span>
            <span className="text-text-muted">·</span>
            <span className="text-sm text-text-muted">{strategy.provider_key}</span>
          </div>
        </div>
        {strategy.document_url && (
          <a
            href={strategy.document_url}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
          >
            View Fact Sheet
          </a>
        )}
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-surface p-6">
          <p className="text-sm font-medium text-text-secondary">Assets Under Management</p>
          <p className="mt-2 text-2xl font-semibold text-text-primary">
            {strategy.aum_amount
              ? strategy.aum_amount >= 1_000_000_000
                ? `$${(strategy.aum_amount / 1_000_000_000).toFixed(2)}B`
                : strategy.aum_amount >= 1_000_000
                ? `$${(strategy.aum_amount / 1_000_000).toFixed(1)}M`
                : `$${(strategy.aum_amount / 1_000).toFixed(0)}K`
              : 'N/A'
            }
          </p>
        </div>

        <div className="rounded-xl border border-border bg-surface p-6">
          <p className="text-sm font-medium text-text-secondary">Management Fee</p>
          <p className="mt-2 text-2xl font-semibold text-text-primary">
            {strategy.management_fee_bps
              ? `${strategy.management_fee_bps} bps`
              : 'N/A'
            }
          </p>
          {strategy.management_fee_bps && (
            <p className="mt-1 text-xs text-text-muted">
              {(strategy.management_fee_bps / 100).toFixed(2)}% annually
            </p>
          )}
        </div>

        <div className="rounded-xl border border-border bg-surface p-6">
          <p className="text-sm font-medium text-text-secondary">Minimum Investment</p>
          <p className="mt-2 text-2xl font-semibold text-text-primary">
            {strategy.minimum_investment
              ? `$${strategy.minimum_investment.toLocaleString()}`
              : 'N/A'
            }
          </p>
        </div>

        <div className="rounded-xl border border-border bg-surface p-6">
          <p className="text-sm font-medium text-text-secondary">Inception Date</p>
          <p className="mt-2 text-2xl font-semibold text-text-primary">
            {strategy.inception_date || 'N/A'}
          </p>
        </div>
      </div>

      {/* Performance */}
      <div className="rounded-xl border border-border bg-surface p-6">
        <h2 className="text-lg font-semibold text-text-primary">Performance</h2>
        {strategy.benchmark && (
          <p className="mt-1 text-sm text-text-secondary">
            Benchmark: {strategy.benchmark}
          </p>
        )}

        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {strategy.ytd_return !== null && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-text-secondary">YTD</p>
              <p className={`mt-1 text-xl font-semibold ${strategy.ytd_return >= 0 ? 'text-success' : 'text-error'}`}>
                {strategy.ytd_return >= 0 ? '+' : ''}{strategy.ytd_return.toFixed(2)}%
              </p>
            </div>
          )}
          {strategy.one_year_return !== null && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-text-secondary">1 Year</p>
              <p className={`mt-1 text-xl font-semibold ${strategy.one_year_return >= 0 ? 'text-success' : 'text-error'}`}>
                {strategy.one_year_return >= 0 ? '+' : ''}{strategy.one_year_return.toFixed(2)}%
              </p>
            </div>
          )}
          {strategy.three_year_return !== null && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-text-secondary">3 Year</p>
              <p className={`mt-1 text-xl font-semibold ${strategy.three_year_return >= 0 ? 'text-success' : 'text-error'}`}>
                {strategy.three_year_return >= 0 ? '+' : ''}{strategy.three_year_return.toFixed(2)}%
              </p>
            </div>
          )}
          {strategy.five_year_return !== null && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-text-secondary">5 Year</p>
              <p className={`mt-1 text-xl font-semibold ${strategy.five_year_return >= 0 ? 'text-success' : 'text-error'}`}>
                {strategy.five_year_return >= 0 ? '+' : ''}{strategy.five_year_return.toFixed(2)}%
              </p>
            </div>
          )}
          {strategy.ten_year_return !== null && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-text-secondary">10 Year</p>
              <p className={`mt-1 text-xl font-semibold ${strategy.ten_year_return >= 0 ? 'text-success' : 'text-error'}`}>
                {strategy.ten_year_return >= 0 ? '+' : ''}{strategy.ten_year_return.toFixed(2)}%
              </p>
            </div>
          )}
          {strategy.inception_return !== null && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-text-secondary">Since Inception</p>
              <p className={`mt-1 text-xl font-semibold ${strategy.inception_return >= 0 ? 'text-success' : 'text-error'}`}>
                {strategy.inception_return >= 0 ? '+' : ''}{strategy.inception_return.toFixed(2)}%
              </p>
            </div>
          )}
        </div>

        {!strategy.ytd_return && !strategy.one_year_return && (
          <p className="mt-4 text-sm text-text-muted">No performance data available</p>
        )}
      </div>

      {/* Change History */}
      {changeHistory.length > 0 && (
        <div className="rounded-xl border border-border bg-surface">
          <div className="border-b border-border px-6 py-4">
            <h2 className="text-lg font-semibold text-text-primary">Change History</h2>
            <p className="mt-1 text-sm text-text-secondary">
              Material changes detected by AI monitoring
            </p>
          </div>

          <div className="divide-y divide-border">
            {changeHistory.map((change) => {
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
                <div key={change.id} className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
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
                    <p className="text-sm text-text-secondary">
                      {new Date(change.detected_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>

                  <p className="mt-3 text-sm text-text-primary">
                    {change.change_summary || 'Content updated'}
                  </p>

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
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Version History */}
      {versions.length > 0 && (
        <div className="rounded-xl border border-border bg-surface p-6">
          <h2 className="text-lg font-semibold text-text-primary">Version History</h2>
          <p className="mt-1 text-sm text-text-secondary">
            {versions.length} version{versions.length === 1 ? '' : 's'} tracked
          </p>

          <div className="mt-4 space-y-2">
            {versions.map((version) => (
              <div key={version.id} className="flex items-center justify-between rounded-md border border-border bg-surface-subtle p-3">
                <div>
                  <p className="text-sm font-medium text-text-primary">
                    Version {version.version_number}
                  </p>
                  <p className="text-xs text-text-muted">
                    {(version.file_size_bytes / 1024).toFixed(1)} KB
                  </p>
                </div>
                <p className="text-sm text-text-secondary">
                  {new Date(version.acquired_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Metadata */}
      <div className="rounded-xl border border-border bg-surface p-6">
        <h2 className="text-lg font-semibold text-text-primary">Metadata</h2>
        <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm font-medium text-text-secondary">Document Type</dt>
            <dd className="mt-1 text-sm text-text-primary">{strategy.document_type?.toUpperCase() || 'Unknown'}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-text-secondary">Last Parsed</dt>
            <dd className="mt-1 text-sm text-text-primary">
              {new Date(strategy.parsed_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-text-secondary">Version Count</dt>
            <dd className="mt-1 text-sm text-text-primary">{strategy.version_count || 0} version{strategy.version_count === 1 ? '' : 's'}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-text-secondary">Provider</dt>
            <dd className="mt-1 text-sm text-text-primary">{strategy.provider_name} ({strategy.provider_key})</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}

export default function StrategyDetailPage({ params }: { params: { id: string } }) {
  return (
    <Suspense fallback={
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent"></div>
      </div>
    }>
      <StrategyDetailContent documentId={params.id} />
    </Suspense>
  );
}
