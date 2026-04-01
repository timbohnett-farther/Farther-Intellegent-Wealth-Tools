// =============================================================================
// Workflow, Tasks, & CRM/CPA Integration — Task Service
// =============================================================================
//
// Core service for creating, updating, and assigning workflow tasks.
// =============================================================================

import { randomUUID } from 'crypto';
import type { AuthContext } from '../rbac';
import { hasPermission } from '../rbac';
import { store } from '../store';
import { auditService } from '../audit';
import type { TaxYear } from '../types';
import type {
  WorkflowTask,
  CreateTaskCommand,
  UpdateTaskCommand,
  AssignTaskCommand,
} from './types';
import { transitionTask } from './state-machines';

// =====================================================================
// Create Task
// =====================================================================

/**
 * Creates a new workflow task.
 *
 * @param command - The task creation command.
 * @param authContext - The authenticated user context.
 * @param ip - Optional IP address for audit trail.
 * @returns The created task.
 * @throws Error on authorization failure or invalid data.
 */
export function createTask(
  command: CreateTaskCommand,
  authContext: AuthContext,
  ip?: string
): WorkflowTask {
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

  // 3. Build task
  const now = new Date().toISOString();
  const task: WorkflowTask = {
    taskId: randomUUID(),
    householdId: command.householdId,
    taxYear: command.taxYear as TaxYear,
    workflowRunId: command.workflowRunId,
    taskType: command.taskType,
    status: 'new',
    title: command.title,
    description: command.description,
    ownerUserId: command.ownerUserId,
    ownerRole: command.ownerRole,
    dueDate: command.dueDate,
    dependsOn: command.dependsOn ?? [],
    metadata: command.metadata ?? {},
    createdBy: authContext.userId,
    createdAt: now,
    updatedAt: now,
  };

  // 4. Persist
  store.upsertWorkflowTask(task);

  // 5. Audit
  auditService.emit({
    firmId: authContext.firmId,
    userId: authContext.userId,
    eventKey: 'task.created',
    ip: ip ?? '0.0.0.0',
    payload: {
      task_id: task.taskId,
      household_id: task.householdId,
      tax_year: task.taxYear,
      task_type: task.taskType,
      title: task.title,
      owner_user_id: task.ownerUserId,
      owner_role: task.ownerRole,
    },
  });

  return task;
}

// =====================================================================
// Update Task
// =====================================================================

/**
 * Updates an existing workflow task.
 *
 * @param taskId - The task ID to update.
 * @param command - The update command.
 * @param authContext - The authenticated user context.
 * @param ip - Optional IP address for audit trail.
 * @returns The updated task.
 * @throws Error on authorization failure, invalid data, or state transition errors.
 */
export function updateTask(
  taskId: string,
  command: UpdateTaskCommand,
  authContext: AuthContext,
  ip?: string
): WorkflowTask {
  // 1. RBAC check
  if (!hasPermission(authContext.role, 'workflow:write')) {
    throw new Error(
      `Authorization denied: role "${authContext.role}" does not have permission "workflow:write".`
    );
  }

  // 2. Load existing task
  const existing = store.getWorkflowTask(taskId);
  if (!existing) {
    throw new Error(`Task "${taskId}" not found.`);
  }

  // 3. Apply updates
  const now = new Date().toISOString();
  const updated: WorkflowTask = {
    ...existing,
    ...command,
    taskId: existing.taskId, // Immutable
    householdId: existing.householdId, // Immutable
    taxYear: existing.taxYear, // Immutable
    createdBy: existing.createdBy, // Immutable
    createdAt: existing.createdAt, // Immutable
    updatedAt: now,
  };

  // 4. State transition (if status is changing)
  if (command.status && command.status !== existing.status) {
    updated.status = transitionTask(existing.status, command.status);
    if (updated.status === 'completed' && !updated.completedAt) {
      updated.completedAt = now;
    }
  }

  // 5. Persist
  store.upsertWorkflowTask(updated);

  // 6. Audit
  auditService.emit({
    firmId: authContext.firmId,
    userId: authContext.userId,
    eventKey: command.status === 'completed' ? 'task.completed' : 'task.updated',
    ip: ip ?? '0.0.0.0',
    payload: {
      task_id: taskId,
      household_id: updated.householdId,
      old_status: existing.status,
      new_status: updated.status,
      changes: command,
    },
  });

  return updated;
}

// =====================================================================
// Assign Task
// =====================================================================

/**
 * Assigns a task to a user.
 *
 * @param taskId - The task ID to assign.
 * @param command - The assignment command.
 * @param authContext - The authenticated user context.
 * @param ip - Optional IP address for audit trail.
 * @returns The updated task.
 * @throws Error on authorization failure or invalid data.
 */
export function assignTask(
  taskId: string,
  command: AssignTaskCommand,
  authContext: AuthContext,
  ip?: string
): WorkflowTask {
  // 1. RBAC check
  if (!hasPermission(authContext.role, 'workflow:write')) {
    throw new Error(
      `Authorization denied: role "${authContext.role}" does not have permission "workflow:write".`
    );
  }

  // 2. Load existing task
  const existing = store.getWorkflowTask(taskId);
  if (!existing) {
    throw new Error(`Task "${taskId}" not found.`);
  }

  // 3. Apply assignment
  const now = new Date().toISOString();
  const updated: WorkflowTask = {
    ...existing,
    ownerUserId: command.ownerUserId,
    ownerRole: command.ownerRole,
    status: existing.status === 'new' ? 'assigned' : existing.status,
    updatedAt: now,
  };

  // 4. Persist
  store.upsertWorkflowTask(updated);

  // 5. Audit
  auditService.emit({
    firmId: authContext.firmId,
    userId: authContext.userId,
    eventKey: 'task.assigned',
    ip: ip ?? '0.0.0.0',
    payload: {
      task_id: taskId,
      household_id: updated.householdId,
      owner_user_id: command.ownerUserId,
      owner_role: command.ownerRole,
    },
  });

  return updated;
}
