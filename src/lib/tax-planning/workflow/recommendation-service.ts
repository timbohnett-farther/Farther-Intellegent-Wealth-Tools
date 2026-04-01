// =============================================================================
// Workflow, Tasks, & CRM/CPA Integration — Recommendation Service
// =============================================================================
//
// Manages recommendation execution status and lifecycle transitions.
// =============================================================================

import type { AuthContext } from '../rbac';
import { hasPermission } from '../rbac';
import { store } from '../store';
import { auditService } from '../audit';
import type { RecommendationExecutionStatus, UpdateRecommendationCommand } from './types';
import { transitionRecommendation } from './state-machines';

// =====================================================================
// Update Recommendation Status
// =====================================================================

/**
 * Updates the status of a recommendation execution.
 *
 * @param recommendationId - The recommendation ID to update.
 * @param command - The update command.
 * @param authContext - The authenticated user context.
 * @param ip - Optional IP address for audit trail.
 * @returns The updated recommendation status.
 * @throws Error on authorization failure or invalid data.
 */
export function updateRecommendationStatus(
  recommendationId: string,
  command: UpdateRecommendationCommand,
  authContext: AuthContext,
  ip?: string
): RecommendationExecutionStatus {
  // 1. RBAC check
  if (!hasPermission(authContext.role, 'workflow:write')) {
    throw new Error(
      `Authorization denied: role "${authContext.role}" does not have permission "workflow:write".`
    );
  }

  // 2. Load existing recommendation
  const existing = store.getRecommendationExecutionStatus(recommendationId);
  if (!existing) {
    throw new Error(`Recommendation "${recommendationId}" not found.`);
  }

  // 3. State transition
  const newStatus = transitionRecommendation(existing.status, command.status);

  // 4. Apply updates
  const now = new Date().toISOString();
  const updated: RecommendationExecutionStatus = {
    ...existing,
    status: newStatus,
    relatedTaskIds: command.relatedTaskIds ?? existing.relatedTaskIds,
    updatedAt: now,
  };

  if (newStatus === 'implemented' && !updated.implementedAt) {
    updated.implementedAt = now;
  }

  // 5. Persist
  store.upsertRecommendationExecutionStatus(updated);

  // 6. Audit
  auditService.emit({
    firmId: authContext.firmId,
    userId: authContext.userId,
    eventKey: 'recommendation.status_updated',
    ip: ip ?? '0.0.0.0',
    payload: {
      recommendation_id: recommendationId,
      household_id: updated.householdId,
      old_status: existing.status,
      new_status: updated.status,
      related_task_ids: updated.relatedTaskIds,
    },
  });

  return updated;
}
