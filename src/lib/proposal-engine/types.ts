/**
 * Farther Portfolio Proposal Engine (FP-Propose) -- Canonical Data Model
 *
 * This file defines every core type used across the portfolio proposal engine.
 * The proposal engine powers a 6-step wizard that guides advisors through
 * creating comprehensive investment proposals for RIA clients:
 *
 *   Step 1: Context (client, occasion, scope)
 *   Step 2: Current Portfolio (statement scan, holdings capture)
 *   Step 3: Risk Profile (3-dimensional assessment)
 *   Step 4: Proposed Portfolio (model selection, customization)
 *   Step 5: Analysis (analytics, tax transition, fees, stress tests)
 *   Step 6: Output (sections, compliance, delivery)
 *
 * Monetary values use the branded `MoneyCents` type (signed integer cents).
 * Rates use the branded `RateBps` type (basis points).
 * All IDs are UUID v4 strings. All timestamps are ISO 8601 strings.
 *
 * @module proposal-engine/types
 */

// =====================================================================
// Re-exported Branded Primitives from Tax Planning
// =====================================================================

/**
 * Re-export branded primitive types so consumers of the proposal engine
 * do not need a direct dependency on the tax-planning module.
 */
export type { MoneyCents, RateBps, ErrorEnvelope } from '../tax-planning/types';
import type { MoneyCents, RateBps } from '../tax-planning/types';
import type { FundXrayResult } from './analytics/fund-xray';
import type { EnhancedStressResult } from './analytics/stress-testing';
import type { MonteCarloResult } from './analytics/monte-carlo-bridge';

/**
 * Re-export helper constructors for branded primitives.
 *
 * @example
 * ```ts
 * import { cents, bps } from '../proposal-engine/types';
 * const value = cents(50000);   // $500.00 as MoneyCents
 * const rate  = bps(1.25);      // 125 bps as RateBps
 * ```
 */
export { cents, bps } from '../tax-planning/types';

// =====================================================================
// Enums / Union Types
// =====================================================================

/**
 * The reason or category for creating a proposal.
 * Determines which wizard sections are required vs. optional.
 */
export type ProposalType =
  | 'NEW_RELATIONSHIP'
  | 'ACCOUNT_REVIEW'
  | 'ASSET_TRANSFER'
  | 'SPECIFIC_GOAL'
  | 'ALTERNATIVE_INVESTMENT'
  | 'ROTH_CONVERSION'
  | 'IPS_UPDATE'
  | 'INITIAL_PROPOSAL'
  | 'REBALANCE'
  | 'TAX_LOSS_HARVEST'
  | 'RETIREMENT_TRANSITION'
  | 'CONSOLIDATION'
  | 'RISK_ADJUSTMENT'
  | 'CUSTOM';

/**
 * The meeting context or trigger that prompted this proposal.
 * Used for analytics and to tailor the proposal narrative.
 */
export type ProposalOccasion =
  | 'INITIAL_MEETING'
  | 'FOLLOW_UP'
  | 'ANNUAL_REVIEW'
  | 'CLIENT_INQUIRY'
  | 'PROACTIVE_OUTREACH'
  | 'LIFE_EVENT'
  | 'MARKET_CONDITIONS'
  | 'CLIENT_REQUEST'
  | 'NEW_ASSETS'
  | 'TAX_PLANNING'
  | 'ESTATE_PLANNING'
  | 'OTHER';

/**
 * Lifecycle status of a proposal from creation through outcome.
 */
export type ProposalStatus =
  | 'DRAFT'
  | 'READY'
  | 'REVIEW'
  | 'APPROVED'
  | 'SENT'
  | 'VIEWED'
  | 'ACCEPTED'
  | 'DECLINED'
  | 'EXPIRED';

/**
 * Client wealth tier classification.
 * Determines default fee schedules and service model.
 *
 * - MASS_AFFLUENT: $250K - $1M
 * - HNW: $1M - $5M
 * - VHNW: $5M - $25M
 * - UHNW: $25M+
 */
export type RelationshipTier =
  | 'MASS_AFFLUENT'
  | 'HNW'
  | 'VHNW'
  | 'UHNW'
  | 'STANDARD'
  | 'PREMIUM'
  | 'PRIVATE_CLIENT'
  | 'INSTITUTIONAL';

/**
 * How the holdings data was captured into the system.
 */
export type CaptureMethod =
  | 'OCR_SCAN'
  | 'CUSTODIAN_PULL'
  | 'MANUAL_ENTRY'
  | 'CSV_IMPORT';

/**
 * Tax-registration type of an investment account.
 * Determines tax treatment for transition analysis.
 */
export type AccountType =
  | 'TAXABLE'
  | '401K'
  | 'IRA'
  | 'ROTH_IRA'
  | 'SEP_IRA'
  | 'SIMPLE_IRA'
  | '403B'
  | '529'
  | 'TRUST'
  | 'JOINT'
  | 'CUSTODIAL'
  | 'HSA'
  | 'ANNUITY'
  | 'OTHER';

/**
 * Granular asset class taxonomy used for allocation modeling.
 * Covers equities, fixed income, real assets, alternatives, and cash.
 */
export type AssetClass =
  | 'EQUITY_US_LARGE'
  | 'EQUITY_US_MID'
  | 'EQUITY_US_SMALL'
  | 'EQUITY_INTL_DEVELOPED'
  | 'EQUITY_INTL_EMERGING'
  | 'EQUITY_SECTOR'
  | 'FIXED_INCOME_GOVT'
  | 'FIXED_INCOME_CORP'
  | 'FIXED_INCOME_CORP_IG'
  | 'FIXED_INCOME_CORP_HY'
  | 'FIXED_INCOME_MUNI'
  | 'FIXED_INCOME_INTL'
  | 'FIXED_INCOME_TIPS'
  | 'REAL_ESTATE'
  | 'ALTERNATIVES_REAL_ESTATE'
  | 'ALTERNATIVES_COMMODITIES'
  | 'ALTERNATIVES_OTHER'
  | 'COMMODITIES'
  | 'GOLD'
  | 'ALTERNATIVE_PE'
  | 'ALTERNATIVE_HEDGE'
  | 'ALTERNATIVE_PRIVATE_CREDIT'
  | 'CASH'
  | 'CASH_EQUIVALENT'
  | 'ANNUITY'
  | 'OTHER';

/**
 * Broad asset class groupings for allocation summaries.
 */
export type BroadAssetClass =
  | 'EQUITY'
  | 'FIXED_INCOME'
  | 'ALTERNATIVES'
  | 'CASH';

/**
 * Tax holding period classification for capital gains treatment.
 * SHORT = held < 1 year, LONG = held >= 1 year.
 */
export type HoldingPeriod = 'SHORT' | 'LONG' | 'UNKNOWN';

/**
 * Relative concentration level for a position or sector.
 * Used in overlap and diversification analysis.
 */
export type ConcentrationLevel = 'HIGH' | 'MEDIUM' | 'LOW';

/**
 * Five-point risk tolerance label derived from a composite risk score.
 */
export type RiskLabel =
  | 'CONSERVATIVE'
  | 'MODERATELY_CONSERVATIVE'
  | 'MODERATE'
  | 'MODERATELY_AGGRESSIVE'
  | 'AGGRESSIVE';

/**
 * Category of an investment model portfolio.
 */
export type ModelCategory =
  | 'CORE'
  | 'STRATEGIC'
  | 'TACTICAL'
  | 'FACTOR'
  | 'ESG'
  | 'INCOME'
  | 'TAX_EFFICIENT'
  | 'ALTERNATIVES'
  | 'TAX_EFFICIENT'
  | 'INCOME'
  | 'ALTERNATIVES'
  | 'CUSTOM';

/**
 * The primary investment vehicle used within a model portfolio.
 */
export type VehicleType =
  | 'ETF_ONLY'
  | 'MUTUAL_FUND'
  | 'SMA'
  | 'DIRECT_INDEXING'
  | 'MIXED';

/**
 * Qualitative tax efficiency rating for an investment model.
 */
export type TaxEfficiency = 'HIGH' | 'MEDIUM' | 'LOW';

