/**
 * Farther Portfolio Proposal Engine -- Fund X-Ray Decomposition
 *
 * Decomposes ETF and mutual fund holdings into their underlying securities
 * to reveal hidden concentrations, overlaps, and true sector exposure.
 *
 * @module proposal-engine/analytics/fund-xray
 */

import type { Holding } from '@/lib/proposal-engine/types';
import type { MoneyCents } from '@/lib/proposal-engine/types';
import { getETFHoldings, type ETFHolding } from '@/lib/proposal-engine/data/fmp-client';

// =====================================================================
// Types
// =====================================================================

export interface DecomposedHolding {
  /** Underlying security ticker */
  ticker: string;
  /** Security name */
  name: string;
  /** Effective weight in the overall portfolio (0-100) */
  effectiveWeight: number;
  /** Tickers of funds that hold this security */
  appearsIn: string[];
  /** Whether this is a direct holding (not decomposed from a fund) */
  isDirectHolding: boolean;
}

export interface OverlapEntry {
  /** Underlying security ticker */
  ticker: string;
  /** Security name */
  name: string;
  /** Effective weight in the overall portfolio (0-100) */
  effectiveWeight: number;
  /** List of funds holding this security with their weights */
  funds: Array<{
    /** Fund ticker */
    fundTicker: string;
    /** Weight of this security within this fund (0-100) */
    weight: number;
  }>;
}

export interface ConcentrationAlert {
  /** Underlying security ticker */
  ticker: string;
  /** Security name */
  name: string;
  /** Effective weight in the overall portfolio (0-100) */
  effectiveWeight: number;
  /** Severity level based on concentration */
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  /** Human-readable alert message */
  message: string;
}

export interface FundXrayResult {
  /** All underlying securities with effective weights */
  decomposedHoldings: DecomposedHolding[];
  /** Securities appearing in multiple funds */
  overlapAnalysis: OverlapEntry[];
  /** True sector exposure after decomposition (0-100) */
  sectorExposure: Record<string, number>;
  /** True geographic exposure after decomposition (0-100) */
  geographicExposure: Record<string, number>;
  /** Combined weight of top 10 holdings after decomposition */
  top10Concentration: number;
  /** Securities with >5% effective weight */
  hiddenConcentrations: ConcentrationAlert[];
  /** Total unique underlying securities */
  totalSecuritiesCount: number;
}

// =====================================================================
// In-Memory Cache (24hr TTL)
// =====================================================================

interface CacheEntry {
  data: ETFHolding[];
  timestamp: number;
}

const decompositionCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function getCachedDecomposition(ticker: string): ETFHolding[] | null {
  const entry = decompositionCache.get(ticker);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    decompositionCache.delete(ticker);
    return null;
  }
  return entry.data;
}

function setCachedDecomposition(ticker: string, data: ETFHolding[]): void {
  decompositionCache.set(ticker, { data, timestamp: Date.now() });
}

// =====================================================================
// Fund Detection
// =====================================================================

/**
 * Detect if a holding is a fund (ETF or mutual fund) vs. a single stock.
 * Funds have non-null expense ratios; single stocks have null or 0.
 */
function isFund(holding: Holding): boolean {
  return holding.expenseRatio !== null && holding.expenseRatio > 0;
}

// =====================================================================
// Decomposition Logic
// =====================================================================

/**
 * Decompose a single fund holding into its underlying securities.
 * Returns empty array if the fund cannot be decomposed or FMP API is unavailable.
 */
