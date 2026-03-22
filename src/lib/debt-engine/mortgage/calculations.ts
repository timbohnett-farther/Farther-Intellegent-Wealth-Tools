/**
 * FP-DebtIQ -- Category 2: Mortgage Calculations
 *
 * Pure calculation functions for mortgage refinance analysis, home equity
 * access comparison, mortgage-vs-invest decision modelling, and PMI
 * elimination strategies.
 *
 * All monetary math uses Decimal.js.  Results are converted back to plain
 * numbers (2 d.p.) at the boundary.
 *
 * @module debt-engine/mortgage/calculations
 */

import Decimal from 'decimal.js';
import type {
  RefinanceCurrentLoan,
  RefinanceProposedLoan,
  RefinanceScenarioResult,
  HouseholdTaxProfile,
  HomeEquityInput,
  HomeEquityResult,
  HELOCOption,
  HomeEquityLoanOption,
  CashOutRefiOption,
  MortgageVsInvestInput,
  MortgageVsInvestResult,
  PMIInput,
  PMIResult,
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

/**
 * Standard amortising monthly payment.
 *
 * PMT = P * [r(1+r)^n] / [(1+r)^n - 1]
 */
function pmt(principal: Decimal, monthlyRate: Decimal, termMonths: number): Decimal {
  if (principal.isZero() || termMonths <= 0) return new Decimal(0);
  if (monthlyRate.isZero()) return principal.dividedBy(termMonths);

  const onePlusRn = monthlyRate.plus(1).pow(termMonths);
  return principal.times(monthlyRate.times(onePlusRn)).dividedBy(onePlusRn.minus(1));
}

/**
 * Total interest paid over the life of an amortising loan.
 */
function totalInterest(principal: Decimal, monthlyRate: Decimal, termMonths: number): Decimal {
  const payment = pmt(principal, monthlyRate, termMonths);
  return payment.times(termMonths).minus(principal);
}

/**
 * Combined marginal tax rate (federal + state, optionally including NIIT).
 */
function combinedMarginalRate(tax: HouseholdTaxProfile): Decimal {
  const base = new Decimal(tax.federalMarginalRate).plus(tax.stateMarginalRate);
  return tax.niitApplies ? base.plus(tax.niitRate) : base;
}

// -------------------------------------------------------------------
// 1. Mortgage Refinance Analysis
// -------------------------------------------------------------------

/**
 * Evaluate up to three refinance scenarios against the current mortgage.
 *
 * For each proposed loan the function calculates:
 * - New monthly payment and monthly change
 * - Break-even month count and date
 * - Total interest on current vs new loan
 * - Net savings after closing costs
 * - After-tax rates and NPV of the refinance decision
 * - A boolean recommendation with narrative reasoning
 *
 * @param params - Current loan, proposed loans, tax profile, expected years in home
 * @returns Array of scenario results (one per proposed loan)
 */
export function analyzeMortgageRefinance(params: {
  currentLoan: RefinanceCurrentLoan;
  proposedLoans: RefinanceProposedLoan[];
  taxProfile: HouseholdTaxProfile;
  yearsInHome: number;
}): RefinanceScenarioResult[] {
  const { currentLoan, proposedLoans, taxProfile, yearsInHome } = params;

  const curBalance = new Decimal(currentLoan.balance);
  const curRate = new Decimal(currentLoan.rate);
  const curRateMonthly = curRate.dividedBy(12);
  const curTerm = currentLoan.remainingTermMonths;
  const curPmt = new Decimal(currentLoan.monthlyPayment);
  const marginalRate = combinedMarginalRate(taxProfile);
  const horizonMonths = yearsInHome * 12;
  const startDate = new Date();

  const curTotalInterest = totalInterest(curBalance, curRateMonthly, curTerm);

  // After-tax current rate
  const afterTaxCurrentRate = taxProfile.itemizingDeductions
    ? curRate.times(new Decimal(1).minus(marginalRate))
    : curRate;

  return proposedLoans.map((proposed) => {
    const newRate = new Decimal(proposed.newRate);
    const newRateMonthly = newRate.dividedBy(12);
    const newTerm = proposed.newTermMonths;

    // Net closing costs = closingCosts + points - lender credit
    const closingCosts = new Decimal(proposed.closingCosts)
      .plus(new Decimal(proposed.discountPoints).times(curBalance))
      .minus(new Decimal(proposed.lenderCredit));

    const newMonthlyPmt = pmt(curBalance, newRateMonthly, newTerm);
    const monthlyChange = newMonthlyPmt.minus(curPmt);

    // Total interest on new loan
    const newTotalInterest = totalInterest(curBalance, newRateMonthly, newTerm);

    const totalInterestSavings = curTotalInterest.minus(newTotalInterest);
    const netSavingsAfterCosts = totalInterestSavings.minus(closingCosts);

    // Break-even: months until cumulative monthly savings recoup closing costs
    const monthlySavings = curPmt.minus(newMonthlyPmt);
    let breakEvenMonths: number;
    let willBreakEven: boolean;

    if (monthlySavings.lte(0)) {
      // Payment is higher or equal -- never breaks even on monthly basis
      // But could still save on total interest if term is shorter
      breakEvenMonths = horizonMonths + 1;
      willBreakEven = false;
    } else {
      breakEvenMonths = Math.ceil(closingCosts.dividedBy(monthlySavings).toNumber());
      willBreakEven = breakEvenMonths <= horizonMonths;
    }

    const breakEvenDate = addMonths(startDate, breakEvenMonths);

    // After-tax rates
    const afterTaxNewRate = taxProfile.itemizingDeductions
      ? newRate.times(new Decimal(1).minus(marginalRate))
      : newRate;

    // After-tax monthly savings
    const afterTaxSavings = taxProfile.itemizingDeductions
      ? monthlySavings.times(new Decimal(1).minus(marginalRate))
      : monthlySavings;

    // NPV of the refinance: discount monthly savings at after-tax current rate,
    // minus closing costs
    const discountMonthly = afterTaxCurrentRate.dividedBy(12);
    let npv = closingCosts.negated();
    const months = Math.min(newTerm, horizonMonths);
    for (let m = 1; m <= months; m++) {
      const saving = curPmt.minus(newMonthlyPmt);
      const discountFactor = discountMonthly.plus(1).pow(m);
      npv = npv.plus(saving.dividedBy(discountFactor));
    }

    // Recommendation
    const recommend = npv.gt(0) && willBreakEven;
    let recommendation: string;

    if (recommend) {
      if (breakEvenMonths <= 24) {
        recommendation = `Refinancing to the ${proposed.label} scenario is strongly recommended. Break-even occurs in ${breakEvenMonths} months with a positive NPV of $${toNum(npv).toLocaleString()}.`;
      } else {
        recommendation = `Refinancing to the ${proposed.label} scenario is worthwhile if you stay in the home at least ${breakEvenMonths} months. NPV is $${toNum(npv).toLocaleString()}.`;
      }
    } else if (npv.gt(0)) {
      recommendation = `The ${proposed.label} scenario has a positive NPV but break-even extends beyond your expected ${yearsInHome}-year horizon. Consider only if you may stay longer.`;
    } else {
      recommendation = `The ${proposed.label} scenario is not recommended. The costs exceed the savings over the analysis horizon.`;
    }

    return {
      scenario: proposed.label,
      newMonthlyPayment: toNum(newMonthlyPmt),
      monthlyChange: toNum(monthlyChange),
      breakEvenMonths,
      breakEvenDate,
      willBreakEven,
      totalInterestCurrent: toNum(curTotalInterest),
      totalInterestNew: toNum(newTotalInterest),
      totalInterestSavings: toNum(totalInterestSavings),
      netSavingsAfterCosts: toNum(netSavingsAfterCosts),
      afterTaxCurrentRate: toNum(afterTaxCurrentRate),
      afterTaxNewRate: toNum(afterTaxNewRate),
      afterTaxMonthlySavings: toNum(afterTaxSavings),
      afterTaxNPV: toNum(npv),
      recommendRefinance: recommend,
      recommendation,
    };
  });
}

// -------------------------------------------------------------------
// 2. Home Equity Analysis
// -------------------------------------------------------------------

/**
 * Analyse home equity access options: HELOC, home equity loan, and cash-out
 * refinance.
 *
 * Computes current equity / LTV, max borrowable at 80 % CLTV, and then
 * models each option with rate estimation, payment schedules, tax
 * deductibility, and opportunity cost.
 *
 * HELOC rates are modelled as prime + spread based on credit score.
 * Home equity loans use a fixed rate benchmark.
 * Cash-out refinances use current market-approximated rates.
 *
 * @param input - Home value, mortgage balance, credit score, purpose, amount, tax profile
 * @returns Comprehensive equity analysis with three option comparisons
 */
export function analyzeHomeEquity(input: HomeEquityInput): HomeEquityResult {
  const {
    homeValue,
    mortgageBalance,
    currentRate,
    creditScore,
    purpose,
    amountNeeded,
    taxProfile,
  } = input;

  const home = new Decimal(homeValue);
  const mortgage = new Decimal(mortgageBalance);
  const amount = new Decimal(amountNeeded);

  const currentEquity = home.minus(mortgage);
  const currentLTV = mortgage.dividedBy(home);

  // Max borrowable at 80% CLTV
  const maxTotalDebt = home.times(0.80);
  const maxBorrowable = Decimal.max(maxTotalDebt.minus(mortgage), 0);

  // ---- HELOC ----
  // Prime rate assumption: ~8.5%.  Spread by credit score.
  const primeRate = new Decimal(0.085);
  let helocSpread: Decimal;
  if (creditScore >= 760) helocSpread = new Decimal(-0.005);
  else if (creditScore >= 720) helocSpread = new Decimal(0.0);
  else if (creditScore >= 680) helocSpread = new Decimal(0.01);
  else if (creditScore >= 640) helocSpread = new Decimal(0.02);
  else helocSpread = new Decimal(0.035);

  const helocRate = primeRate.plus(helocSpread);
  const helocDrawPeriod = 10;
  const helocRepayPeriod = 20;

  // Interest-only payment during draw period
  const helocInterestOnly = amount.times(helocRate.dividedBy(12));

  // Fully amortised payment during repayment period
  const helocAmortized = pmt(amount, helocRate.dividedBy(12), helocRepayPeriod * 12);

  // Tax deductible per IRS Pub 936: only for home improvement / buy-build-improve
  const helocDeductible = purpose === 'HOME_IMPROVEMENT';

  const heloc: HELOCOption = {
    estimatedRate: toNum(helocRate),
    maxLine: toNum(maxBorrowable),
    drawPeriodYears: helocDrawPeriod,
    repaymentPeriodYears: helocRepayPeriod,
    interestDeductible: helocDeductible,
    monthlyInterestOnly: toNum(helocInterestOnly),
    fullyAmortized: toNum(helocAmortized),
  };

  // ---- Home Equity Loan ----
  // Fixed rate: typically prime + small spread for fixed products
  const heLoanRate = helocRate.plus(0.005); // slightly above HELOC
  const heLoanTerm = 180; // 15 years
  const heLoanPmt = pmt(amount, heLoanRate.dividedBy(12), heLoanTerm);
  const heLoanInterest = totalInterest(amount, heLoanRate.dividedBy(12), heLoanTerm);

  const homeEquityLoan: HomeEquityLoanOption = {
    estimatedRate: toNum(heLoanRate),
    termMonths: heLoanTerm,
    monthlyPayment: toNum(heLoanPmt),
    totalInterest: toNum(heLoanInterest),
    interestDeductible: helocDeductible, // same IRS rules apply
  };

  // ---- Cash-Out Refi ----
  // Rate: current rate + small premium (~0.25-0.5% for cash-out)
  const cashOutRate = new Decimal(currentRate).plus(0.00375);
  const newLoanAmount = mortgage.plus(amount);
  const cashOutTerm = 360; // 30 years
  const cashOutPmt = pmt(newLoanAmount, cashOutRate.dividedBy(12), cashOutTerm);
  const cashOutClosing = newLoanAmount.times(0.025); // ~2.5% closing costs
  const cashOutInterest = totalInterest(newLoanAmount, cashOutRate.dividedBy(12), cashOutTerm);

  // Break-even: if the cash-out payment is higher than current mortgage + HE loan,
  // how long to recoup closing costs?
  // Here we compare the total interest cost path
  const currentMtgPmt = pmt(mortgage, new Decimal(currentRate).dividedBy(12), 360);
  const combinedCurrentPmt = currentMtgPmt.plus(heLoanPmt);
  const cashOutMonthlySavings = combinedCurrentPmt.minus(cashOutPmt);
  let cashOutBreakEven: number;
  if (cashOutMonthlySavings.gt(0)) {
    cashOutBreakEven = Math.ceil(cashOutClosing.dividedBy(cashOutMonthlySavings).toNumber());
  } else {
    cashOutBreakEven = 0; // no break-even concept if payment is higher
  }

  const cashOutRefi: CashOutRefiOption = {
    estimatedRate: toNum(cashOutRate),
    newLoanAmount: toNum(newLoanAmount),
    newMonthlyPayment: toNum(cashOutPmt),
    closingCosts: toNum(cashOutClosing),
    breakEvenMonths: cashOutBreakEven,
    totalInterest: toNum(cashOutInterest),
  };

  // ---- Recommendation ----
  let recommendation: string;
  if (amount.gt(maxBorrowable)) {
    recommendation = 'The requested amount exceeds 80% CLTV. Consider a smaller amount or alternative funding.';
  } else if (helocDeductible && helocRate.lt(heLoanRate)) {
    recommendation = 'A HELOC is recommended for home improvement purposes due to the lowest rate, tax deductibility, and flexible draw schedule.';
  } else if (heLoanInterest.lt(cashOutInterest)) {
    recommendation = 'A home equity loan offers the lowest total interest cost with predictable fixed payments.';
  } else {
    recommendation = 'A cash-out refinance may simplify to a single payment but carries higher total interest. Compare all options carefully.';
  }

  // ---- Tax note ----
  const taxNote = helocDeductible
    ? 'Interest may be deductible under IRS Pub 936 because the funds are used to buy, build, or substantially improve the home securing the loan.'
    : `Interest on funds used for ${purpose.toLowerCase().replace(/_/g, ' ')} is generally NOT deductible under current IRS rules (post-TCJA).`;

  // ---- Opportunity cost ----
  const portfolioReturn = new Decimal(0.08); // assumed 8% market return
  const tenYearGrowth = amount.times(portfolioReturn.plus(1).pow(10)).minus(amount);
  const helocTotalCost = helocInterestOnly.times(helocDrawPeriod * 12).plus(
    helocAmortized.times(helocRepayPeriod * 12).minus(amount),
  );
  const netAdvantage = tenYearGrowth.minus(helocTotalCost);

  return {
    currentEquity: toNum(currentEquity),
    currentLTV: toNum(currentLTV),
    maxBorrowable: toNum(maxBorrowable),
    options: {
      heloc,
      homeEquityLoan,
      cashOutRefi,
    },
    recommendation,
    taxNote,
    opportunityCost: {
      ifInvestedInstead: toNum(tenYearGrowth),
      portfolioReturn: toNum(portfolioReturn),
      netAdvantage: netAdvantage.gt(0)
        ? `Investing the funds instead could yield $${toNum(netAdvantage).toLocaleString()} more over 10 years.`
        : `Accessing equity costs less than the projected investment return shortfall of $${toNum(netAdvantage.abs()).toLocaleString()}.`,
    },
  };
}

// -------------------------------------------------------------------
// 3. Mortgage vs. Invest
// -------------------------------------------------------------------

/**
 * Compare two paths for deploying extra monthly cash flow:
 *
 * **Path A** -- Pay down the mortgage faster, then invest the freed cash
 * after payoff.
 *
 * **Path B** -- Invest the extra money immediately and continue the normal
 * mortgage payment schedule.
 *
 * Produces net-worth comparisons at 5, 10, 20, and 30-year horizons, a
 * crossover year, sensitivity analysis across return assumptions, the
 * break-even investment return, and a confidence-level assessment.
 *
 * @param input - Mortgage details, extra capacity, return assumptions, tax profile
 * @returns Full comparison of both paths with recommendation
 */
export function analyzeMortgageVsInvest(input: MortgageVsInvestInput): MortgageVsInvestResult {
  const {
    mortgageBalance,
    mortgageRate,
    remainingTermMonths,
    monthlyExtraCapacity,
    investmentReturn,
    taxProfile,
    timeHorizon,
    riskTolerance,
  } = input;

  const balance = new Decimal(mortgageBalance);
  const rate = new Decimal(mortgageRate);
  const rateMonthly = rate.dividedBy(12);
  const extra = new Decimal(monthlyExtraCapacity);
  const invReturn = new Decimal(investmentReturn);
  const invMonthly = invReturn.dividedBy(12);
  const marginalRate = combinedMarginalRate(taxProfile);
  const basePmt = pmt(balance, rateMonthly, remainingTermMonths);
  const startDate = new Date();

  const horizons = [5, 10, 20, 30];
  const maxMonths = Math.max(timeHorizon * 12, 360);

  // ----- Path A: Extra payments to mortgage, invest after payoff -----
  let pathABalance = new Decimal(balance);
  let pathAInvestment = new Decimal(0);
  let pathATotalInterest = new Decimal(0);
  let pathAPayoffMonth = remainingTermMonths;
  let pathAPaidOff = false;
  const pathANW: Record<number, number> = {};

  for (let m = 1; m <= maxMonths; m++) {
    if (!pathAPaidOff) {
      const interest = pathABalance.times(rateMonthly);
      pathATotalInterest = pathATotalInterest.plus(interest);
      pathABalance = pathABalance.plus(interest);

      const totalPmt = Decimal.min(basePmt.plus(extra), pathABalance);
      pathABalance = pathABalance.minus(totalPmt);

      if (pathABalance.lte(0.01)) {
        pathABalance = new Decimal(0);
        pathAPaidOff = true;
        pathAPayoffMonth = m;
      }
    } else {
      // Mortgage is paid off -- invest full (basePmt + extra)
      pathAInvestment = pathAInvestment
        .times(invMonthly.plus(1))
        .plus(basePmt.plus(extra));
    }

    const yearMark = m / 12;
    if (horizons.includes(yearMark)) {
      // Net worth = investment + home equity gained (mortgage reduction)
      const equityGain = balance.minus(pathABalance);
      pathANW[yearMark] = toNum(pathAInvestment.plus(equityGain));
    }
  }

  // Interest saved vs normal schedule
  const normalTotalInterest = totalInterest(balance, rateMonthly, remainingTermMonths);
  const interestSaved = normalTotalInterest.minus(pathATotalInterest);
  const afterTaxInterestSaved = taxProfile.itemizingDeductions
    ? interestSaved.times(new Decimal(1).minus(marginalRate))
    : interestSaved;
  const monthsSaved = remainingTermMonths - pathAPayoffMonth;

  // ----- Path B: Invest extra, continue normal mortgage -----
  let pathBBalance = new Decimal(balance);
  let pathBInvestment = new Decimal(0);
  const pathBNW: Record<number, number> = {};
  const pathBInvValues: Record<number, number> = {};

  for (let m = 1; m <= maxMonths; m++) {
    // Mortgage normal amortisation
    if (pathBBalance.gt(0)) {
      const interest = pathBBalance.times(rateMonthly);
      pathBBalance = pathBBalance.plus(interest);
      const pay = Decimal.min(basePmt, pathBBalance);
      pathBBalance = Decimal.max(pathBBalance.minus(pay), 0);
    }

    // Invest the extra
    pathBInvestment = pathBInvestment
      .times(invMonthly.plus(1))
      .plus(extra);

    const yearMark = m / 12;
    if (horizons.includes(yearMark)) {
      const equityGain = balance.minus(pathBBalance);
      pathBNW[yearMark] = toNum(pathBInvestment.plus(equityGain));
      pathBInvValues[yearMark] = toNum(pathBInvestment);
    }
  }

  const portfolioAtHorizon = toNum(pathBInvestment);

  // Capital gains tax on investment (simplified: 15% LTCG on gains)
  const totalContributed = extra.times(maxMonths);
  const gains = pathBInvestment.minus(totalContributed);
  const afterTaxGains = gains.gt(0)
    ? gains.times(new Decimal(1).minus(0.15))
    : gains;

  // ----- Net worth difference -----
  const netWorthDifference: Record<number, number> = {};
  for (const h of horizons) {
    const aNW = pathANW[h] ?? 0;
    const bNW = pathBNW[h] ?? 0;
    netWorthDifference[h] = toNum(new Decimal(bNW).minus(aNW));
  }

  // ----- Crossover year -----
  let crossoverYear: number | null = null;
  for (let y = 1; y <= 30; y++) {
    const m = y * 12;
    // Approximate by interpolation from horizons or re-simulate
    // We check each year boundary
    if (y <= maxMonths / 12) {
      const aNW = pathANW[y];
      const bNW = pathBNW[y];
      if (aNW !== undefined && bNW !== undefined && bNW > aNW && crossoverYear === null) {
        crossoverYear = y;
      }
    }
  }

  // If not found in horizons, do a coarse search
  if (crossoverYear === null) {
    // Re-simulate year by year (lightweight)
    let aBalSim = new Decimal(balance);
    let aInvSim = new Decimal(0);
    let aPaidOff = false;
    let bBalSim = new Decimal(balance);
    let bInvSim = new Decimal(0);

    for (let m = 1; m <= maxMonths; m++) {
      // Path A
      if (!aPaidOff) {
        const int = aBalSim.times(rateMonthly);
        aBalSim = aBalSim.plus(int).minus(Decimal.min(basePmt.plus(extra), aBalSim.plus(int)));
        if (aBalSim.lte(0.01)) { aBalSim = new Decimal(0); aPaidOff = true; }
      } else {
        aInvSim = aInvSim.times(invMonthly.plus(1)).plus(basePmt.plus(extra));
      }

      // Path B
      if (bBalSim.gt(0)) {
        const int = bBalSim.times(rateMonthly);
        bBalSim = Decimal.max(bBalSim.plus(int).minus(basePmt), 0);
      }
      bInvSim = bInvSim.times(invMonthly.plus(1)).plus(extra);

      if (m % 12 === 0) {
        const aNWYear = aInvSim.plus(balance.minus(aBalSim));
        const bNWYear = bInvSim.plus(balance.minus(bBalSim));
        if (bNWYear.gt(aNWYear) && crossoverYear === null) {
          crossoverYear = m / 12;
        }
      }
    }
  }

  // ----- Recommendation -----
  const horizonKey = horizons.includes(timeHorizon) ? timeHorizon : 10;
  const diff = netWorthDifference[horizonKey] ?? 0;
  let recommendation: 'PAY_MORTGAGE' | 'INVEST' | 'SPLIT';
  let confidenceLevel: 'STRONG' | 'MODERATE' | 'CLOSE_CALL';

  const diffPct = balance.isZero() ? 0 : Math.abs(diff) / balance.toNumber();

  if (diff > 0) {
    recommendation = 'INVEST';
    confidenceLevel = diffPct > 0.15 ? 'STRONG' : diffPct > 0.05 ? 'MODERATE' : 'CLOSE_CALL';
  } else if (diff < 0) {
    recommendation = 'PAY_MORTGAGE';
    confidenceLevel = diffPct > 0.15 ? 'STRONG' : diffPct > 0.05 ? 'MODERATE' : 'CLOSE_CALL';
  } else {
    recommendation = 'SPLIT';
    confidenceLevel = 'CLOSE_CALL';
  }

  // Low risk tolerance nudges toward mortgage payoff
  if (riskTolerance < 0.3 && recommendation === 'INVEST' && confidenceLevel !== 'STRONG') {
    recommendation = 'SPLIT';
    confidenceLevel = 'CLOSE_CALL';
  }

  // ----- Sensitivity analysis -----
  const returnScenarios = [0.04, 0.06, 0.08, 0.10, 0.12];
  const sensitivity: MortgageVsInvestResult['sensitivityToReturn'] = returnScenarios.map(
    (r) => {
      const scenarioInvMonthly = new Decimal(r).dividedBy(12);
      let sBal = new Decimal(balance);
      let sInv = new Decimal(0);
      let sPaidOff = false;
      let sAInv = new Decimal(0);
      let sBBal = new Decimal(balance);
      let sBInv = new Decimal(0);

      const months = horizonKey * 12;
      for (let m = 1; m <= months; m++) {
        // Path A
        if (!sPaidOff) {
          const int = sBal.times(rateMonthly);
          sBal = sBal.plus(int);
          const pay = Decimal.min(basePmt.plus(extra), sBal);
          sBal = Decimal.max(sBal.minus(pay), 0);
          if (sBal.lte(0.01)) { sBal = new Decimal(0); sPaidOff = true; }
        } else {
          sAInv = sAInv.times(scenarioInvMonthly.plus(1)).plus(basePmt.plus(extra));
        }
        // Path B
        if (sBBal.gt(0)) {
          const int = sBBal.times(rateMonthly);
          sBBal = Decimal.max(sBBal.plus(int).minus(basePmt), 0);
        }
        sBInv = sBInv.times(scenarioInvMonthly.plus(1)).plus(extra);
      }

      const aNW = sAInv.plus(balance.minus(sBal));
      const bNW = sBInv.plus(balance.minus(sBBal));
      const npvDiff = bNW.minus(aNW);

      return {
        investmentReturn: r,
        recommendation: npvDiff.gt(0) ? 'INVEST' as const : 'PAY_MORTGAGE' as const,
        npvDifference: toNum(npvDiff),
      };
    },
  );

  // ----- Break-even investment return -----
  // Binary search for the return at which investing and paying are equal
  let lo = new Decimal(0);
  let hi = new Decimal(0.25);
  for (let iter = 0; iter < 60; iter++) {
    const mid = lo.plus(hi).dividedBy(2);
    const midMonthly = mid.dividedBy(12);
    const months = horizonKey * 12;

    let aBal = new Decimal(balance);
    let aInv = new Decimal(0);
    let aPO = false;
    let bBal = new Decimal(balance);
    let bInv = new Decimal(0);

    for (let m = 1; m <= months; m++) {
      if (!aPO) {
        const int = aBal.times(rateMonthly);
        aBal = aBal.plus(int);
        const pay = Decimal.min(basePmt.plus(extra), aBal);
        aBal = Decimal.max(aBal.minus(pay), 0);
        if (aBal.lte(0.01)) { aBal = new Decimal(0); aPO = true; }
      } else {
        aInv = aInv.times(midMonthly.plus(1)).plus(basePmt.plus(extra));
      }
      if (bBal.gt(0)) {
        const int = bBal.times(rateMonthly);
        bBal = Decimal.max(bBal.plus(int).minus(basePmt), 0);
      }
      bInv = bInv.times(midMonthly.plus(1)).plus(extra);
    }

    const aNW = aInv.plus(balance.minus(aBal));
    const bNW = bInv.plus(balance.minus(bBal));

    if (bNW.gt(aNW)) {
      hi = mid;
    } else {
      lo = mid;
    }
  }
  const breakEvenReturn = lo.plus(hi).dividedBy(2);

  // ----- Narrative -----
  let narrative: string;
  if (recommendation === 'INVEST') {
    narrative = `At a projected ${(investmentReturn * 100).toFixed(1)}% investment return, investing extra cash flow is expected to produce $${Math.abs(diff).toLocaleString()} more in net worth over ${horizonKey} years compared to accelerating mortgage payoff. The break-even investment return is ${toNum(breakEvenReturn.times(100)).toFixed(2)}%.`;
  } else if (recommendation === 'PAY_MORTGAGE') {
    narrative = `Paying down the mortgage is the better path given the ${(investmentReturn * 100).toFixed(1)}% assumed return. You would need at least a ${toNum(breakEvenReturn.times(100)).toFixed(2)}% return to justify investing instead. The psychological benefit of eliminating debt ${monthsSaved > 12 ? `${Math.floor(monthsSaved / 12)} years` : `${monthsSaved} months`} early adds further value.`;
  } else {
    narrative = `The two paths are close to break-even. Splitting the extra cash flow between mortgage payoff and investing provides a balanced approach that captures some of the upside of each strategy.`;
  }

  return {
    pathA_MortgageFree: {
      mortgagePayoffDate: addMonths(startDate, pathAPayoffMonth),
      monthsSaved,
      interestSaved: toNum(interestSaved),
      afterTaxInterestSaved: toNum(afterTaxInterestSaved),
      investmentAfterPayoff: toNum(pathAInvestment),
      netWorthAt: pathANW,
    },
    pathB_Invest: {
      investmentValue: pathBInvValues,
      portfolioAtHorizon,
      afterTaxGains: toNum(afterTaxGains),
      netWorthAt: pathBNW,
    },
    netWorthDifference,
    crossoverYear,
    recommendation,
    confidenceLevel,
    sensitivityToReturn: sensitivity,
    breakEvenInvestmentReturn: toNum(breakEvenReturn),
    narrative,
  };
}

// -------------------------------------------------------------------
// 4. PMI Elimination Analysis
// -------------------------------------------------------------------

/**
 * Analyse strategies to eliminate private mortgage insurance (PMI).
 *
 * Computes current LTV, principal needed to reach 80 % LTV, months to
 * automatic removal via normal amortisation, and two acceleration
 * strategies:
 *
 * 1. **Lump sum** -- one-time principal payment, months saved, PMI saved, ROI
 * 2. **Extra monthly payment** -- added monthly amount, break-even analysis
 *
 * Also evaluates whether requesting a new appraisal could accelerate
 * removal if the home may have appreciated.
 *
 * @param input - Home value, balance, PMI amount, payment details
 * @returns Full PMI elimination analysis
 */
export function analyzePMIElimination(input: PMIInput): PMIResult {
  const {
    homeValue,
    currentBalance,
    monthlyPMI,
    pmiRate,
    monthlyPayment,
    lumpSumAvailable,
  } = input;

  const home = new Decimal(homeValue);
  const balance = new Decimal(currentBalance);
  const pmiMonthly = new Decimal(monthlyPMI);
  const payment = new Decimal(monthlyPayment);
  const lumpSum = new Decimal(lumpSumAvailable);

  const currentLTV = balance.dividedBy(home);
  const targetLTV = new Decimal(0.80);
  const targetBalance = home.times(targetLTV);
  const principalNeeded = Decimal.max(balance.minus(targetBalance), 0);

  // ---- Months to automatic PMI removal via normal amortisation ----
  // We need to figure out the rate from PMI rate and payment structure.
  // PMI auto-removes at 78% LTV per HPA.  We simulate normal payments
  // until balance <= 78% of original home value (use 80% as the request
  // trigger, 78% for automatic).
  // Approximate the mortgage rate from pmiRate context: we back-derive
  // from monthly payment and balance.  For simplicity we iterate.
  const autoTarget = home.times(0.78); // HPA automatic at 78%
  const requestTarget = home.times(0.80); // borrower-initiated at 80%

  // Estimate monthly mortgage rate by solving PMT formula in reverse.
  // Newton-Raphson to find monthly rate from payment, balance, and approximate term.
  // Approximate remaining term as 300 months (25 years) if not given.
  const approxTerm = 360;
  let rGuess = new Decimal(0.005); // ~6% annual
  for (let i = 0; i < 100; i++) {
    const calcPmt = pmt(balance, rGuess, approxTerm);
    const diff = calcPmt.minus(payment);
    if (diff.abs().lt(0.01)) break;
    // Numerical derivative
    const rBump = rGuess.plus(0.00001);
    const calcPmtBump = pmt(balance, rBump, approxTerm);
    const deriv = calcPmtBump.minus(calcPmt).dividedBy(0.00001);
    if (deriv.abs().lt(1e-10)) break;
    rGuess = rGuess.minus(diff.dividedBy(deriv));
    if (rGuess.lte(0)) rGuess = new Decimal(0.001);
  }

  const mortgageRate = rGuess;

  // Simulate normal amortisation to find when balance hits 78% and 80%
  let simBalance = new Decimal(balance);
  let monthsToAuto = 0;
  let monthsToRequest = 0;
  let foundRequest = false;
  let foundAuto = false;

  for (let m = 1; m <= approxTerm; m++) {
    const interest = simBalance.times(mortgageRate);
    const prin = payment.minus(interest);
    simBalance = Decimal.max(simBalance.minus(prin), 0);

    if (!foundRequest && simBalance.lte(requestTarget)) {
      monthsToRequest = m;
      foundRequest = true;
    }
    if (!foundAuto && simBalance.lte(autoTarget)) {
      monthsToAuto = m;
      foundAuto = true;
      break;
    }
  }

  if (!foundAuto) monthsToAuto = approxTerm;
  if (!foundRequest) monthsToRequest = monthsToAuto;

  // ---- Lump sum strategy ----
  const lumpSumNeeded = principalNeeded;
  const monthsSavedLump = monthsToRequest; // if paid now, PMI goes away immediately
  const pmiSavedLump = pmiMonthly.times(monthsToRequest);
  const roiOnLumpSum = lumpSumNeeded.isZero()
    ? new Decimal(0)
    : pmiSavedLump.dividedBy(lumpSumNeeded);

  // ---- Extra payment strategy ----
  // How much extra per month to reach 80% LTV in ~12-24 months?
  // Solve: how many months at (payment + X) to reduce balance to targetBalance
  // We simulate to find the extra needed to hit target in 24 months as a baseline,
  // then compute break-even.
  let extraNeeded = new Decimal(0);
  if (principalNeeded.gt(0)) {
    // Simple approach: principalNeeded / 24 months, adjusted for interest accrual
    // More precise: iterate
    let lo = new Decimal(0);
    let hi = principalNeeded; // worst case: all in 1 month
    for (let iter = 0; iter < 60; iter++) {
      const mid = lo.plus(hi).dividedBy(2);
      let bal = new Decimal(balance);
      let months = 0;
      for (let m = 1; m <= approxTerm; m++) {
        const int = bal.times(mortgageRate);
        bal = Decimal.max(bal.minus(payment.minus(int)).minus(mid), 0);
        if (bal.lte(requestTarget)) {
          months = m;
          break;
        }
      }
      if (months <= 24) {
        hi = mid;
      } else {
        lo = mid;
      }
    }
    extraNeeded = lo.plus(hi).dividedBy(2);
  }

  // Break-even: months of PMI payments to equal the extra payments made
  // (extra * months_to_hit_80) vs (pmi * months_to_hit_80)
  // Once PMI is removed, savings = pmiMonthly per month.
  // Cost = extra per month for N months, then saved pmiMonthly per month after.
  // breakEven = totalExtraPaid / pmiMonthly
  let breakEvenMonths = 0;
  if (extraNeeded.gt(0) && pmiMonthly.gt(0)) {
    // Months paying extra
    let bal = new Decimal(balance);
    let monthsToTarget = 0;
    for (let m = 1; m <= approxTerm; m++) {
      const int = bal.times(mortgageRate);
      bal = Decimal.max(bal.minus(payment.minus(int)).minus(extraNeeded), 0);
      if (bal.lte(requestTarget)) {
        monthsToTarget = m;
        break;
      }
    }
    const totalExtraPaid = extraNeeded.times(monthsToTarget);
    breakEvenMonths = Math.ceil(totalExtraPaid.dividedBy(pmiMonthly).toNumber());
  }

  const extraPmiSavings = pmiMonthly.times(
    Decimal.max(new Decimal(monthsToRequest).minus(breakEvenMonths > 0 ? breakEvenMonths : monthsToRequest), 0),
  );

  // ---- Appraisal appeal ----
  // Recommend appraisal if the home may have appreciated enough that
  // current balance / new appraised value <= 80%.
  // Threshold: if balance / (homeValue * 1.05) <= 0.80, appreciation may help
  const appreciatedValue = home.times(1.05);
  const appealLTV = balance.dividedBy(appreciatedValue);
  const appealAppraisal = appealLTV.lte(0.80);

  // ---- Recommendation ----
  let recommendation: string;
  if (principalNeeded.isZero()) {
    recommendation = 'Your LTV is already at or below 80%. Contact your lender to request PMI removal.';
  } else if (lumpSum.gte(lumpSumNeeded) && roiOnLumpSum.gt(0.1)) {
    recommendation = `A lump sum payment of $${toNum(lumpSumNeeded).toLocaleString()} is recommended. This eliminates PMI immediately and produces an effective ROI of ${toNum(roiOnLumpSum.times(100)).toFixed(1)}% from PMI savings alone.`;
  } else if (appealAppraisal) {
    recommendation = 'Consider requesting a new home appraisal. If the home has appreciated ~5% or more, PMI may be removable without additional principal payments.';
  } else {
    recommendation = `Increase your monthly payment by $${toNum(extraNeeded).toLocaleString()} to reach 80% LTV faster. This approach breaks even in ${breakEvenMonths} months of PMI savings.`;
  }

  return {
    currentLTV: toNum(currentLTV),
    targetLTVForRemoval: toNum(targetLTV),
    principalNeeded: toNum(principalNeeded),
    monthsToAutomaticRemoval: monthsToAuto,
    lumpSumStrategy: {
      lumpSumNeeded: toNum(lumpSumNeeded),
      monthsSaved: monthsSavedLump,
      pmiSaved: toNum(pmiSavedLump),
      roiOnLumpSum: toNum(roiOnLumpSum),
    },
    extraPaymentStrategy: {
      extraMonthlyNeeded: toNum(extraNeeded),
      breakEvenMonths,
      pmiSavings: toNum(extraPmiSavings),
    },
    recommendation,
    appealAppraisal,
  };
}
