/**
 * Extended estate planning calculations.
 * Pure functions — no side effects, no DB calls.
 *
 * Handles:
 *   - Full estate tax worksheet (gross estate through net estate tax)
 *   - Portability (DSUE — deceased spousal unused exemption)
 *   - GRAT remainder interest calculation (using 7520 rate)
 *   - CRT/CRAT deduction calculation (actuarial value of remainder interest)
 *   - CLAT/CLUT projected remainder calculation
 *   - Scenario comparison: no planning vs marital deduction vs credit shelter
 *     vs charitable trust vs ILIT
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

export interface EstateCalcInput {
  grossEstate: number;
  adjustedTaxableGifts: number;
  maritalDeduction: number;
  charitableDeduction: number;
  debts: number;
  expenses: number;
  stateEstateTaxApplicable: boolean;
  state: string;
  lifeInsuranceProceedsIncluded: boolean;
  year: number;
  exemptionAmount: number;
  topRate: number;
  portabilityElected: boolean;
  predeceasedSpouseUnusedExemption: number;
}

export interface EstateCalcResult {
  grossEstate: number;
  maritalDeduction: number;
  charitableDeduction: number;
  debtsAndExpenses: number;
  adjustedGrossEstate: number;
  adjustedTaxableGifts: number;
  tentativeTaxBase: number;
  tentativeTax: number;
  applicableCredit: number;
  giftTaxesPaid: number;
  netEstateTax: number;
  stateEstateTax: number;
  totalTransferTax: number;
  netToHeirs: number;
  effectiveRate: number;
}

export interface GRATResult {
  initialTransfer: number;
  annuityPayment: number;
  term: number;
  rate7520: number;
  annuityFactor: number;
  retainedInterest: number;
  remainderInterest: number;
  giftTaxableAmount: number;
  projectedEndValue: number;
  projectedTransferToRemaindermen: number;
  wealthTransferred: number;
  estateTaxSavings: number;
}

export interface CRTResult {
  fmv: number;
  payoutRate: number;
  termYears: number;
  rate7520: number;
  type: 'crut' | 'crat';
  annuityOrUnitrust: number;
  presentValueOfIncome: number;
  remainderInterest: number;
  charitableDeduction: number;
  deductionPct: number;
}

export interface CLATResult {
  annuityAmount: number;
  termYears: number;
  rate7520: number;
  presentValueOfAnnuity: number;
  giftTaxableRemainder: number;
  projectedEndValue: number;
  projectedRemainderToFamily: number;
  transferTaxSavings: number;
}

export interface EstateScenarioComparison {
  noPlanning: EstateCalcResult;
  maritalDeduction: EstateCalcResult;
  creditShelter: EstateCalcResult & { creditShelterAmount: number; maritalAmount: number };
  charitableTrust: EstateCalcResult & { charitableDeductionUsed: number };
  ilit: EstateCalcResult & { insuranceRemovedFromEstate: number };
  summary: {
    scenario: string;
    netToHeirs: number;
    totalTax: number;
    taxSavingsVsNoPlan: number;
  }[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Compute the tentative tax on a given amount using the estate tax rate
 * schedule.
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

/**
 * Simplified state estate tax calculation.
 * Many states have their own exemption amounts, typically lower than federal.
 * This uses a simplified flat-rate approach for estimation.
 */
function computeStateEstateTax(
  adjustedGrossEstate: Decimal,
  state: string,
): Decimal {
  // State estate tax exemptions and rates (simplified)
  const STATE_ESTATE_TAX: Record<string, { exemption: number; rate: number }> = {
    CT: { exemption: 13_610_000, rate: 0.12 },
    DC: { exemption: 4_710_800, rate: 0.16 },
    HI: { exemption: 5_490_000, rate: 0.20 },
    IL: { exemption: 4_000_000, rate: 0.16 },
    MA: { exemption: 2_000_000, rate: 0.16 },
    MD: { exemption: 5_000_000, rate: 0.16 },
    ME: { exemption: 6_800_000, rate: 0.12 },
    MN: { exemption: 3_000_000, rate: 0.16 },
    NY: { exemption: 6_940_000, rate: 0.16 },
    OR: { exemption: 1_000_000, rate: 0.16 },
    RI: { exemption: 1_774_583, rate: 0.16 },
    VT: { exemption: 5_000_000, rate: 0.16 },
    WA: { exemption: 2_193_000, rate: 0.20 },
  };

  const config = STATE_ESTATE_TAX[state.toUpperCase()];
  if (!config) return new Decimal(0);

  const exemption = new Decimal(config.exemption);
  const taxableAmount = Decimal.max(adjustedGrossEstate.minus(exemption), 0);
  return taxableAmount.mul(config.rate);
}

