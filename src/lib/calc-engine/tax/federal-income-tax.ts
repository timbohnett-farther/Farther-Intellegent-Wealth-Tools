/**
 * Federal income tax calculation.
 * Pure function — no side effects, no DB calls.
 *
 * Handles:
 *   - Gross income aggregation
 *   - Above-the-line adjustments -> AGI
 *   - Standard vs. itemized deductions (SALT cap, charitable limits, medical floor)
 *   - Ordinary income tax via bracket stacking
 *   - Preferential income (LTCG + QD) via capital gains brackets
 *   - NIIT (3.8%)
 *   - Non-refundable credits
 *   - Marginal rate and headroom to next bracket
 */

import Decimal from 'decimal.js';
import type {
  FederalTaxInput,
  FederalTaxResult,
  BracketBreakdown,
  TaxBracket,
  CapitalGainsBracket,
} from '../types';
import { calculateCapitalGainsTax } from './capital-gains-tax';
import { calculateNIIT } from './niit';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** SALT deduction cap under TCJA */
const SALT_CAP = 10_000;

/** Medical expenses floor as a percentage of AGI */
const MEDICAL_FLOOR_PCT = new Decimal('0.075');

/** Charitable non-cash deduction limited to 30 % of AGI */
const CHARITABLE_NONCASH_AGI_LIMIT = new Decimal('0.30');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Compute itemized deductions, applying the SALT cap, medical floor, and
 * charitable non-cash limit.
 */
function computeItemizedDeductions(
  input: FederalTaxInput,
  agi: Decimal,
): Decimal {
  const salt = Decimal.min(input.deductions.saltAmount, SALT_CAP);
  const mortgage = new Decimal(input.deductions.mortgageInterest);
  const charitableCash = new Decimal(input.deductions.charitableCash);

  // Non-cash charitable limited to 30 % of AGI
  const charitableNonCashLimit = agi.mul(CHARITABLE_NONCASH_AGI_LIMIT);
  const charitableNonCash = Decimal.min(
    input.deductions.charitableNonCash,
    charitableNonCashLimit,
  );

  // Medical: only the amount exceeding 7.5 % of AGI is deductible
  const medicalFloor = agi.mul(MEDICAL_FLOOR_PCT);
  const medical = Decimal.max(
    new Decimal(input.deductions.medicalExpenses).minus(medicalFloor),
    0,
  );

  const other = new Decimal(input.deductions.otherItemized);

  return salt
    .plus(mortgage)
    .plus(charitableCash)
    .plus(charitableNonCash)
    .plus(medical)
    .plus(other);
}

/**
 * Compute ordinary income tax by stacking income through the supplied
 * brackets. Returns the tax amount and per-bracket breakdown.
 */
function computeOrdinaryTax(
  ordinaryTaxable: Decimal,
  brackets: TaxBracket[],
): { tax: Decimal; breakdown: BracketBreakdown[] } {
  let remaining = ordinaryTaxable;
  let tax = new Decimal(0);
  const breakdown: BracketBreakdown[] = [];

  for (const bracket of brackets) {
    if (remaining.lte(0)) break;

    const bracketMin = new Decimal(bracket.minIncome);
    const bracketMax =
      bracket.maxIncome !== null
        ? new Decimal(bracket.maxIncome)
        : new Decimal(Infinity);

    const bracketWidth = bracketMax.minus(bracketMin);
    const incomeInBracket = Decimal.min(remaining, bracketWidth);
    const rate = new Decimal(bracket.rate);
    const taxInBracket = incomeInBracket.mul(rate);

    tax = tax.plus(taxInBracket);
    breakdown.push({
      rate: bracket.rate,
      incomeInBracket: incomeInBracket.toNumber(),
      taxInBracket: taxInBracket.toNumber(),
    });

    remaining = remaining.minus(incomeInBracket);
  }

  return { tax, breakdown };
}

/**
 * Determine the marginal rate and headroom to the top of the current bracket.
 */
function computeMarginalInfo(
  ordinaryTaxable: Decimal,
  brackets: TaxBracket[],
): { marginalRate: number; nextBracketThreshold: number; nextBracketHeadroom: number } {
  let filled = new Decimal(0);

  for (let i = 0; i < brackets.length; i++) {
    const bracket = brackets[i];
    const bracketMin = new Decimal(bracket.minIncome);
    const bracketMax =
      bracket.maxIncome !== null
        ? new Decimal(bracket.maxIncome)
        : new Decimal(Infinity);
    const bracketWidth = bracketMax.minus(bracketMin);
    const nextFilled = filled.plus(bracketWidth);

    if (ordinaryTaxable.lte(nextFilled)) {
      const headroom = nextFilled.minus(ordinaryTaxable);
      const threshold = bracketMax.isFinite()
        ? bracketMax.toNumber()
        : Infinity;
      return {
        marginalRate: bracket.rate,
        nextBracketThreshold: threshold,
        nextBracketHeadroom: headroom.toNumber(),
      };
    }

    filled = nextFilled;
  }

  // Highest bracket
  const last = brackets[brackets.length - 1];
  return {
    marginalRate: last.rate,
    nextBracketThreshold: Infinity,
    nextBracketHeadroom: 0,
  };
}

// ---------------------------------------------------------------------------
// Main calculation
// ---------------------------------------------------------------------------

