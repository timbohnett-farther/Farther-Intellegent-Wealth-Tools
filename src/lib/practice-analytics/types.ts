/**
 * Farther Unified Platform — FP-Pulse: Practice Analytics & Advisor Intelligence Dashboard
 *
 * Comprehensive type definitions for the FP-Pulse module, which provides
 * firm-wide practice analytics, advisor scorecards, client health monitoring,
 * revenue intelligence, churn prediction, natural language querying,
 * alert engine, and daily advisor action lists.
 *
 * Design principles:
 * - All monetary values are plain numbers (dollars, not cents).
 * - All dates are ISO 8601 strings.
 * - All IDs are branded string primitives to prevent accidental swaps.
 * - No React, Next.js, or Prisma dependencies — this module is
 *   self-contained and can be used in workers, CLI tools, and tests.
 *
 * @module practice-analytics/types
 */

// =====================================================================
// Branded Primitive Types
// =====================================================================

/**
 * Unique identifier for an Advisor entity.
 * Format: UUID v4 string branded to prevent misuse.
 */
export type AdvisorId = string & { readonly __brand: 'AdvisorId' };

/**
 * Unique identifier for a Firm entity.
 * Format: UUID v4 string branded to prevent misuse.
 */
export type FirmId = string & { readonly __brand: 'FirmId' };

/**
 * Unique identifier for an Alert entity.
 * Format: UUID v4 string branded to prevent misuse.
 */
export type AlertId = string & { readonly __brand: 'AlertId' };

/**
 * Unique identifier for a natural-language Query entity.
 * Format: UUID v4 string branded to prevent misuse.
 */
export type QueryId = string & { readonly __brand: 'QueryId' };

// =====================================================================
// Branded Primitive Constructors
// =====================================================================

/**
 * Create a branded AdvisorId from a plain string.
 *
 * @param id - A UUID v4 string
 * @returns The input cast to a branded AdvisorId
 *
 * @example
 * ```ts
 * const aid = advisorId('550e8400-e29b-41d4-a716-446655440000');
 * ```
 */
export function advisorId(id: string): AdvisorId {
  return id as AdvisorId;
}

/**
 * Create a branded FirmId from a plain string.
 *
 * @param id - A UUID v4 string
 * @returns The input cast to a branded FirmId
 *
 * @example
 * ```ts
 * const fid = firmId('660e8400-e29b-41d4-a716-446655440000');
 * ```
 */
export function firmId(id: string): FirmId {
  return id as FirmId;
}

/**
 * Create a branded AlertId from a plain string.
 *
 * @param id - A UUID v4 string
 * @returns The input cast to a branded AlertId
 *
 * @example
 * ```ts
 * const alid = alertId('770e8400-e29b-41d4-a716-446655440000');
 * ```
 */
export function alertId(id: string): AlertId {
  return id as AlertId;
}

/**
 * Create a branded QueryId from a plain string.
 *
 * @param id - A UUID v4 string
 * @returns The input cast to a branded QueryId
 *
 * @example
 * ```ts
 * const qid = queryId('880e8400-e29b-41d4-a716-446655440000');
 * ```
 */
export function queryId(id: string): QueryId {
  return id as QueryId;
}

// =====================================================================
// Role & View Types
// =====================================================================

/**
 * Dashboard role determines the view layout, data scope, and
 * available actions for the current user.
 *
 * - MD_PRINCIPAL: Managing Director / Principal — firm-wide view
 * - ADVISOR: Individual advisor — book-of-business view
 * - OPERATIONS: Operations team — data quality, billing, compliance
 * - AI_PULSE: AI-powered overlay accessible from any role
 */
export type DashboardRole =
  | 'MD_PRINCIPAL'
  | 'ADVISOR'
  | 'OPERATIONS'
  | 'AI_PULSE';

/**
 * Represents the current dashboard view configuration,
 * including the active role, optional advisor/firm filter, and date range.
 */
export interface DashboardView {
  /** The role determining the dashboard layout and data scope. */
  role: DashboardRole;
  /** Optional advisor filter — present when viewing a specific advisor's data. */
  advisorId?: AdvisorId;
  /** Firm associated with the current view. */
  firmId: FirmId;
  /** Date range filter for the dashboard (ISO 8601 start/end strings). */
  dateRange: {
    /** Inclusive start date (ISO 8601). */
    start: string;
    /** Inclusive end date (ISO 8601). */
    end: string;
  };
}

// =====================================================================
// KPI & Metrics Types
// =====================================================================

/** Direction of a KPI trend relative to the comparison period. */
export type KPITrend = 'up' | 'down' | 'flat';

/**
 * A single KPI metric with its current value, formatted display string,
 * change percentage, and trend direction.
 */
export interface KPICard {
  /** Human-readable label for the KPI (e.g. "Total AUM"). */
  label: string;
  /** Raw numeric value. */
  value: number;
  /** Display-ready formatted value (e.g. "$142.3M", "87%"). */
  formattedValue: string;
  /** Percentage change relative to the comparison period. */
  changePercent: number;
  /** The period over which change is measured (e.g. "MTD", "QTD", "YoY"). */
  changePeriod: string;
  /** Whether the metric is trending up, down, or flat. */
  trend: KPITrend;
}

/**
 * A single KPI entry within the FirmKPIs aggregate.
 * Captures value, change, and trend for one metric.
 */
export interface FirmKPIEntry {
  /** Current value of the KPI. */
  value: number;
  /** Percentage change relative to the comparison period. */
  changePercent: number;
  /** The period over which change is measured (e.g. "MTD", "QTD", "YoY"). */
  changePeriod: string;
  /** Whether the metric is trending up, down, or flat. */
  trend: KPITrend;
}

/**
 * Firm-level Key Performance Indicators displayed in the top KPI bar
 * of the MD/Principal dashboard.
 */
export interface FirmKPIs {
  /** Total assets under management across all advisors and households. */
  totalAum: FirmKPIEntry;
  /** Net new assets month-to-date (inflows minus outflows). */
  netNewAssetsMTD: FirmKPIEntry;
  /** Annualized revenue from all fee sources. */
  annualRevenue: FirmKPIEntry;
  /** Number of active (non-archived) households across the firm. */
  activeHouseholds: FirmKPIEntry;
  /** Aggregate plan health score (0-100) across all households. */
  planHealthScore: FirmKPIEntry;
}

// =====================================================================
// AUM Growth
// =====================================================================

/**
 * Attribution breakdown of AUM growth over a given period.
 * Decomposes ending AUM into its constituent drivers.
 */
export interface AumGrowthAttribution {
  /** AUM at the start of the period. */
  startingAum: number;
  /** AUM at the end of the period. */
  endingAum: number;
  /** Market appreciation (or depreciation) component. */
  marketAppreciation: number;
  /** Net new assets detail. */
  netNewAssets: {
    /** Gross inflows from existing and new clients. */
    inflows: number;
    /** Gross outflows (withdrawals, distributions, transfers out). */
    outflows: number;
  };
  /** AUM contributed by newly onboarded clients during the period. */
  newClients: number;
  /** AUM lost from terminated client relationships during the period. */
  lostClients: number;
  /** Organic growth rate (net new assets / starting AUM) as a decimal. */
  organicGrowthRate: number;
  /** Industry average organic growth rate for comparison, as a decimal. */
  industryAvgGrowthRate: number;
  /** The measurement period (e.g. "MTD", "QTD", "YTD", "1Y"). */
  period: string;
}

/**
 * A single point in the AUM time series, used for charting AUM growth
 * with attribution over time.
 */
export interface AumTimeSeriesPoint {
  /** Date of the data point (ISO 8601). */
  date: string;
  /** Total AUM as of this date. */
  totalAum: number;
  /** Cumulative market appreciation since the series start. */
  marketAppreciation: number;
  /** Cumulative organic net new assets since the series start. */
  organicNetNew: number;
  /** Cumulative AUM from new client onboardings since the series start. */
  newClientAum: number;
}

/**
 * Source category for an AUM flow (inflow or outflow).
 */
