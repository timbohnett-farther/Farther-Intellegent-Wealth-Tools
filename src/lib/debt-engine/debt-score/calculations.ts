/**
 * Business Debt Analysis & Farther Debt Score Calculation Module
 *
 * Provides business-debt leverage metrics, personal guarantee exposure,
 * Section 163(j) tax analysis, and the proprietary Farther Debt Score
 * (0-850) with five scored dimensions.
 *
 * @module debt-engine/debt-score/calculations
 */

import Decimal from 'decimal.js';
import type {
  BusinessDebtInput,
  BusinessDebtResult,
  DebtScoreInput,
  FartherDebtScore,
  DebtScoreDimensions,
  DebtScoreLabel,
  DebtOpportunity,
  RiskLevel,
  HouseholdDebt,
} from '../types';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Round a Decimal to 2 decimal places and return as a plain number.
 */
function toNum(d: Decimal): number {
  return d.toDecimalPlaces(2).toNumber();
}

/**
 * Clamp a value between min and max.
 */
function clamp(value: Decimal, min: number, max: number): Decimal {
  return Decimal.max(new Decimal(min), Decimal.min(new Decimal(max), value));
}

// =========================================================================
// Business Debt Analysis
// =========================================================================

/**
 * Analyze business debt for leverage health, personal exposure, and
 * tax deductibility under Section 163(j).
 *
 * **Business leverage metrics** include debt-to-EBITDA (healthy < 3-4x),
 * debt service coverage ratio (healthy > 1.25x), and total debt-to-revenue.
 *
 * **Personal exposure** evaluates the total personally guaranteed amount
 * as a percentage of net worth and assigns a risk rating:
 * LOW (<10%), MODERATE (10-25%), HIGH (25-50%), CRITICAL (>50%).
 *
 * **Tax deductibility** computes the Section 163(j) limitation at 30% of
 * EBITDA, determines how much interest is deductible this year versus
 * carried forward, and estimates annual tax savings.
 *
 * @param input - Business debt analysis inputs.
 * @returns Complete business debt analysis result.
 */
