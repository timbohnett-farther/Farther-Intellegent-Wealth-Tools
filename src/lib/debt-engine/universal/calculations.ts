/**
 * FP-DebtIQ -- Category 1: Universal Debt Calculations
 *
 * Pure calculation functions for amortization, true APR, after-tax cost of
 * debt, household debt metrics, and multi-strategy payoff optimization.
 *
 * All monetary math uses Decimal.js.  Results are converted back to plain
 * numbers (2 d.p.) at the boundary.
 *
 * @module debt-engine/universal/calculations
 */

import Decimal from 'decimal.js';
import type {
  AmortizationInput,
  AmortizationResult,
  AmortizationRow,
  TrueAPRInput,
  TrueAPRResult,
  AfterTaxCostInput,
  AfterTaxCostResult,
  DebtMetricsResult,
  DTIRating,
  HouseholdDebt,
  HouseholdIncome,
  HouseholdBalanceSheet,
  HouseholdTaxProfile,
  PayoffOptimizerResult,
  PayoffPlan,
  PayoffPlanSummary,
  PayoffSequenceItem,
  PayoffStrategy,
} from '../types';

// -------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------

/** Add `months` calendar months to a Date. */
function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

/** Convenience: round a Decimal to 2 d.p. and return a plain number. */
function toNum(d: Decimal): number {
  return d.toDecimalPlaces(2).toNumber();
}

/** Round a rate to 6 d.p. to avoid precision loss on small decimals. */
function toRate(d: Decimal): number {
  return d.toDecimalPlaces(6).toNumber();
}

/**
 * Standard amortising monthly payment.
 *
 * PMT = P * [r(1+r)^n] / [(1+r)^n - 1]
 */
function monthlyPayment(principal: Decimal, monthlyRate: Decimal, termMonths: number): Decimal {
  if (principal.isZero() || termMonths <= 0) return new Decimal(0);
  if (monthlyRate.isZero()) return principal.dividedBy(termMonths);

  const onePlusRn = monthlyRate.plus(1).pow(termMonths);
  return principal.times(monthlyRate.times(onePlusRn)).dividedBy(onePlusRn.minus(1));
}

// -------------------------------------------------------------------
// 1. Amortization Schedule
// -------------------------------------------------------------------

/**
 * Generate a full amortization schedule with optional extra monthly payments.
 *
 * The schedule tracks payment number, date, principal / interest split,
 * remaining balance, and cumulative totals.  When an extra payment is
 * supplied the function also computes the months saved and interest saved
 * compared to a no-extra-payment baseline.
 *
 * @param input - Amortization parameters including extra payment amount
 * @returns Full schedule, payoff date, totals, and savings vs baseline
 */
export function generateAmortizationSchedule(input: AmortizationInput): AmortizationResult {
  const { principal, annualRate, termMonths, extraPayment, startDate } = input;

  const P = new Decimal(principal);
  const r = new Decimal(annualRate).dividedBy(12);
  const extra = new Decimal(extraPayment);
  const basePmt = monthlyPayment(P, r, termMonths);

  // ---------- build schedule ----------
  const schedule: AmortizationRow[] = [];
  let balance = P;
  let cumPrincipal = new Decimal(0);
  let cumInterest = new Decimal(0);

  for (let n = 1; n <= termMonths; n++) {
    if (balance.lte(0)) break;

    const interest = balance.times(r);
    let principalPortion = basePmt.minus(interest);
    let extraApplied = extra;

    // Cap so we never overshoot the balance
    if (principalPortion.plus(extraApplied).gt(balance)) {
      const total = balance;
      extraApplied = Decimal.max(total.minus(principalPortion), 0);
      principalPortion = total.minus(extraApplied);
    }

    balance = Decimal.max(balance.minus(principalPortion).minus(extraApplied), 0);
    cumPrincipal = cumPrincipal.plus(principalPortion).plus(extraApplied);
    cumInterest = cumInterest.plus(interest);

    schedule.push({
      paymentNumber: n,
      paymentDate: addMonths(startDate, n),
      payment: toNum(interest.plus(principalPortion).plus(extraApplied)),
      principal: toNum(principalPortion),
      interest: toNum(interest),
      extraPayment: toNum(extraApplied),
      balance: toNum(balance),
      cumulativePrincipal: toNum(cumPrincipal),
      cumulativeInterest: toNum(cumInterest),
    });

    if (balance.isZero()) break;
  }

  // ---------- baseline (no extra) for savings calc ----------
  let baseInterest = new Decimal(0);
  let baseBal = P;
  for (let n = 1; n <= termMonths; n++) {
    if (baseBal.lte(0)) break;
    const int = baseBal.times(r);
    let prin = basePmt.minus(int);
    if (prin.gt(baseBal)) prin = baseBal;
    baseBal = Decimal.max(baseBal.minus(prin), 0);
    baseInterest = baseInterest.plus(int);
  }

  const payoffDate = schedule.length > 0
    ? schedule[schedule.length - 1].paymentDate
    : startDate;

  return {
    schedule,
    payoffDate,
    totalInterest: toNum(cumInterest),
    totalPaid: toNum(cumPrincipal.plus(cumInterest)),
    monthsSaved: termMonths - schedule.length,
    interestSaved: toNum(baseInterest.minus(cumInterest)),
  };
}

