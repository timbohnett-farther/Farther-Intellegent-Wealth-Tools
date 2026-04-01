// =============================================================================
// Analytics, ROI, and Value-of-Advice Dashboard — Type Definitions
// =============================================================================
//
// Core types for the analytics system: metrics, KPIs, funnels, value
// attribution, workflow bottlenecks, and advisor/team/firm dashboards.
// =============================================================================

import type { TaxYear } from '../types';

// =====================================================================
// Enums / Union Types
// =====================================================================

/**
 * Metric categories group related metrics for dashboard organization.
 */
export type MetricCategory =
  | 'adoption'
  | 'planning'
  | 'funnel'
  | 'execution'
  | 'value'
  | 'productivity';

/**
 * Metric grain defines the level of aggregation for a metric.
 */
export type MetricGrain =
  | 'household'
  | 'advisor'
  | 'team'
  | 'office'
  | 'firm'
  | 'event';

/**
 * Metric freshness defines how often the metric is recalculated.
 */
export type MetricFreshness = 'real_time' | 'hourly' | 'daily';

/**
 * Scope type for metrics and dashboards.
 */
export type ScopeType = 'household' | 'advisor' | 'team' | 'office' | 'firm';

/**
 * Attribution model for value calculation.
 */
export type AttributionModel = 'recommendation' | 'scenario_delta' | 'category';

/**
 * Value attribution status lifecycle.
 */
export type ValueAttributionStatus = 'proposed' | 'accepted' | 'implemented' | 'superseded';

/**
 * Funnel stage for recommendation lifecycle.
 */
export type FunnelStage =
  | 'surfaced'
  | 'reviewed'
  | 'presented'
  | 'accepted'
  | 'deferred'
  | 'rejected'
  | 'in_implementation'
  | 'implemented'
  | 'superseded';

/**
 * Workflow bottleneck metric types.
 */
export type BottleneckMetricType =
  | 'open_tasks'
  | 'overdue_tasks'
  | 'blocked_tasks'
  | 'avg_completion_days'
  | 'cpa_turnaround_days';

/**
 * Metric status for governance and version control.
 */
export type MetricStatus = 'active' | 'deprecated' | 'experimental';

// =====================================================================
// Metric Registry
// =====================================================================

/**
 * A calculation method describes how to compute a metric value.
 * Uses a string key that maps to calculation logic in the kpi-engine.
 */
export type CalculationMethod =
  | 'count'
  | 'count_distinct'
  | 'sum'
  | 'avg'
  | 'rate'
  | 'conversion_rate'
  | 'percentile_95'
  | 'time_to_event';

/**
 * Inclusion rule defines filters for what data to include in metric calculation.
 */
export interface InclusionRule {
  /** Field to filter on. */
  field: string;
  /** Operator (eq, ne, gt, gte, lt, lte, in, not_in). */
  operator: string;
  /** Value or values to compare against. */
  value: unknown;
}

/**
 * Exclusion rule defines filters for what data to exclude from metric calculation.
 */
export interface ExclusionRule {
  /** Field to filter on. */
  field: string;
  /** Operator (eq, ne, gt, gte, lt, lte, in, not_in). */
  operator: string;
  /** Value or values to compare against. */
  value: unknown;
}

/**
 * A metric definition is a registered, versioned specification of how to calculate a KPI.
 */
export interface MetricDefinition {
  /** Unique identifier for this metric (e.g. 'active_advisors'). */
  metricId: string;
  /** Human-readable name for dashboards. */
  name: string;
  /** Detailed description of what this metric measures. */
  description: string;
  /** Category for dashboard organization. */
  category: MetricCategory;
  /** Aggregation level. */
  grain: MetricGrain;
  /** Source object types required for this metric. */
  sourceObjectTypes: string[];
  /** Calculation method key. */
  calculationMethod: CalculationMethod;
  /** Inclusion filters. */
  inclusionRules: InclusionRule[];
  /** Exclusion filters. */
  exclusionRules: ExclusionRule[];
  /** How often this metric refreshes. */
  freshness: MetricFreshness;
  /** Known limitations or data quality issues. */
  limitations: string[];
  /** Metric status. */
  status: MetricStatus;
  /** Version number (semantic versioning). */
  version: string;
  /** UTC timestamp when metric definition was created. */
  createdAt: string;
  /** UTC timestamp when metric definition was last updated. */
  updatedAt: string;
}

