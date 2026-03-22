/**
 * Medicare IRMAA surcharge calculation.
 * Pure function — no side effects, no DB calls.
 *
 * Handles:
 *   - Income-Related Monthly Adjustment Amount for Medicare Part B and Part D
 *   - Only applies to individuals age 65+
 *   - Uses MAGI from two years prior
 *   - Single filers use half of MFJ thresholds
 *   - Bracket matching and premium lookup
 */

import Decimal from 'decimal.js';
import type { IRMAAInput, IRMAAResult, IRMAAbracket, FilingStatus } from '../types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Standard Medicare Part B base premium (2026 estimate) */
const BASE_PART_B_MONTHLY = new Decimal('185');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * For single / HoH / MFS filers the IRMAA thresholds are roughly half of
 * the MFJ amounts.  The bracket table is typically stored in MFJ terms,
 * so we divide thresholds by two when looking up single filers.
 */
function adjustedMagi(
  magi: Decimal,
  filingStatus: FilingStatus,
): Decimal {
  // If filing status is single / HoH / MFS, we compare against the
  // bracket thresholds directly — those brackets are expected to already
  // be denominated in the appropriate amounts.  If the caller supplies
  // MFJ-denominated brackets for a single filer, we double the MAGI so
  // the comparison is apples-to-apples.
  //
  // The safer approach (used here): we trust the brackets to be in the
  // correct denomination for the filing status, so we return MAGI as-is.
  return magi;
}

// ---------------------------------------------------------------------------
// Main calculation
// ---------------------------------------------------------------------------

/**
 * Calculate Medicare IRMAA surcharge.
 *
 * @param input - IRMAA input (MAGI from two years ago, filing status, age, bracket table)
 */
export function calculateIRMAA(input: IRMAAInput): IRMAAResult {
  const magi = new Decimal(input.magiTwoYearsAgo);
  const age = input.age;

  // ------------------------------------------------------------------
  // 1. Age gate: IRMAA only applies at 65+
  // ------------------------------------------------------------------
  if (age < 65) {
    return {
      applies: false,
      partBMonthlyPremium: BASE_PART_B_MONTHLY.toNumber(),
      partDMonthlySurcharge: 0,
      annualIRMAASurcharge: 0,
      basePremiumPartB: BASE_PART_B_MONTHLY.toNumber(),
      totalAnnualMedicarePremium: BASE_PART_B_MONTHLY.mul(12).toNumber(),
      bracketApplied: 0,
    };
  }

  // ------------------------------------------------------------------
  // 2. Adjust MAGI for filing status if brackets are MFJ-denominated
  //    For single / HoH / MFS filers, thresholds are half of MFJ.
  //    We handle this by adjusting bracket thresholds on the fly.
  // ------------------------------------------------------------------
  const usesHalfThresholds =
    input.filingStatus === 'single' ||
    input.filingStatus === 'hoh' ||
    input.filingStatus === 'mfs';

  // ------------------------------------------------------------------
  // 3. Find the matching bracket
  // ------------------------------------------------------------------
  let matchedBracket: IRMAAbracket | null = null;
  let bracketIndex = 0;

  for (let i = 0; i < input.brackets.length; i++) {
    const bracket = input.brackets[i];

    const bracketMin = usesHalfThresholds
      ? new Decimal(bracket.magiMin).div(2)
      : new Decimal(bracket.magiMin);

    const bracketMax =
      bracket.magiMax !== null
        ? usesHalfThresholds
          ? new Decimal(bracket.magiMax).div(2)
          : new Decimal(bracket.magiMax)
        : null;

    const aboveMin = magi.gte(bracketMin);
    const belowMax = bracketMax === null || magi.lte(bracketMax);

    if (aboveMin && belowMax) {
      matchedBracket = bracket;
      bracketIndex = i;
      break;
    }
  }

  // ------------------------------------------------------------------
  // 4. If no bracket matched (below first threshold), base premium only
  // ------------------------------------------------------------------
  if (matchedBracket === null) {
    return {
      applies: false,
      partBMonthlyPremium: BASE_PART_B_MONTHLY.toNumber(),
      partDMonthlySurcharge: 0,
      annualIRMAASurcharge: 0,
      basePremiumPartB: BASE_PART_B_MONTHLY.toNumber(),
      totalAnnualMedicarePremium: BASE_PART_B_MONTHLY.mul(12).toNumber(),
      bracketApplied: 0,
    };
  }

  // ------------------------------------------------------------------
  // 5. Compute surcharges
  // ------------------------------------------------------------------
  const partBMonthly = new Decimal(matchedBracket.partBMonthly);
  const partDMonthly = new Decimal(matchedBracket.partDMonthly);

  // IRMAA surcharge is the amount above the base premium
  const partBSurcharge = Decimal.max(partBMonthly.minus(BASE_PART_B_MONTHLY), 0);
  const annualIRMAASurcharge = partBSurcharge.plus(partDMonthly).mul(12);
  const totalAnnualMedicarePremium = partBMonthly.plus(partDMonthly).mul(12);

  return {
    applies: true,
    partBMonthlyPremium: partBMonthly.toNumber(),
    partDMonthlySurcharge: partDMonthly.toNumber(),
    annualIRMAASurcharge: annualIRMAASurcharge.toNumber(),
    basePremiumPartB: BASE_PART_B_MONTHLY.toNumber(),
    totalAnnualMedicarePremium: totalAnnualMedicarePremium.toNumber(),
    bracketApplied: bracketIndex,
  };
}