/**
 * Strategy for transitioning from the current portfolio to the proposed allocation.
 */
export type TransitionStrategy =
  | 'FULL_LIQUIDATION'
  | 'PHASED_3YEAR'
  | 'HARVEST_FIRST'
  | 'DIRECT_INDEXING'
  | 'HOLD_IN_PLACE';

/**
 * Historical or hypothetical stress test scenarios.
 * Historical scenarios replay actual market conditions.
 * Hypothetical scenarios apply parameterized shocks.
 */
export type StressScenario =
  | '2008_FINANCIAL_CRISIS'
  | 'COVID_2020'
  | '2022_RATE_SHOCK'
  | '2000_DOTCOM'
  | '1987_BLACK_MONDAY'
  | '1973_STAGFLATION'
  | 'RATES_UP_200BPS'
  | 'RECESSION_MILD'
  | 'EQUITY_BEAR_50'
  | 'INFLATION_5PCT_3YR'
  | 'DOLLAR_COLLAPSE'
  | 'CUSTOM';

/**
 * How a finalized proposal is delivered to the client.
 */
export type DeliveryMethod = 'EMAIL' | 'PORTAL_UPLOAD' | 'IN_PERSON' | 'DOWNLOAD';

/**
 * Final outcome of a sent proposal.
 */
export type ProposalOutcome =
  | 'PENDING'
  | 'MEETING_SCHEDULED'
  | 'ACCEPTED'
  | 'DECLINED'
  | 'EXPIRED';

// =====================================================================
// Core Entity Types
// =====================================================================

/**
 * A single investment position within an account.
 * Used in both current portfolio (captured) and proposed portfolio (modeled).
 *
 * Monetary fields use `MoneyCents`. Nullable fields indicate data that
 * may not be available from all capture methods.
 */
export interface Holding {
  /** Ticker symbol, or null for non-traded assets (e.g., private placements). */
  ticker: string | null;
  /** CUSIP identifier, or null if unavailable. */
  cusip: string | null;
  /** Short display name (e.g., "Vanguard S&P 500 ETF"). */
  name?: string;
  /** Human-readable description of the holding. */
  description: string;
  /** Asset class classification for allocation analysis. */
  assetClass: AssetClass;
  /** Whether this is a single stock (vs. fund/ETF). */
  isSingleStock?: boolean;
  /** Number of shares/units held. */
  quantity: number;
  /** Alias for quantity (used in transition analysis). */
  shares?: number;
  /** Price per share/unit in cents. */
  price: MoneyCents;
  /** Total market value in cents (quantity * price). */
  marketValue: MoneyCents;
  /** Total cost basis in cents, or null if unavailable. */
  costBasis: MoneyCents | null;
  /** Unrealized gain/loss in cents (marketValue - costBasis), or null. */
  unrealizedGain: MoneyCents | null;
  /** Unrealized gain as a percentage of cost basis, or null. */
  gainPct: number | null;
  /** Tax holding period classification, or null if unknown. */
  holdingPeriod: HoldingPeriod | null;
  /** Fund expense ratio as a decimal (e.g., 0.0018 for 0.18%), or null. */
  expenseRatio: number | null;
  /** Trailing 12-month dividend yield as a decimal, or null. */
  dividendYield: number | null;
  /** Tax-registration type of the account holding this position. */
  accountType: AccountType;
  /** Display name of the account holding this position. */
  accountName: string;
}

// =====================================================================
// Statement Scanning
// =====================================================================

/**
 * Result of scanning/parsing an investment account statement.
 * Produced by the OCR pipeline or custodian data pull.
 */
export interface StatementScanResult {
  /** UUID v4 identifier for this scan. */
  scanId: string;
  /** Name of the account holder as extracted from the statement. */
  accountHolder: string;
  /** Custodian or brokerage institution name. */
  institution: string;
  /** Tax-registration type of the scanned account. */
  accountType: AccountType;
  /** Masked account number (e.g., "****1234"). */
  accountNumber: string;
  /** Statement date as an ISO 8601 date string. */
  statementDate: string;
  /** Total account value in cents. */
  totalValue: MoneyCents;
  /** Parsed individual holdings from the statement. */
  holdings: Holding[];
  /** Cash and cash-equivalent balance in cents. */
  cashAndEquivalents: MoneyCents;
  /** OCR/extraction confidence score (0 = no confidence, 1 = perfect). */
  confidence: number;
  /** Human-readable descriptions of items requiring manual review. */
  flaggedForReview: string[];
  /** Method used to capture this statement data. */
  captureMethod: CaptureMethod;
  /** ISO 8601 timestamp when the scan was processed. */
  processedAt: string;
  /** Original filename of the uploaded document. */
  fileName?: string;
  /** Custodian or brokerage name (alternative to institution). */
  custodian?: string;
  /** Processing status of the scan (e.g., 'PROCESSING', 'COMPLETE', 'ERROR'). */
  status?: string;
}

// =====================================================================
// Current Portfolio (Aggregated)
// =====================================================================

/**
 * Aggregated view of a client's current investment portfolio,
 * consolidated from one or more statement scans or data pulls.
 */
export interface CurrentPortfolio {
  /** Total portfolio market value in cents across all accounts. */
  totalValue: MoneyCents;
  /** All holdings across all accounts. */
  holdings: Holding[];
  /** Summary of each account included in the portfolio. */
  accounts: Array<{
    /** Display name of the account. */
    accountName: string;
    /** Tax-registration type. */
    accountType: AccountType;
    /** Custodian or brokerage institution. */
    institution: string;
    /** Account market value in cents. */
    value: MoneyCents;
    /** How this account's data was captured. */
    captureMethod: CaptureMethod;
  }>;
  /** Computed metrics for the aggregated portfolio. */
  metrics: PortfolioMetrics;
  /** Data quality and opportunity flags surfaced during analysis. */
  qualityFlags: QualityFlag[];
}

/**
 * Computed metrics for a portfolio, used for both current and proposed analysis.
 * All monetary values in cents; percentages as decimals unless noted.
 */
export interface PortfolioMetrics {
  /** Total portfolio market value in cents. */
  totalValue: number;
  /** Number of distinct holdings. */
  holdingCount: number;
  /** Asset-weighted average fund expense ratio (decimal). */
  weightedExpenseRatio: number;
  /** Estimated annual fund expense cost in cents. */
  estimatedAnnualCost?: MoneyCents;
  /** Sum of positive unrealized gains across all holdings in cents. */
  totalUnrealizedGain: number;
  /** Sum of unrealized losses (as a negative or positive number) across all holdings in cents. */
  totalUnrealizedLoss: number;
  /** Net unrealized gain/loss (gains - losses) in cents. */
  netUnrealizedGainLoss?: MoneyCents;
  /** Estimated tax liability if all unrealized gains were realized, in cents. */
  estimatedTaxDrag?: MoneyCents;
  /** Estimated portfolio yield (weighted average dividend yield, decimal). */
  estimatedYield?: number;
  /** Weighted average dividend yield (decimal). */
  weightedDividendYield?: number;
  /** US equity allocation as a percentage of total (0-100). */
  usEquityPct?: number;
  /** International equity allocation as a percentage of total (0-100). */
  intlEquityPct?: number;
  /** Top holdings by weight. */
  topHoldings?: Array<{ ticker: string | null; name?: string; weight: number }>;
  /** Equity allocation as a percentage of total (0-100). */
  equityPct: number;
  /** Fixed income allocation as a percentage of total (0-100). */
  fixedIncomePct: number;
  /** Alternatives allocation as a percentage of total (0-100). */
  alternativesPct: number;
  /** Cash and equivalents allocation as a percentage of total (0-100). */
  cashPct: number;
}

/** Severity level for quality flags. */
export type FlagSeverity = 'HIGH' | 'MEDIUM' | 'LOW' | 'OPPORTUNITY';

/** Category of portfolio concern. */
export type FlagCategory =
  | 'CONCENTRATION'
  | 'EXPENSE'
  | 'DIVERSIFICATION'
  | 'TAX'
  | 'ALLOCATION'
  | 'OVERLAP'
  | 'STALE';

