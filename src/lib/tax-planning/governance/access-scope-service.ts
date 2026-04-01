// =============================================================================
// Governance, Compliance, & Admin Layer — Access Scope Service
// =============================================================================
//
// Manages user access to specific resource scopes (firm, office, team, household).
// Provides grant, revoke, and evaluation methods.
// =============================================================================

import { randomUUID } from 'crypto';
import type { AccessScope, AccessScopeType } from './types';
import { store } from '../store';
import { auditService } from '../audit';

// =====================================================================
// Access Scope Service
// =====================================================================

/**
 * Evaluates whether a user has access to a specific resource scope.
 */
export function evaluateAccess(
  userId: string,
  scopeType: AccessScopeType,
  scopeRefId: string
): boolean {
  const scopes = store.listGovernanceObjects<AccessScope>('access_scopes');
  return scopes.some(
    (s) =>
      s.userId === userId &&
      s.scopeType === scopeType &&
      s.scopeRefId === scopeRefId &&
      s.status === 'active'
  );
}

/**
 * Returns all active access scopes for a user.
 */
export function getUserScopes(userId: string): AccessScope[] {
  const scopes = store.listGovernanceObjects<AccessScope>('access_scopes');
  return scopes.filter((s) => s.userId === userId && s.status === 'active');
}

/**
 * Grants access to a user for a specific resource scope.
 * If scope already exists, does nothing.
 */
export function grantAccess(
  userId: string,
  scopeType: AccessScopeType,
  scopeRefId: string
): AccessScope {
  // Check if scope already exists
  const existing = store
    .listGovernanceObjects<AccessScope>('access_scopes')
    .find(
      (s) =>
        s.userId === userId &&
        s.scopeType === scopeType &&
        s.scopeRefId === scopeRefId &&
        s.status === 'active'
    );

  if (existing) {
    return existing;
  }

  const now = new Date().toISOString();
  const scope: AccessScope = {
    scopeId: randomUUID(),
    userId,
    scopeType,
    scopeRefId,
    status: 'active',
    createdAt: now,
    updatedAt: now,
  };

  store.upsertGovernanceObject('access_scopes', scope.scopeId, scope);

  const user = store.getUser(userId);
  if (user) {
    auditService.emit({
      firmId: user.firm_id,
      userId,
      eventKey: 'governance.scope.updated',
      payload: {
        scopeId: scope.scopeId,
        scopeType,
        scopeRefId,
        action: 'granted',
      },
    });
  }

  return scope;
}

/**
 * Revokes an access scope.
 */
export function revokeAccess(scopeId: string): boolean {
  const scope = store.getGovernanceObject<AccessScope>('access_scopes', scopeId);
  if (!scope) {
    return false;
  }

  const now = new Date().toISOString();
  const updated: AccessScope = {
    ...scope,
    status: 'revoked',
    revokedAt: now,
    updatedAt: now,
  };

  store.upsertGovernanceObject('access_scopes', scopeId, updated);

  const user = store.getUser(scope.userId);
  if (user) {
    auditService.emit({
      firmId: user.firm_id,
      userId: scope.userId,
      eventKey: 'governance.scope.updated',
      payload: {
        scopeId,
        scopeType: scope.scopeType,
        scopeRefId: scope.scopeRefId,
        action: 'revoked',
      },
    });
  }

  return true;
}
