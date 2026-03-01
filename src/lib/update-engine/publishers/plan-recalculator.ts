// Plan Recalculator — identifies and queues plans affected by tax table changes.
// In production: publishes to Cloud Pub/Sub for plan recalculation workers.
// Pure functional — no React, Next.js, or Prisma imports.

import type { TaxTableType } from '../types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RecalcQueueItem {
  planId: string;
  triggerReason: string;
  priority: 'low' | 'normal' | 'high';
  queuedAt: string;
}

/** Maps table types to the plan attributes they affect. */
const TABLE_IMPACT_MAP: Record<TaxTableType, string> = {
  ordinary_income_brackets: 'federal tax calculations',
  capital_gains_brackets: 'capital gains projections',
  standard_deductions: 'taxable income calculations',
  contribution_limits_401k: 'retirement savings projections',
  contribution_limits_ira: 'IRA contribution planning',
  contribution_limits_hsa: 'HSA contribution planning',
  irmaa_part_b: 'Medicare premium projections',
  irmaa_part_d: 'Medicare Part D projections',
  ss_cola: 'Social Security benefit projections',
  ss_wage_base: 'Social Security tax calculations',
  ss_bend_points: 'PIA calculations',
  afr_rates: 'loan imputation and 7520 calculations',
  estate_exemption: 'estate tax projections',
  gift_exemption: 'gifting strategy planning',
  amt_exemptions: 'AMT calculations',
  state_income_tax: 'state tax calculations',
  rmd_tables: 'Required Minimum Distribution calculations',
};

// ---------------------------------------------------------------------------
// Functions
// ---------------------------------------------------------------------------

/**
 * Find all plans affected by the updated table types.
 * In production: queries Cloud SQL for plans with matching state, income level, etc.
 * Demo: returns realistic plan IDs.
 */
export function findAffectedPlans(updatedTableTypes: TaxTableType[]): string[] {
  // Demo: all active plans are affected by federal changes
  const federalTypes: TaxTableType[] = [
    'ordinary_income_brackets', 'capital_gains_brackets', 'standard_deductions',
    'contribution_limits_401k', 'contribution_limits_ira', 'irmaa_part_b',
    'ss_cola', 'ss_wage_base', 'estate_exemption',
  ];

  const isFederalChange = updatedTableTypes.some((t) => federalTypes.includes(t));
  const isStateChange = updatedTableTypes.includes('state_income_tax');

  if (isFederalChange) {
    // All active plans affected
    return Array.from({ length: 284 }, (_, i) => `plan-${String(i + 1).padStart(4, '0')}`);
  }

  if (isStateChange) {
    // Only plans in the affected state
    return Array.from({ length: 42 }, (_, i) => `plan-state-${String(i + 1).padStart(3, '0')}`);
  }

  return [];
}

/**
 * Queue plans for recalculation.
 * In production: publishes to Cloud Pub/Sub topic 'plan-calculations'.
 */
export function queuePlanRecalculations(
  planIds: string[],
  triggerReason: string,
): RecalcQueueItem[] {
  const priority = planIds.length > 200 ? 'normal' : 'high';
  const now = new Date().toISOString();

  return planIds.map((planId) => ({
    planId,
    triggerReason,
    priority,
    queuedAt: now,
  }));
}

/**
 * Estimate time to process the recalculation queue.
 */
export function estimateRecalcTime(planCount: number): { estimatedMinutes: number; parallelWorkers: number } {
  // Assume 2 seconds per plan with 10 parallel Cloud Run workers
  const parallelWorkers = Math.min(10, Math.ceil(planCount / 50));
  const estimatedMinutes = Math.ceil((planCount * 2) / (parallelWorkers * 60));
  return { estimatedMinutes, parallelWorkers };
}

/**
 * Get human-readable description of what recalculation covers.
 */
export function describeRecalcScope(tableTypes: TaxTableType[]): string {
  const descriptions = tableTypes.map((t) => TABLE_IMPACT_MAP[t] ?? t);
  return `Recalculation will update: ${descriptions.join(', ')}.`;
}
