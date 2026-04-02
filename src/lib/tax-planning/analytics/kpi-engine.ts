// =============================================================================
// Analytics — KPI Engine
// =============================================================================
//
// Computes KPI values for registered metrics. Queries the store for source
// objects, applies inclusion/exclusion rules, and executes the calculation
// method defined in the metric registry.
//
// Supports all 6 metric categories: adoption, planning, funnel, execution,
// value, and productivity.
// =============================================================================

import { store as storeImport } from '../store';

// Cast store to any to avoid Prisma type mismatches
const store = storeImport as any;
import { auditService } from '../audit';
import { getMetric } from './metric-registry';
import type { KPIValue, ScopeType } from './types';

// ==================== KPI Computation ====================

/**
 * Computes a KPI value for a given metric, scope, and time period.
 *
 * @param metricId - The metric to compute.
 * @param scopeType - The scope type (household, advisor, team, office, firm).
 * @param scopeRefId - The ID of the scope entity.
 * @param periodStart - Start of measurement period (ISO 8601).
 * @param periodEnd - End of measurement period (ISO 8601).
 * @returns The computed KPI value.
 * @throws If the metric is not registered or calculation fails.
 */
export function computeKPI(
  metricId: string,
  scopeType: ScopeType,
  scopeRefId: string,
  periodStart: string,
  periodEnd: string
): KPIValue {
  const metric = getMetric(metricId);
  if (!metric) {
    throw new Error(`Metric ${metricId} not registered`);
  }

  const startDate = new Date(periodStart);
  const endDate = new Date(periodEnd);

  let value: number | string | null = null;

  // Route to category-specific calculation logic
  switch (metric.category) {
    case 'adoption':
      value = computeAdoptionMetric(metricId, scopeType, scopeRefId, startDate, endDate);
      break;
    case 'planning':
      value = computePlanningMetric(metricId, scopeType, scopeRefId, startDate, endDate);
      break;
    case 'funnel':
      value = computeFunnelMetric(metricId, scopeType, scopeRefId, startDate, endDate);
      break;
    case 'execution':
      value = computeExecutionMetric(metricId, scopeType, scopeRefId, startDate, endDate);
      break;
    case 'value':
      value = computeValueMetric(metricId, scopeType, scopeRefId, startDate, endDate);
      break;
    case 'productivity':
      value = computeProductivityMetric(metricId, scopeType, scopeRefId, startDate, endDate);
      break;
    default:
      throw new Error(`Unknown metric category: ${metric.category}`);
  }

  return {
    metricId,
    scopeType,
    scopeRefId,
    periodStart,
    periodEnd,
    value,
    generatedAt: new Date().toISOString(),
  };
}

// ==================== Category-Specific Computation ====================

function computeAdoptionMetric(
  metricId: string,
  scopeType: ScopeType,
  scopeRefId: string,
  startDate: Date,
  endDate: Date
): number | null {
  switch (metricId) {
    case 'active_advisors': {
      const events = auditService.query({
        firmId: scopeRefId,
        from: startDate.toISOString(),
        to: endDate.toISOString(),
      }).events;
      const userIds = new Set(events.map((e) => e.user_id));
      return userIds.size;
    }
    case 'active_households': {
      const scenarios = store.scenarios.findAll().filter((s: any) => {
        const created = new Date(s.createdAt);
        return created >= startDate && created <= endDate;
      });
      const householdIds = new Set(scenarios.map((s: any) => s.householdId));
      return householdIds.size;
    }
    case 'copilot_usage_rate': {
      const scenarios = store.scenarios.findAll();
      const scenariosWithCopilot = scenarios.filter((s: any) => {
        const answers = store.copilotAnswers.findAll().filter((a: any) => a.scenarioId === s.scenarioId);
        return answers.length > 0;
      });
      return scenarios.length > 0 ? scenariosWithCopilot.length / scenarios.length : 0;
    }
    case 'scenario_usage_rate': {
      const households = store.households.findAll();
      const householdsWithScenarios = households.filter((h: any) => {
        const scenarios = store.scenarios.findAll().filter((s: any) => s.householdId === h.householdId);
        return scenarios.length > 0;
      });
      return households.length > 0 ? householdsWithScenarios.length / households.length : 0;
    }
    default:
      return null;
  }
}

