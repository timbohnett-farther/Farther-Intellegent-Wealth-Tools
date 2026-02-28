/**
 * Qualified Business Income (QBI) deduction calculation — Section 199A.
 * Pure function — no side effects, no DB calls.
 *
 * Handles:
 *   - 20% of QBI or 20% of taxable income (before QBI), whichever is less
 *   - Phaseout range for high-income taxpayers
 *   - W-2 wage limitation (greater of 50% of W-2 wages, or
 *     25% of W-2 wages + 2.5% of UBIA of qualified property)
 *   - Filing status thresholds (2026 estimates — TCJA sunset adjustments)
 */

import Decimal from 'decimal.js';
import type { FilingStatus } from '../types';

// ---------------------------------------------------------------------------
// Constants (2026 estimates — post-TCJA sunset, these may be adjusted)
// ---------------------------------------------------------------------------

/** QBI deduction rate */
const QBI_RATE = new Decimal('0.20');

/** Phase-in thresholds where the W-2 wage / property basis limit begins */
const PHASEOUT_START: Record<FilingStatus, number> = {
  single: 191_950,
  mfj: 383_900,
  mfs: 191_950,
  hoh: 191_950,
  qw: 383_900,
};

/** Phaseout range width — deduction is fully limited above start + range */
const PHASEOUT_RANGE: Record<FilingStatus, number> = {
  single: 50_000,
  mfj: 100_000,
  mfs: 50_000,
  hoh: 50_000,
  qw: 100_000,
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface QBIResult {
  qbiDeduction: number;
  method: string;
}

// ---------------------------------------------------------------------------
// Main calculation
// ---------------------------------------------------------------------------

/**
 * Calculate the Qualified Business Income deduction under Section 199A.
 *
 * @param qualifiedBusinessIncome  - Net QBI from pass-through entity
 * @param taxableIncomeBeforeQBI   - Taxable income computed before the QBI deduction
 * @param filingStatus             - Filing status
 * @param w2WagesFromBusiness      - W-2 wages paid by the qualified business
 * @param qualifiedPropertyBasis   - Unadjusted basis immediately after acquisition (UBIA)
 *                                   of qualified property held by the business
 */
export function calculateQBI(
  qualifiedBusinessIncome: number,
  taxableIncomeBeforeQBI: number,
  filingStatus: FilingStatus,
  w2WagesFromBusiness: number,
  qualifiedPropertyBasis: number,
): QBIResult {
  const qbi = new Decimal(qualifiedBusinessIncome);
  const taxableIncome = new Decimal(taxableIncomeBeforeQBI);
  const w2Wages = new Decimal(w2WagesFromBusiness);
  const propertyBasis = new Decimal(qualifiedPropertyBasis);

  // ------------------------------------------------------------------
  // 1. If QBI is zero or negative, no deduction
  // ------------------------------------------------------------------
  if (qbi.lte(0)) {
    return { qbiDeduction: 0, method: 'no_qbi' };
  }

  // ------------------------------------------------------------------
  // 2. Tentative QBI deduction = 20% of QBI
  // ------------------------------------------------------------------
  const tentativeQBI = qbi.mul(QBI_RATE);

  // ------------------------------------------------------------------
  // 3. Taxable income cap = 20% of taxable income before QBI
  // ------------------------------------------------------------------
  const taxableIncomeCap = Decimal.max(taxableIncome.mul(QBI_RATE), 0);

  // ------------------------------------------------------------------
  // 4. Determine if W-2 wage / property basis limitation applies
  // ------------------------------------------------------------------
  const phaseoutStart = new Decimal(PHASEOUT_START[filingStatus]);
  const phaseoutRange = new Decimal(PHASEOUT_RANGE[filingStatus]);
  const phaseoutEnd = phaseoutStart.plus(phaseoutRange);

  let qbiDeduction: Decimal;
  let method: string;

  if (taxableIncome.lte(phaseoutStart)) {
    // Below phaseout: full 20% deduction (no W-2 / property test)
    qbiDeduction = Decimal.min(tentativeQBI, taxableIncomeCap);
    method = 'full_deduction';
  } else if (taxableIncome.gte(phaseoutEnd)) {
    // Fully phased in: W-2 wage / property basis limit applies in full
    const wageLimit = computeWagePropertyLimit(w2Wages, propertyBasis);
    qbiDeduction = Decimal.min(tentativeQBI, wageLimit, taxableIncomeCap);
    method = 'wage_property_limited';
  } else {
    // Within phaseout range: partial application of W-2 / property limit
    const wageLimit = computeWagePropertyLimit(w2Wages, propertyBasis);

    // Reduction factor: how far into the phaseout range (0 = start, 1 = end)
    const phaseFraction = taxableIncome
      .minus(phaseoutStart)
      .div(phaseoutRange);

    // The excess of tentative QBI over the wage limit is reduced proportionally
    const excess = Decimal.max(tentativeQBI.minus(wageLimit), 0);
    const reduction = excess.mul(phaseFraction);

    const partialDeduction = tentativeQBI.minus(reduction);
    qbiDeduction = Decimal.min(
      Decimal.max(partialDeduction, 0),
      taxableIncomeCap,
    );
    method = 'phaseout_partial';
  }

  // Ensure non-negative
  qbiDeduction = Decimal.max(qbiDeduction, 0);

  return {
    qbiDeduction: qbiDeduction.toNumber(),
    method,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Compute the W-2 wage / qualified property limitation.
 * The limit is the greater of:
 *   (a) 50% of W-2 wages, or
 *   (b) 25% of W-2 wages + 2.5% of UBIA of qualified property
 */
function computeWagePropertyLimit(
  w2Wages: Decimal,
  propertyBasis: Decimal,
): Decimal {
  const optionA = w2Wages.mul(new Decimal('0.50'));
  const optionB = w2Wages
    .mul(new Decimal('0.25'))
    .plus(propertyBasis.mul(new Decimal('0.025')));

  return Decimal.max(optionA, optionB);
}
