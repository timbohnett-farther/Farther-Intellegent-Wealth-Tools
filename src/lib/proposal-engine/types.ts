/**
 * Farther Portfolio Proposal Engine -- Stage 1 Canonical Data Model
 *
 * This file defines every core type used across the proposal engine.
 * All monetary values are stored as signed 64-bit-safe integers in cents.
 * All IDs are UUID v4 strings.
 *
 * @module proposal-engine/types
 */

// =====================================================================
// Re-export common branded types from the tax-planning module
// =====================================================================

export type { MoneyCents } from '../tax-planning/types';
export { cents, toDollars } from '../tax-planning/types';

// =====================================================================
// Enums / Union Types
// =====================================================================

/** Risk tolerance label derived from composite score. */
export type RiskLabel =
  | 'CONSERVATIVE'
  | 'MODERATELY_CONSERVATIVE'
  | 'MODERATE'
  | 'MODERATELY_AGGRESSIVE'
  | 'AGGRESSIVE';

/** Severity level for portfolio quality flags. */
export type FlagSeverity = 'HIGH' | 'MEDIUM' | 'LOW' | 'OPPORTUNITY';

/** Category of a portfolio quality flag. */
export type FlagCategory =
  | 'CONCENTRATION'
  | 'EXPENSE'
  | 'DIVERSIFICATION'
  | 'ALLOCATION'
  | 'TAX'
  | 'OVERLAP';

/** Asset class taxonomy for portfolio categorization. */
export type AssetClass =
  | 'EQUITY_US_LARGE'
  | 'EQUITY_US_MID'
  | 'EQUITY_US_SMALL'
  | 'EQUITY_INTL_DEVELOPED'
  | 'EQUITY_INTL_EMERGING'
  | 'FIXED_INCOME_GOVT'
  | 'FIXED_INCOME_CORP'
  | 'FIXED_INCOME_MUNI'
  | 'FIXED_INCOME_TIPS'
  | 'ALTERNATIVES_REAL_ESTATE'
  | 'ALTERNATIVES_COMMODITIES'
  | 'ALTERNATIVES_OTHER'
  | 'CASH';

/** Broad asset class for simplified allocation views. */
export type BroadAssetClass =
  | 'EQUITY'
  | 'FIXED_INCOME'
  | 'ALTERNATIVES'
  | 'CASH';

/** Tax lot holding period for capital gains treatment. */
export type HoldingPeriod = 'SHORT_TERM' | 'LONG_TERM';

/** Account type for tax treatment. */
export type AccountType =
  | 'TAXABLE'
  | 'TRADITIONAL_IRA'
  | 'ROTH_IRA'
  | 'TRADITIONAL_401K'
  | 'ROTH_401K'
  | 'SEP_IRA'
  | 'TRUST'
  | 'OTHER';

/** Lifecycle status of a proposal. */
export type ProposalStatus =
  | 'DRAFT'
  | 'REVIEW'
  | 'APPROVED'
  | 'SENT'
  | 'VIEWED'
  | 'ACCEPTED'
  | 'DECLINED'
  | 'EXPIRED';

/** Tax efficiency classification of an investment model. */
export type TaxEfficiency = 'HIGH' | 'MEDIUM' | 'LOW';

/** Category of investment model. */
export type ModelCategory =
  | 'CORE'
  | 'TAX_EFFICIENT'
  | 'ESG'
  | 'INCOME'
  | 'SECTOR'
  | 'CUSTOM';

/** Stress test scenario identifier. */
export type StressScenario =
  | 'GFC_2008'
  | 'COVID_2020'
  | 'RATE_SHOCK_2022'
  | 'DOTCOM_2000'
  | 'RECESSION_MILD'
  | 'EQUITY_BEAR_50';

/** Transition strategy identifier. */
export type TransitionStrategy =
  | 'FULL_LIQUIDATION'
  | 'PHASED_3_YEAR'
  | 'HARVEST_FIRST'
  | 'DIRECT_INDEXING'
  | 'HOLD_IN_PLACE';

// =====================================================================
// Risk Profile Types
// =====================================================================