export type FlowSource =
  | 'existing_client'
  | 'new_onboarding'
  | 'market_appreciation'
  | 'withdrawals'
  | 'transfers_out'
  | 'lost_relationships'
  | 'distributions';

/**
 * Detailed breakdown of a single flow category (inflow or outflow).
 */
export interface FlowDetail {
  /** The source or reason for the flow. */
  source: FlowSource;
  /** Dollar amount of the flow. */
  amount: number;
  /** Number of transactions or events comprising the flow. */
  count: number;
}

// =====================================================================
// Advisor Scorecard
// =====================================================================

/**
 * Performance tier for an advisor, derived from composite scoring
 * across AUM growth, plan health, client engagement, and revenue metrics.
 */
export type AdvisorPerformanceTier =
  | 'TOP_QUARTILE'
  | 'ABOVE_AVERAGE'
  | 'AVERAGE'
  | 'WATCH'
  | 'CRITICAL';

/**
 * Comprehensive advisor scorecard containing all performance metrics,
 * comparisons to firm averages, and computed performance tier.
 */
export interface AdvisorScorecard {
  /** Unique identifier for the advisor. */
  advisorId: AdvisorId;
  /** Advisor's display name. */
  advisorName: string;
  /** Advisor's seniority tier (e.g. "Senior Advisor", "Advisor", "Associate"). */
  tier: 'Senior Advisor' | 'Advisor' | 'Associate' | 'Partner' | 'Managing Director';
  /** Total AUM managed by this advisor. */
  aum: number;
  /** AUM change month-to-date (positive = growth). */
  aumChangeMTD: number;
  /** Number of active households assigned to the advisor. */
  households: number;
  /** Household count change month-to-date. */
  householdsChangeMTD: number;
  /** Annualized revenue attributable to this advisor. */
  revenue: number;
  /** Revenue change year-over-year as a percentage. */
  revenueChangeYoY: number;
  /** Average AUM per household for this advisor. */
  avgAumPerHousehold: number;
  /** Firm-wide average AUM per household for comparison. */
  firmAvgAumPerHousehold: number;
  /** Aggregate plan health score (0-100) across the advisor's book. */
  planHealthScore: number;
  /** Client engagement score (0-100) based on contact frequency, portal usage. */
  engagementScore: number;
  /** Data quality/completeness score (0-100) across the advisor's households. */
  dataQualityScore: number;
  /** Active pipeline summary. */
  activePipeline: {
    /** Number of open proposals. */
    proposalCount: number;
    /** Total AUM across all open proposals. */
    proposedAum: number;
  };
  /** Number of households flagged as at-risk. */
  atRiskClients: number;
  /** Number of overdue annual/semi-annual reviews. */
  overdueReviews: number;
  /** Computed performance tier based on composite scoring. */
  performanceTier: AdvisorPerformanceTier;
  /** Composite performance score (0-100) used to derive the tier. */
  compositeScore: number;
}

/**
 * Sort options for the advisor scorecard leaderboard.
 */
export type AdvisorScorecardSort =
  | 'AUM'
  | 'AUM_GROWTH'
  | 'PLAN_HEALTH'
  | 'CLIENT_COUNT'
  | 'REVENUE'
  | 'ENGAGEMENT_SCORE';

// =====================================================================
// Client Health
// =====================================================================

/**
 * Component scores that combine to form the aggregate household health score.
 * Each component has a fixed weight that sums to 1.0.
 */
export interface HealthScoreComponents {
  /** Plan Monte Carlo success rate contribution (weight 0.35). */
  planSuccessRate: number;
  /** Client engagement / contact frequency score (weight 0.25). */
  engagementScore: number;
  /** Data quality / completeness score (weight 0.15). */
  dataQualityScore: number;
  /** Risk alignment between portfolio and risk profile (weight 0.15). */
  riskAlignmentScore: number;
  /** Billing and fee health — no errors, no exceptions (weight 0.10). */
  billingHealth: number;
}

/**
 * Health score category — derived from the aggregate score.
 *
 * - HEALTHY: score >= 70
 * - WATCH: score >= 40 and < 70
 * - AT_RISK: score < 40
 */
export type HealthScoreCategory = 'HEALTHY' | 'WATCH' | 'AT_RISK';

/**
 * A single household entry in the client health heatmap, including
 * the aggregate score, per-component scores, and next recommended action.
 */
export interface HouseholdHealthEntry {
  /** Household identifier (references household/types HouseholdId). */
  householdId: string;
  /** Display name for the household. */
  householdName: string;
  /** Advisor assigned to this household. */
  advisorId: AdvisorId;
  /** Advisor's display name. */
  advisorName: string;
  /** Total AUM for the household. */
  aum: number;
  /** Aggregate health score (0-100). */
  healthScore: number;
  /** Derived health category. */
  healthCategory: HealthScoreCategory;
  /** Per-component health scores. */
  components: HealthScoreComponents;
  /** ISO 8601 timestamp of the last advisor-client contact. */
  lastContact: string;
  /** Recommended next action, or null if none. */
  nextAction: string | null;
}

/**
 * Aggregate data for the client health heatmap widget,
 * including the full list of entries and summary distribution.
 */
export interface ClientHealthHeatmapData {
  /** All household health entries, sorted by score ascending. */
  entries: HouseholdHealthEntry[];
  /** Distribution of households across health categories. */
  distribution: {
    healthy: { count: number; pct: number };
    watch: { count: number; pct: number };
    atRisk: { count: number; pct: number };
  };
  /** Total AUM in at-risk households. */
  aumAtRisk: number;
}

// =====================================================================
// Revenue Intelligence
// =====================================================================

/**
 * Revenue tier based on household AUM size.
 */
export type RevenueTier =
  | 'UNDER_1M'
  | '1M_5M'
  | '5M_30M'
  | 'OVER_30M';

/**
 * Type of revenue fee.
 */
export type RevenueType =
  | 'MANAGEMENT_FEE'
  | 'PLANNING_FEE'
  | 'PERFORMANCE_FEE';

/**
 * Revenue composition broken down by tier, type, and advisor.
 */
export interface RevenueComposition {
  /** Revenue by AUM tier. */
  byTier: Record<RevenueTier, number>;
  /** Revenue by fee type. */
  byType: Record<RevenueType, number>;
  /** Revenue by advisor. */
  byAdvisor: Array<{
    advisorId: AdvisorId;
    advisorName: string;
    revenue: number;
  }>;
}

/**
 * A single point in the revenue time series for charting
 * actual vs. projected revenue by month.
 */
export interface RevenueTimeSeriesPoint {
  /** Month label (e.g. "2025-01", "2025-02"). */
  month: string;
  /** Actual billed revenue for the month. */
  actualRevenue: number;
  /** Projected revenue for the month. */
  projectedRevenue: number;
}

/**
 * Revenue at risk from at-risk households,
 * including the top households contributing to risk.
 */
export interface RevenueAtRisk {
  /** Number of households classified as at-risk. */
  householdsAtRisk: number;
  /** Total AUM across at-risk households. */
  aumAtRisk: number;
  /** Estimated annual revenue at risk. */
  revenueAtRisk: number;
  /** Revenue at risk as a percentage of total revenue. */
  revenueImpactPercent: number;
  /** Top at-risk households sorted by AUM descending. */
  topAtRisk: Array<{
    householdName: string;
    aum: number;
    reason: string;
  }>;
}

// =====================================================================
// Churn Prediction
// =====================================================================

/**
 * Churn risk label derived from the churn risk score.
 *
 * - critical: score >= 80
 * - elevated: score >= 60 and < 80
 * - watch: score >= 40 and < 60
 * - healthy: score < 40
 */
export type ChurnRiskLabel = 'critical' | 'elevated' | 'watch' | 'healthy';

/**
 * Individual risk factors that contribute to a household's churn score.
 */
export type ChurnRiskFactor =
  | 'LOW_ENGAGEMENT'
  | 'PLAN_HEALTH_DECLINE'
  | 'AUM_OUTFLOWS'
  | 'PORTFOLIO_DRIFT'
  | 'NO_RECENT_CONTACT'
  | 'LIFE_EVENT'
  | 'PROPOSAL_DECLINED'
  | 'LOW_PORTAL_USAGE';