/**
 * A data quality or opportunity flag surfaced during portfolio analysis.
 * Used to highlight issues, warnings, and potential improvements.
 */
export interface QualityFlag {
  /** Unique flag identifier. */
  flagId?: string;
  /** Classification of the flag. */
  type?: 'WARNING' | 'OPPORTUNITY' | 'OK';
  /** Human-readable title of the flag. */
  title?: string;
  /** Human-readable description of the flag. */
  message?: string;
  /** Detailed description. */
  description?: string;
  /** Impact severity for prioritization. */
  severity: FlagSeverity;
  /** The category of portfolio concern this flag addresses. */
  category: FlagCategory;
  /** Tickers affected by this flag. */
  affectedTickers?: string[];
  /** Recommended action to address this flag. */
  recommendation?: string;
}

// =====================================================================
// Risk Profile (3-Dimensional)
// =====================================================================

/**
 * Farther's 3-dimensional risk profile combining behavioral preferences,
 * financial capacity, and required return to meet goals.
 *
 * The composite score synthesizes all three dimensions into a single
 * 1-100 value that maps to a recommended asset allocation.
 */
export interface FartherRiskProfile {
  /** UUID v4 identifier for this risk profile. */
  profileId: string;

  // -- Dimension 1: Behavioral (from questionnaire) --

  /** Behavioral risk score from questionnaire responses (1-100). */
  behavioralScore: number;
  /** Categorical label derived from the behavioral score. */
  behavioralLabel: RiskLabel;
  /** Individual question responses with scores. */
  questionnaireResponses: QuestionnaireResponse[];

  // -- Dimension 2: Capacity (from financial plan data) --

  /** Financial capacity risk score (1-100). */
  capacityScore: number;
  /** Underlying factors that determine risk capacity. */
  capacityFactors: {
    /** Investment time horizon in years. */
    timeHorizon: number;
    /** Income stability score (1-100). */
    incomeStability: number;
    /** Ratio of liquid assets to 6-month expenses. */
    liquidityRatio: number;
    /** Total debt as a ratio of total assets. */
    debtRatio: number;
    /** Present value of future earnings (human capital) in cents. */
    humanCapitalValue: MoneyCents;
  };

  // -- Dimension 3: Required (to achieve financial goals) --

  /** Required risk score to meet goals (1-100). */
  requiredScore: number;
  /** Required annualized real return to fully fund goals (decimal). */
  requiredReturn: number;
  /** Ratio of current assets to the present value of future needs. */
  fundingRatio: number;

  // -- Composite --

  /** Weighted composite of all three dimensions (1-100). */
  compositeScore: number;
  /** Categorical label derived from the composite score. */
  compositeLabel: RiskLabel;
  /** Recommended strategic asset allocation based on composite score. */
  recommendedAllocation: {
    /** Target equity percentage (0-100). */
    equity: number;
    /** Target fixed income percentage (0-100). */
    fixedIncome: number;
    /** Target alternatives percentage (0-100). */
    alternatives: number;
    /** Target cash percentage (0-100). */
    cash: number;
  };

  // -- Current Portfolio Comparison --

  /** Estimated risk score of the client's current portfolio (1-100). */
  currentPortfolioRisk: number;
  /** Gap between recommended and current risk (recommended - current). */
  riskGap: number;
  /** Human-readable description of the risk gap (e.g., "Slightly too conservative"). */
  riskGapLabel: string;

  /** ISO 8601 timestamp when the risk profile was assessed. */
  assessedAt: string;
}

/**
 * A single response to a risk questionnaire question,
 * including the normalized score contribution.
 */
export interface QuestionnaireResponse {
  /** Unique identifier for the question. */
  questionId: string;
  /** The question text as displayed to the client. */
  questionText: string;
  /** The client's answer (string for choice questions, number for sliders). */
  answer: string | number;
  /** Normalized score for this response (1-100). */
  score: number;
}

// =====================================================================
// Investment Model
// =====================================================================

/**
 * A model portfolio maintained by the firm's investment committee.
 * Contains target allocations, performance history, and stress test results.
 */
export interface InvestmentModel {
  /** UUID v4 identifier for this model. */
  modelId: string;
  /** FK to the firm that owns this model. */
  firmId?: string;
  /** Display name of the model (e.g., "Farther Growth 60/40"). */
  name: string;
  /** Description of the model strategy. */
  description?: string;
  /** Category classification of the model strategy. */
  category: ModelCategory;
  /** Risk score of the model on a 1-100 scale. */
  riskScore: number;
  /** Categorical risk label derived from the risk score. */
  riskLabel?: RiskLabel;
  /** Target annualized return (decimal, e.g., 0.072 for 7.2%). */
  targetReturn?: number;
  /** Target annualized volatility (decimal, e.g., 0.12 for 12%). */
  targetVolatility?: number;

  /** Target allocations for each constituent in the model. */
  allocation?: ModelAllocation[];
  /** Alternative field name for allocations array. */
  allocations?: ModelAllocation[];
  /** Summary allocation percentages. */
  targetAllocation?: { equity: number; fixedIncome: number; alternatives: number; cash: number };

  /** ISO 8601 date when the model was first available. */
  inceptionDate?: string;
  /** Primary benchmark index (e.g., "60% MSCI ACWI / 40% Bloomberg Agg"). */
  benchmarkIndex?: string;
  /** Weighted average expense ratio of model constituents (decimal). */
  expenseRatio?: number;
  /** Weighted expense ratio alias. */
  weightedExpenseRatio?: number;
  /** Estimated annual portfolio turnover as a percentage. */
  annualTurnoverPct?: number;
  /** Qualitative tax efficiency rating. */
  taxEfficiency?: TaxEfficiency;

  /** Historical and backtested performance metrics (structured). */
  performance?: ModelPerformance;
  /** Historical annualized return (decimal, flat field alternative). */
  historicalReturn?: number;
  /** Historical annualized volatility (decimal, flat field alternative). */
  historicalVolatility?: number;
  /** Historical maximum drawdown (decimal, flat field alternative). */
  historicalMaxDrawdown?: number;
  /** Results from running the model through stress scenarios. */
  stressTests?: StressTestResult[];

  /** Whether the model is currently active for new proposals. */
  isActive: boolean;
  /** Whether the investment committee has approved this model. */
  approvedForUse?: boolean;
  /** Minimum investment amount in cents. */
  minInvestmentAmount?: MoneyCents;
  /** Primary vehicle type used in this model. */
  vehicleType?: VehicleType;

  /** ISO 8601 timestamp when the model was created. */
  createdAt?: string;
  /** ISO 8601 timestamp when the model was last updated. */
  updatedAt?: string;
}

/**
 * A single constituent allocation within an investment model.
 * Defines the target weight and allowable drift bands.
 */
export interface ModelAllocation {
  /** Ticker symbol of the constituent holding. */
  ticker: string;
  /** Human-readable name of the holding. */
  name?: string;
  /** Asset class of this allocation slice. */
  assetClass: AssetClass;
  /** Broad asset class grouping. */
  broadAssetClass?: BroadAssetClass;
  /** Target weight as a decimal (0-1) when used with model-library, or as a percentage (0-100). */
  targetWeight?: number;
  /** Target allocation percentage (0-100). */
  targetPct?: number;
  /** Minimum allowable percentage before rebalancing (0-100). */
  minPct?: number;
  /** Maximum allowable percentage before rebalancing (0-100). */
  maxPct?: number;
  /** Fund expense ratio as a decimal. */
  expenseRatio?: number;
  /** Additional notes (e.g., substitution rules, tax-lot preferences). */
  notes?: string;
}

/**
 * Historical and backtested performance metrics for an investment model.
 * All return and ratio values are decimals (e.g., 0.085 for 8.5%).
 */
