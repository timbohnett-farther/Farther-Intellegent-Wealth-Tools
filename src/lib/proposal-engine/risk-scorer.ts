// =============================================================================
// Farther Portfolio Proposal Engine -- Risk Scorer
// =============================================================================
//
// Farther's proprietary 3-dimensional risk scoring engine.
//
// Dimensions:
//   1. Behavioral (40%) -- Attitudinal risk tolerance from questionnaire
//   2. Capacity  (35%) -- Financial ability to absorb losses
//   3. Required  (25%) -- Return needed to fund all goals
//
// Each dimension produces a score from 1-100.  The composite score is a
// weighted blend that maps to a recommended allocation.
// =============================================================================

import type { FartherRiskProfile, QuestionnaireResponse, RiskLabel } from './types';
import type { MoneyCents } from '../tax-planning/types';
import { toDollars } from '../tax-planning/types';

// =====================================================================
// Public API
// =====================================================================

/**
 * Score a risk questionnaire and compute the 3-dimensional risk profile.
 */
export function scoreRiskProfile(params: {
  responses: QuestionnaireResponse[];
  // Capacity inputs (from financial plan data)
  timeHorizon: number;           // years
  annualIncome: MoneyCents;
  portfolioValue: MoneyCents;
  emergencyFundMonths: number;
  totalDebt: MoneyCents;
  totalAssets: MoneyCents;
  // Required return inputs
  goalFundingNeeded: MoneyCents;
  currentSavings: MoneyCents;
  yearsToGoal: number;
}): FartherRiskProfile {
  const behavioral = computeBehavioralScore(params.responses);
  const capacity = computeCapacityScore({
    timeHorizon: params.timeHorizon,
    annualIncome: params.annualIncome,
    portfolioValue: params.portfolioValue,
    emergencyFundMonths: params.emergencyFundMonths,
    totalDebt: params.totalDebt,
    totalAssets: params.totalAssets,
  });
  const required = computeRequiredScore({
    goalFundingNeeded: params.goalFundingNeeded,
    currentSavings: params.currentSavings,
    yearsToGoal: params.yearsToGoal,
  });

  const compositeScore = computeComposite(
    behavioral.score,
    capacity.score,
    required.score,
  );

  const riskLabel = scoreToLabel(compositeScore);
  const recommendedAllocation = scoreToAllocation(compositeScore);

  return {
    compositeScore,
    riskLabel,

    behavioralScore: behavioral.score,
    behavioralLabel: behavioral.label,

    capacityScore: capacity.score,
    capacityFactors: capacity.factors,

    requiredReturnScore: required.score,
    requiredReturn: required.requiredReturn,
    fundingRatio: required.fundingRatio,

    recommendedAllocation,
  };
}

/**
 * Map a composite score (1-100) to a recommended target allocation.
 */
export function scoreToAllocation(
  score: number,
): { equity: number; fixedIncome: number; alternatives: number; cash: number } {
  const clamped = clamp(score, 1, 100);

  if (clamped <= 20) {
    // Conservative
    return { equity: 20, fixedIncome: 70, alternatives: 5, cash: 5 };
  }
  if (clamped <= 40) {
    // Moderately Conservative
    return { equity: 40, fixedIncome: 50, alternatives: 5, cash: 5 };
  }
  if (clamped <= 60) {
    // Moderate
    return { equity: 55, fixedIncome: 35, alternatives: 7, cash: 3 };
  }
  if (clamped <= 80) {
    // Moderately Aggressive
    return { equity: 70, fixedIncome: 22, alternatives: 6, cash: 2 };
  }
  // Aggressive
  return { equity: 85, fixedIncome: 10, alternatives: 5, cash: 0 };
}

// =====================================================================
// Internal -- Behavioral Dimension
// =====================================================================

/**
 * Compute behavioral score from questionnaire responses.
 * Weighted average of all response scores.
 */
function computeBehavioralScore(
  responses: QuestionnaireResponse[],
): { score: number; label: RiskLabel } {
  if (responses.length === 0) {
    return { score: 50, label: 'MODERATE' };
  }

  let totalWeight = 0;
  let weightedSum = 0;

  for (const r of responses) {
    const w = r.weight > 0 ? r.weight : 1;
    weightedSum += r.score * w;
    totalWeight += w;
  }

  const score = clamp(Math.round(weightedSum / totalWeight), 1, 100);
  return { score, label: scoreToLabel(score) };
}

// =====================================================================
// Internal -- Capacity Dimension
// =====================================================================

/**
 * Compute financial capacity score from plan data.
 * Considers time horizon, income stability, liquidity, debt ratio,
 * and human capital value.
 */