/** A single questionnaire response from a client. */
export interface QuestionnaireResponse {
  /** Unique question identifier. */
  questionId: string;
  /** Numeric score for the response (1-100). */
  score: number;
  /** Weight of this question in the behavioral score. */
  weight: number;
  /** Raw text of the selected answer. */
  answerText?: string;
}

/** Farther's proprietary 3-dimensional risk profile. */
export interface FartherRiskProfile {
  /** Overall composite risk score (1-100). */
  compositeScore: number;
  /** Risk tolerance label. */
  riskLabel: RiskLabel;

  /** Behavioral/attitudinal risk score from questionnaire (1-100). */
  behavioralScore: number;
  /** Behavioral risk label. */
  behavioralLabel: RiskLabel;

  /** Financial capacity risk score (1-100). */
  capacityScore: number;
  /** Capacity contributing factors. */
  capacityFactors: {
    timeHorizon: number;
    incomeStability: number;
    liquidityRatio: number;
    debtRatio: number;
    humanCapitalValue: number;
  };

  /** Required return risk score (1-100). */
  requiredReturnScore: number;
  /** Annualized return needed to fund goals. */
  requiredReturn: number;
  /** Ratio of current savings to goal funding needed. */
  fundingRatio: number;

  /** Recommended target allocation. */
  recommendedAllocation: {
    equity: number;
    fixedIncome: number;
    alternatives: number;
    cash: number;
  };
}

// =====================================================================
// Holdings & Portfolio Types
// =====================================================================

/** A single holding in a portfolio. */
export interface Holding {
  /** Unique holding identifier. */
  holdingId: string;
  /** Security ticker symbol. */
  ticker: string;
  /** Security display name. */
  name: string;
  /** CUSIP for the security. */
  cusip?: string;
  /** Asset class classification. */
  assetClass: AssetClass;
  /** Broad asset class for simplified views. */
  broadAssetClass: BroadAssetClass;
  /** Current market value in cents. */
  marketValue: number;
  /** Cost basis in cents. */
  costBasis?: number;
  /** Number of shares held. */
  shares: number;
  /** Current price per share in dollars. */
  price: number;
  /** Annual expense ratio (decimal, e.g. 0.0003 for 0.03%). */
  expenseRatio: number;
  /** Dividend yield (decimal). */
  dividendYield?: number;
  /** Holding period for tax treatment. */
  holdingPeriod?: HoldingPeriod;
  /** Account type this holding is in. */
  accountType?: AccountType;
  /** Whether this is a single stock (not ETF/fund). */
  isSingleStock?: boolean;
  /** Weight in portfolio (0-1). */
  weight?: number;
}

/** Portfolio-level metrics computed from holdings. */
export interface PortfolioMetrics {
  /** Total market value in cents. */
  totalValue: number;
  /** Weighted average expense ratio. */
  weightedExpenseRatio: number;
  /** Total unrealized gain in cents. */
  totalUnrealizedGain: number;
  /** Total unrealized loss in cents. */
  totalUnrealizedLoss: number;
  /** Number of holdings. */
  holdingCount: number;
  /** Equity allocation percentage (0-100). */
  equityPct: number;
  /** Fixed income allocation percentage (0-100). */
  fixedIncomePct: number;
  /** Alternatives allocation percentage (0-100). */
  alternativesPct: number;
  /** Cash allocation percentage (0-100). */
  cashPct: number;
  /** US equity allocation percentage (0-100). */
  usEquityPct: number;
  /** International equity allocation percentage (0-100). */
  intlEquityPct: number;
  /** Weighted average dividend yield. */
  weightedDividendYield: number;
  /** Top 10 holdings by weight. */
  topHoldings: Array<{ ticker: string; name: string; weight: number }>;
}

/** A portfolio quality flag. */
export interface QualityFlag {
  /** Unique flag identifier. */
  flagId: string;
  /** Severity of the flag. */
  severity: FlagSeverity;
  /** Category of the flag. */
  category: FlagCategory;
  /** Human-readable title. */
  title: string;
  /** Detailed description. */
  description: string;
  /** Affected holding tickers, if applicable. */
  affectedTickers?: string[];
  /** Potential action to resolve. */
  recommendation?: string;
}