export interface ModelPerformance {
  /** Year-to-date return (decimal). */
  ytd: number;
  /** Trailing 1-year annualized return (decimal). */
  oneYear: number;
  /** Trailing 3-year annualized return (decimal). */
  threeYear: number;
  /** Trailing 5-year annualized return (decimal). */
  fiveYear: number;
  /** Trailing 10-year annualized return (decimal). */
  tenYear: number;
  /** Annualized return since model inception (decimal). */
  sinceInception: number;
  /** Sharpe ratio (excess return per unit of total risk). */
  sharpeRatio: number;
  /** Sortino ratio (excess return per unit of downside risk). */
  sortinoRatio: number;
  /** Maximum peak-to-trough drawdown (decimal, negative). */
  maxDrawdown: number;
  /** Number of calendar days to recover from the maximum drawdown. */
  maxDrawdownRecoveryDays: number;
  /** Portfolio beta relative to the benchmark. */
  beta: number;
  /** Jensen's alpha relative to the benchmark (annualized decimal). */
  alpha: number;
  /** Information ratio (active return per unit of tracking error). */
  informationRatio: number;
}

/**
 * Result of running a portfolio through a single stress test scenario.
 */
export interface StressTestResult {
  /** The stress scenario applied. */
  scenario: StressScenario;
  /** Human-readable label for the scenario. */
  scenarioLabel: string;
  /** Simulated portfolio return under the scenario (decimal). */
  portfolioReturn: number;
  /** Benchmark return under the same scenario (decimal). */
  benchmarkReturn: number;
  /** Maximum drawdown during the scenario (decimal, negative). */
  maxDrawdown: number;
  /** Estimated months to recover to pre-stress levels. */
  recoveryMonths: number;
}

// =====================================================================
// Portfolio Analytics
// =====================================================================

/**
 * Comprehensive analytics suite for a portfolio.
 * Computed for both current and proposed portfolios to enable
 * side-by-side comparison in the proposal output.
 */
export interface PortfolioAnalytics {
  // -- Returns --

  /** Period-by-period return comparison vs. benchmark. */
  returns: Array<{
    /** Period label (e.g., "YTD", "1Y", "3Y", "5Y", "10Y", "SI"). */
    period: string;
    /** Portfolio return for the period (decimal). */
    portfolioReturn: number;
    /** Benchmark return for the period (decimal). */
    benchmarkReturn: number;
    /** Active return: portfolio minus benchmark (decimal). */
    activeReturn: number;
    /** Whether the return is annualized (true for periods > 1 year). */
    annualized: boolean;
  }>;

  // -- Risk Metrics --

  /** Annualized standard deviation of returns (decimal). */
  standardDeviation: number;
  /** Annualized downside deviation (decimal). */
  downsideDeviation: number;
  /** Maximum peak-to-trough drawdown (decimal, negative). */
  maxDrawdown: number;
  /** ISO 8601 date when the max drawdown period began. */
  maxDrawdownStartDate: string;
  /** ISO 8601 date when the max drawdown trough occurred. */
  maxDrawdownEndDate: string;
  /** Calendar days to recover from max drawdown, or null if still in drawdown. */
  recoveryDays: number | null;
  /** 95th percentile Value at Risk (decimal, negative). */
  valueAtRisk95: number;
  /** Conditional VaR / Expected Shortfall at 95% (decimal, negative). */
  conditionalVaR: number;

  // -- Risk-Adjusted Metrics --

  /** Sharpe ratio. */
  sharpeRatio: number;
  /** Sortino ratio. */
  sortinoRatio: number;
  /** Calmar ratio (annualized return / max drawdown). */
  calmarRatio: number;
  /** Treynor ratio (excess return / beta). */
  treynorRatio: number;
  /** Information ratio (active return / tracking error). */
  informationRatio: number;
  /** Upside capture ratio vs. benchmark (decimal, e.g., 1.05 = 105%). */
  captureUp: number;
  /** Downside capture ratio vs. benchmark (decimal, e.g., 0.85 = 85%). */
  captureDown: number;

  // -- Benchmark Relative --

  /** Portfolio beta relative to the benchmark. */
  beta: number;
  /** Jensen's alpha (annualized decimal). */
  alpha: number;
  /** R-squared (coefficient of determination, 0-1). */
  rSquared: number;
  /** Tracking error (annualized std dev of active returns, decimal). */
  trackingError: number;

  // -- Portfolio Characteristics --

  /** Weighted average price-to-earnings ratio. */
  peRatio: number;
  /** Weighted average price-to-book ratio. */
  pbRatio: number;
  /** Weighted average dividend yield (decimal). */
  dividendYield: number;

  // -- Factor Exposures --

  /** Factor exposure analysis (e.g., size, value, momentum, quality). */
  factorExposures: Array<{
    /** Factor name (e.g., "Size", "Value", "Momentum", "Quality", "Volatility"). */
    factor: string;
    /** Exposure coefficient (positive = tilt toward, negative = tilt away). */
    exposure: number;
    /** Human-readable label (e.g., "Slight large-cap tilt"). */
    label: string;
  }>;

  // -- Allocations --

  /** Sector allocation breakdown (sector name -> percentage 0-100). */
  sectorAllocation: Record<string, number>;
  /** Geographic allocation breakdown (region name -> percentage 0-100). */
  geographyAllocation: Record<string, number>;

  // -- Fixed Income Characteristics (if applicable) --

  /** Weighted average effective duration in years, or null if no fixed income. */
  effectiveDuration: number | null;
  /** Weighted average yield to maturity (decimal), or null if no fixed income. */
  yieldToMaturity: number | null;
  /** Credit quality distribution (rating -> percentage), or null. */
  creditQuality: Record<string, number> | null;

  // -- Security Overlap Analysis --

  /** Securities appearing in multiple funds, with effective concentration. */
  securityOverlap: Array<{
    /** Ticker symbol of the overlapping security. */
    ticker: string;
    /** Security name. */
    name: string;
    /** Effective portfolio weight accounting for fund-of-fund exposure (0-100). */
    effectivePct: number;
    /** List of fund tickers or names this security appears in. */
    appearsIn: string[];
    /** Concentration level assessment. */
    concentration: ConcentrationLevel;
  }>;
  /** Combined weight of the top 10 holdings as a percentage (0-100). */
  top10Concentration: number;
}

// =====================================================================
// Tax Transition Analysis
// =====================================================================

/**
 * Analysis of the tax implications of transitioning from the current
 * portfolio to the proposed allocation. Compares multiple strategies.
 */
export interface TaxTransitionAnalysis {
  /** Total cost basis across all taxable holdings in cents. */
  totalCostBasis?: MoneyCents;
  /** Current market value of all taxable holdings in cents. */
  currentMarketValue?: MoneyCents;
  /** Total unrealized gains in cents. */
  totalUnrealizedGain?: MoneyCents;
  /** Alias for totalUnrealizedGain. */
  totalUnrealizedGains?: number;
  /** Total unrealized losses in cents (as positive). */
  totalUnrealizedLoss?: MoneyCents;
  /** Alias for totalUnrealizedLoss. */
  totalUnrealizedLosses?: number;
  /** Net unrealized gain/loss. */
  netUnrealized?: number;
  /** Short-term unrealized gains in cents. */
  shortTermGains?: MoneyCents;
  /** Long-term unrealized gains in cents. */
  longTermGains?: MoneyCents;
  /** Effective combined tax rate (decimal). */
  effectiveTaxRate?: number;

  /** Detailed results for each evaluated transition strategy. */
  strategies: TransitionStrategyResult[];
  /** The strategy recommended by the engine. */
  recommendedStrategy: TransitionStrategy;
  /** Explanation of why this strategy was recommended. */
  recommendationRationale?: string;
  /** Alias for recommendationRationale. */
  recommendationReason?: string;
}

/**
 * Detailed result of evaluating a single transition strategy,
 * including tax cost breakdown and alignment metrics.
 */