export function analyzeBusinessDebt(input: BusinessDebtInput): BusinessDebtResult {
  const {
    businessDebts,
    businessIncome,
    ebitda,
    personalGuaranteesTotal,
    taxProfile,
    netWorth,
  } = input;

  // -----------------------------------------------------------------------
  // Business leverage metrics
  // -----------------------------------------------------------------------
  const totalDebt = businessDebts.reduce(
    (acc, d) => acc.plus(new Decimal(d.balance)),
    new Decimal(0),
  );

  const ebitdaDec = new Decimal(ebitda);
  const revenueDec = new Decimal(businessIncome);

  const debtToEBITDA = ebitdaDec.gt(0) ? totalDebt.div(ebitdaDec) : new Decimal(0);

  // Annual debt service: sum of (balance / termMonths * 12 + balance * rate) for each debt
  // A more precise approach: monthly P&I * 12
  const annualDebtService = businessDebts.reduce((acc, d) => {
    const bal = new Decimal(d.balance);
    const rate = new Decimal(d.rate);
    const term = new Decimal(d.termMonths);
    if (term.lte(0)) return acc;
    const monthlyRate = rate.div(12);
    let monthlyPayment: Decimal;
    if (monthlyRate.gt(0)) {
      const factor = monthlyRate.plus(1).pow(term.toNumber());
      monthlyPayment = bal.mul(monthlyRate.mul(factor)).div(factor.minus(1));
    } else {
      monthlyPayment = bal.div(term);
    }
    return acc.plus(monthlyPayment.mul(12));
  }, new Decimal(0));

  const debtServiceCoverage = annualDebtService.gt(0)
    ? ebitdaDec.div(annualDebtService)
    : new Decimal(0);

  const totalDebtToRevenue = revenueDec.gt(0)
    ? totalDebt.div(revenueDec)
    : new Decimal(0);

  // -----------------------------------------------------------------------
  // Personal exposure
  // -----------------------------------------------------------------------
  const pgTotal = new Decimal(personalGuaranteesTotal);
  const nw = new Decimal(netWorth);
  const percentOfNetWorth = nw.gt(0) ? pgTotal.div(nw) : new Decimal(1);

  let riskRating: RiskLevel;
  if (percentOfNetWorth.lt(new Decimal('0.10'))) {
    riskRating = 'LOW';
  } else if (percentOfNetWorth.lt(new Decimal('0.25'))) {
    riskRating = 'MODERATE';
  } else if (percentOfNetWorth.lt(new Decimal('0.50'))) {
    riskRating = 'HIGH';
  } else {
    riskRating = 'CRITICAL';
  }

  // -----------------------------------------------------------------------
  // Tax deductibility -- Section 163(j)
  // -----------------------------------------------------------------------
  const section163jLimit = ebitdaDec.mul(new Decimal('0.30'));

  const totalAnnualInterest = businessDebts.reduce((acc, d) => {
    if (!d.taxDeductible) return acc;
    return acc.plus(new Decimal(d.balance).mul(new Decimal(d.rate)));
  }, new Decimal(0));

  const deductibleThisYear = Decimal.min(totalAnnualInterest, section163jLimit);
  const disallowedCarryforward = Decimal.max(
    new Decimal(0),
    totalAnnualInterest.minus(section163jLimit),
  );

  const combinedRate = new Decimal(taxProfile.federalMarginalRate).plus(
    new Decimal(taxProfile.stateMarginalRate),
  );
  const taxSavings = deductibleThisYear.mul(combinedRate);

  // -----------------------------------------------------------------------
  // Recommendations
  // -----------------------------------------------------------------------
  const recommendations: string[] = [];

  if (debtToEBITDA.gt(new Decimal('4'))) {
    recommendations.push(
      'Business leverage is elevated (debt-to-EBITDA > 4x). Prioritize debt reduction or EBITDA growth.',
    );
  } else if (debtToEBITDA.gt(new Decimal('3'))) {
    recommendations.push(
      'Business leverage is approaching cautionary levels. Monitor debt-to-EBITDA closely.',
    );
  }

  if (debtServiceCoverage.gt(0) && debtServiceCoverage.lt(new Decimal('1.25'))) {
    recommendations.push(
      'Debt service coverage ratio is below 1.25x. Cash flow may be insufficient to service debt comfortably.',
    );
  }

  if (riskRating === 'CRITICAL' || riskRating === 'HIGH') {
    recommendations.push(
      `Personal guarantee exposure is ${riskRating.toLowerCase()} at ${toNum(percentOfNetWorth.mul(100))}% of net worth. ` +
      'Negotiate to limit or remove personal guarantees where possible.',
    );
  }

  if (disallowedCarryforward.gt(0)) {
    recommendations.push(
      `$${toNum(disallowedCarryforward)} of interest expense exceeds the Section 163(j) limit and will be carried forward. ` +
      'Consider timing strategies to maximize current-year deductions.',
    );
  }

  // Check for high-rate business debts
  const highRateDebts = businessDebts.filter((d) => d.rate > 0.10);
  if (highRateDebts.length > 0) {
    recommendations.push(
      'One or more business debts carry rates above 10%. Explore SBA refinancing or renegotiation.',
    );
  }

  if (recommendations.length === 0) {
    recommendations.push(
      'Business debt metrics are healthy. Continue current debt management strategy.',
    );
  }

  return {
    businessLeverageMetrics: {
      debtToEBITDA: toNum(debtToEBITDA),
      debtServiceCoverage: toNum(debtServiceCoverage),
      totalDebtToRevenue: toNum(totalDebtToRevenue),
    },
    personalExposure: {
      personallyGuaranteed: toNum(pgTotal),
      percentOfNetWorth: toNum(percentOfNetWorth),
      riskRating,
    },
    taxDeductibility: {
      section163jLimit: toNum(section163jLimit),
      deductibleThisYear: toNum(deductibleThisYear),
      disallowedCarryforward: toNum(disallowedCarryforward),
      taxSavings: toNum(taxSavings),
    },
    recommendations,
  };
}

// =========================================================================
// Farther Debt Score
// =========================================================================

// ---------------------------------------------------------------------------
// Dimension scoring helpers
// ---------------------------------------------------------------------------

/**
 * Score the leverage dimension (0-100).
 *
 * Primary metric: DTI ratio (back-end DTI).
 * Secondary blend: debt-to-assets ratio.
 */
