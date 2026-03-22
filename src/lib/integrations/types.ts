/**
 * Farther Prism — Integration Types
 *
 * Shared type definitions for all external integrations:
 * custodian data sync, HubSpot CRM sync, and market data providers.
 *
 * These types are self-contained and do not depend on React, Next.js, or Prisma.
 */

// ==================== INTEGRATION STATUS ====================

/** Connection status for any external integration. */
export type IntegrationConnectionState =
  | 'connected'
  | 'disconnected'
  | 'error'
  | 'syncing';

/** Describes the current state of an external integration. */
export interface IntegrationStatus {
  /** Current connection state. */
  state: IntegrationConnectionState;
  /** ISO-8601 timestamp of the last successful sync, or null if never synced. */
  lastSync: string | null;
  /** Human-readable error message when state is 'error'. */
  errorMessage: string | null;
  /** Error code for programmatic handling (e.g. 'AUTH_EXPIRED'). */
  errorCode: string | null;
}

// ==================== CUSTODIAN TYPES ====================

/** Represents a single balance change detected during a custodian sync. */
export interface BalanceChange {
  /** Internal or custodian account identifier. */
  accountId: string;
  /** Balance before the sync. */
  previousBalance: number;
  /** Balance after the sync. */
  newBalance: number;
  /** Absolute change (newBalance - previousBalance). */
  delta: number;
  /** Percentage change expressed as a decimal (e.g. 0.05 = 5%). */
  deltaPct: number;
}

/** A single holding within a custodian account. */
export interface CustodianHolding {
  /** Ticker symbol or CUSIP. */
  symbol: string;
  /** Human-readable name. */
  name: string;
  /** Number of shares or units. */
  quantity: number;
  /** Current market price per unit. */
  price: number;
  /** Total market value (quantity * price). */
  marketValue: number;
  /** Cost basis for tax-lot purposes. */
  costBasis: number;
  /** Asset class categorization. */
  assetClass: 'equity' | 'fixed_income' | 'cash' | 'alternative' | 'other';
}

/** Represents an account retrieved from a custodian. */
export interface CustodianAccount {
  /** Custodian-assigned account number. */
  accountNumber: string;
  /** Account registration / type string. */
  accountType: string;
  /** Total market value. */
  marketValue: number;
  /** Total cost basis across all holdings. */
  costBasis: number;
  /** Percentage-based asset allocation breakdown. */
  assetAllocation: {
    equity: number;
    fixedIncome: number;
    cash: number;
    alternative: number;
    other: number;
  };
  /** Individual holdings in this account. */
  holdings: CustodianHolding[];
}

/** A transaction record from a custodian. */
export interface CustodianTransaction {
  /** Unique transaction identifier from the custodian. */
  transactionId: string;
  /** Account number this transaction belongs to. */
  accountNumber: string;
  /** ISO-8601 date of the transaction. */
  date: string;
  /** Transaction type. */
  type: 'buy' | 'sell' | 'dividend' | 'interest' | 'transfer_in' | 'transfer_out' | 'fee' | 'other';
  /** Ticker or CUSIP. */
  symbol: string;
  /** Description provided by the custodian. */
  description: string;
  /** Number of shares (if applicable). */
  quantity: number;
  /** Price per share (if applicable). */
  price: number;
  /** Gross amount of the transaction. */
  amount: number;
  /** Net amount after fees. */
  netAmount: number;
}

/**
 * Adapter interface for custodian data retrieval.
 * Each supported custodian implements this interface.
 */
export interface CustodianAdapter {
  /** Human-readable custodian name (e.g. "Charles Schwab"). */
  readonly name: string;

  /** Fetch all accounts associated with the given credentials / connection. */
  fetchAllAccounts(connectionConfig: CustodianConnectionConfig): Promise<CustodianAccount[]>;

  /** Fetch the current balance for a single account. */
  fetchAccountBalance(connectionConfig: CustodianConnectionConfig, accountNumber: string): Promise<number>;

  /** Fetch transactions for a single account within a date range. */
  fetchTransactions(
    connectionConfig: CustodianConnectionConfig,
    accountNumber: string,
    startDate: string,
    endDate: string,
  ): Promise<CustodianTransaction[]>;
}