/**
 * A scored churn signal for a single household, including the composite
 * risk score, contributing factors, and recommended retention action.
 */
export interface ChurnSignal {
  /** Household identifier. */
  householdId: string;
  /** Advisor assigned to this household. */
  advisorId: AdvisorId;
  /** Display name for the household. */
  householdName: string;
  /** Total AUM for the household. */
  aum: number;
  /** Churn risk score (0-100, higher = more likely to churn). */
  churnRiskScore: number;
  /** Derived churn risk label. */
  churnRiskLabel: ChurnRiskLabel;
  /** Estimated annual revenue at risk if the household churns. */
  annualRevenueAtRisk: number;
  /** Top risk factors contributing to the churn score, ordered by weight. */
  topRiskFactors: ChurnRiskFactor[];
  /** AI-generated recommended retention action. */
  recommendedAction: string;
  /** ISO 8601 timestamp when the score was computed. */
  scoredAt: string;
  /** Number of days since the advisor last contacted this household. */
  daysSinceLastContact: number;
  /** Number of client portal sessions in the last 90 days. */
  portalSessionsLast90d: number;
  /** Change in plan success rate (Monte Carlo) over the last 90 days. */
  planSuccessRateDelta90d: number;
  /** Net flow ratio (net flows / starting AUM) over the trailing period. */
  netFlowRatio: number;
}

/**
 * Configuration for the BigQuery ML churn prediction model.
 */
export interface ChurnModelConfig {
  /** ML model type (e.g. "LOGISTIC_REG", "BOOSTED_TREE_CLASSIFIER"). */
  modelType: string;
  /** List of input feature column names. */
  inputFeatures: string[];
  /** Class weights for handling imbalanced data (e.g. { "0": 1, "1": 5 }). */
  classWeights: Record<string, number>;
  /** L2 regularization strength. */
  l2Reg: number;
  /** Maximum training iterations. */
  maxIterations: number;
  /** Fraction of data used for training (remainder for evaluation). */
  dataSplitFraction: number;
  /** Cron expression or description for model refresh schedule. */
  refreshSchedule: string;
}

/**
 * BigQuery ML SQL for creating / training the churn prediction model.
 *
 * This query creates a logistic regression model using household-level
 * features including engagement, plan health, flow ratios, and portal usage.
 */
export const ChurnModelTrainingSQL = `
CREATE OR REPLACE MODEL \`farther-prism.fp_pulse.churn_prediction_model\`
OPTIONS (
  model_type = 'LOGISTIC_REG',
  input_label_cols = ['churned'],
  auto_class_weights = TRUE,
  l2_reg = 0.1,
  max_iterations = 50,
  data_split_method = 'AUTO_SPLIT',
  data_split_eval_fraction = 0.2
) AS
SELECT
  h.household_id,
  -- Engagement features
  COALESCE(e.days_since_last_contact, 365) AS days_since_last_contact,
  COALESCE(e.portal_sessions_last_90d, 0) AS portal_sessions_last_90d,
  COALESCE(e.emails_opened_last_90d, 0) AS emails_opened_last_90d,
  COALESCE(e.meetings_last_180d, 0) AS meetings_last_180d,
  -- Plan health features
  COALESCE(p.plan_success_rate, 0) AS plan_success_rate,
  COALESCE(p.plan_success_rate_delta_90d, 0) AS plan_success_rate_delta_90d,
  COALESCE(p.goals_on_track_pct, 0) AS goals_on_track_pct,
  -- Flow features
  COALESCE(f.net_flow_ratio_90d, 0) AS net_flow_ratio_90d,
  COALESCE(f.net_flow_ratio_180d, 0) AS net_flow_ratio_180d,
  COALESCE(f.withdrawal_count_90d, 0) AS withdrawal_count_90d,
  -- Portfolio features
  COALESCE(port.drift_score, 0) AS drift_score,
  COALESCE(port.risk_alignment_score, 0) AS risk_alignment_score,
  -- Demographic features
  h.aum,
  h.tenure_months,
  h.household_size,
  -- Label
  CASE WHEN h.status = 'TERMINATED' AND h.terminated_at >= DATE_SUB(CURRENT_DATE(), INTERVAL 12 MONTH)
       THEN 1 ELSE 0 END AS churned
FROM \`farther-prism.fp_pulse.household_features\` h
LEFT JOIN \`farther-prism.fp_pulse.engagement_features\` e USING (household_id)
LEFT JOIN \`farther-prism.fp_pulse.plan_features\` p USING (household_id)
LEFT JOIN \`farther-prism.fp_pulse.flow_features\` f USING (household_id)
LEFT JOIN \`farther-prism.fp_pulse.portfolio_features\` port USING (household_id)
WHERE h.aum > 0;
`;

/**
 * BigQuery ML SQL for scoring households with the churn prediction model.
 *
 * This query applies the trained model to all active households and returns
 * predicted churn probability alongside key feature values for explainability.
 */
export const ChurnScoringSQL = `
SELECT
  h.household_id,
  h.household_name,
  h.advisor_id,
  a.advisor_name,
  h.aum,
  pred.prob AS churn_risk_score,
  CASE
    WHEN pred.prob >= 0.80 THEN 'critical'
    WHEN pred.prob >= 0.60 THEN 'elevated'
    WHEN pred.prob >= 0.40 THEN 'watch'
    ELSE 'healthy'
  END AS churn_risk_label,
  h.aum * COALESCE(b.fee_rate, 0.01) AS annual_revenue_at_risk,
  COALESCE(e.days_since_last_contact, 365) AS days_since_last_contact,
  COALESCE(e.portal_sessions_last_90d, 0) AS portal_sessions_last_90d,
  COALESCE(p.plan_success_rate_delta_90d, 0) AS plan_success_rate_delta_90d,
  COALESCE(f.net_flow_ratio_90d, 0) AS net_flow_ratio,
  pred.prob AS _raw_probability,
  CURRENT_TIMESTAMP() AS scored_at
FROM ML.PREDICT(
  MODEL \`farther-prism.fp_pulse.churn_prediction_model\`,
  (
    SELECT
      h.household_id,
      COALESCE(e.days_since_last_contact, 365) AS days_since_last_contact,
      COALESCE(e.portal_sessions_last_90d, 0) AS portal_sessions_last_90d,
      COALESCE(e.emails_opened_last_90d, 0) AS emails_opened_last_90d,
      COALESCE(e.meetings_last_180d, 0) AS meetings_last_180d,
      COALESCE(p.plan_success_rate, 0) AS plan_success_rate,
      COALESCE(p.plan_success_rate_delta_90d, 0) AS plan_success_rate_delta_90d,
      COALESCE(p.goals_on_track_pct, 0) AS goals_on_track_pct,
      COALESCE(f.net_flow_ratio_90d, 0) AS net_flow_ratio_90d,
      COALESCE(f.net_flow_ratio_180d, 0) AS net_flow_ratio_180d,
      COALESCE(f.withdrawal_count_90d, 0) AS withdrawal_count_90d,
      COALESCE(port.drift_score, 0) AS drift_score,
      COALESCE(port.risk_alignment_score, 0) AS risk_alignment_score,
      h.aum,
      h.tenure_months,
      h.household_size
    FROM \`farther-prism.fp_pulse.household_features\` h
    LEFT JOIN \`farther-prism.fp_pulse.engagement_features\` e USING (household_id)
    LEFT JOIN \`farther-prism.fp_pulse.plan_features\` p USING (household_id)
    LEFT JOIN \`farther-prism.fp_pulse.flow_features\` f USING (household_id)
    LEFT JOIN \`farther-prism.fp_pulse.portfolio_features\` port USING (household_id)
    WHERE h.status = 'ACTIVE' AND h.aum > 0
  )
) pred
JOIN \`farther-prism.fp_pulse.household_features\` h USING (household_id)
JOIN \`farther-prism.fp_pulse.advisors\` a ON h.advisor_id = a.advisor_id
LEFT JOIN \`farther-prism.fp_pulse.engagement_features\` e ON h.household_id = e.household_id
LEFT JOIN \`farther-prism.fp_pulse.plan_features\` p ON h.household_id = p.household_id
LEFT JOIN \`farther-prism.fp_pulse.flow_features\` f ON h.household_id = f.household_id
LEFT JOIN \`farther-prism.fp_pulse.billing_rates\` b ON h.household_id = b.household_id
ORDER BY pred.prob DESC;
`;