function scoreLeverage(
  totalMonthlyDebtPayments: Decimal,
  grossMonthlyIncome: Decimal,
  totalLiabilities: Decimal,
  totalAssets: Decimal,
): number {
  // DTI score
  const dti = grossMonthlyIncome.gt(0)
    ? totalMonthlyDebtPayments.div(grossMonthlyIncome)
    : new Decimal(1);

  let dtiScore: number;
  if (dti.lt(new Decimal('0.20'))) {
    dtiScore = 100;
  } else if (dti.lt(new Decimal('0.28'))) {
    dtiScore = 85;
  } else if (dti.lt(new Decimal('0.36'))) {
    dtiScore = 70;
  } else if (dti.lt(new Decimal('0.43'))) {
    dtiScore = 50;
  } else {
    dtiScore = 30;
  }

  // Debt-to-assets score (0-100)
  const dta = totalAssets.gt(0)
    ? totalLiabilities.div(totalAssets)
    : new Decimal(1);

  let dtaScore: number;
  if (dta.lt(new Decimal('0.20'))) {
    dtaScore = 100;
  } else if (dta.lt(new Decimal('0.40'))) {
    dtaScore = 80;
  } else if (dta.lt(new Decimal('0.60'))) {
    dtaScore = 60;
  } else if (dta.lt(new Decimal('0.80'))) {
    dtaScore = 40;
  } else {
    dtaScore = 20;
  }

  // Blend: 70% DTI, 30% debt-to-assets
  return Math.round(dtiScore * 0.7 + dtaScore * 0.3);
}

/**
 * Score the cost dimension (0-100).
 *
 * Based on the weighted-average after-tax cost of all debts.
 */
function scoreCost(
  debts: HouseholdDebt[],
  combinedMarginalRate: Decimal,
): number {
  if (debts.length === 0) return 100;

  const totalBalance = debts.reduce(
    (acc, d) => acc.plus(new Decimal(d.currentBalance)),
    new Decimal(0),
  );

  if (totalBalance.lte(0)) return 100;

  const weightedRate = debts.reduce((acc, d) => {
    const bal = new Decimal(d.currentBalance);
    const rate = new Decimal(d.interestRate);
    const afterTaxRate = d.isDeductible
      ? rate.mul(new Decimal(1).minus(combinedMarginalRate))
      : rate;
    return acc.plus(bal.mul(afterTaxRate));
  }, new Decimal(0));

  const avgAfterTaxRate = weightedRate.div(totalBalance);

  if (avgAfterTaxRate.lt(new Decimal('0.05'))) return 100;
  if (avgAfterTaxRate.lt(new Decimal('0.08'))) return 80;
  if (avgAfterTaxRate.lt(new Decimal('0.12'))) return 60;
  if (avgAfterTaxRate.lt(new Decimal('0.18'))) return 40;
  return 20;
}

/**
 * Score the structure dimension (0-100).
 *
 * Evaluates mix quality: variable-rate exposure, unsecured ratio,
 * and fixed-rate dominance.
 */
function scoreStructure(debts: HouseholdDebt[]): number {
  if (debts.length === 0) return 100;

  const totalBalance = debts.reduce(
    (acc, d) => acc.plus(new Decimal(d.currentBalance)),
    new Decimal(0),
  );

  if (totalBalance.lte(0)) return 100;

  let baseScore = 80; // start with a good base

  // Variable rate exposure
  const variableBalance = debts
    .filter((d) => d.rateType === 'VARIABLE')
    .reduce((acc, d) => acc.plus(new Decimal(d.currentBalance)), new Decimal(0));

  const variableRatio = variableBalance.div(totalBalance);
  if (variableRatio.gt(new Decimal('0.40'))) {
    baseScore -= 25; // heavy penalty
  } else if (variableRatio.gt(new Decimal('0.20'))) {
    baseScore -= 10; // moderate penalty
  }

  // Unsecured ratio
  const unsecuredBalance = debts
    .filter((d) => !d.collateral)
    .reduce((acc, d) => acc.plus(new Decimal(d.currentBalance)), new Decimal(0));

  const unsecuredRatio = unsecuredBalance.div(totalBalance);
  if (unsecuredRatio.gt(new Decimal('0.30'))) {
    baseScore -= 20; // high unsecured penalty
  } else if (unsecuredRatio.gt(new Decimal('0.15'))) {
    baseScore -= 10;
  }

  // Reward long-term fixed-rate dominance
  const fixedBalance = debts
    .filter((d) => d.rateType === 'FIXED')
    .reduce((acc, d) => acc.plus(new Decimal(d.currentBalance)), new Decimal(0));

  const fixedRatio = fixedBalance.div(totalBalance);
  if (fixedRatio.gt(new Decimal('0.75'))) {
    baseScore += 20; // reward for being predominantly fixed
  } else if (fixedRatio.gt(new Decimal('0.50'))) {
    baseScore += 10;
  }

  return Math.max(0, Math.min(100, baseScore));
}

