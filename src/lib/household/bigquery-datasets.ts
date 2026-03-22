/**
 * Farther Unified Platform — BigQuery Dataset Architecture
 *
 * Defines the BigQuery dataset schema, materialized views, and
 * query functions for household analytics.
 *
 * Datasets:
 *   farther_households — Golden Record snapshots
 *   farther_plans — Plan calculation results
 *   farther_proposals — Proposal pipeline metrics
 *   farther_market_data — Market prices & benchmarks
 *   farther_analytics — Firm & advisor KPIs
 *   farther_audit — Immutable audit trail
 *
 * All methods use the stub/demo pattern: they log the intended BigQuery
 * operation and return realistic demo data. Comments show the real
 * BigQuery SQL that would execute in production.
 *
 * This module is self-contained and does not depend on React, Next.js,
 * Prisma, or the @google-cloud/bigquery SDK.
 *
 * Monetary values are in cents. Rates are in basis points (1 bp = 0.01%).
 */

import type {
  Household,
  HouseholdId,
} from '../household/types';

// ============================================================================
// Logging Helper
// ============================================================================

/** Simple logger for demo/stub mode, matching bigquery-client.ts convention. */
function logBQ(method: string, detail: string): void {
  console.log(`[BigQueryHousehold:${method}] ${detail}`);
}

// ============================================================================
// Dataset Configuration
// ============================================================================

/** Configuration for all household-related BigQuery datasets. */
export interface BigQueryHouseholdConfig {
  /** GCP project ID (e.g. "farther-platform-prod"). */
  projectId: string;
  /** Dataset for household Golden Record snapshots. */
  datasetHouseholds: string;
  /** Dataset for plan calculation results. */
  datasetPlans: string;
  /** Dataset for proposal pipeline metrics. */
  datasetProposals: string;
  /** Dataset for market prices and benchmarks. */
  datasetMarketData: string;
  /** Dataset for firm & advisor KPI analytics. */
  datasetAnalytics: string;
  /** Dataset for immutable audit trail. */
  datasetAudit: string;
  /** Cloud SQL connection for federated queries. */
  cloudSqlConnection: string;
}

/** Default configuration for development / Stage 1. */
const DEFAULT_CONFIG: BigQueryHouseholdConfig = {
  projectId: 'farther-platform-dev',
  datasetHouseholds: 'farther_households',
  datasetPlans: 'farther_plans',
  datasetProposals: 'farther_proposals',
  datasetMarketData: 'farther_market_data',
  datasetAnalytics: 'farther_analytics',
  datasetAudit: 'farther_audit',
  cloudSqlConnection: 'farther-platform-dev:us-east1:farther-sql',
};

// ============================================================================
// BigQuery Row Types (Flattened for BQ Storage)
// ============================================================================

/**
 * Flattened household row for the `households` BigQuery table.
 * Nested TypeScript objects are flattened to scalar columns or
 * stored as JSON STRING columns for BigQuery compatibility.
 */
export interface BigQueryHouseholdRow {
  /** Household unique identifier. */
  id: string;
  /** External system identifier (CRM, custodian, etc.). */
  external_id: string | null;
  /** Display name for the household. */
  name: string;
  /** Lifecycle status. */
  status: string;
  /** Wealth tier classification. */
  wealth_tier: string;
  /** Owning firm identifier. */
  firm_id: string;
  /** Primary advisor identifier. */
  advisor_id: string;
  /** Co-advisor identifier, if assigned. */
  co_advisor_id: string | null;
  /** Service model label. */
  service_model: string | null;
  /** Total AUM in cents. */
  total_aum_cents: number;
  /** Net worth in cents. */
  net_worth_cents: number;
  /** JSON-encoded array of tags. */
  tags_json: string;
  /** Free-text notes. */
  notes: string | null;
  /** Number of household members. */
  member_count: number;
  /** Number of linked accounts. */
  account_count: number;
  /** Number of active goals. */
  goal_count: number;
  /** Number of outstanding debts. */
  debt_count: number;
  /** ISO-8601 snapshot timestamp. */
  snapshot_at: string;
  /** ISO-8601 creation timestamp. */
  created_at: string;
  /** ISO-8601 last-modified timestamp. */
  updated_at: string;
}

/**
 * Flattened row for the `household_360_view` materialized view.
 * Pre-joined and pre-aggregated for fast dashboard rendering.
 */
