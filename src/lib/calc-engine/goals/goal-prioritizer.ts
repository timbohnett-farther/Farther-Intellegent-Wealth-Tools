/**
 * Goal prioritization and surplus allocation engine.
 *
 * Ranks goals by priority tier (needs > wants > wishes) and urgency
 * (nearest target year first), then allocates available surplus to
 * underfunded goals in priority order.
 *
 * Pure function -- no side effects, no database calls.
 */

import type { GoalFundingResult } from '../types';

// ==================== Types ====================

export interface GoalAllocation {
  goalId: string;
  allocation: number;
  adjustedFundedRatio: number;
}

// ==================== Priority mapping ====================

/**
 * Numeric weight for priority tiers.
 * Lower number = higher priority.
 */
const PRIORITY_WEIGHT: Record<string, number> = {
  need: 1,
  needs: 1,
  essential: 1,
  want: 2,
  wants: 2,
  important: 2,
  wish: 3,
  wishes: 3,
  aspirational: 3,
};

function priorityWeight(priority: string): number {
  return PRIORITY_WEIGHT[priority.toLowerCase()] ?? 3;
}

// ==================== Engine ====================

/**
 * Prioritize goals and allocate available surplus.
 *
 * Algorithm:
 *   1. Filter to goals that are not fully funded (fundedRatio < 1).
 *   2. Sort by priority tier (needs first), then by target year (soonest first).
 *   3. Allocate surplus sequentially: fill each goal's shortfall before
 *      moving to the next.
 *   4. Return allocation amount and the adjusted funded ratio after allocation.
 *
 * @param goals            - Array of GoalFundingResult from the funding engine
 * @param availableSurplus - Total surplus available for allocation (dollars)
 * @returns Allocation recommendations per goal
 */
export function prioritizeGoals(
  goals: GoalFundingResult[],
  availableSurplus: number,
): GoalAllocation[] {
  // ----------------------------------------------------------------
  // 1.  Separate underfunded goals from fully funded
  // ----------------------------------------------------------------
  const underfunded = goals.filter((g) => g.fundedRatio < 1);
  const fullyFunded = goals.filter((g) => g.fundedRatio >= 1);

  // ----------------------------------------------------------------
  // 2.  Sort by priority tier, then by target year (urgency)
  // ----------------------------------------------------------------
  const sorted = [...underfunded].sort((a, b) => {
    const pa = priorityWeight(a.goalType);
    const pb = priorityWeight(b.goalType);
    if (pa !== pb) return pa - pb;
    return a.targetYear - b.targetYear;
  });

  // ----------------------------------------------------------------
  // 3.  Allocate surplus in priority order
  // ----------------------------------------------------------------
  let remaining = Math.max(0, availableSurplus);
  const allocations: GoalAllocation[] = [];

  for (const goal of sorted) {
    const shortfall = goal.shortfall;

    if (remaining <= 0 || shortfall <= 0) {
      allocations.push({
        goalId: goal.goalId,
        allocation: 0,
        adjustedFundedRatio: goal.fundedRatio,
      });
      continue;
    }

    const allocation = Math.min(remaining, shortfall);
    remaining -= allocation;

    // New projected funding = original projected + allocation
    const newProjected = goal.projectedFunding + allocation;
    const adjustedRatio = goal.targetAmount > 0
      ? Math.min(1, newProjected / goal.targetAmount)
      : 1;

    allocations.push({
      goalId: goal.goalId,
      allocation: Math.round(allocation * 100) / 100,
      adjustedFundedRatio: Math.round(adjustedRatio * 10000) / 10000,
    });
  }

  // ----------------------------------------------------------------
  // 4.  Append fully funded goals with zero allocation
  // ----------------------------------------------------------------
  for (const goal of fullyFunded) {
    allocations.push({
      goalId: goal.goalId,
      allocation: 0,
      adjustedFundedRatio: goal.fundedRatio,
    });
  }

  return allocations;
}
