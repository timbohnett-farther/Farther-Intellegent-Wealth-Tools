/**
 * Self-employment tax calculation.
 * Pure function — no side effects, no DB calls.
 *
 * Handles:
 *   - Net earnings (92.35 % of net SE income)
 *   - Social Security tax (12.4 %) up to SS wage base less W-2 wages
 *   - Medicare tax (2.9 %) on all net earnings
 *   - Additional Medicare tax (0.9 %) above threshold
 *   - Deductible half (50 % of total SE tax)
 */

import Decimal from 'decimal.js';
import type { SEInput, SEResult } from '../types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Factor applied to net SE income to compute net earnings (1 - 7.65 % employer-equivalent) */
const NET_EARNINGS_FACTOR = new Decimal('0.9235');

/** Social Security tax rate (both halves) */
const SS_RATE = new Decimal('0.124');

/** Medicare tax rate (both halves) */
const MEDICARE_RATE = new Decimal('0.029');

/** Additional Medicare tax rate above threshold */
const ADDITIONAL_MEDICARE_RATE = new Decimal('0.009');

/** Additional Medicare threshold for single / HoH */
const ADDITIONAL_MEDICARE_THRESHOLD_SINGLE = new Decimal(200_000);

/** Additional Medicare threshold for MFJ */
const ADDITIONAL_MEDICARE_THRESHOLD_MFJ = new Decimal(250_000);

// ---------------------------------------------------------------------------
// Main calculation
// ---------------------------------------------------------------------------

export function calculateSETax(input: SEInput): SEResult {
  const netSE = new Decimal(input.netSelfEmploymentIncome);

  // ------------------------------------------------------------------
  // 1. Net earnings subject to SE tax
  // ------------------------------------------------------------------
  const netEarnings = Decimal.max(netSE.mul(NET_EARNINGS_FACTOR), 0);

  // ------------------------------------------------------------------
  // 2. Social Security portion
  //    Capped at (wage base - W-2 wages already subject to SS)
  // ------------------------------------------------------------------
  const ssWageBase = new Decimal(input.sswageBase);
  const w2Wages = new Decimal(input.w2Wages ?? 0);
  const ssRoom = Decimal.max(ssWageBase.minus(w2Wages), 0);
  const ssTaxable = Decimal.min(netEarnings, ssRoom);
  const ssTax = ssTaxable.mul(SS_RATE);

  // ------------------------------------------------------------------
  // 3. Medicare portion (no cap)
  // ------------------------------------------------------------------
  const medicareTaxable = netEarnings;
  const medicareTax = medicareTaxable.mul(MEDICARE_RATE);

  // ------------------------------------------------------------------
  // 4. Additional Medicare tax (0.9 % above threshold)
  //    The threshold is at the return level, so we compare against
  //    total wages + SE earnings.  For simplicity here we apply the
  //    threshold against net earnings alone, as federal-income-tax
  //    will reconcile at the return level.
  // ------------------------------------------------------------------
  const additionalMedicareThreshold = ADDITIONAL_MEDICARE_THRESHOLD_MFJ; // conservative default
  const additionalMedicareBase = Decimal.max(
    netEarnings.minus(additionalMedicareThreshold),
    0,
  );
  const additionalMedicareTax = additionalMedicareBase.mul(ADDITIONAL_MEDICARE_RATE);

  // ------------------------------------------------------------------
  // 5. Total SE tax & deductible half
  // ------------------------------------------------------------------
  const totalSETax = ssTax.plus(medicareTax).plus(additionalMedicareTax);
  const deductibleHalf = totalSETax.mul(new Decimal('0.5'));

  return {
    netEarnings: netEarnings.toNumber(),
    ssTaxable: ssTaxable.toNumber(),
    medicareTaxable: medicareTaxable.toNumber(),
    ssTax: ssTax.toNumber(),
    medicareTax: medicareTax.toNumber(),
    additionalMedicareTax: additionalMedicareTax.toNumber(),
    totalSETax: totalSETax.toNumber(),
    deductibleHalf: deductibleHalf.toNumber(),
  };
}
