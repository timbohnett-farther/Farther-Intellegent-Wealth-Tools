/**
 * Disability insurance needs analysis engine.
 *
 * Calculates the monthly income replacement need at a target ratio
 * (typically 60-70%), subtracts existing disability coverage, considers
 * emergency fund offset, and produces a coverage recommendation.
 *
 * All monetary math uses Decimal.js for precision.
 * Pure function -- no side effects, no database calls.
 */

import Decimal from 'decimal.js';
import type { DisabilityNeedsInput, DisabilityNeedsResult } from '../types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Default replacement ratio when none is provided (60%) */
const DEFAULT_REPLACEMENT_RATIO = 0.6;

/** Typical number of months an emergency fund can bridge before LTD kicks in */
const EMERGENCY_FUND_BRIDGE_MONTHS = 6;

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

/**
 * Calculate disability insurance needs and gap.
 *
 * @param input - Disability needs parameters
 * @returns Monthly income need, existing benefit, gap, and recommendation
 */
export function calculateDisabilityNeeds(
  input: DisabilityNeedsInput,
): DisabilityNeedsResult {
  const {
    annualIncome,
    existingDisabilityCoverage,
    monthlyExpenses,
    emergencyFund,
    targetReplacementRatio,
  } = input;

  // ------------------------------------------------------------------
  // 1.  Monthly income need
  //     annualIncome / 12 x targetReplacementRatio
  // ------------------------------------------------------------------
  const ratio = new Decimal(
    targetReplacementRatio > 0 ? targetReplacementRatio : DEFAULT_REPLACEMENT_RATIO,
  );
  const monthlyIncomeNeed = new Decimal(annualIncome)
    .dividedBy(12)
    .times(ratio);

  // ------------------------------------------------------------------
  // 2.  Existing monthly disability benefit
  // ------------------------------------------------------------------
  const existingMonthlyBenefit = new Decimal(existingDisabilityCoverage);

  // ------------------------------------------------------------------
  // 3.  Emergency fund offset
  //     The emergency fund can cover a number of months of expenses,
  //     reducing the urgency but not the long-term need.  We express
  //     this as an informational consideration in the recommendation
  //     rather than reducing the gap itself, because disability is
  //     typically a long-duration event.
  // ------------------------------------------------------------------
  const emergencyFundMonths = new Decimal(monthlyExpenses).gt(0)
    ? new Decimal(emergencyFund).dividedBy(monthlyExpenses)
    : new Decimal(0);

  // ------------------------------------------------------------------
  // 4.  Gap
  //     Positive gap means existing coverage is insufficient.
  // ------------------------------------------------------------------
  const gap = Decimal.max(0, monthlyIncomeNeed.minus(existingMonthlyBenefit));

  // ------------------------------------------------------------------
  // 5.  Recommendation
  // ------------------------------------------------------------------
  const recommendation = buildRecommendation(
    gap,
    monthlyIncomeNeed,
    existingMonthlyBenefit,
    emergencyFundMonths,
    ratio,
  );

  // ------------------------------------------------------------------
  // 6.  Return result
  // ------------------------------------------------------------------
  return {
    monthlyIncomeNeed: monthlyIncomeNeed.toDecimalPlaces(2).toNumber(),
    existingMonthlyBenefit: existingMonthlyBenefit.toDecimalPlaces(2).toNumber(),
    gap: gap.toDecimalPlaces(2).toNumber(),
    recommendation,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildRecommendation(
  gap: Decimal,
  monthlyNeed: Decimal,
  existingBenefit: Decimal,
  emergencyFundMonths: Decimal,
  ratio: Decimal,
): string {
  if (gap.lte(0)) {
    return (
      'Your existing disability coverage meets or exceeds your target replacement ' +
      `ratio of ${ratio.times(100).toNumber()}% of income. No additional coverage ` +
      'is recommended at this time.'
    );
  }

  const gapNum = gap.toDecimalPlaces(0).toNumber();
  const efMonths = emergencyFundMonths.toDecimalPlaces(1).toNumber();

  const emergencyNote =
    efMonths >= EMERGENCY_FUND_BRIDGE_MONTHS
      ? ` Your emergency fund can bridge approximately ${efMonths} months of expenses, ` +
        'which may allow you to choose a longer elimination period to reduce premiums.'
      : efMonths > 0
        ? ` Your emergency fund covers roughly ${efMonths} months of expenses. ` +
          'Consider building this to 6 months to allow for a longer elimination period.'
        : ' You currently have no emergency fund. Building a 3-6 month reserve ' +
          'would complement your disability coverage.';

  const coverageRatio = monthlyNeed.gt(0)
    ? existingBenefit.dividedBy(monthlyNeed).times(100).toDecimalPlaces(0).toNumber()
    : 0;

  if (coverageRatio < 25) {
    return (
      `You have a significant disability coverage gap of $${gapNum.toLocaleString()}/month. ` +
      `Your current coverage meets only about ${coverageRatio}% of your target. ` +
      'An individual long-term disability policy is strongly recommended.' +
      emergencyNote
    );
  }

  if (coverageRatio < 50) {
    return (
      `You have a disability coverage gap of $${gapNum.toLocaleString()}/month. ` +
      `Your current coverage meets approximately ${coverageRatio}% of your target. ` +
      'A supplemental individual disability policy is recommended.' +
      emergencyNote
    );
  }

  return (
    `You have a moderate disability coverage gap of $${gapNum.toLocaleString()}/month. ` +
    `Your current coverage meets approximately ${coverageRatio}% of your target. ` +
    'Consider a supplemental policy to fully close the gap.' +
    emergencyNote
  );
}