function computePlanningMetric(
  metricId: string,
  scopeType: ScopeType,
  scopeRefId: string,
  startDate: Date,
  endDate: Date
): number | null {
  switch (metricId) {
    case 'opportunities_surfaced': {
      const calcRuns = store.calcRuns.findAll().filter((c: any) => {
        const created = new Date(c.createdAt);
        return c.status === 'completed' && created >= startDate && created <= endDate;
      });
      return calcRuns.length;
    }
    case 'scenarios_created': {
      const scenarios = store.scenarios.findAll().filter((s: any) => {
        const created = new Date(s.createdAt);
        return s.status !== 'deleted' && created >= startDate && created <= endDate;
      });
      return scenarios.length;
    }
    case 'scenarios_recommended': {
      const scenarios = store.scenarios.findAll().filter((s: any) => {
        const created = new Date(s.createdAt);
        return s.status === 'recommended' && created >= startDate && created <= endDate;
      });
      return scenarios.length;
    }
    case 'deliverables_created': {
      const deliverables = store.deliverables.findAll().filter((d: any) => {
        const created = new Date(d.createdAt);
        return d.status !== 'archived' && created >= startDate && created <= endDate;
      });
      return deliverables.length;
    }
    case 'deliverables_approved': {
      const deliverables = store.deliverables.findAll().filter((d: any) => {
        const created = new Date(d.createdAt);
        return d.status === 'approved' && created >= startDate && created <= endDate;
      });
      return deliverables.length;
    }
    default:
      return null;
  }
}

function computeFunnelMetric(
  metricId: string,
  scopeType: ScopeType,
  scopeRefId: string,
  startDate: Date,
  endDate: Date
): number | null {
  const statuses = store.recommendationStatuses.findAll();
  const surfaced = statuses.filter((s: any) => s.status === 'surfaced').length;
  const reviewed = statuses.filter((s: any) => s.status === 'reviewed').length;
  const presented = statuses.filter((s: any) => s.status === 'presented').length;
  const accepted = statuses.filter((s: any) => s.status === 'accepted').length;
  const implemented = statuses.filter((s: any) => s.status === 'implemented').length;

  switch (metricId) {
    case 'surfaced_to_reviewed':
      return surfaced > 0 ? reviewed / surfaced : 0;
    case 'reviewed_to_presented':
      return reviewed > 0 ? presented / reviewed : 0;
    case 'presented_to_accepted':
      return presented > 0 ? accepted / presented : 0;
    case 'accepted_to_implemented':
      return accepted > 0 ? implemented / accepted : 0;
    default:
      return null;
  }
}

