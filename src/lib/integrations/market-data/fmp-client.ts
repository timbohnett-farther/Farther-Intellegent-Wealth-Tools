/**
 * Farther Prism — FMP (Financial Modeling Prep) Client
 *
 * Provides equity quote and historical price data via the
 * Financial Modeling Prep API. Used for real-time equity prices,
 * index values, and historical performance data.
 *
 * This is a stub implementation returning realistic demo data.
 * In production, replace with actual FMP API calls.
 */

import type {
  FMPConfig,
  FMPQuote,
  FMPHistoricalPrice,
} from '../types';

/**
 * Client for the Financial Modeling Prep (FMP) API.
 *
 * Wraps FMP REST API endpoints for fetching real-time quotes
 * and historical pricing data. All methods return stub data
 * in this implementation.
 *
 * @example
 * ```ts
 * const fmp = new FMPClient({ apiKey: 'your-fmp-api-key' });
 * const quotes = await fmp.fetchQuote(['AAPL', 'MSFT', 'GOOGL']);
 * ```
 */
export class FMPClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  /**
   * Creates a new FMPClient instance.
   *
   * @param config - FMP API configuration including the API key.
   */
  constructor(config: FMPConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? 'https://financialmodelingprep.com/api/v3';
  }

  // ==================== REAL-TIME QUOTES ====================

  /**
   * Fetches real-time quotes for one or more ticker symbols.
   *
   * In production, calls:
   *   GET /api/v3/quote/{tickers}?apikey={key}
   *
   * @param tickers - Array of ticker symbols (e.g. ['AAPL', 'MSFT']).
   * @returns Array of FMPQuote objects with current prices and stats.
   *
   * @example
   * ```ts
   * const quotes = await fmp.fetchQuote(['AAPL', 'MSFT']);
   * for (const q of quotes) {
   *   console.log(`${q.symbol}: $${q.price} (${q.changesPercentage > 0 ? '+' : ''}${q.changesPercentage}%)`);
   * }
   * ```
   */
  async fetchQuote(tickers: string[]): Promise<FMPQuote[]> {
    // In production:
    //   GET {baseUrl}/quote/{tickers.join(',')}?apikey={apiKey}
    void this.buildUrl(`quote/${tickers.join(',')}`);

    return tickers.map((ticker) => {
      const data = DEMO_QUOTES[ticker.toUpperCase()];
      if (data) {
        return data;
      }

      // Generate a reasonable default for unknown tickers
      const price = 50 + Math.random() * 450;
      const change = (Math.random() * 6) - 3;
      return buildFMPQuote(ticker.toUpperCase(), `${ticker} Inc.`, price, change);
    });
  }

  // ==================== HISTORICAL PRICES ====================

  /**
   * Fetches historical daily prices for a single ticker.
   *
   * In production, calls:
   *   GET /api/v3/historical-price-full/{ticker}?from={start}&to={end}&apikey={key}
   *
   * @param ticker - The ticker symbol.
   * @param range - How far back to fetch, in trading days (default: 252 = ~1 year).
   * @returns Array of FMPHistoricalPrice objects sorted by date descending.
   *
   * @example
   * ```ts
   * const history = await fmp.fetchHistoricalPrices('AAPL', 30);
   * console.log(`Last 30 days of AAPL data: ${history.length} points`);
   * ```
   */
  async fetchHistoricalPrices(
    ticker: string,
    range: number = 252,
  ): Promise<FMPHistoricalPrice[]> {
    // In production:
    //   GET {baseUrl}/historical-price-full/{ticker}?apikey={apiKey}
    void this.buildUrl(`historical-price-full/${ticker}`);

    const prices: FMPHistoricalPrice[] = [];
    const currentQuote = DEMO_QUOTES[ticker.toUpperCase()];
    let currentPrice = currentQuote?.price ?? 150;

    // Generate historical prices working backwards from today
    const today = new Date();

    for (let i = 0; i < range; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);

      // Skip weekends
      const dayOfWeek = date.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) continue;

      // Simulate daily price movement (working backwards)
      const dailyReturn = (Math.random() * 0.04) - 0.02; // -2% to +2%
      const open = currentPrice * (1 - dailyReturn * 0.3);
      const high = Math.max(currentPrice, open) * (1 + Math.random() * 0.01);
      const low = Math.min(currentPrice, open) * (1 - Math.random() * 0.01);
      const volume = Math.floor(5_000_000 + Math.random() * 20_000_000);

      prices.push({
        date: formatDate(date),
        open: round2(open),
        close: round2(currentPrice),
        high: round2(high),
        low: round2(low),
        volume,
        adjClose: round2(currentPrice),
      });

      // Move price backwards (reverse the daily change)
      currentPrice = currentPrice / (1 + dailyReturn * 0.3);
    }

    return prices;
  }

  // ==================== PRIVATE HELPERS ====================

  /**
   * Builds an FMP API URL with the API key.
   */
  private buildUrl(path: string, params?: Record<string, string>): string {
    const searchParams = new URLSearchParams({
      ...(params ?? {}),
      apikey: this.apiKey,
    });

    return `${this.baseUrl}/${path}?${searchParams.toString()}`;
  }
}