/** Result of a single stress test scenario. */
export interface StressTestResult {
  /** Scenario identifier. */
  scenario: StressScenario;
  /** Human-readable scenario name. */
  scenarioName: string;
  /** Portfolio value before stress (cents). */
  portfolioValueBefore: number;
  /** Portfolio value after stress (cents). */
  portfolioValueAfter: number;
  /** Dollar change (cents). */
  dollarChange: number;
  /** Percentage change. */
  percentChange: number;
  /** Per-holding impact breakdown. */
  holdingImpacts: Array<{
    ticker: string;
    assetClass: AssetClass;
    valueBefore: number;
    valueAfter: number;
    change: number;
    percentChange: number;
  }>;
}

/** Full portfolio analytics bundle. */
export interface PortfolioAnalytics {
  /** Portfolio-level metrics. */
  metrics: PortfolioMetrics;
  /** Quality flags. */
  qualityFlags: QualityFlag[];
  /** Stress test results for all scenarios. */
  stressTests: StressTestResult[];
}

// =====================================================================
// Fee Analysis Types
// =====================================================================

/** Fee breakdown for a portfolio. */
export interface FeeBreakdown {
  /** Advisory fee rate (decimal). */
  advisoryRate: number;
  /** Advisory fee amount in cents. */
  advisoryAmount: number;
  /** Weighted fund expense ratio (decimal). */
  fundExpenseRatio: number;
  /** Fund expense amount in cents. */
  fundExpenseAmount: number;
  /** Transaction costs rate (decimal). */
  transactionRate: number;
  /** Transaction cost amount in cents. */
  transactionAmount: number;
  /** Total all-in fee rate (decimal). */
  totalRate: number;
  /** Total all-in fee amount in cents. */
  totalAmount: number;
}

/** Year-by-year compounding projection. */
export interface FeeProjectionYear {
  /** Year number (1, 5, 10, etc.). */
  year: number;
  /** Portfolio value under current fees (cents). */
  currentFeeValue: number;
  /** Portfolio value under proposed fees (cents). */
  proposedFeeValue: number;
  /** Cumulative fee savings in cents. */
  cumulativeSavings: number;
  /** Compounded additional wealth from fee savings (cents). */
  compoundedSavings: number;
}

/** Complete fee analysis comparing current vs proposed. */
export interface FeeAnalysis {
  /** Current portfolio fee breakdown. */
  currentFees: FeeBreakdown;
  /** Proposed portfolio fee breakdown. */
  proposedFees: FeeBreakdown;
  /** Annual fee savings in cents. */
  annualSavings: number;
  /** Annual savings as a percentage of portfolio. */
  annualSavingsRate: number;
  /** Multi-year projection of fee impact. */
  projections: FeeProjectionYear[];
  /** 10-year compounded savings (cents). */
  tenYearCompoundedSavings: number;
  /** 30-year compounded savings (cents). */
  thirtyYearCompoundedSavings: number;
}

// =====================================================================
// Tax Transition Types
// =====================================================================

/** Result of a single transition strategy analysis. */
export interface TransitionStrategyResult {
  /** Strategy identifier. */
  strategy: TransitionStrategy;
  /** Human-readable strategy name. */
  strategyName: string;
  /** Estimated total tax cost in cents. */
  estimatedTaxCost: number;
  /** Short-term gains realized in cents. */
  shortTermGains: number;
  /** Long-term gains realized in cents. */
  longTermGains: number;
  /** Losses harvested in cents. */
  lossesHarvested: number;
  /** Net gains after loss offset in cents. */
  netGains: number;
  /** Time to complete transition (months). */
  timeToComplete: number;
  /** Estimated annual tax alpha (for direct indexing). */
  estimatedTaxAlpha?: number;
  /** Year-by-year breakdown for phased strategies. */
  yearlyBreakdown?: Array<{
    year: number;
    gainsRealized: number;
    taxCost: number;
    bracketHeadroomUsed: number;
  }>;
  /** Per-holding transition actions. */
  holdingActions: Array<{
    ticker: string;
    action: 'SELL' | 'HOLD' | 'PARTIAL_SELL' | 'TAX_LOSS_HARVEST';
    shares?: number;
    gainLoss: number;
    taxCost: number;
  }>;
  /** Strategy pros. */
  pros: string[];
  /** Strategy cons. */
  cons: string[];
}

