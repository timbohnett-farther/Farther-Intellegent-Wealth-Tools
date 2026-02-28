/**
 * Social Security benefit calculation.
 *
 * Handles:
 *   - Early claiming reduction (first 36 months: -5/9% per month;
 *     beyond 36 months: -5/12% per month)
 *   - Delayed retirement credits (+2/3% per month after FRA, up to age 70)
 *   - Windfall Elimination Provision (WEP) reduction
 *   - Government Pension Offset (GPO) reduction
 *   - SS haircut factor for reform scenarios
 *   - Break-even age calculation comparing claim at 62 vs chosen age and
 *     FRA vs chosen age
 *
 * All monetary math uses Decimal.js for precision.
 * Pure function — no side effects, no database calls.
 */

import Decimal from 'decimal.js';
import type { SSBenefitInput, SSBenefitResult } from '../types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Minimum claiming age */
const MIN_CLAIM_AGE = 62;

/** Maximum age for delayed retirement credits */
const MAX_DELAY_AGE = 70;

/** Maximum WEP reduction for 2026 */
const MAX_WEP_REDUCTION_2026 = 587;

/** Early reduction rate for first 36 months: 5/9 of 1% per month */
const EARLY_RATE_FIRST_36 = new Decimal(5).dividedBy(new Decimal(9).times(100));

/** Early reduction rate beyond 36 months: 5/12 of 1% per month */
const EARLY_RATE_BEYOND_36 = new Decimal(5).dividedBy(new Decimal(12).times(100));

/** Delayed retirement credit rate: 2/3 of 1% per month (8% per year) */
const DELAYED_CREDIT_RATE = new Decimal(2).dividedBy(new Decimal(3).times(100));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Calculate the adjustment factor for claiming at a given age relative to FRA.
 *
 * Negative adjustments for early claiming, positive for delayed credits.
 * Returns the factor as a multiplier (e.g. 0.75 for 25% reduction, 1.24 for 24% increase).
 */
function calculateAdjustmentFactor(
  claimAge: number,
  fullRetirementAge: number,
): Decimal {
  const monthsDifference = new Decimal(claimAge - fullRetirementAge).times(12);

  if (monthsDifference.isZero()) {
    return new Decimal(1);
  }

  if (monthsDifference.lt(0)) {
    // Early claiming: reduction
    const totalEarlyMonths = monthsDifference.abs();

    // First 36 months of early claiming: -5/9% per month
    const monthsAtHigherRate = Decimal.min(totalEarlyMonths, 36);
    const reductionFirst36 = monthsAtHigherRate.times(EARLY_RATE_FIRST_36);

    // Months beyond 36: -5/12% per month
    const monthsBeyond36 = Decimal.max(totalEarlyMonths.minus(36), 0);
    const reductionBeyond36 = monthsBeyond36.times(EARLY_RATE_BEYOND_36);

    const totalReduction = reductionFirst36.plus(reductionBeyond36);
    return new Decimal(1).minus(totalReduction);
  }

  // Delayed claiming: credits capped at age 70
  const maxDelayMonths = new Decimal(MAX_DELAY_AGE - fullRetirementAge).times(12);
  const creditableMonths = Decimal.min(monthsDifference, maxDelayMonths);
  const totalIncrease = creditableMonths.times(DELAYED_CREDIT_RATE);
  return new Decimal(1).plus(totalIncrease);
}

/**
 * Calculate the WEP reduction amount.
 * The WEP reduction is the lesser of:
 *   1. The maximum WEP reduction ($587/month in 2026)
 *   2. 50% of the noncovered pension
 */
function calculateWEPReduction(noncoveredPension: number): Decimal {
  const maxWep = new Decimal(MAX_WEP_REDUCTION_2026);
  const halfPension = new Decimal(noncoveredPension).times(new Decimal('0.5'));
  return Decimal.min(maxWep, halfPension);
}

/**
 * Calculate the GPO reduction amount.
 * GPO reduces the spousal/survivor SS benefit by 2/3 of the government pension.
 */
function calculateGPOReduction(governmentPension: number): Decimal {
  return new Decimal(governmentPension).times(new Decimal(2)).dividedBy(new Decimal(3));
}

