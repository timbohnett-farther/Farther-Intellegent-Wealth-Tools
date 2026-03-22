/**
 * Education cost projection engine.
 *
 * Projects future education expenses using education-specific inflation,
 * models 529 plan savings growth with ongoing contributions, and calculates
 * year-by-year drawdown during enrollment to determine any funding shortfall.
 *
 * All monetary math uses Decimal.js for precision.
 * Pure function -- no side effects, no database calls.
 */

import Decimal from 'decimal.js';

// ==================== Types ====================

export interface EducationCostInput {
  /** Child's current age */
  currentAge: number;
  /** Age at which the child will enroll (e.g. 18) */
  enrollmentAge: number;
  /** Number of years of schooling (e.g. 4) */
  yearsOfSchool: number;
  /** Current annual cost of the institution in today's dollars */
  annualCostToday: number;
  /** Education-specific inflation rate (e.g. 0.055 for 5.5%) */
  educationInflation: number;
  /** Current balance in 529 / education savings */
  currentSavings529: number;
  /** Monthly contribution to education savings */
  monthlyContribution: number;
  /** Expected annual investment return on the savings (e.g. 0.06 for 6%) */
  investmentReturn: number;
}

export interface EducationCostResult {
  /** Total projected cost of education in future dollars */
  projectedTotalCost: number;
  /** Projected savings balance at enrollment start */
  projectedSavingsAtEnrollment: number;
  /** Ratio of projected savings to projected cost (capped at 1) */
  fundedRatio: number;
  /** Shortfall (0 if fully funded) */
  shortfall: number;
  /** Additional monthly contribution needed to close the gap */
  additionalMonthlyNeeded: number;
  /** Year-by-year breakdown during enrollment */
  yearByYear: Array<{ year: number; cost: number; balance: number }>;
}

// ==================== Engine ====================

/**
 * Calculate education cost projections and funding analysis.
 *
 * @param input - Education cost parameters
 * @returns Detailed education funding result
 */
export function calculateEducationCost(
  input: EducationCostInput,
): EducationCostResult {
  const {
    currentAge,
    enrollmentAge,
    yearsOfSchool,
    annualCostToday,
    educationInflation,
    currentSavings529,
    monthlyContribution,
    investmentReturn,
  } = input;

  const edInflation = new Decimal(educationInflation);
  const annualReturn = new Decimal(investmentReturn);
  const monthlyReturn = annualReturn
    .plus(1)
    .pow(new Decimal(1).dividedBy(12))
    .minus(1);
  const monthlyContrib = new Decimal(monthlyContribution);

  const yearsUntilEnrollment = Math.max(0, enrollmentAge - currentAge);
  const monthsUntilEnrollment = yearsUntilEnrollment * 12;

  // ------------------------------------------------------------------
  // 1.  Project education costs for each year of enrollment
  // ------------------------------------------------------------------
  const costToday = new Decimal(annualCostToday);
  const yearlyEducationCosts: Decimal[] = [];
  let projectedTotalCost = new Decimal(0);

  for (let i = 0; i < yearsOfSchool; i++) {
    // Years from today to the i-th enrollment year
    const yearsFromNow = yearsUntilEnrollment + i;
    const inflatedCost = costToday.times(
      edInflation.plus(1).pow(yearsFromNow),
    );
    yearlyEducationCosts.push(inflatedCost);
    projectedTotalCost = projectedTotalCost.plus(inflatedCost);
  }

  // ------------------------------------------------------------------
  // 2.  Project 529 savings growth to enrollment date
  //     FV = PV * (1 + r_m)^n + PMT * [((1 + r_m)^n - 1) / r_m]
  // ------------------------------------------------------------------
  let savingsAtEnrollment: Decimal;
  const currentSavings = new Decimal(currentSavings529);

  if (monthlyReturn.gt(0) && monthsUntilEnrollment > 0) {
    const growthFactor = monthlyReturn.plus(1).pow(monthsUntilEnrollment);
    const lumpSumGrowth = currentSavings.times(growthFactor);
    const annuityFactor = growthFactor.minus(1).dividedBy(monthlyReturn);
    const contributionGrowth = monthlyContrib.times(annuityFactor);
    savingsAtEnrollment = lumpSumGrowth.plus(contributionGrowth);
  } else if (monthsUntilEnrollment > 0) {
    // Zero return: simple accumulation
    savingsAtEnrollment = currentSavings.plus(
      monthlyContrib.times(monthsUntilEnrollment),
    );
  } else {
    // Already at enrollment age
    savingsAtEnrollment = currentSavings;
  }

  // ------------------------------------------------------------------
  // 3.  Year-by-year drawdown during enrollment
  //     Each year: balance grows at the annual return, then cost is
  //     withdrawn. Contributions stop during enrollment.
  // ------------------------------------------------------------------
  const yearByYear: Array<{ year: number; cost: number; balance: number }> = [];
  let balance = new Decimal(savingsAtEnrollment);
  const enrollmentStartYear = yearsUntilEnrollment + 1; // year 1 relative offset

  for (let i = 0; i < yearsOfSchool; i++) {
    // Growth for the year (beginning-of-year balance grows for 1 year)
    const yearGrowth = balance.times(annualReturn);
    balance = balance.plus(yearGrowth);

    // Withdraw the education cost
    const cost = yearlyEducationCosts[i];
    balance = balance.minus(cost);

    yearByYear.push({
      year: enrollmentStartYear + i,
      cost: cost.toDecimalPlaces(2).toNumber(),
      balance: Decimal.max(0, balance).toDecimalPlaces(2).toNumber(),
    });

    // Floor the balance at zero (cannot go below)
    if (balance.lt(0)) {
      balance = new Decimal(0);
    }
  }

  // ------------------------------------------------------------------
  // 4.  Funded ratio and shortfall
  // ------------------------------------------------------------------
  const fundedRatio = projectedTotalCost.gt(0)
    ? Decimal.min(
        1,
        savingsAtEnrollment.dividedBy(projectedTotalCost),
      )
    : new Decimal(1);

  const shortfall = Decimal.max(
    0,
    projectedTotalCost.minus(savingsAtEnrollment),
  );

  // ------------------------------------------------------------------
  // 5.  Additional monthly contribution to close the gap
  //     PMT = FV * r_m / ((1 + r_m)^n - 1)
  // ------------------------------------------------------------------
  let additionalMonthlyNeeded = new Decimal(0);

  if (shortfall.gt(0) && monthsUntilEnrollment > 0) {
    if (monthlyReturn.gt(0)) {
      const growthFactor = monthlyReturn.plus(1).pow(monthsUntilEnrollment);
      const annuityFactor = growthFactor.minus(1).dividedBy(monthlyReturn);
      additionalMonthlyNeeded = shortfall.dividedBy(annuityFactor);
    } else {
      additionalMonthlyNeeded = shortfall.dividedBy(monthsUntilEnrollment);
    }
  }

  // ------------------------------------------------------------------
  // 6.  Return result
  // ------------------------------------------------------------------
  return {
    projectedTotalCost: projectedTotalCost.toDecimalPlaces(2).toNumber(),
    projectedSavingsAtEnrollment: savingsAtEnrollment
      .toDecimalPlaces(2)
      .toNumber(),
    fundedRatio: fundedRatio.toDecimalPlaces(4).toNumber(),
    shortfall: shortfall.toDecimalPlaces(2).toNumber(),
    additionalMonthlyNeeded: additionalMonthlyNeeded
      .toDecimalPlaces(2)
      .toNumber(),
    yearByYear,
  };
}
