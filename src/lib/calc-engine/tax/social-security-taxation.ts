/**
 * Social Security benefit taxation calculation.
 * Pure function — no side effects, no DB calls.
 *
 * Determines how much of a taxpayer's Social Security benefits are subject
 * to federal income tax using the "provisional income" test.
 *
 * Handles:
 *   - Provisional income = MAGI + 50% of SS benefits + tax-exempt interest
 *   - MFS: automatically 85% taxable (if lived with spouse at any point)
 *   - Below lower threshold: 0% taxable
 *   - Between lower and upper: up to 50% taxable
 *   - Above upper: up to 85% taxable
 */

import Decimal from 'decimal.js';
import type { SSTaxationInput, SSTaxationResult, FilingStatus } from '../types';

// ---------------------------------------------------------------------------
// Thresholds (IRC section 86)
// ---------------------------------------------------------------------------

interface SSThresholds {
  lower: number;
  upper: number;
}

const THRESHOLDS: Record<FilingStatus, SSThresholds> = {
  single: { lower: 25_000, upper: 34_000 },
  mfj: { lower: 32_000, upper: 44_000 },
  mfs: { lower: 0, upper: 0 }, // effectively 85% taxable immediately
  hoh: { lower: 25_000, upper: 34_000 },
  qw: { lower: 32_000, upper: 44_000 },
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const HALF = new Decimal('0.5');
const EIGHTY_FIVE_PCT = new Decimal('0.85');
const FIFTY_PCT = new Decimal('0.5');

// ---------------------------------------------------------------------------
// Main calculation
// ---------------------------------------------------------------------------

/**
 * Calculate how much of a Social Security benefit is taxable.
 *
 * @param input - SS taxation input (gross benefit, other MAGI, tax-exempt interest, filing status)
 */
export function calculateSSTaxation(input: SSTaxationInput): SSTaxationResult {
  const grossSS = new Decimal(input.grossSocialSecurityBenefit);
  const otherMAGI = new Decimal(input.otherMAGIIncome);
  const taxExemptInterest = new Decimal(input.taxExemptInterest);

  // ------------------------------------------------------------------
  // 1. Provisional income = other MAGI + 50% of SS + tax-exempt interest
  // ------------------------------------------------------------------
  const halfSS = grossSS.mul(HALF);
  const provisionalIncome = otherMAGI.plus(halfSS).plus(taxExemptInterest);

  // ------------------------------------------------------------------
  // 2. MFS special rule: 85% taxable automatically
  // ------------------------------------------------------------------
  if (input.filingStatus === 'mfs') {
    const taxableSS = grossSS.mul(EIGHTY_FIVE_PCT);
    return {
      provisionalIncome: provisionalIncome.toNumber(),
      taxableSS: taxableSS.toNumber(),
      taxableSSPct: 0.85,
      thresholds: { lower: 0, upper: 0 },
    };
  }

  // ------------------------------------------------------------------
  // 3. Determine thresholds
  // ------------------------------------------------------------------
  const thresholds = THRESHOLDS[input.filingStatus];
  const lowerThreshold = new Decimal(thresholds.lower);
  const upperThreshold = new Decimal(thresholds.upper);

  // ------------------------------------------------------------------
  // 4. Determine taxable amount based on provisional income
  // ------------------------------------------------------------------
  let taxableSS: Decimal;

  if (provisionalIncome.lte(lowerThreshold)) {
    // Below lower threshold: nothing taxable
    taxableSS = new Decimal(0);
  } else if (provisionalIncome.lte(upperThreshold)) {
    // Between lower and upper: up to 50% taxable
    const excessOverLower = provisionalIncome.minus(lowerThreshold);
    taxableSS = Decimal.min(
      excessOverLower.mul(FIFTY_PCT),
      grossSS.mul(FIFTY_PCT),
    );
  } else {
    // Above upper threshold: up to 85% taxable
    // Tier 1: 50% of the amount between lower and upper thresholds
    const tier1Range = upperThreshold.minus(lowerThreshold);
    const tier1 = Decimal.min(
      tier1Range.mul(FIFTY_PCT),
      grossSS.mul(FIFTY_PCT),
    );

    // Tier 2: 85% of the excess above the upper threshold
    const excessOverUpper = provisionalIncome.minus(upperThreshold);
    const tier2 = excessOverUpper.mul(EIGHTY_FIVE_PCT);

    // Total taxable is the lesser of (tier1 + tier2) or 85% of gross SS
    taxableSS = Decimal.min(
      tier1.plus(tier2),
      grossSS.mul(EIGHTY_FIVE_PCT),
    );
  }

  // Ensure non-negative
  taxableSS = Decimal.max(taxableSS, 0);

  // ------------------------------------------------------------------
  // 5. Compute taxable percentage
  // ------------------------------------------------------------------
  const taxableSSPct = grossSS.gt(0)
    ? taxableSS.div(grossSS).toNumber()
    : 0;

  return {
    provisionalIncome: provisionalIncome.toNumber(),
    taxableSS: taxableSS.toNumber(),
    taxableSSPct,
    thresholds: {
      lower: thresholds.lower,
      upper: thresholds.upper,
    },
  };
}