/**
 * Calculate cumulative benefits from a given claim age through a target age.
 * Used for break-even calculations. Applies COLA growth each year.
 */
function cumulativeBenefitToAge(
  monthlyBenefit: Decimal,
  claimAge: number,
  targetAge: number,
  colaRate: Decimal,
): Decimal {
  if (targetAge <= claimAge) {
    return new Decimal(0);
  }

  let cumulative = new Decimal(0);
  let annualBenefit = monthlyBenefit.times(12);

  for (let age = claimAge; age < targetAge; age++) {
    cumulative = cumulative.plus(annualBenefit);
    annualBenefit = annualBenefit.times(new Decimal(1).plus(colaRate));
  }

  return cumulative;
}

/**
 * Find the break-even age where cumulative benefit of claiming at `laterAge`
 * surpasses cumulative benefit of claiming at `earlierAge`.
 * Returns the break-even age, or -1 if it never breaks even within 100 years.
 */
function findBreakEvenAge(
  monthlyBenefitEarlier: Decimal,
  earlierAge: number,
  monthlyBenefitLater: Decimal,
  laterAge: number,
  colaRate: Decimal,
): number {
  const maxCheckAge = 100;

  let cumulativeEarlier = new Decimal(0);
  let cumulativeLater = new Decimal(0);
  let annualEarlier = monthlyBenefitEarlier.times(12);
  let annualLater = monthlyBenefitLater.times(12);

  // The earlier claimer gets benefits during the gap years
  for (let age = earlierAge; age < laterAge; age++) {
    cumulativeEarlier = cumulativeEarlier.plus(annualEarlier);
    annualEarlier = annualEarlier.times(new Decimal(1).plus(colaRate));
  }

  // Adjust the later claimer's annual benefit to match COLA-adjusted level at laterAge
  // (It starts at the higher monthly amount at laterAge, but COLA still applies from there)

  // Now compare year by year from laterAge onwards
  for (let age = laterAge; age <= maxCheckAge; age++) {
    if (cumulativeLater.gte(cumulativeEarlier)) {
      return age;
    }

    cumulativeEarlier = cumulativeEarlier.plus(annualEarlier);
    annualEarlier = annualEarlier.times(new Decimal(1).plus(colaRate));

    cumulativeLater = cumulativeLater.plus(annualLater);
    annualLater = annualLater.times(new Decimal(1).plus(colaRate));
  }

  return -1;
}

// ---------------------------------------------------------------------------
// Main calculation
// ---------------------------------------------------------------------------

/**
 * Calculate the Social Security benefit at a given claim age, applying
 * early/late adjustments, WEP, GPO, haircut, and break-even analysis.
 *
 * @param input - Social Security benefit calculation inputs
 * @returns Detailed benefit result
 */
