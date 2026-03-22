// ==================== INSURANCE GAP ENGINE ====================
// Analyzes gaps in life insurance, disability, and long-term care coverage
// relative to the client's financial obligations and risk profile.

import type {
  InsuranceGapInput,
  InsuranceGapResult,
} from '../types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(amount: number): string {
  const abs = Math.abs(amount);
  if (abs >= 1_000_000) return `$${(amount / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `$${(amount / 1_000).toFixed(1)}k`;
  return `$${amount.toFixed(0)}`;
}

/**
 * Estimate LTC daily cost by state.
 * Returns estimated daily cost for a semi-private nursing home room.
 * Based on national averages with state-level adjustments.
 */
function estimateLTCDailyCost(state: string): number {
  // High-cost states
  const highCostStates = ['CT', 'MA', 'NY', 'NJ', 'AK', 'DC', 'HI'];
  // Low-cost states
  const lowCostStates = ['OK', 'MO', 'LA', 'AR', 'MS', 'AL', 'GA', 'TX', 'KS', 'NE', 'IA', 'WV'];

  const nationalAvg = 290; // 2024 approximate daily rate for semi-private room

  if (highCostStates.includes(state.toUpperCase())) {
    return Math.round(nationalAvg * 1.35);
  }
  if (lowCostStates.includes(state.toUpperCase())) {
    return Math.round(nationalAvg * 0.75);
  }
  return nationalAvg;
}

/**
 * Estimate the probability of needing LTC based on age and gender.
 */
function estimateLTCProbability(age: number, gender: 'male' | 'female'): number {
  // Approximate lifetime probability of needing some LTC
  // Women have higher probability due to longer life expectancy
  const baseProbability = gender === 'female' ? 0.72 : 0.52;

  // Adjust based on current age (higher age = already past some risk)
  if (age >= 80) return baseProbability * 0.85;
  if (age >= 70) return baseProbability * 0.95;
  return baseProbability;
}

// ---------------------------------------------------------------------------
// Life insurance gap analysis
// ---------------------------------------------------------------------------

function analyzeLifeInsuranceGap(input: InsuranceGapInput): InsuranceGapResult['lifeInsuranceGap'] {
  // Income replacement need
  const incomeReplacementNeed = input.annualIncome * input.incomeReplacementYears;

  // Debt payoff need
  const debtPayoffNeed = input.outstandingDebts + input.mortgageBalance;

  // Child-related obligations
  const childNeed = input.annualChildExpenses * input.yearsOfChildExpenses;

  // Final expenses
  const finalExpensesNeed = input.finalExpenses;

  // Total need
  const totalNeed = incomeReplacementNeed + debtPayoffNeed + childNeed + finalExpensesNeed;

  // Existing resources
  const existingResources = input.existingLifeInsurance + input.liquidAssets;

  // Gap
  const gap = Math.max(0, totalNeed - existingResources);

  // Build recommendation
  let recommendation: string;
  if (gap <= 0) {
    recommendation = `Current life insurance coverage of ${formatCurrency(input.existingLifeInsurance)} combined with liquid assets of ${formatCurrency(input.liquidAssets)} is sufficient to cover the estimated ${formatCurrency(totalNeed)} need. No additional coverage is required.`;
  } else if (gap < 100_000) {
    recommendation = `There is a modest gap of ${formatCurrency(gap)} between the estimated need (${formatCurrency(totalNeed)}) and existing resources (${formatCurrency(existingResources)}). Consider a small supplemental term policy to close this gap.`;
  } else if (gap < 500_000) {
    recommendation = `A significant gap of ${formatCurrency(gap)} exists. A ${input.incomeReplacementYears}-year term life policy for ${formatCurrency(gap)} is recommended to protect dependents. The primary needs are income replacement (${formatCurrency(incomeReplacementNeed)}) and debt coverage (${formatCurrency(debtPayoffNeed)}).`;
  } else {
    recommendation = `A substantial gap of ${formatCurrency(gap)} exists, primarily driven by income replacement needs of ${formatCurrency(incomeReplacementNeed)}. Recommend obtaining a ${input.incomeReplacementYears}-year level term policy for at least ${formatCurrency(gap)}. Consider splitting between two carriers for underwriting diversification.`;
  }

  return {
    totalNeed,
    existingCoverage: existingResources,
    gap,
    recommendation,
  };
}

// ---------------------------------------------------------------------------
// Disability gap analysis
// ---------------------------------------------------------------------------

function analyzeDisabilityGap(input: InsuranceGapInput): InsuranceGapResult['disabilityGap'] {
  // Standard: replace 60% of gross income
  const targetReplacementPct = 0.60;
  const monthlyIncomeNeed = (input.annualIncome / 12) * targetReplacementPct;

  // Existing coverage
  const existingMonthlyBenefit = input.existingDisabilityMonthly;

  // Gap
  const gap = Math.max(0, monthlyIncomeNeed - existingMonthlyBenefit);

  // Build recommendation
  let recommendation: string;
  if (gap <= 0) {
    recommendation = `Current disability coverage of ${formatCurrency(existingMonthlyBenefit)}/month meets the recommended 60% income replacement target of ${formatCurrency(monthlyIncomeNeed)}/month. No additional coverage needed.`;
  } else if (gap < 1_000) {
    recommendation = `A small disability coverage gap of ${formatCurrency(gap)}/month exists. Consider a supplemental individual disability policy to reach the ${formatCurrency(monthlyIncomeNeed)}/month target.`;
  } else if (input.existingDisabilityMonthly <= 0) {
    recommendation = `No disability coverage is in place. The client needs ${formatCurrency(monthlyIncomeNeed)}/month in coverage to replace 60% of income. Recommend an individual own-occupation disability policy with at least a 5-year benefit period and 90-day elimination period.`;
  } else {
    recommendation = `The disability gap of ${formatCurrency(gap)}/month is significant. Current coverage (${formatCurrency(existingMonthlyBenefit)}/month) provides only ${((existingMonthlyBenefit / (input.annualIncome / 12)) * 100).toFixed(0)}% income replacement. Recommend a supplemental individual disability policy for the ${formatCurrency(gap)}/month shortfall.`;
  }

  return {
    monthlyNeedAt60Pct: Math.round(monthlyIncomeNeed),
    existingMonthlyBenefit: Math.round(existingMonthlyBenefit),
    gap: Math.round(gap),
    recommendation,
  };
}

// ---------------------------------------------------------------------------
// Long-term care gap analysis
// ---------------------------------------------------------------------------

function analyzeLTCGap(input: InsuranceGapInput): InsuranceGapResult['ltcGap'] {
  const currentDailyCost = estimateLTCDailyCost(input.state);

  // Project cost to typical need age (age 80)
  const yearsToNeed = Math.max(0, 80 - input.clientAge);
  const healthcareInflation = 0.05; // 5% annual healthcare inflation
  const projectedDailyCost = currentDailyCost * Math.pow(1 + healthcareInflation, yearsToNeed);

  // Existing daily benefit
  const existingDailyBenefit = input.existingLTCDailyBenefit;

  // Gap
  const gap = Math.max(0, projectedDailyCost - existingDailyBenefit);

  // Build recommendation
  const probability = estimateLTCProbability(input.clientAge, input.gender);
  let recommendation: string;

  if (input.clientAge > 75) {
    recommendation = `At age ${input.clientAge}, traditional LTC insurance may be cost-prohibitive. Consider self-insuring with a dedicated LTC fund, a hybrid life/LTC policy, or a Medicaid planning strategy. Current estimated daily cost: ${formatCurrency(currentDailyCost)}/day.`;
  } else if (gap <= 0) {
    recommendation = `Current LTC coverage of ${formatCurrency(existingDailyBenefit)}/day exceeds the projected daily cost of ${formatCurrency(Math.round(projectedDailyCost))}/day. Coverage appears adequate.`;
  } else if (existingDailyBenefit <= 0) {
    recommendation = `No LTC coverage is in place. The projected daily cost at age 80 is ${formatCurrency(Math.round(projectedDailyCost))}/day. With a ${(probability * 100).toFixed(0)}% lifetime probability of needing LTC services (${input.gender}), consider a hybrid life/LTC policy or traditional LTC insurance. A 3-year benefit period would require approximately ${formatCurrency(Math.round(projectedDailyCost * 365 * 3))} in total coverage.`;
  } else {
    recommendation = `LTC coverage gap of ${formatCurrency(Math.round(gap))}/day between existing coverage (${formatCurrency(existingDailyBenefit)}/day) and projected need (${formatCurrency(Math.round(projectedDailyCost))}/day at age 80). Consider increasing coverage or supplementing with self-insurance.`;
  }

  return {
    estimatedDailyCost: currentDailyCost,
    projectedDailyCostAtNeedAge: Math.round(projectedDailyCost),
    existingDailyBenefit: Math.round(existingDailyBenefit),
    gap: Math.round(gap),
    recommendation,
  };
}

// ---------------------------------------------------------------------------
// EXPORTED FUNCTION
// ---------------------------------------------------------------------------

/**
 * Analyzes gaps in life insurance, disability, and long-term care coverage.
 *
 * Analysis performed:
 * 1. **Life insurance**: Compares income replacement, debt, and dependent needs
 *    against existing coverage and liquid assets
 * 2. **Disability**: Evaluates whether current coverage meets the 60% income
 *    replacement standard
 * 3. **Long-term care**: Projects future daily costs by state and compares to
 *    existing coverage, accounting for healthcare inflation
 *
 * An overall risk score (0-100) is calculated, with higher scores indicating
 * more severe gaps requiring immediate attention.
 *
 * @param input - Client demographics, income, and existing coverage details
 * @returns InsuranceGapResult with analysis for each coverage type
 *
 * @example
 * ```ts
 * const result = analyzeInsuranceGaps(input);
 * if (result.overallRiskScore > 60) {
 *   console.log('Urgent: significant insurance gaps detected');
 * }
 * ```
 */
export function analyzeInsuranceGaps(input: InsuranceGapInput): InsuranceGapResult {
  const lifeInsuranceGap = analyzeLifeInsuranceGap(input);
  const disabilityGap = analyzeDisabilityGap(input);
  const ltcGap = analyzeLTCGap(input);

  // ── Calculate overall risk score (0-100) ──────────────────────────────
  let riskScore = 0;

  // Life insurance risk (max 40 points)
  if (lifeInsuranceGap.gap > 0 && input.dependents > 0) {
    const lifeRiskRatio = Math.min(1, lifeInsuranceGap.gap / lifeInsuranceGap.totalNeed);
    riskScore += lifeRiskRatio * 40;
  }

  // Disability risk (max 30 points)
  if (disabilityGap.gap > 0 && input.clientAge < 65) {
    const disabilityRiskRatio = Math.min(1, disabilityGap.gap / disabilityGap.monthlyNeedAt60Pct);
    riskScore += disabilityRiskRatio * 30;
  }

  // LTC risk (max 30 points)
  if (ltcGap.gap > 0 && input.clientAge >= 40 && input.clientAge <= 75) {
    const ltcRiskRatio = Math.min(1, ltcGap.gap / ltcGap.projectedDailyCostAtNeedAge);
    const ageAdjustment = input.clientAge >= 55 ? 1.3 : 1.0;
    riskScore += ltcRiskRatio * 30 * ageAdjustment;
  }

  riskScore = Math.min(100, Math.round(riskScore));

  // ── Prioritized actions ───────────────────────────────────────────────
  const prioritizedActions: string[] = [];

  // Sort by urgency
  const gaps = [
    { type: 'life', gap: lifeInsuranceGap.gap, urgent: input.dependents > 0 && lifeInsuranceGap.gap > 100_000 },
    { type: 'disability', gap: disabilityGap.gap * 12 * 5, urgent: disabilityGap.gap > 0 && input.clientAge < 55 },
    { type: 'ltc', gap: ltcGap.gap * 365 * 3, urgent: ltcGap.gap > 0 && input.clientAge >= 55 },
  ];

  gaps.sort((a, b) => {
    if (a.urgent && !b.urgent) return -1;
    if (!a.urgent && b.urgent) return 1;
    return b.gap - a.gap;
  });

  for (const g of gaps) {
    if (g.gap <= 0) continue;

    switch (g.type) {
      case 'life':
        if (lifeInsuranceGap.gap > 0) {
          prioritizedActions.push(`Obtain ${formatCurrency(lifeInsuranceGap.gap)} in term life insurance coverage`);
        }
        break;
      case 'disability':
        if (disabilityGap.gap > 0) {
          prioritizedActions.push(`Secure individual disability coverage for ${formatCurrency(disabilityGap.gap)}/month shortfall`);
        }
        break;
      case 'ltc':
        if (ltcGap.gap > 0) {
          prioritizedActions.push(`Evaluate LTC insurance options to cover ${formatCurrency(ltcGap.gap)}/day projected gap`);
        }
        break;
    }
  }

  if (prioritizedActions.length === 0) {
    prioritizedActions.push('All insurance coverage areas appear adequate. Schedule next review in 12 months.');
  }

  return {
    lifeInsuranceGap,
    disabilityGap,
    ltcGap,
    overallRiskScore: riskScore,
    prioritizedActions,
  };
}