/**
 * Score the risk dimension (0-100).
 *
 * Considers SBLOC/margin exposure, personal guarantees, and
 * variable-rate sensitivity.
 */
function scoreRisk(debts: HouseholdDebt[], netWorth: Decimal): number {
  const hasSBLOCOrMargin = debts.some(
    (d) => d.category === 'SBLOC' || d.category === 'MARGIN_LOAN',
  );

  let baseScore = hasSBLOCOrMargin ? 70 : 100;

  if (hasSBLOCOrMargin) {
    // Subtract for total SBLOC/margin balance relative to net worth
    const marginBalance = debts
      .filter((d) => d.category === 'SBLOC' || d.category === 'MARGIN_LOAN')
      .reduce((acc, d) => acc.plus(new Decimal(d.currentBalance)), new Decimal(0));

    const marginPctNW = netWorth.gt(0)
      ? marginBalance.div(netWorth)
      : new Decimal(1);

    if (marginPctNW.gt(new Decimal('0.30'))) {
      baseScore -= 30;
    } else if (marginPctNW.gt(new Decimal('0.15'))) {
      baseScore -= 15;
    }
  }

  // Personal guarantees
  const guaranteedBalance = debts
    .filter((d) => d.isPersonallyGuaranteed)
    .reduce((acc, d) => acc.plus(new Decimal(d.currentBalance)), new Decimal(0));

  const guaranteedPctNW = netWorth.gt(0)
    ? guaranteedBalance.div(netWorth)
    : new Decimal(0);

  if (guaranteedPctNW.gt(new Decimal('0.25'))) {
    baseScore -= 20;
  } else if (guaranteedPctNW.gt(new Decimal('0.10'))) {
    baseScore -= 10;
  }

  // Variable-rate sensitivity
  const totalBalance = debts.reduce(
    (acc, d) => acc.plus(new Decimal(d.currentBalance)),
    new Decimal(0),
  );
  const variableBalance = debts
    .filter((d) => d.rateType === 'VARIABLE')
    .reduce((acc, d) => acc.plus(new Decimal(d.currentBalance)), new Decimal(0));

  if (totalBalance.gt(0) && variableBalance.div(totalBalance).gt(new Decimal('0.40'))) {
    baseScore -= 10;
  }

  return Math.max(0, Math.min(100, baseScore));
}

/**
 * Score the trajectory dimension (0-100).
 *
 * Compares current total debt to previous total debt.
 * Decreasing debt is rewarded; increasing debt is penalized.
 * If no previous data, returns 70 (neutral).
 */
function scoreTrajectory(
  currentDebts: HouseholdDebt[],
  previousDebts?: HouseholdDebt[],
): number {
  if (!previousDebts || previousDebts.length === 0) return 70;

  const currentTotal = currentDebts.reduce(
    (acc, d) => acc.plus(new Decimal(d.currentBalance)),
    new Decimal(0),
  );

  const previousTotal = previousDebts.reduce(
    (acc, d) => acc.plus(new Decimal(d.currentBalance)),
    new Decimal(0),
  );

  if (previousTotal.lte(0)) return 85; // was debt-free before

  const changeRatio = currentTotal.minus(previousTotal).div(previousTotal);

  // Decreasing debt -> high score
  if (changeRatio.lt(new Decimal('-0.20'))) return 100; // down >20%
  if (changeRatio.lt(new Decimal('-0.10'))) return 90;  // down >10%
  if (changeRatio.lt(new Decimal('-0.02'))) return 80;  // down >2%
  if (changeRatio.lt(new Decimal('0.02'))) return 70;   // stable
  if (changeRatio.lt(new Decimal('0.10'))) return 50;   // up <10%
  if (changeRatio.lt(new Decimal('0.20'))) return 35;   // up <20%
  return 20; // up >20%
}

