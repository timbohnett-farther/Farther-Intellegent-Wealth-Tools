/**
 * Life insurance needs analysis engine.
 *
 * Calculates the total life insurance need based on:
 *   - Income replacement (75% of net income over a specified horizon)
 *   - Debt payoff (mortgage + other outstanding debts)
 *   - Future obligations (education, childcare)
 *   - Final expenses (burial, legal, etc.)
 *
 * Subtracts existing coverage and liquid assets to determine the gap,
 * then produces a recommendation.
 *
 * All monetary math uses Decimal.js for precision.
 * Pure function -- no side effects, no database calls.
 */

import Decimal from 'decimal.js';
import type { LifeInsuranceNeedsInput, LifeInsuranceNeedsResult } from '../types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Replace 75% of gross income (proxy for net after-tax income) */
const INCOME_REPLACEMENT_FACTOR = new Decimal(0.75);

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

/**
 * Calculate life insurance needs and gap.
 *
 * @param input - Life insurance needs parameters
 * @returns Detailed breakdown of need, existing coverage, gap, and recommendation
 */
export function calculateLifeInsuranceNeeds(
  input: LifeInsuranceNeedsInput,
): LifeInsuranceNeedsResult {
  const {
    annualIncome,
    yearsOfIncomeReplacement,
    outstandingDebts,
    mortgageBalance,
    futureCosts,
    existingLifeInsurance,
    existingAssets,
    finalExpenses,
    numberOfChildren,
    annualChildcareOrEducation,
    yearsOfChildExpenses,
  } = input;

  // ------------------------------------------------------------------
  // 1.  Income replacement need
  //     annualIncome x yearsOfReplacement x 0.75
  // ------------------------------------------------------------------
  const incomeReplacementNeed = new Decimal(annualIncome)
    .times(yearsOfIncomeReplacement)
    .times(INCOME_REPLACEMENT_FACTOR);

  // ------------------------------------------------------------------
  // 2.  Debt payoff need
  //     Sum of outstanding debts + mortgage balance
  // ------------------------------------------------------------------
  const debtPayoffNeed = new Decimal(outstandingDebts).plus(mortgageBalance);

  // ------------------------------------------------------------------
  // 3.  Future obligations
  //     Education / childcare costs + other specified future costs
  // ------------------------------------------------------------------
  const childRelatedCosts = new Decimal(annualChildcareOrEducation)
    .times(yearsOfChildExpenses)
    .times(Math.max(0, numberOfChildren));

  const futureObligationsNeed = childRelatedCosts.plus(futureCosts);

  // ------------------------------------------------------------------
  // 4.  Final expenses
  //     Burial, legal, probate, etc.
  // ------------------------------------------------------------------
  const finalExpensesNeed = new Decimal(finalExpenses);

  // ------------------------------------------------------------------
  // 5.  Total need
  // ------------------------------------------------------------------
  const totalNeed = incomeReplacementNeed
    .plus(debtPayoffNeed)
    .plus(futureObligationsNeed)
    .plus(finalExpensesNeed);

  // ------------------------------------------------------------------
  // 6.  Existing coverage / offsets
  // ------------------------------------------------------------------
  const existingCoverage = new Decimal(existingLifeInsurance).plus(existingAssets);

  // ------------------------------------------------------------------
  // 7.  Gap
  // ------------------------------------------------------------------
  const gap = Decimal.max(0, totalNeed.minus(existingCoverage));

  // ------------------------------------------------------------------
  // 8.  Recommendation
  // ------------------------------------------------------------------
  const recommendation = buildRecommendation(gap, totalNeed, existingCoverage);

  // ------------------------------------------------------------------
  // 9.  Return result
  // ------------------------------------------------------------------
  return {
    totalNeed: totalNeed.toDecimalPlaces(2).toNumber(),
    incomeReplacementNeed: incomeReplacementNeed.toDecimalPlaces(2).toNumber(),
    debtPayoffNeed: debtPayoffNeed.toDecimalPlaces(2).toNumber(),
    futureObligationsNeed: futureObligationsNeed.toDecimalPlaces(2).toNumber(),
    finalExpensesNeed: finalExpensesNeed.toDecimalPlaces(2).toNumber(),
    existingCoverage: existingCoverage.toDecimalPlaces(2).toNumber(),
    gap: gap.toDecimalPlaces(2).toNumber(),
    recommendation,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildRecommendation(
  gap: Decimal,
  totalNeed: Decimal,
  existingCoverage: Decimal,
): string {
  if (gap.lte(0)) {
    return (
      'Your existing coverage and liquid assets are sufficient to meet your ' +
      'estimated life insurance needs. No additional coverage is recommended at this time.'
    );
  }

  const gapNum = gap.toDecimalPlaces(0).toNumber();
  const coverageRatio = totalNeed.gt(0)
    ? existingCoverage.dividedBy(totalNeed).times(100).toDecimalPlaces(0).toNumber()
    : 100;

  if (coverageRatio < 25) {
    return (
      `You have a significant coverage gap of $${gapNum.toLocaleString()}. ` +
      'Your current coverage meets less than 25% of your estimated need. ' +
      'Consider purchasing a term life policy to close this gap as soon as possible.'
    );
  }

  if (coverageRatio < 50) {
    return (
      `You have a coverage gap of $${gapNum.toLocaleString()}. ` +
      `Your current coverage meets approximately ${coverageRatio}% of your estimated need. ` +
      'A supplemental term life policy is recommended to provide adequate protection.'
    );
  }

  return (
    `You have a moderate coverage gap of $${gapNum.toLocaleString()}. ` +
    `Your current coverage meets approximately ${coverageRatio}% of your estimated need. ` +
    'Consider a supplemental policy to fully close the gap.'
  );
}
