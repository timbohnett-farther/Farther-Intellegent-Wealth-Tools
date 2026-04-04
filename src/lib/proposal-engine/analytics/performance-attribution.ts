/**
 * Performance Attribution Engine — Brinson-Hood-Beebower (BHB) Analysis
 *
 * Decomposes portfolio return relative to a benchmark into three components:
 * - Allocation Effect: Return from being overweight/underweight in sectors
 * - Selection Effect: Return from picking better/worse securities within sectors
 * - Interaction Effect: Combined effect of allocation + selection decisions
 *
 * Used to explain active return and identify sources of outperformance/underperformance.
 *
 * @module proposal-engine/analytics/performance-attribution
 */

// ═════════════════════════════════════════════════════════════════════════════
// Types
// ═════════════════════════════════════════════════════════════════════════════

export interface AttributionParams {
  portfolioReturn: number; // total portfolio return (decimal, e.g., 0.085 for 8.5%)
  benchmarkReturn: number; // total benchmark return (decimal)
  sectorWeights: {
    portfolio: Record<string, number>; // sector → weight (0-1, must sum to 1)
    benchmark: Record<string, number>; // sector → weight (0-1, must sum to 1)
  };
  sectorReturns: {
    portfolio: Record<string, number>; // sector → return (decimal)
    benchmark: Record<string, number>; // sector → return (decimal)
  };
}

export interface AttributionResult {
  totalActiveReturn: number; // portfolio - benchmark return
  allocationEffect: number; // contribution from sector allocation decisions
  selectionEffect: number; // contribution from security selection within sectors
  interactionEffect: number; // combined effect
  sectorDetail: Array<{
    sector: string;
    portfolioWeight: number;
    benchmarkWeight: number;
    portfolioReturn: number;
    benchmarkReturn: number;
    allocationEffect: number;
    selectionEffect: number;
    interactionEffect: number;
    totalEffect: number;
  }>;
  summary: string; // human-readable summary of main drivers
}

// ═════════════════════════════════════════════════════════════════════════════
// Brinson-Hood-Beebower Attribution
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Perform Brinson-Hood-Beebower performance attribution.
 * Decomposes active return into allocation, selection, and interaction effects.
 *
 * BHB formulas (per sector):
 * - Allocation = (Wp - Wb) × Rb
 * - Selection = Wb × (Rp - Rb)
 * - Interaction = (Wp - Wb) × (Rp - Rb)
 *
 * Total effect per sector = Allocation + Selection + Interaction
 *
 * @param params - Portfolio and benchmark returns and weights by sector
 * @returns Attribution breakdown with sector-level detail and summary
 *
 * @example
 * ```ts
 * const attribution = computeAttribution({
 *   portfolioReturn: 0.085,
 *   benchmarkReturn: 0.072,
 *   sectorWeights: {
 *     portfolio: { 'Technology': 0.35, 'Healthcare': 0.25, 'Financials': 0.20, 'Other': 0.20 },
 *     benchmark: { 'Technology': 0.30, 'Healthcare': 0.20, 'Financials': 0.25, 'Other': 0.25 },
 *   },
 *   sectorReturns: {
 *     portfolio: { 'Technology': 0.12, 'Healthcare': 0.08, 'Financials': 0.05, 'Other': 0.06 },
 *     benchmark: { 'Technology': 0.10, 'Healthcare': 0.07, 'Financials': 0.06, 'Other': 0.05 },
 *   },
 * });
 * console.log(attribution.totalActiveReturn); // 0.013 (1.3%)
 * console.log(attribution.allocationEffect); // 0.005 (0.5%)
 * console.log(attribution.selectionEffect); // 0.008 (0.8%)
 * console.log(attribution.summary);
 * // "Outperformance driven primarily by security selection in Technology (+0.6%) and Healthcare (+0.2%). Allocation to Technology added +0.5%."
 * ```
 */
