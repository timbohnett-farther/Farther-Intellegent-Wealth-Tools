/**
 * Long-term care (LTC) insurance needs analysis engine.
 *
 * Estimates LTC cost exposure based on:
 *   - National average costs by care type (home care, assisted living, nursing home)
 *   - Simplified regional cost multiplier by state
 *   - Projection to estimated age of need (typically 80-85)
 *   - Desired benefit period (typically 3-5 years)
 *   - Gender-based probability adjustment (women have higher LTC utilisation)
 *
 * Subtracts existing LTC coverage to determine the gap.
 *
 * All monetary math uses Decimal.js for precision.
 * Pure function -- no side effects, no database calls.
 */

import Decimal from 'decimal.js';
import type { LTCNeedsInput, LTCNeedsResult } from '../types';

// ---------------------------------------------------------------------------
// Constants -- national average annual costs (current-year dollars)
// ---------------------------------------------------------------------------

/** Home health aide, ~$65,000/year national average */
const HOME_CARE_ANNUAL = new Decimal(65_000);

/** Assisted living facility, ~$60,000/year national average */
const ASSISTED_LIVING_ANNUAL = new Decimal(60_000);

/** Nursing home semi-private room, ~$95,000/year national average */
const NURSING_HOME_SEMI_ANNUAL = new Decimal(95_000);

/** Nursing home private room, ~$110,000/year national average */
const NURSING_HOME_PRIVATE_ANNUAL = new Decimal(110_000);

/** Typical age at which LTC need begins */
const DEFAULT_AGE_OF_NEED = 82;

// ---------------------------------------------------------------------------
// Regional cost multipliers (simplified by state)
//
// States are grouped into cost tiers relative to the national average.
// Tier 1 (high cost): ~1.25x
// Tier 2 (above average): ~1.10x
// Tier 3 (average): 1.00x
// Tier 4 (below average): ~0.90x
// Tier 5 (low cost): ~0.80x
// ---------------------------------------------------------------------------

const HIGH_COST_STATES = new Set([
  'CT', 'MA', 'NH', 'NJ', 'NY', 'AK', 'HI', 'DC',
]);

const ABOVE_AVG_STATES = new Set([
  'CA', 'CO', 'DE', 'IL', 'MD', 'ME', 'MN', 'OR', 'PA',
  'RI', 'VT', 'WA', 'WI',
]);

const BELOW_AVG_STATES = new Set([
  'AL', 'AR', 'GA', 'IN', 'KS', 'KY', 'MI', 'MO',
  'NC', 'NE', 'NM', 'OH', 'OK', 'SC', 'TN', 'WV',
]);

const LOW_COST_STATES = new Set([
  'LA', 'MS', 'SD', 'TX',
]);

function regionalMultiplier(state: string): Decimal {
  const s = state.toUpperCase().trim();
  if (HIGH_COST_STATES.has(s)) return new Decimal(1.25);
  if (ABOVE_AVG_STATES.has(s)) return new Decimal(1.10);
  if (BELOW_AVG_STATES.has(s)) return new Decimal(0.90);
  if (LOW_COST_STATES.has(s)) return new Decimal(0.80);
  return new Decimal(1.00); // average / unknown
}

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

/**
 * Calculate long-term care insurance needs and gap.
 *
 * @param input - LTC needs parameters
 * @returns Estimated annual cost, projected cost at age of need, total benefit
 *          needed, existing coverage, gap, and recommendation
 */
