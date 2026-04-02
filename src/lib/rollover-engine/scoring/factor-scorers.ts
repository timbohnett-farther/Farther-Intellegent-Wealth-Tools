// =============================================================================
// Rollover Engine — Individual Factor Scoring Functions
// =============================================================================
//
// Each scorer returns a score 0-100 and direction:
//   0-39 = FAVOR_STAY
//   40-60 = NEUTRAL
//   61-100 = FAVOR_ROLLOVER
// =============================================================================

import type {
  RolloverAnalysis,
  RolloverPlan,
  FactorName,
  Score,
} from '../types';
import { toScore } from '../types';
import { compareFees } from '../benchmarks/benchmark-db';
import { FARTHER_IRA_FEES } from '../mock-data';

export interface FactorScoringInput {
  analysis: RolloverAnalysis;
  plan: RolloverPlan;
}

export interface FactorScoringResult {
  factor_name: FactorName;
  score: Score;
  direction: 'FAVOR_ROLLOVER' | 'FAVOR_STAY' | 'NEUTRAL';
  rationale: string;
  data_points: Record<string, unknown>;
}

function direction(score: number): 'FAVOR_ROLLOVER' | 'FAVOR_STAY' | 'NEUTRAL' {
  if (score >= 61) return 'FAVOR_ROLLOVER';
  if (score <= 39) return 'FAVOR_STAY';
  return 'NEUTRAL';
}

// ==================== 1. Fee Comparison ====================

export function scoreFeeComparison(input: FactorScoringInput): FactorScoringResult {
  const { plan } = input;
  const fartherBps = FARTHER_IRA_FEES.total_all_in_bps;
  const planBps = plan.total_plan_expense_bps;

  const comparison = compareFees(planBps, fartherBps, plan.plan_size_tier);

  let score: number;
  if (comparison.direction === 'FARTHER_CHEAPER') {
    // The bigger the fee gap, the higher the score (favor rollover)
    const savingsPct = comparison.fee_difference_bps / Math.max(planBps, 1);
    score = 60 + Math.min(40, savingsPct * 200);
  } else if (comparison.direction === 'PLAN_CHEAPER') {
    const costPct = Math.abs(comparison.fee_difference_bps) / Math.max(fartherBps, 1);
    score = 40 - Math.min(30, costPct * 150);
  } else {
    score = 50;
  }

  return {
    factor_name: 'FEE_COMPARISON',
    score: toScore(score),
    direction: direction(score),
    rationale: comparison.direction === 'FARTHER_CHEAPER'
      ? `Plan fees (${planBps} bps) exceed Farther IRA (${fartherBps} bps) by ${comparison.fee_difference_bps} bps. Plan ranks at the ${comparison.plan_percentile}th percentile for its tier.`
      : comparison.direction === 'PLAN_CHEAPER'
        ? `Plan fees (${planBps} bps) are lower than Farther IRA (${fartherBps} bps). Plan offers competitive pricing for its tier.`
        : `Plan fees (${planBps} bps) are comparable to Farther IRA (${fartherBps} bps).`,
    data_points: comparison as unknown as Record<string, unknown>,
  };
}

// ==================== 2. Investment Quality ====================

export function scoreInvestmentQuality(input: FactorScoringInput): FactorScoringResult {
  const { plan } = input;

  let score = 50; // Start neutral

  // Index fund ratio (more index = better quality for cost)
  const indexRatio = plan.fund_count > 0 ? plan.index_fund_count / plan.fund_count : 0;
  score += indexRatio * 20; // Up to +20 for all-index

  // Low investment management fees
  if (plan.investment_management_fees_bps <= 20) {
    score += 15; // Excellent
  } else if (plan.investment_management_fees_bps <= 50) {
    score += 5; // Good
  } else if (plan.investment_management_fees_bps > 100) {
    score -= 15; // Poor
  }

  // Farther offers unlimited customization + tax-loss harvesting
  score += 10; // Farther advantage

  return {
    factor_name: 'INVESTMENT_QUALITY',
    score: toScore(score),
    direction: direction(score),
    rationale: `Plan has ${plan.index_fund_count} index funds out of ${plan.fund_count} total (${Math.round(indexRatio * 100)}% index). Investment management fees: ${plan.investment_management_fees_bps} bps.`,
    data_points: {
      index_fund_ratio: indexRatio,
      investment_mgmt_bps: plan.investment_management_fees_bps,
      fund_count: plan.fund_count,
    },
  };
}

