/**
 * Student Loan Optimization Engine (FP-DebtIQ Category 3)
 *
 * Provides federal student loan repayment plan comparison, PSLF analysis,
 * private refinance modeling, SAVE plan risk scenarios, and tax optimization
 * strategies for IDR payment minimization.
 *
 * All financial math uses decimal.js for precision. Every exported function
 * is pure (no async, no DB calls, no side effects).
 *
 * @module debt-engine/student-loan/calculations
 */

import Decimal from 'decimal.js';
import type {
  StudentLoanProfile,
  StudentLoanOptimizerResult,
  RepaymentPlanResult,
  PSLFAnalysis,
  FederalRepaymentPlan,
  StudentLoanTaxResult,
  HouseholdTaxProfile,
  FilingStatus,
} from '../types';

// =====================================================================
// Constants
// =====================================================================

/** 2025 Federal Poverty Line base for 1 person (48 contiguous states). */
const POVERTY_LINE_BASE = new Decimal(15650);
/** Additional per-person above 1. */
const POVERTY_LINE_PER_PERSON = new Decimal(5580);

/** Plan-specific poverty line multipliers. */
const POVERTY_MULTIPLIER: Record<string, Decimal> = {
  IBR_NEW: new Decimal(1.5),
  IBR_OLD: new Decimal(1.5),
  PAYE: new Decimal(1.5),
  SAVE: new Decimal(2.25),
  ICR: new Decimal(1),
};

/** Plan-specific payment percentages of discretionary income. */
const PAYMENT_PERCENT: Record<string, Decimal> = {
  IBR_NEW: new Decimal(0.1),
  IBR_OLD: new Decimal(0.15),
  PAYE: new Decimal(0.1),
  SAVE_UNDERGRAD: new Decimal(0.1),
  SAVE_GRAD: new Decimal(0.2),
  ICR: new Decimal(0.2),
};

/** Plan-specific forgiveness years. */
const FORGIVENESS_YEARS: Record<string, number> = {
  IBR_NEW: 20,
  IBR_OLD: 25,
  PAYE: 20,
  SAVE_UNDERGRAD: 20,
  SAVE_GRAD: 25,
  ICR: 25,
};

/** PSLF qualifying payments required. */
const PSLF_QUALIFYING_PAYMENTS = 120;

/** Discount rate for NPV calculations. */
const DISCOUNT_RATE = new Decimal(0.05);

/** Standard repayment term in months. */
const STANDARD_TERM_MONTHS = 120;

/** Extended repayment term in months. */
const EXTENDED_TERM_MONTHS = 300;

/** Maximum student loan interest deduction. */
const MAX_INTEREST_DEDUCTION = new Decimal(2500);

/** 401k max contribution for 2025. */
const MAX_401K = new Decimal(23500);

/** HSA max single for 2025. */
const HSA_SINGLE = new Decimal(4150);

/** HSA max family for 2025. */
const HSA_FAMILY = new Decimal(8300);

/** IRA max deduction for 2025. */
const MAX_IRA = new Decimal(7000);

// =====================================================================
// Helpers
// =====================================================================

/**
 * Convert a Decimal to a plain number rounded to 2 decimal places.
 */
function toNum(d: Decimal): number {
  return d.toDecimalPlaces(2).toNumber();
}

/**
 * Calculate the federal poverty line for a given family size.
 */
function povertyLine(familySize: number): Decimal {
  const additional = Math.max(0, familySize - 1);
  return POVERTY_LINE_BASE.plus(POVERTY_LINE_PER_PERSON.mul(additional));
}

/**
 * Calculate discretionary income for an IDR plan.
 */
function discretionaryIncome(
  agi: Decimal,
  familySize: number,
  planKey: string,
): Decimal {
  const multiplier = POVERTY_MULTIPLIER[planKey] ?? new Decimal(1.5);
  const threshold = povertyLine(familySize).mul(multiplier);
  const disc = agi.minus(threshold);
  return disc.gt(0) ? disc : new Decimal(0);
}

/**
 * Compute a standard monthly amortization payment.
 */
function amortizationPayment(
  principal: Decimal,
  annualRate: Decimal,
  months: number,
): Decimal {
  if (annualRate.isZero()) {
    return principal.div(months);
  }
  const monthlyRate = annualRate.div(12);
  const factor = monthlyRate.plus(1).pow(months);
  return principal.mul(monthlyRate).mul(factor).div(factor.minus(1));
}

/**
 * Get the weighted average interest rate across all loans.
 */