/** Complete tax transition analysis. */
export interface TaxTransitionAnalysis {
  /** All strategy results. */
  strategies: TransitionStrategyResult[];
  /** Recommended strategy identifier. */
  recommendedStrategy: TransitionStrategy;
  /** Reason for recommendation. */
  recommendationReason: string;
  /** Total unrealized gains in current portfolio (cents). */
  totalUnrealizedGains: number;
  /** Total unrealized losses in current portfolio (cents). */
  totalUnrealizedLosses: number;
  /** Net unrealized gain/loss (cents). */
  netUnrealized: number;
  /** Combined tax rate used for calculations. */
  effectiveTaxRate: number;
}

// =====================================================================
// Investment Model Types
// =====================================================================

/** A single allocation within an investment model. */
export interface ModelAllocation {
  /** ETF/fund ticker. */
  ticker: string;
  /** Security display name. */
  name: string;
  /** Asset class. */
  assetClass: AssetClass;
  /** Broad asset class. */
  broadAssetClass: BroadAssetClass;
  /** Target weight in model (0-1). */
  targetWeight: number;
  /** Expense ratio of the fund (decimal). */
  expenseRatio: number;
}

/** An investment model template. */
export interface InvestmentModel {
  /** Unique model identifier. */
  modelId: string;
  /** Model display name. */
  name: string;
  /** Model description. */
  description: string;
  /** Model category. */
  category: ModelCategory;
  /** Target risk score (1-100). */
  riskScore: number;
  /** Risk label. */
  riskLabel: RiskLabel;
  /** Tax efficiency rating. */
  taxEfficiency: TaxEfficiency;
  /** Target allocations. */
  allocations: ModelAllocation[];
  /** Target broad allocation percentages. */
  targetAllocation: {
    equity: number;
    fixedIncome: number;
    alternatives: number;
    cash: number;
  };
  /** Weighted average expense ratio. */
  weightedExpenseRatio: number;
  /** Historical annualized return (backtest). */
  historicalReturn?: number;
  /** Historical annualized volatility (backtest). */
  historicalVolatility?: number;
  /** Historical max drawdown (backtest). */
  historicalMaxDrawdown?: number;
  /** Firm that owns this model (null = platform default). */
  firmId?: string;
  /** Whether this model is active. */
  isActive: boolean;
  /** ISO 8601 creation timestamp. */
  createdAt: string;
  /** ISO 8601 last update timestamp. */
  updatedAt: string;
}

// =====================================================================
// Proposal Types
// =====================================================================

/** Tracking event type for proposal engagement. */
export type TrackingEventType =
  | 'EMAIL_OPENED'
  | 'LINK_CLICKED'
  | 'PROPOSAL_VIEWED'
  | 'PROPOSAL_DOWNLOADED'
  | 'PROPOSAL_ACCEPTED'
  | 'PROPOSAL_DECLINED';

/** A single tracking event. */
export interface TrackingEvent {
  /** Unique event identifier. */
  eventId: string;
  /** Type of tracking event. */
  eventType: TrackingEventType;
  /** ISO 8601 timestamp of the event. */
  timestamp: string;
  /** IP address of the viewer. */
  ipAddress?: string;
  /** User agent string. */
  userAgent?: string;
  /** Additional metadata. */
  metadata?: Record<string, unknown>;
}

/** A recipient of a proposal. */
export interface ProposalRecipient {
  /** Recipient email address. */
  email: string;
  /** Recipient display name. */
  name: string;
  /** Role of the recipient. */
  role: 'PRIMARY' | 'SPOUSE' | 'TRUSTEE' | 'OTHER';
}