// =====================================================================
// Natural Language Query Engine
// =====================================================================

/**
 * Chart type for rendering query results.
 * null indicates the query engine could not determine an appropriate chart.
 */
export type ChartType = 'bar' | 'line' | 'pie' | 'table' | 'scatter' | 'number' | null;

/**
 * Configuration for rendering a chart from query results.
 */
export interface ChartConfig {
  /** Column name to use as the x-axis, or null for single-value charts. */
  xAxis: string | null;
  /** Column name to use as the y-axis, or null for single-value charts. */
  yAxis: string | null;
  /** Chart title text. */
  title: string;
  /** Ordered list of color hex codes for data series. */
  colors: string[];
  /** Whether to render bars/areas as stacked. */
  stacked: boolean;
}

/**
 * A single recommended action derived from query results.
 */
export interface ActionItem {
  /** Human-readable action description. */
  action: string;
  /** Priority level for the action. */
  priority: 'critical' | 'high' | 'normal' | 'low';
  /** Optional household this action pertains to. */
  householdId?: string;
  /** Optional advisor this action pertains to. */
  advisorId?: AdvisorId;
}

/**
 * Complete result from a natural language query, including the generated SQL,
 * result rows, chart configuration, AI narrative, and follow-up suggestions.
 */
export interface QueryResult {
  /** Unique identifier for this query execution. */
  queryId: QueryId;
  /** The original natural language question. */
  question: string;
  /** The generated BigQuery SQL that was executed. */
  sql: string;
  /** Result rows as an array of key-value records. */
  rows: Record<string, unknown>[];
  /** Recommended chart type for visualizing results. */
  chartType: ChartType;
  /** Chart rendering configuration. */
  chartConfig: ChartConfig;
  /** AI-generated plain-English narrative summarizing the results. */
  narrative: string;
  /** Recommended actions derived from the query results. */
  recommendedActions: ActionItem[];
  /** Suggested follow-up questions for deeper analysis. */
  followUpQuestions: string[];
  /** Confidence score for the generated SQL and results (0-1). */
  confidence: number;
  /** ISO 8601 timestamp indicating freshness of the underlying data. */
  dataAsOf: string;
  /** Query execution time in milliseconds. */
  executionTimeMs: number;
}

/**
 * Context provided to the query engine to scope results
 * and enforce role-based data access.
 */
export interface QueryContext {
  /** Firm to scope queries to. */
  firmId: FirmId;
  /** Optional advisor to scope queries to (null for firm-wide). */
  advisorId: AdvisorId | null;
  /** Dashboard role of the requesting user. */
  role: DashboardRole;
  /** IANA timezone of the requesting user (e.g. "America/New_York"). */
  timezone: string;
}

/**
 * Category for pre-built quick queries.
 */
export type QuickQueryCategory =
  | 'RETENTION'
  | 'GROWTH'
  | 'REVENUE'
  | 'PLANNING'
  | 'OPERATIONS';

/**
 * A pre-built natural language question that users can select
 * from the quick-query palette.
 */
export interface QuickQuery {
  /** The natural language question text. */
  question: string;
  /** Category grouping for the query palette. */
  category: QuickQueryCategory;
}

/**
 * Pre-built quick queries covering the most common analytical questions
 * across retention, growth, revenue, planning, and operations.
 */
export const QUICK_QUERIES: QuickQuery[] = [
  // Retention
  {
    question: 'Which clients are at highest risk of leaving in the next 90 days?',
    category: 'RETENTION',
  },
  {
    question: 'Show me all households with no advisor contact in the last 6 months.',
    category: 'RETENTION',
  },
  {
    question: 'What is our client retention rate by advisor over the past 12 months?',
    category: 'RETENTION',
  },
  {
    question: 'Which at-risk clients have the most AUM?',
    category: 'RETENTION',
  },
  // Growth
  {
    question: 'What is our net new asset growth month over month this year?',
    category: 'GROWTH',
  },
  {
    question: 'Which advisors are growing their book the fastest?',
    category: 'GROWTH',
  },
  {
    question: 'Show me the largest held-away asset opportunities.',
    category: 'GROWTH',
  },
  {
    question: 'What is our pipeline conversion rate by stage?',
    category: 'GROWTH',
  },
  {
    question: 'How does our organic growth rate compare to industry benchmarks?',
    category: 'GROWTH',
  },
  // Revenue
  {
    question: 'What is our revenue breakdown by AUM tier?',
    category: 'REVENUE',
  },
  {
    question: 'Which households generate the most revenue relative to their AUM?',
    category: 'REVENUE',
  },
  {
    question: 'How much revenue is at risk from at-risk households?',
    category: 'REVENUE',
  },
  {
    question: 'Show me revenue trends and projections for the next 6 months.',
    category: 'REVENUE',
  },
  {
    question: 'What is the average fee rate by AUM tier?',
    category: 'REVENUE',
  },
  // Planning
  {
    question: 'How many financial plans have a Monte Carlo success rate below 70%?',
    category: 'PLANNING',
  },
  {
    question: 'Which households have stale plans that have not been updated in over a year?',
    category: 'PLANNING',
  },
  {
    question: 'Show me households approaching RMD deadlines in the next 60 days.',
    category: 'PLANNING',
  },
  {
    question: 'What is the distribution of plan health scores across all advisors?',
    category: 'PLANNING',
  },
  {
    question: 'Which clients have Roth conversion opportunities this year?',
    category: 'PLANNING',
  },
  // Operations
  {
    question: 'Are there any custodian data sync failures in the last 24 hours?',
    category: 'OPERATIONS',
  },
  {
    question: 'What is our data completeness score by category?',
    category: 'OPERATIONS',
  },
  {
    question: 'Show me upcoming billing cycles and any billing exceptions.',
    category: 'OPERATIONS',
  },
  {
    question: 'Which advisors have the lowest platform adoption scores?',
    category: 'OPERATIONS',
  },
];

// =====================================================================
// Alert Engine
// =====================================================================

/**
 * Priority level for alerts, determining sort order and visual treatment.
 */
export type AlertPriority = 'critical' | 'high' | 'normal' | 'low';

/**
 * Functional category for grouping and filtering alerts.
 */
export type AlertCategory =
  | 'RETENTION'
  | 'PLANNING'
  | 'REVENUE'
  | 'OPERATIONS'
  | 'COMPLIANCE'
  | 'GROWTH';

/**
 * Delivery channel for alert notifications.
 */
export type AlertChannel =
  | 'DASHBOARD'
  | 'EMAIL'
  | 'SLACK'
  | 'HUBSPOT_TASK';

/**
 * Lifecycle status of an alert instance.
 */
export type AlertStatus =
  | 'ACTIVE'
  | 'ACKNOWLEDGED'
  | 'RESOLVED'
  | 'SNOOZED'
  | 'DISMISSED';

/**
 * Template key for suggested actions attached to alerts.
 * Each template maps to a specific workflow in the platform.
 */
export type AlertActionTemplate =
  | 'schedule_check_in'
  | 'outreach_call'
  | 'schedule_plan_review'
  | 'initiate_rmd'
  | 'generate_roth_analysis'
  | 'call_client_now'
  | 'investigate_sync_error'
  | 'review_billing';

/**
 * Definition of an alert rule. Rules are evaluated on a schedule
 * (or in response to events) and generate Alert instances when triggered.
 */