export interface TransitionStrategyResult {
  /** The transition strategy evaluated. */
  strategy: TransitionStrategy | string;
  /** Human-readable strategy name. */
  label?: string;
  /** Alias for label. */
  strategyName?: string;
  /** Detailed description of how this strategy works. */
  description?: string;
  /** Total estimated tax cost of the transition in cents. */
  estimatedTaxCost: number;
  /** Federal capital gains tax component in cents. */
  federalCGTax?: MoneyCents;
  /** Net Investment Income Tax (3.8% surtax) component in cents. */
  niitTax?: MoneyCents;
  /** State capital gains tax component in cents. */
  stateTax?: MoneyCents;
  /** Net proceeds after taxes in cents. */
  netProceeds?: MoneyCents;
  /** Percentage of portfolio aligned to target after transition (0-100). */
  alignmentPct?: number;
  /** Estimated time to fully complete the transition (months). */
  timeToComplete?: number;
  /** Estimated years to fully complete the transition. */
  timelineYears?: number;
  /** Short-term gains realized. */
  shortTermGains?: number;
  /** Long-term gains realized. */
  longTermGains?: number;
  /** Losses harvested. */
  lossesHarvested?: number;
  /** Net gains. */
  netGains?: number;
  /** Per-holding actions. */
  holdingActions?: Array<{
    ticker: string | null;
    action: string;
    shares?: number;
    gainLoss?: number;
    taxCost?: number;
  }>;
  /** Year-by-year breakdown for phased strategies. */
  yearlyBreakdown?: Array<{
    year: number;
    gainsRealized: number;
    taxCost: number;
    bracketHeadroomUsed?: number;
  }>;
  /** Advantages of this strategy. */
  pros: string[];
  /** Disadvantages of this strategy. */
  cons: string[];
}

// =====================================================================
// Fee Analysis
// =====================================================================

/**
 * Side-by-side fee comparison between the current portfolio and
 * the proposed portfolio, including long-term compounding impact.
 */
export interface FeeAnalysis {
  /** Fee breakdown for the current portfolio. */
  current: FeeBreakdown;
  /** Fee breakdown for the proposed portfolio. */
  proposed: FeeBreakdown;
  /** Estimated annual fee savings in cents (current - proposed). */
  annualSavings: MoneyCents;
  /** Projected wealth impact of fee savings over time. */
  compoundingImpact: Array<{
    /** Projection horizon in years. */
    years: number;
    /** Projected wealth under current fee structure in cents. */
    currentWealth: MoneyCents;
    /** Projected wealth under proposed fee structure in cents. */
    proposedWealth: MoneyCents;
    /** Difference (proposed - current) in cents. */
    difference: MoneyCents;
  }>;
}

/**
 * Itemized breakdown of all-in investment costs.
 */
export interface FeeBreakdown {
  /** Weighted average fund expense ratio (decimal). */
  fundExpenseRatio: number;
  /** Annual fund expense cost in cents. */
  fundExpenseDollars: MoneyCents;
  /** Advisory fee rate (decimal). */
  advisoryFeeRate: number;
  /** Annual advisory fee cost in cents. */
  advisoryFeeDollars: MoneyCents;
  /** Estimated transaction cost rate (decimal). */
  transactionCostRate: number;
  /** Annual transaction cost in cents. */
  transactionCostDollars: MoneyCents;
  /** Total all-in cost rate (decimal). */
  totalRate: number;
  /** Total annual cost in cents. */
  totalDollars: MoneyCents;
}

// =====================================================================
// Proposal (Main Entity)
// =====================================================================

/**
 * The top-level proposal entity representing a complete portfolio proposal.
 * Tracks state across the 6-step wizard and includes all analysis artifacts.
 */
export interface Proposal {
  /** UUID v4 primary key for the proposal. */
  proposalId: string;
  /** FK to the firm creating this proposal. */
  firmId: string;
  /** FK to the advisor creating this proposal. */
  advisorId: string;
  /** FK to the client this proposal is for. */
  clientId: string;
  /** Display name of the client. */
  clientName: string;

  // -- Step 1: Context --

  /** The type/purpose of this proposal. */
  proposalType: ProposalType;
  /** The meeting occasion that prompted this proposal. */
  occasion: ProposalOccasion;
  /** Total assets in scope for this proposal in cents. */
  assetsInScope: MoneyCents;
  /** Client wealth tier classification. */
  relationshipTier: RelationshipTier;
  /** Free-form advisor notes about the proposal context. */
  notes: string;

  // -- Step 2: Current Portfolio --

  /** Aggregated current portfolio, or null if not yet captured. */
  currentPortfolio: CurrentPortfolio | null;

  // -- Step 3: Risk Profile --

  /** 3-dimensional risk profile, or null if not yet assessed. */
  riskProfile: FartherRiskProfile | null;

  // -- Step 4: Proposed Portfolio --

  /** Selected investment model, or null if not yet chosen. */
  proposedModel: InvestmentModel | null;
  /** Custom allocation overrides, or null if using the model as-is. */
  customAllocations: ModelAllocation[] | null;

  // -- Step 5: Analysis --

  /** Portfolio analytics for current and proposed allocations. */
  analytics: {
    /** Analytics for the current portfolio, or null if not computed. */
    current: PortfolioAnalytics | null;
    /** Analytics for the proposed portfolio, or null if not computed. */
    proposed: PortfolioAnalytics | null;
  };
  /** Tax transition analysis, or null if not computed. */
  taxTransition: TaxTransitionAnalysis | null;
  /** Fee comparison analysis, or null if not computed. */
  feeAnalysis: FeeAnalysis | null;
  /** Stress test results for the proposed portfolio. */
  stressTests: StressTestResult[];
  /** Fund X-ray decomposition result */
  fundXray?: FundXrayResult | null;
  /** Enhanced stress test result with VaR/CVaR */
  enhancedStressTests?: EnhancedStressResult | null;
  /** Monte Carlo simulation result */
  monteCarlo?: MonteCarloResult | null;
  /** Investment Policy Statement document */
  ips?: InvestmentPolicyStatement | null;
  /** Regulation Best Interest disclosure document */
  regBI?: RegBIDocument | null;

  // -- Step 6: Output --

  /** Ordered list of sections included in the proposal document. */
  sections: ProposalSection[];
  /** ID of the presentation template to use for rendering. */
  templateId: string;

  // -- Compliance --

  /** Whether an Investment Policy Statement has been generated. */
  ipsGenerated: boolean;
  /** Whether a Reg BI disclosure document has been generated. */
  regBIGenerated: boolean;

  // -- Metadata --

  /** Current lifecycle status of the proposal. */
  status: ProposalStatus;
  /** Current wizard step the advisor is on (1-6). */
  wizardStep: number;
  /** ISO 8601 timestamp when the proposal was created. */
  createdAt: string;
  /** ISO 8601 timestamp when the proposal was last updated. */
  updatedAt: string;
  /** ISO 8601 timestamp when the proposal was sent, or null. */
  sentAt: string | null;

  // -- Tracking --

  /** Engagement tracking data after the proposal is sent, or null. */
  tracking: ProposalTracking | null;

  // -- Optional display / computed fields --

  /** Human-readable proposal title (e.g., "Initial Proposal for John Smith"). */
  title?: string;
  /** ISO 8601 timestamp when the proposal was first viewed by the client, or null. */
  viewedAt?: string;
  /** Current portfolio total value in cents. */
  currentPortfolioValue?: MoneyCents;
  /** Proposed portfolio total value in cents. */
  proposedPortfolioValue?: MoneyCents;
}

/**
 * A configurable section within the proposal document.
 * Advisors can include/exclude and reorder optional sections.
 */
export interface ProposalSection {
  /** Unique key for this section (e.g., "cover", "executive_summary"). */
  key: string;
  /** Display label for the section. */
  label: string;
  /** Whether this section is included in the generated proposal. */
  included: boolean;
  /** Whether this section is required and cannot be removed. */
  required: boolean;
  /** Sort order for rendering (lower = earlier). */
  order: number;
}

/**
 * Engagement tracking for a sent proposal.
 * Records delivery, opens, page views, and final outcome.
 */
export interface ProposalTracking {
  /** ISO 8601 timestamp when the proposal was sent. */
  sentAt: string;
  /** List of recipient email addresses. */
  sentTo: string[];
  /** How the proposal was delivered. */
  deliveryMethod: DeliveryMethod;
  /** Individual open/view events. */
  opens: Array<{
    /** ISO 8601 timestamp of the open event. */
    openedAt: string;
    /** Duration of the viewing session in milliseconds. */
    durationMs: number;
    /** 0-indexed page numbers viewed during this session. */
    pagesViewed: number[];
  }>;
  /** ISO 8601 timestamp of the first open, or null if never opened. */
  firstOpenedAt: string | null;
  /** Total number of times the proposal has been opened. */
  totalOpenCount: number;
  /** Section key of the most-viewed section, or null. */
  mostViewedSection: string | null;
  /** Final outcome of the proposal. */
  outcome: ProposalOutcome;
  /** ISO 8601 timestamp when the outcome was recorded, or null. */
  outcomeDate: string | null;
  /** AUM won if the proposal was accepted, in cents, or null. */
  aumWon: MoneyCents | null;
  /** Reason for decline if the proposal was declined, or null. */
  declineReason: string | null;
}