export function calculateFederalTax(input: FederalTaxInput): FederalTaxResult {
  // ------------------------------------------------------------------
  // 1. Gross income
  // ------------------------------------------------------------------
  const ordinary = new Decimal(input.ordinaryIncome);
  const qd = new Decimal(input.qualifiedDividends);
  const ltcg = new Decimal(input.longTermCapitalGains);
  const stcg = new Decimal(input.shortTermCapitalGains);
  const other = new Decimal(input.otherIncome);
  const iraDist = new Decimal(input.iraDistributions);
  const ssTaxable = new Decimal(input.socialSecurityTaxable);

  const grossIncome = ordinary
    .plus(qd)
    .plus(ltcg)
    .plus(stcg)
    .plus(other)
    .plus(iraDist)
    .plus(ssTaxable);

  // ------------------------------------------------------------------
  // 2. Above-the-line adjustments -> AGI
  // ------------------------------------------------------------------
  const adj = input.adjustments;
  const totalAdjustments = new Decimal(adj.studentLoanInterest)
    .plus(adj.selfEmploymentDeduction)
    .plus(adj.iraDeduction)
    .plus(adj.hsaDeduction)
    .plus(adj.alimonyPaid)
    .plus(adj.otherAGIAdjustments);

  const agi = grossIncome.minus(totalAdjustments);

  // ------------------------------------------------------------------
  // 3. Deductions: choose larger of standard or itemized
  // ------------------------------------------------------------------
  const standardDed = new Decimal(input.deductions.standardAmount);
  const itemizedDed = computeItemizedDeductions(input, agi);

  let deductionAmount: Decimal;
  if (input.deductions.type === 'itemized') {
    deductionAmount = itemizedDed;
  } else if (input.deductions.type === 'standard') {
    deductionAmount = standardDed;
  } else {
    deductionAmount = Decimal.max(standardDed, itemizedDed);
  }

  // ------------------------------------------------------------------
  // 4. Taxable income
  // ------------------------------------------------------------------
  const taxableIncome = Decimal.max(agi.minus(deductionAmount), 0);

  // ------------------------------------------------------------------
  // 5. Separate preferential from ordinary taxable
  // ------------------------------------------------------------------
  const preferentialIncome = qd.plus(ltcg);
  const ordinaryTaxableIncome = Decimal.max(
    taxableIncome.minus(preferentialIncome),
    0,
  );

  // ------------------------------------------------------------------
  // 6. Ordinary tax via bracket stacking
  // ------------------------------------------------------------------
  const { tax: ordinaryTax, breakdown: bracketBreakdown } =
    computeOrdinaryTax(ordinaryTaxableIncome, input.brackets);

  // ------------------------------------------------------------------
  // 7. Capital gains tax: stack preferential on top of ordinary
  // ------------------------------------------------------------------
  const cgResult = calculateCapitalGainsTax(
    ordinaryTaxableIncome.toNumber(),
    preferentialIncome.toNumber(),
    input.cgBrackets,
  );
  const capitalGainsTax = new Decimal(cgResult.capitalGainsTax);

  // ------------------------------------------------------------------
  // 8. NIIT: 3.8 % on lesser of NII or (AGI - threshold)
  // ------------------------------------------------------------------
  const netInvestmentIncome = qd.plus(ltcg).plus(stcg).plus(other).toNumber();
  const niitResult = calculateNIIT(
    agi.toNumber(),
    netInvestmentIncome,
    input.filingStatus,
  );
  const niit = new Decimal(niitResult.niit);

  // ------------------------------------------------------------------
  // 9. Total tax before credits
  // ------------------------------------------------------------------
  const totalTaxBeforeCredits = ordinaryTax.plus(capitalGainsTax).plus(niit);

  // ------------------------------------------------------------------
  // 10. Credits (non-refundable — floor at 0)
  // ------------------------------------------------------------------
  const cr = input.credits;
  const totalCredits = new Decimal(cr.childTaxCredit)
    .plus(cr.childCareCredit)
    .plus(cr.educationCredit)
    .plus(cr.retirementSaverCredit)
    .plus(cr.foreignTaxCredit)
    .plus(cr.otherCredits);

  const federalIncomeTax = Decimal.max(
    totalTaxBeforeCredits.minus(totalCredits),
    0,
  );

  // ------------------------------------------------------------------
  // 11. Effective rate
  // ------------------------------------------------------------------
  const effectiveRate = grossIncome.gt(0)
    ? federalIncomeTax.div(grossIncome).toNumber()
    : 0;

  // ------------------------------------------------------------------
  // 12. Marginal rate & headroom
  // ------------------------------------------------------------------
  const { marginalRate, nextBracketThreshold, nextBracketHeadroom } =
    computeMarginalInfo(ordinaryTaxableIncome, input.brackets);

  // ------------------------------------------------------------------
  // Assemble result
  // ------------------------------------------------------------------
  return {
    grossIncome: grossIncome.toNumber(),
    adjustedGrossIncome: agi.toNumber(),
    deductionAmount: deductionAmount.toNumber(),
    taxableIncome: taxableIncome.toNumber(),
    ordinaryTaxableIncome: ordinaryTaxableIncome.toNumber(),
    preferentialIncome: preferentialIncome.toNumber(),
    ordinaryTax: ordinaryTax.toNumber(),
    capitalGainsTax: capitalGainsTax.toNumber(),
    niit: niit.toNumber(),
    totalTaxBeforeCredits: totalTaxBeforeCredits.toNumber(),
    totalCredits: totalCredits.toNumber(),
    federalIncomeTax: federalIncomeTax.toNumber(),
    effectiveRate,
    marginalRate,
    nextBracketThreshold,
    nextBracketHeadroom,
    bracketBreakdown,
  };
}