// =====================================================================
// KPI Values
// =====================================================================

/**
 * A computed KPI value for a specific metric, scope, and time period.
 */
export interface KPIValue {
  /** The metric being measured. */
  metricId: string;
  /** Scope type (household, advisor, team, office, firm). */
  scopeType: ScopeType;
  /** ID of the scope entity. */
  scopeRefId: string;
  /** Start of measurement period (ISO 8601). */
  periodStart: string;
  /** End of measurement period (ISO 8601). */
  periodEnd: string;
  /** Computed value (may be number, string, or null for unavailable metrics). */
  value: number | string | null;
  /** Comparison value from prior period (optional). */
  comparisonValue?: number | string | null;
  /** Delta vs comparison value (optional). */
  delta?: number | string | null;
  /** UTC timestamp when this KPI was computed. */
  generatedAt: string;
}

// =====================================================================
// Funnel Metrics
// =====================================================================

/**
 * A single funnel stage with count and conversion rate.
 */
export interface FunnelMetric {
  /** Stage name. */
  stage: FunnelStage;
  /** Count of recommendations at this stage. */
  count: number;
  /** Conversion rate from previous stage (null for first stage). */
  conversionRate?: number;
  /** Count from previous stage (for rate calculation). */
  previousStageCount?: number;
}

/**
 * A recommendation funnel shows lifecycle progression for a scope and period.
 */
export interface RecommendationFunnel {
  /** Optional household-level funnel. */
  householdId?: string;
  /** Optional advisor-level funnel. */
  advisorId?: string;
  /** Optional team-level funnel. */
  teamId?: string;
  /** Optional office-level funnel. */
  officeId?: string;
  /** Firm ID (always present). */
  firmId: string;
  /** Tax year context. */
  taxYear: TaxYear;
  /** Start of measurement period (ISO 8601). */
  periodStart: string;
  /** End of measurement period (ISO 8601). */
  periodEnd: string;
  /** Funnel stages with counts and conversion rates. */
  stages: FunnelMetric[];
  /** UTC timestamp when funnel was computed. */
  generatedAt: string;
}

// =====================================================================
// Value Attribution
// =====================================================================

/**
 * A value attribution record links a recommendation to estimated and realized value.
 */
export interface ValueAttribution {
  /** UUID v4 primary key. */
  attributionId: string;
  /** FK to Household. */
  householdId: string;
  /** Tax year context. */
  taxYear: TaxYear;
  /** FK to the recommendation (scenario, opportunity, or deliverable). */
  recommendationId: string;
  /** Category of the opportunity (e.g. 'roth_conversion', 'tax_loss_harvesting'). */
  opportunityCategory: string;
  /** Optional FK to scenario if value comes from scenario delta. */
  scenarioId?: string;
  /** Proposed value in cents (estimated at recommendation time). */
  proposedValueCents: number;
  /** Accepted value in cents (when client accepts recommendation). */
  acceptedValueCents?: number;
  /** Implemented value in cents (realized after implementation). */
  implementedValueCents?: number;
  /** Attribution model used to calculate value. */
  attributionModel: AttributionModel;
  /** Current status of the attribution. */
  status: ValueAttributionStatus;
  /** UTC timestamp when attribution was created. */
  createdAt: string;
  /** UTC timestamp when attribution was last updated. */
  updatedAt: string;
}

// =====================================================================
// Workflow Bottlenecks
// =====================================================================

/**
 * A workflow bottleneck record identifies areas of operational friction.
 */
export interface WorkflowBottleneck {
  /** Bottleneck metric type. */
  metricType: BottleneckMetricType;
  /** Computed value. */
  value: number;
  /** Threshold for alert (optional). */
  threshold?: number;
  /** Whether this bottleneck exceeds threshold. */
  isAlert: boolean;
}

// =====================================================================
// Dashboards
// =====================================================================

/**
 * Advisor-level dashboard showing individual productivity and value.
 */
