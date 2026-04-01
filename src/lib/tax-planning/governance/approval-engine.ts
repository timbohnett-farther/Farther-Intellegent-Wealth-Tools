// =============================================================================
// Governance, Compliance, & Admin Layer — Approval Engine
// =============================================================================
//
// Evaluates whether approval is required for specific actions based on
// approval policies. Determines if review queue items should be created.
// =============================================================================

import type { EvaluateApprovalCommand, ApprovalPolicy, ApprovalObjectType, AudienceMode } from './types';
import { store } from '../store';

// =====================================================================
// Approval Engine
// =====================================================================

/**
 * Evaluates whether approval is required for a specific object type + context.
 * Returns:
 * - requiresApproval: boolean
 * - requiredRoleIds: string[] (empty if no approval required)
 * - matchedPolicyId: string | undefined
 */
export function evaluateApprovalRequirement(command: EvaluateApprovalCommand): {
  requiresApproval: boolean;
  requiredRoleIds: string[];
  matchedPolicyId?: string;
} {
  const { objectType, audienceMode, context } = command;

  const policies = getApplicablePolicies(objectType, audienceMode);

  if (policies.length === 0) {
    return {
      requiresApproval: false,
      requiredRoleIds: [],
    };
  }

  // Use first matching policy (most specific)
  const policy = policies[0];

  if (!policy.requiresApproval) {
    return {
      requiresApproval: false,
      requiredRoleIds: [],
      matchedPolicyId: policy.approvalPolicyId,
    };
  }

  // Check conditional rules if present
  if (policy.conditions && context) {
    const meetsConditions = evaluateConditions(policy.conditions, context);
    if (!meetsConditions) {
      return {
        requiresApproval: false,
        requiredRoleIds: [],
        matchedPolicyId: policy.approvalPolicyId,
      };
    }
  }

  return {
    requiresApproval: true,
    requiredRoleIds: policy.requiredRoleIds,
    matchedPolicyId: policy.approvalPolicyId,
  };
}

/**
 * Returns applicable approval policies for an object type + audience mode.
 * Policies are returned in order of specificity (most specific first).
 */
export function getApplicablePolicies(
  objectType: ApprovalObjectType,
  audienceMode?: AudienceMode
): ApprovalPolicy[] {
  const allPolicies = store.listGovernanceObjects<ApprovalPolicy>('approval_policies');

  const activePolicies = allPolicies.filter(
    (p) => p.status === 'active' && p.objectType === objectType
  );

  // Prioritize policies with matching audience mode
  const exactMatch = activePolicies.filter(
    (p) => p.audienceMode !== undefined && p.audienceMode === audienceMode
  );
  const wildcardMatch = activePolicies.filter((p) => p.audienceMode === undefined);

  return [...exactMatch, ...wildcardMatch];
}

// =====================================================================
// Helper: Evaluate Conditions
// =====================================================================

/**
 * Evaluates conditional rules against context.
 * Simple implementation: checks if all condition keys match context values.
 */
function evaluateConditions(conditions: Record<string, unknown>, context: Record<string, unknown>): boolean {
  for (const [key, value] of Object.entries(conditions)) {
    if (context[key] !== value) {
      return false;
    }
  }
  return true;
}
