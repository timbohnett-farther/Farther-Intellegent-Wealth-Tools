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
      aum_mm: smaParsedDocuments.aum_mm,
      management_fee_bps: smaParsedDocuments.management_fee_bps,
      full_text: smaParsedDocuments.full_text,
      parsed_at: smaParsedDocuments.parsed_at,
      extraction_confidence: smaParsedDocuments.extraction_confidence,
      extraction_model: smaParsedDocuments.extraction_model,
      provider_key: smaProviders.provider_key,
      provider_name: smaProviders.provider_name,
      document_url: smaFactSheetDocuments.canonical_url,
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
      change_type: smaChangeEvents.change_type,
      change_severity: smaChangeEvents.change_severity,
      field_changed: smaChangeEvents.field_changed,
      old_value: smaChangeEvents.old_value,
      new_value: smaChangeEvents.new_value,
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
      content_size_bytes: smaFactSheetVersions.content_size_bytes,
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
            {strategy.aum_mm
              ? `$${parseFloat(strategy.aum_mm).toFixed(1)}M`
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
          <p className="text-sm font-medium text-text-secondary">Extraction Confidence</p>
          <p className="mt-2 text-2xl font-semibold text-text-primary">
            {strategy.extraction_confidence
              ? `${(parseFloat(strategy.extraction_confidence) * 100).toFixed(0)}%`
              : 'N/A'
            }
          </p>
          {strategy.extraction_model && (
            <p className="mt-1 text-xs text-text-muted">
              {strategy.extraction_model}
            </p>
          )}
        </div>

        <div className="rounded-xl border border-border bg-surface p-6">
          <p className="text-sm font-medium text-text-secondary">Inception Date</p>
          <p className="mt-2 text-2xl font-semibold text-text-primary">
            {strategy.inception_date
              ? new Date(strategy.inception_date).toLocaleDateString()
              : 'N/A'
            }
          </p>
        </div>
      </div>

      {/* Extracted Text */}
      {strategy.full_text && (
        <div className="rounded-xl border border-border bg-surface p-6">
          <h2 className="text-lg font-semibold text-text-primary">Extracted Text</h2>
          <p className="mt-1 text-sm text-text-secondary">
            AI-extracted content from fact sheet
          </p>
          <div className="mt-4 max-h-96 overflow-y-auto rounded-md bg-surface-subtle p-4">
            <pre className="text-xs text-text-primary whitespace-pre-wrap">
              {strategy.full_text.substring(0, 2000)}
              {strategy.full_text.length > 2000 && '...'}
            </pre>
          </div>
        </div>
      )}

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
              return (
                <div key={change.id} className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        change.change_severity === 'high'
                          ? 'bg-error/10 text-error dark:bg-error/20'
                          : change.change_severity === 'medium'
                          ? 'bg-warning/10 text-warning dark:bg-warning/20'
                          : 'bg-surface-subtle text-text-secondary'
                      }`}>
                        {change.change_severity || 'low'} severity
                      </span>
                      <span className="inline-flex items-center rounded-full bg-surface-subtle px-2.5 py-0.5 text-xs font-medium text-text-secondary">
                        {change.change_type}
                      </span>
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

                  {change.field_changed && (
                    <div className="mt-4">
                      <p className="text-xs font-medium uppercase tracking-wider text-text-secondary">
                        Field Changed
                      </p>
                      <div className="mt-2 rounded-md border border-border bg-surface-subtle p-3">
                        <p className="text-xs font-medium text-text-primary">
                          {change.field_changed.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                        </p>
                        <div className="mt-1 flex items-center gap-2 text-xs">
                          <span className="text-text-muted line-through">
                            {change.old_value ? String(change.old_value).substring(0, 40) : 'N/A'}
                          </span>
                          <span className="text-text-muted">→</span>
                          <span className="text-text-primary font-medium">
                            {change.new_value ? String(change.new_value).substring(0, 40) : 'N/A'}
                          </span>
                        </div>
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
                  {version.content_size_bytes && (
                    <p className="text-xs text-text-muted">
                      {(version.content_size_bytes / 1024).toFixed(1)} KB
                    </p>
                  )}
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
