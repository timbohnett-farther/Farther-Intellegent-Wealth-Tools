/**
 * Tax-efficient withdrawal sequencing.
 *
 * Determines the optimal order and amounts to withdraw from different
 * account types (taxable, tax-deferred, tax-free) to meet a given
 * after-tax income need while minimizing the total tax burden.
 *
 * Withdrawal priority:
 *   1. RMD from tax-deferred (mandatory, comes out first)
 *   2. Taxable accounts (tax-efficient: lowest tax impact)
 *   3. Remaining tax-deferred up to current bracket ceiling
 *   4. Roth / tax-free (last resort — preserves tax-free growth)
 *
 * All monetary math uses Decimal.js for precision.
 * Pure function — no side effects, no database calls.
 */

import Decimal from 'decimal.js';
import type { TaxBracket, FilingStatus } from '../types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WithdrawalPlan {
  totalWithdrawal: number;
  fromTaxable: number;
  fromTaxDeferred: number;
  fromTaxFree: number;
  estimatedTaxOnWithdrawals: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Calculate the incremental federal tax for withdrawing a given amount of
 * ordinary income on top of existing ordinary income. Uses the bracket
 * schedule to compute the marginal tax only on the withdrawal slice.
 */
function estimateIncrementalTax(
  baseOrdinaryTaxableIncome: Decimal,
  withdrawalAmount: Decimal,
  brackets: TaxBracket[],
  standardDeduction: Decimal,
): Decimal {
  if (withdrawalAmount.lte(0)) {
    return new Decimal(0);
  }

  // Taxable income is after deduction
  const baseTaxable = Decimal.max(
    baseOrdinaryTaxableIncome.minus(standardDeduction),
    0,
  );
  const newTaxable = Decimal.max(
    baseOrdinaryTaxableIncome.plus(withdrawalAmount).minus(standardDeduction),
    0,
  );

  // Walk through brackets, computing tax on [baseTaxable, newTaxable]
  let tax = new Decimal(0);
  let filled = new Decimal(0);

  for (const bracket of brackets) {
    const bracketMax =
      bracket.maxIncome !== null
        ? new Decimal(bracket.maxIncome)
        : new Decimal(Infinity);
    const bracketWidth = bracketMax.minus(new Decimal(bracket.minIncome));
    const nextFilled = filled.plus(bracketWidth);
    const rate = new Decimal(bracket.rate);

    // Overlap between [baseTaxable, newTaxable] and [filled, nextFilled]
    const overlapStart = Decimal.max(baseTaxable, filled);
    const overlapEnd = Decimal.min(newTaxable, nextFilled);
    const overlap = Decimal.max(overlapEnd.minus(overlapStart), 0);

    if (overlap.gt(0)) {
      tax = tax.plus(overlap.times(rate));
    }

    if (newTaxable.lte(nextFilled)) break;

    filled = nextFilled;
  }

  return tax;
}

/**
 * Find the top of the current tax bracket: the maximum ordinary taxable
 * income that stays within the current marginal bracket.
 */
function findCurrentBracketCeiling(
  currentOrdinaryTaxableIncome: Decimal,
  brackets: TaxBracket[],
  standardDeduction: Decimal,
): Decimal {
  const taxable = Decimal.max(
    currentOrdinaryTaxableIncome.minus(standardDeduction),
    0,
  );

  let filled = new Decimal(0);

  for (const bracket of brackets) {
    const bracketMax =
      bracket.maxIncome !== null
        ? new Decimal(bracket.maxIncome)
        : new Decimal(Infinity);
    const bracketWidth = bracketMax.minus(new Decimal(bracket.minIncome));
    const nextFilled = filled.plus(bracketWidth);

    if (taxable.lt(nextFilled)) {
      // Current taxable sits in this bracket
      // Room = bracketCeiling - taxable, then add back deduction for gross amount
      const roomInBracket = nextFilled.minus(taxable);
      return roomInBracket;
    }

    filled = nextFilled;
  }

  // Already in top bracket — unlimited
  return new Decimal(Infinity);
}

/**
 * Gross-up: given a desired after-tax amount and a marginal tax rate,
 * compute the pre-tax withdrawal needed.
 *
 * grossUp = afterTax / (1 - marginalRate)
 */
function grossUp(afterTaxNeeded: Decimal, marginalRate: Decimal): Decimal {
  const denominator = new Decimal(1).minus(marginalRate);
  if (denominator.lte(0)) {
    // Edge case: 100% or higher marginal rate
    return afterTaxNeeded;
  }
  return afterTaxNeeded.dividedBy(denominator);
}

/**
 * Determine the marginal tax rate at the current income level.
 */