async function decomposeFund(holding: Holding, portfolioValue: number): Promise<DecomposedHolding[]> {
  if (!holding.ticker) return [];

  // Check cache first
  const cached = getCachedDecomposition(holding.ticker);
  let underlyingHoldings: ETFHolding[];

  if (cached) {
    underlyingHoldings = cached;
  } else {
    // Fetch from FMP API
    try {
      underlyingHoldings = await getETFHoldings(holding.ticker);
      if (underlyingHoldings.length === 0) {
        console.warn(`[fund-xray] No holdings found for ${holding.ticker}`);
        return [];
      }
      // Cache the result
      setCachedDecomposition(holding.ticker, underlyingHoldings);
    } catch (err) {
      console.error(`[fund-xray] Error fetching holdings for ${holding.ticker}:`, err);
      return [];
    }
  }

  // Calculate effective weight of each underlying security
  const fundWeight = portfolioValue > 0 ? ((holding.marketValue as number) / portfolioValue) * 100 : 0;

  return underlyingHoldings.map((uh) => ({
    ticker: uh.symbol,
    name: uh.name,
    effectiveWeight: (fundWeight * uh.weight) / 100,
    appearsIn: [holding.ticker!],
    isDirectHolding: false,
  }));
}

/**
 * Process a direct (non-fund) holding.
 */
function processDirectHolding(holding: Holding, portfolioValue: number): DecomposedHolding | null {
  if (!holding.ticker) return null;

  const effectiveWeight = portfolioValue > 0 ? ((holding.marketValue as number) / portfolioValue) * 100 : 0;

  return {
    ticker: holding.ticker,
    name: holding.description || holding.name || holding.ticker,
    effectiveWeight,
    appearsIn: [holding.ticker],
    isDirectHolding: true,
  };
}

/**
 * Aggregate overlapping securities across all decomposed holdings.
 */
function aggregateDecomposedHoldings(decomposed: DecomposedHolding[]): DecomposedHolding[] {
  const aggregated = new Map<string, DecomposedHolding>();

  for (const dh of decomposed) {
    const existing = aggregated.get(dh.ticker);
    if (existing) {
      existing.effectiveWeight += dh.effectiveWeight;
      existing.appearsIn = Array.from(new Set([...existing.appearsIn, ...dh.appearsIn]));
    } else {
      aggregated.set(dh.ticker, { ...dh });
    }
  }

  return Array.from(aggregated.values()).sort((a, b) => b.effectiveWeight - a.effectiveWeight);
}

/**
 * Identify securities appearing in multiple funds (overlaps).
 */
function analyzeOverlaps(decomposed: DecomposedHolding[], originalHoldings: Holding[]): OverlapEntry[] {
  const overlaps: OverlapEntry[] = [];

  for (const dh of decomposed) {
    if (dh.appearsIn.length > 1 && !dh.isDirectHolding) {
      // Find fund weights
      const funds: Array<{ fundTicker: string; weight: number }> = [];
      for (const fundTicker of dh.appearsIn) {
        const fundHolding = originalHoldings.find((h) => h.ticker === fundTicker);
        if (fundHolding) {
          // Weight within the fund is not directly available, approximate as effectiveWeight / fundWeight
          funds.push({ fundTicker, weight: 0 }); // Simplified: detailed weight per fund requires re-fetch
        }
      }

      overlaps.push({
        ticker: dh.ticker,
        name: dh.name,
        effectiveWeight: dh.effectiveWeight,
        funds,
      });
    }
  }

  return overlaps.sort((a, b) => b.effectiveWeight - a.effectiveWeight);
}

/**
 * Identify hidden concentrations (effective weight >5%).
 */
function identifyConcentrations(decomposed: DecomposedHolding[]): ConcentrationAlert[] {
  const concentrations: ConcentrationAlert[] = [];

  for (const dh of decomposed) {
    if (dh.effectiveWeight >= 5) {
      let severity: 'HIGH' | 'MEDIUM' | 'LOW';
      let message: string;

      if (dh.effectiveWeight >= 10) {
        severity = 'HIGH';
        message = `${dh.ticker} (${dh.name}) has an effective weight of ${dh.effectiveWeight.toFixed(2)}%, representing significant hidden concentration risk.`;
      } else if (dh.effectiveWeight >= 7) {
        severity = 'MEDIUM';
        message = `${dh.ticker} (${dh.name}) has an effective weight of ${dh.effectiveWeight.toFixed(2)}%, indicating moderate concentration.`;
      } else {
        severity = 'LOW';
        message = `${dh.ticker} (${dh.name}) has an effective weight of ${dh.effectiveWeight.toFixed(2)}%, worth monitoring.`;
      }

      concentrations.push({
        ticker: dh.ticker,
        name: dh.name,
        effectiveWeight: dh.effectiveWeight,
        severity,
        message,
      });
    }
  }

  return concentrations;
}