// ==================== DEMO DATA ====================

/** Realistic demo quotes for common tickers. */
const DEMO_QUOTES: Record<string, FMPQuote> = {
  'AAPL': buildFMPQuote('AAPL', 'Apple Inc.', 245.60, 1.25),
  'MSFT': buildFMPQuote('MSFT', 'Microsoft Corporation', 430.15, 0.85),
  'AMZN': buildFMPQuote('AMZN', 'Amazon.com Inc.', 218.75, -0.42),
  'GOOGL': buildFMPQuote('GOOGL', 'Alphabet Inc.', 182.40, 0.63),
  'META': buildFMPQuote('META', 'Meta Platforms Inc.', 585.30, 1.78),
  'NVDA': buildFMPQuote('NVDA', 'NVIDIA Corporation', 875.50, 2.15),
  'TSLA': buildFMPQuote('TSLA', 'Tesla Inc.', 248.90, -1.35),
  'BRK.B': buildFMPQuote('BRK.B', 'Berkshire Hathaway Inc. Class B', 465.80, 0.32),
  'JNJ': buildFMPQuote('JNJ', 'Johnson & Johnson', 162.40, -0.18),
  'JPM': buildFMPQuote('JPM', 'JPMorgan Chase & Co.', 215.60, 0.95),
  'V': buildFMPQuote('V', 'Visa Inc.', 305.20, 0.55),
  'UNH': buildFMPQuote('UNH', 'UnitedHealth Group Inc.', 545.80, -0.72),
  'HD': buildFMPQuote('HD', 'The Home Depot Inc.', 410.25, 0.48),
  'PG': buildFMPQuote('PG', 'The Procter & Gamble Company', 178.50, 0.22),
  'MA': buildFMPQuote('MA', 'Mastercard Inc.', 510.40, 0.68),
  'SPY': buildFMPQuote('SPY', 'SPDR S&P 500 ETF Trust', 540.25, 0.45),
  'VOO': buildFMPQuote('VOO', 'Vanguard S&P 500 ETF', 530.20, 0.44),
  'VTI': buildFMPQuote('VTI', 'Vanguard Total Stock Market ETF', 275.40, 0.38),
  'QQQ': buildFMPQuote('QQQ', 'Invesco QQQ Trust', 495.80, 0.72),
  'IVV': buildFMPQuote('IVV', 'iShares Core S&P 500 ETF', 542.10, 0.43),
  'VXUS': buildFMPQuote('VXUS', 'Vanguard Total International Stock ETF', 62.35, -0.12),
  'BND': buildFMPQuote('BND', 'Vanguard Total Bond Market ETF', 72.80, 0.05),
  'AGG': buildFMPQuote('AGG', 'iShares Core U.S. Aggregate Bond ETF', 98.50, 0.03),
  'GLD': buildFMPQuote('GLD', 'SPDR Gold Trust', 245.60, 0.82),
  'VGT': buildFMPQuote('VGT', 'Vanguard Information Technology ETF', 580.40, 0.95),
  'SCHD': buildFMPQuote('SCHD', 'Schwab U.S. Dividend Equity ETF', 78.45, 0.28),
  'HON': buildFMPQuote('HON', 'Honeywell International Inc.', 215.40, 0.15),
  'GE': buildFMPQuote('GE', 'General Electric Co.', 178.90, 0.62),
};

/**
 * Builds a complete FMPQuote from minimal inputs.
 */
function buildFMPQuote(
  symbol: string,
  name: string,
  price: number,
  changesPercentage: number,
): FMPQuote {
  const change = round2(price * (changesPercentage / 100));
  const previousClose = price - change;
  const dayVariation = price * 0.015; // ~1.5% intraday range

  return {
    symbol,
    name,
    price: round2(price),
    change: round2(change),
    changesPercentage: round2(changesPercentage),
    dayHigh: round2(price + dayVariation * 0.6),
    dayLow: round2(previousClose - dayVariation * 0.4),
    volume: Math.floor(8_000_000 + Math.random() * 30_000_000),
    marketCap: Math.floor(price * (100_000_000 + Math.random() * 2_000_000_000)),
    yearHigh: round2(price * 1.25),
    yearLow: round2(price * 0.72),
  };
}

// ==================== UTILITIES ====================

/** Rounds to 2 decimal places. */
function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Formats a Date as YYYY-MM-DD. */
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
