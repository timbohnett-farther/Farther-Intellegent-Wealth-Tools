/**
 * Finnhub API client for real-time quotes and basic financials.
 * Rate limit: 60 calls/minute (1 per second).
 *
 * @module proposal-engine/data/finnhub-client
 */

import { fetchWithTimeout } from '@/lib/fetch-with-timeout';

// =====================================================================
// Types
// =====================================================================

export interface FinnhubQuote {
  /** Current price. */
  c: number;
  /** Change. */
  d: number;
  /** Percent change. */
  dp: number;
  /** High price of the day. */
  h: number;
  /** Low price of the day. */
  l: number;
  /** Open price of the day. */
  o: number;
  /** Previous close price. */
  pc: number;
  /** Timestamp. */
  t?: number;
}

export interface FinnhubMetrics {
  beta?: number;
  '52WeekHigh'?: number;
  '52WeekLow'?: number;
  dividendYield?: number;
  marketCap?: number;
  peRatio?: number;
  pbRatio?: number;
  [key: string]: number | string | undefined;
}

// =====================================================================
// Constants
// =====================================================================

const FINNHUB_BASE_URL = 'https://finnhub.io/api/v1';
const RATE_LIMIT_DELAY_MS = 1000; // 1 call per second

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
 * Get real-time quote for a ticker.
 * Uses GET /quote?symbol={ticker}
 */
export async function getQuote(ticker: string): Promise<FinnhubQuote | null> {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) {
    console.warn('[finnhub-client] FINNHUB_API_KEY not configured');
    return null;
  }

  await waitForRateLimit();

  try {
    const url = `${FINNHUB_BASE_URL}/quote?symbol=${encodeURIComponent(ticker)}&token=${apiKey}`;
    const response = await fetchWithTimeout(url, {}, 10_000);

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      console.warn(`[finnhub-client] getQuote(${ticker}) failed: ${response.status}`);
      return null;
    }

    const data = await response.json();
    if (!data || typeof data !== 'object' || data.c === undefined) {
      return null;
    }

    return {
      c: data.c ?? 0,
      d: data.d ?? 0,
      dp: data.dp ?? 0,
      h: data.h ?? 0,
      l: data.l ?? 0,
      o: data.o ?? 0,
      pc: data.pc ?? 0,
      t: data.t,
    };
  } catch (err) {
    console.error(`[finnhub-client] getQuote(${ticker}) error:`, err);
    return null;
  }
}

/**
 * Get basic financials and metrics for a ticker.
 * Uses GET /stock/metric?symbol={ticker}&metric=all
 */
export async function getBasicFinancials(ticker: string): Promise<FinnhubMetrics | null> {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) {
    console.warn('[finnhub-client] FINNHUB_API_KEY not configured');
    return null;
  }

  await waitForRateLimit();

  try {
    const url = `${FINNHUB_BASE_URL}/stock/metric?symbol=${encodeURIComponent(ticker)}&metric=all&token=${apiKey}`;
    const response = await fetchWithTimeout(url, {}, 10_000);

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      console.warn(`[finnhub-client] getBasicFinancials(${ticker}) failed: ${response.status}`);
      return null;
    }

    const data = await response.json();
    if (!data || !data.metric || typeof data.metric !== 'object') {
      return null;
    }

    const metric = data.metric;
    return {
      beta: metric.beta,
      '52WeekHigh': metric['52WeekHigh'],
      '52WeekLow': metric['52WeekLow'],
      dividendYield: metric.dividendYieldIndicatedAnnual,
      marketCap: metric.marketCapitalization,
      peRatio: metric.peBasicExclExtraTTM,
      pbRatio: metric.pbQuarterly,
      ...metric,
    };
  } catch (err) {
    console.error(`[finnhub-client] getBasicFinancials(${ticker}) error:`, err);
    return null;
  }
}