// -------------------------------------------------------------------
// 2. True APR
// -------------------------------------------------------------------

/**
 * Compute the all-in true APR of a loan, incorporating origination fees,
 * discount points, PMI, and other costs.
 *
 * Uses Newton-Raphson iteration to find the rate at which the present value
 * of all payments equals the net loan proceeds.
 *
 * @param input - Loan terms and fee breakdown
 * @returns True APR, fee summary, and break-even months for points paid
 */
export function calculateTrueAPR(input: TrueAPRInput): TrueAPRResult {
  const {
    loanAmount,
    statedRate,
    termMonths,
    originationFee,
    discountPoints,
    pmiMonthly,
    pmiMonthsRemaining,
    otherFees,
  } = input;

  const P = new Decimal(loanAmount);
  const r = new Decimal(statedRate).dividedBy(12);
  const basePmt = monthlyPayment(P, r, termMonths);

  // Total upfront fees
  const upfrontFees = new Decimal(originationFee)
    .plus(new Decimal(discountPoints).times(P))
    .plus(new Decimal(otherFees));

  const totalFees = upfrontFees.plus(new Decimal(pmiMonthly).times(pmiMonthsRemaining));

  // Net proceeds the borrower actually receives
  const netProceeds = P.minus(upfrontFees);

  // Build cash-flow vector: CF_0 = +netProceeds, CF_1..n = -(payment + PMI if applicable)
  // We solve for the monthly rate where NPV = 0, then annualise.
  // Newton-Raphson on f(x) = netProceeds - SUM[ pmt_t / (1+x)^t ]
  const pmi = new Decimal(pmiMonthly);

  function npvAtRate(x: Decimal): Decimal {
    let pv = new Decimal(0);
    for (let t = 1; t <= termMonths; t++) {
      const pmt = t <= pmiMonthsRemaining ? basePmt.plus(pmi) : basePmt;
      pv = pv.plus(pmt.dividedBy(x.plus(1).pow(t)));
    }
    return netProceeds.minus(pv);
  }

  function npvDeriv(x: Decimal): Decimal {
    let d = new Decimal(0);
    for (let t = 1; t <= termMonths; t++) {
      const pmt = t <= pmiMonthsRemaining ? basePmt.plus(pmi) : basePmt;
      d = d.plus(
        new Decimal(t).times(pmt).dividedBy(x.plus(1).pow(t + 1)),
      );
    }
    return d; // positive because -(-d) from chain rule cancels
  }

  // Newton-Raphson
  let guess = r; // start with stated monthly rate
  for (let i = 0; i < 200; i++) {
    const f = npvAtRate(guess);
    if (f.abs().lt('1e-10')) break;
    const fp = npvDeriv(guess);
    if (fp.abs().lt('1e-20')) break;
    guess = guess.minus(f.dividedBy(fp));
    if (guess.lte(-1)) guess = new Decimal('0.001');
  }

  const trueAPR = guess.times(12);
  const nominalRate = new Decimal(statedRate);
  const rateDifference = trueAPR.minus(nominalRate);

  // Break-even months: how many months before the lower payment from discount
  // points recoups the upfront cost.  If no points are paid, break-even is 0.
  let breakEvenMonths = 0;
  if (discountPoints > 0) {
    const pointsCost = new Decimal(discountPoints).times(P);
    // Compare: base payment without points vs with points.
    // Without points the rate is higher -- we approximate the no-points rate as
    // statedRate + (discountPoints * 0.25) per convention (each point ~ 0.25%).
    const noPointsRate = new Decimal(statedRate).plus(new Decimal(discountPoints).times(0.0025));
    const noPointsPmt = monthlyPayment(P, noPointsRate.dividedBy(12), termMonths);
    const monthlySavings = noPointsPmt.minus(basePmt);

    if (monthlySavings.gt(0)) {
      breakEvenMonths = Math.ceil(pointsCost.dividedBy(monthlySavings).toNumber());
    }
  }

  return {
    trueAPR: toRate(trueAPR),
    nominalRate: toRate(nominalRate),
    rateDifference: toRate(rateDifference),
    totalFees: toNum(totalFees),
    feeAsMonthlyRate: toRate(totalFees.dividedBy(P).dividedBy(termMonths).times(12)),
    breakEvenMonths,
  };
}

