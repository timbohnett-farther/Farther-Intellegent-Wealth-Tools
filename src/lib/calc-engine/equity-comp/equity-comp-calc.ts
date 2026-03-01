/**
 * Equity compensation tax calculations.
 * Pure functions — no side effects, no DB calls.
 *
 * Handles:
 *   - RSU tax impact per vesting event (ordinary income, withholding, net shares)
 *   - NQSO exercise tax (spread as W-2, FICA, state)
 *   - ISO exercise AMT impact (preference item, AMT crossover, qualifying vs
 *     disqualifying disposition)
 *   - ESPP tax treatment (qualifying vs disqualifying)
 *   - Concentrated position analysis (% of portfolio, downside scenarios)
 */

import Decimal from 'decimal.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RSUVestTaxResult {
  sharesVesting: number;
  fmvPerShare: number;
  ordinaryIncome: number;
  federalWithholding: number;
  ficaWithholding: number;
  stateWithholding: number;
  netSharesDelivered: number;
  netCashValue: number;
}

export interface NQSOExerciseResult {
  sharesExercised: number;
  exercisePrice: number;
  currentFMV: number;
  spreadPerShare: number;
  grossOrdinaryIncome: number;
  federalTax: number;
  ficaTax: number;
  stateTax: number;
  netAfterTax: number;
}

export interface ISOExerciseResult {
  sharesExercised: number;
  exercisePrice: number;
  currentFMV: number;
  spreadPerShare: number;
  amtPreferenceItem: number;
  estimatedAMT: number;
  qualifyingDispositionDate: Date;
  qualifyingTreatment: { totalGain: number; allLTCG: boolean; tax: number };
  disqualifyingTreatment: { ordinaryPortion: number; ltcgPortion: number; tax: number };
}

export interface ESPPTaxResult {
  purchasePrice: number;
  fmvAtPurchase: number;
  fmvAtSale: number;
  sharesAcquired: number;
  totalCost: number;
  qualifyingDisposition: {
    ordinaryIncome: number;
    ltcg: number;
    totalTax: number;
  };
  disqualifyingDisposition: {
    ordinaryIncome: number;
    stcgOrLtcg: number;
    totalTax: number;
  };
}