// ==================== 3. Investment Options ====================

export function scoreInvestmentOptions(input: FactorScoringInput): FactorScoringResult {
  const { plan } = input;

  let score = 50;

  // Fund count assessment
  if (plan.fund_count >= 30) score -= 5; // Plan has good breadth
  else if (plan.fund_count < 15) score += 15; // Limited options

  // Self-directed brokerage
  if (plan.self_directed_brokerage) {
    score -= 10; // Plan already has broad access
  } else {
    score += 15; // Farther IRA has unlimited options
  }

  // Target date funds
  if (plan.target_date_fund_count === 0) score += 5;

  // Farther advantage: unlimited investment universe
  score += 10;

  return {
    factor_name: 'INVESTMENT_OPTIONS',
    score: toScore(score),
    direction: direction(score),
    rationale: `Plan offers ${plan.fund_count} funds${plan.self_directed_brokerage ? ' with brokerage window' : ''}. Farther IRA provides access to the full investment universe.`,
    data_points: {
      fund_count: plan.fund_count,
      has_brokerage_window: plan.self_directed_brokerage,
      target_date_count: plan.target_date_fund_count,
    },
  };
}

// ==================== 4. Service Level ====================

export function scoreServiceLevel(input: FactorScoringInput): FactorScoringResult {
  // Farther always wins on service: dedicated advisor, planning, tax optimization
  let score = 75;

  // Large plans may have better institutional service
  if (input.plan.plan_size_tier === 'MEGA' || input.plan.plan_size_tier === 'LARGE') {
    score -= 10;
  }

  return {
    factor_name: 'SERVICE_LEVEL',
    score: toScore(score),
    direction: direction(score),
    rationale: 'Farther provides dedicated advisor access, comprehensive financial planning, tax optimization, and estate coordination — typically unavailable in employer plans.',
    data_points: {
      farther_features: FARTHER_IRA_FEES.features,
      plan_tier: input.plan.plan_size_tier,
    },
  };
}

// ==================== 5. Penalty-Free Access ====================

export function scorePenaltyFreeAccess(input: FactorScoringInput): FactorScoringResult {
  const { analysis, plan } = input;
  let score = 50;

  const yearsToRetirement = analysis.retirement_target_age - analysis.participant_age;

  // Rule of 55: if separating from employer at 55+, 401(k) allows penalty-free access
  if (analysis.participant_age >= 55 && analysis.participant_age < 59.5) {
    score -= 20; // Significant advantage to stay
  }

  // If over 59.5, both are penalty-free
  if (analysis.participant_age >= 59.5) {
    score = 50; // Neutral
  }

  // Hardship withdrawal
  if (plan.hardship_withdrawal) {
    score -= 5;
  }

  // Loan provision impact
  if (analysis.has_outstanding_loan) {
    score -= 15; // Loan must be repaid on rollover
  } else if (plan.loan_provision) {
    score -= 5; // Losing future loan option
  }

  return {
    factor_name: 'PENALTY_FREE_ACCESS',
    score: toScore(score),
    direction: direction(score),
    rationale: analysis.participant_age >= 55 && analysis.participant_age < 59.5
      ? `Client is ${analysis.participant_age} — Rule of 55 allows penalty-free 401(k) access. IRA requires age 59½.`
      : analysis.has_outstanding_loan
        ? `Outstanding plan loan of $${(analysis.outstanding_loan_cents / 100).toLocaleString()} would trigger deemed distribution on rollover.`
        : `Client is ${analysis.participant_age} with ${yearsToRetirement} years to retirement.`,
    data_points: {
      age: analysis.participant_age,
      has_loan: analysis.has_outstanding_loan,
      loan_amount: analysis.outstanding_loan_cents,
      has_hardship: plan.hardship_withdrawal,
      has_loan_provision: plan.loan_provision,
    },
  };
}