export interface AlertRule {
  /** Unique identifier for the rule. */
  id: string;
  /** Human-readable rule name. */
  name: string;
  /** Description of what the rule detects and why it matters. */
  description: string;
  /** BigQuery SQL query that identifies matching rows. */
  query: string;
  /** Category for grouping the resulting alerts. */
  category: AlertCategory;
  /** Default priority for alerts generated by this rule. */
  priority: AlertPriority;
  /** Suggested action template for the generated alerts. */
  actionTemplate: AlertActionTemplate;
  /** Whether to notify the assigned advisor. */
  notifyAdvisor: boolean;
  /** Whether to notify the MD/Principal (can be a boolean or a row-level predicate). */
  notifyMD: boolean | ((row: Record<string, unknown>) => boolean);
  /** Whether to notify the operations team. */
  notifyOps: boolean;
  /** Delivery channels for the notifications. */
  channels: AlertChannel[];
  /** Minimum number of days between repeat alerts for the same entity. */
  cooldownDays: number;
  /** Whether this rule is currently active. */
  isActive: boolean;
}

/**
 * A single alert instance generated by an AlertRule evaluation.
 */
export interface Alert {
  /** Unique identifier for this alert instance. */
  alertId: AlertId;
  /** ID of the rule that generated this alert. */
  ruleId: string;
  /** Name of the rule that generated this alert. */
  ruleName: string;
  /** Category of the alert. */
  category: AlertCategory;
  /** Priority of the alert. */
  priority: AlertPriority;
  /** Current lifecycle status. */
  status: AlertStatus;
  /** Household this alert pertains to, if applicable. */
  householdId: string | null;
  /** Household name for display, if applicable. */
  householdName: string | null;
  /** Advisor associated with this alert. */
  advisorId: AdvisorId;
  /** Advisor name for display. */
  advisorName: string;
  /** Human-readable alert message. */
  message: string;
  /** Suggested action template for resolution. */
  actionTemplate: AlertActionTemplate;
  /** ISO 8601 timestamp when the alert was created. */
  createdAt: string;
  /** ISO 8601 timestamp when the alert was acknowledged, or null. */
  acknowledgedAt: string | null;
  /** ISO 8601 timestamp when the alert was resolved, or null. */
  resolvedAt: string | null;
  /** ISO 8601 timestamp until which the alert is snoozed, or null. */
  snoozedUntil: string | null;
  /** Arbitrary metadata attached to the alert by the rule evaluation. */
  metadata: Record<string, unknown>;
}

/**
 * Pre-configured alert rules covering the core monitoring scenarios
 * for retention, planning, revenue, operations, and compliance.
 */
export const ALERT_RULES: AlertRule[] = [
  {
    id: 'churn_risk_elevated',
    name: 'Elevated Churn Risk',
    description:
      'Triggers when a household\'s churn risk score crosses above the elevated threshold (60+), indicating significant risk of client departure requiring immediate advisor attention.',
    query: `
      SELECT household_id, household_name, advisor_id, advisor_name, aum,
             churn_risk_score, churn_risk_label, annual_revenue_at_risk
      FROM \`farther-prism.fp_pulse.churn_scores_latest\`
      WHERE churn_risk_score >= 60
        AND household_id NOT IN (
          SELECT entity_id FROM \`farther-prism.fp_pulse.alert_cooldowns\`
          WHERE rule_id = 'churn_risk_elevated'
            AND cooldown_until > CURRENT_TIMESTAMP()
        )
      ORDER BY churn_risk_score DESC;
    `,
    category: 'RETENTION',
    priority: 'critical',
    actionTemplate: 'outreach_call',
    notifyAdvisor: true,
    notifyMD: (row) => (row['aum'] as number) >= 5_000_000,
    notifyOps: false,
    channels: ['DASHBOARD', 'EMAIL', 'SLACK'],
    cooldownDays: 14,
    isActive: true,
  },
  {
    id: 'no_contact_high_value',
    name: 'No Contact — High Value Client',
    description:
      'Triggers when a household with AUM >= $1M has not been contacted by their advisor in over 90 days, risking disengagement and potential churn.',
    query: `
      SELECT h.household_id, h.household_name, h.advisor_id, a.advisor_name, h.aum,
             e.days_since_last_contact
      FROM \`farther-prism.fp_pulse.household_features\` h
      JOIN \`farther-prism.fp_pulse.advisors\` a ON h.advisor_id = a.advisor_id
      LEFT JOIN \`farther-prism.fp_pulse.engagement_features\` e USING (household_id)
      WHERE h.status = 'ACTIVE'
        AND h.aum >= 1000000
        AND COALESCE(e.days_since_last_contact, 365) > 90
      ORDER BY h.aum DESC;
    `,
    category: 'RETENTION',
    priority: 'high',
    actionTemplate: 'schedule_check_in',
    notifyAdvisor: true,
    notifyMD: false,
    notifyOps: false,
    channels: ['DASHBOARD', 'EMAIL'],
    cooldownDays: 30,
    isActive: true,
  },
  {
    id: 'plan_success_dropped',
    name: 'Plan Success Rate Dropped',
    description:
      'Triggers when a household\'s Monte Carlo plan success rate drops by 10+ percentage points over 90 days, indicating a material change in financial plan viability.',
    query: `
      SELECT h.household_id, h.household_name, h.advisor_id, a.advisor_name, h.aum,
             p.plan_success_rate, p.plan_success_rate_delta_90d
      FROM \`farther-prism.fp_pulse.household_features\` h
      JOIN \`farther-prism.fp_pulse.advisors\` a ON h.advisor_id = a.advisor_id
      JOIN \`farther-prism.fp_pulse.plan_features\` p USING (household_id)
      WHERE h.status = 'ACTIVE'
        AND p.plan_success_rate_delta_90d <= -0.10
      ORDER BY p.plan_success_rate_delta_90d ASC;
    `,
    category: 'PLANNING',
    priority: 'high',
    actionTemplate: 'schedule_plan_review',
    notifyAdvisor: true,
    notifyMD: false,
    notifyOps: false,
    channels: ['DASHBOARD', 'EMAIL'],
    cooldownDays: 30,
    isActive: true,
  },
  {
    id: 'rmd_deadline_approaching',
    name: 'RMD Deadline Approaching',
    description:
      'Triggers when a household has an upcoming Required Minimum Distribution deadline within 60 days and the RMD has not yet been initiated.',
    query: `
      SELECT h.household_id, h.household_name, h.advisor_id, a.advisor_name, h.aum,
             r.rmd_amount, r.rmd_deadline, r.rmd_status
      FROM \`farther-prism.fp_pulse.household_features\` h
      JOIN \`farther-prism.fp_pulse.advisors\` a ON h.advisor_id = a.advisor_id
      JOIN \`farther-prism.fp_pulse.rmd_schedule\` r USING (household_id)
      WHERE r.rmd_status = 'PENDING'
        AND r.rmd_deadline BETWEEN CURRENT_DATE() AND DATE_ADD(CURRENT_DATE(), INTERVAL 60 DAY)
      ORDER BY r.rmd_deadline ASC;
    `,
    category: 'COMPLIANCE',
    priority: 'critical',
    actionTemplate: 'initiate_rmd',
    notifyAdvisor: true,
    notifyMD: true,
    notifyOps: true,
    channels: ['DASHBOARD', 'EMAIL', 'SLACK', 'HUBSPOT_TASK'],
    cooldownDays: 7,
    isActive: true,
  },
  {
    id: 'roth_conversion_window',
    name: 'Roth Conversion Window',
    description:
      'Triggers when a household has a favorable Roth conversion window — low-income year, large IRA balance, or pre-IRMAA threshold — enabling proactive tax planning outreach.',
    query: `
      SELECT h.household_id, h.household_name, h.advisor_id, a.advisor_name, h.aum,
             rc.estimated_tax_savings, rc.ira_balance, rc.current_bracket, rc.optimal_conversion_amount
      FROM \`farther-prism.fp_pulse.household_features\` h
      JOIN \`farther-prism.fp_pulse.advisors\` a ON h.advisor_id = a.advisor_id
      JOIN \`farther-prism.fp_pulse.roth_conversion_candidates\` rc USING (household_id)
      WHERE rc.is_favorable_window = TRUE
        AND h.status = 'ACTIVE'
      ORDER BY rc.estimated_tax_savings DESC;
    `,
    category: 'PLANNING',
    priority: 'normal',
    actionTemplate: 'generate_roth_analysis',
    notifyAdvisor: true,
    notifyMD: false,
    notifyOps: false,
    channels: ['DASHBOARD', 'EMAIL'],
    cooldownDays: 90,
    isActive: true,
  },
  {
    id: 'large_aum_outflow',
    name: 'Large AUM Outflow Detected',
    description:
      'Triggers when a household experiences an outflow exceeding 10% of AUM or $500K (whichever is lower) within a 30-day rolling window, signaling potential relationship deterioration.',
    query: `
      SELECT h.household_id, h.household_name, h.advisor_id, a.advisor_name, h.aum,
             f.outflow_30d, f.outflow_30d / h.aum AS outflow_pct
      FROM \`farther-prism.fp_pulse.household_features\` h
      JOIN \`farther-prism.fp_pulse.advisors\` a ON h.advisor_id = a.advisor_id
      JOIN \`farther-prism.fp_pulse.flow_features\` f USING (household_id)
      WHERE h.status = 'ACTIVE'
        AND (f.outflow_30d / h.aum > 0.10 OR f.outflow_30d > 500000)
      ORDER BY f.outflow_30d DESC;
    `,
    category: 'RETENTION',
    priority: 'critical',
    actionTemplate: 'call_client_now',
    notifyAdvisor: true,
    notifyMD: true,
    notifyOps: false,
    channels: ['DASHBOARD', 'EMAIL', 'SLACK'],
    cooldownDays: 7,
    isActive: true,
  },
  {
    id: 'custodian_sync_failed',
    name: 'Custodian Data Sync Failed',
    description:
      'Triggers when a custodian data feed has not successfully synced in over 4 hours or has reported errors, potentially causing stale portfolio and account data.',
    query: `
      SELECT custodian_name, last_sync_at, latency_ms, error_count_24h, status,
             TIMESTAMP_DIFF(CURRENT_TIMESTAMP(), last_sync_at, HOUR) AS hours_since_sync
      FROM \`farther-prism.fp_pulse.custodian_sync_status\`
      WHERE status IN ('degraded', 'failing')
         OR TIMESTAMP_DIFF(CURRENT_TIMESTAMP(), last_sync_at, HOUR) > 4
      ORDER BY hours_since_sync DESC;
    `,
    category: 'OPERATIONS',
    priority: 'critical',
    actionTemplate: 'investigate_sync_error',
    notifyAdvisor: false,
    notifyMD: false,
    notifyOps: true,
    channels: ['DASHBOARD', 'SLACK'],
    cooldownDays: 1,
    isActive: true,
  },
  {
    id: 'billing_exception_detected',
    name: 'Billing Exception Detected',
    description:
      'Triggers when billing calculations produce exceptions — fee overrides, missing fee schedules, or AUM/fee mismatches — requiring operations review before the next billing cycle.',
    query: `
      SELECT h.household_id, h.household_name, h.advisor_id, a.advisor_name, h.aum,
             b.exception_type, b.expected_fee, b.actual_fee, b.fee_delta,
             b.next_billing_date
      FROM \`farther-prism.fp_pulse.billing_exceptions\` b
      JOIN \`farther-prism.fp_pulse.household_features\` h ON b.household_id = h.household_id
      JOIN \`farther-prism.fp_pulse.advisors\` a ON h.advisor_id = a.advisor_id
      WHERE b.status = 'OPEN'
        AND b.next_billing_date <= DATE_ADD(CURRENT_DATE(), INTERVAL 14 DAY)
      ORDER BY ABS(b.fee_delta) DESC;
    `,
    category: 'REVENUE',
    priority: 'high',
    actionTemplate: 'review_billing',
    notifyAdvisor: false,
    notifyMD: false,
    notifyOps: true,
    channels: ['DASHBOARD', 'EMAIL'],
    cooldownDays: 7,
    isActive: true,
  },
];