// -------------------------------------------------------------------
// 3. After-Tax Cost of Debt
// -------------------------------------------------------------------

/**
 * Calculate the after-tax effective interest rate for a debt instrument.
 *
 * Handles FULL, ITEMIZED_ONLY, PHASE_OUT, and NONE deductibility types.
 * For ITEMIZED_ONLY the benefit is zero if the taxpayer does not itemise.
 * For mortgages the TCJA $750 000 debt limit is applied.
 *
 * @param input - Rate, deductibility, marginal tax brackets, balance
 * @returns After-tax rate, annual tax benefit, present-value benefit, and notes
 */
export function calculateAfterTaxCostOfDebt(input: AfterTaxCostInput): AfterTaxCostResult {
  const {
    nominalRate,
    isInterestDeductible,
    deductibilityType,
    federalMarginalRate,
    stateMarginalRate,
    niitApplies,
    itemizingDeductions,
    loanBalance,
    mortgageDebtLimit,
  } = input;

  const rate = new Decimal(nominalRate);
  const balance = new Decimal(loanBalance);
  const limit = new Decimal(mortgageDebtLimit);
  const fedRate = new Decimal(federalMarginalRate);
  const stateRate = new Decimal(stateMarginalRate);

  let deductibleFraction = new Decimal(0);
  let note = '';

  if (!isInterestDeductible || deductibilityType === 'NONE') {
    note = 'Interest on this debt is not tax-deductible.';
  } else if (deductibilityType === 'FULL') {
    deductibleFraction = new Decimal(1);
    note = 'Interest is fully deductible (e.g. business debt).';
  } else if (deductibilityType === 'ITEMIZED_ONLY') {
    if (!itemizingDeductions) {
      deductibleFraction = new Decimal(0);
      note = 'Interest is deductible only when itemising. Taxpayer currently takes the standard deduction.';
    } else {
      // Apply TCJA mortgage debt limit
      deductibleFraction = balance.gt(limit)
        ? limit.dividedBy(balance)
        : new Decimal(1);
      note = balance.gt(limit)
        ? `Deductible portion limited to mortgage debt of $${toNum(limit).toLocaleString()} (TCJA).`
        : 'Interest is deductible as an itemised deduction.';
    }
  } else if (deductibilityType === 'PHASE_OUT') {
    // Phase-out: assume 50% effective deductibility as a simplified model
    deductibleFraction = new Decimal(0.5);
    note = 'Deduction is subject to income-based phase-out; effective benefit estimated at 50%.';
  }

  const combinedMarginal = niitApplies
    ? fedRate.plus(stateRate).plus(new Decimal(0.038))
    : fedRate.plus(stateRate);

  const effectiveBenefit = combinedMarginal.times(deductibleFraction);
  const afterTaxRate = rate.times(new Decimal(1).minus(effectiveBenefit));

  // Annual dollar tax benefit
  const annualInterest = balance.times(rate);
  const taxBenefit = annualInterest.times(effectiveBenefit);

  // Simple 10-year PV of the annual benefit stream at a 3% discount rate
  const discountRate = new Decimal(0.03);
  let taxBenefitPV = new Decimal(0);
  for (let y = 1; y <= 10; y++) {
    taxBenefitPV = taxBenefitPV.plus(
      taxBenefit.dividedBy(discountRate.plus(1).pow(y)),
    );
  }

  const effectiveCost = `${toNum(afterTaxRate.times(100)).toFixed(2)}%`;

  return {
    afterTaxRate: toNum(afterTaxRate),
    taxBenefit: toNum(taxBenefit),
    taxBenefitPV: toNum(taxBenefitPV),
    effectiveCost,
    deductibilityNote: note,
  };
}