export interface BigQueryHousehold360Row {
  /** Household unique identifier. */
  id: string;
  /** Display name. */
  name: string;
  /** Wealth tier. */
  wealth_tier: string;
  /** Lifecycle status. */
  status: string;
  /** Primary advisor ID. */
  advisor_id: string;
  /** Firm ID. */
  firm_id: string;
  /** Total assets across all accounts (cents). */
  total_assets_cents: number;
  /** Total liabilities across all debts (cents). */
  total_liabilities_cents: number;
  /** Net worth: assets minus liabilities (cents). */
  net_worth_cents: number;
  /** Total annual income from all sources (cents). */
  total_annual_income_cents: number;
  /** Total annual expenses (cents). */
  total_annual_expenses_cents: number;
  /** Annual surplus or deficit (cents). */
  annual_surplus_deficit_cents: number;
  /** Savings rate in basis points. */
  savings_rate_bps: number;
  /** Debt-to-income ratio in basis points. */
  debt_to_income_ratio_bps: number;
  /** Count of goals with ON_TRACK status. */
  goals_on_track: number;
  /** Count of goals with AT_RISK status. */
  goals_at_risk: number;
  /** Count of goals with OFF_TRACK status. */
  goals_off_track: number;
  /** Weighted average goal funding in basis points. */
  weighted_goal_funding_bps: number;
  /** Number of household members. */
  member_count: number;
  /** Number of linked accounts. */
  account_count: number;
  /** Materialized view refresh timestamp. */
  refreshed_at: string;
}

/** Row for the household timeline (change-over-time) analytics query. */
export interface TimelineRow {
  /** ISO-8601 date of the snapshot. */
  snapshot_date: string;
  /** Household identifier. */
  household_id: string;
  /** Total AUM on this date (cents). */
  total_aum_cents: number;
  /** Net worth on this date (cents). */
  net_worth_cents: number;
  /** Number of accounts on this date. */
  account_count: number;
  /** Weighted goal funding ratio (basis points). */
  goal_funding_bps: number;
}

/** Row for the advisor book-of-business query. */
export interface AdvisorBookRow {
  /** Household identifier. */
  household_id: string;
  /** Household name. */
  household_name: string;
  /** Wealth tier. */
  wealth_tier: string;
  /** Household status. */
  status: string;
  /** Total AUM (cents). */
  total_aum_cents: number;
  /** Net worth (cents). */
  net_worth_cents: number;
  /** Number of goals. */
  goal_count: number;
  /** Number of goals on track. */
  goals_on_track: number;
  /** Last interaction or review date. */
  last_review_date: string | null;
}

/** Row for firm-level AUM history query. */
export interface AumHistoryRow {
  /** ISO-8601 date. */
  snapshot_date: string;
  /** Firm identifier. */
  firm_id: string;
  /** Total AUM across all households (cents). */
  total_aum_cents: number;
  /** Number of active households. */
  household_count: number;
  /** Average AUM per household (cents). */
  avg_aum_cents: number;
}

/** Row for wealth tier distribution query. */
export interface WealthTierDistRow {
  /** Wealth tier label. */
  wealth_tier: string;
  /** Number of households in this tier. */
  household_count: number;
  /** Total AUM for this tier (cents). */
  total_aum_cents: number;
  /** Average AUM for this tier (cents). */
  avg_aum_cents: number;
  /** Percentage of total households (basis points, e.g. 2500 = 25%). */
  pct_of_total_bps: number;
}

/** Row for the immutable household event audit trail. */
export interface HouseholdEventRow {
  /** Unique event identifier. */
  id: string;
  /** Household identifier. */
  household_id: string;
  /** Event type (e.g. "household.created", "account.balance_updated"). */
  event_type: string;
  /** Actor who triggered the event. */
  actor_id: string;
  /** Actor type. */
  actor_type: string;
  /** ISO-8601 timestamp of the event. */
  timestamp: string;
  /** JSON payload with event-specific data. */
  payload_json: string;
  /** JSON snapshot of the resource before the event, if applicable. */
  before_state_json: string | null;
  /** JSON snapshot of the resource after the event. */
  after_state_json: string | null;
}

// ============================================================================
// BigQuery SQL Statements
// ============================================================================

/**
 * Returns the DDL for the `households` table in the farther_households dataset.
 */
export function getHouseholdTableDDL(config: BigQueryHouseholdConfig = DEFAULT_CONFIG): string {
  return `
CREATE TABLE IF NOT EXISTS \`${config.projectId}.${config.datasetHouseholds}.households\` (
  id                STRING NOT NULL,
  external_id       STRING,
  name              STRING NOT NULL,
  status            STRING NOT NULL,
  wealth_tier       STRING NOT NULL,
  firm_id           STRING NOT NULL,
  advisor_id        STRING NOT NULL,
  co_advisor_id     STRING,
  service_model     STRING,
  total_aum_cents   INT64 NOT NULL,
  net_worth_cents   INT64 NOT NULL,
  tags_json         STRING,
  notes             STRING,
  member_count      INT64 NOT NULL DEFAULT 0,
  account_count     INT64 NOT NULL DEFAULT 0,
  goal_count        INT64 NOT NULL DEFAULT 0,
  debt_count        INT64 NOT NULL DEFAULT 0,
  snapshot_at       TIMESTAMP NOT NULL,
  created_at        TIMESTAMP NOT NULL,
  updated_at        TIMESTAMP NOT NULL
)
PARTITION BY DATE(snapshot_at)
CLUSTER BY firm_id, advisor_id, wealth_tier
OPTIONS (
  description = 'Household Golden Record snapshots. Partitioned by snapshot date for efficient time-range queries.',
  labels = [("team", "platform"), ("domain", "household")]
);`.trim();
}

