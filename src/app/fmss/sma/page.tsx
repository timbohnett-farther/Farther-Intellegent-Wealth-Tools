import { Suspense } from "react";
import { db } from "@/lib/db";
import {
  smaParsedDocuments,
  smaFactSheetDocuments,
  smaProviders,
  smaChangeEvents
} from "@/lib/db/schema";
import { desc, asc, count, eq, sql, and, isNotNull } from "drizzle-orm";
import Link from "next/link";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "SMA Strategies - FMSS",
  description: "Separately Managed Account strategies with AI-powered monitoring",
};

async function SMAStrategiesContent() {
  // Get stats
  const [totalStrategies] = await db
    .select({ count: count() })
    .from(smaParsedDocuments)
    .where(isNotNull(smaParsedDocuments.strategy_name));

  const [recentChanges] = await db
    .select({ count: count() })
    .from(smaChangeEvents)
    .where(sql`detected_at > NOW() - INTERVAL '7 days'`);

  const [highSeverityChanges] = await db
    .select({ count: count() })
    .from(smaChangeEvents)
    .where(and(
      eq(smaChangeEvents.change_severity, 'high'),
      sql`detected_at > NOW() - INTERVAL '7 days'`
    ));

  // Get parsed strategies with provider and change info
  const strategies = await db
    .select({
      id: smaParsedDocuments.id,
      document_id: smaParsedDocuments.document_id,
      strategy_name: smaParsedDocuments.strategy_name,
      manager_name: smaParsedDocuments.manager_name,
      inception_date: smaParsedDocuments.inception_date,
      aum_mm: smaParsedDocuments.aum_mm,
      management_fee_bps: smaParsedDocuments.management_fee_bps,
      extraction_confidence: smaParsedDocuments.extraction_confidence,
      parsed_at: smaParsedDocuments.parsed_at,
      provider_key: smaProviders.provider_key,
      provider_name: smaProviders.provider_name,
      document_url: smaFactSheetDocuments.canonical_url,
      recent_change: sql<boolean>`EXISTS (
        SELECT 1 FROM ${smaChangeEvents}
        WHERE ${smaChangeEvents.document_id} = ${smaParsedDocuments.document_id}
          AND ${smaChangeEvents.detected_at} > NOW() - INTERVAL '7 days'
      )`,
      high_severity_change: sql<boolean>`EXISTS (
        SELECT 1 FROM ${smaChangeEvents}
        WHERE ${smaChangeEvents.document_id} = ${smaParsedDocuments.document_id}
          AND ${smaChangeEvents.change_severity} = 'high'
          AND ${smaChangeEvents.detected_at} > NOW() - INTERVAL '7 days'
      )`,
    })
    .from(smaParsedDocuments)
    .leftJoin(smaFactSheetDocuments, eq(smaParsedDocuments.document_id, smaFactSheetDocuments.id))
    .leftJoin(smaProviders, eq(smaFactSheetDocuments.provider_id, smaProviders.id))
    .where(isNotNull(smaParsedDocuments.strategy_name))
    .orderBy(desc(smaParsedDocuments.parsed_at))
    .limit(100);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">SMA Strategies</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Separately Managed Accounts with AI-powered fact sheet monitoring
          </p>
        </div>
        <Link
          href="/fmss"
          className="rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
        >
          Back to FMSS
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-surface p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-text-secondary">Total Strategies</p>
          </div>
          <p className="mt-2 text-3xl font-semibold text-text-primary">
            {totalStrategies.count.toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-text-muted">Monitored fact sheets</p>
        </div>

        <div className="rounded-xl border border-border bg-surface p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-text-secondary">Changes (7 days)</p>
          </div>
          <p className="mt-2 text-3xl font-semibold text-brand-500">
            {recentChanges.count.toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-text-muted">Material changes detected</p>
        </div>

        <div className="rounded-xl border border-border bg-surface p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-text-secondary">High Priority</p>
          </div>
          <p className="mt-2 text-3xl font-semibold text-error">
            {highSeverityChanges.count.toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-text-muted">High severity changes</p>
        </div>
      </div>

      {/* Strategies Table */}
      <div className="rounded-xl border border-border bg-surface">
        <div className="border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold text-text-primary">Strategy List</h2>
          <p className="mt-1 text-sm text-text-secondary">
            Recent SMA strategies with performance and change tracking
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-border bg-surface-subtle">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-secondary">
                  Strategy
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-secondary">
                  Provider
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-secondary">
                  AUM
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-secondary">
                  Fee
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-secondary">
                  Confidence
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-secondary">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-secondary">
                  Last Updated
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {strategies.map((strategy) => (
                <tr key={strategy.id} className="hover:bg-surface-subtle">
                  <td className="px-6 py-4">
                    <Link
                      href={`/fmss/sma/${strategy.document_id}`}
                      className="block"
                    >
                      <div>
                        <p className="font-medium text-brand-500 hover:text-brand-600 hover:underline">
                          {strategy.strategy_name}
                        </p>
                        {strategy.manager_name && (
                          <p className="mt-1 text-xs text-text-muted">
                            {strategy.manager_name}
                          </p>
                        )}
                      </div>
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <div>
                      <p className="text-text-primary">{strategy.provider_name}</p>
                      <p className="text-xs text-text-muted">{strategy.provider_key}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-text-primary">
                    {strategy.aum_mm
                      ? `$${parseFloat(strategy.aum_mm).toFixed(1)}M`
                      : '-'
                    }
                  </td>
                  <td className="px-6 py-4 text-sm text-text-primary">
                    {strategy.management_fee_bps
                      ? `${strategy.management_fee_bps} bps`
                      : '-'
                    }
                  </td>
                  <td className="px-6 py-4 text-sm text-text-primary">
                    {strategy.extraction_confidence
                      ? `${(parseFloat(strategy.extraction_confidence) * 100).toFixed(0)}%`
                      : '-'
                    }
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-2">
                      {strategy.high_severity_change && (
                        <span className="inline-flex items-center rounded-full bg-error/10 px-2.5 py-0.5 text-xs font-medium text-error dark:bg-error/20">
                          High Priority Change
                        </span>
                      )}
                      {strategy.recent_change && !strategy.high_severity_change && (
                        <span className="inline-flex items-center rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-medium text-brand-700 dark:bg-brand-900 dark:text-brand-300">
                          Recent Update
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-text-secondary">
                    {new Date(strategy.parsed_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {strategies.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-sm text-text-muted">No strategies found</p>
            <p className="mt-1 text-xs text-text-muted">
              Run discovery, acquisition, and parsing workers to populate this list
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SMAStrategiesPage() {
  return (
    <Suspense fallback={
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent"></div>
      </div>
    }>
      <SMAStrategiesContent />
    </Suspense>
  );
}
