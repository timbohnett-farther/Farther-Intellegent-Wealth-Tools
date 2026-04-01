// =============================================================================
// Workflow, Tasks, & CRM/CPA Integration — Dependency Engine
// =============================================================================
//
// Evaluates task dependencies and validates dependency graphs for cycles.
// =============================================================================

import { store } from '../store';
import type { DependencyEvaluationResult } from './types';

// =====================================================================
// Dependency Evaluation
// =====================================================================

/**
 * Evaluates whether all dependencies for a task are satisfied.
 *
 * @param taskId - The task ID to evaluate.
 * @returns Dependency evaluation result with blocking task IDs.
 */
export function evaluateDependencies(taskId: string): DependencyEvaluationResult {
  const task = store.getWorkflowTask(taskId);
  if (!task) {
    throw new Error(`Task "${taskId}" not found.`);
  }

  if (task.dependsOn.length === 0) {
    return {
      canStart: true,
      blockingTaskIds: [],
      completedDependencyIds: [],
    };
  }

  const blockingTaskIds: string[] = [];
  const completedDependencyIds: string[] = [];

  for (const depId of task.dependsOn) {
    const depTask = store.getWorkflowTask(depId);
    if (!depTask) {
      // Dependency task not found — treat as blocking
      blockingTaskIds.push(depId);
      continue;
    }

    if (depTask.status === 'completed') {
      completedDependencyIds.push(depId);
    } else {
      blockingTaskIds.push(depId);
    }
  }

  return {
    canStart: blockingTaskIds.length === 0,
    blockingTaskIds,
    completedDependencyIds,
  };
}

// =====================================================================
// Cycle Detection
// =====================================================================

/**
 * Validates that a dependency graph has no cycles.
 *
 * @param taskIds - Array of task IDs to validate.
 * @param dependencyMap - Map of task ID to array of dependency task IDs.
 * @returns `true` if no cycles detected, `false` otherwise.
 */
export function validateNoCycles(
  taskIds: string[],
  dependencyMap: Record<string, string[]>
): boolean {
  const visited = new Set<string>();
  const recStack = new Set<string>();

  function hasCycle(taskId: string): boolean {
    if (recStack.has(taskId)) return true; // Cycle detected
    if (visited.has(taskId)) return false; // Already processed

    visited.add(taskId);
    recStack.add(taskId);

    const deps = dependencyMap[taskId] ?? [];
    for (const depId of deps) {
      if (hasCycle(depId)) return true;
    }

    recStack.delete(taskId);
    return false;
  }

  for (const taskId of taskIds) {
    if (hasCycle(taskId)) return false;
  }

  return true;
}