/**
 * Determine the score label based on the composite score.
 */
function getScoreLabel(score: number, allDebtZero: boolean): DebtScoreLabel {
  if (allDebtZero) return 'DEBT_FREE';
  if (score >= 750) return 'EXCELLENT';
  if (score >= 650) return 'GOOD';
  if (score >= 550) return 'FAIR';
  if (score >= 400) return 'CONCERNING';
  return 'CRITICAL';
}

/**
 * Identify the top 3 key drivers affecting the score.
 */
function identifyKeyDrivers(dimensions: DebtScoreDimensions): string[] {
  const entries: Array<{ name: string; score: number; description: string }> = [
    {
      name: 'leverage',
      score: dimensions.leverage,
      description:
        dimensions.leverage >= 70
          ? 'Strong leverage position with manageable debt-to-income ratio'
          : 'Elevated leverage -- debt levels are high relative to income and assets',
    },
    {
      name: 'cost',
      score: dimensions.cost,
      description:
        dimensions.cost >= 70
          ? 'Low weighted-average after-tax cost of debt'
          : 'High average cost of debt is eroding wealth -- refinancing or payoff may help',
    },
    {
      name: 'structure',
      score: dimensions.structure,
      description:
        dimensions.structure >= 70
          ? 'Well-structured debt portfolio with favorable fixed-rate mix'
          : 'Debt structure has vulnerabilities from variable rates or unsecured exposure',
    },
    {
      name: 'risk',
      score: dimensions.risk,
      description:
        dimensions.risk >= 70
          ? 'Limited risk exposure from margin loans and personal guarantees'
          : 'Elevated risk from margin call exposure or personal guarantee obligations',
    },
    {
      name: 'trajectory',
      score: dimensions.trajectory,
      description:
        dimensions.trajectory >= 70
          ? 'Debt trajectory is stable or improving'
          : 'Total debt is increasing -- consider a payoff acceleration strategy',
    },
  ];

  // Sort by most impact (lowest scores are dragging down, highest are helping)
  // Return mix: lowest 2 (problems) and highest 1 (strength), unless all good
  entries.sort((a, b) => a.score - b.score);

  // Pick the 2 weakest and 1 strongest
  const weakest = entries.slice(0, 2);
  const strongest = entries[entries.length - 1];

  const drivers: string[] = [];
  for (const w of weakest) {
    drivers.push(w.description);
  }
  if (strongest.score !== weakest[weakest.length - 1].score) {
    drivers.push(strongest.description);
  }

  return drivers.slice(0, 3);
}

/**
 * Analyze debts for actionable improvement opportunities.
 */
