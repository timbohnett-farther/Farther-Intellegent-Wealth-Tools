/**
 * Charitable planning calculations.
 * Pure functions — no side effects, no DB calls.
 *
 * Handles:
 *   - DAF funding comparison (cash vs appreciated stock)
 *   - Bunching optimizer (optimal interval for charitable giving vs standard deduction)
 *   - QCD vs cash giving comparison (AGI impact, SS taxation, IRMAA)
 *   - Charitable deduction optimizer
 */

import Decimal from 'decimal.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DAFFundingComparison {
  cashGiftDeduction: number;
  cashGiftNetCost: number;
  stockGiftDeduction: number;
  stockGiftCGTaxAvoided: number;
  stockGiftNetCost: number;
  taxSavingsOfStock: number;
}

export interface BunchingResult {
  annualCharitableBudget: number;
  standardDeduction: number;
  optimalBunchingInterval: number;
  annualTaxSavings: number;
  bunchedDeduction: number;
  withoutBunchingAnnualBenefit: number;
  withBunchingAnnualBenefit: number;
}

export interface QCDComparison {
  amount: number;
  cashGift: { agiImpact: number; ssTaxImpact: number; irmaaImpact: number; netTaxCost: number };
  qcd: { agiReduction: number; ssTaxSavings: number; irmaaSavings: number; netTaxCost: number };
  netSavingsOfQCD: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Federal LTCG rate + NIIT for high earners */
const CG_RATE_HIGH = new Decimal('0.238');

/** Standard deductions (2026 estimates, TCJA sunset) */
const STANDARD_DEDUCTIONS: Record<string, number> = {
  single: 16_150,
  mfj: 32_300,
  mfs: 16_150,
  hoh: 24_200,
  qw: 32_300,
};

/** SS taxation thresholds */
const SS_THRESHOLDS: Record<string, { lower: number; upper: number }> = {
  single: { lower: 25_000, upper: 34_000 },
  mfj: { lower: 32_000, upper: 44_000 },
};

/** IRMAA threshold (MFJ, 2026 estimate) */
const IRMAA_THRESHOLD_MFJ = new Decimal(206_000);
const IRMAA_THRESHOLD_SINGLE = new Decimal(103_000);

/** Annual IRMAA surcharge per bracket (approximate) */
const IRMAA_ANNUAL_SURCHARGE = new Decimal(2_400);

// ---------------------------------------------------------------------------
// DAF Funding Comparison
// ---------------------------------------------------------------------------

/**
 * Compare the tax impact of funding a Donor-Advised Fund with cash vs
 * appreciated stock.
 *
 * Donating appreciated stock avoids capital gains tax on the appreciation
 * while still providing a charitable deduction for the full FMV.
 *
 * @param amount       - Dollar amount to donate
 * @param costBasis    - Cost basis of the appreciated stock
 * @param fmv          - Fair market value of the stock
 * @param marginalRate - Marginal federal income tax rate
 * @param cgRate       - Capital gains tax rate (federal + state + NIIT)
 * @param agiLimit     - AGI for deduction limitation purposes (typically 30% of AGI for stock, 60% for cash)
 */
export function compareDAFFunding(
  amount: number,
  costBasis: number,
  fmv: number,
  marginalRate: number,
  cgRate: number,
  agiLimit: number,
): DAFFundingComparison {
  const amountDec = new Decimal(amount);
  const basisDec = new Decimal(costBasis);
  const fmvDec = new Decimal(fmv);
  const margRate = new Decimal(marginalRate);
  const capGainsRate = new Decimal(cgRate);
  const agiLimitDec = new Decimal(agiLimit);

  // ------------------------------------------------------------------
  // Cash gift analysis
  // ------------------------------------------------------------------
  // Cash gift deduction limited to 60% of AGI
  const cashDeductionLimit = agiLimitDec.mul('0.60');
  const cashGiftDeduction = Decimal.min(amountDec, cashDeductionLimit);
  const cashTaxSavings = cashGiftDeduction.mul(margRate);
  const cashNetCost = amountDec.minus(cashTaxSavings);

  // ------------------------------------------------------------------
  // Stock gift analysis
  // ------------------------------------------------------------------
  // Stock gift deduction limited to 30% of AGI (for LTCG property)
  const stockDeductionLimit = agiLimitDec.mul('0.30');
  const stockGiftDeduction = Decimal.min(fmvDec, stockDeductionLimit);
  const stockTaxSavings = stockGiftDeduction.mul(margRate);

  // Capital gains tax avoided by donating instead of selling
  const unrealizedGain = Decimal.max(fmvDec.minus(basisDec), 0);
  const cgTaxAvoided = unrealizedGain.mul(capGainsRate);

  // Net cost of donating stock = FMV - tax savings - CG tax avoided
  // (donor gives up FMV but saves income tax + avoids CG tax)
  const stockNetCost = fmvDec.minus(stockTaxSavings).minus(cgTaxAvoided);

  // ------------------------------------------------------------------
  // Tax savings of stock vs cash
  // ------------------------------------------------------------------
  const taxSavingsOfStock = cashNetCost.minus(stockNetCost);

  return {
    cashGiftDeduction: cashGiftDeduction.toNumber(),
    cashGiftNetCost: cashNetCost.toNumber(),
    stockGiftDeduction: stockGiftDeduction.toNumber(),
    stockGiftCGTaxAvoided: cgTaxAvoided.toNumber(),
    stockGiftNetCost: stockNetCost.toNumber(),
    taxSavingsOfStock: taxSavingsOfStock.toNumber(),
  };
}

// ---------------------------------------------------------------------------
// Bunching Optimizer
// ---------------------------------------------------------------------------

/**
 * Determine the optimal charitable bunching strategy.
 *
 * "Bunching" means concentrating multiple years of charitable giving into one
 * year to exceed the standard deduction threshold and maximize tax benefit.
 * In non-bunching years, the taxpayer takes the standard deduction.
 *
 * @param annualCharitable  - Annual charitable giving budget
 * @param standardDeduction - Standard deduction amount
 * @param marginalRate      - Marginal federal income tax rate
 * @param otherItemized     - Other itemized deductions (SALT, mortgage interest, etc.)
 */
export function optimizeBunching(
  annualCharitable: number,
  standardDeduction: number,
  marginalRate: number,
  otherItemized: number,
): BunchingResult {
  const annual = new Decimal(annualCharitable);
  const stdDed = new Decimal(standardDeduction);
  const margRate = new Decimal(marginalRate);
  const otherItem = new Decimal(otherItemized);

  // ------------------------------------------------------------------
  // 1. Without bunching: annual itemized vs standard deduction
  // ------------------------------------------------------------------
  const annualItemized = otherItem.plus(annual);
  const annualBenefit = Decimal.max(annualItemized.minus(stdDed), 0);
  const withoutBunchingAnnualBenefit = annualBenefit.mul(margRate);

  // ------------------------------------------------------------------
  // 2. With bunching: find optimal interval (2-5 years)
  // ------------------------------------------------------------------
  let bestInterval = 1;
  let bestAnnualizedBenefit = withoutBunchingAnnualBenefit;

  for (let interval = 2; interval <= 5; interval++) {
    const bunchedCharitable = annual.mul(interval);
    const bunchedItemized = otherItem.plus(bunchedCharitable);
    const bunchYearDeduction = Decimal.max(bunchedItemized, stdDed);

    // In the bunching year, benefit = itemized deduction - standard deduction
    const bunchYearBenefit = Decimal.max(bunchedItemized.minus(stdDed), 0).mul(margRate);

    // In non-bunching years (interval - 1 years), take standard deduction
    // No additional charitable benefit in those years
    const standardYearsBenefit = new Decimal(0);

    // Total benefit over the interval
    const totalBenefitOverInterval = bunchYearBenefit.plus(
      standardYearsBenefit.mul(interval - 1),
    );

    // Annualized benefit
    const annualizedBenefit = totalBenefitOverInterval.div(interval);

    if (annualizedBenefit.gt(bestAnnualizedBenefit)) {
      bestInterval = interval;
      bestAnnualizedBenefit = annualizedBenefit;
    }
  }

  // ------------------------------------------------------------------
  // 3. Calculate results for optimal interval
  // ------------------------------------------------------------------
  const bunchedDeduction = annual.mul(bestInterval).plus(otherItem);
  const annualTaxSavings = bestAnnualizedBenefit.minus(withoutBunchingAnnualBenefit);

  return {
    annualCharitableBudget: annual.toNumber(),
    standardDeduction: stdDed.toNumber(),
    optimalBunchingInterval: bestInterval,
    annualTaxSavings: annualTaxSavings.toNumber(),
    bunchedDeduction: bunchedDeduction.toNumber(),
    withoutBunchingAnnualBenefit: withoutBunchingAnnualBenefit.toNumber(),
    withBunchingAnnualBenefit: bestAnnualizedBenefit.toNumber(),
  };
}

// ---------------------------------------------------------------------------
// QCD vs Cash Giving Comparison
// ---------------------------------------------------------------------------

/**
 * Compare Qualified Charitable Distribution (QCD) to cash giving.
 *
 * A QCD (available to those 70.5+) satisfies the RMD without including
 * the distribution in AGI. This can reduce SS taxation and avoid IRMAA
 * surcharges.
 *
 * @param amount       - Charitable giving amount
 * @param rmdAmount    - Required minimum distribution amount
 * @param otherIncome  - Other gross income (excluding RMD)
 * @param ssIncome     - Social Security gross benefit
 * @param filingStatus - Tax filing status
 * @param age          - Taxpayer's age
 */
export function compareQCDvsCash(
  amount: number,
  rmdAmount: number,
  otherIncome: number,
  ssIncome: number,
  filingStatus: string,
  age: number,
): QCDComparison {
  const amountDec = new Decimal(amount);
  const rmd = new Decimal(rmdAmount);
  const other = new Decimal(otherIncome);
  const ss = new Decimal(ssIncome);
  const isMFJ = filingStatus === 'mfj' || filingStatus === 'qw';

  // QCD amount cannot exceed the RMD (up to $105,000 annual limit)
  const qcdLimit = new Decimal(105_000);
  const effectiveQCD = Decimal.min(amountDec, Decimal.min(rmd, qcdLimit));

  // ------------------------------------------------------------------
  // Scenario 1: Cash gift (RMD is taken and included in AGI)
  // ------------------------------------------------------------------
  const cashAGI = other.plus(rmd);

  // SS taxation impact with cash gift
  const cashProvisionalIncome = cashAGI.plus(ss.mul('0.5'));
  const ssThresholds = isMFJ ? SS_THRESHOLDS['mfj'] : SS_THRESHOLDS['single'];
  const cashSSTaxable = computeSSBenefitTaxable(ss, cashProvisionalIncome, ssThresholds);

  // IRMAA impact
  const irmaaThreshold = isMFJ ? IRMAA_THRESHOLD_MFJ : IRMAA_THRESHOLD_SINGLE;
  const cashIrmaaImpact = cashAGI.gt(irmaaThreshold) ? IRMAA_ANNUAL_SURCHARGE : new Decimal(0);

  // Marginal rate estimate for the cash gift deduction benefit
  const cashMarginalRate = new Decimal('0.24'); // Approximation
  const cashDeductionBenefit = amountDec.mul(cashMarginalRate);

  // Net tax cost = tax on RMD income - charitable deduction benefit
  const cashTaxOnRMD = rmd.mul(cashMarginalRate);
  const cashNetTaxCost = cashTaxOnRMD.minus(cashDeductionBenefit);

  // ------------------------------------------------------------------
  // Scenario 2: QCD (RMD satisfied without AGI inclusion)
  // ------------------------------------------------------------------
  const qcdAGI = other.plus(rmd.minus(effectiveQCD));

  // SS taxation impact with QCD
  const qcdProvisionalIncome = qcdAGI.plus(ss.mul('0.5'));
  const qcdSSTaxable = computeSSBenefitTaxable(ss, qcdProvisionalIncome, ssThresholds);

  // IRMAA impact
  const qcdIrmaaImpact = qcdAGI.gt(irmaaThreshold) ? IRMAA_ANNUAL_SURCHARGE : new Decimal(0);

  // AGI reduction from QCD
  const agiReduction = effectiveQCD;

  // SS tax savings = tax on reduced SS taxation
  const ssTaxSavings = cashSSTaxable.minus(qcdSSTaxable).mul(cashMarginalRate);

  // IRMAA savings
  const irmaaSavings = cashIrmaaImpact.minus(qcdIrmaaImpact);

  // Net tax cost of QCD approach (lower AGI, but no charitable deduction taken)
  const qcdTaxOnReducedRMD = rmd.minus(effectiveQCD).mul(cashMarginalRate);
  const qcdNetTaxCost = qcdTaxOnReducedRMD;

  // ------------------------------------------------------------------
  // Net savings of QCD vs cash
  // ------------------------------------------------------------------
  const netSavings = cashNetTaxCost.minus(qcdNetTaxCost)
    .plus(ssTaxSavings)
    .plus(irmaaSavings);

  return {
    amount: amountDec.toNumber(),
    cashGift: {
      agiImpact: cashAGI.toNumber(),
      ssTaxImpact: cashSSTaxable.toNumber(),
      irmaaImpact: cashIrmaaImpact.toNumber(),
      netTaxCost: cashNetTaxCost.toNumber(),
    },
    qcd: {
      agiReduction: agiReduction.toNumber(),
      ssTaxSavings: ssTaxSavings.toNumber(),
      irmaaSavings: irmaaSavings.toNumber(),
      netTaxCost: qcdNetTaxCost.toNumber(),
    },
    netSavingsOfQCD: netSavings.toNumber(),
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Compute the taxable portion of Social Security benefits based on
 * provisional income (simplified version of the IRC section 86 formula).
 */
function computeSSBenefitTaxable(
  grossSS: Decimal,
  provisionalIncome: Decimal,
  thresholds: { lower: number; upper: number },
): Decimal {
  const lower = new Decimal(thresholds.lower);
  const upper = new Decimal(thresholds.upper);

  if (provisionalIncome.lte(lower)) {
    return new Decimal(0);
  }

  if (provisionalIncome.lte(upper)) {
    const excess = provisionalIncome.minus(lower);
    return Decimal.min(excess.mul('0.5'), grossSS.mul('0.5'));
  }

  // Above upper threshold: up to 85% taxable
  const tier1Range = upper.minus(lower);
  const tier1 = Decimal.min(tier1Range.mul('0.5'), grossSS.mul('0.5'));
  const excessOverUpper = provisionalIncome.minus(upper);
  const tier2 = excessOverUpper.mul('0.85');

  return Decimal.min(tier1.plus(tier2), grossSS.mul('0.85'));
}