export interface ConcentratedPositionAnalysis {
  currentValue: number;
  pctOfPortfolio: number;
  unrealizedGain: number;
  if50Drop: number;
  if75Drop: number;
  outrightSaleTax: number;
  outrightSaleNetProceeds: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Federal supplemental income withholding rate */
const SUPPLEMENTAL_FED_RATE = new Decimal('0.22');
/** Supplemental rate for amounts over $1M */
const SUPPLEMENTAL_FED_RATE_OVER_1M = new Decimal('0.37');

/** Social Security tax rate (employee portion) */
const SS_RATE = new Decimal('0.062');
/** Medicare tax rate (employee portion) */
const MEDICARE_RATE = new Decimal('0.0145');
/** Additional Medicare tax rate */
const ADDITIONAL_MEDICARE_RATE = new Decimal('0.009');
/** Additional Medicare threshold (MFJ) */
const ADDITIONAL_MEDICARE_THRESHOLD = new Decimal(250_000);

/** AMT exemption amount (2026 estimate, MFJ) */
const AMT_EXEMPTION_MFJ = new Decimal(133_300);
const AMT_EXEMPTION_SINGLE = new Decimal(85_700);

/** AMT rates */
const AMT_RATE_26 = new Decimal('0.26');
const AMT_RATE_28 = new Decimal('0.28');
/** AMT 28% bracket threshold */
const AMT_28_THRESHOLD = new Decimal(232_600);

/** AMT exemption phaseout thresholds (2026 estimates) */
const AMT_PHASEOUT_MFJ = new Decimal(1_218_700);
const AMT_PHASEOUT_SINGLE = new Decimal(609_350);

/** Federal LTCG rate for high earners */
const FEDERAL_LTCG_RATE = new Decimal('0.20');

/** NIIT rate */
const NIIT_RATE = new Decimal('0.038');

/** SS wage base (2026 estimate) */
const DEFAULT_SS_WAGE_BASE = new Decimal(176_100);

// ---------------------------------------------------------------------------
// RSU Vesting Tax
// ---------------------------------------------------------------------------

/**
 * Calculate the tax impact of an RSU vesting event.
 *
 * RSU vesting is treated as ordinary (W-2) income at the FMV on vest date.
 * Employers typically withhold via "sell to cover" — selling shares to cover
 * taxes, delivering remaining shares net.
 *
 * @param shares            - Number of shares vesting
 * @param fmvPerShare       - Fair market value per share on vest date
 * @param federalRate       - Marginal federal income tax rate (e.g. 0.35)
 * @param stateRate         - State income tax rate (e.g. 0.093)
 * @param withholdingMethod - 'supplemental' (flat 22%/37%) or 'aggregate' (uses marginalRate)
 */
export function calculateRSUVestTax(
  shares: number,
  fmvPerShare: number,
  federalRate: number,
  stateRate: number,
  withholdingMethod: 'supplemental' | 'aggregate' = 'supplemental',
): RSUVestTaxResult {
  const sharesDec = new Decimal(shares);
  const fmv = new Decimal(fmvPerShare);
  const fedRate = new Decimal(federalRate);
  const stRate = new Decimal(stateRate);

  // ------------------------------------------------------------------
  // 1. Ordinary income = shares * FMV
  // ------------------------------------------------------------------
  const ordinaryIncome = sharesDec.mul(fmv);

  // ------------------------------------------------------------------
  // 2. Federal withholding
  // ------------------------------------------------------------------
  let federalWithholding: Decimal;
  if (withholdingMethod === 'supplemental') {
    // Standard supplemental rate; over $1M portion at 37%
    const threshold = new Decimal(1_000_000);
    if (ordinaryIncome.lte(threshold)) {
      federalWithholding = ordinaryIncome.mul(SUPPLEMENTAL_FED_RATE);
    } else {
      const underMillion = threshold.mul(SUPPLEMENTAL_FED_RATE);
      const overMillion = ordinaryIncome.minus(threshold).mul(SUPPLEMENTAL_FED_RATE_OVER_1M);
      federalWithholding = underMillion.plus(overMillion);
    }
  } else {
    // Aggregate method: use the provided marginal rate
    federalWithholding = ordinaryIncome.mul(fedRate);
  }

  // ------------------------------------------------------------------
  // 3. FICA withholding (SS + Medicare)
  //    Assumes employer handles SS wage base externally; we calculate
  //    Medicare (always applies) + SS (if under wage base).
  //    For simplicity, apply both to full amount.
  // ------------------------------------------------------------------
  const ssTax = ordinaryIncome.mul(SS_RATE);
  const medicareTax = ordinaryIncome.mul(MEDICARE_RATE);
  const ficaWithholding = ssTax.plus(medicareTax);

  // ------------------------------------------------------------------
  // 4. State withholding
  // ------------------------------------------------------------------
  const stateWithholding = ordinaryIncome.mul(stRate);

  // ------------------------------------------------------------------
  // 5. Total withholding and net shares delivered
  // ------------------------------------------------------------------
  const totalWithholding = federalWithholding.plus(ficaWithholding).plus(stateWithholding);
  const sharesWithheld = fmv.gt(0)
    ? totalWithholding.div(fmv).ceil()
    : new Decimal(0);
  const netShares = Decimal.max(sharesDec.minus(sharesWithheld), 0);
  const netCashValue = netShares.mul(fmv);

  return {
    sharesVesting: shares,
    fmvPerShare,
    ordinaryIncome: ordinaryIncome.toNumber(),
    federalWithholding: federalWithholding.toNumber(),
    ficaWithholding: ficaWithholding.toNumber(),
    stateWithholding: stateWithholding.toNumber(),
    netSharesDelivered: netShares.toNumber(),
    netCashValue: netCashValue.toNumber(),
  };
}

// ---------------------------------------------------------------------------
// NQSO Exercise Tax
// ---------------------------------------------------------------------------

/**
 * Calculate the tax impact of exercising non-qualified stock options.
 *
 * The spread (FMV - exercise price) is treated as W-2 ordinary income,
 * subject to federal income tax, FICA (SS + Medicare), and state income tax.
 *
 * @param shares        - Number of shares exercised
 * @param exercisePrice - Exercise (strike) price per share
 * @param fmv           - Current fair market value per share
 * @param federalRate   - Marginal federal income tax rate
 * @param stateRate     - State income tax rate
 * @param ssWageBase    - Social Security wage base for the year
 * @param ytdWages      - Year-to-date W-2 wages before this exercise
 */
export function calculateNQSOExercise(
  shares: number,
  exercisePrice: number,
  fmv: number,
  federalRate: number,
  stateRate: number,
  ssWageBase: number = DEFAULT_SS_WAGE_BASE.toNumber(),
  ytdWages: number = 0,
): NQSOExerciseResult {
  const sharesDec = new Decimal(shares);
  const strike = new Decimal(exercisePrice);
  const currentFMV = new Decimal(fmv);
  const fedRate = new Decimal(federalRate);
  const stRate = new Decimal(stateRate);
  const wageCap = new Decimal(ssWageBase);
  const ytd = new Decimal(ytdWages);

  // ------------------------------------------------------------------
  // 1. Spread = FMV - exercise price
  // ------------------------------------------------------------------
  const spreadPerShare = Decimal.max(currentFMV.minus(strike), 0);
  const grossOrdinaryIncome = sharesDec.mul(spreadPerShare);

  // ------------------------------------------------------------------
  // 2. Federal income tax
  // ------------------------------------------------------------------
  const federalTax = grossOrdinaryIncome.mul(fedRate);

  // ------------------------------------------------------------------
  // 3. FICA
  //    SS: only on income up to wage base less YTD wages
  //    Medicare: on all income (+ additional Medicare if over threshold)
  // ------------------------------------------------------------------
  const ssRoom = Decimal.max(wageCap.minus(ytd), 0);
  const ssTaxableAmount = Decimal.min(grossOrdinaryIncome, ssRoom);
  const ssTax = ssTaxableAmount.mul(SS_RATE);

  const medicareTax = grossOrdinaryIncome.mul(MEDICARE_RATE);

  // Additional Medicare tax if total wages exceed threshold
  const totalWages = ytd.plus(grossOrdinaryIncome);
  const additionalMedicareBase = Decimal.max(
    totalWages.minus(ADDITIONAL_MEDICARE_THRESHOLD),
    0,
  );
  const additionalMedicareTax = Decimal.min(
    additionalMedicareBase,
    grossOrdinaryIncome,
  ).mul(ADDITIONAL_MEDICARE_RATE);

  const ficaTax = ssTax.plus(medicareTax).plus(additionalMedicareTax);

  // ------------------------------------------------------------------
  // 4. State income tax
  // ------------------------------------------------------------------
  const stateTax = grossOrdinaryIncome.mul(stRate);

  // ------------------------------------------------------------------
  // 5. Net after tax
  // ------------------------------------------------------------------
  const totalTax = federalTax.plus(ficaTax).plus(stateTax);
  const totalValue = sharesDec.mul(currentFMV);
  const exerciseCost = sharesDec.mul(strike);
  const netAfterTax = totalValue.minus(exerciseCost).minus(totalTax);

  return {
    sharesExercised: shares,
    exercisePrice,
    currentFMV: fmv,
    spreadPerShare: spreadPerShare.toNumber(),
    grossOrdinaryIncome: grossOrdinaryIncome.toNumber(),
    federalTax: federalTax.toNumber(),
    ficaTax: ficaTax.toNumber(),
    stateTax: stateTax.toNumber(),
    netAfterTax: netAfterTax.toNumber(),
  };
}

// ---------------------------------------------------------------------------
// ISO Exercise AMT Impact
// ---------------------------------------------------------------------------

/**
 * Calculate the AMT impact of exercising incentive stock options.
 *
 * The spread on ISO exercise is an AMT preference item. If the AMT exceeds
 * regular tax, the taxpayer owes the difference. Provides analysis of both
 * qualifying and disqualifying dispositions.
 *
 * @param shares       - Number of shares exercised
 * @param exercisePrice - Exercise (strike) price per share
 * @param fmv          - Current FMV per share
 * @param grantDate    - Date the ISO was granted
 * @param otherIncome  - Other taxable income for the year
 * @param filingStatus - Tax filing status
 */
export function calculateISOExercise(
  shares: number,
  exercisePrice: number,
  fmv: number,
  grantDate: Date,
  otherIncome: number,
  filingStatus: string,
): ISOExerciseResult {
  const sharesDec = new Decimal(shares);
  const strike = new Decimal(exercisePrice);
  const currentFMV = new Decimal(fmv);
  const other = new Decimal(otherIncome);

  // ------------------------------------------------------------------
  // 1. Spread and AMT preference item
  // ------------------------------------------------------------------
  const spreadPerShare = Decimal.max(currentFMV.minus(strike), 0);
  const amtPreferenceItem = sharesDec.mul(spreadPerShare);

  // ------------------------------------------------------------------
  // 2. Estimate AMT
  //    AMTI = other income + AMT preference item
  //    Less: AMT exemption (subject to phaseout)
  //    Tax at 26%/28% rates
  // ------------------------------------------------------------------
  const isMFJ = filingStatus === 'mfj' || filingStatus === 'qw';
  const exemptionBase = isMFJ ? AMT_EXEMPTION_MFJ : AMT_EXEMPTION_SINGLE;
  const phaseoutStart = isMFJ ? AMT_PHASEOUT_MFJ : AMT_PHASEOUT_SINGLE;

  const amti = other.plus(amtPreferenceItem);

  // Phaseout: exemption reduced by 25% of AMTI over phaseout threshold
  const excessOverPhaseout = Decimal.max(amti.minus(phaseoutStart), 0);
  const exemptionReduction = excessOverPhaseout.mul('0.25');
  const effectiveExemption = Decimal.max(exemptionBase.minus(exemptionReduction), 0);

  const amtTaxableIncome = Decimal.max(amti.minus(effectiveExemption), 0);

  // Apply AMT rates: 26% on first portion, 28% on excess
  let amtTax: Decimal;
  if (amtTaxableIncome.lte(AMT_28_THRESHOLD)) {
    amtTax = amtTaxableIncome.mul(AMT_RATE_26);
  } else {
    const tier1 = AMT_28_THRESHOLD.mul(AMT_RATE_26);
    const tier2 = amtTaxableIncome.minus(AMT_28_THRESHOLD).mul(AMT_RATE_28);
    amtTax = tier1.plus(tier2);
  }

  // Regular tax estimate (simplified: marginal rate on other income)
  // Use bracket approximation
  const regularTax = other.mul('0.32'); // Approximate effective rate
  const estimatedAMT = Decimal.max(amtTax.minus(regularTax), 0);

  // ------------------------------------------------------------------
  // 3. Qualifying disposition date
  //    Must hold > 2 years from grant date AND > 1 year from exercise date
  // ------------------------------------------------------------------
  const exerciseDate = new Date();
  const twoYearsFromGrant = new Date(grantDate);
  twoYearsFromGrant.setFullYear(twoYearsFromGrant.getFullYear() + 2);

  const oneYearFromExercise = new Date(exerciseDate);
  oneYearFromExercise.setFullYear(oneYearFromExercise.getFullYear() + 1);

  const qualifyingDispositionDate = twoYearsFromGrant > oneYearFromExercise
    ? twoYearsFromGrant
    : oneYearFromExercise;

  // ------------------------------------------------------------------
  // 4. Qualifying disposition treatment
  //    Entire gain (FMV at sale - exercise price) is LTCG
  // ------------------------------------------------------------------
  const totalGainQualifying = sharesDec.mul(spreadPerShare);
  const qualifyingTax = totalGainQualifying.mul(FEDERAL_LTCG_RATE.plus(NIIT_RATE));

  // ------------------------------------------------------------------
  // 5. Disqualifying disposition treatment
  //    Ordinary income = lesser of: (a) spread at exercise, (b) actual gain
  //    Any additional gain is LTCG/STCG depending on holding period
  // ------------------------------------------------------------------
  const ordinaryPortion = sharesDec.mul(spreadPerShare);
  const ltcgPortion = new Decimal(0); // No additional gain assumed at exercise price
  const disqualifyingOrdinaryTax = ordinaryPortion.mul('0.37');
  const disqualifyingLtcgTax = ltcgPortion.mul(FEDERAL_LTCG_RATE);
  const disqualifyingTotalTax = disqualifyingOrdinaryTax.plus(disqualifyingLtcgTax);

  return {
    sharesExercised: shares,
    exercisePrice,
    currentFMV: fmv,
    spreadPerShare: spreadPerShare.toNumber(),
    amtPreferenceItem: amtPreferenceItem.toNumber(),
    estimatedAMT: estimatedAMT.toNumber(),
    qualifyingDispositionDate,
    qualifyingTreatment: {
      totalGain: totalGainQualifying.toNumber(),
      allLTCG: true,
      tax: qualifyingTax.toNumber(),
    },
    disqualifyingTreatment: {
      ordinaryPortion: ordinaryPortion.toNumber(),
      ltcgPortion: ltcgPortion.toNumber(),
      tax: disqualifyingTotalTax.toNumber(),
    },
  };
}

// ---------------------------------------------------------------------------
// ESPP Tax Treatment
// ---------------------------------------------------------------------------

/**
 * Calculate ESPP tax treatment for both qualifying and disqualifying dispositions.
 *
 * @param purchasePrice   - Per-share purchase price (after discount)
 * @param fmvAtOffering   - FMV at beginning of offering period
 * @param fmvAtPurchase   - FMV at purchase date
 * @param fmvAtSale       - FMV at sale date
 * @param shares          - Number of shares
 * @param offeringDate    - Start of offering period
 * @param purchaseDate    - Date shares were purchased
 * @param federalRate     - Marginal federal rate
 * @param ltcgRate        - Long-term capital gains rate
 */
export function calculateESPPTax(
  purchasePrice: number,
  fmvAtOffering: number,
  fmvAtPurchase: number,
  fmvAtSale: number,
  shares: number,
  offeringDate: Date,
  purchaseDate: Date,
  federalRate: number,
  ltcgRate: number,
): ESPPTaxResult {
  const price = new Decimal(purchasePrice);
  const fmvOffering = new Decimal(fmvAtOffering);
  const fmvPurchase = new Decimal(fmvAtPurchase);
  const fmvSale = new Decimal(fmvAtSale);
  const sharesDec = new Decimal(shares);
  const fedRate = new Decimal(federalRate);
  const cgRate = new Decimal(ltcgRate);

  const totalCost = price.mul(sharesDec);

  // Discount amount per share
  const discount = fmvPurchase.minus(price);

  // ------------------------------------------------------------------
  // Qualifying disposition:
  // Must hold > 2 years from offering date AND > 1 year from purchase date.
  // Ordinary income = lesser of:
  //   (a) discount at purchase (FMV at purchase - purchase price)
  //   (b) actual gain (sale price - purchase price)
  // Remainder is LTCG
  // ------------------------------------------------------------------
  const actualGainPerShare = fmvSale.minus(price);
  const offeringDiscount = fmvOffering.mul('0.15'); // Standard 15% ESPP discount
  const qualOrdinaryPerShare = Decimal.min(
    Decimal.min(discount, offeringDiscount),
    Decimal.max(actualGainPerShare, 0),
  );
  const qualOrdinary = qualOrdinaryPerShare.mul(sharesDec);
  const qualLTCG = Decimal.max(
    actualGainPerShare.minus(qualOrdinaryPerShare),
    0,
  ).mul(sharesDec);
  const qualTax = qualOrdinary.mul(fedRate).plus(qualLTCG.mul(cgRate));

  // ------------------------------------------------------------------
  // Disqualifying disposition:
  // Ordinary income = spread at purchase (FMV at purchase - purchase price)
  // Remainder is STCG or LTCG depending on holding period
  // ------------------------------------------------------------------
  const disqualOrdinary = discount.mul(sharesDec);
  const additionalGain = Decimal.max(fmvSale.minus(fmvPurchase), 0).mul(sharesDec);
  const disqualCGTax = additionalGain.mul(cgRate);
  const disqualOrdTax = disqualOrdinary.mul(fedRate);
  const disqualTotalTax = disqualOrdTax.plus(disqualCGTax);

  return {
    purchasePrice: purchasePrice,
    fmvAtPurchase: fmvAtPurchase,
    fmvAtSale: fmvAtSale,
    sharesAcquired: shares,
    totalCost: totalCost.toNumber(),
    qualifyingDisposition: {
      ordinaryIncome: qualOrdinary.toNumber(),
      ltcg: qualLTCG.toNumber(),
      totalTax: qualTax.toNumber(),
    },
    disqualifyingDisposition: {
      ordinaryIncome: disqualOrdinary.toNumber(),
      stcgOrLtcg: additionalGain.toNumber(),
      totalTax: disqualTotalTax.toNumber(),
    },
  };
}

// ---------------------------------------------------------------------------
// Concentrated Position Analysis
// ---------------------------------------------------------------------------

/**
 * Analyze a concentrated equity position.
 *
 * Calculates concentration risk metrics including portfolio percentage,
 * downside scenarios, and liquidation tax impact.
 *
 * @param value          - Current market value of the concentrated position
 * @param basis          - Cost basis of the position
 * @param totalPortfolio - Total portfolio value (including the concentrated position)
 * @param annualDividend - Annual dividend income from the position
 */
export function analyzeConcentratedPosition(
  value: number,
  basis: number,
  totalPortfolio: number,
  annualDividend: number,
): ConcentratedPositionAnalysis {
  const valueDec = new Decimal(value);
  const basisDec = new Decimal(basis);
  const portfolio = new Decimal(totalPortfolio);
  const dividend = new Decimal(annualDividend);

  // ------------------------------------------------------------------
  // 1. Position metrics
  // ------------------------------------------------------------------
  const pctOfPortfolio = portfolio.gt(0)
    ? valueDec.div(portfolio).mul(100).toNumber()
    : 0;

  const unrealizedGain = Decimal.max(valueDec.minus(basisDec), 0);

  // ------------------------------------------------------------------
  // 2. Downside scenarios
  // ------------------------------------------------------------------
  const if50Drop = valueDec.mul('0.50');
  const if75Drop = valueDec.mul('0.25');

  // ------------------------------------------------------------------
  // 3. Outright sale tax impact
  //    Federal LTCG (20%) + NIIT (3.8%) on the gain
  // ------------------------------------------------------------------
  const combinedCGRate = FEDERAL_LTCG_RATE.plus(NIIT_RATE);
  const outrightSaleTax = unrealizedGain.mul(combinedCGRate);
  const outrightSaleNetProceeds = valueDec.minus(outrightSaleTax);

  return {
    currentValue: valueDec.toNumber(),
    pctOfPortfolio,
    unrealizedGain: unrealizedGain.toNumber(),
    if50Drop: if50Drop.toNumber(),
    if75Drop: if75Drop.toNumber(),
    outrightSaleTax: outrightSaleTax.toNumber(),
    outrightSaleNetProceeds: outrightSaleNetProceeds.toNumber(),
  };
}
