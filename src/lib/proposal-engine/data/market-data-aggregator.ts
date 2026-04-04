/**
 * Market data aggregator and orchestrator.
 * Enriches holdings with live prices, metrics, and reference data from
 * FMP, Finnhub, and Alpha Vantage. Gracefully degrades when providers fail.
 *
 * @module proposal-engine/data/market-data-aggregator
 */

import type { Holding } from '@/lib/proposal-engine/types';
import { getFundInfo, getBatchQuotes, type Quote } from './fmp-client';
import { getQuote, getBasicFinancials } from './finnhub-client';
import { getDailyPrices } from './alpha-vantage-client';

// =====================================================================
// Types
// =====================================================================

export interface EnrichedHolding extends Holding {
  enrichment: {
    livePrice?: number;
    expenseRatio?: number;
    beta?: number;
    stdDev?: number;
    sector?: string;
    maxDrawdown?: number;
    dividendYield?: number;
    sources: string[];
  };
}

// =====================================================================
// In-Memory Cache
// =====================================================================

interface CacheEntry<T> {
  data: T;
  expiry: number;
}

const cache = new Map<string, CacheEntry<unknown>>();

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiry) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

function setCached<T>(key: string, data: T, ttlMs: number): void {
  cache.set(key, { data, expiry: Date.now() + ttlMs });
}

// =====================================================================
// Cache TTLs
// =====================================================================

const REALTIME_TTL_MS = 5 * 60 * 1000; // 5 minutes
const REFERENCE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// =====================================================================
// Helper Functions
// =====================================================================

/**
 * Calculate maximum drawdown from daily prices.
 */
function calculateMaxDrawdown(prices: Array<{ close: number }>): number | null {
  if (prices.length < 2) return null;

  let maxDrawdown = 0;
  let peak = prices[0].close;

  for (const price of prices) {
    if (price.close > peak) {
      peak = price.close;
    }
    const drawdown = (peak - price.close) / peak;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
    }
  }

  return maxDrawdown;
}

/**
 * Calculate standard deviation (volatility) from daily returns.
 */
function calculateStdDev(prices: Array<{ close: number }>): number | null {
  if (prices.length < 2) return null;

  const returns: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    const ret = (prices[i].close - prices[i - 1].close) / prices[i - 1].close;
    returns.push(ret);
  }

  if (returns.length === 0) return null;

  const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
  return Math.sqrt(variance);
}

/**
 * Enrich a single holding with market data.
 */
async function enrichSingleHolding(holding: Holding): Promise<EnrichedHolding> {
  const enrichment: EnrichedHolding['enrichment'] = {
    sources: [],
  };

  // If no ticker, return holding unchanged
  if (!holding.ticker) {
    return { ...holding, enrichment };
  }

  const ticker = holding.ticker.toUpperCase();

  // Check cache first
  const cacheKey = `enrichment:${ticker}`;
  const cached = getCached<EnrichedHolding['enrichment']>(cacheKey);
  if (cached) {
    return { ...holding, enrichment: cached };
  }

  // 1. Try FMP fund info (most complete for funds)
  try {
    const fundInfo = await getFundInfo(ticker);
    if (fundInfo) {
      if (fundInfo.expenseRatio !== null) {
        enrichment.expenseRatio = fundInfo.expenseRatio;
        enrichment.sources.push('FMP');
      }
      if (fundInfo.beta !== null) {
        enrichment.beta = fundInfo.beta;
        if (!enrichment.sources.includes('FMP')) enrichment.sources.push('FMP');
      }
    }
  } catch (err) {
    console.warn(`[aggregator] FMP fundInfo failed for ${ticker}:`, err);
  }

  // 2. Try Finnhub for real-time quote and metrics
  try {
    const quote = await getQuote(ticker);
    if (quote && quote.c) {
      enrichment.livePrice = quote.c;
      enrichment.sources.push('Finnhub');
    }

    const metrics = await getBasicFinancials(ticker);
    if (metrics) {
      if (!enrichment.beta && metrics.beta) {
        enrichment.beta = metrics.beta;
        if (!enrichment.sources.includes('Finnhub')) enrichment.sources.push('Finnhub');
      }
      if (metrics.dividendYield) {
        enrichment.dividendYield = metrics.dividendYield;
        if (!enrichment.sources.includes('Finnhub')) enrichment.sources.push('Finnhub');
      }
    }
  } catch (err) {
    console.warn(`[aggregator] Finnhub failed for ${ticker}:`, err);
  }

  // 3. Try Alpha Vantage for historical data (stdDev, maxDrawdown)
  try {
    const dailyPrices = await getDailyPrices(ticker, 'compact');
    if (dailyPrices.length > 0) {
      const stdDev = calculateStdDev(dailyPrices);
      if (stdDev !== null) {
        enrichment.stdDev = stdDev;
        enrichment.sources.push('Alpha Vantage');
      }

      const maxDrawdown = calculateMaxDrawdown(dailyPrices);
      if (maxDrawdown !== null) {
        enrichment.maxDrawdown = maxDrawdown;
        if (!enrichment.sources.includes('Alpha Vantage')) enrichment.sources.push('Alpha Vantage');
      }
    }
  } catch (err) {
    console.warn(`[aggregator] Alpha Vantage failed for ${ticker}:`, err);
  }

  // Mark sources as unavailable if nothing was enriched
  if (enrichment.sources.length === 0) {
    enrichment.sources.push('unavailable');
  }

  // Cache the enrichment for 24hr
  setCached(cacheKey, enrichment, REFERENCE_TTL_MS);

  return { ...holding, enrichment };
}