/**
 * Returns the DDL for the `household_accounts` table.
 */
export function getAccountTableDDL(config: BigQueryHouseholdConfig = DEFAULT_CONFIG): string {
  return `
CREATE TABLE IF NOT EXISTS \`${config.projectId}.${config.datasetHouseholds}.household_accounts\` (
  id                    STRING NOT NULL,
  household_id          STRING NOT NULL,
  member_id             STRING,
  account_type          STRING NOT NULL,
  custodian             STRING,
  account_number_hash   STRING,
  name                  STRING NOT NULL,
  tax_treatment         STRING NOT NULL,
  current_balance_cents INT64 NOT NULL,
  cost_basis_cents      INT64,
  as_of_date            DATE NOT NULL,
  is_managed            BOOL NOT NULL DEFAULT FALSE,
  advisor_fee_rate_bps  INT64,
  allocation_profile    STRING,
  snapshot_at           TIMESTAMP NOT NULL,
  created_at            TIMESTAMP NOT NULL,
  updated_at            TIMESTAMP NOT NULL
)
PARTITION BY DATE(snapshot_at)
CLUSTER BY household_id, account_type
OPTIONS (
  description = 'Household account snapshots. Partitioned by snapshot date.',
  labels = [("team", "platform"), ("domain", "household")]
);`.trim();
}

/**
 * Returns the DDL for the `household_debts` table.
 */
export function getDebtTableDDL(config: BigQueryHouseholdConfig = DEFAULT_CONFIG): string {
  return `
CREATE TABLE IF NOT EXISTS \`${config.projectId}.${config.datasetHouseholds}.household_debts\` (
  id                    STRING NOT NULL,
  household_id          STRING NOT NULL,
  member_id             STRING,
  debt_type             STRING NOT NULL,
  name                  STRING NOT NULL,
  original_balance_cents INT64 NOT NULL,
  current_balance_cents INT64 NOT NULL,
  interest_rate_bps     INT64 NOT NULL,
  is_fixed              BOOL NOT NULL,
  monthly_payment_cents INT64 NOT NULL,
  maturity_date         DATE,
  remaining_payments    INT64,
  lender                STRING,
  snapshot_at           TIMESTAMP NOT NULL,
  created_at            TIMESTAMP NOT NULL,
  updated_at            TIMESTAMP NOT NULL
)
PARTITION BY DATE(snapshot_at)
CLUSTER BY household_id, debt_type
OPTIONS (
  description = 'Household debt/liability snapshots.',
  labels = [("team", "platform"), ("domain", "household")]
);`.trim();
}

/**
 * Returns the DDL for the `household_goals` table.
 */
export function getGoalTableDDL(config: BigQueryHouseholdConfig = DEFAULT_CONFIG): string {
  return `
CREATE TABLE IF NOT EXISTS \`${config.projectId}.${config.datasetHouseholds}.household_goals\` (
  id                        STRING NOT NULL,
  household_id              STRING NOT NULL,
  goal_type                 STRING NOT NULL,
  name                      STRING NOT NULL,
  target_amount_cents       INT64 NOT NULL,
  current_amount_cents      INT64 NOT NULL,
  target_date               DATE NOT NULL,
  priority                  STRING NOT NULL,
  status                    STRING NOT NULL,
  funded_ratio_bps          INT64 NOT NULL,
  probability_of_success    INT64,
  monthly_contribution_cents INT64,
  snapshot_at               TIMESTAMP NOT NULL,
  created_at                TIMESTAMP NOT NULL,
  updated_at                TIMESTAMP NOT NULL
)
PARTITION BY DATE(snapshot_at)
CLUSTER BY household_id, status
OPTIONS (
  description = 'Household financial goal snapshots.',
  labels = [("team", "platform"), ("domain", "household")]
);`.trim();
}

/**
 * Returns the DDL for the `household_events` audit table.
 */
export function getEventTableDDL(config: BigQueryHouseholdConfig = DEFAULT_CONFIG): string {
  return `
CREATE TABLE IF NOT EXISTS \`${config.projectId}.${config.datasetAudit}.household_events\` (
  id                STRING NOT NULL,
  household_id      STRING NOT NULL,
  event_type        STRING NOT NULL,
  actor_id          STRING NOT NULL,
  actor_type        STRING NOT NULL,
  timestamp         TIMESTAMP NOT NULL,
  payload_json      STRING NOT NULL,
  before_state_json STRING,
  after_state_json  STRING
)
PARTITION BY DATE(timestamp)
CLUSTER BY household_id, event_type
OPTIONS (
  description = 'Immutable audit trail for household events. Append-only, never updated or deleted.',
  labels = [("team", "platform"), ("domain", "audit")]
);`.trim();
}