// =====================================================================
// Advisor Daily Actions
// =====================================================================

/**
 * Urgency level for daily action items, determining sort order
 * and visual prominence.
 */
export type ActionUrgency = 'URGENT' | 'HIGH' | 'NORMAL' | 'LOW';

/**
 * Filter category for the daily action list sidebar.
 */
export type ActionCategory =
  | 'ALL'
  | 'URGENT'
  | 'PLANNING'
  | 'ENGAGEMENT'
  | 'COMPLIANCE';

/**
 * Type of action button available on a daily action item.
 */
export type DailyActionType =
  | 'CALL'
  | 'EMAIL'
  | 'OPEN_MODULE'
  | 'SCHEDULE'
  | 'MARK_COMPLETE'
  | 'SNOOZE'
  | 'VIEW';

/**
 * A single action item in the advisor's daily prioritized to-do list.
 */
export interface DailyActionItem {
  /** Unique identifier for the action item. */
  id: string;
  /** Household this action pertains to. */
  householdId: string;
  /** Display name for the household. */
  householdName: string;
  /** Total AUM for the household. */
  aum: number;
  /** Urgency level. */
  urgency: ActionUrgency;
  /** Functional category. */
  category: ActionCategory;
  /** Short title for the action item. */
  title: string;
  /** Detailed description of the action and why it matters. */
  description: string;
  /** Available action buttons. */
  actions: Array<{
    /** Button label text. */
    label: string;
    /** Type of action this button triggers. */
    actionType: DailyActionType;
  }>;
  /** Composite priority score (higher = more urgent) for sorting. */
  priorityScore: number;
  /** Human-readable factors that contributed to the priority score. */
  priorityFactors: string[];
}

/**
 * The complete daily action list for an advisor, including a personalized
 * greeting, prioritized items, and category counts for the filter sidebar.
 */
export interface DailyActionList {
  /** Advisor this action list is for. */
  advisorId: AdvisorId;
  /** Advisor's display name. */
  advisorName: string;
  /** Personalized greeting message (e.g. "Good morning, Sarah. You have 7 items today."). */
  greeting: string;
  /** Prioritized list of action items for today. */
  items: DailyActionItem[];
  /** Count of items per category for the filter sidebar. */
  categoryCounts: Record<ActionCategory, number>;
}

// =====================================================================
// Operations Dashboard
// =====================================================================

/**
 * Data quality metric for a specific data category,
 * showing completeness and staleness.
 */
export interface DataQualityMetric {
  /** Data category name (e.g. "Contact Information", "Account Holdings"). */
  category: string;
  /** Completion score (0-100) for this category. */
  completionScore: number;
  /** Number of records with missing required data. */
  missingDataCount: number;
  /** Number of records with stale sync data (not updated within SLA). */
  staleSyncCount: number;
}

/**
 * Current billing status and upcoming cycle information.
 */
export interface BillingStatus {
  /** Number of upcoming billing cycles within the next 30 days. */
  upcomingCycles: number;
  /** Number of billing errors requiring resolution. */
  errors: number;
  /** Number of billing exceptions (e.g. fee overrides, mismatches). */
  exceptions: number;
  /** ISO 8601 date of the next billing cycle. */
  nextBillingDate: string;
}

/**
 * Health status of a custodian data feed connection.
 */
export interface CustodianSyncHealth {
  /** Name of the custodian (e.g. "Schwab", "Fidelity", "Pershing"). */
  custodianName: string;
  /** Current sync status. */
  status: 'healthy' | 'degraded' | 'failing';
  /** ISO 8601 timestamp of the last successful sync. */
  lastSyncAt: string;
  /** Sync latency in milliseconds. */
  latencyMs: number;
  /** Number of sync errors in the last 24 hours. */
  errorCount24h: number;
}

/**
 * Platform tool adoption tracking for a single advisor.
 */
export interface PlatformAdoption {
  /** Advisor identifier. */
  advisorId: AdvisorId;
  /** Advisor's display name. */
  advisorName: string;
  /** Tool usage map — keys are tool names, values are usage details. */
  toolUsage: Record<string, {
    /** Whether the advisor has ever used this tool. */
    used: boolean;
    /** ISO 8601 timestamp of last usage, or null if never used. */
    lastUsedAt: string | null;
  }>;
}