function weightedRate(profile: StudentLoanProfile): Decimal {
  let totalBal = new Decimal(0);
  let weightedSum = new Decimal(0);
  for (const loan of profile.loans) {
    const bal = new Decimal(loan.balance);
    totalBal = totalBal.plus(bal);
    weightedSum = weightedSum.plus(bal.mul(loan.interestRate));
  }
  return totalBal.gt(0) ? weightedSum.div(totalBal) : new Decimal(0);
}

/**
 * Get total balance across all loans.
 */
function totalBalance(profile: StudentLoanProfile): Decimal {
  return profile.loans.reduce(
    (sum, l) => sum.plus(new Decimal(l.balance)),
    new Decimal(0),
  );
}

/**
 * Determine whether the loan portfolio is predominantly graduate-level.
 */
function isGradPortfolio(profile: StudentLoanProfile): boolean {
  let gradBalance = new Decimal(0);
  let totalBal = new Decimal(0);
  for (const loan of profile.loans) {
    const bal = new Decimal(loan.balance);
    totalBal = totalBal.plus(bal);
    if (loan.type === 'GRAD_PLUS' || loan.type === 'DIRECT_UNSUBSIDIZED') {
      gradBalance = gradBalance.plus(bal);
    }
  }
  return totalBal.gt(0) && gradBalance.div(totalBal).gte(0.5);
}

/**
 * Project AGI for a given year offset, accounting for explicit changes and growth.
 */
function projectAGI(profile: StudentLoanProfile, yearOffset: number): Decimal {
  // Check if there is an explicit override for this year
  const override = profile.expectedAgiChanges.find(
    (c) => c.year === yearOffset,
  );
  if (override) {
    return new Decimal(override.agi);
  }
  const growthFactor = new Decimal(1).plus(
    new Decimal(profile.agiGrowthRate),
  );
  return new Decimal(profile.agi).mul(growthFactor.pow(yearOffset));
}

/**
 * Project family size for a given year offset.
 */
function projectFamilySize(
  profile: StudentLoanProfile,
  yearOffset: number,
): number {
  let size = profile.familySize;
  for (const change of profile.expectedFamilySizeChanges) {
    if (change.year <= yearOffset) {
      size = change.size;
    }
  }
  return size;
}

/**
 * Calculate NPV of a series of annual cash flows at the discount rate.
 */
function npvOfPayments(annualPayments: Decimal[]): Decimal {
  let npv = new Decimal(0);
  for (let y = 0; y < annualPayments.length; y++) {
    const discountFactor = DISCOUNT_RATE.plus(1).pow(y + 1);
    npv = npv.plus(annualPayments[y].div(discountFactor));
  }
  return npv;
}

/**
 * Estimate a marginal tax rate for the forgiveness year (heuristic).
 */
function estimatedForgivenessTaxRate(
  profile: StudentLoanProfile,
  yearOffset: number,
): Decimal {
  const futureAgi = projectAGI(profile, yearOffset);
  // Simplified progressive rate estimate
  if (futureAgi.gt(400000)) return new Decimal(0.35);
  if (futureAgi.gt(200000)) return new Decimal(0.32);
  if (futureAgi.gt(100000)) return new Decimal(0.24);
  if (futureAgi.gt(50000)) return new Decimal(0.22);
  return new Decimal(0.12);
}

// =====================================================================
// Plan Simulators
// =====================================================================

/**
 * Simulate a standard 10-year fixed repayment plan.
 */
function simulateStandard(
  balance: Decimal,
  rate: Decimal,
  termMonths: number,
): RepaymentPlanResult {
  const monthly = amortizationPayment(balance, rate, termMonths);
  const totalPaid = monthly.mul(termMonths);
  const totalInterest = totalPaid.minus(balance);
  const monthlyPayments: number[] = [];
  for (let i = 0; i < Math.ceil(termMonths / 12); i++) {
    monthlyPayments.push(toNum(monthly));
  }
  const payoffDate = new Date();
  payoffDate.setMonth(payoffDate.getMonth() + termMonths);

  return {
    monthlyPayments,
    totalPaid: toNum(totalPaid),
    totalInterestPaid: toNum(totalInterest),
    forgiveness: 0,
    forgivenessYear: 0,
    taxOnForgiveness: 0,
    netCost: toNum(totalPaid),
    npv: toNum(npvOfPayments(monthlyPayments.map((p) => new Decimal(p).mul(12)))),
    monthlyPaymentNow: toNum(monthly),
    payoffDate,
  };
}

/**
 * Simulate a graduated repayment plan.
 * Payments start low and increase every 2 years over 10 years.
 */
