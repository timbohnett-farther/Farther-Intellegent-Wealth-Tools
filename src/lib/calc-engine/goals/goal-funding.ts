/**
 * Goal funding analysis engine.
 *
 * For each financial goal, determines current funding level, projects future
 * funding from cash-flow surpluses, calculates funded ratio, and recommends
 * additional savings when a shortfall exists.
 *
 * All monetary math uses Decimal.js for precision.
 * Pure function -- no side effects, no database calls.
 */

import Decimal from 'decimal.js';
import type { GoalData, GoalFundingResult, AnnualCashFlow } from '../types';

/**
 * Map a funded ratio to a simplified probability-of-meeting estimate.
 *
 * Uses a logistic-style curve so that:
 *   - ratio >= 1.0  =>  ~99%
 *   - ratio ~= 0.75 =>  ~70%
 *   - ratio ~= 0.50 =>  ~40%
 *   - ratio ~= 0.25 =>  ~15%
 *   - ratio <= 0     =>  ~1%
 */
function probabilityFromFundedRatio(ratio: number): number {
  // Logistic curve centered at 0.65 with steepness k=8
  const k = 8;
  const midpoint = 0.65;
  const raw = 1 / (1 + Math.exp(-k * (ratio - midpoint)));
  // Clamp to [0.01, 0.99]
  return Math.max(0.01, Math.min(0.99, Math.round(raw * 100) / 100));
}

/**
 * Determine the qualitative funding status from the funded ratio.
 */
function fundingStatus(ratio: number): GoalFundingResult['status'] {
  if (ratio >= 0.95) return 'funded';
  if (ratio >= 0.75) return 'on_track';
  if (ratio >= 0.50) return 'at_risk';
  return 'underfunded';
}

/**
 * Calculate goal funding analysis for every goal.
 *
 * @param goals        - Array of financial goals
 * @param cashFlows    - Projected annual cash flows for the planning horizon
 * @param inflationRate - Annual inflation rate (e.g. 0.03 for 3%)
 * @param currentYear  - The current calendar year
 * @returns One GoalFundingResult per goal
 */
export function calculateGoalFunding(
  goals: GoalData[],
  cashFlows: AnnualCashFlow[],
  inflationRate: number,
  currentYear: number,
): GoalFundingResult[] {
  const inflation = new Decimal(inflationRate);

  return goals.map((goal) => {
    // ----------------------------------------------------------------
    // 1.  Inflation-adjusted target amount
    // ----------------------------------------------------------------
    const yearsUntilGoal = Math.max(0, goal.targetYear - currentYear);
    const nominalTarget = new Decimal(goal.targetAmount);

    const targetAmount: Decimal = goal.inflationAdjusted
      ? nominalTarget.times(inflation.plus(1).pow(yearsUntilGoal))
      : nominalTarget;

    // ----------------------------------------------------------------
    // 2.  Current funding level
    //     Use the current year's portfolio surplus as a proxy for the
    //     amount already earmarked for this goal.
    // ----------------------------------------------------------------
    const currentYearCF = cashFlows.find((cf) => cf.year === currentYear);
    const totalSurplusNow = currentYearCF
      ? new Decimal(Math.max(0, currentYearCF.surplusDeficit))
      : new Decimal(0);

    // Divide the current surplus equally among all goals that have not
    // yet reached their target year (simple heuristic; the prioritizer
    // refines this).
    const activeGoals = goals.filter((g) => g.targetYear >= currentYear);
    const currentFunding = activeGoals.length > 0
      ? totalSurplusNow.dividedBy(activeGoals.length)
      : new Decimal(0);

    // ----------------------------------------------------------------
    // 3.  Project future funding from cash-flow surpluses
    //     Sum the positive surplus in each year up to the goal's target
    //     year, grow earlier surpluses at inflation rate to keep values
    //     in nominal terms.
    // ----------------------------------------------------------------
    let projectedFunding = new Decimal(currentFunding);

    const relevantCashFlows = cashFlows.filter(
      (cf) => cf.year > currentYear && cf.year <= goal.targetYear,
    );

    for (const cf of relevantCashFlows) {
      if (cf.surplusDeficit > 0) {
        const surplus = new Decimal(cf.surplusDeficit);
        // Share the surplus equally among goals active in that year
        const goalsActiveInYear = goals.filter(
          (g) => g.targetYear >= cf.year,
        );
        const goalShare = goalsActiveInYear.length > 0
          ? surplus.dividedBy(goalsActiveInYear.length)
          : new Decimal(0);

        // Grow the contribution from the cash-flow year to the goal
        // year at inflation to express in goal-year dollars.
        const yearsToGrow = goal.targetYear - cf.year;
        const grown = goalShare.times(
          inflation.plus(1).pow(yearsToGrow),
        );
        projectedFunding = projectedFunding.plus(grown);
      }
    }

    // ----------------------------------------------------------------
    // 4.  Funded ratio
    // ----------------------------------------------------------------
    const fundedRatio = targetAmount.gt(0)
      ? projectedFunding.dividedBy(targetAmount)
      : new Decimal(1); // zero-cost goals are fully funded

    const fundedRatioNum = Math.min(
      fundedRatio.toDecimalPlaces(4).toNumber(),
      1,
    );

    // ----------------------------------------------------------------
    // 5.  Shortfall & additional monthly savings needed
    // ----------------------------------------------------------------
    const shortfall = Decimal.max(
      0,
      targetAmount.minus(projectedFunding),
    );

    // To close the shortfall, compute the level monthly savings
    // required, assuming savings grow at inflation rate (monthly).
    const monthsRemaining = Math.max(1, yearsUntilGoal * 12);
    let additionalMonthlySavingsNeeded = new Decimal(0);

    if (shortfall.gt(0) && monthsRemaining > 0) {
      const monthlyRate = inflation.plus(1).pow(new Decimal(1).dividedBy(12)).minus(1);

      if (monthlyRate.gt(0)) {
        // PMT = FV * r / ((1 + r)^n - 1)
        const factor = monthlyRate
          .plus(1)
          .pow(monthsRemaining)
          .minus(1)
          .dividedBy(monthlyRate);
        additionalMonthlySavingsNeeded = shortfall.dividedBy(factor);
      } else {
        additionalMonthlySavingsNeeded = shortfall.dividedBy(monthsRemaining);
      }
    }

    // ----------------------------------------------------------------
    // 6.  Assemble result
    // ----------------------------------------------------------------
    return {
      goalId: goal.id,
      goalName: goal.name,
      goalType: goal.type,
      targetAmount: targetAmount.toDecimalPlaces(2).toNumber(),
      targetYear: goal.targetYear,
      currentFunding: currentFunding.toDecimalPlaces(2).toNumber(),
      projectedFunding: projectedFunding.toDecimalPlaces(2).toNumber(),
      fundedRatio: fundedRatioNum,
      probabilityOfMeeting: probabilityFromFundedRatio(fundedRatioNum),
      status: fundingStatus(fundedRatioNum),
      shortfall: shortfall.toDecimalPlaces(2).toNumber(),
      additionalMonthlySavingsNeeded: additionalMonthlySavingsNeeded
        .toDecimalPlaces(2)
        .toNumber(),
    };
  });
}