function getMarginalRate(
  ordinaryIncome: Decimal,
  brackets: TaxBracket[],
  standardDeduction: Decimal,
): Decimal {
  const taxable = Decimal.max(ordinaryIncome.minus(standardDeduction), 0);
  let filled = new Decimal(0);

  for (const bracket of brackets) {
    const bracketMax =
      bracket.maxIncome !== null
        ? new Decimal(bracket.maxIncome)
        : new Decimal(Infinity);
    const bracketWidth = bracketMax.minus(new Decimal(bracket.minIncome));
    const nextFilled = filled.plus(bracketWidth);

    if (taxable.lt(nextFilled)) {
      return new Decimal(bracket.rate);
    }

    filled = nextFilled;
  }

  // Top bracket
  return new Decimal(brackets[brackets.length - 1].rate);
}

// ---------------------------------------------------------------------------
// Main calculation
// ---------------------------------------------------------------------------

/**
 * Optimize the withdrawal sequence across taxable, tax-deferred, and
 * tax-free accounts to meet a desired after-tax income need.
 *
 * @param neededAfterTax          - The amount of after-tax income needed
 * @param taxableBalance          - Current balance in taxable accounts
 * @param taxDeferredBalance      - Current balance in tax-deferred accounts (IRA/401k)
 * @param taxFreeBalance          - Current balance in tax-free accounts (Roth)
 * @param currentOrdinaryIncome   - Existing ordinary income before withdrawals
 * @param brackets                - Federal ordinary income tax brackets
 * @param filingStatus            - Filing status
 * @param standardDeduction       - Standard deduction amount
 * @param rmdAmount               - Required minimum distribution amount (must come out first)
 * @returns Withdrawal plan showing source breakdown and estimated tax
 */