/**
 * Present value of an annuity factor.
 * PV = (1 - (1 + r)^-n) / r
 */
function pvAnnuityFactor(rate: Decimal, periods: Decimal): Decimal {
  if (rate.isZero()) return periods;
  const onePlusR = rate.plus(1);
  return new Decimal(1).minus(onePlusR.pow(periods.neg())).div(rate);
}

// ---------------------------------------------------------------------------
// Main calculations
// ---------------------------------------------------------------------------

/**
 * Calculate the full estate tax worksheet.
 *
 * Steps:
 *   1. Gross estate
 *   2. Less: marital deduction, charitable deduction, debts & expenses
 *   3. Adjusted gross estate
 *   4. Add adjusted taxable gifts
 *   5. Tentative tax base
 *   6. Tentative tax (rate schedule)
 *   7. Less: applicable credit (tax on exemption amount + portability)
 *   8. Less: gift taxes paid (tentative tax on gifts)
 *   9. Net estate tax
 *  10. State estate tax
 */
export function calculateFullEstateTax(input: EstateCalcInput): EstateCalcResult {
  const gross = new Decimal(input.grossEstate);
  const marital = new Decimal(input.maritalDeduction);
  const charitable = new Decimal(input.charitableDeduction);
  const debts = new Decimal(input.debts);
  const expenses = new Decimal(input.expenses);
  const gifts = new Decimal(input.adjustedTaxableGifts);

  // Effective exemption includes portability (DSUE)
  let exemption = new Decimal(input.exemptionAmount);
  if (input.portabilityElected) {
    const dsue = new Decimal(input.predeceasedSpouseUnusedExemption);
    exemption = exemption.plus(dsue);
  }

  // ------------------------------------------------------------------
  // 1-3. Adjusted gross estate
  // ------------------------------------------------------------------
  const debtsAndExpenses = debts.plus(expenses);
  const totalDeductions = marital.plus(charitable).plus(debtsAndExpenses);
  const adjustedGrossEstate = Decimal.max(gross.minus(totalDeductions), 0);

  // ------------------------------------------------------------------
  // 4-5. Tentative tax base
  // ------------------------------------------------------------------
  const tentativeTaxBase = adjustedGrossEstate.plus(gifts);

  // ------------------------------------------------------------------
  // 6. Tentative tax on the combined base
  // ------------------------------------------------------------------
  const tentativeTaxOnBase = computeTentativeTax(tentativeTaxBase);

  // ------------------------------------------------------------------
  // 7. Applicable credit = tax on the exemption amount
  // ------------------------------------------------------------------
  const applicableCredit = computeTentativeTax(exemption);

  // ------------------------------------------------------------------
  // 8. Gift taxes paid = tentative tax on adjusted taxable gifts
  //    (credit for taxes already paid on lifetime gifts)
  // ------------------------------------------------------------------
  const giftTaxesPaid = computeTentativeTax(gifts);

  // ------------------------------------------------------------------
  // 9. Net estate tax
  // ------------------------------------------------------------------
  const netEstateTax = Decimal.max(
    tentativeTaxOnBase.minus(applicableCredit).minus(giftTaxesPaid),
    0,
  );

  // ------------------------------------------------------------------
  // 10. State estate tax
  // ------------------------------------------------------------------
  let stateEstateTax = new Decimal(0);
  if (input.stateEstateTaxApplicable) {
    stateEstateTax = computeStateEstateTax(adjustedGrossEstate, input.state);
  }

  // ------------------------------------------------------------------
  // Totals
  // ------------------------------------------------------------------
  const totalTransferTax = netEstateTax.plus(stateEstateTax);
  const netToHeirs = gross.minus(debtsAndExpenses).minus(totalTransferTax);
  const effectiveRate = gross.gt(0)
    ? totalTransferTax.div(gross).toNumber()
    : 0;

  return {
    grossEstate: gross.toNumber(),
    maritalDeduction: marital.toNumber(),
    charitableDeduction: charitable.toNumber(),
    debtsAndExpenses: debtsAndExpenses.toNumber(),
    adjustedGrossEstate: adjustedGrossEstate.toNumber(),
    adjustedTaxableGifts: gifts.toNumber(),
    tentativeTaxBase: tentativeTaxBase.toNumber(),
    tentativeTax: tentativeTaxOnBase.toNumber(),
    applicableCredit: applicableCredit.toNumber(),
    giftTaxesPaid: giftTaxesPaid.toNumber(),
    netEstateTax: netEstateTax.toNumber(),
    stateEstateTax: stateEstateTax.toNumber(),
    totalTransferTax: totalTransferTax.toNumber(),
    netToHeirs: netToHeirs.toNumber(),
    effectiveRate,
  };
}

