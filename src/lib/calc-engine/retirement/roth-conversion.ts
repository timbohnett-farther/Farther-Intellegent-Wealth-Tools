/**
 * Roth conversion optimizer.
 *
 * Determines the optimal amount to convert from a traditional IRA / 401(k)
 * to a Roth IRA in a given year by analyzing:
 *   - Current marginal bracket and headroom
 *   - Nearest IRMAA threshold
 *   - Tax cost of conversion (federal tax with and without conversion)
 *   - IRMAA impact if conversion crosses threshold
 *   - Projected future tax savings (PV of avoiding tax at expected retirement rate)
 *   - Net benefit = projected savings - immediate tax cost
 *   - Strategy recommendation
 *
 * All monetary math uses Decimal.js for precision.
 * Pure function — no side effects, no database calls.
 */

import Decimal from 'decimal.js';
import type {
  RothConversionInput,
  RothConversionResult,
  TaxBracket,
  IRMAAbracket,
  FederalTaxInput,
} from '../types';
import { calculateFederalTax } from '../tax/federal-income-tax';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a minimal FederalTaxInput for computing tax at a given taxable income
 * level. Zeroes out everything except ordinary income and deductions.
 */
function buildMinimalTaxInput(
  taxableIncome: number,
  input: RothConversionInput,
): FederalTaxInput {
  return {
    ordinaryIncome: taxableIncome,
    qualifiedDividends: 0,
    longTermCapitalGains: 0,
    shortTermCapitalGains: 0,
    otherIncome: 0,
    iraDistributions: 0,
    rothDistributions: 0,
    socialSecurityTaxable: 0,
    adjustments: {
      studentLoanInterest: 0,
      selfEmploymentDeduction: 0,
      iraDeduction: 0,
      hsaDeduction: 0,
      alimonyPaid: 0,
      otherAGIAdjustments: 0,
    },
    deductions: {
      type: 'standard',
      standardAmount: input.standardDeduction,
      itemizedTotal: 0,
      saltAmount: 0,
      mortgageInterest: 0,
      charitableCash: 0,
      charitableNonCash: 0,
      medicalExpenses: 0,
      otherItemized: 0,
    },
    credits: {
      childTaxCredit: 0,
      childCareCredit: 0,
      educationCredit: 0,
      retirementSaverCredit: 0,
      foreignTaxCredit: 0,
      otherCredits: 0,
    },
    filingStatus: input.filingStatus,
    brackets: input.brackets,
    cgBrackets: input.cgBrackets,
    year: 2026,
  };
}

/**
 * Compute bracket headroom for each bracket above the current marginal rate.
 * Returns an array describing how much room exists in each bracket before
 * crossing into the next, including whether an IRMAA threshold falls within
 * that bracket space.
 */
function computeBracketHeadroom(
  currentTaxableIncome: Decimal,
  standardDeduction: Decimal,
  brackets: TaxBracket[],
  irmaaBrackets: IRMAAbracket[],
  irmaaLookbackMagi: Decimal,
): Array<{
  rate: number;
  headroom: number;
  irmaaTrigger: boolean;
  irmaaThreshold: number;
}> {
  const results: Array<{
    rate: number;
    headroom: number;
    irmaaTrigger: boolean;
    irmaaThreshold: number;
  }> = [];

  // Taxable income = AGI - standard deduction. AGI here is the current
  // ordinary income. The taxable income that flows through brackets is
  // currentTaxableIncome - standardDeduction (floored at 0).
  const taxableAfterDeduction = Decimal.max(
    currentTaxableIncome.minus(standardDeduction),
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

    if (taxableAfterDeduction.lt(nextFilled)) {
      // We are inside this bracket (or above it for the remaining brackets)
      const headroom = nextFilled.minus(
        Decimal.max(taxableAfterDeduction, filled),
      );

      // Check if IRMAA threshold falls within the headroom
      // IRMAA is based on MAGI from 2 years ago, but for a Roth conversion
      // the current year MAGI matters for IRMAA 2 years hence.
      // We compute using the current year's MAGI impact.
      const currentMagi = irmaaLookbackMagi;
      const magiAfterBracketFill = currentMagi.plus(headroom);

      let irmaaTrigger = false;
      let irmaaThreshold = 0;

      for (const irmaaBracket of irmaaBrackets) {
        const threshold = new Decimal(irmaaBracket.magiMin);
        if (
          currentMagi.lt(threshold) &&
          magiAfterBracketFill.gte(threshold)
        ) {
          irmaaTrigger = true;
          irmaaThreshold = irmaaBracket.magiMin;
          break;
        }
      }

      if (headroom.gt(0) || bracketMax.eq(Infinity)) {
        results.push({
          rate: bracket.rate,
          headroom: headroom.isFinite() ? headroom.toDecimalPlaces(2).toNumber() : Infinity,
          irmaaTrigger,
          irmaaThreshold,
        });
      }
    }

    filled = nextFilled;
  }

  return results;
}