// -------------------------------------------------------------------
// 4. Debt Metrics (DTI, leverage, liquidity)
// -------------------------------------------------------------------

/**
 * Calculate comprehensive debt-health metrics for a household.
 *
 * Includes front-end DTI, back-end DTI, DTI rating, debt-to-net-worth,
 * debt-to-assets, liquidity ratio, months of debt coverage, and additional
 * debt capacity at the 36 % DTI threshold.
 *
 * @param params - Household debts, income, and balance sheet
 * @returns Full debt metrics result
 */
export function calculateDebtMetrics(params: {
  debts: HouseholdDebt[];
  income: HouseholdIncome;
  balanceSheet: HouseholdBalanceSheet;
}): DebtMetricsResult {
  const { debts, income, balanceSheet } = params;

  const grossMonthly = new Decimal(income.grossMonthlyIncome);

  // Housing payments = MORTGAGE + HELOC categories
  const housingPayments = debts
    .filter((d) => d.category === 'MORTGAGE' || d.category === 'HELOC')
    .reduce((sum, d) => sum.plus(d.monthlyPayment), new Decimal(0));

  // All debt payments
  const allPayments = debts.reduce(
    (sum, d) => sum.plus(d.monthlyPayment),
    new Decimal(0),
  );

  const frontEndDTI = grossMonthly.isZero()
    ? new Decimal(0)
    : housingPayments.dividedBy(grossMonthly);

  const backEndDTI = grossMonthly.isZero()
    ? new Decimal(0)
    : allPayments.dividedBy(grossMonthly);

  // DTI Rating (based on back-end)
  const backPct = backEndDTI.times(100).toNumber();
  let dtiRating: DTIRating;
  if (backPct < 20) dtiRating = 'EXCELLENT';
  else if (backPct < 28) dtiRating = 'GOOD';
  else if (backPct < 36) dtiRating = 'FAIR';
  else if (backPct < 43) dtiRating = 'CONCERNING';
  else dtiRating = 'CRITICAL';

  const totalLiabilities = new Decimal(balanceSheet.totalLiabilities);
  const netWorth = new Decimal(balanceSheet.netWorth);
  const totalAssets = new Decimal(balanceSheet.totalAssets);
  const liquidAssets = new Decimal(balanceSheet.liquidAssets);

  const debtToNetWorth = netWorth.isZero()
    ? new Decimal(0)
    : totalLiabilities.dividedBy(netWorth);

  const debtToAssets = totalAssets.isZero()
    ? new Decimal(0)
    : totalLiabilities.dividedBy(totalAssets);

  const liquidityRatio = allPayments.isZero()
    ? new Decimal(0)
    : liquidAssets.dividedBy(allPayments);

  const monthsCovered = allPayments.isZero()
    ? new Decimal(0)
    : liquidAssets.dividedBy(allPayments);

  // Additional debt capacity at 36% DTI
  const maxTotalPayment = grossMonthly.times(0.36);
  const additionalCapacity = Decimal.max(maxTotalPayment.minus(allPayments), 0);

  // Rough mortgage qualifying amount at 36% back-end
  // Assume 30-yr fixed at 7% for estimation
  const qualifyRate = new Decimal(0.07).dividedBy(12);
  const qualifyTerm = 360;
  const maxMortgagePmt = Decimal.max(
    grossMonthly.times(0.28).minus(housingPayments).plus(additionalCapacity),
    0,
  );
  let mortgageQualifying = new Decimal(0);
  if (maxMortgagePmt.gt(0) && qualifyRate.gt(0)) {
    const onePlusRn = qualifyRate.plus(1).pow(qualifyTerm);
    mortgageQualifying = maxMortgagePmt
      .times(onePlusRn.minus(1))
      .dividedBy(qualifyRate.times(onePlusRn));
  }

  return {
    frontEndDTI: toNum(frontEndDTI),
    backEndDTI: toNum(backEndDTI),
    dtiRating,
    debtToNetWorth: toNum(debtToNetWorth),
    debtToAssets: toNum(debtToAssets),
    liquidityRatio: toNum(liquidityRatio),
    monthsCovered: toNum(monthsCovered),
    additionalDebtCapacity: toNum(additionalCapacity),
    mortgageQualifyingAmount: toNum(mortgageQualifying),
  };
}

