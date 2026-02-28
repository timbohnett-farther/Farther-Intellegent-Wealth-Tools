/**
 * Net Investment Income Tax (NIIT) calculation.
 * Pure function — no side effects, no DB calls.
 *
 * Handles:
 *   - 3.8% surtax on the lesser of net investment income or
 *     the amount by which AGI exceeds the filing-status threshold
 */

import Decimal from 'decimal.js';
import type { FilingStatus } from '../types';

// ---------------------------------------------------------------------------
// Thresholds (IRC section 1411)
// ---------------------------------------------------------------------------

const NIIT_RATE = new Decimal('0.038');

const THRESHOLDS: Record<FilingStatus, number> = {
  single: 200_000,
  mfj: 250_000,
  mfs: 125_000,
  hoh: 200_000,
  qw: 250_000,
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface NIITResult {
  niit: number;
  threshold: number;
  excessAGI: number;
}

// ---------------------------------------------------------------------------
// Main calculation
// ---------------------------------------------------------------------------

/**
 * Calculate the Net Investment Income Tax.
 *
 * @param agi                  - Adjusted gross income
 * @param netInvestmentIncome  - Total net investment income (QD + LTCG + STCG + other investment income)
 * @param filingStatus         - Filing status
 */
export function calculateNIIT(
  agi: number,
  netInvestmentIncome: number,
  filingStatus: FilingStatus,
): NIITResult {
  const agiDec = new Decimal(agi);
  const niiDec = new Decimal(netInvestmentIncome);
  const threshold = new Decimal(THRESHOLDS[filingStatus]);

  const excessAGI = Decimal.max(agiDec.minus(threshold), 0);

  // Tax is 3.8% on the lesser of NII or excess AGI
  const taxableBase = Decimal.min(niiDec, excessAGI);
  const niit = Decimal.max(taxableBase.mul(NIIT_RATE), 0);

  return {
    niit: niit.toNumber(),
    threshold: threshold.toNumber(),
    excessAGI: excessAGI.toNumber(),
  };
}