// =====================================================================
// Compliance Documents
// =====================================================================

/**
 * Investment Policy Statement generated as part of a proposal.
 * Defines the investment objectives, constraints, and governance framework.
 */
export interface InvestmentPolicyStatement {
  /** UUID v4 primary key for the IPS. */
  ipsId: string;
  /** FK to the proposal that generated this IPS. */
  proposalId: string;
  /** Client name for the IPS header. */
  clientName: string;
  /** Stated investment objective (e.g., "Long-term growth with moderate income"). */
  investmentObjective: string;
  /** Risk tolerance statement derived from the risk profile. */
  riskTolerance: string;
  /** Investment time horizon description (e.g., "20+ years to retirement"). */
  timeHorizon: string;
  /** Liquidity needs statement (e.g., "Moderate -- annual withdrawals expected"). */
  liquidityNeeds: string;
  /** Target strategic allocation with drift bands. */
  targetAllocation: Array<{
    /** Asset class or sub-class label. */
    assetClass: string;
    /** Target allocation percentage (0-100). */
    targetPct: number;
    /** Minimum allowable percentage (0-100). */
    minPct: number;
    /** Maximum allowable percentage (0-100). */
    maxPct: number;
  }>;
  /** Percentage drift threshold that triggers rebalancing (e.g., 5 for 5%). */
  rebalancingThreshold: number;
  /** Rebalancing review frequency (e.g., "Quarterly"). */
  rebalancingFrequency: string;
  /** Composite benchmark definition with component weights. */
  benchmarks: Array<{
    /** Benchmark component name (e.g., "US Equity"). */
    component: string;
    /** Benchmark index (e.g., "S&P 500 TR"). */
    benchmark: string;
    /** Weight of this component in the composite (0-1, sums to 1). */
    weight: number;
  }>;
  /** ISO 8601 date when the IPS becomes effective. */
  effectiveDate: string;
  /** ISO 8601 date for the next scheduled IPS review. */
  reviewDate: string;
  /** ISO 8601 timestamp when the IPS was generated. */
  generatedAt: string;
}

/**
 * Regulation Best Interest (Reg BI) disclosure document.
 * Required for broker-dealer recommendations; generated for compliance.
 */
export interface RegBIDocument {
  /** UUID v4 primary key for the document. */
  docId: string;
  /** FK to the proposal this document accompanies. */
  proposalId: string;
  /** Summary of the client's financial profile relevant to the recommendation. */
  clientProfileSummary: string;
  /** Rationale for why this investment recommendation is in the client's best interest. */
  recommendationRationale: string;
  /** Alternative investment approaches that were considered. */
  alternativesConsidered: string[];
  /** Disclosure of all costs, fees, and expenses. */
  costsAndFees: string;
  /** Disclosure of any conflicts of interest. */
  conflictsOfInterest: string;
  /** SHA-256 hash of the document content for tamper detection. */
  contentHash: string;
  /** Whether the document is locked (immutable after sending). */
  locked: boolean;
  /** ISO 8601 timestamp when the document was generated. */
  generatedAt: string;
  /** Compliance checklist verifying all Reg BI obligations are met. */
  checklist: {
    /** Risk profile has been documented. */
    riskProfileDocumented: boolean;
    /** Suitability of the recommendation has been considered. */
    suitabilityConsidered: boolean;
    /** All costs have been disclosed. */
    costsDisclosed: boolean;
    /** Reasonable alternatives have been considered. */
    alternativesConsidered: boolean;
    /** All conflicts of interest have been disclosed. */
    conflictsDisclosed: boolean;
    /** All required documentation is complete. */
    documentationComplete: boolean;
  };
}

// =====================================================================
// API Request / Response Types
// =====================================================================

/**
 * Request body for creating a new proposal (Step 1).
 */
export interface CreateProposalRequest {
  /** UUID of the client this proposal is for. */
  clientId: string;
  /** Display name of the client. */
  clientName: string;
  /** The type/purpose of this proposal. */
  proposalType: ProposalType;
  /** The meeting occasion that prompted this proposal. */
  occasion: ProposalOccasion;
  /** Total assets in scope in whole dollars (converted to cents server-side). */
  assetsInScope: number;
  /** Client wealth tier classification. */
  relationshipTier: RelationshipTier;
  /** Optional free-form advisor notes. */
  notes?: string;
}

/**
 * Request body for updating a proposal at any wizard step.
 * All fields are optional; only provided fields are updated.
 */
export interface UpdateProposalRequest {
  /** Advance or set the current wizard step (1-6). */
  wizardStep?: number;
  /** Update the proposal lifecycle status. */
  status?: ProposalStatus;
  /** Set or replace the current portfolio data. */
  currentPortfolio?: CurrentPortfolio;
  /** Set or replace the risk profile. */
  riskProfile?: FartherRiskProfile;
  /** Select a model portfolio by ID. */
  proposedModelId?: string;
  /** Set custom allocation overrides. */
  customAllocations?: ModelAllocation[];
  /** Configure which sections to include in the output. */
  sections?: ProposalSection[];
  /** Select a presentation template. */
  templateId?: string;
}

/**
 * Request body to initiate a statement scan via OCR.
 */
export interface ScanStatementRequest {
  /** UUID of the proposal to attach the scan results to. */
  proposalId: string;
  /** Original filename of the uploaded statement. */
  filename: string;
  /** MIME type or file extension (e.g., "application/pdf", "image/png"). */
  fileType: string;
}

/**
 * Request body for running the risk assessment questionnaire.
 */
export interface RiskAssessmentRequest {
  /** UUID of the proposal to attach the risk profile to. */
  proposalId: string;
  /** Completed questionnaire responses. */
  responses: QuestionnaireResponse[];
  /** Optional overrides for capacity factors (e.g., from financial plan data). */
  capacityOverrides?: Partial<FartherRiskProfile['capacityFactors']>;
}

/**
 * Request body to compute portfolio analytics and optional analyses.
 */
export interface ComputeAnalyticsRequest {
  /** UUID of the proposal to compute analytics for. */
  proposalId: string;
  /** Whether to include stress test scenarios (default: false). */
  includeStressTests?: boolean;
  /** Whether to include tax transition analysis (default: false). */
  includeTaxTransition?: boolean;
  /** Whether to include fee comparison analysis (default: false). */
  includeFeeAnalysis?: boolean;
  /** Whether to include fund X-ray decomposition (default: true). */
  includeFundXray?: boolean;
  /** Whether to include Monte Carlo simulation (default: false). */
  includeMonteCarlo?: boolean;
  /** Custom stress scenario parameters for a user-defined shock. */
  customStressScenario?: {
    /** Equity market shock as a decimal (e.g., -0.30 for -30%). */
    equityShock: number;
    /** Bond market shock as a decimal (e.g., -0.10 for -10%). */
    bondShock: number;
    /** Duration/rate shock in basis points (e.g., 200 for +200bps). */
    durationShock: number;
  };
}

/**
 * Request body to send a finalized proposal to the client.
 */
export interface SendProposalRequest {
  /** UUID of the proposal to send. */
  proposalId: string;
  /** List of recipient email addresses. */
  recipients: string[];
  /** How the proposal should be delivered. */
  deliveryMethod: DeliveryMethod;
  /** Optional personalized message to accompany the proposal. */
  message?: string;
}

/**
 * Summary item for the proposal list view (dashboard).
 */
