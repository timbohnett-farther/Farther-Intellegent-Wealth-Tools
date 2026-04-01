// =============================================================================
// Analytics — Metric Registry
// =============================================================================
//
// Central registry of all analytics metrics. Each metric is registered with
// a unique ID, name, description, category, grain, calculation method,
// inclusion/exclusion rules, and data quality limitations.
//
// Metrics are versioned and can be deprecated when business logic changes.
// =============================================================================

import type { MetricDefinition } from './types';

// ==================== Metric Registry ====================

/**
 * All registered metrics for the analytics platform.
 * Keyed by metricId for fast lookup.
 */
const METRIC_REGISTRY: Map<string, MetricDefinition> = new Map();

/**
 * Registers a metric definition in the global registry.
 * Throws if a metric with the same ID already exists.
 */
function register(metric: MetricDefinition): void {
  if (METRIC_REGISTRY.has(metric.metricId)) {
    throw new Error(`Metric ${metric.metricId} is already registered`);
  }
  METRIC_REGISTRY.set(metric.metricId, metric);
}

// ==================== Adoption Metrics ====================

register({
  metricId: 'active_advisors',
  name: 'Active Advisors',
  description: 'Count of advisors who used the tax planning platform in the period',
  category: 'adoption',
  grain: 'firm',
  sourceObjectTypes: ['User', 'AuditEvent'],
  calculationMethod: 'count_distinct',
  inclusionRules: [{ field: 'role', operator: 'in', value: ['ADVISOR', 'PARAPLANNER'] }],
  exclusionRules: [],
  freshness: 'hourly',
  limitations: [],
  status: 'active',
  version: '1.0.0',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

register({
  metricId: 'active_households',
  name: 'Active Households',
  description: 'Count of households with at least one scenario or deliverable created in the period',
  category: 'adoption',
  grain: 'firm',
  sourceObjectTypes: ['Household', 'Scenario', 'Deliverable'],
  calculationMethod: 'count_distinct',
  inclusionRules: [],
  exclusionRules: [],
  freshness: 'hourly',
  limitations: [],
  status: 'active',
  version: '1.0.0',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

register({
  metricId: 'copilot_usage_rate',
  name: 'Copilot Usage Rate',
  description: 'Percentage of scenarios with at least one copilot answer',
  category: 'adoption',
  grain: 'firm',
  sourceObjectTypes: ['Scenario', 'CopilotAnswer'],
  calculationMethod: 'rate',
  inclusionRules: [],
  exclusionRules: [],
  freshness: 'hourly',
  limitations: ['Does not account for discarded copilot answers'],
  status: 'active',
  version: '1.0.0',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

register({
  metricId: 'scenario_usage_rate',
  name: 'Scenario Usage Rate',
  description: 'Percentage of households with at least one scenario created',
  category: 'adoption',
  grain: 'firm',
  sourceObjectTypes: ['Household', 'Scenario'],
  calculationMethod: 'rate',
  inclusionRules: [],
  exclusionRules: [],
  freshness: 'hourly',
  limitations: [],
  status: 'active',
  version: '1.0.0',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

// ==================== Planning Metrics ====================

register({
  metricId: 'opportunities_surfaced',
  name: 'Opportunities Surfaced',
  description: 'Count of tax opportunities identified by the platform',
  category: 'planning',
  grain: 'firm',
  sourceObjectTypes: ['CalcRun'],
  calculationMethod: 'count',
  inclusionRules: [{ field: 'status', operator: 'eq', value: 'completed' }],
  exclusionRules: [],
  freshness: 'real_time',
  limitations: ['Requires calc run completion'],
  status: 'active',
  version: '1.0.0',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

register({
  metricId: 'scenarios_created',
  name: 'Scenarios Created',
  description: 'Count of tax scenarios created in the period',
  category: 'planning',
  grain: 'firm',
  sourceObjectTypes: ['Scenario'],
  calculationMethod: 'count',
  inclusionRules: [],
  exclusionRules: [{ field: 'status', operator: 'eq', value: 'deleted' }],
  freshness: 'real_time',
  limitations: [],
  status: 'active',
  version: '1.0.0',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

register({
  metricId: 'scenarios_recommended',
  name: 'Scenarios Recommended',
  description: 'Count of scenarios marked as recommended to clients',
  category: 'planning',
  grain: 'firm',
  sourceObjectTypes: ['Scenario'],
  calculationMethod: 'count',
  inclusionRules: [{ field: 'status', operator: 'eq', value: 'recommended' }],
  exclusionRules: [],
  freshness: 'real_time',
  limitations: [],
  status: 'active',
  version: '1.0.0',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

register({
  metricId: 'deliverables_created',
  name: 'Deliverables Created',
  description: 'Count of deliverables created in the period',
  category: 'planning',
  grain: 'firm',
  sourceObjectTypes: ['Deliverable'],
  calculationMethod: 'count',
  inclusionRules: [],
  exclusionRules: [{ field: 'status', operator: 'eq', value: 'archived' }],
  freshness: 'real_time',
  limitations: [],
  status: 'active',
  version: '1.0.0',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

register({
  metricId: 'deliverables_approved',
  name: 'Deliverables Approved',
  description: 'Count of deliverables approved for client delivery',
  category: 'planning',
  grain: 'firm',
  sourceObjectTypes: ['Deliverable'],
  calculationMethod: 'count',
  inclusionRules: [{ field: 'status', operator: 'eq', value: 'approved' }],
  exclusionRules: [],
  freshness: 'real_time',
  limitations: [],
  status: 'active',
  version: '1.0.0',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

// ==================== Funnel Metrics ====================

register({
  metricId: 'surfaced_to_reviewed',
  name: 'Surfaced to Reviewed Conversion',
  description: 'Conversion rate from surfaced recommendations to reviewed',
  category: 'funnel',
  grain: 'firm',
  sourceObjectTypes: ['RecommendationExecutionStatus'],
  calculationMethod: 'conversion_rate',
  inclusionRules: [],
  exclusionRules: [],
  freshness: 'daily',
  limitations: [],
  status: 'active',
  version: '1.0.0',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

register({
  metricId: 'reviewed_to_presented',
  name: 'Reviewed to Presented Conversion',
  description: 'Conversion rate from reviewed recommendations to presented',
  category: 'funnel',
  grain: 'firm',
  sourceObjectTypes: ['RecommendationExecutionStatus'],
  calculationMethod: 'conversion_rate',
  inclusionRules: [],
  exclusionRules: [],
  freshness: 'daily',
  limitations: [],
  status: 'active',
  version: '1.0.0',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

register({
  metricId: 'presented_to_accepted',
  name: 'Presented to Accepted Conversion',
  description: 'Conversion rate from presented recommendations to accepted',
  category: 'funnel',
  grain: 'firm',
  sourceObjectTypes: ['RecommendationExecutionStatus'],
  calculationMethod: 'conversion_rate',
  inclusionRules: [],
  exclusionRules: [],
  freshness: 'daily',
  limitations: [],
  status: 'active',
  version: '1.0.0',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

register({
  metricId: 'accepted_to_implemented',
  name: 'Accepted to Implemented Conversion',
  description: 'Conversion rate from accepted recommendations to implemented',
  category: 'funnel',
  grain: 'firm',
  sourceObjectTypes: ['RecommendationExecutionStatus'],
  calculationMethod: 'conversion_rate',
  inclusionRules: [],
  exclusionRules: [],
  freshness: 'daily',
  limitations: [],
  status: 'active',
  version: '1.0.0',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

// ==================== Execution Metrics ====================

register({
  metricId: 'tasks_created',
  name: 'Tasks Created',
  description: 'Count of workflow tasks created in the period',
  category: 'execution',
  grain: 'firm',
  sourceObjectTypes: ['WorkflowTask'],
  calculationMethod: 'count',
  inclusionRules: [],
  exclusionRules: [{ field: 'status', operator: 'eq', value: 'canceled' }],
  freshness: 'real_time',
  limitations: [],
  status: 'active',
  version: '1.0.0',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

register({
  metricId: 'tasks_completed',
  name: 'Tasks Completed',
  description: 'Count of workflow tasks completed in the period',
  category: 'execution',
  grain: 'firm',
  sourceObjectTypes: ['WorkflowTask'],
  calculationMethod: 'count',
  inclusionRules: [{ field: 'status', operator: 'eq', value: 'completed' }],
  exclusionRules: [],
  freshness: 'real_time',
  limitations: [],
  status: 'active',
  version: '1.0.0',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

register({
  metricId: 'avg_task_completion_days',
  name: 'Average Task Completion Days',
  description: 'Average number of days from task creation to completion',
  category: 'execution',
  grain: 'firm',
  sourceObjectTypes: ['WorkflowTask'],
  calculationMethod: 'avg',
  inclusionRules: [{ field: 'status', operator: 'eq', value: 'completed' }],
  exclusionRules: [],
  freshness: 'daily',
  limitations: ['Excludes canceled and superseded tasks'],
  status: 'active',
  version: '1.0.0',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

register({
  metricId: 'overdue_rate',
  name: 'Overdue Task Rate',
  description: 'Percentage of tasks that are past due date',
  category: 'execution',
  grain: 'firm',
  sourceObjectTypes: ['WorkflowTask'],
  calculationMethod: 'rate',
  inclusionRules: [],
  exclusionRules: [{ field: 'status', operator: 'in', value: ['completed', 'canceled', 'superseded'] }],
  freshness: 'hourly',
  limitations: [],
  status: 'active',
  version: '1.0.0',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

register({
  metricId: 'blocked_rate',
  name: 'Blocked Task Rate',
  description: 'Percentage of tasks that are blocked',
  category: 'execution',
  grain: 'firm',
  sourceObjectTypes: ['WorkflowTask'],
  calculationMethod: 'rate',
  inclusionRules: [{ field: 'status', operator: 'eq', value: 'blocked' }],
  exclusionRules: [],
  freshness: 'hourly',
  limitations: [],
  status: 'active',
  version: '1.0.0',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

register({
  metricId: 'cpa_turnaround_days',
  name: 'CPA Turnaround Days',
  description: 'Average days from CPA request sent to response received',
  category: 'execution',
  grain: 'firm',
  sourceObjectTypes: ['CPACoordinationRequest'],
  calculationMethod: 'avg',
  inclusionRules: [{ field: 'status', operator: 'eq', value: 'completed' }],
  exclusionRules: [],
  freshness: 'daily',
  limitations: ['Requires completed CPA requests with timestamps'],
  status: 'active',
  version: '1.0.0',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

// ==================== Value Metrics ====================

register({
  metricId: 'estimated_proposed_value',
  name: 'Estimated Proposed Value',
  description: 'Sum of proposed value across all recommendations (in cents)',
  category: 'value',
  grain: 'firm',
  sourceObjectTypes: ['ValueAttribution'],
  calculationMethod: 'sum',
  inclusionRules: [],
  exclusionRules: [{ field: 'status', operator: 'eq', value: 'superseded' }],
  freshness: 'daily',
  limitations: ['Estimates based on scenario deltas, not realized value'],
  status: 'active',
  version: '1.0.0',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

register({
  metricId: 'estimated_accepted_value',
  name: 'Estimated Accepted Value',
  description: 'Sum of accepted value across all accepted recommendations (in cents)',
  category: 'value',
  grain: 'firm',
  sourceObjectTypes: ['ValueAttribution'],
  calculationMethod: 'sum',
  inclusionRules: [{ field: 'status', operator: 'in', value: ['accepted', 'implemented'] }],
  exclusionRules: [],
  freshness: 'daily',
  limitations: ['Estimates based on scenario deltas, not realized value'],
  status: 'active',
  version: '1.0.0',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

register({
  metricId: 'estimated_implemented_value',
  name: 'Estimated Implemented Value',
  description: 'Sum of implemented value across all implemented recommendations (in cents)',
  category: 'value',
  grain: 'firm',
  sourceObjectTypes: ['ValueAttribution'],
  calculationMethod: 'sum',
  inclusionRules: [{ field: 'status', operator: 'eq', value: 'implemented' }],
  exclusionRules: [],
  freshness: 'daily',
  limitations: ['Estimates based on scenario deltas, not realized value'],
  status: 'active',
  version: '1.0.0',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

register({
  metricId: 'value_by_category',
  name: 'Value by Category',
  description: 'Sum of value broken down by opportunity category (in cents)',
  category: 'value',
  grain: 'firm',
  sourceObjectTypes: ['ValueAttribution'],
  calculationMethod: 'sum',
  inclusionRules: [],
  exclusionRules: [{ field: 'status', operator: 'eq', value: 'superseded' }],
  freshness: 'daily',
  limitations: [],
  status: 'active',
  version: '1.0.0',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

// ==================== Productivity Metrics ====================

register({
  metricId: 'households_per_advisor',
  name: 'Households per Advisor',
  description: 'Average number of households served per advisor',
  category: 'productivity',
  grain: 'advisor',
  sourceObjectTypes: ['User', 'Household'],
  calculationMethod: 'avg',
  inclusionRules: [{ field: 'role', operator: 'in', value: ['ADVISOR', 'PARAPLANNER'] }],
  exclusionRules: [],
  freshness: 'daily',
  limitations: [],
  status: 'active',
  version: '1.0.0',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

register({
  metricId: 'scenarios_per_case',
  name: 'Scenarios per Case',
  description: 'Average number of scenarios created per household',
  category: 'productivity',
  grain: 'firm',
  sourceObjectTypes: ['Household', 'Scenario'],
  calculationMethod: 'avg',
  inclusionRules: [],
  exclusionRules: [],
  freshness: 'daily',
  limitations: [],
  status: 'active',
  version: '1.0.0',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

register({
  metricId: 'avg_time_to_recommendation',
  name: 'Average Time to Recommendation',
  description: 'Average days from household creation to first recommendation',
  category: 'productivity',
  grain: 'firm',
  sourceObjectTypes: ['Household', 'Scenario'],
  calculationMethod: 'time_to_event',
  inclusionRules: [],
  exclusionRules: [],
  freshness: 'daily',
  limitations: ['Requires at least one recommended scenario'],
  status: 'active',
  version: '1.0.0',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

register({
  metricId: 'ai_drafting_utilization',
  name: 'AI Drafting Utilization',
  description: 'Percentage of deliverables with AI-drafted content',
  category: 'productivity',
  grain: 'firm',
  sourceObjectTypes: ['Deliverable', 'CopilotAnswer'],
  calculationMethod: 'rate',
  inclusionRules: [],
  exclusionRules: [],
  freshness: 'daily',
  limitations: [],
  status: 'active',
  version: '1.0.0',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

// ==================== Registry Access ====================

/**
 * Retrieves a metric definition by ID.
 * Returns undefined if not found.
 */
export function getMetric(metricId: string): MetricDefinition | undefined {
  return METRIC_REGISTRY.get(metricId);
}

/**
 * Returns all registered metrics.
 */
export function getAllMetrics(): MetricDefinition[] {
  return Array.from(METRIC_REGISTRY.values());
}

/**
 * Returns all metrics in a given category.
 */
export function getMetricsByCategory(category: string): MetricDefinition[] {
  return getAllMetrics().filter((m) => m.category === category);
}

/**
 * Returns all active (non-deprecated) metrics.
 */
export function getActiveMetrics(): MetricDefinition[] {
  return getAllMetrics().filter((m) => m.status === 'active');
}

/**
 * Returns count of registered metrics.
 */
export function getMetricCount(): number {
  return METRIC_REGISTRY.size;
}
