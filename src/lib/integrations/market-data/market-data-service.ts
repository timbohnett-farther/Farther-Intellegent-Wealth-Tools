/**
 * Farther Prism — Market Data Service
 *
 * High-level service for fetching market data snapshots, updating
 * equity prices, and retrieving historical rate data. Orchestrates
 * calls to the FRED and FMP clients.
 *
 * All functions return realistic demo data in this stub implementation.
 */

import type {
  MarketDataSnapshot,
  EquityHolding,
  PriceUpdate,
} from '../types';

// ==================== LATEST MARKET DATA ====================

/**
 * Fetches the latest market data snapshot including equity indices,
 * Treasury yields, Fed Funds rate, CPI, AFR rates, and the
 * Section 7520 rate.
 *
 * In production, this would aggregate data from FRED and FMP.
 *
 * @returns A MarketDataSnapshot with current values.
 *
 * @example
 * ```ts
 * const snapshot = await fetchLatestMarketData();
 * console.log(`S&P 500: ${snapshot.sp500Price}, 10Y: ${snapshot.tenYearTreasury}`);
 * ```
 */
export async function fetchLatestMarketData(): Promise<MarketDataSnapshot> {
  // Stub: return realistic market data as of early 2026
  return {
    date: new Date().toISOString().split('T')[0],
    sp500Price: 5_842.50,
    sp500YTDReturn: 0.048,
    tenYearTreasury: 0.0425,
    thirtyYearTreasury: 0.0458,
    fedFundsRate: 0.0425,
    cpiYOY: 0.029,
    afrShortTerm: 0.0444,
    afrMidTerm: 0.0412,
    afrLongTerm: 0.0438,
    sec7520Rate: 0.052,
  };
}

// ==================== EQUITY PRICE UPDATES ====================

/**
 * Updates prices for a set of equity holdings by fetching current
 * quotes and computing the price change.
 *
 * In production, this would call the FMP API to get real-time quotes.
 *
 * @param holdings - Array of equity holdings with last known prices.
 * @returns Array of PriceUpdate objects with new prices and changes.
 *
 * @example
 * ```ts
 * const updates = await updateEquityPrices([
 *   { ticker: 'AAPL', shares: 100, lastKnownPrice: 240.00 },
 *   { ticker: 'MSFT', shares: 50, lastKnownPrice: 425.00 },
 * ]);
 * ```
 */
export async function updateEquityPrices(
  holdings: EquityHolding[],
): Promise<PriceUpdate[]> {
  // Stub: simulate price movements with small random changes
  const demoQuotes: Record<string, number> = {
    'AAPL': 245.60,
    'MSFT': 430.15,
    'AMZN': 218.75,
    'GOOGL': 182.40,
    'META': 585.30,
    'NVDA': 875.50,
    'TSLA': 248.90,
    'BRK.B': 465.80,
    'JNJ': 162.40,
    'JPM': 215.60,
    'V': 305.20,
    'UNH': 545.80,
    'HD': 410.25,
    'PG': 178.50,
    'MA': 510.40,
    'SPY': 540.25,
    'VOO': 530.20,
    'VTI': 275.40,
    'QQQ': 495.80,
    'IVV': 542.10,
    'VXUS': 62.35,
    'BND': 72.80,
    'AGG': 98.50,
    'GLD': 245.60,
    'VGT': 580.40,
    'SCHD': 78.45,
    'HON': 215.40,
    'GE': 178.90,
  };

  return holdings.map((holding) => {
    const currentPrice = demoQuotes[holding.ticker.toUpperCase()]
      ?? holding.lastKnownPrice * (1 + (Math.random() * 0.04 - 0.02));

    const change = currentPrice - holding.lastKnownPrice;
    const changePct = holding.lastKnownPrice > 0
      ? change / holding.lastKnownPrice
      : 0;

    return {
      ticker: holding.ticker,
      previousPrice: holding.lastKnownPrice,
      newPrice: Math.round(currentPrice * 100) / 100,
      change: Math.round(change * 100) / 100,
      changePct: Math.round(changePct * 10000) / 10000,
      newMarketValue: Math.round(holding.shares * currentPrice * 100) / 100,
    };
  });
}

// ==================== HISTORICAL RATES ====================

/**
 * Fetches historical market data snapshots between two dates.
 *
 * Returns monthly snapshots with key indicators. In production,
 * this would query FRED for Treasury/CPI/Fed Funds data and
 * FMP for equity index data, then merge into snapshots.
 *
 * @param startDate - Start of the historical range.
 * @param endDate - End of the historical range.
 * @returns Array of MarketDataSnapshot objects, one per month.
 *
 * @example
 * ```ts
 * const history = await fetchHistoricalRates(
 *   new Date('2025-01-01'),
 *   new Date('2025-12-31'),
 * );
 * ```
 */
export async function fetchHistoricalRates(
  startDate: Date,
  endDate: Date,
): Promise<MarketDataSnapshot[]> {
  const snapshots: MarketDataSnapshot[] = [];

  // Generate monthly snapshots between start and end dates
  const current = new Date(startDate);
  current.setDate(1); // Normalize to first of month

  // Demo baseline values (Jan 2025)
  let sp500 = 5_480.00;
  let tenYear = 0.0445;
  let thirtyYear = 0.0465;
  let fedFunds = 0.0450;
  let cpi = 0.032;

  while (current <= endDate) {
    const year = current.getFullYear();
    const month = current.getMonth();

    // Simulate gradual market changes over time
    sp500 *= 1 + (Math.random() * 0.04 - 0.015); // slight upward bias
    tenYear += (Math.random() * 0.004 - 0.002);
    thirtyYear += (Math.random() * 0.003 - 0.0015);
    fedFunds -= 0.0025 * (month % 3 === 0 ? 1 : 0); // quarterly rate cuts
    cpi += (Math.random() * 0.002 - 0.001);

    // Clamp to realistic ranges
    tenYear = clamp(tenYear, 0.03, 0.06);
    thirtyYear = clamp(thirtyYear, 0.035, 0.065);
    fedFunds = clamp(fedFunds, 0.03, 0.055);
    cpi = clamp(cpi, 0.015, 0.05);

    // Compute YTD return
    const janPrice = year === 2025 ? 5_480 : 5_750;
    const ytdReturn = (sp500 - janPrice) / janPrice;

    // AFR rates track slightly above Treasury rates
    const afrShort = round4(tenYear * 0.95);
    const afrMid = round4(tenYear * 0.97);
    const afrLong = round4(thirtyYear * 0.96);
    const sec7520 = round4(Math.max(afrMid * 1.2, 0.04));

    snapshots.push({
      date: formatDate(current),
      sp500Price: Math.round(sp500 * 100) / 100,
      sp500YTDReturn: round4(ytdReturn),
      tenYearTreasury: round4(tenYear),
      thirtyYearTreasury: round4(thirtyYear),
      fedFundsRate: round4(fedFunds),
      cpiYOY: round4(cpi),
      afrShortTerm: afrShort,
      afrMidTerm: afrMid,
      afrLongTerm: afrLong,
      sec7520Rate: sec7520,
    });

    // Advance to next month
    current.setMonth(current.getMonth() + 1);
  }

  return snapshots;
}

// ==================== UTILITIES ====================

/** Clamps a value between min and max. */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Rounds to 4 decimal places. */
function round4(value: number): number {
  return Math.round(value * 10000) / 10000;
}

/** Formats a Date as an ISO-8601 date string (YYYY-MM-DD). */
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
