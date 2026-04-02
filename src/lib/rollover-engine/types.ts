// =============================================================================
// Rollover Insight Engine — Core Types & Enums
// =============================================================================

// ==================== Branded Primitives ====================

/** Employer Identification Number (XX-XXXXXXX format) */
export type EIN = string & { readonly __brand: 'EIN' };

/** Dollar amounts stored as cents to avoid floating-point issues */
export type AmountCents = number & { readonly __brand: 'AmountCents' };

/** Basis points (1 bps = 0.01%) */
export type BasisPoints = number & { readonly __brand: 'BasisPoints' };

/** Score 0-100 */
export type Score = number & { readonly __brand: 'Score' };

// ==================== Helper Functions ====================

export function toEIN(value: string): EIN {
  return value as EIN;
}

export function toAmountCents(dollars: number): AmountCents {
  return Math.round(dollars * 100) as AmountCents;
}

export function toDollars(cents: AmountCents): number {
  return cents / 100;
}

export function toBasisPoints(percent: number): BasisPoints {
  return Math.round(percent * 100) as BasisPoints;
}

export function toPercent(bps: BasisPoints): number {
  return bps / 100;
}

export function toScore(value: number): Score {
  return Math.max(0, Math.min(100, Math.round(value))) as Score;
}

/** Validates EIN format: XX-XXXXXXX (9 digits with dash) */
export function isValidEIN(value: string): boolean {
  return /^\d{2}-\d{7}$/.test(value);
}

// ==================== Enums ====================

export const PlanType = {
  TRADITIONAL_401K: 'TRADITIONAL_401K',
  ROTH_401K: 'ROTH_401K',
  SIMPLE_401K: 'SIMPLE_401K',
  SAFE_HARBOR_401K: 'SAFE_HARBOR_401K',
  PROFIT_SHARING: 'PROFIT_SHARING',
  MONEY_PURCHASE: 'MONEY_PURCHASE',
  DEFINED_BENEFIT: 'DEFINED_BENEFIT',
  CASH_BALANCE: 'CASH_BALANCE',
  ESOP: 'ESOP',
  '403B': '403B',
  '457B': '457B',
  SEP_IRA: 'SEP_IRA',
  SIMPLE_IRA: 'SIMPLE_IRA',
  KEOGH: 'KEOGH',
  OTHER: 'OTHER',
} as const;
export type PlanType = (typeof PlanType)[keyof typeof PlanType];

export const AnalysisStatus = {
  DRAFT: 'DRAFT',
  DATA_COLLECTION: 'DATA_COLLECTION',
  SCRAPING: 'SCRAPING',
  SCORING: 'SCORING',
  NARRATIVE_GENERATION: 'NARRATIVE_GENERATION',
  REVIEW: 'REVIEW',
  APPROVED: 'APPROVED',
  DELIVERED: 'DELIVERED',
  ARCHIVED: 'ARCHIVED',
} as const;
export type AnalysisStatus = (typeof AnalysisStatus)[keyof typeof AnalysisStatus];

export const RecommendationTier = {
  STRONG_ROLLOVER: 'STRONG_ROLLOVER',
  MODERATE_ROLLOVER: 'MODERATE_ROLLOVER',
  NEUTRAL: 'NEUTRAL',
  MODERATE_STAY: 'MODERATE_STAY',
  STRONG_STAY: 'STRONG_STAY',
} as const;
export type RecommendationTier = (typeof RecommendationTier)[keyof typeof RecommendationTier];

export const FactorName = {
  FEE_COMPARISON: 'FEE_COMPARISON',
  INVESTMENT_QUALITY: 'INVESTMENT_QUALITY',
  INVESTMENT_OPTIONS: 'INVESTMENT_OPTIONS',
  SERVICE_LEVEL: 'SERVICE_LEVEL',
  PENALTY_FREE_ACCESS: 'PENALTY_FREE_ACCESS',
  CREDITOR_PROTECTION: 'CREDITOR_PROTECTION',
  RMD_FLEXIBILITY: 'RMD_FLEXIBILITY',
  EMPLOYER_STOCK_NUA: 'EMPLOYER_STOCK_NUA',
  PLAN_STABILITY: 'PLAN_STABILITY',
  SPECIAL_CIRCUMSTANCES: 'SPECIAL_CIRCUMSTANCES',
} as const;
export type FactorName = (typeof FactorName)[keyof typeof FactorName];