export interface AdvisorDashboard {
  /** FK to Advisor/User. */
  advisorId: string;
  /** Start of measurement period (ISO 8601). */
  periodStart: string;
  /** End of measurement period (ISO 8601). */
  periodEnd: string;
  /** Count of households worked with. */
  householdsWorked: number;
  /** Count of opportunities reviewed. */
  opportunitiesReviewed: number;
  /** Count of scenarios recommended to clients. */
  scenariosRecommended: number;
  /** Count of deliverables produced. */
  deliverablesProduced: number;
  /** Implementation rate (accepted → implemented). */
  implementationRate: number;
  /** Estimated value generated in cents. */
  estimatedValueCents: number;
  /** UTC timestamp when dashboard was generated. */
  generatedAt: string;
}

/**
 * Team-level dashboard showing aggregate team performance.
 */
export interface TeamDashboard {
  /** FK to Team. */
  teamId: string;
  /** Start of measurement period (ISO 8601). */
  periodStart: string;
  /** End of measurement period (ISO 8601). */
  periodEnd: string;
  /** Count of active advisors on the team. */
  activeAdvisors: number;
  /** Count of households engaged by team. */
  householdsEngaged: number;
  /** Count of opportunities surfaced by team. */
  opportunitiesSurfaced: number;
  /** Count of recommendations accepted by clients. */
  recommendationsAccepted: number;
  /** Count of implementations completed. */
  implementationsCompleted: number;
  /** Estimated value generated in cents. */
  estimatedValueCents: number;
  /** UTC timestamp when dashboard was generated. */
  generatedAt: string;
}

/**
 * Firm-level overview dashboard showing enterprise-wide metrics.
 */
export interface FirmOverview {
  /** FK to Firm. */
  firmId: string;
  /** Start of measurement period (ISO 8601). */
  periodStart: string;
  /** End of measurement period (ISO 8601). */
  periodEnd: string;
  /** Count of active advisors firm-wide. */
  activeAdvisors: number;
  /** Count of households reviewed firm-wide. */
  householdsReviewed: number;
  /** Count of opportunities surfaced firm-wide. */
  opportunitiesSurfaced: number;
  /** Count of recommendations accepted firm-wide. */
  recommendationsAccepted: number;
  /** Count of implementations completed firm-wide. */
  implementationsCompleted: number;
  /** Estimated implemented value firm-wide in cents. */
  estimatedImplementedValueCents: number;
  /** Overdue task rate (overdue / total tasks). */
  overdueTaskRate: number;
  /** UTC timestamp when dashboard was generated. */
  generatedAt: string;
}

/**
 * Value-of-advice dashboard showing ROI and value realization.
 */
export interface ValueOfAdvice {
  /** Scope type (household, advisor, team, office, firm). */
  scopeType: ScopeType;
  /** ID of the scope entity. */
  scopeRefId: string;
  /** Start of measurement period (ISO 8601). */
  periodStart: string;
  /** End of measurement period (ISO 8601). */
  periodEnd: string;
  /** Proposed value in cents (all recommendations). */
  proposedValueCents: number;
  /** Accepted value in cents (accepted recommendations). */
  acceptedValueCents: number;
  /** Implemented value in cents (realized value). */
  implementedValueCents: number;
  /** Value breakdown by opportunity category. */
  valueByCategory: Record<string, number>;
  /** Implementation rate (accepted → implemented). */
  implementationRate: number;
  /** Planning coverage (households with plans / total households). */
  planningCoverage: number;
  /** Advisor productivity score (0-100). */
  advisorProductivityScore: number;
  /** UTC timestamp when value dashboard was generated. */
  generatedAt: string;
}

// =====================================================================
// Drilldown Queries
// =====================================================================

/**
 * Query parameters for drilling down into a metric.
 */
export interface DrilldownQuery {
  /** The metric to drill into. */
  metricId: string;
  /** Scope type. */
  scopeType: ScopeType;
  /** ID of the scope entity. */
  scopeRefId: string;
  /** Start of measurement period (ISO 8601). */
  periodStart: string;
  /** End of measurement period (ISO 8601). */
  periodEnd: string;
  /** Additional filters (key-value pairs). */
  filters?: Record<string, unknown>;
  /** Pagination limit. */
  limit?: number;
  /** Pagination offset. */
  offset?: number;
}

/**
 * Result of a drilldown query.
 */
export interface DrilldownResult {
  /** The metric being drilled into. */
  metricId: string;
  /** Array of matching records (shape varies by metric). */
  records: Record<string, unknown>[];
  /** Total count of matching records (before pagination). */
  total: number;
  /** UTC timestamp when drilldown was computed. */
  generatedAt: string;
}