/** Configuration needed to connect to a specific custodian instance. */
export interface CustodianConnectionConfig {
  /** Which custodian this connection is for. */
  custodian: 'schwab' | 'fidelity' | 'pershing';
  /** API key or OAuth token. */
  apiKey: string;
  /** Optional API secret. */
  apiSecret?: string;
  /** OAuth refresh token (if applicable). */
  refreshToken?: string;
  /** Base URL override for sandbox / testing. */
  baseUrl?: string;
  /** Firm-level identifier at the custodian. */
  firmId?: string;
}

/** Result of a full custodian sync operation. */
export interface CustodianSyncResult {
  /** Number of existing accounts whose data was updated. */
  accountsUpdated: number;
  /** Number of newly discovered accounts. */
  accountsCreated: number;
  /** Per-account balance changes detected during this sync. */
  balanceChanges: BalanceChange[];
  /** Total number of new transactions imported. */
  newTransactions: number;
  /** Error messages encountered during the sync. */
  errors: string[];
  /** ISO-8601 timestamp of when this sync completed. */
  syncedAt: string;
}

// ==================== HUBSPOT CRM TYPES ====================

/** Configuration for connecting to the HubSpot API. */
export interface HubSpotConfig {
  /** HubSpot private app access token. */
  accessToken: string;
  /** HubSpot portal (hub) ID. */
  portalId: string;
  /** Base URL override (defaults to https://api.hubapi.com). */
  baseUrl?: string;
}

/** Result of syncing plan data to HubSpot contacts. */
export interface HubSpotSyncResult {
  /** Number of new contacts created. */
  contactsCreated: number;
  /** Number of existing contacts updated. */
  contactsUpdated: number;
  /** Number of HubSpot tasks created (e.g. from insights). */
  tasksCreated: number;
  /** Error messages encountered during sync. */
  errors: string[];
}

/**
 * Custom HubSpot contact properties for Farther Prism.
 * All properties use the `fp_` prefix to avoid collisions.
 */
export interface HubSpotContactProperties {
  /** Monte Carlo probability of success (0-100). */
  fp_plan_success_rate: number;
  /** Client total net worth. */
  fp_net_worth: number;
  /** Assets under management with Farther. */
  fp_aum: number;
  /** Wealth tier classification. */
  fp_wealth_tier: 'emerging' | 'mass_affluent' | 'hnw' | 'uhnw';
  /** Plan completion score (0-100). */
  fp_plan_completion_score: number;
  /** Current plan status. */
  fp_plan_status: 'draft' | 'active' | 'needs_review' | 'archived';
  /** ISO-8601 date of the last plan update. */
  fp_last_plan_update: string;
  /** ISO-8601 date of the last meeting. */
  fp_last_meeting_date: string;
  /** Client's target retirement year. */
  fp_retirement_year: number;
  /** Number of active financial goals. */
  fp_active_goals: number;
  /** Number of goals that are at risk. */
  fp_at_risk_goals: number;
  /** Primary advisor name. */
  fp_primary_advisor: string;
  /** Total annual income. */
  fp_annual_income: number;
  /** Projected estate value at plan horizon. */
  fp_projected_estate_value: number;
  /** Number of open insights / action items. */
  fp_open_insights: number;
}

/** Subset of plan data needed for HubSpot sync (avoids importing full plan types). */
export interface PlanSyncData {
  /** HubSpot contact ID or email for matching. */
  contactIdentifier: string;
  /** Client first name. */
  firstName: string;
  /** Client last name. */
  lastName: string;
  /** Client email. */
  email: string;
  /** Monte Carlo success rate (0-100). */
  planSuccessRate: number;
  /** Total net worth. */
  netWorth: number;
  /** Assets under management. */
  aum: number;
  /** Wealth tier. */
  wealthTier: 'emerging' | 'mass_affluent' | 'hnw' | 'uhnw';
  /** Plan completion score (0-100). */
  planCompletionScore: number;
  /** Current plan status. */
  planStatus: 'draft' | 'active' | 'needs_review' | 'archived';
  /** ISO-8601 date the plan was last updated. */
  lastPlanUpdate: string;
  /** ISO-8601 date of last client meeting. */
  lastMeetingDate: string;
  /** Target retirement year. */
  retirementYear: number;
  /** Number of active goals. */
  activeGoals: number;
  /** Number of at-risk goals. */
  atRiskGoals: number;
  /** Primary advisor name. */
  primaryAdvisor: string;
  /** Total annual income. */
  annualIncome: number;
  /** Projected estate value. */
  projectedEstateValue: number;
  /** Count of open insights. */
  openInsights: number;
}