export interface ProposalListItem {
  /** UUID of the proposal. */
  proposalId: string;
  /** Client display name. */
  clientName: string;
  /** Proposal type/purpose. */
  proposalType: ProposalType;
  /** Current lifecycle status. */
  status: ProposalStatus;
  /** Assets in scope in cents. */
  assetsInScope: MoneyCents;
  /** ISO 8601 timestamp of creation. */
  createdAt: string;
  /** ISO 8601 timestamp of last update. */
  updatedAt: string;
  /** ISO 8601 timestamp when sent, or null. */
  sentAt: string | null;
  /** Number of times the client has opened the proposal. */
  viewCount: number;
  /** Current outcome status. */
  outcome: ProposalOutcome;
  /** Portfolio total value in cents (for dashboard display). */
  portfolioValue?: MoneyCents;
}

/**
 * Aggregate statistics for the proposal dashboard.
 */
export interface ProposalDashboardStats {
  /** Number of proposals created in the last 90 days. */
  totalCreated90Days: number;
  /** Number of proposals that have been sent. */
  totalSent: number;
  /** Conversion rate: accepted / sent (decimal, 0-1). */
  conversionRate: number;
  /** Total AUM won from accepted proposals in cents. */
  aumWon: MoneyCents;
  /** Alias for totalCreated90Days. */
  created90d?: number;
  /** Alias for totalSent. */
  sent?: number;
}

// =====================================================================
// Constants
// =====================================================================

/**
 * Default proposal sections with ordering and inclusion settings.
 * Required sections cannot be removed by the advisor.
 * Optional sections can be toggled and reordered.
 */
export const DEFAULT_PROPOSAL_SECTIONS: ProposalSection[] = [
  { key: 'cover', label: 'Cover Page', included: true, required: true, order: 0 },
  { key: 'disclosures', label: 'Important Disclosures', included: true, required: true, order: 99 },
  { key: 'executive_summary', label: 'Executive Summary', included: true, required: false, order: 1 },
  { key: 'about_firm', label: 'About Our Firm', included: true, required: false, order: 2 },
  { key: 'financial_snapshot', label: 'Your Financial Snapshot', included: true, required: false, order: 3 },
  { key: 'risk_assessment', label: 'Risk Assessment Results', included: true, required: false, order: 4 },
  { key: 'current_portfolio', label: 'Current Portfolio Analysis', included: true, required: false, order: 5 },
  { key: 'proposed_portfolio', label: 'Proposed Portfolio', included: true, required: false, order: 6 },
  { key: 'comparison', label: 'Side-by-Side Comparison', included: true, required: false, order: 7 },
  { key: 'stress_tests', label: 'Stress Test Scenarios', included: true, required: false, order: 8 },
  { key: 'fee_analysis', label: 'Fee Analysis', included: true, required: false, order: 9 },
  { key: 'tax_transition', label: 'Tax Transition Analysis', included: true, required: false, order: 10 },
  { key: 'implementation', label: 'Implementation Plan', included: true, required: false, order: 11 },
  { key: 'ips', label: 'Investment Policy Statement', included: true, required: false, order: 12 },
  { key: 'next_steps', label: 'Next Steps & Contact', included: true, required: false, order: 13 },
  { key: 'market_commentary', label: 'Market Commentary', included: false, required: false, order: 14 },
  { key: 'alternatives', label: 'Alternative Investment Overview', included: false, required: false, order: 15 },
  { key: 'esg', label: 'ESG / Values Analysis', included: false, required: false, order: 16 },
  { key: 'retirement_projection', label: 'Retirement Income Projection', included: false, required: false, order: 17 },
  { key: 'estate_summary', label: 'Estate Planning Summary', included: false, required: false, order: 18 },
];

/**
 * Risk questionnaire questions for the behavioral dimension of the risk profile.
 * Each question contributes a weighted score to the overall behavioral risk score.
 *
 * Question types:
 * - SLIDER: Continuous scale input
 * - SINGLE_CHOICE: Select one from discrete options
 * - VISUAL_CHART: Chart-based preference selection
 * - INTERACTIVE_BAR: Drag-based allocation exercise
 * - GAMBLE: Lottery/gamble preference elicitation
 */
export const RISK_QUESTIONS: Array<{
  /** Unique question identifier. */
  id: string;
  /** Question text displayed to the client. */
  text: string;
  /** Input type determining the UI component. */
  type: 'SLIDER' | 'SINGLE_CHOICE' | 'VISUAL_CHART' | 'INTERACTIVE_BAR' | 'GAMBLE';
  /** Available options for choice-based questions. */
  options?: Array<{
    /** Option value stored in the response. */
    value: string | number;
    /** Display label for the option. */
    label: string;
    /** Score contribution if this option is selected (normalized 1-100). */
    score: number;
  }>;
  /** Minimum possible score for this question. */
  minScore: number;
  /** Maximum possible score for this question. */
  maxScore: number;
  /** Weight of this question in the composite behavioral score (sums to 1.0). */
  weight: number;
}> = [
  {
    id: 'Q1_LOSS_TOLERANCE',
    text: 'Imagine your portfolio lost 20% of its value in a single month. What would you most likely do?',
    type: 'SLIDER',
    options: [
      { value: 1, label: 'Sell everything immediately', score: 10 },
      { value: 2, label: 'Sell some to reduce risk', score: 30 },
      { value: 3, label: 'Hold and wait for recovery', score: 60 },
      { value: 4, label: 'Buy more at lower prices', score: 90 },
    ],
    minScore: 10,
    maxScore: 90,
    weight: 0.20,
  },
  {
    id: 'Q2_TIME_HORIZON',
    text: 'When do you expect to need a significant portion (more than 25%) of this investment?',
    type: 'SINGLE_CHOICE',
    options: [
      { value: 'LESS_THAN_3', label: 'Less than 3 years', score: 10 },
      { value: '3_TO_5', label: '3 to 5 years', score: 30 },
      { value: '5_TO_10', label: '5 to 10 years', score: 55 },
      { value: '10_TO_20', label: '10 to 20 years', score: 75 },
      { value: 'MORE_THAN_20', label: 'More than 20 years', score: 95 },
    ],
    minScore: 10,
    maxScore: 95,
    weight: 0.15,
  },
  {
    id: 'Q3_INCOME_STABILITY',
    text: 'How would you describe your current and expected future income?',
    type: 'SINGLE_CHOICE',
    options: [
      { value: 'UNSTABLE', label: 'Highly variable or uncertain', score: 15 },
      { value: 'SOMEWHAT_STABLE', label: 'Somewhat stable with some variability', score: 40 },
      { value: 'STABLE', label: 'Stable and predictable', score: 65 },
      { value: 'VERY_STABLE', label: 'Very stable with growth potential', score: 85 },
      { value: 'RETIRED_SECURE', label: 'Retired with secure income sources', score: 50 },
    ],
    minScore: 15,
    maxScore: 85,
    weight: 0.10,
  },
  {
    id: 'Q4_VOLATILITY_COMFORT',
    text: 'Which portfolio path would you be most comfortable with over the next 5 years?',
    type: 'VISUAL_CHART',
    options: [
      { value: 'A', label: 'Steady low growth (3-5% avg, minimal swings)', score: 15 },
      { value: 'B', label: 'Moderate growth (5-7% avg, some swings)', score: 40 },
      { value: 'C', label: 'Strong growth (7-9% avg, notable swings)', score: 65 },
      { value: 'D', label: 'High growth (9-12% avg, significant swings)', score: 90 },
    ],
    minScore: 15,
    maxScore: 90,
    weight: 0.20,
  },
  {
    id: 'Q5_GROWTH_VS_STABILITY',
    text: 'Drag the slider to show your preference between protecting your wealth and growing it.',
    type: 'INTERACTIVE_BAR',
    minScore: 1,
    maxScore: 100,
    weight: 0.10,
  },
  {
    id: 'Q6_PRIORITY',
    text: 'What is your primary investment priority?',
    type: 'SINGLE_CHOICE',
    options: [
      { value: 'PRESERVE', label: 'Preserving capital -- I cannot afford losses', score: 10 },
      { value: 'INCOME', label: 'Generating steady income', score: 30 },
      { value: 'BALANCED', label: 'Balanced growth and income', score: 55 },
      { value: 'GROWTH', label: 'Long-term capital growth', score: 75 },
      { value: 'AGGRESSIVE_GROWTH', label: 'Maximum growth -- I can tolerate large swings', score: 95 },
    ],
    minScore: 10,
    maxScore: 95,
    weight: 0.10,
  },
  {
    id: 'Q7_PRIOR_BEHAVIOR',
    text: 'During the last major market downturn you experienced, what did you actually do?',
    type: 'SINGLE_CHOICE',
    options: [
      { value: 'SOLD_ALL', label: 'Sold all or most investments', score: 10 },
      { value: 'SOLD_SOME', label: 'Sold some investments', score: 30 },
      { value: 'HELD', label: 'Held steady and did nothing', score: 55 },
      { value: 'BOUGHT_SOME', label: 'Bought some more investments', score: 75 },
      { value: 'BOUGHT_AGGRESSIVELY', label: 'Significantly increased my investments', score: 95 },
      { value: 'NO_EXPERIENCE', label: 'I have not experienced a major downturn', score: 50 },
    ],
    minScore: 10,
    maxScore: 95,
    weight: 0.10,
  },
  {
    id: 'Q8_LOSS_AVERSION',
    text: 'You are offered a gamble: a 50% chance to gain $X or a 50% chance to lose $Y. What is the minimum gain that would make you accept the gamble if the potential loss is $1,000?',
    type: 'GAMBLE',
    options: [
      { value: 3000, label: '$3,000 (need 3x the potential loss)', score: 15 },
      { value: 2500, label: '$2,500 (need 2.5x the potential loss)', score: 30 },
      { value: 2000, label: '$2,000 (need 2x the potential loss)', score: 50 },
      { value: 1500, label: '$1,500 (need 1.5x the potential loss)', score: 70 },
      { value: 1000, label: '$1,000 (equal to the potential loss)', score: 90 },
    ],
    minScore: 15,
    maxScore: 90,
    weight: 0.05,
  },
];