/**
 * Returns the SQL for the Household 360 materialized view.
 *
 * This is the core analytics view that joins households with their
 * accounts, debts, goals, income, and expenses to produce a
 * pre-aggregated, dashboard-ready row per household.
 */
export function getHousehold360SQL(config: BigQueryHouseholdConfig = DEFAULT_CONFIG): string {
  return `
-- =============================================================================
-- Household 360 Materialized View
--
-- Pre-aggregates all household financial data into a single wide row
-- suitable for dashboard rendering and advisor book-of-business queries.
--
-- Refresh: Every 30 minutes via scheduled query or on-demand.
-- =============================================================================
CREATE MATERIALIZED VIEW IF NOT EXISTS
  \`${config.projectId}.${config.datasetAnalytics}.household_360_view\`
OPTIONS (
  enable_refresh = true,
  refresh_interval_minutes = 30,
  description = 'Pre-aggregated 360 view of household financials for dashboard rendering.'
)
AS
WITH latest_households AS (
  SELECT h.*
  FROM \`${config.projectId}.${config.datasetHouseholds}.households\` h
  INNER JOIN (
    SELECT id, MAX(snapshot_at) AS max_snapshot
    FROM \`${config.projectId}.${config.datasetHouseholds}.households\`
    GROUP BY id
  ) latest ON h.id = latest.id AND h.snapshot_at = latest.max_snapshot
),

latest_accounts AS (
  SELECT a.*
  FROM \`${config.projectId}.${config.datasetHouseholds}.household_accounts\` a
  INNER JOIN (
    SELECT id, MAX(snapshot_at) AS max_snapshot
    FROM \`${config.projectId}.${config.datasetHouseholds}.household_accounts\`
    GROUP BY id
  ) latest ON a.id = latest.id AND a.snapshot_at = latest.max_snapshot
),

latest_debts AS (
  SELECT d.*
  FROM \`${config.projectId}.${config.datasetHouseholds}.household_debts\` d
  INNER JOIN (
    SELECT id, MAX(snapshot_at) AS max_snapshot
    FROM \`${config.projectId}.${config.datasetHouseholds}.household_debts\`
    GROUP BY id
  ) latest ON d.id = latest.id AND d.snapshot_at = latest.max_snapshot
),

latest_goals AS (
  SELECT g.*
  FROM \`${config.projectId}.${config.datasetHouseholds}.household_goals\` g
  INNER JOIN (
    SELECT id, MAX(snapshot_at) AS max_snapshot
    FROM \`${config.projectId}.${config.datasetHouseholds}.household_goals\`
    GROUP BY id
  ) latest ON g.id = latest.id AND g.snapshot_at = latest.max_snapshot
),

account_agg AS (
  SELECT
    household_id,
    COALESCE(SUM(current_balance_cents), 0) AS total_assets_cents,
    COUNT(*) AS account_count
  FROM latest_accounts
  GROUP BY household_id
),

debt_agg AS (
  SELECT
    household_id,
    COALESCE(SUM(current_balance_cents), 0) AS total_liabilities_cents
  FROM latest_debts
  GROUP BY household_id
),

goal_agg AS (
  SELECT
    household_id,
    COUNTIF(status = 'ON_TRACK') AS goals_on_track,
    COUNTIF(status = 'AT_RISK') AS goals_at_risk,
    COUNTIF(status = 'OFF_TRACK') AS goals_off_track,
    SAFE_DIVIDE(
      SUM(funded_ratio_bps * target_amount_cents),
      NULLIF(SUM(target_amount_cents), 0)
    ) AS weighted_goal_funding_bps
  FROM latest_goals
  GROUP BY household_id
),

income_agg AS (
  SELECT
    household_id,
    COALESCE(SUM(annual_amount_cents), 0) AS total_annual_income_cents
  FROM \`${config.projectId}.${config.datasetHouseholds}.household_incomes\`
  GROUP BY household_id
),

expense_agg AS (
  SELECT
    household_id,
    COALESCE(SUM(annual_amount_cents), 0) AS total_annual_expenses_cents
  FROM \`${config.projectId}.${config.datasetHouseholds}.household_expenses\`
  GROUP BY household_id
)

SELECT
  h.id,
  h.name,
  h.wealth_tier,
  h.status,
  h.advisor_id,
  h.firm_id,
  COALESCE(aa.total_assets_cents, 0)        AS total_assets_cents,
  COALESCE(da.total_liabilities_cents, 0)    AS total_liabilities_cents,
  COALESCE(aa.total_assets_cents, 0) - COALESCE(da.total_liabilities_cents, 0)
                                             AS net_worth_cents,
  COALESCE(ia.total_annual_income_cents, 0)  AS total_annual_income_cents,
  COALESCE(ea.total_annual_expenses_cents, 0) AS total_annual_expenses_cents,
  COALESCE(ia.total_annual_income_cents, 0) - COALESCE(ea.total_annual_expenses_cents, 0)
                                             AS annual_surplus_deficit_cents,
  CASE
    WHEN COALESCE(ia.total_annual_income_cents, 0) = 0 THEN 0
    ELSE CAST(
      SAFE_DIVIDE(
        (COALESCE(ia.total_annual_income_cents, 0) - COALESCE(ea.total_annual_expenses_cents, 0)) * 10000,
        ia.total_annual_income_cents
      ) AS INT64
    )
  END                                        AS savings_rate_bps,
  CASE
    WHEN COALESCE(ia.total_annual_income_cents, 0) = 0 THEN 0
    ELSE CAST(
      SAFE_DIVIDE(
        COALESCE(da.total_liabilities_cents, 0) * 10000,
        ia.total_annual_income_cents
      ) AS INT64
    )
  END                                        AS debt_to_income_ratio_bps,
  COALESCE(ga.goals_on_track, 0)             AS goals_on_track,
  COALESCE(ga.goals_at_risk, 0)              AS goals_at_risk,
  COALESCE(ga.goals_off_track, 0)            AS goals_off_track,
  COALESCE(CAST(ga.weighted_goal_funding_bps AS INT64), 0)
                                             AS weighted_goal_funding_bps,
  h.member_count,
  COALESCE(aa.account_count, 0)              AS account_count,
  CURRENT_TIMESTAMP()                        AS refreshed_at
FROM latest_households h
LEFT JOIN account_agg aa ON h.id = aa.household_id
LEFT JOIN debt_agg da ON h.id = da.household_id
LEFT JOIN goal_agg ga ON h.id = ga.household_id
LEFT JOIN income_agg ia ON h.id = ia.household_id
LEFT JOIN expense_agg ea ON h.id = ea.household_id
WHERE h.status NOT IN ('ARCHIVED', 'CLOSED');`.trim();
}

