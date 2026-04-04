import { Suspense } from "react";
import { db } from "@/lib/db";
import {
  smaParsedDocuments,
  smaFactSheetDocuments,
  smaProviders,
} from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

interface ComparePageProps {
  searchParams: { ids?: string };
}

async function ComparisonContent({ documentIds }: { documentIds: string[] }) {
  if (documentIds.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-sm text-text-muted">No strategies selected for comparison</p>
        <p className="mt-1 text-xs text-text-muted">
          Select 2-4 strategies from the strategy list to compare
        </p>
        <Link
          href="/fmss/sma"
          className="mt-4 rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
        >
          Back to Strategy List
        </Link>
      </div>
    );
  }

  if (documentIds.length > 4) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-sm text-error">Maximum 4 strategies can be compared at once</p>
        <Link
          href="/fmss/sma"
          className="mt-4 rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
        >
          Back to Strategy List
        </Link>
      </div>
    );
  }

  // Get strategies for comparison
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
    })
    .from(smaParsedDocuments)
    .leftJoin(smaFactSheetDocuments, eq(smaParsedDocuments.document_id, smaFactSheetDocuments.id))
    .leftJoin(smaProviders, eq(smaFactSheetDocuments.provider_id, smaProviders.id))
    .where(inArray(smaParsedDocuments.document_id, documentIds));

  if (strategies.length === 0) {
    notFound();
  }

  // Helper function to format AUM (now in millions)
  const formatAUM = (amount: string | null) => {
    if (!amount) return 'N/A';
    const num = parseFloat(amount);
    return `$${num.toFixed(1)}M`;
  };

  const lowestFee = strategies
    .map(s => s.management_fee_bps)
    .filter((v): v is number => v !== null)
    .sort((a, b) => a - b)[0] || null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/fmss/sma"
            className="text-sm text-brand-500 hover:text-brand-600 hover:underline"
          >
            ← Back to Strategy List
          </Link>
          <h1 className="mt-2 text-2xl font-semibold text-text-primary">
            Strategy Comparison
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Comparing {strategies.length} SMA strategies side-by-side
          </p>
        </div>
      </div>

      {/* Comparison Table */}
      <div className="overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full">
          <thead className="border-b border-border bg-surface-subtle">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-secondary">
                Field
              </th>
              {strategies.map((strategy) => (
                <th key={strategy.id} className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-secondary">
                  <Link
                    href={`/fmss/sma/${strategy.document_id}`}
                    className="text-brand-500 hover:text-brand-600 hover:underline"
                  >
                    Strategy {strategies.indexOf(strategy) + 1}
                  </Link>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {/* Strategy Name */}
            <tr className="hover:bg-surface-subtle">
              <td className="px-6 py-4 text-sm font-medium text-text-secondary">Strategy Name</td>
              {strategies.map((strategy) => (
                <td key={strategy.id} className="px-6 py-4 text-sm font-medium text-text-primary">
                  {strategy.strategy_name}
                </td>
              ))}
            </tr>

            {/* Manager */}
            <tr className="hover:bg-surface-subtle">
              <td className="px-6 py-4 text-sm font-medium text-text-secondary">Manager</td>
              {strategies.map((strategy) => (
                <td key={strategy.id} className="px-6 py-4 text-sm text-text-primary">
                  {strategy.manager_name || '-'}
                </td>
              ))}
            </tr>

            {/* Provider */}
            <tr className="hover:bg-surface-subtle">
              <td className="px-6 py-4 text-sm font-medium text-text-secondary">Provider</td>
              {strategies.map((strategy) => (
                <td key={strategy.id} className="px-6 py-4 text-sm text-text-primary">
                  {strategy.provider_name}
                </td>
              ))}
            </tr>

            {/* AUM */}
            <tr className="hover:bg-surface-subtle">
              <td className="px-6 py-4 text-sm font-medium text-text-secondary">AUM</td>
              {strategies.map((strategy) => (
                <td key={strategy.id} className="px-6 py-4 text-sm text-text-primary">
                  {formatAUM(strategy.aum_mm)}
                </td>
              ))}
            </tr>

            {/* Management Fee */}
            <tr className="hover:bg-surface-subtle">
              <td className="px-6 py-4 text-sm font-medium text-text-secondary">Management Fee</td>
              {strategies.map((strategy) => (
                <td
                  key={strategy.id}
                  className={`px-6 py-4 text-sm ${
                    strategy.management_fee_bps === lowestFee && lowestFee !== null
                      ? 'font-semibold text-success'
                      : 'text-text-primary'
                  }`}
                >
                  {strategy.management_fee_bps ? `${strategy.management_fee_bps} bps` : 'N/A'}
                  {strategy.management_fee_bps === lowestFee && lowestFee !== null && (
                    <span className="ml-2 text-xs">✓ Lowest</span>
                  )}
                </td>
              ))}
            </tr>

            {/* Inception Date */}
            <tr className="hover:bg-surface-subtle">
              <td className="px-6 py-4 text-sm font-medium text-text-secondary">Inception Date</td>
              {strategies.map((strategy) => (
                <td key={strategy.id} className="px-6 py-4 text-sm text-text-primary">
                  {strategy.inception_date
                    ? new Date(strategy.inception_date).toLocaleDateString()
                    : 'N/A'
                  }
                </td>
              ))}
            </tr>

            {/* Extraction Confidence */}
            <tr className="hover:bg-surface-subtle">
              <td className="px-6 py-4 text-sm font-medium text-text-secondary">Extraction Confidence</td>
              {strategies.map((strategy) => (
                <td key={strategy.id} className="px-6 py-4 text-sm text-text-primary">
                  {strategy.extraction_confidence
                    ? `${(parseFloat(strategy.extraction_confidence) * 100).toFixed(0)}%`
                    : 'N/A'
                  }
                </td>
              ))}
            </tr>

            {/* Parsed At */}
            <tr className="hover:bg-surface-subtle">
              <td className="px-6 py-4 text-sm font-medium text-text-secondary">Parsed At</td>
              {strategies.map((strategy) => (
                <td key={strategy.id} className="px-6 py-4 text-sm text-text-primary">
                  {strategy.parsed_at
                    ? new Date(strategy.parsed_at).toLocaleDateString()
                    : 'N/A'
                  }
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="rounded-xl border border-border bg-surface p-4">
        <h3 className="text-sm font-semibold text-text-primary">Legend</h3>
        <div className="mt-2 flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-success">✓ Lowest</span>
            <span className="text-text-muted">- Lowest management fee highlighted in green</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ComparePage({ searchParams }: ComparePageProps) {
  const documentIds = searchParams.ids ? searchParams.ids.split(',') : [];

  return (
    <Suspense fallback={
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent"></div>
      </div>
    }>
      <ComparisonContent documentIds={documentIds} />
    </Suspense>
  );
}