/**
 * Calculate GRAT remainder interest.
 *
 * A Grantor Retained Annuity Trust pays the grantor a fixed annuity for a term
 * of years. The remainder passes to beneficiaries. The gift value (remainder
 * interest) is the initial transfer minus the present value of the retained
 * annuity, discounted at the 7520 rate.
 *
 * @param initialTransfer - Amount transferred into the GRAT
 * @param term            - Number of years for the annuity term
 * @param rate7520        - IRS Section 7520 rate (e.g. 0.052 for 5.2%)
 * @param expectedGrowth  - Expected annual growth rate of GRAT assets
 */
export function calculateGRATRemainder(
  initialTransfer: number,
  term: number,
  rate7520: number,
  expectedGrowth: number,
): GRATResult {
  const transfer = new Decimal(initialTransfer);
  const r7520 = new Decimal(rate7520);
  const growth = new Decimal(expectedGrowth);
  const t = new Decimal(term);

  // ------------------------------------------------------------------
  // 1. Annuity factor = PV of $1/yr annuity at 7520 rate for term years
  // ------------------------------------------------------------------
  const annuityFactor = pvAnnuityFactor(r7520, t);

  // ------------------------------------------------------------------
  // 2. Annuity payment = transfer / annuityFactor (zeroed-out GRAT)
  //    For a zeroed-out GRAT, the annuity PV equals the transfer,
  //    minimizing the gift taxable amount.
  // ------------------------------------------------------------------
  const annuityPayment = transfer.div(annuityFactor);

  // ------------------------------------------------------------------
  // 3. Retained interest (PV of the annuity stream at 7520 rate)
  // ------------------------------------------------------------------
  const retainedInterest = annuityPayment.mul(annuityFactor);

  // ------------------------------------------------------------------
  // 4. Remainder interest (gift taxable amount)
  // ------------------------------------------------------------------
  const remainderInterest = Decimal.max(transfer.minus(retainedInterest), 0);

  // ------------------------------------------------------------------
  // 5. Project actual end value using expected growth
  //    Simulate year by year: start with transfer, grow, pay annuity
  // ------------------------------------------------------------------
  let balance = transfer;
  for (let yr = 0; yr < term; yr++) {
    balance = balance.mul(growth.plus(1)).minus(annuityPayment);
    if (balance.lt(0)) {
      balance = new Decimal(0);
      break;
    }
  }

  const projectedEndValue = Decimal.max(balance, 0);

  // ------------------------------------------------------------------
  // 6. Wealth transferred = projected end value (what goes to remaindermen)
  // ------------------------------------------------------------------
  const wealthTransferred = projectedEndValue;

  // ------------------------------------------------------------------
  // 7. Estate tax savings = transfer tax that would apply if held in estate
  //    Approximate at 40% top rate on the wealth transferred
  // ------------------------------------------------------------------
  const estateTaxSavings = wealthTransferred.mul('0.40');

  return {
    initialTransfer: transfer.toNumber(),
    annuityPayment: annuityPayment.toNumber(),
    term,
    rate7520,
    annuityFactor: annuityFactor.toNumber(),
    retainedInterest: retainedInterest.toNumber(),
    remainderInterest: remainderInterest.toNumber(),
    giftTaxableAmount: remainderInterest.toNumber(),
    projectedEndValue: projectedEndValue.toNumber(),
    projectedTransferToRemaindermen: wealthTransferred.toNumber(),
    wealthTransferred: wealthTransferred.toNumber(),
    estateTaxSavings: estateTaxSavings.toNumber(),
  };
}