/**
 * Find the nearest IRMAA threshold above the current MAGI and compute
 * how much room exists before crossing it.
 */
function findNearestIRMAAThreshold(
  currentMagi: Decimal,
  irmaaBrackets: IRMAAbracket[],
): { threshold: number; roomToThreshold: Decimal } {
  for (const bracket of irmaaBrackets) {
    const threshold = new Decimal(bracket.magiMin);
    if (currentMagi.lt(threshold)) {
      return {
        threshold: bracket.magiMin,
        roomToThreshold: threshold.minus(currentMagi),
      };
    }
  }
  // Already above all thresholds
  return {
    threshold: 0,
    roomToThreshold: new Decimal(0),
  };
}

/**
 * Calculate the annual IRMAA surcharge if the conversion pushes MAGI
 * into the next IRMAA bracket.
 */
function calculateIRMAAImpact(
  currentMagi: Decimal,
  conversionAmount: Decimal,
  irmaaBrackets: IRMAAbracket[],
): Decimal {
  const newMagi = currentMagi.plus(conversionAmount);

  // Find current bracket
  let currentSurcharge = new Decimal(0);
  for (const bracket of irmaaBrackets) {
    const min = new Decimal(bracket.magiMin);
    const max = bracket.magiMax !== null ? new Decimal(bracket.magiMax) : new Decimal(Infinity);
    if (currentMagi.gte(min) && currentMagi.lt(max)) {
      currentSurcharge = new Decimal(bracket.partBMonthly)
        .plus(new Decimal(bracket.partDMonthly))
        .times(12);
      break;
    }
  }

  // Find new bracket
  let newSurcharge = new Decimal(0);
  for (const bracket of irmaaBrackets) {
    const min = new Decimal(bracket.magiMin);
    const max = bracket.magiMax !== null ? new Decimal(bracket.magiMax) : new Decimal(Infinity);
    if (newMagi.gte(min) && newMagi.lt(max)) {
      newSurcharge = new Decimal(bracket.partBMonthly)
        .plus(new Decimal(bracket.partDMonthly))
        .times(12);
      break;
    }
  }

  return Decimal.max(newSurcharge.minus(currentSurcharge), 0);
}

// ---------------------------------------------------------------------------
// Main calculation
// ---------------------------------------------------------------------------

/**
 * Calculate the optimal Roth conversion amount and cost/benefit analysis.
 *
 * Strategy:
 * 1. Find current marginal bracket and headroom
 * 2. Find nearest IRMAA threshold
 * 3. Determine optimal conversion amount (fill current bracket but stop before IRMAA)
 * 4. Calculate tax cost by comparing federal tax with and without conversion
 * 5. IRMAA impact if conversion crosses threshold
 * 6. Project future tax savings: PV of avoiding tax at expected retirement rate
 * 7. Net benefit = projected savings - immediate tax cost
 *
 * @param input - Roth conversion calculation inputs
 * @returns Detailed conversion analysis
 */
