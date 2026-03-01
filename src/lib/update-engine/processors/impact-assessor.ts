// =============================================================================
// Update Engine — Impact Assessor
// =============================================================================
//
// Evaluates the severity and scope of detected tax table changes.
// Estimates client impact by wealth tier and generates structured
// impact assessments for routing and prioritization.
// =============================================================================

import type { ChangeItem, TaxTableType } from '../types';

// ==================== Interfaces ====================

/**
 * A comprehensive assessment of a change's impact on clients and plans.
 */
export interface ImpactAssessment {
  /** Overall severity of the change. */
  severity: 'low' | 'medium' | 'high' | 'critical';
  /** Estimated number of clients affected by this change. */
  affectedClientCount: number;
  /** Average dollar impact per affected client. */
  avgDollarImpact: number;
  /** Which wealth tiers are most affected. */
  mostAffectedTiers: string[];
  /** How urgently this change needs to be addressed. */
  urgency: string;
  /** Human-readable description of the impact. */
  description: string;
}

/** Wealth tier classifications used in Farther Prism. */
type WealthTier = 'mass_affluent' | 'hnw' | 'uhnw' | 'ultra_uhnw';

/** Estimated portfolio sizes by wealth tier. */
const TIER_PORTFOLIO_ESTIMATES: Record<WealthTier, { min: number; typical: number }> = {
  mass_affluent: { min: 250_000, typical: 750_000 },
  hnw: { min: 1_000_000, typical: 3_000_000 },
  uhnw: { min: 10_000_000, typical: 25_000_000 },
  ultra_uhnw: { min: 50_000_000, typical: 100_000_000 },
};

/** Total estimated client base for impact calculations. */
const ESTIMATED_TOTAL_CLIENTS = 5_000;

// ==================== Impact Rules ====================

/**
 * Mapping of table types to their impact estimation functions.
 * Each function takes a ChangeItem and returns a partial ImpactAssessment.
 */
export const IMPACT_RULES: Record<
  string,
  (change: ChangeItem) => Partial<ImpactAssessment>
> = {
  ordinary_income_brackets: assessBracketImpact,
  capital_gains_brackets: assessBracketImpact,
  amt_exemptions: (change) => ({
    ...assessBracketImpact(change),
    mostAffectedTiers: ['hnw', 'uhnw', 'ultra_uhnw'],
    description: `AMT exemption change: ${change.description}. Affects AMT calculations for higher-income clients.`,
  }),
  contribution_limits_401k: assessContributionLimitImpact,
  contribution_limits_ira: assessContributionLimitImpact,
  contribution_limits_hsa: assessContributionLimitImpact,
  rmd_tables: () => ({
    severity: 'medium',
    affectedClientCount: Math.round(ESTIMATED_TOTAL_CLIENTS * 0.25),
    avgDollarImpact: 2_500,
    mostAffectedTiers: ['mass_affluent', 'hnw'],
    urgency: 'standard',
    description: 'RMD table changes affect retirees with traditional IRA/401(k) accounts.',
  }),
  irmaa_part_b: assessIRMAAImpact,
  irmaa_part_d: assessIRMAAImpact,
  estate_exemption: assessEstateTaxImpact,
  gift_exemption: () => ({
    severity: 'medium',
    affectedClientCount: Math.round(ESTIMATED_TOTAL_CLIENTS * 0.30),
    avgDollarImpact: 5_000,
    mostAffectedTiers: ['hnw', 'uhnw', 'ultra_uhnw'],
    urgency: 'standard',
    description: 'Gift tax exclusion changes affect clients with active gifting strategies.',
  }),
  afr_rates: () => ({
    severity: 'low',
    affectedClientCount: Math.round(ESTIMATED_TOTAL_CLIENTS * 0.10),
    avgDollarImpact: 1_000,
    mostAffectedTiers: ['uhnw', 'ultra_uhnw'],
    urgency: 'low',
    description: 'AFR rate changes affect intra-family loan and GRAT strategies.',
  }),
  ss_cola: () => ({
    severity: 'medium',
    affectedClientCount: Math.round(ESTIMATED_TOTAL_CLIENTS * 0.40),
    avgDollarImpact: 3_000,
    mostAffectedTiers: ['mass_affluent', 'hnw'],
    urgency: 'standard',
    description: 'Social Security COLA changes affect retirement income projections.',
  }),
  ss_wage_base: () => ({
    severity: 'low',
    affectedClientCount: Math.round(ESTIMATED_TOTAL_CLIENTS * 0.50),
    avgDollarImpact: 1_500,
    mostAffectedTiers: ['mass_affluent', 'hnw'],
    urgency: 'standard',
    description: 'Social Security wage base changes affect FICA tax calculations.',
  }),
  ss_bend_points: () => ({
    severity: 'low',
    affectedClientCount: Math.round(ESTIMATED_TOTAL_CLIENTS * 0.35),
    avgDollarImpact: 1_200,
    mostAffectedTiers: ['mass_affluent', 'hnw'],
    urgency: 'standard',
    description: 'Social Security bend point changes affect PIA calculations.',
  }),
  standard_deductions: () => ({
    severity: 'low',
    affectedClientCount: Math.round(ESTIMATED_TOTAL_CLIENTS * 0.60),
    avgDollarImpact: 500,
    mostAffectedTiers: ['mass_affluent'],
    urgency: 'low',
    description: 'Standard deduction adjustments affect tax liability calculations for most filers.',
  }),
  state_income_tax: (change) => ({
    ...assessBracketImpact(change),
    description: `State income tax change: ${change.description}. Affects clients in the corresponding state.`,
  }),
};