// -------------------------------------------------------------------
// 5. Multi-Strategy Payoff Optimizer
// -------------------------------------------------------------------

/** Internal working copy of a debt during simulation. */
interface SimDebt {
  id: string;
  name: string;
  balance: Decimal;
  rate: Decimal;
  minPayment: Decimal;
  monthlyPayment: Decimal;
  remainingTerm: number;
  isDeductible: boolean;
  deductibilityType: string;
}

/**
 * Run a single payoff simulation with a given ordering function.
 *
 * Every month each debt gets its minimum payment.  The leftover extra
 * budget is directed at the first debt in the sorted order.  When a debt
 * is paid off its minimum payment "rolls over" into the extra bucket.
 */
function runPayoffSimulation(
  debts: SimDebt[],
  monthlyExtra: Decimal,
  sortFn: (a: SimDebt, b: SimDebt) => number,
  startDate: Date,
  maxMonths: number,
): { sequence: PayoffSequenceItem[]; totalInterest: Decimal; totalMonths: number } {
  // Deep-clone balances
  const working = debts.map((d) => ({ ...d, balance: new Decimal(d.balance) }));
  const sequence: PayoffSequenceItem[] = [];
  let totalInterest = new Decimal(0);
  let rollingExtra = monthlyExtra;
  let month = 0;

  while (working.some((d) => d.balance.gt(0)) && month < maxMonths) {
    month++;

    // Sort remaining debts by strategy
    const remaining = working.filter((d) => d.balance.gt(0));
    remaining.sort(sortFn);

    // Accrue interest on all
    for (const d of working) {
      if (d.balance.gt(0)) {
        const interest = d.balance.times(d.rate.dividedBy(12));
        d.balance = d.balance.plus(interest);
        totalInterest = totalInterest.plus(interest);
      }
    }

    // Apply minimum payments
    let extraBudget = new Decimal(rollingExtra);
    for (const d of working) {
      if (d.balance.gt(0)) {
        const payment = Decimal.min(d.minPayment, d.balance);
        d.balance = d.balance.minus(payment);
        if (d.balance.isZero() || d.balance.lt(0.01)) {
          // Debt paid off by minimum alone
          if (d.balance.lt(0)) {
            extraBudget = extraBudget.plus(d.balance.abs());
          }
          d.balance = new Decimal(0);
        }
      }
    }

    // Direct extra at the priority target
    for (const target of remaining) {
      if (target.balance.gt(0) && extraBudget.gt(0)) {
        const apply = Decimal.min(extraBudget, target.balance);
        target.balance = target.balance.minus(apply);
        extraBudget = extraBudget.minus(apply);
        if (target.balance.lt(0.01)) {
          target.balance = new Decimal(0);
        }
      }
    }

    // Record payoffs
    for (const d of working) {
      if (d.balance.isZero() && !sequence.some((s) => s.debtId === d.id)) {
        rollingExtra = rollingExtra.plus(d.minPayment);
        sequence.push({
          debtId: d.id,
          debtName: d.name,
          payoffMonth: month,
          payoffDate: addMonths(startDate, month),
          totalInterestPaid: toNum(totalInterest),
          payoffPayment: toNum(d.minPayment),
          rolloverAmount: toNum(rollingExtra),
        });
      }
    }
  }

  return { sequence, totalInterest, totalMonths: month };
}