function simulateGraduated(
  balance: Decimal,
  rate: Decimal,
): RepaymentPlanResult {
  const termMonths = STANDARD_TERM_MONTHS;
  const standardPayment = amortizationPayment(balance, rate, termMonths);
  // Start at ~60% of standard, increase every 2 years
  const startPayment = standardPayment.mul(0.6);
  const increments = 5; // 5 two-year periods
  // Calculate the growth factor so total payments cover the loan
  // We approximate: total paid should roughly equal standard total
  const monthlyRate = rate.div(12);

  let remaining = new Decimal(balance);
  const yearlyPayments: Decimal[] = [];
  const monthlyPayments: number[] = [];
  let currentPayment = startPayment;
  const growthPerPeriod = new Decimal(1.15); // 15% increase every 2 years

  for (let year = 0; year < 10; year++) {
    // Increase every 2 years
    if (year > 0 && year % 2 === 0) {
      currentPayment = currentPayment.mul(growthPerPeriod);
    }
    let yearlyTotal = new Decimal(0);
    for (let m = 0; m < 12; m++) {
      if (remaining.lte(0)) break;
      const interest = remaining.mul(monthlyRate);
      const payment = Decimal.min(currentPayment, remaining.plus(interest));
      const principalPaid = payment.minus(interest);
      remaining = remaining.minus(principalPaid);
      if (remaining.lt(0)) remaining = new Decimal(0);
      yearlyTotal = yearlyTotal.plus(payment);
    }
    yearlyPayments.push(yearlyTotal);
    monthlyPayments.push(toNum(currentPayment));
  }

  const totalPaid = yearlyPayments.reduce(
    (s, y) => s.plus(y),
    new Decimal(0),
  );
  const totalInterest = totalPaid.minus(balance).plus(remaining);
  const payoffDate = new Date();
  payoffDate.setMonth(payoffDate.getMonth() + termMonths);

  return {
    monthlyPayments,
    totalPaid: toNum(totalPaid),
    totalInterestPaid: toNum(Decimal.max(totalInterest, new Decimal(0))),
    forgiveness: 0,
    forgivenessYear: 0,
    taxOnForgiveness: 0,
    netCost: toNum(totalPaid),
    npv: toNum(npvOfPayments(yearlyPayments)),
    monthlyPaymentNow: toNum(startPayment),
    payoffDate,
  };
}

/**
 * Simulate an income-driven repayment (IDR) plan.
 */
function simulateIDR(
  balance: Decimal,
  rate: Decimal,
  profile: StudentLoanProfile,
  planKey: string,
): RepaymentPlanResult {
  const isGrad = isGradPortfolio(profile);
  const saveKey = isGrad ? 'SAVE_GRAD' : 'SAVE_UNDERGRAD';
  const paymentPct =
    planKey === 'SAVE'
      ? (PAYMENT_PERCENT[saveKey] ?? new Decimal(0.1))
      : (PAYMENT_PERCENT[planKey] ?? new Decimal(0.1));
  const forgivenessYears =
    planKey === 'SAVE'
      ? (FORGIVENESS_YEARS[saveKey] ?? 20)
      : (FORGIVENESS_YEARS[planKey] ?? 20);

  const monthlyRate = rate.div(12);
  // Also compute standard payment as a cap (IBR/PAYE cap at standard 10yr)
  const standardCap = amortizationPayment(balance, rate, STANDARD_TERM_MONTHS);

  let remaining = new Decimal(balance);
  let totalPaid = new Decimal(0);
  const yearlyPayments: Decimal[] = [];
  const monthlyPayments: number[] = [];

  for (let year = 0; year < forgivenessYears; year++) {
    const currentAgi = projectAGI(profile, year);
    const currentFamilySize = projectFamilySize(profile, year);
    const disc = discretionaryIncome(currentAgi, currentFamilySize, planKey);
    let idrMonthly = disc.mul(paymentPct).div(12);

    // IBR and PAYE cap at the standard 10yr payment
    if (
      planKey === 'IBR_NEW' ||
      planKey === 'IBR_OLD' ||
      planKey === 'PAYE'
    ) {
      idrMonthly = Decimal.min(idrMonthly, standardCap);
    }

    monthlyPayments.push(toNum(idrMonthly));
    let yearTotal = new Decimal(0);

    for (let m = 0; m < 12; m++) {
      if (remaining.lte(0)) break;
      const interest = remaining.mul(monthlyRate);
      const payment = Decimal.min(idrMonthly, remaining.plus(interest));
      const principalPaid = payment.minus(interest);
      remaining = remaining.minus(principalPaid);
      yearTotal = yearTotal.plus(payment);
    }

    totalPaid = totalPaid.plus(yearTotal);
    yearlyPayments.push(yearTotal);

    if (remaining.lte(0)) break;
  }

  const forgiveness = Decimal.max(remaining, new Decimal(0));
  const taxRate = estimatedForgivenessTaxRate(profile, forgivenessYears);
  const taxOnForgiveness = forgiveness.mul(taxRate);
  const netCost = totalPaid.plus(taxOnForgiveness);

  const payoffDate = new Date();
  if (forgiveness.gt(0)) {
    payoffDate.setFullYear(payoffDate.getFullYear() + forgivenessYears);
  } else {
    // Find when the loan was actually paid off
    const yearsUsed = yearlyPayments.length;
    payoffDate.setFullYear(payoffDate.getFullYear() + yearsUsed);
  }

  return {
    monthlyPayments,
    totalPaid: toNum(totalPaid),
    totalInterestPaid: toNum(totalPaid.minus(balance).plus(forgiveness)),
    forgiveness: toNum(forgiveness),
    forgivenessYear: forgiveness.gt(0) ? forgivenessYears : 0,
    taxOnForgiveness: toNum(taxOnForgiveness),
    netCost: toNum(netCost),
    npv: toNum(npvOfPayments(yearlyPayments)),
    monthlyPaymentNow: monthlyPayments[0] ?? 0,
    payoffDate,
  };
}

