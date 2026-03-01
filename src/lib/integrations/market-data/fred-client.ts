/**
 * Farther Prism — FRED (Federal Reserve Economic Data) Client
 *
 * Provides access to key economic indicators from the FRED API:
 * Treasury yields, CPI inflation data, and the Federal Funds rate.
 *
 * This is a stub implementation returning realistic demo data.
 * In production, replace with actual FRED API calls using series IDs
 * such as DGS10 (10-Year Treasury), CPIAUCSL (CPI), FEDFUNDS, etc.
 */

import type {
  FREDConfig,
  TreasuryRateData,
  CPIData,
  FedFundsData,
} from '../types';

/**
 * Client for the Federal Reserve Economic Data (FRED) API.
 *
 * Wraps FRED REST API endpoints to fetch Treasury rates, CPI, and
 * Federal Funds rate data. All methods return stub data in this
 * implementation.
 *
 * @example
 * ```ts
 * const fred = new FREDClient({ apiKey: 'your-fred-api-key' });
 * const rates = await fred.fetchTreasuryRates();
 * console.log(`10Y Treasury: ${rates.tenYear}`);
 * ```
 */
export class FREDClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  /**
   * Creates a new FREDClient instance.
   *
   * @param config - FRED API configuration including the API key.
   */
  constructor(config: FREDConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? 'https://api.stlouisfed.org/fred';
  }

  // ==================== TREASURY RATES ====================

  /**
   * Fetches the latest US Treasury yield curve data.
   *
   * In production, this calls FRED series:
   * - DGS3MO (3-Month)
   * - DGS6MO (6-Month)
   * - DGS1  (1-Year)
   * - DGS2  (2-Year)
   * - DGS5  (5-Year)
   * - DGS10 (10-Year)
   * - DGS20 (20-Year)
   * - DGS30 (30-Year)
   *
   * @returns The latest Treasury yield curve data.
   *
   * @example
   * ```ts
   * const rates = await fred.fetchTreasuryRates();
   * console.log(`Yield curve: 2Y=${rates.twoYear}, 10Y=${rates.tenYear}, 30Y=${rates.thirtyYear}`);
   * ```
   */
  async fetchTreasuryRates(): Promise<TreasuryRateData> {
    // In production:
    //   GET {baseUrl}/series/observations?series_id=DGS10&api_key={key}&file_type=json&sort_order=desc&limit=1
    //
    // Stub: realistic rates as of early 2026 (rates in decimal form)
    void this.buildUrl('series/observations', { series_id: 'DGS10' });

    return {
      threeMonth: 0.0435,
      sixMonth: 0.0428,
      oneYear: 0.0418,
      twoYear: 0.0405,
      fiveYear: 0.0412,
      tenYear: 0.0425,
      twentyYear: 0.0448,
      thirtyYear: 0.0458,
      observationDate: new Date().toISOString().split('T')[0],
    };
  }

  // ==================== CPI / INFLATION ====================

  /**
   * Fetches the latest Consumer Price Index (CPI) data.
   *
   * In production, this calls FRED series:
   * - CPIAUCSL (CPI for All Urban Consumers: All Items)
   *
   * @returns CPI data with year-over-year and month-over-month changes.
   *
   * @example
   * ```ts
   * const cpi = await fred.fetchCPI();
   * console.log(`CPI YOY: ${(cpi.yoyChange * 100).toFixed(1)}%`);
   * ```
   */
  async fetchCPI(): Promise<CPIData> {
    // In production:
    //   GET {baseUrl}/series/observations?series_id=CPIAUCSL&api_key={key}&file_type=json&sort_order=desc&limit=13
    //   Then compute YOY by comparing latest to 12 months prior,
    //   and MOM by comparing latest to 1 month prior.
    //
    // Stub: realistic CPI data
    void this.buildUrl('series/observations', { series_id: 'CPIAUCSL' });

    return {
      currentIndex: 319.8,
      yoyChange: 0.029,    // 2.9% year-over-year
      momChange: 0.002,    // 0.2% month-over-month
      observationDate: getLastMonthDate(),
    };
  }

  // ==================== FEDERAL FUNDS RATE ====================

  /**
   * Fetches the current Federal Funds rate data.
   *
   * In production, this calls FRED series:
   * - FEDFUNDS (Effective Federal Funds Rate)
   * - DFEDTARU (Fed Funds Target Upper)
   * - DFEDTARL (Fed Funds Target Lower)
   *
   * @returns Federal Funds rate with effective rate and target range.
   *
   * @example
   * ```ts
   * const ff = await fred.fetchFedFundsRate();
   * console.log(`Fed Funds: ${ff.effectiveRate} (${ff.targetLower}-${ff.targetUpper})`);
   * ```
   */
  async fetchFedFundsRate(): Promise<FedFundsData> {
    // In production:
    //   GET {baseUrl}/series/observations?series_id=FEDFUNDS&api_key={key}&file_type=json&sort_order=desc&limit=1
    //
    // Stub: realistic Fed Funds data (early 2026, post rate-cut cycle)
    void this.buildUrl('series/observations', { series_id: 'FEDFUNDS' });

    return {
      effectiveRate: 0.0425,
      targetLower: 0.0400,
      targetUpper: 0.0450,
      observationDate: new Date().toISOString().split('T')[0],
    };
  }

  // ==================== PRIVATE HELPERS ====================

  /**
   * Builds a FRED API URL with standard query parameters.
   * Used internally; in production this would be used by fetch calls.
   */
  private buildUrl(
    path: string,
    params: Record<string, string>,
  ): string {
    const searchParams = new URLSearchParams({
      ...params,
      api_key: this.apiKey,
      file_type: 'json',
      sort_order: 'desc',
      limit: '1',
    });

    return `${this.baseUrl}/${path}?${searchParams.toString()}`;
  }
}

// ==================== UTILITY FUNCTIONS ====================

/**
 * Returns an ISO-8601 date string for the last day of the previous month.
 * CPI data is typically released with a one-month lag.
 */
function getLastMonthDate(): string {
  const now = new Date();
  now.setDate(0); // Set to last day of previous month
  return now.toISOString().split('T')[0];
}
