// =============================================================================
// Workflow, Tasks, & CRM/CPA Integration — CRM Service
// =============================================================================
//
// Builds and manages CRM sync payloads for HubSpot integration.
// =============================================================================

import { randomUUID } from 'crypto';
import type { AuthContext } from '../rbac';
import { hasPermission } from '../rbac';
import { store } from '../store';
import { auditService } from '../audit';
import type { CRMSyncPayload, BuildCRMPayloadCommand } from './types';

// =====================================================================
// Build CRM Payload
// =====================================================================

/**
 * Builds a structured CRM sync payload for pushing to HubSpot.
 *
 * @param command - The build command.
 * @param authContext - The authenticated user context.
 * @param ip - Optional IP address for audit trail.
 * @returns The created CRM sync payload.
 * @throws Error on authorization failure or invalid data.
 */
export function buildCRMPayload(
  command: BuildCRMPayloadCommand,
  authContext: AuthContext,
  ip?: string
): CRMSyncPayload {
  // 1. RBAC check
  if (!hasPermission(authContext.role, 'crm:write')) {
    throw new Error(
      `Authorization denied: role "${authContext.role}" does not have permission "crm:write".`
    );
  }

  // 2. Validate household exists
  const household = store.getHousehold(command.householdId);
  if (!household) {
    throw new Error(`Household "${command.householdId}" not found.`);
  }

  // 3. Build payload
  const now = new Date().toISOString();
  const crmPayload: CRMSyncPayload = {
    payloadId: randomUUID(),
    householdId: command.householdId,
    payloadType: command.payloadType,
    syncStatus: 'pending',
    payload: command.payload,
    sourceTaskId: command.sourceTaskId,
    sourceRecommendationId: command.sourceRecommendationId,
    createdBy: authContext.userId,
    createdAt: now,
  };

  // 4. Persist
  store.upsertCRMSyncPayload(crmPayload);

  // 5. Audit
  auditService.emit({
    firmId: authContext.firmId,
    userId: authContext.userId,
    eventKey: 'crm_sync.created',
    ip: ip ?? '0.0.0.0',
    payload: {
      payload_id: crmPayload.payloadId,
      household_id: crmPayload.householdId,
      payload_type: crmPayload.payloadType,
      source_task_id: crmPayload.sourceTaskId,
      source_recommendation_id: crmPayload.sourceRecommendationId,
    },
  });

  return crmPayload;
}

// =====================================================================
// Update CRM Payload Status
// =====================================================================

/**
 * Marks a CRM payload as successfully sent.
 */
export function markCRMPayloadSent(payloadId: string): CRMSyncPayload {
  const existing = store.getCRMSyncPayload(payloadId);
  if (!existing) {
    throw new Error(`CRM payload "${payloadId}" not found.`);
  }

  const updated: CRMSyncPayload = {
    ...existing,
    syncStatus: 'sent',
    lastSyncAttemptAt: new Date().toISOString(),
  };

  store.upsertCRMSyncPayload(updated);
  return updated;
}

/**
 * Marks a CRM payload as failed with an error message.
 */
export function markCRMPayloadFailed(payloadId: string, errorMessage: string): CRMSyncPayload {
  const existing = store.getCRMSyncPayload(payloadId);
  if (!existing) {
    throw new Error(`CRM payload "${payloadId}" not found.`);
  }

  const updated: CRMSyncPayload = {
    ...existing,
    syncStatus: 'failed',
    errorMessage,
    lastSyncAttemptAt: new Date().toISOString(),
  };

  store.upsertCRMSyncPayload(updated);
  return updated;
}
