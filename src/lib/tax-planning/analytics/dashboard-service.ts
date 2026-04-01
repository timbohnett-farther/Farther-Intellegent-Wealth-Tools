// =============================================================================
// Analytics — Dashboard Service
// =============================================================================
//
// Generates pre-built dashboard views for advisors, teams, and firms.
// Aggregates metrics from KPI engine, funnel engine, and value engine.
// =============================================================================

import { store } from '../store';
import { auditService } from '../audit';
import { computeKPI } from './kpi-engine';
import { computeValueOfAdvice } from './value-engine';
import type { AdvisorDashboard, TeamDashboard, FirmOverview, DrilldownQuery, DrilldownResult } from './types';

// ==================== Firm Overview Dashboard ====================

/**
 * Generates a firm-level overview dashboard.
 *
 * @param firmId - The firm ID.
 * @param periodStart - Start of measurement period (ISO 8601).
 * @param periodEnd - End of measurement period (ISO 8601).
 * @returns The firm overview dashboard.
 */
export function getFirmOverview(firmId: string, periodStart: string, periodEnd: string): FirmOverview {
  // Active advisors
  const activeAdvisors = computeKPI('active_advisors', 'firm', firmId, periodStart, periodEnd);

  // Households reviewed (use active_households metric)
  const householdsReviewed = computeKPI('active_households', 'firm', firmId, periodStart, periodEnd);

  // Opportunities surfaced
  const opportunitiesSurfaced = computeKPI('opportunities_surfaced', 'firm', firmId, periodStart, periodEnd);

  // Recommendations accepted
  const statuses = store.recommendationStatuses.findAll().filter((s) => s.status === 'accepted');
  const recommendationsAccepted = statuses.length;

  // Implementations completed
  const implemented = store.recommendationStatuses.findAll().filter((s) => s.status === 'implemented');
  const implementationsCompleted = implemented.length;

  // Estimated implemented value
  const valueMetric = computeKPI('estimated_implemented_value', 'firm', firmId, periodStart, periodEnd);
  const estimatedImplementedValueCents = typeof valueMetric.value === 'number' ? valueMetric.value : 0;

  // Overdue task rate
  const overdueRate = computeKPI('overdue_rate', 'firm', firmId, periodStart, periodEnd);
  const overdueTaskRate = typeof overdueRate.value === 'number' ? overdueRate.value : 0;

  return {
    firmId,
    periodStart,
    periodEnd,
    activeAdvisors: typeof activeAdvisors.value === 'number' ? activeAdvisors.value : 0,
    householdsReviewed: typeof householdsReviewed.value === 'number' ? householdsReviewed.value : 0,
    opportunitiesSurfaced: typeof opportunitiesSurfaced.value === 'number' ? opportunitiesSurfaced.value : 0,
    recommendationsAccepted,
    implementationsCompleted,
    estimatedImplementedValueCents,
    overdueTaskRate,
    generatedAt: new Date().toISOString(),
  };
}

// ==================== Advisor Dashboard ====================

/**
 * Generates an advisor-level dashboard.
 *
 * @param advisorId - The advisor/user ID.
 * @param periodStart - Start of measurement period (ISO 8601).
 * @param periodEnd - End of measurement period (ISO 8601).
 * @returns The advisor dashboard.
 */
export function getAdvisorDashboard(advisorId: string, periodStart: string, periodEnd: string): AdvisorDashboard {
  const startDate = new Date(periodStart);
  const endDate = new Date(periodEnd);

  // Households worked
  const households = store.households.findAll().filter((h) => h.advisorId === advisorId);
  const householdsWorked = households.length;

  // Opportunities reviewed (calc runs for advisor's households)
  const householdIds = new Set(households.map((h) => h.householdId));
  const calcRuns = store.calcRuns.findAll().filter((c) => {
    const scenario = store.scenarios.findById(c.scenarioId);
    if (!scenario) return false;
    return householdIds.has(scenario.householdId) && c.status === 'completed';
  });
  const opportunitiesReviewed = calcRuns.length;

  // Scenarios recommended
  const scenarios = store.scenarios.findAll().filter((s) => {
    return householdIds.has(s.householdId) && s.status === 'recommended';
  });
  const scenariosRecommended = scenarios.length;

  // Deliverables produced
  const deliverables = store.deliverables.findAll().filter((d) => {
    const scenario = store.scenarios.findById(d.scenarioId);
    if (!scenario) return false;
    return householdIds.has(scenario.householdId);
  });
  const deliverablesProduced = deliverables.length;

  // Implementation rate
  const recStatuses = store.recommendationStatuses.findAll().filter((r) => householdIds.has(r.householdId));
  const accepted = recStatuses.filter((r) => r.status === 'accepted').length;
  const implemented = recStatuses.filter((r) => r.status === 'implemented').length;
  const implementationRate = accepted > 0 ? implemented / accepted : 0;

  // Estimated value
  const valueOfAdvice = computeValueOfAdvice('advisor', advisorId, periodStart, periodEnd);
  const estimatedValueCents = valueOfAdvice.proposedValueCents;

  return {
    advisorId,
    periodStart,
    periodEnd,
    householdsWorked,
    opportunitiesReviewed,
    scenariosRecommended,
    deliverablesProduced,
    implementationRate,
    estimatedValueCents,
    generatedAt: new Date().toISOString(),
  };
}