// ============================================================================
// Demo Data Generators
// ============================================================================

/** Generates a demo household row for BigQuery. */
function demoHouseholdRow(householdId: string): BigQueryHouseholdRow {
  return {
    id: householdId,
    external_id: `CRM-${householdId.slice(-6).toUpperCase()}`,
    name: 'The Johnson Family',
    status: 'ACTIVE',
    wealth_tier: 'HIGH_NET_WORTH',
    firm_id: 'firm_demo_001',
    advisor_id: 'adv_demo_001',
    co_advisor_id: null,
    service_model: 'comprehensive',
    total_aum_cents: 450_000_000, // $4.5M
    net_worth_cents: 520_000_000, // $5.2M
    tags_json: JSON.stringify(['retirement-focus', 'tax-sensitive', 'estate-planning']),
    notes: 'Annual review scheduled Q2.',
    member_count: 3,
    account_count: 7,
    goal_count: 4,
    debt_count: 2,
    snapshot_at: new Date().toISOString(),
    created_at: '2024-03-15T10:00:00Z',
    updated_at: new Date().toISOString(),
  };
}

/** Generates a demo 360 view row. */
function demoHousehold360Row(householdId: string): BigQueryHousehold360Row {
  return {
    id: householdId,
    name: 'The Johnson Family',
    wealth_tier: 'HIGH_NET_WORTH',
    status: 'ACTIVE',
    advisor_id: 'adv_demo_001',
    firm_id: 'firm_demo_001',
    total_assets_cents: 450_000_000,
    total_liabilities_cents: 28_500_000,
    net_worth_cents: 421_500_000,
    total_annual_income_cents: 35_000_000,
    total_annual_expenses_cents: 18_000_000,
    annual_surplus_deficit_cents: 17_000_000,
    savings_rate_bps: 4857, // 48.57%
    debt_to_income_ratio_bps: 8143, // 81.43%
    goals_on_track: 3,
    goals_at_risk: 1,
    goals_off_track: 0,
    weighted_goal_funding_bps: 7200, // 72%
    member_count: 3,
    account_count: 7,
    refreshed_at: new Date().toISOString(),
  };
}

/** Generates demo timeline rows. */
function demoTimelineRows(
  householdId: string,
  startDate: string,
  endDate: string,
): TimelineRow[] {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const rows: TimelineRow[] = [];
  const current = new Date(start);
  let baseAum = 420_000_000;

  while (current <= end) {
    // Simulate gradual growth with some volatility.
    baseAum += Math.floor((Math.random() - 0.3) * 2_000_000);
    rows.push({
      snapshot_date: current.toISOString().split('T')[0],
      household_id: householdId,
      total_aum_cents: baseAum,
      net_worth_cents: baseAum - 28_500_000,
      account_count: 7,
      goal_funding_bps: 7200 + Math.floor(Math.random() * 200),
    });
    current.setMonth(current.getMonth() + 1);
  }

  return rows;
}