// =====================================================================
// Strategic Intelligence
// =====================================================================

/**
 * A held-away asset opportunity identified for a household,
 * representing potential AUM consolidation.
 */
export interface GrowthOpportunity {
  /** Household with the held-away assets. */
  householdId: string;
  /** Household display name. */
  householdName: string;
  /** Advisor assigned to the household. */
  advisorName: string;
  /** Estimated AUM held away at other institutions. */
  heldAwayAum: number;
  /** Estimated probability of consolidating the held-away assets (0-1). */
  probabilityToConsolidate: number;
  /** Trigger event or reason that makes consolidation timely. */
  trigger: string;
}

/**
 * Category for cross-household service consolidation opportunities.
 */
export type ConsolidationCategory =
  | 'TAX_PLANNING'
  | 'ESTATE_PLAN'
  | 'ALTERNATIVE_INVESTMENTS'
  | 'MULTI_ADVISOR_COORDINATION';

/**
 * A service consolidation opportunity across multiple households.
 */
export interface ConsolidationOpportunity {
  /** Type of consolidation opportunity. */
  category: ConsolidationCategory;
  /** Number of households that could benefit. */
  householdCount: number;
  /** Average AUM of qualifying households. */
  avgAum: number;
  /** Description of the opportunity and expected client benefit. */
  description: string;
}

/**
 * Capacity analysis for a single advisor, indicating whether
 * they can take on additional clients.
 */
export interface CapacityAnalysis {
  /** Advisor identifier. */
  advisorId: AdvisorId;
  /** Advisor's display name. */
  advisorName: string;
  /** Current capacity utilization as a percentage (0-100). */
  currentCapacityPct: number;
  /** AUM per household ratio — proxy for client complexity. */
  aumPerHouseholdRatio: number;
  /** Number of households assigned to the advisor. */
  householdCount: number;
  /** Whether the advisor is at or near capacity. */
  isAtCapacity: boolean;
  /** Estimated years until advisor retirement, or null if not applicable. */
  retirementYears: number | null;
}

/**
 * A single benchmark comparison showing Farther's metric vs. industry quartiles.
 */
export interface BenchmarkMetric {
  /** Name of the metric being benchmarked. */
  metric: string;
  /** Farther's value for this metric. */
  fartherValue: number;
  /** Industry top quartile (75th percentile) value. */
  topQuartile: number;
  /** Industry median (50th percentile) value. */
  median: number;
  /** Farther's percentile rank within the industry, or null if unavailable. */
  percentile: number | null;
}

// =====================================================================
// MD / Principal Dashboard (Aggregated)
// =====================================================================

/**
 * Complete data payload for the MD/Principal dashboard,
 * aggregating all firm-wide analytics into a single structure.
 */
export interface MDDashboardData {
  /** Firm-level KPI cards. */
  firmKPIs: FirmKPIs;
  /** AUM growth analytics. */
  aumGrowth: {
    /** AUM growth attribution breakdown for the current period. */
    attribution: AumGrowthAttribution;
    /** Time series data for charting AUM growth over time. */
    timeSeries: AumTimeSeriesPoint[];
  };
  /** Advisor scorecard leaderboard. */
  advisorScorecards: AdvisorScorecard[];
  /** Client health heatmap data. */
  clientHealthHeatmap: ClientHealthHeatmapData;
  /** Revenue intelligence data. */
  revenueIntelligence: {
    /** Revenue composition by tier, type, and advisor. */
    composition: RevenueComposition;
    /** Revenue time series (actual vs. projected). */
    timeSeries: RevenueTimeSeriesPoint[];
    /** Revenue at risk from at-risk households. */
    atRisk: RevenueAtRisk;
  };
  /** Strategic intelligence insights. */
  strategicIntelligence: {
    /** Held-away asset growth opportunities. */
    growthOpps: GrowthOpportunity[];
    /** Cross-household consolidation opportunities. */
    consolidationOpps: ConsolidationOpportunity[];
    /** Advisor capacity analysis. */
    capacityAnalysis: CapacityAnalysis[];
    /** Industry benchmark comparisons. */
    benchmarks: BenchmarkMetric[];
  };
}

// =====================================================================
// Advisor Dashboard (Individual Book View)
// =====================================================================

/**
 * Complete data payload for the individual advisor dashboard,
 * focusing on the advisor's book of business and daily priorities.
 */
export interface AdvisorDashboardData {
  /** Personalized greeting message. */
  greeting: string;
  /** Prioritized daily action list. */
  dailyActions: DailyActionList;
  /** Book-of-business overview. */
  bookOverview: {
    /** Advisor-level KPI cards. */
    kpis: KPICard[];
    /** Client health grid for the advisor's households. */
    clientHealthGrid: HouseholdHealthEntry[];
  };
  /** Engagement analytics for the advisor's book. */
  engagementAnalytics: EngagementMetrics;
  /** Planning quality metrics for the advisor's households. */
  planningQuality: PlanningQualityMetrics;
  /** Prospect and proposal pipeline. */
  pipeline: PipelineFunnel;
}

// =====================================================================
// Operations Dashboard
// =====================================================================

/**
 * Complete data payload for the operations dashboard,
 * covering data quality, billing, compliance, and platform health.
 */
export interface OperationsDashboardData {
  /** Data quality metrics by category. */
  dataQuality: DataQualityMetric[];
  /** Current billing status and upcoming cycles. */
  billingStatus: BillingStatus;
  /** Compliance calendar events (ISO date strings of upcoming deadlines). */
  complianceCalendar: Array<{
    /** ISO 8601 date of the compliance deadline. */
    date: string;
    /** Description of the compliance event. */
    description: string;
    /** Category of the compliance event. */
    category: string;
    /** Number of affected households. */
    affectedHouseholds: number;
  }>;
  /** Custodian data sync health statuses. */
  custodianSyncHealth: CustodianSyncHealth[];
  /** Platform adoption metrics by advisor. */
  platformAdoption: PlatformAdoption[];
  /** Support queue summary. */
  supportQueue: {
    /** Number of open support tickets. */
    openTickets: number;
    /** Number of tickets assigned and in progress. */
    inProgressTickets: number;
    /** Average resolution time in hours. */
    avgResolutionTimeHours: number;
    /** Number of escalated tickets. */
    escalatedTickets: number;
  };
}

// =====================================================================
// Pipeline
// =====================================================================

/**
 * Stage in the prospect-to-client pipeline funnel.
 */
export type PipelineStage =
  | 'PROSPECT'
  | 'IN_DISCOVERY'
  | 'PROPOSAL_SENT'
  | 'PROPOSAL_VIEWED'
  | 'CLOSING'
  | 'WON'
  | 'LOST';

/**
 * Pipeline funnel data showing conversion through each stage,
 * with comparison to firm averages.
 */
export interface PipelineFunnel {
  /** Ordered list of pipeline stages with counts and potential AUM. */
  stages: Array<{
    /** The pipeline stage. */
    stage: PipelineStage;
    /** Number of prospects/clients currently at this stage. */
    count: number;
    /** Total potential AUM at this stage. */
    potentialAum: number;
  }>;
  /** Overall pipeline conversion rate (prospects to won) as a decimal. */
  conversionRate: number;
  /** Firm-wide average pipeline conversion rate for comparison. */
  firmAvgConversionRate: number;
  /** Average number of days from prospect to won/lost. */
  avgDaysToClose: number;
  /** Firm-wide average days to close for comparison. */
  firmAvgDaysToClose: number;
}

// =====================================================================
// Engagement Analytics
// =====================================================================

/**
 * Contact frequency data for a single time period (day/week/month),
 * broken down by communication channel.
 */
export interface ContactFrequency {
  /** Date of the data point (ISO 8601). */
  date: string;
  /** Number of phone calls. */
  calls: number;
  /** Number of meetings (in-person or video). */
  meetings: number;
  /** Number of emails sent. */
  emails: number;
  /** Number of portal/chat messages. */
  portalMessages: number;
  /** Total contacts across all channels. */
  total: number;
}