function identifyOpportunities(
  debts: HouseholdDebt[],
  combinedMarginalRate: Decimal,
): DebtOpportunity[] {
  const opportunities: DebtOpportunity[] = [];

  // 1. High-interest credit cards (>15% APR)
  const highRateCards = debts.filter(
    (d) => d.category === 'CREDIT_CARD' && d.interestRate > 0.15 && d.currentBalance > 0,
  );
  if (highRateCards.length > 0) {
    const totalHighRateBalance = highRateCards.reduce(
      (acc, d) => acc.plus(new Decimal(d.currentBalance)),
      new Decimal(0),
    );
    const avgRate = highRateCards.reduce(
      (acc, d) => acc.plus(new Decimal(d.interestRate).mul(new Decimal(d.currentBalance))),
      new Decimal(0),
    ).div(totalHighRateBalance);

    // Savings: difference between current avg rate and a target consolidation rate (~8%)
    const targetRate = new Decimal('0.08');
    const annualSavings = totalHighRateBalance.mul(avgRate.minus(targetRate));

    opportunities.push({
      type: 'HIGH_RATE_CARD_PAYOFF',
      annualSavings: toNum(Decimal.max(new Decimal(0), annualSavings)),
      complexity: 'SIMPLE',
      urgency: 'IMMEDIATE',
      action: 'Pay off high-interest credit card debt',
    });
  }

  // 2. Mortgage refinance potential (if rate > current market proxy + 0.75%)
  const mortgages = debts.filter(
    (d) => d.category === 'MORTGAGE' && d.currentBalance > 0,
  );
  for (const m of mortgages) {
    // Assume current market rate around 6.5% -- refinance worthwhile if rate is >= 7.25%
    const marketRate = new Decimal('0.065');
    const currentRate = new Decimal(m.interestRate);
    if (currentRate.gt(marketRate.plus(new Decimal('0.0075')))) {
      const balance = new Decimal(m.currentBalance);
      const annualSavings = balance.mul(currentRate.minus(marketRate));
      opportunities.push({
        type: 'MORTGAGE_REFINANCE',
        annualSavings: toNum(annualSavings),
        complexity: 'MODERATE',
        urgency: '6_MONTHS',
        action: 'Explore mortgage refinance',
      });
    }
  }

  // 3. Non-deductible debt before deductible
  const nonDeductible = debts.filter(
    (d) => !d.isDeductible && d.currentBalance > 0 && d.interestRate > 0,
  );
  const deductible = debts.filter(
    (d) => d.isDeductible && d.currentBalance > 0 && d.interestRate > 0,
  );
  if (nonDeductible.length > 0 && deductible.length > 0) {
    // Estimate savings from paying non-deductible first
    const highestNonDeductibleRate = nonDeductible.reduce(
      (max, d) => Math.max(max, d.interestRate),
      0,
    );
    const lowestDeductibleAfterTaxRate = deductible.reduce(
      (min, d) => {
        const afterTax = new Decimal(d.interestRate)
          .mul(new Decimal(1).minus(combinedMarginalRate))
          .toNumber();
        return Math.min(min, afterTax);
      },
      Infinity,
    );

    if (highestNonDeductibleRate > lowestDeductibleAfterTaxRate) {
      const nonDeductibleBalance = nonDeductible.reduce(
        (acc, d) => acc.plus(new Decimal(d.currentBalance)),
        new Decimal(0),
      );
      const rateDiff = new Decimal(highestNonDeductibleRate).minus(
        new Decimal(lowestDeductibleAfterTaxRate),
      );
      const estSavings = nonDeductibleBalance.mul(rateDiff).mul(new Decimal('0.5'));

      opportunities.push({
        type: 'PRIORITIZE_NON_DEDUCTIBLE',
        annualSavings: toNum(Decimal.max(new Decimal(0), estSavings)),
        complexity: 'SIMPLE',
        urgency: '6_MONTHS',
        action: 'Prioritize non-deductible debt payoff',
      });
    }
  }

  // 4. High variable-rate exposure
  const totalBalance = debts.reduce(
    (acc, d) => acc.plus(new Decimal(d.currentBalance)),
    new Decimal(0),
  );
  const variableBalance = debts
    .filter((d) => d.rateType === 'VARIABLE' && d.currentBalance > 0)
    .reduce((acc, d) => acc.plus(new Decimal(d.currentBalance)), new Decimal(0));

  if (totalBalance.gt(0) && variableBalance.div(totalBalance).gt(new Decimal('0.40'))) {
    // Potential rate increase impact: 2% rate shock on variable balance
    const rateShock = new Decimal('0.02');
    const annualExposure = variableBalance.mul(rateShock);
    opportunities.push({
      type: 'VARIABLE_TO_FIXED',
      annualSavings: toNum(annualExposure),
      complexity: 'MODERATE',
      urgency: '1_YEAR',
      action: 'Consider converting variable to fixed rates',
    });
  }

  // Sort by annualSavings descending
  opportunities.sort((a, b) => b.annualSavings - a.annualSavings);

  return opportunities;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Calculate the proprietary Farther Debt Score (0-850).
 *
 * The score is composed of five sub-dimensions, each scored 0-100:
 *
 * | Dimension   | Weight | What it measures                                     |
 * |-------------|--------|------------------------------------------------------|
 * | Leverage    | 25%    | DTI ratio, debt-to-assets, debt-to-net-worth         |
 * | Cost        | 25%    | Weighted-average after-tax cost of all debts          |
 * | Structure   | 20%    | Variable-rate exposure, unsecured ratio, fixed-rate % |
 * | Risk        | 15%    | Margin call exposure, personal guarantees             |
 * | Trajectory  | 15%    | Total debt change vs. previous period                 |
 *
 * **Composite formula:**
 *   raw = (leverage*25 + cost*25 + structure*20 + risk*15 + trajectory*15) / 100
 *   score = round(raw * 8.5)   // maps 0-100 raw to 0-850
 *
 * **Labels:** DEBT_FREE (all debts $0), EXCELLENT (750-850), GOOD (650-749),
 * FAIR (550-649), CONCERNING (400-549), CRITICAL (0-399).
 *
 * @param input - Debt score calculation inputs.
 * @returns The computed Farther Debt Score with dimensions, drivers, and
 *          actionable opportunities.
 */
export function calculateFartherDebtScore(input: DebtScoreInput): FartherDebtScore {
  const { debts, taxProfile, income, balanceSheet, previousScore, previousDebts } =
    input;

  const combinedMarginalRate = new Decimal(taxProfile.federalMarginalRate).plus(
    new Decimal(taxProfile.stateMarginalRate),
  );

  // -----------------------------------------------------------------------
  // Check for debt-free condition
  // -----------------------------------------------------------------------
  const totalCurrentBalance = debts.reduce(
    (acc, d) => acc.plus(new Decimal(d.currentBalance)),
    new Decimal(0),
  );
  const allDebtZero = totalCurrentBalance.lte(0);

  // -----------------------------------------------------------------------
  // Total monthly debt payments for DTI
  // -----------------------------------------------------------------------
  const totalMonthlyPayments = debts.reduce(
    (acc, d) => acc.plus(new Decimal(d.monthlyPayment)),
    new Decimal(0),
  );

  // -----------------------------------------------------------------------
  // Dimension scores
  // -----------------------------------------------------------------------
  const leverageScore = allDebtZero
    ? 100
    : scoreLeverage(
        totalMonthlyPayments,
        new Decimal(income.grossMonthlyIncome),
        new Decimal(balanceSheet.totalLiabilities),
        new Decimal(balanceSheet.totalAssets),
      );

  const costScore = allDebtZero ? 100 : scoreCost(debts, combinedMarginalRate);

  const structureScore = allDebtZero ? 100 : scoreStructure(debts);

  const riskScore = allDebtZero
    ? 100
    : scoreRisk(debts, new Decimal(balanceSheet.netWorth));

  const trajectoryScore = allDebtZero ? 100 : scoreTrajectory(debts, previousDebts);

  const dimensions: DebtScoreDimensions = {
    leverage: leverageScore,
    cost: costScore,
    structure: structureScore,
    risk: riskScore,
    trajectory: trajectoryScore,
  };

  // -----------------------------------------------------------------------
  // Composite score
  // -----------------------------------------------------------------------
  const raw = new Decimal(leverageScore)
    .mul(25)
    .plus(new Decimal(costScore).mul(25))
    .plus(new Decimal(structureScore).mul(20))
    .plus(new Decimal(riskScore).mul(15))
    .plus(new Decimal(trajectoryScore).mul(15))
    .div(100);

  const scaledScore = clamp(raw.mul(new Decimal('8.5')), 0, 850);
  const score = Math.round(scaledScore.toNumber());

  // -----------------------------------------------------------------------
  // Label
  // -----------------------------------------------------------------------
  const label = getScoreLabel(score, allDebtZero);

  // -----------------------------------------------------------------------
  // Score change
  // -----------------------------------------------------------------------
  const scoreChange = previousScore !== undefined ? score - previousScore : 0;

  // -----------------------------------------------------------------------
  // Key drivers
  // -----------------------------------------------------------------------
  const keyDrivers = identifyKeyDrivers(dimensions);

  // -----------------------------------------------------------------------
  // Top opportunities
  // -----------------------------------------------------------------------
  const topOpportunities = allDebtZero
    ? []
    : identifyOpportunities(debts, combinedMarginalRate);

  return {
    score,
    label,
    dimensions,
    scoreChange,
    keyDrivers,
    topOpportunities,
    calculatedAt: new Date(),
  };
}