export const NarrativeTemplate = {
  STANDARD: 'STANDARD',
  UHNW: 'UHNW',
  NEAR_RETIREMENT: 'NEAR_RETIREMENT',
  SMALL_BUSINESS: 'SMALL_BUSINESS',
  CUSTOM: 'CUSTOM',
} as const;
export type NarrativeTemplate = (typeof NarrativeTemplate)[keyof typeof NarrativeTemplate];

export const PlanSizeTier = {
  MICRO: 'MICRO',           // < $1M
  SMALL: 'SMALL',           // $1M - $10M
  MID: 'MID',               // $10M - $100M
  LARGE: 'LARGE',           // $100M - $1B
  MEGA: 'MEGA',             // > $1B
} as const;
export type PlanSizeTier = (typeof PlanSizeTier)[keyof typeof PlanSizeTier];

export const ScrapeJobStatus = {
  PENDING: 'PENDING',
  RUNNING: 'RUNNING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  PARTIAL: 'PARTIAL',
} as const;
export type ScrapeJobStatus = (typeof ScrapeJobStatus)[keyof typeof ScrapeJobStatus];

export const ReportFormat = {
  PDF: 'PDF',
  DOCX: 'DOCX',
  HTML: 'HTML',
} as const;
export type ReportFormat = (typeof ReportFormat)[keyof typeof ReportFormat];

// ==================== Core Entity Types ====================

/** 401(k) Plan data (from DOL EFAST, scraping, or manual entry) */
export interface RolloverPlan {
  plan_id: string;
  ein: EIN;
  plan_name: string;
  sponsor_name: string;
  plan_type: PlanType;
  plan_size_tier: PlanSizeTier;
  total_assets_cents: AmountCents;
  participant_count: number;
  plan_year_end: string; // YYYY-MM-DD
  recordkeeper: string;
  custodian: string;

  // Fee data
  total_plan_expense_bps: BasisPoints;
  admin_fees_cents: AmountCents;
  investment_management_fees_bps: BasisPoints;
  per_participant_fee_cents: AmountCents;

  // Investment lineup
  fund_count: number;
  index_fund_count: number;
  target_date_fund_count: number;
  self_directed_brokerage: boolean;

  // Features
  roth_option: boolean;
  loan_provision: boolean;
  hardship_withdrawal: boolean;
  employer_stock: boolean;
  employer_stock_pct: number;
  auto_enrollment: boolean;
  auto_escalation: boolean;

  // Metadata
  data_source: 'EFAST' | 'SCRAPE' | 'MANUAL' | 'HYBRID';
  data_freshness: string; // ISO date
  created_at: string;
  updated_at: string;
}

/** Rollover analysis — the central entity */
export interface RolloverAnalysis {
  analysis_id: string;
  firm_id: string;
  advisor_id: string;
  household_id: string;
  client_name: string;

  // Plan reference
  plan_id: string;
  plan_name: string;
  plan_ein: EIN;

  // Client-specific data
  participant_balance_cents: AmountCents;
  participant_age: number;
  years_of_service: number;
  retirement_target_age: number;
  state_of_residence: string;
  has_outstanding_loan: boolean;
  outstanding_loan_cents: AmountCents;
  has_employer_stock: boolean;
  employer_stock_cost_basis_cents: AmountCents;

  // Analysis state
  status: AnalysisStatus;
  narrative_template: NarrativeTemplate;

  // Score reference (populated after scoring)
  score_id?: string;
  recommendation_tier?: RecommendationTier;
  composite_score?: Score;

  // Narrative reference (populated after generation)
  narrative_id?: string;

  // Report reference (populated after generation)
  report_id?: string;

  // HubSpot sync reference
  hubspot_deal_id?: string;

  // Metadata
  notes: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  last_modified_by: string;
}

/** Individual factor score within the 10-factor framework */
export interface FactorScore {
  factor_score_id: string;
  score_id: string;
  factor_name: FactorName;
  score: Score;
  weight: number; // 0.0 to 1.0
  weighted_score: number;
  direction: 'FAVOR_ROLLOVER' | 'FAVOR_STAY' | 'NEUTRAL';
  rationale: string;
  data_points: Record<string, unknown>;
}

/** Composite Rollover Recommendation Score (RRS) */
export interface RolloverScore {
  score_id: string;
  analysis_id: string;
  composite_score: Score;
  recommendation_tier: RecommendationTier;
  factor_scores: FactorScore[];
  scoring_version: string;
  scored_at: string;
  scored_by: string;
}

/** Fee benchmark entry for a plan size tier */
export interface BenchmarkEntry {
  benchmark_id: string;
  plan_size_tier: PlanSizeTier;
  metric_name: string;
  percentile_25: number;
  percentile_50: number;
  percentile_75: number;
  percentile_90: number;
  source: string;
  as_of_date: string;
  created_at: string;
  updated_at: string;
}