// ==================== Team Dashboard ====================

/**
 * Generates a team-level dashboard.
 *
 * @param teamId - The team ID.
 * @param periodStart - Start of measurement period (ISO 8601).
 * @param periodEnd - End of measurement period (ISO 8601).
 * @returns The team dashboard.
 */
export function getTeamDashboard(teamId: string, periodStart: string, periodEnd: string): TeamDashboard {
  // NOTE: This is a stub. Team assignment logic is not implemented in the store yet.
  // For now, aggregate across all advisors as a placeholder.

  const advisors = store.users.findAll().filter((u) => ['ADVISOR', 'PARAPLANNER'].includes(u.role));
  const activeAdvisors = advisors.length;

  const households = store.households.findAll();
  const householdsEngaged = households.length;

  const calcRuns = store.calcRuns.findAll().filter((c) => c.status === 'completed');
  const opportunitiesSurfaced = calcRuns.length;

  const statuses = store.recommendationStatuses.findAll().filter((s) => s.status === 'accepted');
  const recommendationsAccepted = statuses.length;

  const implemented = store.recommendationStatuses.findAll().filter((s) => s.status === 'implemented');
  const implementationsCompleted = implemented.length;

  const valueMetric = computeKPI('estimated_proposed_value', 'firm', 'firm_demo', periodStart, periodEnd);
  const estimatedValueCents = typeof valueMetric.value === 'number' ? valueMetric.value : 0;

  return {
    teamId,
    periodStart,
    periodEnd,
    activeAdvisors,
    householdsEngaged,
    opportunitiesSurfaced,
    recommendationsAccepted,
    implementationsCompleted,
    estimatedValueCents,
    generatedAt: new Date().toISOString(),
  };
}

// ==================== Drilldown Service ====================

/**
 * Executes a drilldown query for a metric.
 *
 * Returns the underlying records that contributed to the metric value.
 *
 * @param query - The drilldown query parameters.
 * @returns The drilldown result with matching records.
 */
export function getDrilldown(query: DrilldownQuery): DrilldownResult {
  const { metricId, scopeType, scopeRefId, periodStart, periodEnd, filters, limit = 100, offset = 0 } = query;

  const startDate = new Date(periodStart);
  const endDate = new Date(periodEnd);

  let records: Record<string, unknown>[] = [];

  // Route to metric-specific drilldown logic
  switch (metricId) {
    case 'active_advisors': {
      const events = auditService
        .query({
          firmId: scopeRefId,
          from: periodStart,
          to: periodEnd,
        })
        .events.map((e) => ({ userId: e.user_id, timestamp: e.timestamp }));
      records = events;
      break;
    }
    case 'scenarios_created': {
      const scenarios = store.scenarios.findAll().filter((s) => {
        const created = new Date(s.createdAt);
        return s.status !== 'deleted' && created >= startDate && created <= endDate;
      });
      records = scenarios.map((s) => ({
        scenarioId: s.scenarioId,
        householdId: s.householdId,
        scenarioType: s.scenario_type,
        createdAt: s.createdAt,
      }));
      break;
    }
    case 'tasks_completed': {
      const tasks = store.workflowTasks.findAll().filter((t) => {
        const completed = t.completedAt ? new Date(t.completedAt) : null;
        return t.status === 'completed' && completed && completed >= startDate && completed <= endDate;
      });
      records = tasks.map((t) => ({
        taskId: t.task_id,
        householdId: t.householdId,
        taskType: t.task_type,
        completedAt: t.completedAt,
      }));
      break;
    }
    default:
      // Generic fallback: return empty
      records = [];
  }

  const total = records.length;
  const page = records.slice(offset, offset + limit);

  return {
    metricId,
    records: page,
    total,
    generatedAt: new Date().toISOString(),
  };
}
