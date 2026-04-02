// =============================================================================
// Rollover Insight Engine — Plan Search Service
// =============================================================================

import { store } from '@/lib/tax-planning/store';
import { hasPermission, type AuthContext } from '@/lib/tax-planning/rbac';
import type { PlanSearchResult, PlanType, RolloverPlan } from './types';
import { isValidEIN } from './types';
import { seedRolloverData } from './seed';

// Ensure mock data is loaded
seedRolloverData();

/**
 * Searches for 401(k) plans by EIN, plan name, or sponsor name.
 * Supports typeahead with a minimum of 2 characters.
 */
export function searchPlans(
  query: string,
  auth: AuthContext,
  options?: {
    planType?: PlanType;
    limit?: number;
  },
): PlanSearchResult[] {
  if (!hasPermission(auth.role, 'rollover:read')) {
    throw new Error('Authorization denied: role does not have rollover:read permission.');
  }

  if (query.length < 2) {
    return [];
  }

  const limit = options?.limit ?? 20;

  // If query looks like an EIN (contains digits and dash), search by EIN
  const isEINSearch = /^\d{2}-?\d{0,7}$/.test(query);

  let plans: RolloverPlan[];

  if (isEINSearch) {
    // Search by EIN prefix
    const normalizedQuery = query.replace(/-/g, '');
    plans = store.listRolloverPlans({ limit: 50 }).filter((p) => {
      const normalizedEIN = p.ein.replace(/-/g, '');
      return normalizedEIN.startsWith(normalizedQuery);
    });
  } else {
    // Search by name/sponsor/recordkeeper
    plans = store.listRolloverPlans({ q: query, limit: 50 });
  }

  // Apply plan type filter
  if (options?.planType) {
    plans = plans.filter((p) => p.plan_type === options.planType);
  }

  return plans.slice(0, limit).map(planToSearchResult);
}

/**
 * Get a specific plan by ID.
 */
export function getPlanById(
  planId: string,
  auth: AuthContext,
): RolloverPlan | undefined {
  if (!hasPermission(auth.role, 'rollover:read')) {
    throw new Error('Authorization denied: role does not have rollover:read permission.');
  }

  return store.getRolloverPlan(planId);
}

/**
 * Get a specific plan by EIN.
 */
export function getPlanByEIN(
  ein: string,
  auth: AuthContext,
): RolloverPlan | undefined {
  if (!hasPermission(auth.role, 'rollover:read')) {
    throw new Error('Authorization denied: role does not have rollover:read permission.');
  }

  if (!isValidEIN(ein)) {
    return undefined;
  }

  const plans = store.listRolloverPlans({ ein });
  return plans.length > 0 ? plans[0] : undefined;
}

// ==================== Helpers ====================

function planToSearchResult(plan: RolloverPlan): PlanSearchResult {
  return {
    plan_id: plan.plan_id,
    ein: plan.ein,
    plan_name: plan.plan_name,
    sponsor_name: plan.sponsor_name,
    plan_type: plan.plan_type,
    total_assets_cents: plan.total_assets_cents,
    participant_count: plan.participant_count,
    recordkeeper: plan.recordkeeper,
  };
}
