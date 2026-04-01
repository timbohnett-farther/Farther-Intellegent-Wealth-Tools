// =============================================================================
// Governance, Compliance, & Admin Layer — Authorization Service
// =============================================================================
//
// Evaluates user authorization against roles, permission policies, and access scopes.
// Records audit events for denied sensitive actions.
// =============================================================================

import type {
  AuthorizeActionCommand,
  AuthorizationDecision,
  PermissionPolicy,
  AccessScope,
} from './types';
import { store } from '../store';
import { auditService } from '../audit';

// =====================================================================
// Authorization Service
// =====================================================================

/**
 * Authorizes an action by evaluating:
 * 1. User roles → permission policies
 * 2. Permission policies → required permissions
 * 3. Access scopes → resource-level access
 *
 * Returns an AuthorizationDecision with allowed/denied + reason.
 */
export function authorizeAction(command: AuthorizeActionCommand): AuthorizationDecision {
  const { userId, action, resource, context } = command;

  // Get user
  const user = store.getUser(userId);
  if (!user) {
    return {
      allowed: false,
      reason: 'User not found',
      matchedRoleIds: [],
      matchedPolicyIds: [],
      matchedScopeIds: [],
    };
  }

  // Get active permission policies for user's role
  const allPolicies = store.listGovernanceObjects<PermissionPolicy>('permission_policies');
  const matchedPolicies = allPolicies.filter(
    (p) => p.status === 'active' && p.roleIds.includes(user.role)
  );

  if (matchedPolicies.length === 0) {
    const decision: AuthorizationDecision = {
      allowed: false,
      reason: `No active permission policies for role ${user.role}`,
      matchedRoleIds: [user.role],
      matchedPolicyIds: [],
      matchedScopeIds: [],
    };
    recordDenial(userId, action, resource, decision.reason);
    return decision;
  }

  // Check if any policy grants the required action
  const hasPermission = matchedPolicies.some((p) => p.permissions.includes(action));
  if (!hasPermission) {
    const decision: AuthorizationDecision = {
      allowed: false,
      reason: `Role ${user.role} does not have permission: ${action}`,
      matchedRoleIds: [user.role],
      matchedPolicyIds: matchedPolicies.map((p) => p.policyId),
      matchedScopeIds: [],
    };
    recordDenial(userId, action, resource, decision.reason);
    return decision;
  }

  // If resource-level access is required, check scopes
  if (resource) {
    const userScopes = store.listGovernanceObjects<AccessScope>('access_scopes').filter(
      (s) => s.userId === userId && s.status === 'active'
    );

    const hasAccess = userScopes.some((s) => s.scopeRefId === resource);
    if (!hasAccess) {
      const decision: AuthorizationDecision = {
        allowed: false,
        reason: `User does not have access to resource: ${resource}`,
        matchedRoleIds: [user.role],
        matchedPolicyIds: matchedPolicies.map((p) => p.policyId),
        matchedScopeIds: [],
      };
      recordDenial(userId, action, resource, decision.reason);
      return decision;
    }

    return {
      allowed: true,
      matchedRoleIds: [user.role],
      matchedPolicyIds: matchedPolicies.map((p) => p.policyId),
      matchedScopeIds: userScopes.filter((s) => s.scopeRefId === resource).map((s) => s.scopeId),
    };
  }

  // No resource-level check required
  return {
    allowed: true,
    matchedRoleIds: [user.role],
    matchedPolicyIds: matchedPolicies.map((p) => p.policyId),
    matchedScopeIds: [],
  };
}

// =====================================================================
// Helper: Record Denial
// =====================================================================

/**
 * Records an audit event for a denied authorization attempt.
 * Used for security monitoring and compliance.
 */
function recordDenial(userId: string, action: string, resource?: string, reason?: string): void {
  const user = store.getUser(userId);
  if (!user) return;

  auditService.emit({
    firmId: user.firm_id,
    userId,
    eventKey: 'governance.authorization.denied',
    payload: {
      action,
      resource: resource ?? null,
      reason: reason ?? 'Unknown',
    },
  });
}