/** Tracking record for a sent proposal. */
export interface ProposalTracking {
  /** Unique tracking identifier. */
  trackingId: string;
  /** ID of the proposal being tracked. */
  proposalId: string;
  /** When the proposal was sent. */
  sentAt: string;
  /** Who it was sent to. */
  recipients: ProposalRecipient[];
  /** Individual tracking events. */
  events: TrackingEvent[];
  /** Current outcome status. */
  outcome: 'PENDING' | 'VIEWED' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED';
  /** When the outcome was last updated. */
  outcomeUpdatedAt: string;
  /** Unique link for the recipient to view the proposal. */
  viewLink: string;
  /** Expiration date for the proposal link. */
  expiresAt: string;
}

/** A complete portfolio proposal. */
export interface Proposal {
  /** Unique proposal identifier. */
  proposalId: string;
  /** Firm that owns this proposal. */
  firmId: string;
  /** Household this proposal is for. */
  householdId: string;
  /** Advisor who created the proposal. */
  advisorId: string;
  /** Client display name. */
  clientName: string;
  /** Client email address. */
  clientEmail?: string;
  /** Proposal title. */
  title: string;
  /** Proposal type. */
  type: ProposalType;
  /** Current status. */
  status: ProposalStatus;
  /** Current wizard step (1-6). */
  wizardStep: number;
  /** Client's risk profile. */
  riskProfile?: FartherRiskProfile;
  /** Current portfolio holdings. */
  currentHoldings: Holding[];
  /** Proposed portfolio holdings. */
  proposedHoldings: Holding[];
  /** Selected investment model ID. */
  selectedModelId?: string;
  /** Portfolio analytics comparison. */
  analytics?: {
    current: PortfolioAnalytics;
    proposed: PortfolioAnalytics;
  };
  /** Fee analysis. */
  feeAnalysis?: FeeAnalysis;
  /** Tax transition analysis. */
  taxTransition?: TaxTransitionAnalysis;
  /** Statement scan results. */
  scanResults?: StatementScanResult[];
  /** Tracking data if sent. */
  tracking?: ProposalTracking;
  /** Advisor notes. */
  notes?: string;
  /** When the proposal was sent to the client. */
  sentAt?: string;
  /** When the client first viewed the proposal. */
  viewedAt?: string;
  /** When the client accepted/declined. */
  respondedAt?: string;
  /** Total current portfolio value in cents. */
  currentPortfolioValue: number;
  /** Total proposed portfolio value in cents. */
  proposedPortfolioValue: number;
  /** ISO 8601 creation timestamp. */
  createdAt: string;
  /** ISO 8601 last update timestamp. */
  updatedAt: string;
}

// =====================================================================
// Proposal Creation & Dashboard Types
// =====================================================================

/** Proposal type for the creation wizard. */
export type ProposalType =
  | 'INITIAL_PROPOSAL'
  | 'REBALANCE'
  | 'TAX_LOSS_HARVEST'
  | 'RETIREMENT_TRANSITION'
  | 'CONSOLIDATION'
  | 'RISK_ADJUSTMENT'
  | 'CUSTOM';

/** Relationship tier for a client. */
export type RelationshipTier =
  | 'STANDARD'
  | 'PREMIUM'
  | 'PRIVATE_CLIENT'
  | 'INSTITUTIONAL';

// =====================================================================
// API Request Types
// =====================================================================

/** Standard error envelope returned by all API endpoints on failure. */
export interface ErrorEnvelope {
  error: {
    /** Machine-readable error code. */
    code: string;
    /** Human-readable error description. */
    message: string;
    /** Additional structured error details. */
    details: Record<string, unknown>;
    /** Unique correlation ID for log tracing. */
    correlationId: string;
  };
}

/** Request payload for creating a new proposal. */
export interface CreateProposalRequest {
  clientName: string;
  clientEmail?: string;
  householdId: string;
  type: ProposalType;
  title: string;
  notes?: string;
}

/** Request body for updating a proposal. */
export interface UpdateProposalRequest {
  /** Update wizard step progress. */
  wizardStep?: number;
  /** Update status. */
  status?: ProposalStatus;
  /** Update title. */
  title?: string;
  /** Update notes. */
  notes?: string;
  /** Update client name. */
  clientName?: string;
  /** Update client email. */
  clientEmail?: string;
  /** Set selected model ID. */
  selectedModelId?: string;
  /** Update current holdings (after manual edits). */
  currentHoldings?: Holding[];
}