export function calculateLTCNeeds(
  input: LTCNeedsInput,
): LTCNeedsResult {
  const {
    currentAge,
    gender,
    state,
    desiredBenefitPeriod,
    inflationRate,
    existingLTCCoverage,
  } = input;

  const inflation = new Decimal(inflationRate);
  const multiplier = regionalMultiplier(state);

  // ------------------------------------------------------------------
  // 1.  Blended annual LTC cost in today's dollars
  //     Weight: 30% home care, 30% assisted living, 25% nursing semi,
  //     15% nursing private (reflects typical utilisation mix).
  // ------------------------------------------------------------------
  const blendedAnnualCost = HOME_CARE_ANNUAL.times(0.30)
    .plus(ASSISTED_LIVING_ANNUAL.times(0.30))
    .plus(NURSING_HOME_SEMI_ANNUAL.times(0.25))
    .plus(NURSING_HOME_PRIVATE_ANNUAL.times(0.15));

  const estimatedAnnualCost = blendedAnnualCost.times(multiplier);

  // ------------------------------------------------------------------
  // 2.  Project cost to estimated age of need
  //     Default age of need is 82; never less than currentAge + 1.
  // ------------------------------------------------------------------
  const ageOfNeed = Math.max(DEFAULT_AGE_OF_NEED, currentAge + 1);
  const yearsToNeed = ageOfNeed - currentAge;

  const projectedCostAtNeed = estimatedAnnualCost.times(
    inflation.plus(1).pow(yearsToNeed),
  );

  // ------------------------------------------------------------------
  // 3.  Total benefit needed
  //     annual cost at age of need x benefit period (3-5 years typical)
  // ------------------------------------------------------------------
  const benefitPeriod = new Decimal(
    desiredBenefitPeriod > 0 ? desiredBenefitPeriod : 3,
  );
  const totalBenefitNeeded = projectedCostAtNeed.times(benefitPeriod);

  // ------------------------------------------------------------------
  // 4.  Existing coverage
  // ------------------------------------------------------------------
  const existingCoverage = new Decimal(existingLTCCoverage);

  // ------------------------------------------------------------------
  // 5.  Gap
  // ------------------------------------------------------------------
  const gap = Decimal.max(0, totalBenefitNeeded.minus(existingCoverage));

  // ------------------------------------------------------------------
  // 6.  Recommendation (gender-aware)
  // ------------------------------------------------------------------
  const recommendation = buildRecommendation(
    gap,
    totalBenefitNeeded,
    existingCoverage,
    gender,
    currentAge,
    benefitPeriod.toNumber(),
  );

  // ------------------------------------------------------------------
  // 7.  Return result
  // ------------------------------------------------------------------
  return {
    estimatedAnnualCost: estimatedAnnualCost.toDecimalPlaces(2).toNumber(),
    projectedCostAtNeed: projectedCostAtNeed.toDecimalPlaces(2).toNumber(),
    totalBenefitNeeded: totalBenefitNeeded.toDecimalPlaces(2).toNumber(),
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
  gender: string,
  currentAge: number,
  benefitPeriod: number,
): string {
  const isFemale = gender.toLowerCase().startsWith('f');

  // Gender-specific context
  const genderNote = isFemale
    ? ' Women statistically have a higher probability of needing long-term care ' +
      'and tend to need it for longer durations, making adequate LTC coverage ' +
      'particularly important.'
    : ' While men have a somewhat lower probability of needing long-term care ' +
      'than women, the financial impact of an uninsured LTC event can still be devastating.';

  if (gap.lte(0)) {
    return (
      'Your existing LTC coverage meets or exceeds the estimated benefit need ' +
      `for a ${benefitPeriod}-year benefit period. No additional coverage is recommended ` +
      'at this time.' +
      genderNote
    );
  }

  const gapNum = gap.toDecimalPlaces(0).toNumber();
  const coverageRatio = totalNeed.gt(0)
    ? existingCoverage.dividedBy(totalNeed).times(100).toDecimalPlaces(0).toNumber()
    : 0;

  // Timing advice
  const timingNote =
    currentAge < 55
      ? ' Purchasing a policy before age 55 typically results in lower premiums ' +
        'and fewer health-related underwriting issues.'
      : currentAge <= 65
        ? ' At your current age, premiums will be moderate. Applying soon is ' +
          'advisable before health changes affect eligibility.'
        : ' At your current age, premiums may be significant. Consider hybrid ' +
          'life/LTC policies as an alternative.';

  if (coverageRatio < 25) {
    return (
      `You have a significant LTC coverage gap of $${gapNum.toLocaleString()}. ` +
      `Current coverage addresses only about ${coverageRatio}% of the projected need. ` +
      'A standalone LTC or hybrid life/LTC policy is strongly recommended.' +
      genderNote +
      timingNote
    );
  }

  if (coverageRatio < 50) {
    return (
      `You have an LTC coverage gap of $${gapNum.toLocaleString()}. ` +
      `Current coverage addresses approximately ${coverageRatio}% of the projected need. ` +
      'Additional LTC coverage is recommended to close this gap.' +
      genderNote +
      timingNote
    );
  }

  return (
    `You have a moderate LTC coverage gap of $${gapNum.toLocaleString()}. ` +
    `Current coverage addresses approximately ${coverageRatio}% of the projected need. ` +
    'Consider supplemental coverage or self-insurance strategies for the remainder.' +
    genderNote +
    timingNote
  );
}
