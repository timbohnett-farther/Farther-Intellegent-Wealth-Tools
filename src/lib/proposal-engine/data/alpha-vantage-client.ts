/**
 * Alpha Vantage API client for historical prices and volatility metrics.
 * Rate limit: 75 calls/day — cache aggressively with 24hr TTL.
 *
 * @module proposal-engine/data/alpha-vantage-client
 */

import { fetchWithTimeout } from '@/lib/fetch-with-timeout';

// =====================================================================
// Types
// =====================================================================

export interface DailyPrice {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  adjustedClose: number;
  volume: number;
}

// =====================================================================
// Constants
// =====================================================================

const ALPHA_VANTAGE_BASE_URL = 'https://www.alphavantage.co/query';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// In-memory cache with TTL
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

function setCached<T>(key: string, data: T, ttlMs = CACHE_TTL_MS): void {
  cache.set(key, { data, expiry: Date.now() + ttlMs });
}

// =====================================================================
// API Client Functions
// =====================================================================

/**
 * Get daily adjusted price history for a ticker.
 * Uses function=TIME_SERIES_DAILY_ADJUSTED
 * Cached for 24hr to conserve rate limit.
 */
export async function getDailyPrices(
  ticker: string,
  outputsize: 'compact' | 'full' = 'compact',
): Promise<DailyPrice[]> {
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  if (!apiKey) {
    console.warn('[alpha-vantage-client] ALPHA_VANTAGE_API_KEY not configured');
    return [];
  }

  const cacheKey = `daily_prices:${ticker}:${outputsize}`;
  const cached = getCached<DailyPrice[]>(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const url = `${ALPHA_VANTAGE_BASE_URL}?function=TIME_SERIES_DAILY_ADJUSTED&symbol=${encodeURIComponent(ticker)}&outputsize=${outputsize}&apikey=${apiKey}`;
    const response = await fetchWithTimeout(url, {}, 15_000);

    if (!response.ok) {
      console.warn(`[alpha-vantage-client] getDailyPrices(${ticker}) failed: ${response.status}`);
      return [];
    }

    const data = await response.json();

    // Check for API error messages
    if (data['Error Message'] || data['Note']) {
      console.warn(`[alpha-vantage-client] API message for ${ticker}:`, data['Error Message'] || data['Note']);
      return [];
    }

    const timeSeries = data['Time Series (Daily)'];
    if (!timeSeries || typeof timeSeries !== 'object') {
      return [];
    }

    const prices: DailyPrice[] = [];
    for (const [date, values] of Object.entries(timeSeries)) {
      if (typeof values !== 'object' || values === null) continue;
      const v = values as Record<string, string>;
      prices.push({
        date,
        open: parseFloat(v['1. open']),
        high: parseFloat(v['2. high']),
        low: parseFloat(v['3. low']),
        close: parseFloat(v['4. close']),
        adjustedClose: parseFloat(v['5. adjusted close']),
        volume: parseFloat(v['6. volume']),
      });
    }

    // Sort newest first
    prices.sort((a, b) => b.date.localeCompare(a.date));

    setCached(cacheKey, prices);
    return prices;
  } catch (err) {
    console.error(`[alpha-vantage-client] getDailyPrices(${ticker}) error:`, err);
    return [];
  }
}

/**
 * Get standard deviation (volatility) for a ticker.
 * Uses function=STDDEV, time_period={period}
 * Cached for 24hr to conserve rate limit.
 */
export async function getStdDev(ticker: string, period = 252): Promise<number | null> {
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  if (!apiKey) {
    console.warn('[alpha-vantage-client] ALPHA_VANTAGE_API_KEY not configured');
    return null;
  }

  const cacheKey = `stddev:${ticker}:${period}`;
  const cached = getCached<number>(cacheKey);
  if (cached !== null) {
    return cached;
  }

  try {
    const url = `${ALPHA_VANTAGE_BASE_URL}?function=STDDEV&symbol=${encodeURIComponent(ticker)}&interval=daily&time_period=${period}&series_type=close&apikey=${apiKey}`;
    const response = await fetchWithTimeout(url, {}, 15_000);

    if (!response.ok) {
      console.warn(`[alpha-vantage-client] getStdDev(${ticker}) failed: ${response.status}`);
      return null;
    }

    const data = await response.json();

    // Check for API error messages
    if (data['Error Message'] || data['Note']) {
      console.warn(`[alpha-vantage-client] API message for ${ticker}:`, data['Error Message'] || data['Note']);
      return null;
    }

    const technicalAnalysis = data['Technical Analysis: STDDEV'];
    if (!technicalAnalysis || typeof technicalAnalysis !== 'object') {
      return null;
    }

    // Get the most recent value
    const dates = Object.keys(technicalAnalysis).sort().reverse();
    if (dates.length === 0) return null;

    const latestDate = dates[0];
    const latestValue = technicalAnalysis[latestDate];
    if (!latestValue || typeof latestValue !== 'object') return null;

    const stddev = parseFloat((latestValue as Record<string, string>)['STDDEV']);
    if (isNaN(stddev)) return null;

    setCached(cacheKey, stddev);
    return stddev;
  } catch (err) {
    console.error(`[alpha-vantage-client] getStdDev(${ticker}) error:`, err);
    return null;
  }
}
