// =============================================================================
// Analytics — Bottleneck Engine
// =============================================================================
//
// Identifies workflow bottlenecks by analyzing open, overdue, and blocked
// tasks, plus CPA turnaround times. Flags areas exceeding alert thresholds.
// =============================================================================

import { store } from '../store';
import type { WorkflowBottleneck, ScopeType } from './types';

// ==================== Bottleneck Thresholds ====================

const THRESHOLDS = {
  open_tasks: 50,
  overdue_tasks: 10,
  blocked_tasks: 5,
  avg_completion_days: 14,
  cpa_turnaround_days: 7,
};

// ==================== Bottleneck Computation ====================

/**
 * Computes workflow bottlenecks for a given scope.
 *
 * @param scopeType - Optional scope type (household, advisor, team, office, firm).
 * @param scopeRefId - Optional ID of the scope entity.
 * @returns Array of workflow bottleneck records.
 */
export function computeWorkflowBottlenecks(scopeType?: ScopeType, scopeRefId?: string): WorkflowBottleneck[] {
  const bottlenecks: WorkflowBottleneck[] = [];

  let tasks = store.workflowTasks.findAll();

  // Apply scope filters
  if (scopeType === 'household' && scopeRefId) {
    tasks = tasks.filter((t) => t.householdId === scopeRefId);
  } else if (scopeType === 'advisor' && scopeRefId) {
    tasks = tasks.filter((t) => t.ownerUserId === scopeRefId);
  }

  // Open tasks
  const openTasks = tasks.filter((t) => !['completed', 'canceled', 'superseded'].includes(t.status));
  bottlenecks.push({
    metricType: 'open_tasks',
    value: openTasks.length,
    threshold: THRESHOLDS.open_tasks,
    isAlert: openTasks.length > THRESHOLDS.open_tasks,
  });

  // Overdue tasks
  const now = new Date();
  const overdueTasks = openTasks.filter((t) => {
    if (!t.dueDate) return false;
    return new Date(t.dueDate) < now;
  });
  bottlenecks.push({
    metricType: 'overdue_tasks',
    value: overdueTasks.length,
    threshold: THRESHOLDS.overdue_tasks,
    isAlert: overdueTasks.length > THRESHOLDS.overdue_tasks,
  });

  // Blocked tasks
  const blockedTasks = tasks.filter((t) => t.status === 'blocked');
  bottlenecks.push({
    metricType: 'blocked_tasks',
    value: blockedTasks.length,
    threshold: THRESHOLDS.blocked_tasks,
    isAlert: blockedTasks.length > THRESHOLDS.blocked_tasks,
  });

  // Average task completion days
  const completedTasks = tasks.filter((t) => t.status === 'completed' && t.completedAt);
  if (completedTasks.length > 0) {
    const totalDays = completedTasks.reduce((sum, t) => {
      const created = new Date(t.createdAt);
      const completed = new Date(t.completedAt!);
      const days = (completed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
      return sum + days;
    }, 0);
    const avgDays = totalDays / completedTasks.length;
    bottlenecks.push({
      metricType: 'avg_completion_days',
      value: avgDays,
      threshold: THRESHOLDS.avg_completion_days,
      isAlert: avgDays > THRESHOLDS.avg_completion_days,
    });
  }

  // CPA turnaround days
  const cpaRequests = store.cpaRequests.findAll().filter((r) => r.status === 'completed');
  if (cpaRequests.length > 0) {
    const totalDays = cpaRequests.reduce((sum, r) => {
      const sent = new Date(r.sentAt);
      const received = new Date(r.responseReceivedAt!);
      const days = (received.getTime() - sent.getTime()) / (1000 * 60 * 60 * 24);
      return sum + days;
    }, 0);
    const avgDays = totalDays / cpaRequests.length;
    bottlenecks.push({
      metricType: 'cpa_turnaround_days',
      value: avgDays,
      threshold: THRESHOLDS.cpa_turnaround_days,
      isAlert: avgDays > THRESHOLDS.cpa_turnaround_days,
    });
  }

  return bottlenecks;
}