/** An insight to sync as a HubSpot task. */
export interface InsightForSync {
  /** Insight title / summary. */
  title: string;
  /** Detailed description. */
  description: string;
  /** Priority level. */
  priority: 'high' | 'medium' | 'low';
  /** Category of insight. */
  category: string;
  /** ISO-8601 due date for the task. */
  dueDate: string;
  /** HubSpot contact ID to associate the task with. */
  contactId: string;
  /** HubSpot owner ID to assign the task to. */
  ownerId: string;
}

// ==================== HUBSPOT WEBHOOK TYPES ====================

/** Raw webhook event payload from HubSpot. */
export interface HubSpotWebhookPayload {
  /** Array of event objects sent by HubSpot. */
  events: HubSpotWebhookEvent[];
}

/** A single event within a HubSpot webhook payload. */
export interface HubSpotWebhookEvent {
  /** Event type (e.g. 'contact.propertyChange', 'deal.propertyChange'). */
  subscriptionType: string;
  /** Object ID in HubSpot. */
  objectId: number;
  /** Property name that changed (if applicable). */
  propertyName?: string;
  /** New property value (if applicable). */
  propertyValue?: string;
  /** Unix timestamp in milliseconds of the event. */
  occurredAt: number;
  /** Event ID for deduplication. */
  eventId: number;
  /** HubSpot portal ID. */
  portalId: number;
}

/** Describes an action to take in response to a HubSpot webhook event. */
export interface WebhookAction {
  /** Type of action to perform. */
  type: 'update_client' | 'create_task' | 'notify_advisor' | 'refresh_plan' | 'log_activity';
  /** Source event type. */
  sourceEvent: string;
  /** HubSpot object ID. */
  objectId: number;
  /** Key-value data relevant to the action. */
  data: Record<string, string | number | boolean>;
  /** ISO-8601 timestamp of the originating event. */
  timestamp: string;
}

// ==================== MARKET DATA TYPES ====================

/** A point-in-time snapshot of key market data indicators. */
export interface MarketDataSnapshot {
  /** ISO-8601 date of the snapshot. */
  date: string;
  /** S&P 500 index price. */
  sp500Price: number;
  /** S&P 500 year-to-date return as a decimal (e.g. 0.12 = 12%). */
  sp500YTDReturn: number;
  /** 10-year US Treasury yield as a decimal. */
  tenYearTreasury: number;
  /** 30-year US Treasury yield as a decimal. */
  thirtyYearTreasury: number;
  /** Federal Funds effective rate as a decimal. */
  fedFundsRate: number;
  /** Consumer Price Index year-over-year change as a decimal. */
  cpiYOY: number;
  /** Applicable Federal Rate — short-term. */
  afrShortTerm: number;
  /** Applicable Federal Rate — mid-term. */
  afrMidTerm: number;
  /** Applicable Federal Rate — long-term. */
  afrLongTerm: number;
  /** IRS Section 7520 rate (used for charitable and estate planning). */
  sec7520Rate: number;
}

/**
 * Provider interface for fetching market data from external sources.
 * Implementations may wrap FRED, FMP, Bloomberg, etc.
 */
export interface MarketDataProvider {
  /** Fetch the current price for an equity ticker. */
  fetchEquityPrice(ticker: string): Promise<{ ticker: string; price: number; changePercent: number }>;

  /** Fetch current interest rate data. */
  fetchInterestRates(): Promise<{
    tenYearTreasury: number;
    thirtyYearTreasury: number;
    fedFundsRate: number;
  }>;

  /** Fetch the latest inflation data. */
  fetchInflationData(): Promise<{
    cpiYOY: number;
    cpiMOM: number;
    lastReportDate: string;
  }>;