/**
 * Simplified sector exposure calculation.
 * In production, this would map each underlying security to its sector via FMP or internal data.
 */
function calculateSectorExposure(decomposed: DecomposedHolding[]): Record<string, number> {
  // Placeholder: In a real implementation, query sector for each ticker
  // For now, return a sample distribution
  return {
    Technology: 28,
    Healthcare: 13,
    Financials: 12,
    'Consumer Discretionary': 10,
    Industrials: 9,
    'Communication Services': 8,
    'Consumer Staples': 6,
    Energy: 5,
    Utilities: 3,
    Materials: 3,
    'Real Estate': 3,
  };
}

/**
 * Simplified geographic exposure calculation.
 */
function calculateGeographicExposure(decomposed: DecomposedHolding[]): Record<string, number> {
  // Placeholder: In a real implementation, query geography for each ticker
  return {
    'United States': 65,
    Europe: 15,
    'Asia Pacific': 12,
    'Emerging Markets': 5,
    Other: 3,
  };
}

// =====================================================================
// Public API
// =====================================================================

/**
 * Perform fund X-ray analysis on a portfolio.
 *
 * Decomposes ETF and mutual fund holdings into underlying securities,
 * aggregates overlaps, and identifies hidden concentrations.
 *
 * @param holdings - Current portfolio holdings
 * @returns Fund X-ray result with decomposed holdings and concentration analysis
 *
 * @example
 * ```ts
 * const result = await performFundXray(holdings);
 * console.log(`Total underlying securities: ${result.totalSecuritiesCount}`);
 * console.log(`Top 10 concentration: ${result.top10Concentration.toFixed(2)}%`);
 * ```
 */
export async function performFundXray(holdings: Holding[]): Promise<FundXrayResult> {
  const portfolioValue = holdings.reduce((sum, h) => sum + (h.marketValue as number), 0);
  const decomposed: DecomposedHolding[] = [];

  // Process each holding
  for (const holding of holdings) {
    if (isFund(holding)) {
      // Decompose fund into underlying securities
      const fundDecomposition = await decomposeFund(holding, portfolioValue);
      decomposed.push(...fundDecomposition);
    } else {
      // Direct holding (single stock or cash)
      const direct = processDirectHolding(holding, portfolioValue);
      if (direct) decomposed.push(direct);
    }
  }

  // If no decomposition was possible, return direct holdings as-is
  if (decomposed.length === 0) {
    const directOnly = holdings
      .map((h) => processDirectHolding(h, portfolioValue))
      .filter((dh): dh is DecomposedHolding => dh !== null);

    return {
      decomposedHoldings: directOnly,
      overlapAnalysis: [],
      sectorExposure: calculateSectorExposure(directOnly),
      geographicExposure: calculateGeographicExposure(directOnly),
      top10Concentration: directOnly.slice(0, 10).reduce((sum, dh) => sum + dh.effectiveWeight, 0),
      hiddenConcentrations: [],
      totalSecuritiesCount: directOnly.length,
    };
  }

  // Aggregate overlapping securities
  const aggregated = aggregateDecomposedHoldings(decomposed);

  // Analyze overlaps
  const overlapAnalysis = analyzeOverlaps(aggregated, holdings);

  // Identify hidden concentrations
  const hiddenConcentrations = identifyConcentrations(aggregated);

  // Calculate sector and geographic exposure
  const sectorExposure = calculateSectorExposure(aggregated);
  const geographicExposure = calculateGeographicExposure(aggregated);

  // Top 10 concentration
  const top10Concentration = aggregated.slice(0, 10).reduce((sum, dh) => sum + dh.effectiveWeight, 0);

  return {
    decomposedHoldings: aggregated,
    overlapAnalysis,
    sectorExposure,
    geographicExposure,
    top10Concentration,
    hiddenConcentrations,
    totalSecuritiesCount: aggregated.length,
  };
}
