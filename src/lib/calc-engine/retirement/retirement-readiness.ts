/**
 * Retirement readiness analysis.
 *
 * Projects a client's portfolio to retirement age, calculates sustainable
 * withdrawal income, combines with Social Security and pension, and
 * compares against desired retirement income to determine readiness.
 *
 * Key calculations:
 *   - Portfolio projection using FV with annual contributions
 *   - Sustainable withdrawal rate (4% rule baseline, adjusted for horizon)
 *   - Income gap analysis (desired vs. projected)
 *   - Portfolio depletion year (how long portfolio lasts)
 *   - Additional monthly savings needed to close any gap
 *
 * All monetary math uses Decimal.js for precision.
 * Pure function — no side effects, no database calls.
 */

import Decimal from 'decimal.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RetirementReadinessInput {
  currentAge: number;
  retirementAge: number;
  currentPortfolio: number;
  annualContributions: number;
  estimatedSocialSecurity: number;
  estimatedPension: number;
  desiredRetirementIncome: number;
  inflationRate: number;
  preRetirementReturn: number;
  postRetirementReturn: number;
  planningHorizonAge: number;
}

export interface RetirementReadinessResult {
  isReady: boolean;
  portfolioAtRetirement: number;
  annualIncomeFromPortfolio: number;
  totalAnnualRetirementIncome: number;
  incomeReplacementRatio: number;
  incomeGap: number;
  yearsPortfolioLasts: number;
  additionalMonthlySavingsNeeded: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Baseline safe withdrawal rate (Bengen's 4% rule) */
const BASELINE_WITHDRAWAL_RATE = new Decimal('0.04');

/** Planning horizon used for the baseline 4% rule (30 years) */
const BASELINE_HORIZON_YEARS = 30;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Project a portfolio forward to a target year using compound growth
 * with annual contributions.
 *
 * FV = PV * (1 + r)^n + PMT * [((1 + r)^n - 1) / r]
 *
 * Contributions are assumed to be made at the end of each year.
 */
function projectPortfolio(
  currentBalance: Decimal,
  annualContribution: Decimal,
  annualReturn: Decimal,
  years: number,
): Decimal {
  if (years <= 0) {
    return currentBalance;
  }

  const onePlusR = annualReturn.plus(1);
  const growthFactor = onePlusR.pow(years);

  // FV of lump sum
  const fvLumpSum = currentBalance.times(growthFactor);

  // FV of annuity (ordinary annuity — contributions at end of each year)
  let fvContributions: Decimal;
  if (annualReturn.isZero()) {
    fvContributions = annualContribution.times(years);
  } else {
    fvContributions = annualContribution.times(
      growthFactor.minus(1).dividedBy(annualReturn),
    );
  }

  return fvLumpSum.plus(fvContributions);
}

/**
 * Calculate the sustainable annual withdrawal rate adjusted for the
 * actual planning horizon.
 *
 * The 4% rule is calibrated for a 30-year horizon. For longer horizons
 * we reduce the rate; for shorter horizons we increase it.
 *
 * Adjustment: rate = baseline * (baselineHorizon / actualHorizon)
 *
 * The result is clamped between 2% and 7% to stay within reasonable
 * guardrails.
 */
function adjustedWithdrawalRate(yearsInRetirement: number): Decimal {
  if (yearsInRetirement <= 0) {
    return new Decimal(0);
  }

  const adjusted = BASELINE_WITHDRAWAL_RATE.times(
    new Decimal(BASELINE_HORIZON_YEARS).dividedBy(new Decimal(yearsInRetirement)),
  );

  // Clamp between 2% and 7%
  return Decimal.max(new Decimal('0.02'), Decimal.min(adjusted, new Decimal('0.07')));
}

/**
 * Calculate how many years a portfolio lasts given annual withdrawals
 * (adjusted for inflation) and a post-retirement rate of return.
 *
 * Each year:
 *   1. Grow portfolio by postRetirementReturn
 *   2. Withdraw desired income (inflation-adjusted)
 *   3. If portfolio <= 0, it's depleted
 *
 * Returns the number of complete years until depletion, capped at 100 years.
 */
function calculatePortfolioLongevity(
  portfolioAtRetirement: Decimal,
  annualWithdrawal: Decimal,
  inflationRate: Decimal,
  postRetirementReturn: Decimal,
  maxYears: number,
): number {
  if (portfolioAtRetirement.lte(0)) {
    return 0;
  }

  if (annualWithdrawal.lte(0)) {
    return maxYears;
  }

  let balance = portfolioAtRetirement;
  let withdrawal = annualWithdrawal;

  for (let year = 1; year <= maxYears; year++) {
    // Grow the portfolio
    balance = balance.times(postRetirementReturn.plus(1));

    // Withdraw (inflation-adjusted)
    balance = balance.minus(withdrawal);

    if (balance.lte(0)) {
      return year;
    }

    // Inflate the withdrawal for next year
    withdrawal = withdrawal.times(inflationRate.plus(1));
  }

  return maxYears;
}

/**
 * Calculate the additional annual savings needed to close a retirement
 * income gap. Works backwards from the gap to determine the annuity
 * contribution required during the accumulation phase.
 *
 * The gap is the annual income shortfall. We need a portfolio supplement
 * that can produce this gap via the withdrawal rate.
 *
 * additionalPortfolioNeeded = gap / withdrawalRate
 * additionalAnnualSavings = FV_annuity_solve_for_PMT(additionalPortfolioNeeded, rate, years)
 *
 * PMT = FV * r / ((1 + r)^n - 1)
 */
function calculateAdditionalSavingsNeeded(
  annualGap: Decimal,
  withdrawalRate: Decimal,
  annualReturn: Decimal,
  yearsToRetirement: number,
): Decimal {
  if (annualGap.lte(0) || yearsToRetirement <= 0) {
    return new Decimal(0);
  }

  if (withdrawalRate.lte(0)) {
    return new Decimal(0);
  }

  // Portfolio supplement needed to produce the annual gap
  const additionalPortfolioNeeded = annualGap.dividedBy(withdrawalRate);

  // Solve for PMT: FV = PMT * [((1+r)^n - 1) / r]
  // PMT = FV * r / ((1+r)^n - 1)
  if (annualReturn.isZero()) {
    // Simple: PMT = FV / n
    return additionalPortfolioNeeded.dividedBy(new Decimal(yearsToRetirement));
  }

  const onePlusR = annualReturn.plus(1);
  const growthFactor = onePlusR.pow(yearsToRetirement);
  const annualSavings = additionalPortfolioNeeded.times(annualReturn).dividedBy(
    growthFactor.minus(1),
  );

  return annualSavings;
}

// ---------------------------------------------------------------------------
// Main calculation
// ---------------------------------------------------------------------------

/**
 * Perform a comprehensive retirement readiness analysis.
 *
 * @param input - Retirement readiness calculation inputs
 * @returns Detailed readiness result
 */
export function calculateRetirementReadiness(
  input: RetirementReadinessInput,
): RetirementReadinessResult {
  const currentAge = input.currentAge;
  const retirementAge = input.retirementAge;
  const planningHorizonAge = input.planningHorizonAge;
  const yearsToRetirement = Math.max(retirementAge - currentAge, 0);
  const yearsInRetirement = Math.max(planningHorizonAge - retirementAge, 0);

  const currentPortfolio = new Decimal(input.currentPortfolio);
  const annualContributions = new Decimal(input.annualContributions);
  const estimatedSS = new Decimal(input.estimatedSocialSecurity);
  const estimatedPension = new Decimal(input.estimatedPension);
  const desiredIncome = new Decimal(input.desiredRetirementIncome);
  const inflationRate = new Decimal(input.inflationRate);
  const preRetirementReturn = new Decimal(input.preRetirementReturn);
  const postRetirementReturn = new Decimal(input.postRetirementReturn);

  // ------------------------------------------------------------------
  // 1. Project portfolio to retirement
  // ------------------------------------------------------------------
  const portfolioAtRetirement = projectPortfolio(
    currentPortfolio,
    annualContributions,
    preRetirementReturn,
    yearsToRetirement,
  );

  // ------------------------------------------------------------------
  // 2. Calculate sustainable withdrawal rate adjusted for horizon
  // ------------------------------------------------------------------
  const withdrawalRate = adjustedWithdrawalRate(yearsInRetirement);

  // ------------------------------------------------------------------
  // 3. Annual income from portfolio
  // ------------------------------------------------------------------
  const annualIncomeFromPortfolio = portfolioAtRetirement.times(withdrawalRate);

  // ------------------------------------------------------------------
  // 4. Total retirement income (portfolio + SS + pension)
  // ------------------------------------------------------------------
  // Inflate SS and pension to retirement year for comparison with
  // inflation-adjusted desired income.
  const ssAtRetirement = estimatedSS.times(
    inflationRate.plus(1).pow(yearsToRetirement),
  );
  const pensionAtRetirement = estimatedPension.times(
    inflationRate.plus(1).pow(yearsToRetirement),
  );

  const totalAnnualRetirementIncome = annualIncomeFromPortfolio
    .plus(ssAtRetirement)
    .plus(pensionAtRetirement);

  // ------------------------------------------------------------------
  // 5. Desired income in future dollars
  // ------------------------------------------------------------------
  const desiredIncomeAtRetirement = desiredIncome.times(
    inflationRate.plus(1).pow(yearsToRetirement),
  );

  // ------------------------------------------------------------------
  // 6. Income replacement ratio and gap
  // ------------------------------------------------------------------
  const incomeReplacementRatio = desiredIncomeAtRetirement.gt(0)
    ? totalAnnualRetirementIncome.dividedBy(desiredIncomeAtRetirement)
    : new Decimal(0);

  const incomeGap = Decimal.max(
    desiredIncomeAtRetirement.minus(totalAnnualRetirementIncome),
    0,
  );

  // ------------------------------------------------------------------
  // 7. Portfolio longevity: how many years until depletion
  // ------------------------------------------------------------------
  // The annual withdrawal from the portfolio is the shortfall after
  // SS + pension, or the desired income minus SS/pension
  const annualPortfolioWithdrawal = Decimal.max(
    desiredIncomeAtRetirement.minus(ssAtRetirement).minus(pensionAtRetirement),
    0,
  );

  const yearsPortfolioLasts = calculatePortfolioLongevity(
    portfolioAtRetirement,
    annualPortfolioWithdrawal,
    inflationRate,
    postRetirementReturn,
    100,
  );

  // ------------------------------------------------------------------
  // 8. Additional savings needed to close the gap
  // ------------------------------------------------------------------
  const additionalAnnualSavings = calculateAdditionalSavingsNeeded(
    incomeGap,
    withdrawalRate,
    preRetirementReturn,
    yearsToRetirement,
  );

  const additionalMonthlySavings = additionalAnnualSavings.dividedBy(12);

  // ------------------------------------------------------------------
  // 9. Readiness determination
  // ------------------------------------------------------------------
  const isReady = incomeGap.lte(0) || incomeReplacementRatio.gte(new Decimal('1.0'));

  // ------------------------------------------------------------------
  // Assemble result
  // ------------------------------------------------------------------
  return {
    isReady,
    portfolioAtRetirement: portfolioAtRetirement.toDecimalPlaces(2).toNumber(),
    annualIncomeFromPortfolio: annualIncomeFromPortfolio.toDecimalPlaces(2).toNumber(),
    totalAnnualRetirementIncome: totalAnnualRetirementIncome.toDecimalPlaces(2).toNumber(),
    incomeReplacementRatio: incomeReplacementRatio.toDecimalPlaces(4).toNumber(),
    incomeGap: incomeGap.toDecimalPlaces(2).toNumber(),
    yearsPortfolioLasts,
    additionalMonthlySavingsNeeded: additionalMonthlySavings.toDecimalPlaces(2).toNumber(),
  };
}