/**
 * Comprehensive engagement metrics for an advisor's book of business,
 * including contact frequency trends, client outreach coverage, and portal adoption.
 */
export interface EngagementMetrics {
  /** Contact frequency time series (typically monthly). */
  contactFrequency: ContactFrequency[];
  /** Clients contacted in the last 90 days. */
  clientsContactedLast90d: {
    count: number;
    pct: number;
  };
  /** Clients NOT contacted in the last 90 days, grouped by AUM tier. */
  clientsNotContactedLast90d: {
    byAumTier: Array<{
      /** AUM tier label (e.g. "Under $1M", "$1M-$5M"). */
      tier: string;
      /** Number of un-contacted clients in this tier. */
      count: number;
      /** Urgency level for outreach. */
      urgency: ActionUrgency;
    }>;
  };
  /** Client portal engagement breakdown. */
  portalEngagement: {
    /** Clients who logged in within the last 30 days. */
    active: { count: number; pct: number };
    /** Clients who last logged in 30-90 days ago. */
    inactive: { count: number; pct: number };
    /** Clients who have not logged in for 90+ days or have never logged in. */
    dormant: { count: number; pct: number };
  };
}

// =====================================================================
// Planning Quality
// =====================================================================

/**
 * Distribution of plan outcomes across health categories.
 */
export interface PlanQualityDistribution {
  /** Plans on track (success rate >= 80%). */
  onTrack: { count: number; pct: number };
  /** Plans in watch zone (success rate 60-79%). */
  watch: { count: number; pct: number };
  /** Plans at risk (success rate 40-59%). */
  atRisk: { count: number; pct: number };
  /** Plans in critical state (success rate < 40%). */
  critical: { count: number; pct: number };
}

/**
 * Comprehensive planning quality metrics for an advisor's book,
 * including distribution, staleness, and data gaps.
 */
export interface PlanningQualityMetrics {
  /** Distribution of plans across health categories. */
  distribution: PlanQualityDistribution;
  /** Number of plans not updated within the review SLA (e.g. > 12 months). */
  stalePlans: number;
  /** Number of plans with missing critical data fields. */
  plansMissingData: number;
  /** Number of plans that have no goals configured. */
  plansWithNoGoals: number;
}

// =====================================================================
// BigQuery Dataset Row Types
// =====================================================================

/**
 * BigQuery row schema for the advisor scorecard materialized view.
 * Maps to `farther-prism.fp_pulse.advisor_scorecards`.
 */
export interface AdvisorScorecardRow {
  /** Advisor unique identifier (UUID string). */
  advisor_id: string;
  /** Advisor display name. */
  advisor_name: string;
  /** Advisor seniority tier. */
  tier: string;
  /** Firm unique identifier (UUID string). */
  firm_id: string;
  /** Total AUM managed by this advisor. */
  aum: number;
  /** AUM change month-to-date. */
  aum_change_mtd: number;
  /** Number of active households. */
  households: number;
  /** Household count change month-to-date. */
  households_change_mtd: number;
  /** Annualized revenue. */
  revenue: number;
  /** Revenue change year-over-year as a percentage. */
  revenue_change_yoy: number;
  /** Average AUM per household. */
  avg_aum_per_household: number;
  /** Aggregate plan health score (0-100). */
  plan_health_score: number;
  /** Client engagement score (0-100). */
  engagement_score: number;
  /** Data quality/completeness score (0-100). */
  data_quality_score: number;
  /** Number of open proposals. */
  proposal_count: number;
  /** Total AUM across open proposals. */
  proposed_aum: number;
  /** Number of at-risk households. */
  at_risk_clients: number;
  /** Number of overdue reviews. */
  overdue_reviews: number;
  /** Computed performance tier string. */
  performance_tier: string;
  /** Composite performance score (0-100). */
  composite_score: number;
  /** ISO 8601 snapshot timestamp. */
  snapshot_at: string;
}

/**
 * BigQuery row schema for the firm dashboard materialized view.
 * Maps to `farther-prism.fp_pulse.firm_dashboard`.
 */
export interface FirmDashboardRow {
  /** Firm unique identifier (UUID string). */
  firm_id: string;
  /** ISO 8601 snapshot date. */
  snapshot_date: string;
  /** Total AUM across the firm. */
  total_aum: number;
  /** AUM change vs. prior period. */
  aum_change: number;
  /** AUM change as a percentage. */
  aum_change_pct: number;
  /** Net new assets month-to-date. */
  net_new_assets_mtd: number;
  /** Net new assets as a percentage of starting AUM. */
  net_new_assets_pct: number;
  /** Annualized revenue. */
  annual_revenue: number;
  /** Revenue change vs. prior period. */
  revenue_change: number;
  /** Revenue change as a percentage. */
  revenue_change_pct: number;
  /** Number of active households. */
  active_households: number;
  /** Household count change vs. prior period. */
  households_change: number;
  /** Aggregate plan health score (0-100). */
  plan_health_score: number;
  /** Plan health score change vs. prior period. */
  plan_health_change: number;
  /** Market appreciation component of AUM growth. */
  market_appreciation: number;
  /** Organic net new component of AUM growth. */
  organic_net_new: number;
  /** AUM from new client onboardings. */
  new_client_aum: number;
  /** AUM lost from terminated relationships. */
  lost_client_aum: number;
  /** Organic growth rate as a decimal. */
  organic_growth_rate: number;
  /** Number of critical alerts. */
  critical_alerts: number;
  /** Number of at-risk households. */
  at_risk_households: number;
  /** Total AUM in at-risk households. */
  aum_at_risk: number;
}

/**
 * BigQuery row schema for churn signal scores.
 * Maps to `farther-prism.fp_pulse.churn_scores_latest`.
 */
export interface ChurnSignalRow {
  /** Household unique identifier (UUID string). */
  household_id: string;
  /** Household display name. */
  household_name: string;
  /** Advisor unique identifier (UUID string). */
  advisor_id: string;
  /** Advisor display name. */
  advisor_name: string;
  /** Total household AUM. */
  aum: number;
  /** Churn risk probability (0-1, multiplied by 100 for display as score). */
  churn_risk_score: number;
  /** Derived churn risk label. */
  churn_risk_label: string;
  /** Estimated annual revenue at risk. */
  annual_revenue_at_risk: number;
  /** Days since last advisor contact. */
  days_since_last_contact: number;
  /** Portal sessions in last 90 days. */
  portal_sessions_last_90d: number;
  /** Change in plan success rate over 90 days. */
  plan_success_rate_delta_90d: number;
  /** Net flow ratio (net flows / starting AUM). */
  net_flow_ratio: number;
  /** Raw model probability (0-1). */
  raw_probability: number;
  /** ISO 8601 timestamp when the score was computed. */
  scored_at: string;
}

/**
 * BigQuery row schema for opportunity scores (held-away assets, consolidation).
 * Maps to `farther-prism.fp_pulse.opportunity_scores`.
 */
export interface OpportunityScoreRow {
  /** Household unique identifier (UUID string). */
  household_id: string;
  /** Household display name. */
  household_name: string;
  /** Advisor unique identifier (UUID string). */
  advisor_id: string;
  /** Advisor display name. */
  advisor_name: string;
  /** Total household AUM currently managed. */
  managed_aum: number;
  /** Estimated held-away AUM at other institutions. */
  held_away_aum: number;
  /** Probability of consolidating held-away assets (0-1). */
  probability_to_consolidate: number;
  /** Trigger event or reason for the opportunity. */
  trigger: string;
  /** Opportunity category (e.g. "HELD_AWAY", "TAX_PLANNING", "ESTATE_PLAN"). */
  opportunity_category: string;
  /** Estimated revenue uplift if the opportunity is captured. */
  estimated_revenue_uplift: number;
  /** ISO 8601 timestamp when the opportunity was scored. */
  scored_at: string;
  /** Whether this opportunity has been actioned by the advisor. */
  is_actioned: boolean;
  /** ISO 8601 timestamp when the opportunity was actioned, or null. */
  actioned_at: string | null;
}
