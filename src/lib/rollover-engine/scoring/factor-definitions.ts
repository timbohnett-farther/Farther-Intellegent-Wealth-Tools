// =============================================================================
// Rollover Engine — Factor Definitions
// =============================================================================

import type { FactorName } from '../types';

export interface FactorDefinition {
  name: FactorName;
  label: string;
  description: string;
  weight: number; // 0.0 to 1.0, all weights sum to 1.0
  category: 'FINANCIAL' | 'FEATURES' | 'PROTECTION' | 'SPECIAL';
}

/**
 * The 10 factors in the Rollover Recommendation Score (RRS) framework.
 * Weights reflect DOL best interest guidance and Reg BI considerations.
 */
export const FACTOR_DEFINITIONS: Record<FactorName, FactorDefinition> = {
  FEE_COMPARISON: {
    name: 'FEE_COMPARISON',
    label: 'Fee Comparison',
    description: 'Compares total plan fees (expense ratios, admin fees, per-participant charges) against Farther IRA all-in costs and peer benchmarks.',
    weight: 0.20,
    category: 'FINANCIAL',
  },
  INVESTMENT_QUALITY: {
    name: 'INVESTMENT_QUALITY',
    label: 'Investment Quality',
    description: 'Evaluates fund lineup quality: expense ratios, Morningstar ratings, index fund availability, asset class diversification.',
    weight: 0.15,
    category: 'FINANCIAL',
  },
  INVESTMENT_OPTIONS: {
    name: 'INVESTMENT_OPTIONS',
    label: 'Investment Options',
    description: 'Assesses breadth of investment choices: number of funds, asset classes covered, self-directed brokerage window, alternatives access.',
    weight: 0.10,
    category: 'FEATURES',
  },
  SERVICE_LEVEL: {
    name: 'SERVICE_LEVEL',
    label: 'Service & Advice',
    description: 'Compares service levels: dedicated advisor access, financial planning integration, estate coordination, tax optimization.',
    weight: 0.10,
    category: 'FEATURES',
  },
  PENALTY_FREE_ACCESS: {
    name: 'PENALTY_FREE_ACCESS',
    label: 'Penalty-Free Access',
    description: 'Evaluates Rule of 55, age 59½ considerations, hardship withdrawal provisions, and loan repayment impacts.',
    weight: 0.10,
    category: 'PROTECTION',
  },
  CREDITOR_PROTECTION: {
    name: 'CREDITOR_PROTECTION',
    label: 'Creditor Protection',
    description: 'Compares ERISA creditor protections in 401(k) vs. state-level IRA protections based on state of residence.',
    weight: 0.05,
    category: 'PROTECTION',
  },
  RMD_FLEXIBILITY: {
    name: 'RMD_FLEXIBILITY',
    label: 'RMD Flexibility',
    description: 'Evaluates Required Minimum Distribution rules: still-working exception for current employer plan, age-based considerations.',
    weight: 0.05,
    category: 'PROTECTION',
  },
  EMPLOYER_STOCK_NUA: {
    name: 'EMPLOYER_STOCK_NUA',
    label: 'Employer Stock / NUA',
    description: 'Assesses Net Unrealized Appreciation (NUA) opportunity for employer stock: cost basis, current value, tax impact of in-kind distribution.',
    weight: 0.10,
    category: 'SPECIAL',
  },
  PLAN_STABILITY: {
    name: 'PLAN_STABILITY',
    label: 'Plan Stability',
    description: 'Evaluates plan sponsor stability, merger/acquisition risk, plan freezing risk, and regulatory compliance history.',
    weight: 0.05,
    category: 'SPECIAL',
  },
  SPECIAL_CIRCUMSTANCES: {
    name: 'SPECIAL_CIRCUMSTANCES',
    label: 'Special Circumstances',
    description: 'Accounts for unique situations: outstanding loan offset, divorce proceedings, bankruptcy considerations, Roth conversion ladder.',
    weight: 0.10,
    category: 'SPECIAL',
  },
};

/**
 * Returns default weights as a map.
 */
export function getDefaultWeights(): Record<FactorName, number> {
  const weights: Record<string, number> = {};
  for (const [name, def] of Object.entries(FACTOR_DEFINITIONS)) {
    weights[name] = def.weight;
  }
  return weights as Record<FactorName, number>;
}

/**
 * Returns all factor definitions as an ordered array.
 */
export function getFactorDefinitionList(): FactorDefinition[] {
  return Object.values(FACTOR_DEFINITIONS);
}