// ==================== 6. Creditor Protection ====================

export function scoreCreditorProtection(input: FactorScoringInput): FactorScoringResult {
  const { analysis } = input;

  // ERISA plans have unlimited federal creditor protection
  // IRAs have state-level protection (varies)
  // States with unlimited IRA protection: TX, FL, AZ, etc.
  const unlimitedIRAStates = ['TX', 'FL', 'AZ', 'MO', 'NC', 'OK', 'WA'];
  const hasUnlimitedIRA = unlimitedIRAStates.includes(analysis.state_of_residence);

  let score = hasUnlimitedIRA ? 50 : 35; // Default favors stay unless state has good IRA protection

  return {
    factor_name: 'CREDITOR_PROTECTION',
    score: toScore(score),
    direction: direction(score),
    rationale: hasUnlimitedIRA
      ? `${analysis.state_of_residence} provides unlimited IRA creditor protection, comparable to ERISA.`
      : `${analysis.state_of_residence} may have limited IRA creditor protection compared to ERISA's unlimited federal protection.`,
    data_points: {
      state: analysis.state_of_residence,
      unlimited_ira_state: hasUnlimitedIRA,
    },
  };
}

// ==================== 7. RMD Flexibility ====================

export function scoreRMDFlexibility(input: FactorScoringInput): FactorScoringResult {
  const { analysis } = input;
  let score = 50;

  // Still-working exception: if participant is still working and plan allows, no RMDs
  // This is a reason to STAY in the plan
  if (analysis.participant_age >= 73) {
    score -= 15; // RMD consideration — staying might avoid RMDs if still working
  }

  // Younger participants — RMDs are not relevant
  if (analysis.participant_age < 60) {
    score = 50; // Neutral
  }

  return {
    factor_name: 'RMD_FLEXIBILITY',
    score: toScore(score),
    direction: direction(score),
    rationale: analysis.participant_age >= 73
      ? 'Client is at or past RMD age. If still employed, the current 401(k) may allow deferral of RMDs.'
      : 'RMDs are not an immediate consideration at this age.',
    data_points: {
      age: analysis.participant_age,
      rmd_applicable: analysis.participant_age >= 73,
    },
  };
}

// ==================== 8. Employer Stock / NUA ====================

export function scoreEmployerStockNUA(input: FactorScoringInput): FactorScoringResult {
  const { analysis, plan } = input;

  if (!analysis.has_employer_stock && !plan.employer_stock) {
    return {
      factor_name: 'EMPLOYER_STOCK_NUA',
      score: toScore(50),
      direction: 'NEUTRAL',
      rationale: 'No employer stock in the plan — NUA analysis is not applicable.',
      data_points: { has_employer_stock: false },
    };
  }

  let score = 50;

  // NUA opportunity: if cost basis is significantly lower than current value,
  // in-kind distribution to taxable account could save taxes
  if (analysis.employer_stock_cost_basis_cents > 0) {
    // High concentration + low basis = strong NUA case (stay or partial rollover)
    const concentrationPct = plan.employer_stock_pct;
    if (concentrationPct > 20) {
      score -= 15; // High concentration — NUA strategy may be better than rollover
    } else if (concentrationPct > 10) {
      score -= 5;
    }

    // Very low cost basis = NUA opportunity
    if (analysis.employer_stock_cost_basis_cents < analysis.participant_balance_cents * 0.3) {
      score -= 10; // Significant NUA opportunity
    }
  }

  return {
    factor_name: 'EMPLOYER_STOCK_NUA',
    score: toScore(score),
    direction: direction(score),
    rationale: `Employer stock represents ${plan.employer_stock_pct}% of plan assets with cost basis of $${(analysis.employer_stock_cost_basis_cents / 100).toLocaleString()}. Net Unrealized Appreciation strategy may provide tax advantages.`,
    data_points: {
      employer_stock_pct: plan.employer_stock_pct,
      cost_basis_cents: analysis.employer_stock_cost_basis_cents,
      balance_cents: analysis.participant_balance_cents,
    },
  };
}