/** Generates demo advisor book rows. */
function demoAdvisorBookRows(): AdvisorBookRow[] {
  return [
    {
      household_id: 'hh_001',
      household_name: 'The Johnson Family',
      wealth_tier: 'HIGH_NET_WORTH',
      status: 'ACTIVE',
      total_aum_cents: 450_000_000,
      net_worth_cents: 421_500_000,
      goal_count: 4,
      goals_on_track: 3,
      last_review_date: '2025-11-01',
    },
    {
      household_id: 'hh_002',
      household_name: 'The Martinez Household',
      wealth_tier: 'VERY_HIGH_NET_WORTH',
      status: 'ACTIVE',
      total_aum_cents: 1_200_000_000,
      net_worth_cents: 1_150_000_000,
      goal_count: 6,
      goals_on_track: 5,
      last_review_date: '2025-10-15',
    },
    {
      household_id: 'hh_003',
      household_name: 'The Chen Trust',
      wealth_tier: 'ULTRA_HIGH_NET_WORTH',
      status: 'ACTIVE',
      total_aum_cents: 5_800_000_000,
      net_worth_cents: 5_750_000_000,
      goal_count: 8,
      goals_on_track: 7,
      last_review_date: '2025-09-20',
    },
    {
      household_id: 'hh_004',
      household_name: 'The Patel Family',
      wealth_tier: 'MASS_AFFLUENT',
      status: 'ACTIVE',
      total_aum_cents: 85_000_000,
      net_worth_cents: 72_000_000,
      goal_count: 3,
      goals_on_track: 2,
      last_review_date: '2025-11-10',
    },
  ];
}

// ============================================================================
// BigQuery Household Client
// ============================================================================

/**
 * Client for household-related BigQuery operations.
 *
 * In production, this would use the `@google-cloud/bigquery` SDK.
 * This implementation uses the same stub/demo pattern as the existing
 * BigQueryClient in src/lib/bigquery/bigquery-client.ts.
 */
export class BigQueryHouseholdClient {
  private config: BigQueryHouseholdConfig;

  constructor(config?: Partial<BigQueryHouseholdConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    logBQ('constructor', `Initialized for project ${this.config.projectId}`);
  }

  // ==========================================================================
  // Household Snapshots
  // ==========================================================================

  /**
   * Writes a household snapshot to BigQuery.
   *
   * Called after every significant change to a household to maintain
   * a time-series history of the Golden Record.
   */
  async writeHouseholdSnapshot(household: Household): Promise<void> {
    // Real BigQuery SQL:
    // INSERT INTO `${projectId}.${datasetHouseholds}.households`
    //   (id, external_id, name, status, wealth_tier, firm_id, advisor_id,
    //    co_advisor_id, service_model, total_aum_cents, net_worth_cents,
    //    tags_json, notes, member_count, account_count, goal_count,
    //    debt_count, snapshot_at, created_at, updated_at)
    // VALUES (@id, @externalId, @name, @status, @wealthTier, ...)

    logBQ(
      'writeHouseholdSnapshot',
      `Writing snapshot for household=${household.id}, name="${household.name}", ` +
        `status=${household.status}, tier=${household.wealthTier}`,
    );
    logBQ(
      'writeHouseholdSnapshot',
      `Would stream to ${this.config.projectId}.${this.config.datasetHouseholds}.households`,
    );
  }

  // ==========================================================================
  // Household Events (Audit)
  // ==========================================================================

  /**
   * Writes an immutable household event to the audit trail.
   *
   * Events are append-only and are never updated or deleted.
   * They provide a complete history of all changes to a household.
   */
  async writeHouseholdEvent(event: HouseholdEventRow): Promise<void> {
    // Real BigQuery SQL:
    // INSERT INTO `${projectId}.${datasetAudit}.household_events`
    //   (id, household_id, event_type, actor_id, actor_type,
    //    timestamp, payload_json, before_state_json, after_state_json)
    // VALUES (@id, @householdId, @eventType, @actorId, @actorType,
    //         @timestamp, @payloadJson, @beforeStateJson, @afterStateJson)

    logBQ(
      'writeHouseholdEvent',
      `Writing event id=${event.id}, type=${event.event_type}, ` +
        `household=${event.household_id}, actor=${event.actor_id} (${event.actor_type})`,
    );
    logBQ(
      'writeHouseholdEvent',
      `Would insert into ${this.config.projectId}.${this.config.datasetAudit}.household_events`,
    );
  }

  // ==========================================================================
  // Household 360 View Query
  // ==========================================================================

  /**
   * Queries the pre-aggregated 360 view for a single household.
   *
   * In production this reads from the materialized view
   * `farther_analytics.household_360_view` for fast access.
   */
  async queryHousehold360(householdId: string): Promise<BigQueryHousehold360Row | null> {
    // Real BigQuery SQL:
    // SELECT *
    // FROM `${projectId}.${datasetAnalytics}.household_360_view`
    // WHERE id = @householdId

    logBQ(
      'queryHousehold360',
      `Querying 360 view for household=${householdId} ` +
        `from ${this.config.projectId}.${this.config.datasetAnalytics}.household_360_view`,
    );

    return demoHousehold360Row(householdId);
  }