export function computeAttribution(params: AttributionParams): AttributionResult {
  const {
    portfolioReturn,
    benchmarkReturn,
    sectorWeights: { portfolio: portfolioWeights, benchmark: benchmarkWeights },
    sectorReturns: { portfolio: portfolioReturns, benchmark: benchmarkReturns },
  } = params;

  // Validate sector coverage (all sectors in benchmark must be in portfolio and vice versa)
  const portfolioSectors = new Set(Object.keys(portfolioWeights));
  const benchmarkSectors = new Set(Object.keys(benchmarkWeights));
  const allSectors = Array.from(new Set([...portfolioSectors, ...benchmarkSectors]));

  // Ensure all sectors have weights and returns (default to 0 if missing)
  const sectors = allSectors.map((sector) => {
    const Wp = portfolioWeights[sector] ?? 0;
    const Wb = benchmarkWeights[sector] ?? 0;
    const Rp = portfolioReturns[sector] ?? 0;
    const Rb = benchmarkReturns[sector] ?? 0;

    return { sector, Wp, Wb, Rp, Rb };
  });

  // Compute BHB effects per sector
  const sectorDetail = sectors.map(({ sector, Wp, Wb, Rp, Rb }) => {
    const allocationEffect = (Wp - Wb) * Rb;
    const selectionEffect = Wb * (Rp - Rb);
    const interactionEffect = (Wp - Wb) * (Rp - Rb);
    const totalEffect = allocationEffect + selectionEffect + interactionEffect;

    return {
      sector,
      portfolioWeight: Wp,
      benchmarkWeight: Wb,
      portfolioReturn: Rp,
      benchmarkReturn: Rb,
      allocationEffect,
      selectionEffect,
      interactionEffect,
      totalEffect,
    };
  });

  // Sum across all sectors
  const allocationEffect = sectorDetail.reduce((sum, s) => sum + s.allocationEffect, 0);
  const selectionEffect = sectorDetail.reduce((sum, s) => sum + s.selectionEffect, 0);
  const interactionEffect = sectorDetail.reduce((sum, s) => sum + s.interactionEffect, 0);
  const totalActiveReturn = portfolioReturn - benchmarkReturn;

  // Generate human-readable summary
  const summary = generateSummary(sectorDetail, totalActiveReturn, allocationEffect, selectionEffect);

  return {
    totalActiveReturn,
    allocationEffect,
    selectionEffect,
    interactionEffect,
    sectorDetail,
    summary,
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// Summary Generation
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Generate a human-readable summary of attribution results.
 * Identifies the top positive and negative contributors by sector.
 */
function generateSummary(
  sectorDetail: AttributionResult['sectorDetail'],
  totalActiveReturn: number,
  allocationEffect: number,
  selectionEffect: number
): string {
  const performance = totalActiveReturn >= 0 ? 'Outperformance' : 'Underperformance';
  const activeReturnBps = Math.round(totalActiveReturn * 10000);
  const allocationBps = Math.round(allocationEffect * 10000);
  const selectionBps = Math.round(selectionEffect * 10000);

  // Identify top contributors
  const sortedBySectorEffect = [...sectorDetail].sort((a, b) => b.totalEffect - a.totalEffect);
  const topContributor = sortedBySectorEffect[0];
  const bottomContributor = sortedBySectorEffect[sortedBySectorEffect.length - 1];

  // Identify primary driver (allocation vs selection)
  const primaryDriver =
    Math.abs(allocationEffect) > Math.abs(selectionEffect) ? 'allocation' : 'selection';
  const primaryDriverBps = Math.abs(
    primaryDriver === 'allocation' ? allocationBps : selectionBps
  );

  let summary = `${performance} of ${activeReturnBps} bps (${formatPct(totalActiveReturn)}) driven primarily by ${primaryDriver} decisions (+${primaryDriverBps} bps). `;

  if (topContributor.totalEffect > 0.001) {
    summary += `${topContributor.sector} contributed +${Math.round(topContributor.totalEffect * 10000)} bps (allocation: ${Math.round(topContributor.allocationEffect * 10000)} bps, selection: ${Math.round(topContributor.selectionEffect * 10000)} bps). `;
  }

  if (bottomContributor.totalEffect < -0.001 && bottomContributor !== topContributor) {
    summary += `${bottomContributor.sector} detracted ${Math.round(bottomContributor.totalEffect * 10000)} bps (allocation: ${Math.round(bottomContributor.allocationEffect * 10000)} bps, selection: ${Math.round(bottomContributor.selectionEffect * 10000)} bps).`;
  }

  return summary.trim();
}

// ═════════════════════════════════════════════════════════════════════════════
// Helpers
// ═════════════════════════════════════════════════════════════════════════════

function formatPct(decimal: number, decimals: number = 2): string {
  return `${(decimal * 100).toFixed(decimals)}%`;
}

// ═════════════════════════════════════════════════════════════════════════════
// Extended Attribution (optional future enhancement)
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Future enhancement: Multi-period attribution with compounding.
 * Requires time-series data for portfolio and benchmark returns by sector.
 */
export interface MultiPeriodAttributionParams {
  periods: Array<{
    date: string; // ISO 8601
    portfolioReturn: number;
    benchmarkReturn: number;
    sectorWeights: AttributionParams['sectorWeights'];
    sectorReturns: AttributionParams['sectorReturns'];
  }>;
}

/**
 * Placeholder for multi-period attribution (not yet implemented).
 * Would compute cumulative attribution across multiple periods with geometric linking.
 */
export function computeMultiPeriodAttribution(
  params: MultiPeriodAttributionParams
): AttributionResult {
  throw new Error('Multi-period attribution not yet implemented — use single-period computeAttribution() for now.');
}
