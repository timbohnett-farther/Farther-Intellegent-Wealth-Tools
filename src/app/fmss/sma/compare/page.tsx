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

  // Helper function to format AUM
  const formatAUM = (amount: number | null) => {
    if (!amount) return 'N/A';
    if (amount >= 1_000_000_000) return `$${(amount / 1_000_000_000).toFixed(2)}B`;
    if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
    return `$${(amount / 1_000).toFixed(0)}K`;
  };

  // Helper function to format return with color
  const formatReturn = (value: number | null) => {
    if (value === null) return { text: 'N/A', color: 'text-text-muted' };
    const formatted = `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
    const color = value >= 0 ? 'text-success' : 'text-error';
    return { text: formatted, color };
  };

  // Find best values for highlighting
  const getBest = (values: (number | null)[]) => {
    const validValues = values.filter((v): v is number => v !== null);
    if (validValues.length === 0) return null;
    return Math.max(...validValues);
  };

  const bestYTD = getBest(strategies.map(s => s.ytd_return));
  const bestOneYear = getBest(strategies.map(s => s.one_year_return));
  const bestThreeYear = getBest(strategies.map(s => s.three_year_return));
  const bestFiveYear = getBest(strategies.map(s => s.five_year_return));
  const bestTenYear = getBest(strategies.map(s => s.ten_year_return));
  const bestInception = getBest(strategies.map(s => s.inception_return));
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
                  {formatAUM(strategy.aum_amount)}
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

            {/* Minimum Investment */}
            <tr className="hover:bg-surface-subtle">
              <td className="px-6 py-4 text-sm font-medium text-text-secondary">Minimum Investment</td>
              {strategies.map((strategy) => (
                <td key={strategy.id} className="px-6 py-4 text-sm text-text-primary">
                  {strategy.minimum_investment
                    ? `$${strategy.minimum_investment.toLocaleString()}`
                    : 'N/A'
                  }
                </td>
              ))}
            </tr>

            {/* Inception Date */}
            <tr className="hover:bg-surface-subtle">
              <td className="px-6 py-4 text-sm font-medium text-text-secondary">Inception Date</td>
              {strategies.map((strategy) => (
                <td key={strategy.id} className="px-6 py-4 text-sm text-text-primary">
                  {strategy.inception_date || 'N/A'}
                </td>
              ))}
            </tr>

            {/* Benchmark */}
            <tr className="hover:bg-surface-subtle">
              <td className="px-6 py-4 text-sm font-medium text-text-secondary">Benchmark</td>
              {strategies.map((strategy) => (
                <td key={strategy.id} className="px-6 py-4 text-sm text-text-primary">
                  {strategy.benchmark || 'N/A'}
                </td>
              ))}
            </tr>

            {/* Performance Section Header */}
            <tr className="bg-surface-subtle">
              <td colSpan={strategies.length + 1} className="px-6 py-3 text-sm font-semibold text-text-primary">
                Performance
              </td>
            </tr>

            {/* YTD Return */}
            <tr className="hover:bg-surface-subtle">
              <td className="px-6 py-4 text-sm font-medium text-text-secondary">YTD Return</td>
              {strategies.map((strategy) => {
                const formatted = formatReturn(strategy.ytd_return);
                const isBest = strategy.ytd_return === bestYTD && bestYTD !== null;
                return (
                  <td
                    key={strategy.id}
                    className={`px-6 py-4 text-sm ${isBest ? 'font-semibold' : ''} ${formatted.color}`}
                  >
                    {formatted.text}
                    {isBest && <span className="ml-2 text-xs">★ Best</span>}
                  </td>
                );
              })}
            </tr>

            {/* 1 Year Return */}
            <tr className="hover:bg-surface-subtle">
              <td className="px-6 py-4 text-sm font-medium text-text-secondary">1 Year Return</td>
              {strategies.map((strategy) => {
                const formatted = formatReturn(strategy.one_year_return);
                const isBest = strategy.one_year_return === bestOneYear && bestOneYear !== null;
                return (
                  <td
                    key={strategy.id}
                    className={`px-6 py-4 text-sm ${isBest ? 'font-semibold' : ''} ${formatted.color}`}
                  >
                    {formatted.text}
                    {isBest && <span className="ml-2 text-xs">★ Best</span>}
                  </td>
                );
              })}
            </tr>

            {/* 3 Year Return */}
            <tr className="hover:bg-surface-subtle">
              <td className="px-6 py-4 text-sm font-medium text-text-secondary">3 Year Return</td>
              {strategies.map((strategy) => {
                const formatted = formatReturn(strategy.three_year_return);
                const isBest = strategy.three_year_return === bestThreeYear && bestThreeYear !== null;
                return (
                  <td
                    key={strategy.id}
                    className={`px-6 py-4 text-sm ${isBest ? 'font-semibold' : ''} ${formatted.color}`}
                  >
                    {formatted.text}
                    {isBest && <span className="ml-2 text-xs">★ Best</span>}
                  </td>
                );
              })}
            </tr>

            {/* 5 Year Return */}
            <tr className="hover:bg-surface-subtle">
              <td className="px-6 py-4 text-sm font-medium text-text-secondary">5 Year Return</td>
              {strategies.map((strategy) => {
                const formatted = formatReturn(strategy.five_year_return);
                const isBest = strategy.five_year_return === bestFiveYear && bestFiveYear !== null;
                return (
                  <td
                    key={strategy.id}
                    className={`px-6 py-4 text-sm ${isBest ? 'font-semibold' : ''} ${formatted.color}`}
                  >
                    {formatted.text}
                    {isBest && <span className="ml-2 text-xs">★ Best</span>}
                  </td>
                );
              })}
            </tr>

            {/* 10 Year Return */}
            <tr className="hover:bg-surface-subtle">
              <td className="px-6 py-4 text-sm font-medium text-text-secondary">10 Year Return</td>
              {strategies.map((strategy) => {
                const formatted = formatReturn(strategy.ten_year_return);
                const isBest = strategy.ten_year_return === bestTenYear && bestTenYear !== null;
                return (
                  <td
                    key={strategy.id}
                    className={`px-6 py-4 text-sm ${isBest ? 'font-semibold' : ''} ${formatted.color}`}
                  >
                    {formatted.text}
                    {isBest && <span className="ml-2 text-xs">★ Best</span>}
                  </td>
                );
              })}
            </tr>

            {/* Since Inception Return */}
            <tr className="hover:bg-surface-subtle">
              <td className="px-6 py-4 text-sm font-medium text-text-secondary">Since Inception</td>
              {strategies.map((strategy) => {
                const formatted = formatReturn(strategy.inception_return);
                const isBest = strategy.inception_return === bestInception && bestInception !== null;
                return (
                  <td
                    key={strategy.id}
                    className={`px-6 py-4 text-sm ${isBest ? 'font-semibold' : ''} ${formatted.color}`}
                  >
                    {formatted.text}
                    {isBest && <span className="ml-2 text-xs">★ Best</span>}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="rounded-xl border border-border bg-surface p-4">
        <h3 className="text-sm font-semibold text-text-primary">Legend</h3>
        <div className="mt-2 flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-success">★ Best</span>
            <span className="text-text-muted">- Highest return in category</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-success">✓ Lowest</span>
            <span className="text-text-muted">- Lowest management fee</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-success">Green</span>
            <span className="text-text-muted">- Positive return</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-error">Red</span>
            <span className="text-text-muted">- Negative return</span>
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
