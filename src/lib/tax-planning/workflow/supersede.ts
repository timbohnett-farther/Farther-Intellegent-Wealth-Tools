// =============================================================================
// Workflow, Tasks, & CRM/CPA Integration — Supersede Utility
// =============================================================================
//
// Marks tasks, workflows, and CPA requests as superseded.
// =============================================================================

import { store } from '../store';

// =====================================================================
// Supersede Functions
// =====================================================================

/**
 * Marks a task as superseded.
 *
 * @param taskId - The task ID to supersede.
 */
export function supersedeTask(taskId: string): void {
  const task = store.getWorkflowTask(taskId);
  if (!task) {
    throw new Error(`Task "${taskId}" not found.`);
  }

  const updated = {
    ...task,
    status: 'superseded' as const,
    updatedAt: new Date().toISOString(),
  };

  store.upsertWorkflowTask(updated);
}

/**
 * Marks a workflow as superseded.
 *
 * @param workflowRunId - The workflow run ID to supersede.
 */
export function supersedeWorkflow(workflowRunId: string): void {
  const workflow = store.getWorkflowRun(workflowRunId);
  if (!workflow) {
    throw new Error(`Workflow run "${workflowRunId}" not found.`);
  }

  const updated = {
    ...workflow,
    status: 'superseded' as const,
    updatedAt: new Date().toISOString(),
  };

  store.upsertWorkflowRun(updated);
}

/**
 * Marks a CPA request as superseded.
 *
 * @param requestId - The CPA request ID to supersede.
 */
export function supersedeCPARequest(requestId: string): void {
  const request = store.getCPACoordinationRequest(requestId);
  if (!request) {
    throw new Error(`CPA request "${requestId}" not found.`);
  }

  const updated = {
    ...request,
    status: 'superseded' as const,
    updatedAt: new Date().toISOString(),
  };

  store.upsertCPACoordinationRequest(updated);
}
