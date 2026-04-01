// =============================================================================
// Governance, Compliance, & Admin Layer — Feature Flag Service
// =============================================================================
//
// Evaluates feature flags with targeting rules.
// Provides CRUD for feature flags.
// =============================================================================

import { randomUUID } from 'crypto';
import type { EvaluateFeatureFlagCommand, FeatureFlag } from './types';
import { store } from '../store';
import { auditService } from '../audit';

// =====================================================================
// Feature Flag Service
// =====================================================================

/**
 * Evaluates a feature flag against user context.
 * Returns:
 * - enabled: boolean
 * - flag: FeatureFlag | undefined
 */
export function evaluateFeatureFlag(command: EvaluateFeatureFlagCommand): {
  enabled: boolean;
  flag?: FeatureFlag;
} {
  const { key, userContext } = command;

  const flag = getFlag(key);

  if (!flag) {
    return { enabled: false };
  }

  if (flag.status !== 'active') {
    return { enabled: false, flag };
  }

  if (!flag.enabled) {
    return { enabled: false, flag };
  }

  // Evaluate targeting rules
  const meetsTargeting = evaluateTargetingRules(flag.targetingRules, userContext);

  return {
    enabled: meetsTargeting,
    flag,
  };
}

/**
 * Returns a feature flag by key.
 */
export function getFlag(key: string): FeatureFlag | undefined {
  const flags = store.listGovernanceObjects<FeatureFlag>('feature_flags');
  return flags.find((f) => f.key === key);
}

/**
 * Creates or updates a feature flag.
 */
export function upsertFlag(flag: Omit<FeatureFlag, 'flagId' | 'createdAt' | 'updatedAt'>): FeatureFlag {
  const existing = getFlag(flag.key);
  const now = new Date().toISOString();

  if (existing) {
    const updated: FeatureFlag = {
      ...existing,
      ...flag,
      updatedAt: now,
    };

    store.upsertGovernanceObject('feature_flags', existing.flagId, updated);

    auditService.emit({
      firmId: 'firm-001',
      userId: 'system',
      eventKey: 'governance.feature_flag.updated',
      payload: {
        flagId: existing.flagId,
        key: flag.key,
        enabled: flag.enabled,
      },
    });

    return updated;
  } else {
    const newFlag: FeatureFlag = {
      flagId: randomUUID(),
      ...flag,
      createdAt: now,
      updatedAt: now,
    };

    store.upsertGovernanceObject('feature_flags', newFlag.flagId, newFlag);

    auditService.emit({
      firmId: 'firm-001',
      userId: 'system',
      eventKey: 'governance.feature_flag.updated',
      payload: {
        flagId: newFlag.flagId,
        key: flag.key,
        enabled: flag.enabled,
      },
    });

    return newFlag;
  }
}

/**
 * Lists all feature flags.
 */
export function listFlags(): FeatureFlag[] {
  return store.listGovernanceObjects<FeatureFlag>('feature_flags');
}

// =====================================================================
// Helper: Evaluate Targeting Rules
// =====================================================================

/**
 * Evaluates targeting rules against user context.
 * Simple implementation: checks if all rule keys match context values.
 */
function evaluateTargetingRules(rules: Record<string, unknown>, context: Record<string, unknown>): boolean {
  if (Object.keys(rules).length === 0) {
    return true; // No rules = enabled for all
  }

  for (const [key, value] of Object.entries(rules)) {
    if (context[key] !== value) {
      return false;
    }
  }

  return true;
}
