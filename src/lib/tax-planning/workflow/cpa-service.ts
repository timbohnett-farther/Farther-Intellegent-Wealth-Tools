// =============================================================================
// Workflow, Tasks, & CRM/CPA Integration — CPA Service
// =============================================================================
//
// Manages CPA coordination requests and their lifecycle.
// =============================================================================

import { randomUUID } from 'crypto';
import type { AuthContext } from '../rbac';
import { hasPermission } from '../rbac';
import { store } from '../store';
import { auditService } from '../audit';
import type { TaxYear } from '../types';
import type { CPACoordinationRequest, CreateCPARequestCommand, UpdateCPARequestCommand } from './types';
import { transitionCPARequest } from './state-machines';

// =====================================================================
// Create CPA Request
// =====================================================================

/**
 * Creates a new CPA coordination request.
 *
 * @param command - The creation command.
 * @param authContext - The authenticated user context.
 * @param ip - Optional IP address for audit trail.
 * @returns The created CPA request.
 * @throws Error on authorization failure or invalid data.
 */
export function createCPARequest(
  command: CreateCPARequestCommand,
  authContext: AuthContext,
  ip?: string
): CPACoordinationRequest {
  // 1. RBAC check
  if (!hasPermission(authContext.role, 'cpa:write')) {
    throw new Error(
      `Authorization denied: role "${authContext.role}" does not have permission "cpa:write".`
    );
  }

  // 2. Validate household exists
  const household = store.getHousehold(command.householdId);
  if (!household) {
    throw new Error(`Household "${command.householdId}" not found.`);
  }

  // 3. Build CPA request
  const now = new Date().toISOString();
  const request: CPACoordinationRequest = {
    requestId: randomUUID(),
    householdId: command.householdId,
    taxYear: command.taxYear as TaxYear,
    status: 'draft',
    subject: command.subject,
    message: command.message,
    cpaEmail: command.cpaEmail,
    cpaName: command.cpaName,
    relatedTaskId: command.relatedTaskId,
    createdBy: authContext.userId,
    createdAt: now,
    updatedAt: now,
  };

  // 4. Persist
  store.upsertCPACoordinationRequest(request);

  // 5. Audit
  auditService.emit({
    firmId: authContext.firmId,
    userId: authContext.userId,
    eventKey: 'cpa_request.created',
    ip: ip ?? '0.0.0.0',
    payload: {
      request_id: request.requestId,
      household_id: request.householdId,
      tax_year: request.taxYear,
      subject: request.subject,
      cpa_email: request.cpaEmail,
    },
  });

  return request;
}

// =====================================================================
// Update CPA Request
// =====================================================================

/**
 * Updates an existing CPA coordination request.
 *
 * @param requestId - The request ID to update.
 * @param command - The update command.
 * @param authContext - The authenticated user context.
 * @param ip - Optional IP address for audit trail.
 * @returns The updated CPA request.
 * @throws Error on authorization failure or invalid data.
 */
export function updateCPARequest(
  requestId: string,
  command: UpdateCPARequestCommand,
  authContext: AuthContext,
  ip?: string
): CPACoordinationRequest {
  // 1. RBAC check
  if (!hasPermission(authContext.role, 'cpa:write')) {
    throw new Error(
      `Authorization denied: role "${authContext.role}" does not have permission "cpa:write".`
    );
  }

  // 2. Load existing request
  const existing = store.getCPACoordinationRequest(requestId);
  if (!existing) {
    throw new Error(`CPA request "${requestId}" not found.`);
  }

  // 3. Apply updates
  const now = new Date().toISOString();
  const updated: CPACoordinationRequest = {
    ...existing,
    ...command,
    requestId: existing.requestId, // Immutable
    householdId: existing.householdId, // Immutable
    taxYear: existing.taxYear, // Immutable
    createdBy: existing.createdBy, // Immutable
    createdAt: existing.createdAt, // Immutable
    updatedAt: now,
  };

  // 4. State transition (if status is changing)
  if (command.status && command.status !== existing.status) {
    updated.status = transitionCPARequest(existing.status, command.status);
    if (updated.status === 'sent' && !updated.sentAt) {
      updated.sentAt = now;
    }
    if (updated.status === 'response_received' && !updated.respondedAt) {
      updated.respondedAt = now;
    }
  }

  // 5. Persist
  store.upsertCPACoordinationRequest(updated);

  // 6. Audit
  auditService.emit({
    firmId: authContext.firmId,
    userId: authContext.userId,
    eventKey: command.status === 'completed' ? 'cpa_request.completed' : 'cpa_request.updated',
    ip: ip ?? '0.0.0.0',
    payload: {
      request_id: requestId,
      household_id: updated.householdId,
      old_status: existing.status,
      new_status: updated.status,
    },
  });

  return updated;
}