// =====================================================================
// PSLF Analysis
// =====================================================================

/**
 * Analyze PSLF eligibility and projected benefit.
 */
function analyzePSLF(
  profile: StudentLoanProfile,
  balance: Decimal,
  rate: Decimal,
  plans: Partial<Record<FederalRepaymentPlan, RepaymentPlanResult>>,
  privatePayoff: Decimal,
): PSLFAnalysis {
  const isEligible =
    profile.isPSLFEligible &&
    (profile.employerType === 'NONPROFIT_501C3' ||
      profile.employerType === 'GOVERNMENT');

  if (!isEligible) {
    return {
      isEligible: false,
      qualifyingPaymentsMade: profile.pslfQualifyingPaymentsMade,
      paymentsRemaining: PSLF_QUALIFYING_PAYMENTS,
      projectedForgiveness: 0,
      taxFreeForgivenessValue: 0,
      totalPaidUnderPSLF: 0,
      vsPrivateRefinance: {
        privatePayoff: toNum(privatePayoff),
        pslfNetCost: 0,
        pslfAdvantage: 0,
      },
      shouldPursueOptimalIDR: 'STANDARD_10YR',
    };
  }

  const paymentsRemaining = Math.max(
    0,
    PSLF_QUALIFYING_PAYMENTS - profile.pslfQualifyingPaymentsMade,
  );
  const monthsRemaining = paymentsRemaining;
  const yearsRemaining = Math.ceil(monthsRemaining / 12);

  // Find the IDR plan that minimizes total paid up to forgiveness
  const idrPlans: FederalRepaymentPlan[] = [
    'IBR_NEW',
    'IBR_OLD',
    'PAYE',
    'SAVE',
    'ICR',
  ];
  let bestPlan: FederalRepaymentPlan = 'SAVE';
  let lowestTotalPaid = new Decimal(Infinity);

  for (const planKey of idrPlans) {
    const planResult = plans[planKey];
    if (!planResult) continue;
    // Under PSLF, only count payments up to paymentsRemaining months
    const monthlyPmt = new Decimal(planResult.monthlyPaymentNow);
    let pslfTotalPaid = new Decimal(0);
    for (let y = 0; y < yearsRemaining; y++) {
      const yearlyAgi = projectAGI(profile, y);
      const familySize = projectFamilySize(profile, y);
      const disc = discretionaryIncome(yearlyAgi, familySize, planKey);
      const paymentPctKey =
        planKey === 'SAVE'
          ? isGradPortfolio(profile)
            ? 'SAVE_GRAD'
            : 'SAVE_UNDERGRAD'
          : planKey;
      const pct = PAYMENT_PERCENT[paymentPctKey] ?? new Decimal(0.1);
      const annualPayment = disc.mul(pct);
      const monthsThisYear = Math.min(
        12,
        monthsRemaining - y * 12,
      );
      if (monthsThisYear <= 0) break;
      pslfTotalPaid = pslfTotalPaid.plus(
        annualPayment.div(12).mul(monthsThisYear),
      );
    }
    if (pslfTotalPaid.lt(lowestTotalPaid)) {
      lowestTotalPaid = pslfTotalPaid;
      bestPlan = planKey;
    }
  }

  // Project remaining balance at forgiveness under PSLF
  const monthlyRate = rate.div(12);
  let remaining = new Decimal(balance);
  let totalPaidPSLF = new Decimal(0);

  for (let month = 0; month < monthsRemaining; month++) {
    const yearOffset = Math.floor(month / 12);
    const currentAgi = projectAGI(profile, yearOffset);
    const familySize = projectFamilySize(profile, yearOffset);
    const disc = discretionaryIncome(currentAgi, familySize, bestPlan);
    const paymentPctKey =
      bestPlan === 'SAVE'
        ? isGradPortfolio(profile)
          ? 'SAVE_GRAD'
          : 'SAVE_UNDERGRAD'
        : bestPlan;
    const pct = PAYMENT_PERCENT[paymentPctKey] ?? new Decimal(0.1);
    const payment = disc.mul(pct).div(12);

    const interest = remaining.mul(monthlyRate);
    const actualPayment = Decimal.min(payment, remaining.plus(interest));
    remaining = remaining.plus(interest).minus(actualPayment);
    if (remaining.lt(0)) remaining = new Decimal(0);
    totalPaidPSLF = totalPaidPSLF.plus(actualPayment);
  }

  const projectedForgiveness = Decimal.max(remaining, new Decimal(0));
  // PSLF forgiveness is TAX-FREE
  const taxFreeValue = projectedForgiveness.mul(
    estimatedForgivenessTaxRate(
      profile,
      yearsRemaining,
    ),
  );

  const pslfNetCost = totalPaidPSLF; // no tax on forgiveness

  return {
    isEligible: true,
    qualifyingPaymentsMade: profile.pslfQualifyingPaymentsMade,
    paymentsRemaining,
    projectedForgiveness: toNum(projectedForgiveness),
    taxFreeForgivenessValue: toNum(taxFreeValue),
    totalPaidUnderPSLF: toNum(totalPaidPSLF),
    vsPrivateRefinance: {
      privatePayoff: toNum(privatePayoff),
      pslfNetCost: toNum(pslfNetCost),
      pslfAdvantage: toNum(privatePayoff.minus(pslfNetCost)),
    },
    shouldPursueOptimalIDR: bestPlan,
  };
}