/** Background scraping job */
export interface ScrapeJob {
  job_id: string;
  analysis_id: string;
  plan_ein: EIN;
  status: ScrapeJobStatus;
  sources_attempted: string[];
  sources_succeeded: string[];
  data_points_extracted: number;
  error_message?: string;
  started_at: string;
  completed_at?: string;
}

/** AI-generated narrative for the analysis */
export interface NarrativeOutput {
  narrative_id: string;
  analysis_id: string;
  template: NarrativeTemplate;
  executive_summary: string;
  detailed_analysis: string;
  factor_narratives: Record<FactorName, string>;
  recommendation_text: string;
  regulatory_citations: RegulatoryCitation[];
  disclaimers: string[];
  model_id: string;
  token_usage: { input_tokens: number; output_tokens: number };
  generated_at: string;
  generated_by: string;
}

/** Regulatory citation for compliance documentation */
export interface RegulatoryCitation {
  citation_id: string;
  regulation: 'REG_BI' | 'ERISA_404A' | 'IRC_402C' | 'DOL_2020_02' | 'SEC_IA_5566';
  section: string;
  title: string;
  relevance: string;
  url?: string;
}

/** Generated PDF/DOCX report */
export interface RolloverReport {
  report_id: string;
  analysis_id: string;
  format: ReportFormat;
  version: number;
  filename: string;
  file_size_bytes: number;
  sections: string[];
  generated_at: string;
  generated_by: string;
  download_url?: string;
}

/** HubSpot deal sync record */
export interface HubSpotDealSync {
  sync_id: string;
  analysis_id: string;
  hubspot_deal_id: string;
  hubspot_contact_id?: string;
  deal_amount_cents: AmountCents;
  deal_stage: string;
  properties_synced: string[];
  report_attached: boolean;
  last_synced_at: string;
  sync_status: 'PENDING' | 'SYNCED' | 'FAILED' | 'STALE';
  error_message?: string;
}

// ==================== API Request/Response Types ====================

export interface CreateAnalysisRequest {
  household_id: string;
  client_name: string;
  plan_id?: string;
  plan_ein?: string;
  plan_name?: string;
  participant_balance_cents: number;
  participant_age: number;
  years_of_service: number;
  retirement_target_age?: number;
  state_of_residence: string;
  has_outstanding_loan?: boolean;
  outstanding_loan_cents?: number;
  has_employer_stock?: boolean;
  employer_stock_cost_basis_cents?: number;
  narrative_template?: NarrativeTemplate;
  notes?: string;
}

export interface UpdateAnalysisRequest {
  status?: AnalysisStatus;
  participant_balance_cents?: number;
  participant_age?: number;
  years_of_service?: number;
  retirement_target_age?: number;
  state_of_residence?: string;
  has_outstanding_loan?: boolean;
  outstanding_loan_cents?: number;
  has_employer_stock?: boolean;
  employer_stock_cost_basis_cents?: number;
  narrative_template?: NarrativeTemplate;
  notes?: string;
}

export interface PlanSearchResult {
  plan_id: string;
  ein: string;
  plan_name: string;
  sponsor_name: string;
  plan_type: PlanType;
  total_assets_cents: number;
  participant_count: number;
  recordkeeper: string;
}

export interface AnalysisListItem {
  analysis_id: string;
  client_name: string;
  plan_name: string;
  plan_ein: string;
  participant_balance_cents: number;
  status: AnalysisStatus;
  composite_score?: number;
  recommendation_tier?: RecommendationTier;
  created_at: string;
  updated_at: string;
}

// ==================== Farther IRA Comparison ====================

export interface FartherIRAFees {
  advisory_fee_bps: BasisPoints;
  platform_fee_bps: BasisPoints;
  average_fund_expense_bps: BasisPoints;
  total_all_in_bps: BasisPoints;
  custodian: string;
  features: string[];
}

// ==================== Engine Configuration ====================

export interface RolloverEngineConfig {
  scoring_version: string;
  default_narrative_template: NarrativeTemplate;
  auto_score_on_create: boolean;
  hubspot_sync_enabled: boolean;
  scrape_enabled: boolean;
  max_concurrent_scrapes: number;
}

export const DEFAULT_ENGINE_CONFIG: RolloverEngineConfig = {
  scoring_version: '1.0.0',
  default_narrative_template: 'STANDARD',
  auto_score_on_create: false,
  hubspot_sync_enabled: false,
  scrape_enabled: false,
  max_concurrent_scrapes: 3,
};
