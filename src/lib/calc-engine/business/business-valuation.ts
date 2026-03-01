/**
 * Business valuation and sale tax calculations.
 * Pure functions — no side effects, no DB calls.
 *
 * Handles:
 *   - EBITDA multiple method (normalized EBITDA with add-backs)
 *   - Revenue multiple method
 *   - DCF method (5-year projection with terminal value)
 *   - Blended valuation (weighted average of all three methods)
 *   - Business sale tax calculator (asset sale vs stock sale, installment sale)
 */

import Decimal from 'decimal.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BusinessValuationInput {
  grossRevenue: number;
  cogs: number;
  operatingExpenses: number;
  ownerSalary: number;
  marketRateReplacement: number;
  personalExpensesInBusiness: number;
  businessDebt: number;
  ownershipPct: number;
  ebitdaMultiple: number;
  revenueMultiple: number;
  dcfProjections: number[];
  terminalGrowthRate: number;
  discountRate: number;
  weights: { income: number; market: number; dcf: number };
}

export interface BusinessValuationResult {
  rawEBITDA: number;
  normalizedEBITDA: number;
  incomeApproachValue: number;
  marketApproachValue: number;
  dcfValue: number;
  blendedEnterpriseValue: number;
  equityValue100: number;
  clientEquityInterest: number;
}

export interface BusinessSaleInput {
  grossSalePrice: number;
  ownershipPct: number;
  entityType: string;
  basis: number;
  saleYear: number;
  otherIncomeInSaleYear: number;
  filingStatus: string;
  saleStructure: 'asset_sale' | 'stock_sale';
  stateCapGainsRate: number;
  transactionCostPct: number;
  debtPayoff: number;
  installmentElected: boolean;
  installmentTermYears: number;
  installmentRate: number;
}