function computeExecutionMetric(
  metricId: string,
  scopeType: ScopeType,
  scopeRefId: string,
  startDate: Date,
  endDate: Date
): number | null {
  const tasks = store.workflowTasks.findAll();

  switch (metricId) {
    case 'tasks_created': {
      const created = tasks.filter((t: any) => {
        const createdDate = new Date(t.createdAt);
        return t.status !== 'canceled' && createdDate >= startDate && createdDate <= endDate;
      });
      return created.length;
    }
    case 'tasks_completed': {
      const completed = tasks.filter((t: any) => {
        const completedDate = t.completedAt ? new Date(t.completedAt) : null;
        return t.status === 'completed' && completedDate && completedDate >= startDate && completedDate <= endDate;
      });
      return completed.length;
    }
    case 'avg_task_completion_days': {
      const completed = tasks.filter((t: any) => t.status === 'completed' && t.completedAt);
      if (completed.length === 0) return 0;
      const totalDays = completed.reduce((sum: number, t: any) => {
        const created = new Date(t.createdAt);
        const done = new Date(t.completedAt!);
        const days = (done.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
        return sum + days;
      }, 0);
      return totalDays / completed.length;
    }
    case 'overdue_rate': {
      const now = new Date();
      const active = tasks.filter((t: any) => !['completed', 'canceled', 'superseded'].includes(t.status));
      const overdue = active.filter((t: any) => {
        if (!t.dueDate) return false;
        return new Date(t.dueDate) < now;
      });
      return active.length > 0 ? overdue.length / active.length : 0;
    }
    case 'blocked_rate': {
      const active = tasks.filter((t: any) => !['completed', 'canceled', 'superseded'].includes(t.status));
      const blocked = active.filter((t: any) => t.status === 'blocked');
      return active.length > 0 ? blocked.length / active.length : 0;
    }
    case 'cpa_turnaround_days': {
      const requests = store.cpaRequests.findAll().filter((r: any) => r.status === 'completed');
      if (requests.length === 0) return 0;
      const totalDays = requests.reduce((sum: number, r: any) => {
        const sent = new Date(r.sentAt);
        const received = new Date(r.responseReceivedAt!);
        const days = (received.getTime() - sent.getTime()) / (1000 * 60 * 60 * 24);
        return sum + days;
      }, 0);
      return totalDays / requests.length;
    }
    default:
      return null;
  }
}

function computeValueMetric(
  metricId: string,
  scopeType: ScopeType,
  scopeRefId: string,
  startDate: Date,
  endDate: Date
): number | null {
  const attributions = store.valueAttributions.findAll();

  switch (metricId) {
    case 'estimated_proposed_value': {
      const filtered = attributions.filter((a: any) => a.status !== 'superseded');
      return filtered.reduce((sum: number, a: any) => sum + a.proposedValueCents, 0);
    }
    case 'estimated_accepted_value': {
      const filtered = attributions.filter((a: any) => ['accepted', 'implemented'].includes(a.status));
      return filtered.reduce((sum: number, a: any) => sum + (a.acceptedValueCents ?? 0), 0);
    }
    case 'estimated_implemented_value': {
      const filtered = attributions.filter((a: any) => a.status === 'implemented');
      return filtered.reduce((sum: number, a: any) => sum + (a.implementedValueCents ?? 0), 0);
    }
    default:
      return null;
  }
}

function computeProductivityMetric(
  metricId: string,
  scopeType: ScopeType,
  scopeRefId: string,
  startDate: Date,
  endDate: Date
): number | null {
  switch (metricId) {
    case 'households_per_advisor': {
      const users = store.users.findAll().filter((u: any) => ['ADVISOR', 'PARAPLANNER'].includes(u.role));
      const households = store.households.findAll();
      return users.length > 0 ? households.length / users.length : 0;
    }
    case 'scenarios_per_case': {
      const households = store.households.findAll();
      const scenarios = store.scenarios.findAll();
      return households.length > 0 ? scenarios.length / households.length : 0;
    }
    case 'avg_time_to_recommendation': {
      const households = store.households.findAll();
      let totalDays = 0;
      let count = 0;
      for (const h of households) {
        const firstRec = store.scenarios
          .findAll()
          .filter((s: any) => s.householdId === h.householdId && s.status === 'recommended')
          .sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())[0];
        if (firstRec) {
          const created = new Date(h.createdAt);
          const recDate = new Date(firstRec.createdAt);
          const days = (recDate.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
          totalDays += days;
          count++;
        }
      }
      return count > 0 ? totalDays / count : 0;
    }
    case 'ai_drafting_utilization': {
      const deliverables = store.deliverables.findAll();
      const withAI = deliverables.filter((d: any) => {
        const answers = store.copilotAnswers.findAll().filter((a: any) => a.scenarioId === d.scenarioId);
        return answers.length > 0;
      });
      return deliverables.length > 0 ? withAI.length / deliverables.length : 0;
    }
    default:
      return null;
  }
}