/**
 * Calculate CRT (Charitable Remainder Trust) deduction.
 *
 * Determines the actuarial value of the remainder interest that will pass
 * to charity, which is the donor's charitable deduction.
 *
 * CRAT: fixed annuity based on initial FMV
 * CRUT: unitrust payment recalculated annually on revalued trust assets
 *
 * @param fmv         - Fair market value of property transferred
 * @param payoutRate  - Annual payout rate (e.g. 0.05 for 5%)
 * @param termYears   - Trust term in years
 * @param rate7520    - IRS Section 7520 rate
 * @param type        - 'crut' or 'crat'
 */
export function calculateCRTDeduction(
  fmv: number,
  payoutRate: number,
  termYears: number,
  rate7520: number,
  type: 'crut' | 'crat',
): CRTResult {
  const fmvDec = new Decimal(fmv);
  const payout = new Decimal(payoutRate);
  const r7520 = new Decimal(rate7520);
  const t = new Decimal(termYears);

  let presentValueOfIncome: Decimal;
  let annuityOrUnitrust: Decimal;

  if (type === 'crat') {
    // ------------------------------------------------------------------
    // CRAT: fixed annuity = FMV * payoutRate
    // PV of income stream = annuity * PV annuity factor at 7520 rate
    // ------------------------------------------------------------------
    annuityOrUnitrust = fmvDec.mul(payout);
    const pvFactor = pvAnnuityFactor(r7520, t);
    presentValueOfIncome = annuityOrUnitrust.mul(pvFactor);
  } else {
    // ------------------------------------------------------------------
    // CRUT: unitrust amount = FMV * payoutRate (first year)
    // The PV factor for a CRUT uses an adjusted discount rate:
    //   adjusted rate = (1 + 7520) / (1 - payoutRate) - 1
    // PV of income = FMV * [1 - ((1 - payout) / (1 + 7520))^n]
    // ------------------------------------------------------------------
    annuityOrUnitrust = fmvDec.mul(payout);
    const growthFactor = new Decimal(1).minus(payout).div(r7520.plus(1));
    const remainderFactor = growthFactor.pow(t);
    presentValueOfIncome = fmvDec.mul(new Decimal(1).minus(remainderFactor));
  }

  // ------------------------------------------------------------------
  // Remainder interest = FMV - PV of income stream
  // ------------------------------------------------------------------
  const remainderInterest = Decimal.max(fmvDec.minus(presentValueOfIncome), 0);
  const charitableDeduction = remainderInterest;
  const deductionPct = fmvDec.gt(0)
    ? remainderInterest.div(fmvDec).toNumber()
    : 0;

  return {
    fmv: fmvDec.toNumber(),
    payoutRate,
    termYears,
    rate7520,
    type,
    annuityOrUnitrust: annuityOrUnitrust.toNumber(),
    presentValueOfIncome: presentValueOfIncome.toNumber(),
    remainderInterest: remainderInterest.toNumber(),
    charitableDeduction: charitableDeduction.toNumber(),
    deductionPct,
  };
}

/**
 * Calculate CLAT (Charitable Lead Annuity Trust) projected remainder.
 *
 * A CLAT pays an annuity to charity for a term of years; the remainder
 * passes to family. The gift-taxable remainder is the initial transfer minus
 * the PV of the annuity stream at the 7520 rate.
 *
 * @param annuityAmount  - Annual annuity paid to charity
 * @param termYears      - Trust term in years
 * @param rate7520       - IRS Section 7520 rate
 * @param expectedGrowth - Expected annual growth rate of trust assets
 */