  // ==========================================================================
  // Household Timeline Query
  // ==========================================================================

  /**
   * Queries the historical timeline of a household's financial position.
   *
   * Returns monthly snapshots of AUM, net worth, and goal funding
   * for charting the household's financial trajectory.
   */
  async queryHouseholdTimeline(
    householdId: string,
    startDate: string,
    endDate: string,
  ): Promise<TimelineRow[]> {
    // Real BigQuery SQL:
    // SELECT
    //   DATE(snapshot_at) AS snapshot_date,
    //   h.id AS household_id,
    //   h.total_aum_cents,
    //   h.net_worth_cents,
    //   h.account_count,
    //   COALESCE(
    //     (SELECT CAST(SAFE_DIVIDE(
    //       SUM(g.funded_ratio_bps * g.target_amount_cents),
    //       NULLIF(SUM(g.target_amount_cents), 0)
    //     ) AS INT64)
    //     FROM `${projectId}.${datasetHouseholds}.household_goals` g
    //     WHERE g.household_id = h.id
    //       AND DATE(g.snapshot_at) = DATE(h.snapshot_at)),
    //     0
    //   ) AS goal_funding_bps
    // FROM `${projectId}.${datasetHouseholds}.households` h
    // WHERE h.id = @householdId
    //   AND DATE(h.snapshot_at) BETWEEN @startDate AND @endDate
    // ORDER BY snapshot_date ASC

    logBQ(
      'queryHouseholdTimeline',
      `Querying timeline for household=${householdId}, ` +
        `range=${startDate} to ${endDate}`,
    );

    return demoTimelineRows(householdId, startDate, endDate);
  }

  // ==========================================================================
  // Advisor Book of Business
  // ==========================================================================

  /**
   * Queries all households managed by a specific advisor.
   *
   * Returns a summary row per household suitable for the
   * advisor's book-of-business dashboard view.
   */
  async queryAdvisorBook(advisorId: string): Promise<AdvisorBookRow[]> {
    // Real BigQuery SQL:
    // WITH latest AS (
    //   SELECT h.*, ROW_NUMBER() OVER (PARTITION BY h.id ORDER BY h.snapshot_at DESC) AS rn
    //   FROM `${projectId}.${datasetHouseholds}.households` h
    //   WHERE h.advisor_id = @advisorId
    // )
    // SELECT
    //   lh.id AS household_id,
    //   lh.name AS household_name,
    //   lh.wealth_tier,
    //   lh.status,
    //   lh.total_aum_cents,
    //   lh.net_worth_cents,
    //   lh.goal_count,
    //   COALESCE(ga.goals_on_track, 0) AS goals_on_track,
    //   NULL AS last_review_date  -- would join with CRM data
    // FROM latest lh
    // LEFT JOIN (
    //   SELECT household_id, COUNTIF(status = 'ON_TRACK') AS goals_on_track
    //   FROM `${projectId}.${datasetHouseholds}.household_goals`
    //   GROUP BY household_id
    // ) ga ON lh.id = ga.household_id
    // WHERE lh.rn = 1 AND lh.status = 'ACTIVE'
    // ORDER BY lh.total_aum_cents DESC

    logBQ(
      'queryAdvisorBook',
      `Querying book of business for advisor=${advisorId}`,
    );

    return demoAdvisorBookRows();
  }

  // ==========================================================================
  // Firm AUM History
  // ==========================================================================

  /**
   * Queries firm-level AUM history for trend analysis.
   *
   * Aggregates all household snapshots by date to produce
   * daily/monthly AUM totals for the firm.
   */
  async queryFirmAumHistory(
    firmId: string,
    startDate: string,
    endDate: string,
  ): Promise<AumHistoryRow[]> {
    // Real BigQuery SQL:
    // WITH daily_aum AS (
    //   SELECT
    //     DATE(snapshot_at) AS snapshot_date,
    //     firm_id,
    //     SUM(total_aum_cents) AS total_aum_cents,
    //     COUNT(DISTINCT id) AS household_count
    //   FROM (
    //     SELECT h.*, ROW_NUMBER() OVER (
    //       PARTITION BY h.id, DATE(h.snapshot_at)
    //       ORDER BY h.snapshot_at DESC
    //     ) AS rn
    //     FROM `${projectId}.${datasetHouseholds}.households` h
    //     WHERE h.firm_id = @firmId
    //       AND DATE(h.snapshot_at) BETWEEN @startDate AND @endDate
    //       AND h.status NOT IN ('ARCHIVED', 'CLOSED')
    //   )
    //   WHERE rn = 1
    //   GROUP BY snapshot_date, firm_id
    // )
    // SELECT
    //   snapshot_date,
    //   firm_id,
    //   total_aum_cents,
    //   household_count,
    //   CAST(SAFE_DIVIDE(total_aum_cents, household_count) AS INT64) AS avg_aum_cents
    // FROM daily_aum
    // ORDER BY snapshot_date ASC

    logBQ(
      'queryFirmAumHistory',
      `Querying firm AUM history for firm=${firmId}, range=${startDate} to ${endDate}`,
    );

    const start = new Date(startDate);
    const end = new Date(endDate);
    const rows: AumHistoryRow[] = [];
    const current = new Date(start);
    let baseAum = 145_000_000_000; // $1.45B

    while (current <= end) {
      baseAum += Math.floor((Math.random() - 0.25) * 500_000_000);
      const hhCount = 342 + Math.floor(Math.random() * 10);
      rows.push({
        snapshot_date: current.toISOString().split('T')[0],
        firm_id: firmId,
        total_aum_cents: baseAum,
        household_count: hhCount,
        avg_aum_cents: Math.floor(baseAum / hhCount),
      });
      current.setDate(current.getDate() + 1);
    }

    return rows;
  }

