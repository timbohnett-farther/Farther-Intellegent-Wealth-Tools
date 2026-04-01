// =============================================================================
// Workflow, Tasks, & CRM/CPA Integration — State Machines
// =============================================================================
//
// State machines for task, workflow, CPA request, and recommendation lifecycles.
// Each machine defines valid state transitions and terminal states.
// =============================================================================

import type {
  TaskStatus,
  WorkflowStatus,
  CPARequestStatus,
  RecommendationStatus,
} from './types';

// =====================================================================
// Task State Machine
// =====================================================================

const TASK_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  new: ['assigned', 'in_progress', 'canceled'],
  assigned: ['in_progress', 'canceled'],
  in_progress: ['waiting', 'blocked', 'completed', 'deferred', 'canceled'],
  waiting: ['in_progress', 'blocked', 'completed', 'canceled'],
  blocked: ['in_progress', 'waiting', 'deferred', 'canceled'],
  completed: ['superseded'],
  deferred: ['assigned', 'in_progress', 'canceled', 'superseded'],
  canceled: ['superseded'],
  superseded: [],
};

const TASK_TERMINAL_STATES: TaskStatus[] = ['completed', 'canceled', 'superseded'];

/**
 * Checks if a task state transition is valid.
 */
export function canTransitionTask(from: TaskStatus, to: TaskStatus): boolean {
  return TASK_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Transitions a task to a new state.
 * @throws Error if transition is invalid.
 */
export function transitionTask(from: TaskStatus, to: TaskStatus): TaskStatus {
  if (!canTransitionTask(from, to)) {
    throw new Error(`Invalid task state transition: ${from} -> ${to}`);
  }
  return to;
}

/**
 * Checks if a task status is terminal (no further transitions allowed).
 */
export function isTaskTerminal(status: TaskStatus): boolean {
  return TASK_TERMINAL_STATES.includes(status);
}

/**
 * Returns all valid transition targets from a given task status.
 */
export function getValidTaskTransitions(status: TaskStatus): TaskStatus[] {
  return TASK_TRANSITIONS[status] ?? [];
}

// =====================================================================
// Workflow State Machine
// =====================================================================

const WORKFLOW_TRANSITIONS: Record<WorkflowStatus, WorkflowStatus[]> = {
  new: ['active', 'canceled'],
  active: ['waiting', 'blocked', 'completed', 'deferred', 'canceled'],
  waiting: ['active', 'blocked', 'completed', 'canceled'],
  blocked: ['active', 'waiting', 'deferred', 'canceled'],
  completed: ['superseded'],
  deferred: ['active', 'canceled', 'superseded'],
  canceled: ['superseded'],
  superseded: [],
};

const WORKFLOW_TERMINAL_STATES: WorkflowStatus[] = ['completed', 'canceled', 'superseded'];

/**
 * Checks if a workflow state transition is valid.
 */
export function canTransitionWorkflow(from: WorkflowStatus, to: WorkflowStatus): boolean {
  return WORKFLOW_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Transitions a workflow to a new state.
 * @throws Error if transition is invalid.
 */
export function transitionWorkflow(from: WorkflowStatus, to: WorkflowStatus): WorkflowStatus {
  if (!canTransitionWorkflow(from, to)) {
    throw new Error(`Invalid workflow state transition: ${from} -> ${to}`);
  }
  return to;
}

/**
 * Checks if a workflow status is terminal (no further transitions allowed).
 */
export function isWorkflowTerminal(status: WorkflowStatus): boolean {
  return WORKFLOW_TERMINAL_STATES.includes(status);
}

/**
 * Returns all valid transition targets from a given workflow status.
 */
export function getValidWorkflowTransitions(status: WorkflowStatus): WorkflowStatus[] {
  return WORKFLOW_TRANSITIONS[status] ?? [];
}

// =====================================================================
// CPA Request State Machine
// =====================================================================

const CPA_REQUEST_TRANSITIONS: Record<CPARequestStatus, CPARequestStatus[]> = {
  draft: ['sent', 'canceled'],
  sent: ['acknowledged', 'waiting_on_cpa', 'canceled'],
  acknowledged: ['waiting_on_cpa', 'response_received', 'canceled'],
  waiting_on_cpa: ['response_received', 'canceled'],
  response_received: ['completed', 'waiting_on_cpa'],
  completed: ['superseded'],
  canceled: ['superseded'],
  superseded: [],
};

const CPA_REQUEST_TERMINAL_STATES: CPARequestStatus[] = ['completed', 'canceled', 'superseded'];

/**
 * Checks if a CPA request state transition is valid.
 */
export function canTransitionCPARequest(
  from: CPARequestStatus,
  to: CPARequestStatus
): boolean {
  return CPA_REQUEST_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Transitions a CPA request to a new state.
 * @throws Error if transition is invalid.
 */
export function transitionCPARequest(
  from: CPARequestStatus,
  to: CPARequestStatus
): CPARequestStatus {
  if (!canTransitionCPARequest(from, to)) {
    throw new Error(`Invalid CPA request state transition: ${from} -> ${to}`);
  }
  return to;
}

/**
 * Checks if a CPA request status is terminal (no further transitions allowed).
 */
export function isCPARequestTerminal(status: CPARequestStatus): boolean {
  return CPA_REQUEST_TERMINAL_STATES.includes(status);
}

/**
 * Returns all valid transition targets from a given CPA request status.
 */
export function getValidCPARequestTransitions(status: CPARequestStatus): CPARequestStatus[] {
  return CPA_REQUEST_TRANSITIONS[status] ?? [];
}

// =====================================================================
// Recommendation State Machine
// =====================================================================

const RECOMMENDATION_TRANSITIONS: Record<RecommendationStatus, RecommendationStatus[]> = {
  surfaced: ['reviewed', 'rejected'],
  reviewed: ['presented', 'deferred', 'rejected'],
  presented: ['accepted', 'deferred', 'rejected'],
  accepted: ['in_implementation', 'deferred'],
  deferred: ['reviewed', 'presented', 'accepted', 'rejected'],
  rejected: ['superseded'],
  in_implementation: ['implemented', 'deferred'],
  implemented: ['superseded'],
  superseded: [],
};

const RECOMMENDATION_TERMINAL_STATES: RecommendationStatus[] = [
  'rejected',
  'implemented',
  'superseded',
];

/**
 * Checks if a recommendation state transition is valid.
 */
export function canTransitionRecommendation(
  from: RecommendationStatus,
  to: RecommendationStatus
): boolean {
  return RECOMMENDATION_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Transitions a recommendation to a new state.
 * @throws Error if transition is invalid.
 */
export function transitionRecommendation(
  from: RecommendationStatus,
  to: RecommendationStatus
): RecommendationStatus {
  if (!canTransitionRecommendation(from, to)) {
    throw new Error(`Invalid recommendation state transition: ${from} -> ${to}`);
  }
  return to;
}

/**
 * Checks if a recommendation status is terminal (no further transitions allowed).
 */
export function isRecommendationTerminal(status: RecommendationStatus): boolean {
  return RECOMMENDATION_TERMINAL_STATES.includes(status);
}

/**
 * Returns all valid transition targets from a given recommendation status.
 */
export function getValidRecommendationTransitions(
  status: RecommendationStatus
): RecommendationStatus[] {
  return RECOMMENDATION_TRANSITIONS[status] ?? [];
}