export interface BusinessSaleResult {
  grossProceeds: number;
  basis: number;
  totalGain: number;
  federalCGTax: number;
  niitOnSale: number;
  stateTax: number;
  transactionCosts: number;
  debtPayoff: number;
  netProceeds: number;
  effectiveTaxRate: number;
  installmentSchedule?: Array<{
    year: number;
    payment: number;
    principalPortion: number;
    interestPortion: number;
    gainRecognized: number;
    taxDue: number;
  }>;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Federal long-term capital gains rate for high earners */
const FEDERAL_LTCG_RATE = new Decimal('0.20');

/** Net Investment Income Tax rate */
const NIIT_RATE = new Decimal('0.038');

/** NIIT threshold for MFJ */
const NIIT_THRESHOLD_MFJ = new Decimal(250_000);
const NIIT_THRESHOLD_SINGLE = new Decimal(200_000);

/** Asset sale ordinary income recapture rate (approximate for goodwill/intangibles) */
const ORDINARY_RECAPTURE_RATE = new Decimal('0.37');

/** Percentage of asset sale price allocated to ordinary recapture (depreciation, inventory) */
const ASSET_SALE_ORDINARY_PCT = new Decimal('0.15');

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function getNIITThreshold(filingStatus: string): Decimal {
  if (filingStatus === 'mfj' || filingStatus === 'qw') {
    return NIIT_THRESHOLD_MFJ;
  }
  return NIIT_THRESHOLD_SINGLE;
}

// ---------------------------------------------------------------------------
// Business Valuation
// ---------------------------------------------------------------------------

/**
 * Calculate business valuation using three approaches and produce a blended result.
 *
 * Income approach:  Normalized EBITDA * multiple
 * Market approach:  Gross revenue * revenue multiple
 * DCF approach:     PV of projected cash flows + terminal value
 *
 * The blended enterprise value is the weighted average of all three.
 * Equity value = enterprise value - business debt.
 * Client equity interest = equity value * ownership percentage.
 */
export function calculateBusinessValuation(
  input: BusinessValuationInput,
): BusinessValuationResult {
  const revenue = new Decimal(input.grossRevenue);
  const cogs = new Decimal(input.cogs);
  const opex = new Decimal(input.operatingExpenses);
  const ownerSalary = new Decimal(input.ownerSalary);
  const marketRate = new Decimal(input.marketRateReplacement);
  const personalExpenses = new Decimal(input.personalExpensesInBusiness);
  const debt = new Decimal(input.businessDebt);
  const ownershipPct = new Decimal(input.ownershipPct).div(100);
  const ebitdaMult = new Decimal(input.ebitdaMultiple);
  const revMult = new Decimal(input.revenueMultiple);
  const termGrowth = new Decimal(input.terminalGrowthRate);
  const discountRate = new Decimal(input.discountRate);

  // ------------------------------------------------------------------
  // 1. Income Approach — Normalized EBITDA * multiple
  // ------------------------------------------------------------------
  // Raw EBITDA = Revenue - COGS - Operating Expenses
  const rawEBITDA = revenue.minus(cogs).minus(opex);

  // Normalize: add back owner salary, personal expenses; subtract market rate
  const normalizedEBITDA = rawEBITDA
    .plus(ownerSalary)
    .plus(personalExpenses)
    .minus(marketRate);

  const incomeApproachValue = normalizedEBITDA.mul(ebitdaMult);

  // ------------------------------------------------------------------
  // 2. Market Approach — Revenue * revenue multiple
  // ------------------------------------------------------------------
  const marketApproachValue = revenue.mul(revMult);

  // ------------------------------------------------------------------
  // 3. DCF Approach — PV of projected cash flows + terminal value
  // ------------------------------------------------------------------
  let pvCashFlows = new Decimal(0);
  for (let i = 0; i < input.dcfProjections.length; i++) {
    const cf = new Decimal(input.dcfProjections[i]);
    const discountFactor = discountRate.plus(1).pow(i + 1);
    pvCashFlows = pvCashFlows.plus(cf.div(discountFactor));
  }

  // Terminal value = last projected CF * (1 + g) / (r - g)
  const lastCF = input.dcfProjections.length > 0
    ? new Decimal(input.dcfProjections[input.dcfProjections.length - 1])
    : normalizedEBITDA;

  let terminalValue = new Decimal(0);
  if (discountRate.gt(termGrowth)) {
    terminalValue = lastCF.mul(termGrowth.plus(1)).div(discountRate.minus(termGrowth));
  }

  // Discount terminal value back to present
  const terminalPV = terminalValue.div(
    discountRate.plus(1).pow(input.dcfProjections.length),
  );

  const dcfValue = pvCashFlows.plus(terminalPV);

  // ------------------------------------------------------------------
  // 4. Blended Enterprise Value
  // ------------------------------------------------------------------
  const wIncome = new Decimal(input.weights.income);
  const wMarket = new Decimal(input.weights.market);
  const wDCF = new Decimal(input.weights.dcf);
  const totalWeight = wIncome.plus(wMarket).plus(wDCF);

  const blendedEV = totalWeight.gt(0)
    ? incomeApproachValue.mul(wIncome)
        .plus(marketApproachValue.mul(wMarket))
        .plus(dcfValue.mul(wDCF))
        .div(totalWeight)
    : incomeApproachValue;

  // ------------------------------------------------------------------
  // 5. Equity Value = Enterprise Value - Debt
  // ------------------------------------------------------------------
  const equityValue100 = Decimal.max(blendedEV.minus(debt), 0);
  const clientEquityInterest = equityValue100.mul(ownershipPct);

  return {
    rawEBITDA: rawEBITDA.toNumber(),
    normalizedEBITDA: normalizedEBITDA.toNumber(),
    incomeApproachValue: incomeApproachValue.toNumber(),
    marketApproachValue: marketApproachValue.toNumber(),
    dcfValue: dcfValue.toNumber(),
    blendedEnterpriseValue: blendedEV.toNumber(),
    equityValue100: equityValue100.toNumber(),
    clientEquityInterest: clientEquityInterest.toNumber(),
  };
}

// ---------------------------------------------------------------------------
// Business Sale Tax
// ---------------------------------------------------------------------------

/**
 * Calculate the tax impact of selling a business.
 *
 * Handles:
 *   - Asset sale vs stock sale structure
 *   - Federal LTCG tax (20%)
 *   - NIIT (3.8% on high earners)
 *   - State capital gains tax
 *   - Ordinary income recapture on asset sales
 *   - Transaction costs and debt payoff
 *   - Installment sale deferral (if elected)
 */
export function calculateBusinessSaleTax(
  input: BusinessSaleInput,
): BusinessSaleResult {
  const grossPrice = new Decimal(input.grossSalePrice);
  const ownershipPct = new Decimal(input.ownershipPct).div(100);
  const basis = new Decimal(input.basis);
  const otherIncome = new Decimal(input.otherIncomeInSaleYear);
  const stateCGRate = new Decimal(input.stateCapGainsRate);
  const txCostPct = new Decimal(input.transactionCostPct);
  const debtPayoff = new Decimal(input.debtPayoff);
  const niitThreshold = getNIITThreshold(input.filingStatus);

  // ------------------------------------------------------------------
  // 1. Gross proceeds to the owner
  // ------------------------------------------------------------------
  const grossProceeds = grossPrice.mul(ownershipPct);
  const transactionCosts = grossProceeds.mul(txCostPct);
  const netSaleProceeds = grossProceeds.minus(transactionCosts);

  // ------------------------------------------------------------------
  // 2. Total gain
  // ------------------------------------------------------------------
  const totalGain = Decimal.max(netSaleProceeds.minus(basis), 0);

  // ------------------------------------------------------------------
  // 3. Federal tax computation
  // ------------------------------------------------------------------
  let federalCGTax: Decimal;
  let ordinaryRecapture = new Decimal(0);

  if (input.saleStructure === 'asset_sale') {
    // Asset sale: portion taxed as ordinary income (depreciation recapture, inventory)
    ordinaryRecapture = totalGain.mul(ASSET_SALE_ORDINARY_PCT);
    const ltcgPortion = totalGain.minus(ordinaryRecapture);
    const ordinaryTax = ordinaryRecapture.mul(ORDINARY_RECAPTURE_RATE);
    const ltcgTax = ltcgPortion.mul(FEDERAL_LTCG_RATE);
    federalCGTax = ordinaryTax.plus(ltcgTax);
  } else {
    // Stock sale: entire gain treated as LTCG (if held > 1 year)
    federalCGTax = totalGain.mul(FEDERAL_LTCG_RATE);
  }

  // ------------------------------------------------------------------
  // 4. NIIT
  // ------------------------------------------------------------------
  const totalIncomeWithGain = otherIncome.plus(totalGain);
  const excessOverThreshold = Decimal.max(totalIncomeWithGain.minus(niitThreshold), 0);
  const niitBase = Decimal.min(totalGain, excessOverThreshold);
  const niitOnSale = niitBase.mul(NIIT_RATE);

  // ------------------------------------------------------------------
  // 5. State capital gains tax
  // ------------------------------------------------------------------
  const stateTax = totalGain.mul(stateCGRate);

  // ------------------------------------------------------------------
  // 6. Net proceeds
  // ------------------------------------------------------------------
  const totalTax = federalCGTax.plus(niitOnSale).plus(stateTax);
  const netProceeds = netSaleProceeds.minus(totalTax).minus(debtPayoff);

  const effectiveTaxRate = totalGain.gt(0)
    ? totalTax.div(totalGain).toNumber()
    : 0;

  // ------------------------------------------------------------------
  // 7. Installment sale schedule (if elected)
  // ------------------------------------------------------------------
  let installmentSchedule: BusinessSaleResult['installmentSchedule'];

  if (input.installmentElected && input.installmentTermYears > 0) {
    installmentSchedule = [];

    const termYears = input.installmentTermYears;
    const rate = new Decimal(input.installmentRate);
    const principal = netSaleProceeds;
    const grossProfitRatio = totalGain.gt(0)
      ? totalGain.div(netSaleProceeds)
      : new Decimal(0);

    // Calculate equal annual payment (principal + interest amortization)
    // PMT = P * r * (1+r)^n / ((1+r)^n - 1)
    let annualPayment: Decimal;
    if (rate.isZero()) {
      annualPayment = principal.div(termYears);
    } else {
      const rPlusOne = rate.plus(1);
      const rPlusOneN = rPlusOne.pow(termYears);
      annualPayment = principal.mul(rate).mul(rPlusOneN).div(rPlusOneN.minus(1));
    }

    let remainingBalance = principal;

    for (let yr = 1; yr <= termYears; yr++) {
      const interestPortion = remainingBalance.mul(rate);
      const principalPortion = annualPayment.minus(interestPortion);
      const actualPrincipal = Decimal.min(principalPortion, remainingBalance);
      const payment = actualPrincipal.plus(interestPortion);

      // Gain recognized = principal portion * gross profit ratio
      const gainRecognized = actualPrincipal.mul(grossProfitRatio);

      // Tax due on recognized gain (federal LTCG + NIIT + state)
      // Plus ordinary income tax on interest
      const cgTaxOnGain = gainRecognized.mul(FEDERAL_LTCG_RATE);
      const niitOnGain = gainRecognized.mul(NIIT_RATE);
      const stateOnGain = gainRecognized.mul(stateCGRate);
      const interestTax = interestPortion.mul(ORDINARY_RECAPTURE_RATE);
      const taxDue = cgTaxOnGain.plus(niitOnGain).plus(stateOnGain).plus(interestTax);

      installmentSchedule.push({
        year: input.saleYear + yr,
        payment: payment.toNumber(),
        principalPortion: actualPrincipal.toNumber(),
        interestPortion: interestPortion.toNumber(),
        gainRecognized: gainRecognized.toNumber(),
        taxDue: taxDue.toNumber(),
      });

      remainingBalance = remainingBalance.minus(actualPrincipal);
      if (remainingBalance.lte(0)) break;
    }
  }

  return {
    grossProceeds: grossProceeds.toNumber(),
    basis: basis.toNumber(),
    totalGain: totalGain.toNumber(),
    federalCGTax: federalCGTax.toNumber(),
    niitOnSale: niitOnSale.toNumber(),
    stateTax: stateTax.toNumber(),
    transactionCosts: transactionCosts.toNumber(),
    debtPayoff: debtPayoff.toNumber(),
    netProceeds: netProceeds.toNumber(),
    effectiveTaxRate,
    installmentSchedule,
  };
}