export function calculateCLATRemainder(
  annuityAmount: number,
  termYears: number,
  rate7520: number,
  expectedGrowth: number,
): CLATResult {
  const annuity = new Decimal(annuityAmount);
  const r7520 = new Decimal(rate7520);
  const growth = new Decimal(expectedGrowth);
  const t = new Decimal(termYears);

  // ------------------------------------------------------------------
  // 1. Present value of the annuity stream (charitable interest)
  // ------------------------------------------------------------------
  const pvFactor = pvAnnuityFactor(r7520, t);
  const pvAnnuity = annuity.mul(pvFactor);

  // ------------------------------------------------------------------
  // 2. Implied initial transfer (to achieve this annuity)
  //    In practice the initial transfer is what funds the trust.
  //    For this calc, we assume the trust is funded with enough to pay
  //    the annuity. The initial trust corpus = PV of annuity at the
  //    growth rate, but for gift tax purposes we use the 7520 rate.
  //    Typically: initial transfer ~ annuity * PV factor at growth rate
  //    For simplicity, assume initial transfer = annuity * term
  //    (or more realistically, the annuity / growth factor).
  // ------------------------------------------------------------------
  // We compute the implied initial trust value assuming the trust earns
  // the expected growth rate and pays the annuity each year.
  // Initial value = annuity * PV annuity factor at expected growth rate
  const impliedInitial = annuity.mul(pvAnnuityFactor(growth, t));

  // ------------------------------------------------------------------
  // 3. Gift-taxable remainder = initial transfer - PV of charitable annuity
  // ------------------------------------------------------------------
  const giftTaxableRemainder = Decimal.max(impliedInitial.minus(pvAnnuity), 0);

  // ------------------------------------------------------------------
  // 4. Project actual end value
  //    Start with implied initial, grow at expected rate, pay annuity
  // ------------------------------------------------------------------
  let balance = impliedInitial;
  for (let yr = 0; yr < termYears; yr++) {
    balance = balance.mul(growth.plus(1)).minus(annuity);
    if (balance.lt(0)) {
      balance = new Decimal(0);
      break;
    }
  }

  const projectedEndValue = Decimal.max(balance, 0);

  // ------------------------------------------------------------------
  // 5. Transfer tax savings = amount that passes to family minus what
  //    gift tax was assessed on (the remainder interest).
  //    If the trust outperforms the 7520 rate, the family gets more
  //    than the gift-tax value.
  // ------------------------------------------------------------------
  const transferTaxSavings = Decimal.max(
    projectedEndValue.minus(giftTaxableRemainder),
    0,
  ).mul('0.40');

  return {
    annuityAmount: annuity.toNumber(),
    termYears,
    rate7520,
    presentValueOfAnnuity: pvAnnuity.toNumber(),
    giftTaxableRemainder: giftTaxableRemainder.toNumber(),
    projectedEndValue: projectedEndValue.toNumber(),
    projectedRemainderToFamily: projectedEndValue.toNumber(),
    transferTaxSavings: transferTaxSavings.toNumber(),
  };
}

/**
 * Compare estate planning scenarios.
 *
 * Produces results for five strategies:
 *   1. No planning (baseline)
 *   2. Maximize marital deduction
 *   3. Credit shelter trust + marital
 *   4. Charitable trust (10% of estate to charity)
 *   5. ILIT (remove life insurance from estate)
 */
