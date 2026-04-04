import { Suspense } from "react";
import { db } from "@/lib/db";
import {
  smaFactSheetDocuments,
  smaProviders,
  smaDiscoveredUrls,
  smaParsedDocuments
} from "@/lib/db/schema";
import { desc, asc, count, eq, sql } from "drizzle-orm";
import Link from "next/link";

export const dynamic = "force-dynamic";

async function DocumentsContent() {
  // Get stats
  const [totalDocs] = await db
    .select({ count: count() })
    .from(smaFactSheetDocuments);

  const [totalParsed] = await db
    .select({ count: count() })
    .from(smaParsedDocuments);

  const [totalPending] = await db
    .select({ count: count() })
    .from(smaDiscoveredUrls)
    .where(eq(smaDiscoveredUrls.acquisition_status, 'pending'));

  const [totalProcessing] = await db
    .select({ count: count() })
    .from(smaFactSheetDocuments)
    .where(eq(smaFactSheetDocuments.parse_status, 'pending'));

  // Get recent documents
  const documents = await db
    .select({
      id: smaFactSheetDocuments.id,
      canonical_url: smaFactSheetDocuments.canonical_url,
      document_type: smaFactSheetDocuments.document_type,
      current_content_hash: smaFactSheetDocuments.current_content_hash,
      version_count: smaFactSheetDocuments.version_count,
      parse_status: smaFactSheetDocuments.parse_status,
      last_checked: smaFactSheetDocuments.last_checked,
      created_at: smaFactSheetDocuments.created_at,
      provider_key: smaProviders.provider_key,
      provider_name: smaProviders.provider_name,
      parsed: sql<boolean>`EXISTS (SELECT 1 FROM ${smaParsedDocuments} WHERE ${smaParsedDocuments.document_id} = ${smaFactSheetDocuments.id})`,
    })
    .from(smaFactSheetDocuments)
    .leftJoin(smaProviders, eq(smaFactSheetDocuments.provider_id, smaProviders.id))
    .orderBy(desc(smaFactSheetDocuments.last_checked))
    .limit(100);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">SMA Documents</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Fact sheet documents acquired and tracked
          </p>
        </div>
        <Link
          href="/admin/sma-providers"
          className="rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
        >
          Manage Providers
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-surface p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-text-secondary">Total Documents</p>
          </div>
          <p className="mt-2 text-3xl font-semibold text-text-primary">
            {totalDocs.count.toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-text-muted">Acquired fact sheets</p>
        </div>

        <div className="rounded-xl border border-border bg-surface p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-text-secondary">Parsed</p>
          </div>
          <p className="mt-2 text-3xl font-semibold text-text-primary">
            {totalParsed.count.toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-text-muted">
            {totalDocs.count > 0
              ? `${((totalParsed.count / totalDocs.count) * 100).toFixed(1)}% coverage`
              : '0% coverage'
            }
          </p>
        </div>

        <div className="rounded-xl border border-border bg-surface p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-text-secondary">Pending URLs</p>
          </div>
          <p className="mt-2 text-3xl font-semibold text-text-primary">
            {totalPending.count.toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-text-muted">Awaiting acquisition</p>
        </div>

        <div className="rounded-xl border border-border bg-surface p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-text-secondary">Processing</p>
          </div>
          <p className="mt-2 text-3xl font-semibold text-text-primary">
            {totalProcessing.count.toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-text-muted">Currently processing</p>
        </div>
      </div>

      {/* Documents Table */}
      <div className="rounded-xl border border-border bg-surface">
        <div className="border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold text-text-primary">Recent Documents</h2>
          <p className="mt-1 text-sm text-text-secondary">
            Last 100 acquired fact sheets
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
                  URL
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-secondary">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-secondary">
                  Versions
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-secondary">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-secondary">
                  Last Acquired
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {documents.map((doc) => (
                <tr key={doc.id} className="hover:bg-surface-subtle">
                  <td className="px-6 py-4 text-sm">
                    <div>
                      <p className="font-medium text-text-primary">{doc.provider_name}</p>
                      <p className="text-xs text-text-muted">{doc.provider_key}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <a
                      href={doc.canonical_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="max-w-md truncate text-brand-500 hover:text-brand-600 hover:underline"
                    >
                      {doc.canonical_url}
                    </a>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      doc.document_type === 'pdf'
                        ? 'bg-brand-100 text-brand-700 dark:bg-brand-900 dark:text-brand-300'
                        : 'bg-surface-subtle text-text-secondary'
                    }`}>
                      {doc.document_type?.toUpperCase() || 'UNKNOWN'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-text-primary">
                    {doc.version_count || 0}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        doc.parse_status === 'parsed'
                          ? 'bg-success/10 text-success dark:bg-success/20'
                          : doc.parse_status === 'pending'
                          ? 'bg-warning/10 text-warning dark:bg-warning/20'
                          : 'bg-error/10 text-error dark:bg-error/20'
                      }`}>
                        {doc.parse_status || 'pending'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-text-secondary">
                    {doc.last_checked
                      ? new Date(doc.last_checked).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      : 'Never'
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {documents.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-sm text-text-muted">No documents found</p>
            <p className="mt-1 text-xs text-text-muted">
              Run discovery and acquisition workers to populate this table
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SMADocumentsPage() {
  return (
    <Suspense fallback={
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent"></div>
      </div>
    }>
      <DocumentsContent />
    </Suspense>
  );
}
