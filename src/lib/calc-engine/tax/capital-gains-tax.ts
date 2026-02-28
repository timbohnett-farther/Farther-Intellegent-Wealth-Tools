/**
 * Capital gains tax calculation.
 * Pure function — no side effects, no DB calls.
 *
 * Handles:
 *   - Stacking preferential income (LTCG + QD) on top of ordinary taxable income
 *   - Applying 0% / 15% / 20% rates to the portions falling within each bracket
 *   - Returning per-bracket breakdown
 */

import Decimal from 'decimal.js';
import type { CapitalGainsBracket } from '../types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CapitalGainsTaxResult {
  capitalGainsTax: number;
  breakdown: Array<{ rate: number; amount: number; tax: number }>;
}

// ---------------------------------------------------------------------------
// Main calculation
// ---------------------------------------------------------------------------

/**
 * Calculate the tax on preferential income (LTCG + qualified dividends)
 * by stacking it on top of ordinary taxable income.
 *
 * The capital-gains brackets define absolute income thresholds.  Ordinary
 * taxable income occupies the lower portion of the bracket space; the
 * preferential income sits on top.
 *
 * @param ordinaryTaxableIncome - Taxable income excluding preferential income
 * @param preferentialIncome    - LTCG + qualified dividends
 * @param brackets              - Capital gains brackets (0%, 15%, 20%) with
 *                                absolute income thresholds
 */
export function calculateCapitalGainsTax(
  ordinaryTaxableIncome: number,
  preferentialIncome: number,
  brackets: CapitalGainsBracket[],
): CapitalGainsTaxResult {
  const ordinary = new Decimal(ordinaryTaxableIncome);
  let remaining = new Decimal(preferentialIncome);
  let totalTax = new Decimal(0);
  const breakdown: Array<{ rate: number; amount: number; tax: number }> = [];

  if (remaining.lte(0)) {
    return { capitalGainsTax: 0, breakdown: [] };
  }

  // The stack position starts at the top of ordinary income
  let stackPosition = ordinary;

  for (const bracket of brackets) {
    if (remaining.lte(0)) break;

    const bracketMax =
      bracket.maxIncome !== null
        ? new Decimal(bracket.maxIncome)
        : new Decimal(Infinity);

    // If ordinary income already exceeds this bracket's ceiling, skip it
    if (stackPosition.gte(bracketMax)) continue;

    // The available room in this bracket above the current stack position
    const roomInBracket = bracketMax.minus(
      Decimal.max(stackPosition, bracket.minIncome),
    );

    if (roomInBracket.lte(0)) continue;

    const amountInBracket = Decimal.min(remaining, roomInBracket);
    const rate = new Decimal(bracket.rate);
    const taxInBracket = amountInBracket.mul(rate);

    totalTax = totalTax.plus(taxInBracket);
    breakdown.push({
      rate: bracket.rate,
      amount: amountInBracket.toNumber(),
      tax: taxInBracket.toNumber(),
    });

    stackPosition = stackPosition.plus(amountInBracket);
    remaining = remaining.minus(amountInBracket);
  }

  return {
    capitalGainsTax: totalTax.toNumber(),
    breakdown,
  };
}
