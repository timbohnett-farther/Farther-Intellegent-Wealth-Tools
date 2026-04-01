// =============================================================================
// Workflow, Tasks, & CRM/CPA Integration — Workflow Service
// =============================================================================
//
// Core service for creating and updating workflow runs.
// Resolves templates and generates tasks from blueprints.
// =============================================================================

import { randomUUID } from 'crypto';
import type { AuthContext } from '../rbac';
import { hasPermission } from '../rbac';
import { store } from '../store';
import { auditService } from '../audit';
import type { TaxYear } from '../types';
import type { WorkflowRun, CreateWorkflowCommand, UpdateWorkflowCommand } from './types';
import { transitionWorkflow } from './state-machines';
import { getWorkflowTemplate } from './templates';
import { createTask } from './task-service';

// =====================================================================
// Create Workflow
// =====================================================================

/**
 * Creates a new workflow run from a template.
 * Generates all tasks defined in the template.
 *
 * @param command - The workflow creation command.
 * @param authContext - The authenticated user context.
 * @param ip - Optional IP address for audit trail.
 * @returns The created workflow run.
 * @throws Error on authorization failure, invalid data, or template not found.
 */
export function createWorkflow(
  command: CreateWorkflowCommand,
  authContext: AuthContext,
  ip?: string
): WorkflowRun {
  // 1. RBAC check
  if (!hasPermission(authContext.role, 'workflow:write')) {
    throw new Error(
      `Authorization denied: role "${authContext.role}" does not have permission "workflow:write".`
    );
  }

  // 2. Validate household exists
  const household = store.getHousehold(command.householdId);
  if (!household) {
    throw new Error(`Household "${command.householdId}" not found.`);
  }

  // 3. Resolve template
  const template = getWorkflowTemplate(command.workflowType);
  if (!template) {
    throw new Error(`Workflow template "${command.workflowType}" not found.`);
  }
  if (!template.enabled) {
    throw new Error(`Workflow template "${command.workflowType}" is disabled.`);
  }

  // 4. Build workflow run
  const now = new Date().toISOString();
  const workflowRun: WorkflowRun = {
    workflowRunId: randomUUID(),
    householdId: command.householdId,
    taxYear: command.taxYear as TaxYear,
    workflowType: command.workflowType,
    status: 'new',
    name: command.name ?? template.name,
    taskIds: [],
    metadata: command.metadata ?? {},
    createdBy: authContext.userId,
    createdAt: now,
    updatedAt: now,
  };

  // 5. Generate tasks from template
  const taskIdMap: Record<string, string> = {};
  for (const taskBlueprint of template.tasks) {
    const dueDate = taskBlueprint.estimatedDays
      ? new Date(Date.now() + taskBlueprint.estimatedDays * 24 * 60 * 60 * 1000).toISOString()
      : undefined;

    const dependsOn = taskBlueprint.dependsOnKeys.map((key) => taskIdMap[key]).filter(Boolean);

    const task = createTask(
      {
        householdId: command.householdId,
        taxYear: command.taxYear,
        workflowRunId: workflowRun.workflowRunId,
        taskType: taskBlueprint.taskType,
        title: interpolate(taskBlueprint.title, command.metadata ?? {}),
        description: taskBlueprint.description
          ? interpolate(taskBlueprint.description, command.metadata ?? {})
          : undefined,
        ownerRole: taskBlueprint.defaultOwnerRole,
        dueDate,
        dependsOn,
        metadata: { templateTaskKey: taskBlueprint.taskKey },
      },
      authContext,
      ip
    );

    taskIdMap[taskBlueprint.taskKey] = task.taskId;
    workflowRun.taskIds.push(task.taskId);
  }

  // 6. Persist workflow
  store.upsertWorkflowRun(workflowRun);

  // 7. Audit
  auditService.emit({
    firmId: authContext.firmId,
    userId: authContext.userId,
    eventKey: 'workflow.created',
    ip: ip ?? '0.0.0.0',
    payload: {
      workflow_run_id: workflowRun.workflowRunId,
      household_id: workflowRun.householdId,
      tax_year: workflowRun.taxYear,
      workflow_type: workflowRun.workflowType,
      task_count: workflowRun.taskIds.length,
    },
  });

  return workflowRun;
}

// =====================================================================
// Update Workflow
// =====================================================================

/**
 * Updates an existing workflow run.
 *
 * @param workflowRunId - The workflow run ID to update.
 * @param command - The update command.
 * @param authContext - The authenticated user context.
 * @param ip - Optional IP address for audit trail.
 * @returns The updated workflow run.
 * @throws Error on authorization failure, invalid data, or state transition errors.
 */
export function updateWorkflow(
  workflowRunId: string,
  command: UpdateWorkflowCommand,
  authContext: AuthContext,
  ip?: string
): WorkflowRun {
  // 1. RBAC check
  if (!hasPermission(authContext.role, 'workflow:write')) {
    throw new Error(
      `Authorization denied: role "${authContext.role}" does not have permission "workflow:write".`
    );
  }

  // 2. Load existing workflow
  const existing = store.getWorkflowRun(workflowRunId);
  if (!existing) {
    throw new Error(`Workflow run "${workflowRunId}" not found.`);
  }

  // 3. Apply updates
  const now = new Date().toISOString();
  const updated: WorkflowRun = {
    ...existing,
    ...command,
    workflowRunId: existing.workflowRunId, // Immutable
    householdId: existing.householdId, // Immutable
    taxYear: existing.taxYear, // Immutable
    workflowType: existing.workflowType, // Immutable
    createdBy: existing.createdBy, // Immutable
    createdAt: existing.createdAt, // Immutable
    updatedAt: now,
  };

  // 4. State transition (if status is changing)
  if (command.status && command.status !== existing.status) {
    updated.status = transitionWorkflow(existing.status, command.status);
    if (updated.status === 'completed' && !updated.completedAt) {
      updated.completedAt = now;
    }
  }

  // 5. Persist
  store.upsertWorkflowRun(updated);

  // 6. Audit
  auditService.emit({
    firmId: authContext.firmId,
    userId: authContext.userId,
    eventKey: command.status === 'completed' ? 'workflow.completed' : 'workflow.updated',
    ip: ip ?? '0.0.0.0',
    payload: {
      workflow_run_id: workflowRunId,
      household_id: updated.householdId,
      old_status: existing.status,
      new_status: updated.status,
      changes: command,
    },
  });

  return updated;
}

// =====================================================================
// Helpers
// =====================================================================

/**
 * Interpolates template variables in a string.
 * Variables are in {{key}} format.
 */
function interpolate(template: string, vars: Record<string, unknown>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const value = vars[key];
    return value !== undefined ? String(value) : `{{${key}}}`;
  });
}