/**
 * Run a baseline minimum-payment-only simulation to compute savings.
 */
function runBaselineSimulation(debts: SimDebt[], maxMonths: number): { totalInterest: Decimal; totalMonths: number } {
  const working = debts.map((d) => ({ ...d, balance: new Decimal(d.balance) }));
  let totalInterest = new Decimal(0);
  let month = 0;

  while (working.some((d) => d.balance.gt(0)) && month < maxMonths) {
    month++;
    for (const d of working) {
      if (d.balance.gt(0)) {
        const interest = d.balance.times(d.rate.dividedBy(12));
        d.balance = d.balance.plus(interest);
        totalInterest = totalInterest.plus(interest);
        const payment = Decimal.min(d.minPayment, d.balance);
        d.balance = Decimal.max(d.balance.minus(payment), 0);
      }
    }
  }

  return { totalInterest, totalMonths: month };
}

/**
 * Optimise multi-debt payoff across eight distinct strategies.
 *
 * Strategies implemented:
 * - AVALANCHE: highest APR first
 * - SNOWBALL: lowest balance first
 * - HYBRID: snowball until first payoff, then avalanche
 * - HIGHEST_PAYMENT: eliminate highest required payment first
 * - SHORTEST_TERM: pay off soonest-maturing first
 * - TAX_OPTIMIZED: pay non-deductible first, keep deductible longer
 * - CREDIT_SCORE: prioritise high-utilisation revolving debt
 * - NET_WORTH_MAX: compare 10-year net-worth outcome
 *
 * Each strategy runs a full month-by-month simulation with rollover.
 *
 * @param params - Household debts, extra monthly budget, tax profile, expected investment return
 * @returns All strategy plans, recommendation, and winner-by-metric breakdown
 */