export function optimizeWithdrawalSequence(
  neededAfterTax: number,
  taxableBalance: number,
  taxDeferredBalance: number,
  taxFreeBalance: number,
  currentOrdinaryIncome: number,
  brackets: TaxBracket[],
  filingStatus: FilingStatus,
  standardDeduction: number,
  rmdAmount: number,
): WithdrawalPlan {
  let remaining = new Decimal(neededAfterTax);
  const taxableBal = new Decimal(taxableBalance);
  const taxDeferredBal = new Decimal(taxDeferredBalance);
  const taxFreeBal = new Decimal(taxFreeBalance);
  const currentIncome = new Decimal(currentOrdinaryIncome);
  const stdDed = new Decimal(standardDeduction);
  const rmd = new Decimal(rmdAmount);

  let fromTaxable = new Decimal(0);
  let fromTaxDeferred = new Decimal(0);
  let fromTaxFree = new Decimal(0);
  let totalTax = new Decimal(0);

  // Track income as we add withdrawals (for incremental tax computation)
  let runningOrdinaryIncome = currentIncome;
  let availableTaxDeferred = taxDeferredBal;
  let availableTaxable = taxableBal;
  let availableTaxFree = taxFreeBal;

  // ------------------------------------------------------------------
  // Step 1: RMD must come out first from tax-deferred
  // ------------------------------------------------------------------
  if (rmd.gt(0)) {
    const rmdWithdrawal = Decimal.min(rmd, availableTaxDeferred);

    // Tax on RMD
    const rmdTax = estimateIncrementalTax(
      runningOrdinaryIncome,
      rmdWithdrawal,
      brackets,
      stdDed,
    );

    const rmdAfterTax = rmdWithdrawal.minus(rmdTax);

    fromTaxDeferred = fromTaxDeferred.plus(rmdWithdrawal);
    availableTaxDeferred = availableTaxDeferred.minus(rmdWithdrawal);
    totalTax = totalTax.plus(rmdTax);
    runningOrdinaryIncome = runningOrdinaryIncome.plus(rmdWithdrawal);

    remaining = remaining.minus(Decimal.max(rmdAfterTax, 0));
  }

  if (remaining.lte(0)) {
    return assembleResult(fromTaxable, fromTaxDeferred, fromTaxFree, totalTax);
  }

  // ------------------------------------------------------------------
  // Step 2: Taxable accounts (tax-efficient: typically lower tax rates
  // on capital gains, and we can control lot selection)
  // ------------------------------------------------------------------
  // For taxable account withdrawals, we assume a blended effective tax
  // rate of ~15% (long-term capital gains rate) on the gain portion.
  // In practice, only the gain portion is taxed (cost basis is returned
  // tax-free). We use a conservative 50% gain assumption, yielding
  // ~7.5% effective tax on the full withdrawal.
  if (remaining.gt(0) && availableTaxable.gt(0)) {
    // Estimate effective tax rate on taxable withdrawals
    // Conservative assumption: 50% of withdrawal is gain, taxed at ~15%
    const taxableEffectiveRate = new Decimal('0.075');

    const grossNeeded = grossUp(remaining, taxableEffectiveRate);
    const taxableWithdrawal = Decimal.min(grossNeeded, availableTaxable);
    const taxOnTaxable = taxableWithdrawal.times(taxableEffectiveRate);
    const afterTaxFromTaxable = taxableWithdrawal.minus(taxOnTaxable);

    fromTaxable = fromTaxable.plus(taxableWithdrawal);
    availableTaxable = availableTaxable.minus(taxableWithdrawal);
    totalTax = totalTax.plus(taxOnTaxable);

    remaining = remaining.minus(afterTaxFromTaxable);
  }

  if (remaining.lte(0)) {
    return assembleResult(fromTaxable, fromTaxDeferred, fromTaxFree, totalTax);
  }

  // ------------------------------------------------------------------
  // Step 3: Additional tax-deferred up to current bracket ceiling
  // ------------------------------------------------------------------
  // We withdraw from tax-deferred only to the extent that income stays
  // within the current marginal bracket (to avoid bumping into a higher
  // bracket unnecessarily).
  if (remaining.gt(0) && availableTaxDeferred.gt(0)) {
    const bracketRoom = findCurrentBracketCeiling(
      runningOrdinaryIncome,
      brackets,
      stdDed,
    );

    const marginalRate = getMarginalRate(
      runningOrdinaryIncome,
      brackets,
      stdDed,
    );

    // Gross-up the remaining after-tax need
    const grossNeeded = grossUp(remaining, marginalRate);

    // Cap at bracket room and available balance
    const taxDeferredWithdrawal = Decimal.min(
      grossNeeded,
      bracketRoom,
      availableTaxDeferred,
    );

    if (taxDeferredWithdrawal.gt(0)) {
      const taxOnTD = estimateIncrementalTax(
        runningOrdinaryIncome,
        taxDeferredWithdrawal,
        brackets,
        stdDed,
      );

      const afterTaxFromTD = taxDeferredWithdrawal.minus(taxOnTD);

      fromTaxDeferred = fromTaxDeferred.plus(taxDeferredWithdrawal);
      availableTaxDeferred = availableTaxDeferred.minus(taxDeferredWithdrawal);
      totalTax = totalTax.plus(taxOnTD);
      runningOrdinaryIncome = runningOrdinaryIncome.plus(taxDeferredWithdrawal);

      remaining = remaining.minus(afterTaxFromTD);
    }
  }

  if (remaining.lte(0)) {
    return assembleResult(fromTaxable, fromTaxDeferred, fromTaxFree, totalTax);
  }

  // ------------------------------------------------------------------
  // Step 4: Roth / tax-free (last resort — no tax)
  // ------------------------------------------------------------------
  if (remaining.gt(0) && availableTaxFree.gt(0)) {
    // Roth withdrawals are tax-free (assuming qualified distribution)
    const rothWithdrawal = Decimal.min(remaining, availableTaxFree);

    fromTaxFree = fromTaxFree.plus(rothWithdrawal);
    availableTaxFree = availableTaxFree.minus(rothWithdrawal);

    remaining = remaining.minus(rothWithdrawal);
  }

  // ------------------------------------------------------------------
  // Step 5: If still short, pull additional from tax-deferred beyond
  // the bracket ceiling (at higher marginal rates)
  // ------------------------------------------------------------------
  if (remaining.gt(0) && availableTaxDeferred.gt(0)) {
    const marginalRate = getMarginalRate(
      runningOrdinaryIncome,
      brackets,
      stdDed,
    );

    const grossNeeded = grossUp(remaining, marginalRate);
    const extraTDWithdrawal = Decimal.min(grossNeeded, availableTaxDeferred);

    if (extraTDWithdrawal.gt(0)) {
      const taxOnExtra = estimateIncrementalTax(
        runningOrdinaryIncome,
        extraTDWithdrawal,
        brackets,
        stdDed,
      );

      const afterTaxExtra = extraTDWithdrawal.minus(taxOnExtra);

      fromTaxDeferred = fromTaxDeferred.plus(extraTDWithdrawal);
      totalTax = totalTax.plus(taxOnExtra);
      runningOrdinaryIncome = runningOrdinaryIncome.plus(extraTDWithdrawal);

      remaining = remaining.minus(afterTaxExtra);
    }
  }

  return assembleResult(fromTaxable, fromTaxDeferred, fromTaxFree, totalTax);
}

// ---------------------------------------------------------------------------
// Result assembler
// ---------------------------------------------------------------------------

function assembleResult(
  fromTaxable: Decimal,
  fromTaxDeferred: Decimal,
  fromTaxFree: Decimal,
  totalTax: Decimal,
): WithdrawalPlan {
  const totalWithdrawal = fromTaxable.plus(fromTaxDeferred).plus(fromTaxFree);

  return {
    totalWithdrawal: totalWithdrawal.toDecimalPlaces(2).toNumber(),
    fromTaxable: fromTaxable.toDecimalPlaces(2).toNumber(),
    fromTaxDeferred: fromTaxDeferred.toDecimalPlaces(2).toNumber(),
    fromTaxFree: fromTaxFree.toDecimalPlaces(2).toNumber(),
    estimatedTaxOnWithdrawals: totalTax.toDecimalPlaces(2).toNumber(),
  };
}