  /** Fetch current Applicable Federal Rates and Section 7520 rate. */
  fetchAFRRates(): Promise<{
    shortTerm: number;
    midTerm: number;
    longTerm: number;
    sec7520: number;
    effectiveMonth: string;
  }>;
}

// ==================== MARKET DATA HELPER TYPES ====================

/** Represents a single equity holding for price updates. */
export interface EquityHolding {
  /** Ticker symbol. */
  ticker: string;
  /** Number of shares held. */
  shares: number;
  /** Last known price per share. */
  lastKnownPrice: number;
}

/** Result of updating the price for a single equity holding. */
export interface PriceUpdate {
  /** Ticker symbol. */
  ticker: string;
  /** Previous price per share. */
  previousPrice: number;
  /** New price per share. */
  newPrice: number;
  /** Absolute change in price. */
  change: number;
  /** Percentage change as a decimal. */
  changePct: number;
  /** New total market value (shares * newPrice). */
  newMarketValue: number;
}

/** Treasury rate data returned by FRED. */
export interface TreasuryRateData {
  /** 3-month T-bill yield. */
  threeMonth: number;
  /** 6-month T-bill yield. */
  sixMonth: number;
  /** 1-year Treasury yield. */
  oneYear: number;
  /** 2-year Treasury yield. */
  twoYear: number;
  /** 5-year Treasury yield. */
  fiveYear: number;
  /** 10-year Treasury yield. */
  tenYear: number;
  /** 20-year Treasury yield. */
  twentyYear: number;
  /** 30-year Treasury yield. */
  thirtyYear: number;
  /** ISO-8601 observation date. */
  observationDate: string;
}

/** CPI data returned by FRED. */
export interface CPIData {
  /** Current CPI index value. */
  currentIndex: number;
  /** Year-over-year change as a decimal. */
  yoyChange: number;
  /** Month-over-month change as a decimal. */
  momChange: number;
  /** ISO-8601 date of the observation. */
  observationDate: string;
}

/** Federal Funds rate data returned by FRED. */
export interface FedFundsData {
  /** Effective federal funds rate as a decimal. */
  effectiveRate: number;
  /** Target range lower bound. */
  targetLower: number;
  /** Target range upper bound. */
  targetUpper: number;
  /** ISO-8601 observation date. */
  observationDate: string;
}

/** A single price quote from FMP. */
export interface FMPQuote {
  /** Ticker symbol. */
  symbol: string;
  /** Company or fund name. */
  name: string;
  /** Current / last price. */
  price: number;
  /** Day change in dollars. */
  change: number;
  /** Day change percentage. */
  changesPercentage: number;
  /** Day high. */
  dayHigh: number;
  /** Day low. */
  dayLow: number;
  /** Volume traded. */
  volume: number;
  /** Market capitalization. */
  marketCap: number;
  /** 52-week high. */
  yearHigh: number;
  /** 52-week low. */
  yearLow: number;
}

/** A single historical price point from FMP. */
export interface FMPHistoricalPrice {
  /** ISO-8601 date. */
  date: string;
  /** Opening price. */
  open: number;
  /** Closing price. */
  close: number;
  /** Day high. */
  high: number;
  /** Day low. */
  low: number;
  /** Volume. */
  volume: number;
  /** Adjusted close. */
  adjClose: number;
}

/** Configuration for the FRED API client. */
export interface FREDConfig {
  /** FRED API key. */
  apiKey: string;
  /** Base URL override. */
  baseUrl?: string;
}

/** Configuration for the FMP (Financial Modeling Prep) API client. */
export interface FMPConfig {
  /** FMP API key. */
  apiKey: string;
  /** Base URL override. */
  baseUrl?: string;
}

/** HubSpot custom property definition for provisioning. */
export interface HubSpotPropertyDefinition {
  /** Internal property name. */
  name: string;
  /** Display label. */
  label: string;
  /** Property data type. */
  type: 'string' | 'number' | 'date' | 'enumeration';
  /** HubSpot property group. */
  groupName: string;
  /** Optional description. */
  description?: string;
  /** Enum options (for type 'enumeration'). */
  options?: Array<{ label: string; value: string }>;
}