// =====================================================================
// Private Refinance Analysis
// =====================================================================

/**
 * Estimate a private refinance rate based on income heuristic.
 */
function estimatePrivateRate(profile: StudentLoanProfile): Decimal {
  let rate = new Decimal(0.05); // base 5%
  const agi = new Decimal(profile.agi);
  if (agi.lt(50000)) {
    rate = rate.plus(0.02);
  } else if (agi.lt(100000)) {
    rate = rate.plus(0.01);
  } else if (agi.gt(200000)) {
    rate = rate.minus(0.005);
  }
  // Additional adjustment for debt-to-income
  const bal = totalBalance(profile);
  const dti = bal.div(agi);
  if (dti.gt(2)) {
    rate = rate.plus(0.01);
  }
  return rate;
}

// =====================================================================
// Main Exported Functions
// =====================================================================

/**
 * Compute comprehensive student loan repayment optimization including all
 * federal plan comparisons, PSLF analysis, private refinance modeling,
 * and SAVE plan risk scenarios.
 *
 * @param profile - The borrower's complete student loan profile including
 *   loans, AGI, family size, employer type, and PSLF history.
 * @returns A complete optimization result with plan comparisons, PSLF
 *   analysis, refinance comparison, and risk scenario modeling.
 */
export function optimizeStudentLoanRepayment(
  profile: StudentLoanProfile,
): StudentLoanOptimizerResult {
  const balance = totalBalance(profile);
  const rate = weightedRate(profile);

  // ---------------------------------------------------------------
  // 1. Compute each repayment plan
  // ---------------------------------------------------------------
  const plans: Partial<Record<FederalRepaymentPlan, RepaymentPlanResult>> = {};

  // Standard 10-year
  plans.STANDARD_10YR = simulateStandard(
    balance,
    rate,
    STANDARD_TERM_MONTHS,
  );

  // Extended 25-year
  plans.EXTENDED_25YR = simulateStandard(
    balance,
    rate,
    EXTENDED_TERM_MONTHS,
  );

  // Graduated
  plans.GRADUATED = simulateGraduated(balance, rate);

  // IDR plans
  const idrKeys: FederalRepaymentPlan[] = [
    'IBR_NEW',
    'IBR_OLD',
    'PAYE',
    'SAVE',
    'ICR',
  ];
  for (const planKey of idrKeys) {
    plans[planKey] = simulateIDR(balance, rate, profile, planKey);
  }

  // ---------------------------------------------------------------
  // 2. Private refinance analysis
  // ---------------------------------------------------------------
  const privateRate = estimatePrivateRate(profile);
  const privateTermMonths = 120; // 10 year fixed
  const privateMonthly = amortizationPayment(
    balance,
    privateRate,
    privateTermMonths,
  );
  const privateTotalPaid = privateMonthly.mul(privateTermMonths);
  const standardPlan = plans.STANDARD_10YR!;
  const privateSavings = new Decimal(standardPlan.totalPaid).minus(
    privateTotalPaid,
  );

  const privateRefinanceAnalysis = {
    estimatedPrivateRate: toNum(privateRate),
    totalPaidIfRefinanced: toNum(privateTotalPaid),
    monthlyPayment: toNum(privateMonthly),
    vsStandardPlan: {
      savings: toNum(privateSavings),
      recommendation: (privateSavings.gt(0)
        ? 'REFINANCE'
        : 'STAY_FEDERAL') as 'REFINANCE' | 'STAY_FEDERAL',
      caution:
        'Refinancing to a private loan forfeits all federal protections including IDR plans, PSLF eligibility, forbearance, and deferment options.',
    },
  };

  // ---------------------------------------------------------------
  // 3. PSLF analysis
  // ---------------------------------------------------------------
  const pslfAnalysis = analyzePSLF(
    profile,
    balance,
    rate,
    plans,
    privateTotalPaid,
  );

  // ---------------------------------------------------------------
  // 4. SAVE plan risk scenario
  // ---------------------------------------------------------------
  const savePlan = plans.SAVE;
  const savePlanPayment = savePlan
    ? new Decimal(savePlan.monthlyPaymentNow)
    : new Decimal(0);

  // Worst case: fall back to IBR_OLD (the most widely available fallback)
  const fallbackPlan = plans.IBR_OLD;
  const worstCasePayment = fallbackPlan
    ? new Decimal(fallbackPlan.monthlyPaymentNow)
    : new Decimal(0);

  const savePlanRiskScenario = {
    currentPlanPayment: toNum(savePlanPayment),
    worstCasePlanPayment: toNum(worstCasePayment),
    difference: toNum(worstCasePayment.minus(savePlanPayment)),
    contingencyPlan: 'IBR_NEW' as FederalRepaymentPlan,
  };

  // ---------------------------------------------------------------
  // 5. Determine best recommendation
  // ---------------------------------------------------------------
  let recommendation: FederalRepaymentPlan = 'STANDARD_10YR';
  let recommendationReason = '';
  const insights: string[] = [];

  if (pslfAnalysis.isEligible && pslfAnalysis.paymentsRemaining <= 120) {
    recommendation = pslfAnalysis.shouldPursueOptimalIDR;
    recommendationReason = `PSLF is your best path. Use ${recommendation} to minimize payments before tax-free forgiveness in ${pslfAnalysis.paymentsRemaining} payments.`;
    insights.push(
      `PSLF will save you approximately $${toNum(new Decimal(pslfAnalysis.vsPrivateRefinance.pslfAdvantage))} vs private refinancing.`,
    );
  } else {
    // Find plan with lowest net cost
    let lowestNetCost = new Decimal(Infinity);
    const planKeys = Object.keys(plans) as FederalRepaymentPlan[];
    for (const key of planKeys) {
      const plan = plans[key]!;
      const netCost = new Decimal(plan.netCost);
      if (netCost.lt(lowestNetCost)) {
        lowestNetCost = netCost;
        recommendation = key;
      }
    }
    recommendationReason = `${recommendation} offers the lowest total net cost of $${toNum(lowestNetCost)}, accounting for payments, forgiveness, and taxes.`;
  }

  // Add standard insights
  if (savePlan && savePlan.forgiveness > 0) {
    insights.push(
      `Under SAVE, $${savePlan.forgiveness.toLocaleString()} would be forgiven after ${savePlan.forgivenessYear} years, but $${savePlan.taxOnForgiveness.toLocaleString()} in taxes would be due on forgiveness.`,
    );
  }

  if (privateSavings.gt(1000) && !pslfAnalysis.isEligible) {
    insights.push(
      `Private refinancing could save $${toNum(privateSavings)} vs standard federal repayment, but you lose federal protections.`,
    );
  }

  const standardMonthly = new Decimal(standardPlan.monthlyPaymentNow);
  const savePlanMonthly = savePlan
    ? new Decimal(savePlan.monthlyPaymentNow)
    : standardMonthly;
  if (savePlanMonthly.lt(standardMonthly.mul(0.5))) {
    insights.push(
      `IDR plans could reduce your monthly payment from $${toNum(standardMonthly)} to as low as $${toNum(savePlanMonthly)}.`,
    );
  }

  if (savePlanRiskScenario.difference > 100) {
    insights.push(
      `If the SAVE plan is eliminated, your payment could increase by $${savePlanRiskScenario.difference}/month. Consider ${savePlanRiskScenario.contingencyPlan} as a contingency.`,
    );
  }

  return {
    plans,
    pslfAnalysis,
    privateRefinanceAnalysis,
    recommendation,
    recommendationReason,
    topInsights: insights,
    savePlanRiskScenario,
  };
}

