// =============================================================================
// Governance, Compliance, & Admin Layer — AI Governance Service
// =============================================================================
//
// Controls AI usage through allowlists, role gating, and approval requirements.
// Evaluates whether AI actions are permitted based on policies.
// =============================================================================

import type { EvaluateAIGovernanceCommand, AIGovernancePolicy } from './types';
import { store } from '../store';

// =====================================================================
// AI Governance Service
// =====================================================================

/**
 * Evaluates whether an AI action is permitted.
 * Returns:
 * - allowed: boolean
 * - requiresApproval: boolean
 * - reason?: string (if denied)
 */
export function evaluateAIGovernance(command: EvaluateAIGovernanceCommand): {
  allowed: boolean;
  requiresApproval: boolean;
  reason?: string;
} {
  const { userId, userRole, promptFamily, audienceMode } = command;

  // Get active AI policy
  const policies = store.listGovernanceObjects<AIGovernancePolicy>('ai_governance_policies');
  const activePolicy = policies.find((p) => p.status === 'active');

  if (!activePolicy) {
    // No policy = deny by default
    return {
      allowed: false,
      requiresApproval: false,
      reason: 'No active AI governance policy found',
    };
  }

  // Check role allowlist
  if (!activePolicy.allowedRoleIds.includes(userRole)) {
    return {
      allowed: false,
      requiresApproval: false,
      reason: `Role ${userRole} not authorized for AI usage`,
    };
  }

  // Check prompt family allowlist
  if (!activePolicy.allowedPromptFamilies.includes(promptFamily)) {
    return {
      allowed: false,
      requiresApproval: false,
      reason: `Prompt family ${promptFamily} not in allowlist`,
    };
  }

  // Check audience mode allowlist
  if (!activePolicy.allowedAudienceModes.includes(audienceMode)) {
    return {
      allowed: false,
      requiresApproval: false,
      reason: `Audience mode ${audienceMode} not in allowlist`,
    };
  }

  // Check if approval is required for this prompt type
  const requiresApproval = activePolicy.approvalRequiredPromptTypes.includes(promptFamily);

  return {
    allowed: true,
    requiresApproval,
  };
}

/**
 * Returns the active AI governance policy.
 */
export function getActiveAIPolicy(): AIGovernancePolicy | undefined {
  const policies = store.listGovernanceObjects<AIGovernancePolicy>('ai_governance_policies');
  return policies.find((p) => p.status === 'active');
}