// ==================== Core Assessment ====================

/**
 * Evaluates the severity and scope of a single change item.
 * Dispatches to table-type-specific impact rules and fills in defaults
 * for any fields not populated by the rule.
 *
 * @param change - The change item to assess.
 * @returns A complete ImpactAssessment.
 */
export function assessImpact(change: ChangeItem): ImpactAssessment {
  const tableType: TaxTableType = change.tableType;

  // Find the matching impact rule
  const rule = IMPACT_RULES[tableType];
  const partial: Partial<ImpactAssessment> = rule ? rule(change) : {};

  // Determine severity from change properties if not set by rule
  const severity = (partial.severity ?? deriveSeverity(change)) as ImpactAssessment['severity'];

  // Determine urgency based on severity and change type
  const urgency = partial.urgency ?? deriveUrgency(severity, change.type);

  return {
    severity,
    affectedClientCount: partial.affectedClientCount ?? Math.round(ESTIMATED_TOTAL_CLIENTS * 0.20),
    avgDollarImpact: partial.avgDollarImpact ?? 1_000,
    mostAffectedTiers: partial.mostAffectedTiers ?? ['mass_affluent', 'hnw'],
    urgency,
    description: partial.description ?? `Change detected in ${tableType}: ${change.description}`,
  };
}

/**
 * Derives severity from a change item's properties when no table-specific
 * rule provides one.
 */
function deriveSeverity(change: ChangeItem): ChangeItem['severity'] {
  if (change.type === 'law_change' || change.type === 'new_provision') {
    return 'high';
  }
  return change.severity;
}

/**
 * Derives urgency from severity and change type.
 */
function deriveUrgency(severity: string, changeType: string): string {
  if (severity === 'critical') return 'immediate';
  if (severity === 'high') return 'urgent';
  if (changeType === 'pending_legislation') return 'monitoring';
  if (severity === 'medium') return 'standard';
  return 'low';
}

// ==================== Tier-Level Estimation ====================

/**
 * Estimates the dollar impact of a change for a specific wealth tier.
 * Uses the change's estimated impact and the tier's typical portfolio
 * to compute a scaled estimate.
 *
 * @param change - The change item.
 * @param wealthTier - The wealth tier to estimate for.
 * @returns Estimated dollar impact for a typical client in this tier.
 */
