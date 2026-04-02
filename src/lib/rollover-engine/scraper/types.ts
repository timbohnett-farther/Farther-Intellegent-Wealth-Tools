// =============================================================================
// Rollover Engine — Scraper Types
// =============================================================================

export interface ScrapeTarget {
  ein: string;
  plan_name?: string;
  sources: ScrapeSource[];
}

export type ScrapeSource = 'DOL_EFAST' | 'PROVIDER_PORTAL' | 'BENCHMARK_SERVICE';

export interface ScrapeResult {
  source: ScrapeSource;
  success: boolean;
  data_points: number;
  data: Record<string, unknown>;
  error?: string;
  duration_ms: number;
}

export interface EFASTFiling {
  filing_id: string;
  ein: string;
  plan_name: string;
  plan_year: number;
  total_assets: number;
  total_participants: number;
  total_active_participants: number;
  plan_type_code: string;
  admin_expenses: number;
  investment_expenses: number;
  total_expenses: number;
  filing_date: string;
}

export interface FundLineupEntry {
  fund_name: string;
  ticker?: string;
  asset_class: string;
  expense_ratio_bps: number;
  assets_cents: number;
  is_index: boolean;
  is_target_date: boolean;
  morningstar_rating?: number;
}

export interface ProviderPortalData {
  plan_features: string[];
  fund_lineup: FundLineupEntry[];
  admin_fee_schedule: Record<string, number>;
  service_options: string[];
}

export interface BrightDataConfig {
  api_key?: string;
  collector_id?: string;
  zone?: string;
  enabled: boolean;
}