export function calculateRothConversion(
  input: RothConversionInput,
): RothConversionResult {
  const currentIncome = new Decimal(input.currentTaxableIncome);
  const tradBalance = new Decimal(input.traditionalBalance);
  const stdDeduction = new Decimal(input.standardDeduction);
  const irmaaLookbackMagi = new Decimal(input.irmaaLookbackMagi);

  // ------------------------------------------------------------------
  // 1. Find current bracket headroom
  // ------------------------------------------------------------------
  const bracketHeadroom = computeBracketHeadroom(
    currentIncome,
    stdDeduction,
    input.brackets,
    input.irmaaBrackets,
    irmaaLookbackMagi,
  );

  // ------------------------------------------------------------------
  // 2. Find nearest IRMAA threshold
  // ------------------------------------------------------------------
  const { threshold: nearestIRMAAThreshold, roomToThreshold: irmaaRoom } =
    findNearestIRMAAThreshold(irmaaLookbackMagi, input.irmaaBrackets);

  // ------------------------------------------------------------------
  // 3. Determine optimal conversion amount
  // ------------------------------------------------------------------
  // Strategy: fill the current marginal bracket, but stop if we'd cross
  // an IRMAA threshold. If a target rate or target amount is specified,
  // honour those constraints.

  // Find the headroom in the current bracket (the first entry in bracketHeadroom)
  let currentBracketHeadroom = new Decimal(0);
  let currentMarginalRate = 0;
  if (bracketHeadroom.length > 0) {
    currentBracketHeadroom = new Decimal(bracketHeadroom[0].headroom);
    currentMarginalRate = bracketHeadroom[0].rate;
  }

  // Candidate: fill current bracket
  let candidateConversion = currentBracketHeadroom;

  // If a target rate is specified, sum headroom up to and including that bracket
  if (input.targetRate != null) {
    candidateConversion = new Decimal(0);
    for (const bh of bracketHeadroom) {
      if (bh.rate <= input.targetRate) {
        candidateConversion = candidateConversion.plus(new Decimal(bh.headroom));
      }
    }
  }

  // If a target amount is specified, use it directly
  if (input.targetAmount != null && input.targetAmount > 0) {
    candidateConversion = new Decimal(input.targetAmount);
  }

  // Cap at IRMAA threshold room if it would trigger a bracket jump
  // (unless a specific target amount was provided)
  if (input.targetAmount == null && irmaaRoom.gt(0) && candidateConversion.gt(irmaaRoom)) {
    // Check if stopping before IRMAA is worthwhile
    // Use IRMAA room minus a small buffer ($1)
    const irmaaLimited = Decimal.max(irmaaRoom.minus(1), 0);
    if (irmaaLimited.gt(0)) {
      candidateConversion = irmaaLimited;
    }
  }

  // Cap at available traditional balance
  candidateConversion = Decimal.min(candidateConversion, tradBalance);

  // Floor at zero
  candidateConversion = Decimal.max(candidateConversion, 0);

  const conversionAmount = candidateConversion;

  // ------------------------------------------------------------------
  // 4. Calculate tax cost: federal tax with and without conversion
  // ------------------------------------------------------------------
  const baseTaxInput = buildMinimalTaxInput(
    currentIncome.toNumber(),
    input,
  );
  const baseTaxResult = calculateFederalTax(baseTaxInput);

  const withConversionTaxInput = buildMinimalTaxInput(
    currentIncome.plus(conversionAmount).toNumber(),
    input,
  );
  const withConversionTaxResult = calculateFederalTax(withConversionTaxInput);

  const taxOnConversion = new Decimal(withConversionTaxResult.federalIncomeTax)
    .minus(new Decimal(baseTaxResult.federalIncomeTax));

  const marginalRateOnConversion = conversionAmount.gt(0)
    ? taxOnConversion.dividedBy(conversionAmount)
    : new Decimal(0);

  // ------------------------------------------------------------------
  // 5. IRMAA impact
  // ------------------------------------------------------------------
  const irmaaImpact = calculateIRMAAImpact(
    irmaaLookbackMagi,
    conversionAmount,
    input.irmaaBrackets,
  );

  // ------------------------------------------------------------------
  // 6. Net tax cost now
  // ------------------------------------------------------------------
  const netTaxCostNow = taxOnConversion.plus(irmaaImpact);

  // ------------------------------------------------------------------
  // 7. Project future tax savings
  // ------------------------------------------------------------------
  // The conversion moves money from pre-tax to after-tax.
  // In retirement, the converted amount (grown) would have been taxed at
  // the expected retirement rate. The PV of that future tax is the savings.
  //
  // Future value of converted amount:
  //   FV = conversionAmount * (1 + assumedReturn)^yearsToRetirement
  // Tax on that FV at retirement rate:
  //   futureTax = FV * expectedRetirementRate
  // PV of that tax (discounting back at assumedReturn):
  //   PV(futureTax) = futureTax / (1 + assumedReturn)^yearsToRetirement
  //                 = conversionAmount * expectedRetirementRate
  //
  // This simplification works because the growth and discount rates cancel.
  const expectedRetirementRate = new Decimal(input.expectedRetirementRate);
  const projectedTaxSavings = conversionAmount.times(expectedRetirementRate);

  // ------------------------------------------------------------------
  // 8. Net benefit
  // ------------------------------------------------------------------
  const netBenefit = projectedTaxSavings.minus(netTaxCostNow);
  const worthConverting = netBenefit.gt(0);

  // ------------------------------------------------------------------
  // 9. Strategy recommendation
  // ------------------------------------------------------------------
  let conversionStrategy: string;
  if (conversionAmount.isZero()) {
    conversionStrategy = 'No conversion recommended — no headroom or no traditional balance.';
  } else if (worthConverting) {
    if (marginalRateOnConversion.lt(expectedRetirementRate)) {
      conversionStrategy =
        `Convert $${conversionAmount.toDecimalPlaces(2).toFixed(2)} — ` +
        `current marginal rate (${marginalRateOnConversion.times(100).toDecimalPlaces(1).toFixed(1)}%) ` +
        `is below expected retirement rate (${expectedRetirementRate.times(100).toDecimalPlaces(1).toFixed(1)}%). ` +
        `Fills bracket without triggering IRMAA.`;
    } else {
      conversionStrategy =
        `Convert $${conversionAmount.toDecimalPlaces(2).toFixed(2)} — ` +
        `net benefit is positive after accounting for future tax savings.`;
    }
  } else {
    conversionStrategy =
      `Conversion of $${conversionAmount.toDecimalPlaces(2).toFixed(2)} has a negative net benefit. ` +
      `Consider deferring or converting a smaller amount.`;
  }

  // Also note SS taxation increase as zero — this is a placeholder for
  // integration with SS taxation calculator (SS taxation increase depends
  // on provisional income changes which require additional input)
  const ssTaxationIncrease = new Decimal(0);

  // ------------------------------------------------------------------
  // Assemble result
  // ------------------------------------------------------------------
  return {
    recommendedConversionAmount: conversionAmount.toDecimalPlaces(2).toNumber(),
    taxOnConversion: taxOnConversion.toDecimalPlaces(2).toNumber(),
    marginalRateOnConversion: marginalRateOnConversion.toDecimalPlaces(6).toNumber(),
    irmaaImpact: irmaaImpact.toDecimalPlaces(2).toNumber(),
    ssTaxationIncrease: ssTaxationIncrease.toDecimalPlaces(2).toNumber(),
    netTaxCostNow: netTaxCostNow.toDecimalPlaces(2).toNumber(),
    projectedTaxSavingsLifetime: projectedTaxSavings.toDecimalPlaces(2).toNumber(),
    netBenefit: netBenefit.toDecimalPlaces(2).toNumber(),
    worthConverting,
    bracketHeadroom,
    conversionStrategy,
  };
}