export function calculateSSBenefit(input: SSBenefitInput): SSBenefitResult {
  const {
    pia,
    fullRetirementAge,
    claimAge,
    colaRate,
    ssHaircut,
    wep,
    wepNoncoveredPension,
    gpo,
    gpoNoncoveredPension,
  } = input;

  const piaDec = new Decimal(pia);
  const colaDec = new Decimal(colaRate);
  const haircutDec = new Decimal(ssHaircut);

  // ------------------------------------------------------------------
  // 1. Monthly benefit at FRA (the PIA itself)
  // ------------------------------------------------------------------
  const monthlyBenefitAtFRA = piaDec;

  // ------------------------------------------------------------------
  // 2. Adjustment factor for claim age
  // ------------------------------------------------------------------
  const effectiveClaimAge = Math.max(MIN_CLAIM_AGE, Math.min(claimAge, MAX_DELAY_AGE));
  const adjustmentFactor = calculateAdjustmentFactor(effectiveClaimAge, fullRetirementAge);

  // ------------------------------------------------------------------
  // 3. Monthly benefit at claim age (before WEP/GPO/haircut)
  // ------------------------------------------------------------------
  const monthlyBenefitAtClaimAge = piaDec.times(adjustmentFactor);

  // ------------------------------------------------------------------
  // 4. WEP reduction
  // ------------------------------------------------------------------
  let wepReduction = new Decimal(0);
  if (wep && wepNoncoveredPension > 0) {
    wepReduction = calculateWEPReduction(wepNoncoveredPension);
  }

  // ------------------------------------------------------------------
  // 5. GPO reduction
  // ------------------------------------------------------------------
  let gpoReduction = new Decimal(0);
  if (gpo && gpoNoncoveredPension > 0) {
    gpoReduction = calculateGPOReduction(gpoNoncoveredPension);
  }

  // ------------------------------------------------------------------
  // 6. Apply reductions and haircut
  // ------------------------------------------------------------------
  let adjustedMonthly = monthlyBenefitAtClaimAge.minus(wepReduction).minus(gpoReduction);
  adjustedMonthly = Decimal.max(adjustedMonthly, 0);

  // Apply SS haircut factor (1.0 = no haircut, 0.77 = 23% across-the-board cut)
  const haircutMultiplier = new Decimal(1).minus(haircutDec);
  adjustedMonthly = adjustedMonthly.times(haircutMultiplier);
  adjustedMonthly = Decimal.max(adjustedMonthly, 0);

  // ------------------------------------------------------------------
  // 7. Annual benefit
  // ------------------------------------------------------------------
  const finalAnnualBenefit = adjustedMonthly.times(12);

  // ------------------------------------------------------------------
  // 8. Break-even ages
  // ------------------------------------------------------------------

  // Break-even vs age 62
  const factorAt62 = calculateAdjustmentFactor(MIN_CLAIM_AGE, fullRetirementAge);
  const monthlyAt62 = piaDec.times(factorAt62).minus(wepReduction).minus(gpoReduction);
  const effectiveMonthlyAt62 = Decimal.max(monthlyAt62.times(haircutMultiplier), 0);

  const breakEvenVs62 = effectiveClaimAge <= MIN_CLAIM_AGE
    ? effectiveClaimAge
    : findBreakEvenAge(
        effectiveMonthlyAt62,
        MIN_CLAIM_AGE,
        adjustedMonthly,
        effectiveClaimAge,
        colaDec,
      );

  // Break-even vs FRA
  const factorAtFRA = new Decimal(1); // by definition
  const monthlyAtFRA = piaDec.times(factorAtFRA).minus(wepReduction).minus(gpoReduction);
  const effectiveMonthlyAtFRA = Decimal.max(monthlyAtFRA.times(haircutMultiplier), 0);

  let breakEvenVsFRA: number;
  if (effectiveClaimAge <= fullRetirementAge) {
    // Claiming before FRA: find when FRA catches up with earlier claim
    breakEvenVsFRA = findBreakEvenAge(
      adjustedMonthly,
      effectiveClaimAge,
      effectiveMonthlyAtFRA,
      Math.ceil(fullRetirementAge),
      colaDec,
    );
  } else {
    // Claiming after FRA: find when later claim catches up with FRA
    breakEvenVsFRA = findBreakEvenAge(
      effectiveMonthlyAtFRA,
      Math.ceil(fullRetirementAge),
      adjustedMonthly,
      effectiveClaimAge,
      colaDec,
    );
  }

  // ------------------------------------------------------------------
  // Assemble result
  // ------------------------------------------------------------------
  return {
    monthlyBenefitAtFRA: monthlyBenefitAtFRA.toDecimalPlaces(2).toNumber(),
    adjustmentFactor: adjustmentFactor.toDecimalPlaces(6).toNumber(),
    monthlyBenefitAtClaimAge: monthlyBenefitAtClaimAge.toDecimalPlaces(2).toNumber(),
    annualBenefitAtClaimAge: monthlyBenefitAtClaimAge.times(12).toDecimalPlaces(2).toNumber(),
    wepReduction: wepReduction.toDecimalPlaces(2).toNumber(),
    gpoReduction: gpoReduction.toDecimalPlaces(2).toNumber(),
    finalAnnualBenefit: finalAnnualBenefit.toDecimalPlaces(2).toNumber(),
    breakEvenAgeVsAge62: breakEvenVs62,
    breakEvenAgeVsFRA: breakEvenVsFRA,
  };
}