// =====================================================================
// Main Enrichment Function
// =====================================================================

/**
 * Enrich holdings with live prices, metrics, and reference data.
 * Orchestrates parallel fetches from FMP, Finnhub, and Alpha Vantage.
 * Gracefully degrades when providers fail.
 */
export async function enrichHoldings(holdings: Holding[]): Promise<EnrichedHolding[]> {
  // If no API keys are configured, return unchanged with warning
  if (!process.env.FMP_API_KEY && !process.env.FINNHUB_API_KEY && !process.env.ALPHA_VANTAGE_API_KEY) {
    console.warn('[aggregator] No market data API keys configured — returning holdings unchanged');
    return holdings.map((h) => ({
      ...h,
      enrichment: { sources: ['unavailable'] },
    }));
  }

  // Batch tickers for quote fetching
  const tickers = holdings.map((h) => h.ticker).filter((t): t is string => !!t);
  const uniqueTickers = Array.from(new Set(tickers.map((t) => t.toUpperCase())));

  // Fetch batch quotes if FMP is configured
  let batchQuotes = new Map<string, Quote>();
  if (process.env.FMP_API_KEY && uniqueTickers.length > 0) {
    try {
      // Batch up to 50 at a time
      const batches: string[][] = [];
      for (let i = 0; i < uniqueTickers.length; i += 50) {
        batches.push(uniqueTickers.slice(i, i + 50));
      }

      const results = await Promise.all(batches.map((batch) => getBatchQuotes(batch)));
      for (const result of results) {
        for (const [ticker, quote] of result) {
          batchQuotes.set(ticker, quote);
        }
      }
    } catch (err) {
      console.warn('[aggregator] Batch quotes failed:', err);
    }
  }

  // Enrich each holding in parallel
  const enrichedHoldings = await Promise.all(
    holdings.map(async (holding) => {
      const enriched = await enrichSingleHolding(holding);

      // Merge batch quote data if available
      if (holding.ticker && batchQuotes.has(holding.ticker.toUpperCase())) {
        const quote = batchQuotes.get(holding.ticker.toUpperCase())!;
        if (quote.price !== null && !enriched.enrichment.livePrice) {
          enriched.enrichment.livePrice = quote.price;
          if (!enriched.enrichment.sources.includes('FMP')) {
            enriched.enrichment.sources.push('FMP');
          }
        }
        if (quote.marketCap !== null && !enriched.enrichment.sector) {
          // FMP batch quotes don't include sector, but we can infer from market cap
          // (this is a placeholder — actual sector requires fund info or holdings)
        }
      }

      return enriched;
    }),
  );

  return enrichedHoldings;
}