/**
 * Optimize tax strategies that reduce AGI and thereby lower IDR payments,
 * analyze the marriage penalty for student loan purposes, and compute the
 * student loan interest deduction.
 *
 * @param params - Object containing the student loan profile and household
 *   tax profile for combined analysis.
 * @returns Tax optimization strategies, marriage penalty analysis, and
 *   interest deduction calculation.
 */
export function optimizeStudentLoanTax(params: {
  studentLoanProfile: StudentLoanProfile;
  taxProfile: HouseholdTaxProfile;
}): StudentLoanTaxResult {
  const { studentLoanProfile: profile, taxProfile } = params;

  const agi = new Decimal(profile.agi);
  const balance = totalBalance(profile);
  const rate = weightedRate(profile);
  const federalRate = new Decimal(taxProfile.federalMarginalRate);
  const stateRate = new Decimal(taxProfile.stateMarginalRate);
  const combinedRate = federalRate.plus(stateRate);

  // ---------------------------------------------------------------
  // 1. AGI-reducing strategies
  // ---------------------------------------------------------------
  const strategies: StudentLoanTaxResult['strategies'] = [];

  // Helper: compute IDR annual payment at a given AGI
  function idrAnnualPayment(currentAgi: Decimal): Decimal {
    // Use SAVE plan parameters as the target IDR
    const planKey = 'SAVE';
    const disc = discretionaryIncome(
      currentAgi,
      profile.familySize,
      planKey,
    );
    const pctKey = isGradPortfolio(profile)
      ? 'SAVE_GRAD'
      : 'SAVE_UNDERGRAD';
    const pct = PAYMENT_PERCENT[pctKey] ?? new Decimal(0.1);
    return disc.mul(pct);
  }

  const currentAnnualPayment = idrAnnualPayment(agi);

  // Strategy: Max 401k
  {
    const reduction = MAX_401K;
    const newAgi = agi.minus(reduction);
    const newPayment = idrAnnualPayment(Decimal.max(newAgi, new Decimal(0)));
    const paymentSavings = currentAnnualPayment.minus(newPayment);
    const taxSavings = reduction.mul(combinedRate);
    strategies.push({
      strategy: 'Max 401(k) contribution ($23,500)',
      agiReduction: toNum(reduction),
      annualPaymentSavings: toNum(Decimal.max(paymentSavings, new Decimal(0))),
      taxSavings: toNum(taxSavings),
      combinedAnnualBenefit: toNum(
        Decimal.max(paymentSavings, new Decimal(0)).plus(taxSavings),
      ),
      recommendation:
        'Strongly recommended. Reduces AGI, lowers IDR payments, and provides retirement savings.',
    });
  }

  // Strategy: Max HSA
  {
    const isFamilyCoverage =
      taxProfile.filingStatus === 'MFJ' || profile.familySize > 1;
    const reduction = isFamilyCoverage ? HSA_FAMILY : HSA_SINGLE;
    const newAgi = agi.minus(reduction);
    const newPayment = idrAnnualPayment(Decimal.max(newAgi, new Decimal(0)));
    const paymentSavings = currentAnnualPayment.minus(newPayment);
    const taxSavings = reduction.mul(combinedRate);
    strategies.push({
      strategy: `Max HSA contribution ($${toNum(reduction)})`,
      agiReduction: toNum(reduction),
      annualPaymentSavings: toNum(Decimal.max(paymentSavings, new Decimal(0))),
      taxSavings: toNum(taxSavings),
      combinedAnnualBenefit: toNum(
        Decimal.max(paymentSavings, new Decimal(0)).plus(taxSavings),
      ),
      recommendation:
        'Recommended if eligible for HSA. Triple tax advantage plus IDR payment reduction.',
    });
  }

  // Strategy: Max IRA
  {
    const reduction = MAX_IRA;
    const newAgi = agi.minus(reduction);
    const newPayment = idrAnnualPayment(Decimal.max(newAgi, new Decimal(0)));
    const paymentSavings = currentAnnualPayment.minus(newPayment);
    const taxSavings = reduction.mul(combinedRate);
    strategies.push({
      strategy: 'Max Traditional IRA deduction ($7,000)',
      agiReduction: toNum(reduction),
      annualPaymentSavings: toNum(Decimal.max(paymentSavings, new Decimal(0))),
      taxSavings: toNum(taxSavings),
      combinedAnnualBenefit: toNum(
        Decimal.max(paymentSavings, new Decimal(0)).plus(taxSavings),
      ),
      recommendation:
        'Consider if eligible for the deduction. Income limits may apply if covered by employer plan.',
    });
  }

  // ---------------------------------------------------------------
  // 2. Marriage penalty analysis
  // ---------------------------------------------------------------
  const spouseAgi = new Decimal(profile.spouseAgi ?? 0);

  // MFJ: IDR based on combined AGI
  const jointAgi = agi.plus(spouseAgi);
  const jointDisc = discretionaryIncome(
    jointAgi,
    profile.familySize,
    'SAVE',
  );
  const jointPctKey = isGradPortfolio(profile)
    ? 'SAVE_GRAD'
    : 'SAVE_UNDERGRAD';
  const jointPct = PAYMENT_PERCENT[jointPctKey] ?? new Decimal(0.1);
  const payingJointly = jointDisc.mul(jointPct).div(12);

  // MFS: IDR based on individual AGI only
  const separateDisc = discretionaryIncome(agi, profile.familySize, 'SAVE');
  const payingSeparately = separateDisc.mul(jointPct).div(12);

  const annualPenalty = payingJointly.minus(payingSeparately).mul(12);

  // Estimate tax cost of filing separately (lose many credits/deductions)
  // Heuristic: MFS loses ~$3,000-$8,000 in tax benefits for typical HHI
  const taxCostOfMFS = estimateMFSTaxCost(taxProfile, spouseAgi);
  const netAdvantage = annualPenalty.minus(taxCostOfMFS);
  const shouldFileSeparately = netAdvantage.gt(0);

  // ---------------------------------------------------------------
  // 3. Student loan interest deduction
  // ---------------------------------------------------------------
  // Estimate interest paid this year
  const annualInterest = balance.mul(rate);
  const interestPaid = Decimal.min(annualInterest, balance.mul(rate));

  // Phase-out ranges
  const filingStatus = taxProfile.filingStatus;
  let phaseOutStart: Decimal;
  let phaseOutEnd: Decimal;

  if (filingStatus === 'MFJ') {
    phaseOutStart = new Decimal(150000);
    phaseOutEnd = new Decimal(180000);
  } else {
    phaseOutStart = new Decimal(75000);
    phaseOutEnd = new Decimal(90000);
  }

  // MFS cannot claim the deduction at all
  let deductibleAmount: Decimal;
  let phaseOutReduction = new Decimal(0);
  const isPhaseOut = agi.gt(phaseOutStart);

  if (filingStatus === 'MFS') {
    deductibleAmount = new Decimal(0);
    phaseOutReduction = Decimal.min(interestPaid, MAX_INTEREST_DEDUCTION);
  } else if (agi.gte(phaseOutEnd)) {
    deductibleAmount = new Decimal(0);
    phaseOutReduction = Decimal.min(interestPaid, MAX_INTEREST_DEDUCTION);
  } else if (agi.gt(phaseOutStart)) {
    const phaseOutFraction = agi
      .minus(phaseOutStart)
      .div(phaseOutEnd.minus(phaseOutStart));
    const maxDeductible = Decimal.min(interestPaid, MAX_INTEREST_DEDUCTION);
    phaseOutReduction = maxDeductible.mul(phaseOutFraction);
    deductibleAmount = maxDeductible.minus(phaseOutReduction);
  } else {
    deductibleAmount = Decimal.min(interestPaid, MAX_INTEREST_DEDUCTION);
  }

  const interestTaxSavings = deductibleAmount.mul(combinedRate);

  return {
    strategies,
    marriagePenalty: {
      payingJointly: toNum(payingJointly),
      payingSeparately: toNum(payingSeparately),
      annualPenalty: toNum(annualPenalty),
      shouldFileSeparately,
      taxCostOfFilingSeparately: toNum(taxCostOfMFS),
      netAdvantage: toNum(netAdvantage),
    },
    interestDeduction: {
      paidThisYear: toNum(interestPaid),
      deductibleAmount: toNum(deductibleAmount),
      taxSavings: toNum(interestTaxSavings),
      isPhaseOut,
      phaseOutReduction: toNum(phaseOutReduction),
    },
  };
}

// =====================================================================
// Internal Helpers (not exported)
// =====================================================================

/**
 * Estimate the tax cost of filing Married Filing Separately vs MFJ.
 * This is a heuristic: MFS loses access to many credits and favorable brackets.
 */
function estimateMFSTaxCost(
  taxProfile: HouseholdTaxProfile,
  spouseAgi: Decimal,
): Decimal {
  const combinedAgi = new Decimal(taxProfile.agi).plus(spouseAgi);
  // Heuristic: lost benefits roughly scale with income
  // Baseline: ~$2,000 minimum lost benefits from MFS
  // Plus marginal rate impact on bracket compression
  const baseCost = new Decimal(2000);
  const marginalImpact = combinedAgi
    .mul(new Decimal(taxProfile.federalMarginalRate))
    .mul(0.03); // ~3% effective penalty heuristic
  return baseCost.plus(marginalImpact);
}