/** Request body for scanning a statement. */
export interface ScanStatementRequest {
  /** Original filename of the uploaded statement. */
  filename: string;
  /** MIME type of the file. */
  mimeType?: string;
  /** Base64-encoded file content (Stage 1: not actually processed). */
  fileContent?: string;
}

/** Request body for submitting risk questionnaire responses. */
export interface RiskAssessmentRequest {
  /** Array of questionnaire responses. */
  responses: QuestionnaireResponse[];
  /** Client's investment time horizon in years. */
  timeHorizon: number;
  /** Client's annual income. */
  annualIncome?: number;
  /** Client's total net worth. */
  netWorth?: number;
  /** Client's liquid net worth. */
  liquidNetWorth?: number;
  /** Client's goal funding target. */
  goalTarget?: number;
  /** Client's current savings rate (annual). */
  currentSavingsRate?: number;
}

/** Request body for computing analytics. */
export interface ComputeAnalyticsRequest {
  /** Current portfolio holdings to analyze. */
  currentHoldings: Holding[];
  /** Selected model ID for proposed portfolio. */
  proposedModelId: string;
  /** Total portfolio value for the proposed allocation. */
  proposedValue: number;
  /** Client's marginal tax rate (0-1). */
  marginalTaxRate?: number;
  /** State tax rate (0-1). */
  stateTaxRate?: number;
}

/** Request body for sending a proposal. */
export interface SendProposalRequest {
  /** Recipients to send the proposal to. */
  recipients: ProposalRecipient[];
  /** Optional personal message to include. */
  message?: string;
  /** Expiration days for the proposal link (default 30). */
  expirationDays?: number;
}

/** Request body for recording a tracking event. */
export interface RecordTrackingEventRequest {
  /** Type of tracking event. */
  eventType: TrackingEventType;
  /** Additional metadata. */
  metadata?: Record<string, unknown>;
}

/** Result from an OCR statement scan. */
export interface StatementScanResult {
  /** Unique scan result identifier. */
  scanId: string;
  /** Original file name. */
  fileName: string;
  /** Account number extracted from statement. */
  accountNumber?: string;
  /** Custodian name extracted. */
  custodian?: string;
  /** Account type inferred. */
  accountType?: AccountType;
  /** Statement date. */
  statementDate?: string;
  /** OCR confidence score (0-100). */
  confidence: number;
  /** Holdings extracted from this statement. */
  holdings: Holding[];
  /** Fields flagged for review. */
  flaggedFields: string[];
  /** Processing status. */
  status: 'PROCESSING' | 'COMPLETE' | 'ERROR';
  /** Error message if failed. */
  error?: string;
}

/** Current portfolio for the portfolio summary view. */
export interface CurrentPortfolio {
  /** All accounts. */
  accounts: Array<{
    accountId: string;
    accountName: string;
    accountType: AccountType;
    custodian: string;
    holdings: Holding[];
    totalValue: number;
  }>;
  /** Consolidated portfolio metrics. */
  metrics: PortfolioMetrics;
  /** Quality flags across the portfolio. */
  qualityFlags: QualityFlag[];
}

/** Proposal section for the section builder. */
export interface ProposalSection {
  /** Unique section key. */
  key: string;
  /** Display title. */
  title: string;
  /** Whether this section is required. */
  required: boolean;
  /** Whether to include this section. */
  included: boolean;
  /** Sort order. */
  order: number;
}

/** Summary item for the proposal dashboard list. */
export interface ProposalListItem {
  proposalId: string;
  firmId: string;
  advisorId: string;
  clientName: string;
  type: ProposalType;
  status: ProposalStatus;
  wizardStep: number;
  title: string;
  currentPortfolioValue: number;
  createdAt: string;
  updatedAt: string;
}

/** Dashboard-level statistics. */
export interface ProposalDashboardStats {
  totalProposals: number;
  drafts: number;
  inReview: number;
  sent: number;
  viewed: number;
  accepted: number;
  declined: number;
  totalProposalAUM: number;
  averageProposalValue: number;
  acceptanceRate: number;
}