function computeCapacityScore(params: {
  timeHorizon: number;
  annualIncome: MoneyCents;
  portfolioValue: MoneyCents;
  emergencyFundMonths: number;
  totalDebt: MoneyCents;
  totalAssets: MoneyCents;
}): { score: number; factors: FartherRiskProfile['capacityFactors'] } {
  // --- Time horizon sub-score ---
  let timeHorizonScore: number;
  if (params.timeHorizon < 3) {
    timeHorizonScore = 20;
  } else if (params.timeHorizon < 7) {
    // Linear interpolation within [3,7) => [40,65)
    timeHorizonScore = 40 + ((params.timeHorizon - 3) / 4) * 25;
  } else if (params.timeHorizon < 15) {
    // Linear interpolation within [7,15) => [65,85)
    timeHorizonScore = 65 + ((params.timeHorizon - 7) / 8) * 20;
  } else {
    timeHorizonScore = 85;
  }

  // --- Income stability sub-score ---
  // Heuristic: higher income relative to portfolio suggests stable W2
  const incomeToPortfolio =
    toDollars(params.portfolioValue) > 0
      ? toDollars(params.annualIncome) / toDollars(params.portfolioValue)
      : 0;

  let incomeStabilityScore: number;
  if (incomeToPortfolio > 0.15) {
    // High income relative to portfolio => likely active W2
    incomeStabilityScore = 70;
  } else if (incomeToPortfolio > 0.05) {
    // Moderate income => possibly variable or semi-retired
    incomeStabilityScore = 55;
  } else if (incomeToPortfolio > 0) {
    // Low income relative to portfolio => possibly retired with pension/SS
    incomeStabilityScore = 60;
  } else {
    // No income
    incomeStabilityScore = 40;
  }

  // --- Liquidity ratio sub-score ---
  let liquidityScore: number;
  if (params.emergencyFundMonths < 3) {
    liquidityScore = 20;
  } else if (params.emergencyFundMonths < 12) {
    // Linear interpolation [3,12) => [50,70)
    liquidityScore = 50 + ((params.emergencyFundMonths - 3) / 9) * 20;
  } else if (params.emergencyFundMonths < 36) {
    // Linear interpolation [12,36) => [70,85)
    liquidityScore = 70 + ((params.emergencyFundMonths - 12) / 24) * 15;
  } else {
    liquidityScore = 85;
  }

  // --- Debt ratio sub-score ---
  const totalAssetsDollars = toDollars(params.totalAssets);
  const debtRatio =
    totalAssetsDollars > 0
      ? toDollars(params.totalDebt) / totalAssetsDollars
      : 0;

  let debtScore: number;
  if (debtRatio > 0.5) {
    debtScore = 25;
  } else if (debtRatio > 0.3) {
    // Linear interpolation (0.3, 0.5] => [45, 25]
    debtScore = 45 + ((0.5 - debtRatio) / 0.2) * 20;
  } else if (debtRatio > 0.1) {
    // Linear interpolation (0.1, 0.3] => [65, 45]
    debtScore = 65 + ((0.3 - debtRatio) / 0.2) * 20;
  } else {
    debtScore = 85;
  }

  // --- Human capital value ---
  // Simplified PV: annualIncome * min(yearsToRetire, 30) * 0.7
  const assumedRetirementAge = 65;
  const estimatedAge = estimateAgeFromPortfolioAndIncome(
    toDollars(params.portfolioValue),
    toDollars(params.annualIncome),
  );
  const yearsToRetire = Math.max(0, assumedRetirementAge - estimatedAge);
  const humanCapitalValue =
    toDollars(params.annualIncome) * Math.min(yearsToRetire, 30) * 0.7;

  // Convert human capital to a 1-100 score based on ratio to total assets
  const hcvRatio =
    totalAssetsDollars > 0 ? humanCapitalValue / totalAssetsDollars : 0;
  let hcvScore: number;
  if (hcvRatio > 5) {
    hcvScore = 90; // Lots of future earnings relative to current assets
  } else if (hcvRatio > 2) {
    hcvScore = 75;
  } else if (hcvRatio > 1) {
    hcvScore = 60;
  } else if (hcvRatio > 0.3) {
    hcvScore = 45;
  } else {
    hcvScore = 25; // Near or in retirement
  }

  // --- Blend capacity sub-scores ---
  // Weights: timeHorizon 30%, incomeStability 20%, liquidity 20%, debt 15%, HCV 15%
  const score = clamp(
    Math.round(
      timeHorizonScore * 0.3 +
        incomeStabilityScore * 0.2 +
        liquidityScore * 0.2 +
        debtScore * 0.15 +
        hcvScore * 0.15,
    ),
    1,
    100,
  );

  return {
    score,
    factors: {
      timeHorizon: Math.round(timeHorizonScore),
      incomeStability: Math.round(incomeStabilityScore),
      liquidityRatio: Math.round(liquidityScore),
      debtRatio: Math.round(debtScore),
      humanCapitalValue: Math.round(humanCapitalValue),
    },
  };
}