  // ==========================================================================
  // Wealth Tier Distribution
  // ==========================================================================

  /**
   * Queries the distribution of households across wealth tiers.
   *
   * Used for the firm dashboard pie/bar chart showing how
   * AUM is distributed across client segments.
   */
  async queryWealthTierDistribution(firmId: string): Promise<WealthTierDistRow[]> {
    // Real BigQuery SQL:
    // WITH latest_households AS (
    //   SELECT h.*, ROW_NUMBER() OVER (PARTITION BY h.id ORDER BY h.snapshot_at DESC) AS rn
    //   FROM `${projectId}.${datasetHouseholds}.households` h
    //   WHERE h.firm_id = @firmId AND h.status NOT IN ('ARCHIVED', 'CLOSED')
    // ),
    // totals AS (
    //   SELECT COUNT(*) AS total_count
    //   FROM latest_households
    //   WHERE rn = 1
    // )
    // SELECT
    //   lh.wealth_tier,
    //   COUNT(*) AS household_count,
    //   SUM(lh.total_aum_cents) AS total_aum_cents,
    //   CAST(AVG(lh.total_aum_cents) AS INT64) AS avg_aum_cents,
    //   CAST(SAFE_DIVIDE(COUNT(*) * 10000, t.total_count) AS INT64) AS pct_of_total_bps
    // FROM latest_households lh
    // CROSS JOIN totals t
    // WHERE lh.rn = 1
    // GROUP BY lh.wealth_tier, t.total_count
    // ORDER BY total_aum_cents DESC

    logBQ(
      'queryWealthTierDistribution',
      `Querying wealth tier distribution for firm=${firmId}`,
    );

    return [
      {
        wealth_tier: 'ULTRA_HIGH_NET_WORTH',
        household_count: 12,
        total_aum_cents: 72_000_000_000,
        avg_aum_cents: 6_000_000_000,
        pct_of_total_bps: 351,   // 3.51%
      },
      {
        wealth_tier: 'VERY_HIGH_NET_WORTH',
        household_count: 45,
        total_aum_cents: 45_000_000_000,
        avg_aum_cents: 1_000_000_000,
        pct_of_total_bps: 1316,  // 13.16%
      },
      {
        wealth_tier: 'HIGH_NET_WORTH',
        household_count: 120,
        total_aum_cents: 24_000_000_000,
        avg_aum_cents: 200_000_000,
        pct_of_total_bps: 3509,  // 35.09%
      },
      {
        wealth_tier: 'MASS_AFFLUENT',
        household_count: 105,
        total_aum_cents: 3_675_000_000,
        avg_aum_cents: 35_000_000,
        pct_of_total_bps: 3070,  // 30.70%
      },
      {
        wealth_tier: 'MASS_MARKET',
        household_count: 60,
        total_aum_cents: 325_000_000,
        avg_aum_cents: 5_416_667,
        pct_of_total_bps: 1754,  // 17.54%
      },
    ];
  }

  // ==========================================================================
  // Schema & View SQL Accessors
  // ==========================================================================

  /**
   * Returns the full Household 360 materialized view SQL.
   * Useful for documentation, migration scripts, and schema reviews.
   */
  getHousehold360SQL(): string {
    return getHousehold360SQL(this.config);
  }

  /**
   * Returns all table DDL statements for the household datasets.
   * Useful for automated schema provisioning.
   */
  getAllTableDDL(): string[] {
    return [
      getHouseholdTableDDL(this.config),
      getAccountTableDDL(this.config),
      getDebtTableDDL(this.config),
      getGoalTableDDL(this.config),
      getEventTableDDL(this.config),
    ];
  }

  /**
   * Returns the dataset configuration. Useful for constructing
   * ad-hoc queries in other modules.
   */
  getConfig(): Readonly<BigQueryHouseholdConfig> {
    return Object.freeze({ ...this.config });
  }
}
