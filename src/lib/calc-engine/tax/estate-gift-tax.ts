/**
 * Estate and gift tax calculation.
 * Pure function — no side effects, no DB calls.
 *
 * Handles:
 *   - Gross estate less allowable deductions
 *   - Addition of adjusted taxable gifts (post-1976)
 *   - Tentative tax via progressive rate schedule (up to 40%)
 *   - Unified credit (tax on the applicable exemption amount)
 *   - Net estate tax after credits
 *   - Effective rate computation
 *
 * 2026 exemption: ~$7,000,000 (TCJA sunset reverts to pre-TCJA levels,
 * indexed for inflation)
 */

import Decimal from 'decimal.js';

// ---------------------------------------------------------------------------
// Estate tax rate schedule (IRC section 2001(c))
// ---------------------------------------------------------------------------

interface EstateTaxBracket {
  min: number;
  max: number | null;
  rate: number;
  baseTax: number;
}

/**
 * Federal estate/gift tax rate schedule.
 * These brackets are cumulative: the baseTax is the total tax on amounts
 * below the bracket floor, and the rate applies to the excess.
 */
const ESTATE_TAX_BRACKETS: EstateTaxBracket[] = [
  { min: 0, max: 10_000, rate: 0.18, baseTax: 0 },
  { min: 10_000, max: 20_000, rate: 0.20, baseTax: 1_800 },
  { min: 20_000, max: 40_000, rate: 0.22, baseTax: 3_800 },
  { min: 40_000, max: 60_000, rate: 0.24, baseTax: 8_200 },
  { min: 60_000, max: 80_000, rate: 0.26, baseTax: 13_000 },
  { min: 80_000, max: 100_000, rate: 0.28, baseTax: 18_200 },
  { min: 100_000, max: 150_000, rate: 0.30, baseTax: 23_800 },
  { min: 150_000, max: 250_000, rate: 0.32, baseTax: 38_800 },
  { min: 250_000, max: 500_000, rate: 0.34, baseTax: 70_800 },
  { min: 500_000, max: 750_000, rate: 0.36, baseTax: 155_800 },
  { min: 750_000, max: 1_000_000, rate: 0.38, baseTax: 245_800 },
  { min: 1_000_000, max: null, rate: 0.40, baseTax: 345_800 },
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EstateTaxResult {
  taxableEstate: number;
  tentativeTax: number;
  netEstateTax: number;
  effectiveRate: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Compute the tentative tax on a given amount using the estate tax
 * rate schedule.
 */
function computeTentativeTax(amount: Decimal): Decimal {
  if (amount.lte(0)) return new Decimal(0);

  const amtNum = amount.toNumber();

  for (let i = ESTATE_TAX_BRACKETS.length - 1; i >= 0; i--) {
    const bracket = ESTATE_TAX_BRACKETS[i];
    if (amtNum > bracket.min) {
      const excess = amount.minus(bracket.min);
      const rate = new Decimal(bracket.rate);
      const baseTax = new Decimal(bracket.baseTax);
      return baseTax.plus(excess.mul(rate));
    }
  }

  return new Decimal(0);
}

// ---------------------------------------------------------------------------
// Main calculation
// ---------------------------------------------------------------------------

/**
 * Calculate the federal estate tax.
 *
 * @param grossEstate  - Total gross estate value
 * @param deductions   - Allowable estate deductions (marital, charitable, debts, expenses)
 * @param priorGifts   - Adjusted taxable gifts made during lifetime (post-1976)
 * @param exemption    - Applicable exclusion amount (2026: ~$7,000,000 under TCJA sunset)
 */
export function calculateEstateTax(
  grossEstate: number,
  deductions: number,
  priorGifts: number,
  exemption: number,
): EstateTaxResult {
  const gross = new Decimal(grossEstate);
  const ded = new Decimal(deductions);
  const gifts = new Decimal(priorGifts);
  const exempt = new Decimal(exemption);

  // ------------------------------------------------------------------
  // 1. Taxable estate
  // ------------------------------------------------------------------
  const taxableEstate = Decimal.max(gross.minus(ded), 0);

  // ------------------------------------------------------------------
  // 2. Tax base = taxable estate + adjusted taxable gifts
  // ------------------------------------------------------------------
  const taxBase = taxableEstate.plus(gifts);

  // ------------------------------------------------------------------
  // 3. Tentative tax on the combined base
  // ------------------------------------------------------------------
  const tentativeTaxOnBase = computeTentativeTax(taxBase);

  // ------------------------------------------------------------------
  // 4. Subtract tentative tax on prior gifts (to avoid double taxation)
  // ------------------------------------------------------------------
  const tentativeTaxOnGifts = computeTentativeTax(gifts);
  const tentativeTax = Decimal.max(
    tentativeTaxOnBase.minus(tentativeTaxOnGifts),
    0,
  );

  // ------------------------------------------------------------------
  // 5. Unified credit = tentative tax on the exemption amount
  // ------------------------------------------------------------------
  const unifiedCredit = computeTentativeTax(exempt);

  // ------------------------------------------------------------------
  // 6. Net estate tax = tentative tax - unified credit (floor at 0)
  // ------------------------------------------------------------------
  const netEstateTax = Decimal.max(tentativeTax.minus(unifiedCredit), 0);

  // ------------------------------------------------------------------
  // 7. Effective rate
  // ------------------------------------------------------------------
  const effectiveRate = taxableEstate.gt(0)
    ? netEstateTax.div(taxableEstate).toNumber()
    : 0;

  return {
    taxableEstate: taxableEstate.toNumber(),
    tentativeTax: tentativeTax.toNumber(),
    netEstateTax: netEstateTax.toNumber(),
    effectiveRate,
  };
}