// =====================================================================
// Internal -- Required Return Dimension
// =====================================================================

/**
 * Compute required return score.
 * Solves: goalFundingNeeded = currentSavings * (1 + r)^years
 * Then maps the required return to a risk score.
 */
function computeRequiredScore(params: {
  goalFundingNeeded: MoneyCents;
  currentSavings: MoneyCents;
  yearsToGoal: number;
}): { score: number; requiredReturn: number; fundingRatio: number } {
  const goal = toDollars(params.goalFundingNeeded);
  const savings = toDollars(params.currentSavings);
  const years = Math.max(params.yearsToGoal, 1);

  // Funding ratio: how much of the goal is already covered
  const fundingRatio = goal > 0 ? savings / goal : 1;

  // If already fully funded, minimal required return
  if (fundingRatio >= 1) {
    return { score: 20, requiredReturn: 0, fundingRatio };
  }

  // If savings is zero or negative, maximum required return
  if (savings <= 0) {
    return { score: 95, requiredReturn: 1, fundingRatio: 0 };
  }

  // Solve: goal = savings * (1 + r)^years  =>  r = (goal/savings)^(1/years) - 1
  const requiredReturn = Math.pow(goal / savings, 1 / years) - 1;

  // Map required return to score
  // Low return needed => lower risk score (can be conservative)
  // High return needed => higher risk score (must be aggressive)
  let score: number;
  if (requiredReturn <= 0.02) {
    score = 20; // 2% or less => very achievable conservatively
  } else if (requiredReturn <= 0.04) {
    // Linear [0.02, 0.04] => [20, 35]
    score = 20 + ((requiredReturn - 0.02) / 0.02) * 15;
  } else if (requiredReturn <= 0.06) {
    // Linear [0.04, 0.06] => [35, 50]
    score = 35 + ((requiredReturn - 0.04) / 0.02) * 15;
  } else if (requiredReturn <= 0.08) {
    // Linear [0.06, 0.08] => [50, 65]
    score = 50 + ((requiredReturn - 0.06) / 0.02) * 15;
  } else if (requiredReturn <= 0.10) {
    // Linear [0.08, 0.10] => [65, 80]
    score = 65 + ((requiredReturn - 0.08) / 0.02) * 15;
  } else if (requiredReturn <= 0.15) {
    // Linear [0.10, 0.15] => [80, 95]
    score = 80 + ((requiredReturn - 0.10) / 0.05) * 15;
  } else {
    score = 95; // 15%+ return needed => very aggressive
  }

  return {
    score: clamp(Math.round(score), 1, 100),
    requiredReturn: Math.round(requiredReturn * 10000) / 10000,
    fundingRatio: Math.round(fundingRatio * 10000) / 10000,
  };
}

// =====================================================================
// Internal -- Composite & Mapping
// =====================================================================

/**
 * Blend the three dimensions into a composite score.
 * Weights: behavioral 40%, capacity 35%, required 25%.
 */
function computeComposite(
  behavioral: number,
  capacity: number,
  required: number,
): number {
  const raw = behavioral * 0.4 + capacity * 0.35 + required * 0.25;
  return clamp(Math.round(raw), 1, 100);
}

/**
 * Map a numeric score (1-100) to a RiskLabel.
 */
function scoreToLabel(score: number): RiskLabel {
  if (score <= 20) return 'CONSERVATIVE';
  if (score <= 40) return 'MODERATELY_CONSERVATIVE';
  if (score <= 60) return 'MODERATE';
  if (score <= 80) return 'MODERATELY_AGGRESSIVE';
  return 'AGGRESSIVE';
}

// =====================================================================
// Helpers
// =====================================================================

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Rough age estimate from portfolio size and income.
 * This is a heuristic for human capital computation when actual age
 * is not available.  In production, age would come from the client record.
 */
function estimateAgeFromPortfolioAndIncome(
  portfolioValue: number,
  annualIncome: number,
): number {
  if (annualIncome <= 0) return 65; // no income => assume retired
  const ratio = portfolioValue / annualIncome;
  // Very rough: ratio of ~2 => ~30 years old, ratio of ~15 => ~60
  const estimated = 25 + ratio * 2.5;
  return clamp(Math.round(estimated), 22, 75);
}