export function compareEstateScenarios(
  input: EstateCalcInput,
): EstateScenarioComparison {
  // ------------------------------------------------------------------
  // Scenario 1: No planning — no deductions used
  // ------------------------------------------------------------------
  const noPlanInput: EstateCalcInput = {
    ...input,
    maritalDeduction: 0,
    charitableDeduction: 0,
  };
  const noPlanning = calculateFullEstateTax(noPlanInput);

  // ------------------------------------------------------------------
  // Scenario 2: Maximize marital deduction
  // Passes everything to surviving spouse (defers tax to second death)
  // ------------------------------------------------------------------
  const gross = new Decimal(input.grossEstate);
  const debtsExp = new Decimal(input.debts).plus(input.expenses);
  const maxMarital = Decimal.max(gross.minus(debtsExp), 0);
  const maritalInput: EstateCalcInput = {
    ...input,
    maritalDeduction: maxMarital.toNumber(),
    charitableDeduction: 0,
  };
  const maritalDeduction = calculateFullEstateTax(maritalInput);

  // ------------------------------------------------------------------
  // Scenario 3: Credit shelter trust + marital
  // Fund credit shelter trust with exemption amount; remainder to marital
  // ------------------------------------------------------------------
  let effectiveExemption = new Decimal(input.exemptionAmount);
  if (input.portabilityElected) {
    effectiveExemption = effectiveExemption.plus(input.predeceasedSpouseUnusedExemption);
  }
  const creditShelterAmount = Decimal.min(effectiveExemption, maxMarital);
  const maritalAfterCST = Decimal.max(maxMarital.minus(creditShelterAmount), 0);
  const cstInput: EstateCalcInput = {
    ...input,
    maritalDeduction: maritalAfterCST.toNumber(),
    charitableDeduction: 0,
  };
  const creditShelterResult = calculateFullEstateTax(cstInput);
  const creditShelter = {
    ...creditShelterResult,
    creditShelterAmount: creditShelterAmount.toNumber(),
    maritalAmount: maritalAfterCST.toNumber(),
  };

  // ------------------------------------------------------------------
  // Scenario 4: Charitable trust (donate 10% of gross estate to charity)
  // ------------------------------------------------------------------
  const charitablePortion = gross.mul('0.10');
  const charitableInput: EstateCalcInput = {
    ...input,
    charitableDeduction: charitablePortion.toNumber(),
    maritalDeduction: input.maritalDeduction,
  };
  const charitableResult = calculateFullEstateTax(charitableInput);
  const charitableTrust = {
    ...charitableResult,
    charitableDeductionUsed: charitablePortion.toNumber(),
  };

  // ------------------------------------------------------------------
  // Scenario 5: ILIT — remove life insurance proceeds from estate
  // Assumes 30% of gross estate is life insurance (if included)
  // ------------------------------------------------------------------
  let insuranceRemoved = new Decimal(0);
  let ilitGross = gross;
  if (input.lifeInsuranceProceedsIncluded) {
    insuranceRemoved = gross.mul('0.30');
    ilitGross = gross.minus(insuranceRemoved);
  }
  const ilitInput: EstateCalcInput = {
    ...input,
    grossEstate: ilitGross.toNumber(),
    maritalDeduction: input.maritalDeduction,
  };
  const ilitResult = calculateFullEstateTax(ilitInput);
  const ilit = {
    ...ilitResult,
    insuranceRemovedFromEstate: insuranceRemoved.toNumber(),
  };

  // ------------------------------------------------------------------
  // Summary
  // ------------------------------------------------------------------
  const noPlanTax = noPlanning.totalTransferTax;
  const scenarios = [
    { scenario: 'No Planning', netToHeirs: noPlanning.netToHeirs, totalTax: noPlanning.totalTransferTax },
    { scenario: 'Marital Deduction', netToHeirs: maritalDeduction.netToHeirs, totalTax: maritalDeduction.totalTransferTax },
    { scenario: 'Credit Shelter Trust', netToHeirs: creditShelter.netToHeirs, totalTax: creditShelter.totalTransferTax },
    { scenario: 'Charitable Trust', netToHeirs: charitableTrust.netToHeirs, totalTax: charitableTrust.totalTransferTax },
    { scenario: 'ILIT', netToHeirs: ilit.netToHeirs, totalTax: ilit.totalTransferTax },
  ];

  const summary = scenarios.map((s) => ({
    ...s,
    taxSavingsVsNoPlan: new Decimal(noPlanTax).minus(s.totalTax).toNumber(),
  }));

  return {
    noPlanning,
    maritalDeduction,
    creditShelter,
    charitableTrust,
    ilit,
    summary,
  };
}