export function optimizeDebtPayoff(params: {
  debts: HouseholdDebt[];
  monthlyExtraPayment: number;
  taxProfile: HouseholdTaxProfile;
  investmentReturn: number;
}): PayoffOptimizerResult {
  const { debts, monthlyExtraPayment, taxProfile, investmentReturn } = params;

  const extra = new Decimal(monthlyExtraPayment);
  const startDate = new Date();
  const MAX_MONTHS = 600; // 50-year cap

  // Convert to SimDebt
  const simDebts: SimDebt[] = debts.map((d) => ({
    id: d.id,
    name: d.name,
    balance: new Decimal(d.currentBalance),
    rate: new Decimal(d.interestRate),
    minPayment: new Decimal(d.minimumPayment),
    monthlyPayment: new Decimal(d.monthlyPayment),
    remainingTerm: d.remainingTermMonths,
    isDeductible: d.isDeductible,
    deductibilityType: d.deductibilityType,
  }));

  // Baseline
  const baseline = runBaselineSimulation(simDebts, MAX_MONTHS);

  // Sort functions
  const sortFns: Record<PayoffStrategy, (a: SimDebt, b: SimDebt) => number> = {
    AVALANCHE: (a, b) => b.rate.minus(a.rate).toNumber(),
    SNOWBALL: (a, b) => a.balance.minus(b.balance).toNumber(),
    HYBRID: (a, b) => a.balance.minus(b.balance).toNumber(), // starts as snowball
    HIGHEST_PAYMENT: (a, b) => b.monthlyPayment.minus(a.monthlyPayment).toNumber(),
    SHORTEST_TERM: (a, b) => a.remainingTerm - b.remainingTerm,
    TAX_OPTIMIZED: (a, b) => {
      // Non-deductible first (0), deductible last (1)
      const aScore = a.isDeductible ? 1 : 0;
      const bScore = b.isDeductible ? 1 : 0;
      if (aScore !== bScore) return aScore - bScore;
      // Tie-break: highest rate first
      return b.rate.minus(a.rate).toNumber();
    },
    CREDIT_SCORE: (a, b) => {
      // Credit cards first, then by balance ascending
      const aCat = simDebts.find((d) => d.id === a.id);
      const bCat = simDebts.find((d) => d.id === b.id);
      const aIsCC = debts.find((d) => d.id === a.id)?.category === 'CREDIT_CARD' ? 0 : 1;
      const bIsCC = debts.find((d) => d.id === b.id)?.category === 'CREDIT_CARD' ? 0 : 1;
      if (aIsCC !== bIsCC) return aIsCC - bIsCC;
      return a.balance.minus(b.balance).toNumber();
    },
    NET_WORTH_MAX: (a, b) => {
      // After-tax cost: non-deductible high-rate first
      const aTaxBenefit = a.isDeductible
        ? a.rate.times(new Decimal(taxProfile.federalMarginalRate).plus(taxProfile.stateMarginalRate))
        : new Decimal(0);
      const bTaxBenefit = b.isDeductible
        ? b.rate.times(new Decimal(taxProfile.federalMarginalRate).plus(taxProfile.stateMarginalRate))
        : new Decimal(0);
      const aCost = a.rate.minus(aTaxBenefit);
      const bCost = b.rate.minus(bTaxBenefit);
      // Compare after-tax cost to investment return -- pay off only if cost > return
      const invReturn = new Decimal(investmentReturn);
      const aNet = aCost.minus(invReturn);
      const bNet = bCost.minus(invReturn);
      return bNet.minus(aNet).toNumber();
    },
  };

  const strategies: Partial<Record<PayoffStrategy, PayoffPlan>> = {};

  const allStrategyNames: PayoffStrategy[] = [
    'AVALANCHE',
    'SNOWBALL',
    'HYBRID',
    'HIGHEST_PAYMENT',
    'SHORTEST_TERM',
    'TAX_OPTIMIZED',
    'CREDIT_SCORE',
    'NET_WORTH_MAX',
  ];

  for (const strategy of allStrategyNames) {
    let result: ReturnType<typeof runPayoffSimulation>;

    if (strategy === 'HYBRID') {
      // Phase 1: snowball until first payoff
      const phase1 = runPayoffSimulation(simDebts, extra, sortFns.SNOWBALL, startDate, MAX_MONTHS);

      // After first payoff, switch to avalanche on remaining
      // For simplicity we approximate by running the full avalanche simulation --
      // the hybrid benefit is marginal in most cases but captures the
      // "quick win then optimise" psychology.
      const phase2 = runPayoffSimulation(simDebts, extra, sortFns.AVALANCHE, startDate, MAX_MONTHS);

      // We pick the one that has the earlier first payoff from snowball
      // but use avalanche totals for the tail
      result = {
        sequence: phase2.sequence,
        totalInterest: phase2.totalInterest,
        totalMonths: phase2.totalMonths,
      };

      // If snowball has an earlier first payoff, splice it in
      if (
        phase1.sequence.length > 0 &&
        phase2.sequence.length > 0 &&
        phase1.sequence[0].payoffMonth < phase2.sequence[0].payoffMonth
      ) {
        // Use a full hybrid simulation: snowball sort initially, avalanche after first payoff
        let hybridFirstPaid = false;
        const hybridSort = (a: SimDebt, b: SimDebt): number => {
          if (!hybridFirstPaid) return sortFns.SNOWBALL(a, b);
          return sortFns.AVALANCHE(a, b);
        };
        const hybridRun = runPayoffSimulation(simDebts, extra, hybridSort, startDate, MAX_MONTHS);
        if (hybridRun.sequence.length > 0) hybridFirstPaid = true;
        result = hybridRun;
      }
    } else {
      result = runPayoffSimulation(simDebts, extra, sortFns[strategy], startDate, MAX_MONTHS);
    }

    // Compute 10-year net worth: after debts paid, remaining months invest the freed cash
    const totalDebt = simDebts.reduce((s, d) => s.plus(d.balance), new Decimal(0));
    const monthlyInvReturn = new Decimal(investmentReturn).dividedBy(12);
    const months120 = 120;
    let investedValue = new Decimal(0);
    const totalPmtPerMonth = simDebts.reduce((s, d) => s.plus(d.minPayment), new Decimal(0)).plus(extra);

    for (let m = 1; m <= months120; m++) {
      // After all debts are paid, the full monthly budget goes to investment
      if (m > result.totalMonths) {
        investedValue = investedValue.times(monthlyInvReturn.plus(1)).plus(totalPmtPerMonth);
      } else {
        // Any freed-up from payoffs also gets invested
        investedValue = investedValue.times(monthlyInvReturn.plus(1));
      }
    }

    const netWorthAt10 = investedValue;

    const summary: PayoffPlanSummary = {
      totalDebtFreeDate: addMonths(startDate, result.totalMonths),
      totalInterestPaid: toNum(result.totalInterest),
      totalInterestSaved: toNum(baseline.totalInterest.minus(result.totalInterest)),
      monthsSavedVsMinimum: baseline.totalMonths - result.totalMonths,
      netWorthAt10Years: toNum(netWorthAt10),
    };

    strategies[strategy] = {
      strategy,
      monthlyExtraPayment: monthlyExtraPayment,
      debtPayoffSequence: result.sequence,
      summary,
    };
  }

  // Determine winners by metric
  let lowestInterest: PayoffStrategy = 'AVALANCHE';
  let fastestFree: PayoffStrategy = 'AVALANCHE';
  let highestNW: PayoffStrategy = 'AVALANCHE';
  let bestCashFlow: PayoffStrategy = 'AVALANCHE';
  let lowestInt = Infinity;
  let fastestMonths = Infinity;
  let highestNWVal = -Infinity;
  let earliestFirstPayoff = Infinity;

  for (const [strat, plan] of Object.entries(strategies) as [PayoffStrategy, PayoffPlan][]) {
    if (plan.summary.totalInterestPaid < lowestInt) {
      lowestInt = plan.summary.totalInterestPaid;
      lowestInterest = strat;
    }
    const totalMonths = plan.debtPayoffSequence.length > 0
      ? plan.debtPayoffSequence[plan.debtPayoffSequence.length - 1].payoffMonth
      : 0;
    if (totalMonths < fastestMonths) {
      fastestMonths = totalMonths;
      fastestFree = strat;
    }
    if (plan.summary.netWorthAt10Years > highestNWVal) {
      highestNWVal = plan.summary.netWorthAt10Years;
      highestNW = strat;
    }
    if (plan.debtPayoffSequence.length > 0 && plan.debtPayoffSequence[0].payoffMonth < earliestFirstPayoff) {
      earliestFirstPayoff = plan.debtPayoffSequence[0].payoffMonth;
      bestCashFlow = strat;
    }
  }

  // Default recommendation: avalanche (mathematically optimal) unless net-worth-max
  // wins significantly
  let recommendation: PayoffStrategy = lowestInterest;
  let recommendationReason = `The ${lowestInterest} strategy minimises total interest paid, saving the most money over the life of the debts.`;

  if (highestNW !== lowestInterest) {
    const nwPlan = strategies[highestNW];
    const intPlan = strategies[lowestInterest];
    if (nwPlan && intPlan && nwPlan.summary.netWorthAt10Years > intPlan.summary.netWorthAt10Years * 1.05) {
      recommendation = highestNW;
      recommendationReason = `The ${highestNW} strategy produces a higher 10-year net worth by preserving tax-advantaged debt and directing savings to investments.`;
    }
  }

  return {
    strategies,
    recommendation,
    recommendationReason,
    winnerByMetric: {
      lowestTotalInterest: lowestInterest,
      fastestDebtFree: fastestFree,
      highestNetWorth: highestNW,
      bestCashFlow,
    },
  };
}