// ==================== 9. Plan Stability ====================

export function scorePlanStability(input: FactorScoringInput): FactorScoringResult {
  const { plan } = input;

  let score = 55; // Slight rollover bias — IRA is always stable

  // Smaller plans have higher risk of termination
  if (plan.plan_size_tier === 'MICRO') {
    score += 15;
  } else if (plan.plan_size_tier === 'SMALL') {
    score += 10;
  } else if (plan.plan_size_tier === 'MEGA') {
    score -= 5; // Very stable
  }

  // Low participant count = higher risk
  if (plan.participant_count < 20) {
    score += 10;
  }

  return {
    factor_name: 'PLAN_STABILITY',
    score: toScore(score),
    direction: direction(score),
    rationale: plan.plan_size_tier === 'MICRO' || plan.plan_size_tier === 'SMALL'
      ? `Small plan (${plan.participant_count} participants, ${plan.plan_size_tier} tier) has elevated termination risk.`
      : `Plan is ${plan.plan_size_tier} tier with ${plan.participant_count.toLocaleString()} participants — relatively stable.`,
    data_points: {
      plan_size_tier: plan.plan_size_tier,
      participant_count: plan.participant_count,
    },
  };
}

// ==================== 10. Special Circumstances ====================

export function scoreSpecialCircumstances(input: FactorScoringInput): FactorScoringResult {
  const { analysis } = input;
  let score = 55; // Slight rollover bias for consolidation benefits

  const factors: string[] = [];

  // Outstanding loan
  if (analysis.has_outstanding_loan && analysis.outstanding_loan_cents > 0) {
    score -= 15;
    factors.push(`Outstanding loan ($${(analysis.outstanding_loan_cents / 100).toLocaleString()}) — rollover triggers deemed distribution`);
  }

  // Near retirement — consolidation valuable
  const yearsToRetirement = analysis.retirement_target_age - analysis.participant_age;
  if (yearsToRetirement <= 5) {
    score += 10;
    factors.push('Near retirement — consolidation simplifies RMD planning');
  }

  // Young participant — long horizon benefits from IRA flexibility
  if (analysis.participant_age < 40) {
    score += 5;
    factors.push('Long investment horizon — IRA flexibility adds compounding value');
  }

  // Consolidation benefit (always applies to some degree)
  factors.push('Household consolidation enables holistic planning and tax optimization');

  return {
    factor_name: 'SPECIAL_CIRCUMSTANCES',
    score: toScore(score),
    direction: direction(score),
    rationale: factors.join('. ') + '.',
    data_points: {
      has_loan: analysis.has_outstanding_loan,
      years_to_retirement: yearsToRetirement,
      age: analysis.participant_age,
      factors,
    },
  };
}

// ==================== Factor Scorer Registry ====================

export const FACTOR_SCORERS: Record<FactorName, (input: FactorScoringInput) => FactorScoringResult> = {
  FEE_COMPARISON: scoreFeeComparison,
  INVESTMENT_QUALITY: scoreInvestmentQuality,
  INVESTMENT_OPTIONS: scoreInvestmentOptions,
  SERVICE_LEVEL: scoreServiceLevel,
  PENALTY_FREE_ACCESS: scorePenaltyFreeAccess,
  CREDITOR_PROTECTION: scoreCreditorProtection,
  RMD_FLEXIBILITY: scoreRMDFlexibility,
  EMPLOYER_STOCK_NUA: scoreEmployerStockNUA,
  PLAN_STABILITY: scorePlanStability,
  SPECIAL_CIRCUMSTANCES: scoreSpecialCircumstances,
};
