/**
 * Financial Modeling Prep API client for market data enrichment.
 * Provides fund info, holdings, sector weights, and batch quotes.
 *
 * @module proposal-engine/data/fmp-client
 */

import { fetchWithTimeout } from '@/lib/fetch-with-timeout';

// =====================================================================
// Types
// =====================================================================

export interface FundInfo {
  symbol: string;
  name: string;
  expenseRatio: number | null;
  aum: number | null;
  beta: number | null;
  description: string | null;
}

export interface ETFHolding {
  symbol: string;
  name: string;
  weight: number;
}

export interface SectorWeight {
  sector: string;
  weight: number;
}

export interface Quote {
  symbol: string;
  price: number | null;
  change: number | null;
  changePercent: number | null;
  volume: number | null;
  marketCap: number | null;
}

// =====================================================================
// Constants
// =====================================================================

const FMP_BASE_URL_V3 = 'https://financialmodelingprep.com/api/v3';
const FMP_BASE_URL_STABLE = 'https://financialmodelingprep.com/stable';
const RATE_LIMIT_DELAY_MS = 300;

let lastRequestTime = 0;

// =====================================================================
// Rate Limiting
// =====================================================================

async function waitForRateLimit(): Promise<void> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  if (timeSinceLastRequest < RATE_LIMIT_DELAY_MS) {
    await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_DELAY_MS - timeSinceLastRequest));
  }
  lastRequestTime = Date.now();
}

// =====================================================================
// API Client Functions
// =====================================================================

/**
 * Get fund information (expense ratio, AUM, beta, description).
 * Uses stable endpoint /stable/funds/info
 */
export async function getFundInfo(ticker: string): Promise<FundInfo | null> {
  const apiKey = process.env.FMP_API_KEY;
  if (!apiKey) {
    console.warn('[fmp-client] FMP_API_KEY not configured');
    return null;
  }

  await waitForRateLimit();

  try {
    const url = `${FMP_BASE_URL_STABLE}/funds/info?symbol=${encodeURIComponent(ticker)}&apikey=${apiKey}`;
    const response = await fetchWithTimeout(url, {}, 10_000);

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      console.warn(`[fmp-client] getFundInfo(${ticker}) failed: ${response.status}`);
      return null;
    }

    const data = await response.json();
    if (!data || typeof data !== 'object') {
      return null;
    }

    return {
      symbol: data.symbol ?? ticker,
      name: data.name ?? '',
      expenseRatio: data.expenseRatio ? parseFloat(data.expenseRatio) : null,
      aum: data.aum ? parseFloat(data.aum) : null,
      beta: data.beta ? parseFloat(data.beta) : null,
      description: data.description ?? null,
    };
  } catch (err) {
    console.error(`[fmp-client] getFundInfo(${ticker}) error:`, err);
    return null;
  }
}

/**
 * Get ETF holdings breakdown.
 * Uses stable endpoint /stable/funds/holdings
 */
export async function getETFHoldings(ticker: string): Promise<ETFHolding[]> {
  const apiKey = process.env.FMP_API_KEY;
  if (!apiKey) {
    console.warn('[fmp-client] FMP_API_KEY not configured');
    return [];
  }

  await waitForRateLimit();

  try {
    const url = `${FMP_BASE_URL_STABLE}/funds/holdings?symbol=${encodeURIComponent(ticker)}&apikey=${apiKey}`;
    const response = await fetchWithTimeout(url, {}, 10_000);

    if (response.status === 404) {
      return [];
    }

    if (!response.ok) {
      console.warn(`[fmp-client] getETFHoldings(${ticker}) failed: ${response.status}`);
      return [];
    }

    const data = await response.json();
    if (!Array.isArray(data)) {
      return [];
    }

    return data
      .filter((h) => h.symbol && h.name && h.weight)
      .map((h) => ({
        symbol: h.symbol,
        name: h.name,
        weight: parseFloat(h.weight),
      }));
  } catch (err) {
    console.error(`[fmp-client] getETFHoldings(${ticker}) error:`, err);
    return [];
  }
}

/**
 * Get sector weight breakdown for a fund.
 * Uses stable endpoint /stable/funds/sector-weight
 */
export async function getSectorWeights(ticker: string): Promise<SectorWeight[]> {
  const apiKey = process.env.FMP_API_KEY;
  if (!apiKey) {
    console.warn('[fmp-client] FMP_API_KEY not configured');
    return [];
  }

  await waitForRateLimit();

  try {
    const url = `${FMP_BASE_URL_STABLE}/funds/sector-weight?symbol=${encodeURIComponent(ticker)}&apikey=${apiKey}`;
    const response = await fetchWithTimeout(url, {}, 10_000);

    if (response.status === 404) {
      return [];
    }

    if (!response.ok) {
      console.warn(`[fmp-client] getSectorWeights(${ticker}) failed: ${response.status}`);
      return [];
    }

    const data = await response.json();
    if (!Array.isArray(data)) {
      return [];
    }

    return data
      .filter((s) => s.sector && s.weight)
      .map((s) => ({
        sector: s.sector,
        weight: parseFloat(s.weight),
      }));
  } catch (err) {
    console.error(`[fmp-client] getSectorWeights(${ticker}) error:`, err);
    return [];
  }
}

/**
 * Get batch quotes for multiple tickers.
 * Uses v3 endpoint /v3/quote/{ticker1,ticker2,...}
 */
export async function getBatchQuotes(tickers: string[]): Promise<Map<string, Quote>> {
  const apiKey = process.env.FMP_API_KEY;
  if (!apiKey) {
    console.warn('[fmp-client] FMP_API_KEY not configured');
    return new Map();
  }

  if (tickers.length === 0) {
    return new Map();
  }

  await waitForRateLimit();

  try {
    const tickerList = tickers.join(',');
    const url = `${FMP_BASE_URL_V3}/quote/${encodeURIComponent(tickerList)}?apikey=${apiKey}`;
    const response = await fetchWithTimeout(url, {}, 10_000);

    if (response.status === 404) {
      return new Map();
    }

    if (!response.ok) {
      console.warn(`[fmp-client] getBatchQuotes failed: ${response.status}`);
      return new Map();
    }

    const data = await response.json();
    if (!Array.isArray(data)) {
      return new Map();
    }

    const quotes = new Map<string, Quote>();
    for (const q of data) {
      if (!q.symbol) continue;
      quotes.set(q.symbol.toUpperCase(), {
        symbol: q.symbol,
        price: q.price ? parseFloat(q.price) : null,
        change: q.change ? parseFloat(q.change) : null,
        changePercent: q.changesPercentage ? parseFloat(q.changesPercentage) : null,
        volume: q.volume ? parseInt(q.volume, 10) : null,
        marketCap: q.marketCap ? parseFloat(q.marketCap) : null,
      });
    }

    return quotes;
  } catch (err) {
    console.error(`[fmp-client] getBatchQuotes error:`, err);
    return new Map();
  }
}