/**
 * Financial institutions supported for OCR statement scanning and custodian data pulls.
 * Includes major wirehouses, RIA custodians, insurance companies, and fintech platforms.
 */
export const SUPPORTED_INSTITUTIONS: string[] = [
  'Schwab',
  'Fidelity',
  'Vanguard',
  'TD Ameritrade',
  'Merrill Lynch',
  'Morgan Stanley',
  'UBS',
  'Wells Fargo Advisors',
  'Edward Jones',
  'Raymond James',
  'Pershing',
  'LPL Financial',
  'Ameriprise',
  'JP Morgan',
  'Goldman Sachs',
  'TIAA',
  'Transamerica',
  'Principal',
  'Empower',
  'John Hancock',
  'Lincoln Financial',
  'Mass Mutual',
  'New York Life',
  'Northwestern Mutual',
  'Interactive Brokers',
  'Robinhood',
  'Betterment',
  'Wealthfront',
  'Stash',
  'Acorns',
  'M1 Finance',
  'E*TRADE',
  'Ally Invest',
  'First Clearing',
  'National Financial Services',
];

// =====================================================================
// Helper Functions
// =====================================================================

/**
 * Format a MoneyCents value as a US dollar currency string.
 *
 * @param value - Monetary value in cents
 * @returns Formatted string (e.g., "$1,234.56", "-$500.00")
 *
 * @example
 * ```ts
 * formatCurrency(cents(1234.56)); // "$1,234.56"
 * formatCurrency(cents(-500));    // "-$500.00"
 * formatCurrency(cents(0));       // "$0.00"
 * ```
 */
export function formatCurrency(value: MoneyCents): string {
  const dollars = (value as number) / 100;
  const isNegative = dollars < 0;
  const formatted = Math.abs(dollars).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return isNegative ? `-$${formatted}` : `$${formatted}`;
}

/**
 * Format a decimal value as a percentage string.
 *
 * @param decimal - Decimal value (e.g., 0.0825 for 8.25%)
 * @param decimals - Number of decimal places to display (default: 2)
 * @returns Formatted string (e.g., "8.25%")
 *
 * @example
 * ```ts
 * formatPct(0.0825);    // "8.25%"
 * formatPct(0.5, 0);    // "50%"
 * formatPct(-0.032, 1); // "-3.2%"
 * ```
 */
export function formatPct(decimal: number, decimals: number = 2): string {
  return `${(decimal * 100).toFixed(decimals)}%`;
}

/**
 * Format a MoneyCents value as a compact dollar string (K, M, B).
 * Useful for dashboard displays and chart labels.
 *
 * @param value - Monetary value in cents
 * @returns Compact formatted string (e.g., "$1.2M", "$500K", "$2.5B")
 *
 * @example
 * ```ts
 * formatCompact(cents(1_234_567)); // "$1.2M"
 * formatCompact(cents(500_000));   // "$500K"
 * formatCompact(cents(2_500_000_000)); // "$2.5B"
 * formatCompact(cents(999));       // "$999"
 * ```
 */
export function formatCompact(value: MoneyCents): string {
  const dollars = Math.abs((value as number) / 100);
  const sign = (value as number) < 0 ? '-' : '';

  if (dollars >= 1_000_000_000) {
    return `${sign}$${(dollars / 1_000_000_000).toFixed(1)}B`;
  }
  if (dollars >= 1_000_000) {
    return `${sign}$${(dollars / 1_000_000).toFixed(1)}M`;
  }
  if (dollars >= 1_000) {
    return `${sign}$${(dollars / 1_000).toFixed(0)}K`;
  }
  return `${sign}$${dollars.toFixed(0)}`;
}

/**
 * Map a numeric composite risk score (1-100) to a categorical risk label.
 *
 * Score ranges:
 * -  1-20: CONSERVATIVE
 * - 21-40: MODERATELY_CONSERVATIVE
 * - 41-60: MODERATE
 * - 61-80: MODERATELY_AGGRESSIVE
 * - 81-100: AGGRESSIVE
 *
 * @param score - Composite risk score (1-100)
 * @returns The corresponding risk label
 * @throws {Error} If the score is outside the valid 1-100 range
 *
 * @example
 * ```ts
 * riskScoreToLabel(25); // 'MODERATELY_CONSERVATIVE'
 * riskScoreToLabel(72); // 'MODERATELY_AGGRESSIVE'
 * ```
 */
export function riskScoreToLabel(score: number): RiskLabel {
  if (score < 1 || score > 100) {
    throw new Error(`Risk score must be between 1 and 100, received: ${score}`);
  }
  if (score <= 20) return 'CONSERVATIVE';
  if (score <= 40) return 'MODERATELY_CONSERVATIVE';
  if (score <= 60) return 'MODERATE';
  if (score <= 80) return 'MODERATELY_AGGRESSIVE';
  return 'AGGRESSIVE';
}

/**
 * Derive a recommended strategic asset allocation from a composite risk score.
 *
 * Uses a linear interpolation model:
 * - Score 1 (most conservative): 20% equity, 60% fixed income, 5% alternatives, 15% cash
 * - Score 100 (most aggressive): 90% equity, 5% fixed income, 5% alternatives, 0% cash
 *
 * Allocations always sum to 100.
 *
 * @param score - Composite risk score (1-100)
 * @returns Object with equity, fixedIncome, alternatives, and cash percentages (0-100)
 * @throws {Error} If the score is outside the valid 1-100 range
 *
 * @example
 * ```ts
 * riskScoreToAllocation(50);
 * // { equity: 55, fixedIncome: 33, alternatives: 5, cash: 7 }
 * ```
 */
export function riskScoreToAllocation(score: number): {
  equity: number;
  fixedIncome: number;
  alternatives: number;
  cash: number;
} {
  if (score < 1 || score > 100) {
    throw new Error(`Risk score must be between 1 and 100, received: ${score}`);
  }

  // Normalized position in the 1-100 range (0 = most conservative, 1 = most aggressive)
  const t = (score - 1) / 99;

  // Linear interpolation between conservative and aggressive allocations
  const equity = Math.round(20 + t * 70);         // 20% -> 90%
  const fixedIncome = Math.round(60 - t * 55);     // 60% -> 5%
  const alternatives = 5;                           // constant 5%
  const cash = 100 - equity - fixedIncome - alternatives; // remainder

  return { equity, fixedIncome, alternatives, cash };
}