export function estimateClientImpact(
  change: ChangeItem,
  wealthTier: WealthTier
): number {
  const tierData = TIER_PORTFOLIO_ESTIMATES[wealthTier];
  const baseImpact = change.estimatedImpact
    ? parseFloat(change.estimatedImpact) || 1_000
    : 1_000;

  // Scale impact by portfolio size relative to mass affluent baseline
  const baselinePortfolio = TIER_PORTFOLIO_ESTIMATES.mass_affluent.typical;
  const scaleFactor = tierData.typical / baselinePortfolio;

  const tableType = change.tableType;

  // Estate and gift tax changes scale more aggressively with wealth
  const isEstateRelated =
    tableType === 'estate_exemption' || tableType === 'gift_exemption';
  const adjustedScale = isEstateRelated ? scaleFactor * 1.5 : scaleFactor;

  // Contribution limit changes are capped (everyone has the same limit)
  const isContributionLimit = tableType.startsWith('contribution_limits');
  if (isContributionLimit) {
    return baseImpact; // Same for all tiers
  }

  return Math.round(baseImpact * adjustedScale);
}

// ==================== Table-Specific Impact Functions ====================

/**
 * Assesses the impact of a federal or state income bracket change.
 * Bracket changes affect all filers but scale with income.
 */
export function assessBracketImpact(change: ChangeItem): Partial<ImpactAssessment> {
  const isLargeChange = change.severity === 'high' || change.severity === 'critical';

  return {
    severity: isLargeChange ? 'high' : 'medium',
    affectedClientCount: Math.round(ESTIMATED_TOTAL_CLIENTS * 0.80),
    avgDollarImpact: isLargeChange ? 8_000 : 2_500,
    mostAffectedTiers: isLargeChange
      ? ['hnw', 'uhnw', 'ultra_uhnw']
      : ['mass_affluent', 'hnw'],
    urgency: isLargeChange ? 'urgent' : 'standard',
    description: `Income bracket change: ${change.description}. Affects tax liability calculations for most clients.`,
  };
}

/**
 * Assesses the impact of contribution limit changes (401k, IRA, HSA, etc.).
 * Limits affect savers uniformly regardless of wealth tier.
 */
export function assessContributionLimitImpact(
  change: ChangeItem
): Partial<ImpactAssessment> {
  return {
    severity: 'low',
    affectedClientCount: Math.round(ESTIMATED_TOTAL_CLIENTS * 0.65),
    avgDollarImpact: 500,
    mostAffectedTiers: ['mass_affluent', 'hnw'],
    urgency: 'standard',
    description: `Contribution limit change: ${change.description}. Affects retirement and tax-advantaged savings projections.`,
  };
}

/**
 * Assesses the impact of IRMAA bracket changes.
 * IRMAA affects higher-income Medicare beneficiaries.
 */
export function assessIRMAAImpact(change: ChangeItem): Partial<ImpactAssessment> {
  return {
    severity: 'medium',
    affectedClientCount: Math.round(ESTIMATED_TOTAL_CLIENTS * 0.30),
    avgDollarImpact: 4_000,
    mostAffectedTiers: ['hnw', 'uhnw'],
    urgency: 'standard',
    description: `IRMAA bracket change: ${change.description}. Affects Medicare premium surcharge calculations for higher-income retirees.`,
  };
}

/**
 * Assesses the impact of estate tax exemption changes.
 * Estate tax changes have outsized impact on ultra-high-net-worth clients.
 */
export function assessEstateTaxImpact(change: ChangeItem): Partial<ImpactAssessment> {
  const isSunsetOrMajor = change.type === 'law_change' || change.severity === 'critical';

  return {
    severity: isSunsetOrMajor ? 'critical' : 'high',
    affectedClientCount: Math.round(ESTIMATED_TOTAL_CLIENTS * 0.20),
    avgDollarImpact: isSunsetOrMajor ? 500_000 : 50_000,
    mostAffectedTiers: ['uhnw', 'ultra_uhnw'],
    urgency: isSunsetOrMajor ? 'immediate' : 'urgent',
    description: isSunsetOrMajor
      ? `Critical estate tax change: ${change.description}. Major impact on estate planning strategies for UHNW clients.`
      : `Estate tax adjustment: ${change.description}. Affects exemption amounts and estate planning projections.`,
  };
}
