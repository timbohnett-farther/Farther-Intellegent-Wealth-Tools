/**
 * Opportunity Detection Rules
 *
 * Defines all active opportunity detection rules. Each rule specifies
 * eligibility, trigger, and blocking conditions, along with scoring formulas
 * and output templates.
 */

import type { OpportunityRule, OpportunityRulePackage } from '@/types/opportunity-engine';

// ============================================================================
// RULE: ROTH CONVERSION HEADROOM
// ============================================================================

export const ROTH_CONVERSION_HEADROOM_RULE: OpportunityRule = {
  ruleName: 'roth_conversion_headroom',
  ruleVersion: '1.0.0',
  category: 'roth_conversion',
  title: 'Roth Conversion Headroom Opportunity',
  description:
    'Detects when a household has significant headroom to convert traditional IRA funds to Roth without moving to the next tax bracket, optimizing long-term tax efficiency.',
  priority: 90,

  // Eligibility: Must have traditional retirement accounts and be below top bracket
  eligibility: [
    {
      type: 'flag',
      field: 'householdMetadata.hasRetirementAccounts',
      operator: 'eq',
      value: true,
      label: 'Has retirement accounts',
      description: 'Household must have traditional IRA or 401(k) accounts',
    },
    {
      type: 'threshold',
      field: 'taxOutput.summary.marginalTaxRate',
      operator: 'lt',
      value: 0.37,
      label: 'Below top tax bracket',
      description: 'Marginal rate must be below 37% (top bracket)',
    },
  ],

  // Triggers: Has significant headroom to next bracket
  triggers: [
    {
      type: 'threshold',
      field: 'signals.rothConversion.headroom',
      operator: 'gte',
      value: 25000,
      label: 'Headroom ≥ $25,000',
      description: 'At least $25K of space to next bracket',
    },
  ],

  // Blocking: Don't recommend if already in high bracket with IRMAA risk
  blocking: [
    {
      type: 'composite',
      field: 'signals.irmaa.b1',
      operator: 'eq',
      value: true,
      label: 'IRMAA Bracket 1',
      description: 'Block if already in IRMAA exposure',
    },
  ],

  // Scoring
  scoringFormula: {
    impact: {
      type: 'scaled',
      field: 'signals.rothConversion.headroom',
      scale: { min: 25000, max: 200000 },
    },
    urgency: {
      type: 'fixed',
      fixedScore: 60, // Moderate urgency (can be done anytime)
    },
    confidence: {
      type: 'field_based',
      fields: [
        { field: 'taxOutput.summary.agi', weight: 0.5 },
        { field: 'signals.rothConversion.marginalRate', weight: 0.5 },
      ],
    },
    complexity: {
      type: 'fixed',
      fixedScore: 85, // Low complexity (straightforward conversion)
    },
    weights: {
      impact: 0.4,
      urgency: 0.2,
      confidence: 0.2,
      complexity: 0.2,
    },
  },

  // Output
  outputTemplate: {
    titleTemplate:
      'Roth Conversion Opportunity: $${signals.rothConversion.headroom} headroom at ${signals.rothConversion.marginalRate}% rate',
    summaryTemplate:
      'You have $${signals.rothConversion.headroom} of headroom before reaching the next tax bracket (${signals.rothConversion.nextBracketThreshold}). Converting traditional IRA funds to Roth now at ${signals.rothConversion.marginalRate}% could save taxes long-term.',
    evidenceFields: [
      'signals.rothConversion.headroom',
      'signals.rothConversion.marginalRate',
      'signals.rothConversion.nextBracketThreshold',
      'taxOutput.summary.agi',
    ],
    contextFields: [
      'signals.rothConversion.currentBracket',
      'taxOutput.summary.marginalTaxRate',
      'taxOutput.summary.effectiveTaxRate',
    ],
    estimatedValueField: 'signals.rothConversion.headroom',
  },

  isActive: true,
};

// ============================================================================
// RULE: IRMAA PROXIMITY ALERT
// ============================================================================

export const IRMAA_PROXIMITY_ALERT_RULE: OpportunityRule = {
  ruleName: 'irmaa_proximity_alert',
  ruleVersion: '1.0.0',
  category: 'irmaa',
  title: 'IRMAA Proximity Alert',
  description:
    'Detects when a household is within $10K of crossing an IRMAA bracket threshold, triggering higher Medicare premiums. Recommends strategies to stay below the threshold.',
  priority: 95,

  // Eligibility: Client approaching Medicare age or already enrolled
  eligibility: [
    {
      type: 'threshold',
      field: 'householdMetadata.clientAge',
      operator: 'gte',
      value: 60,
      label: 'Age ≥ 60',
      description: 'Client must be within 5 years of Medicare enrollment',
    },
  ],

  // Triggers: Within $10K of IRMAA bracket
  triggers: [
    {
      type: 'threshold',
      field: 'signals.irmaa.distanceToBracket',
      operator: 'lte',
      value: 10000,
      label: 'Distance to bracket ≤ $10,000',
      description: 'MAGI is within $10K of next IRMAA bracket',
    },
    {
      type: 'threshold',
      field: 'signals.irmaa.distanceToBracket',
      operator: 'gt',
      value: 0,
      label: 'Not yet in bracket',
      description: 'Still below the threshold (not already crossed)',
    },
  ],

  // No blocking conditions
  blocking: [],

  // Scoring
  scoringFormula: {
    impact: {
      type: 'tiered',
      field: 'signals.irmaa.distanceToBracket',
      tiers: [
        { threshold: 0, score: 100 }, // Closest = highest impact
        { threshold: 5000, score: 75 },
        { threshold: 10000, score: 50 },
      ],
    },
    urgency: {
      type: 'deadline',
      deadline: new Date(new Date().getFullYear(), 11, 31), // End of tax year
    },
    confidence: {
      type: 'field_based',
      fields: [
        { field: 'taxOutput.summary.agi', weight: 0.6 },
        { field: 'signals.irmaa.magi', weight: 0.4 },
      ],
    },
    complexity: {
      type: 'fixed',
      fixedScore: 70, // Moderate complexity (requires income planning)
    },
    weights: {
      impact: 0.35,
      urgency: 0.3,
      confidence: 0.2,
      complexity: 0.15,
    },
  },

  // Output
  outputTemplate: {
    titleTemplate:
      'IRMAA Alert: $${signals.irmaa.distanceToBracket} from higher Medicare premiums',
    summaryTemplate:
      'Your MAGI of $${signals.irmaa.magi} is only $${signals.irmaa.distanceToBracket} below the next IRMAA bracket ($${signals.irmaa.irmaaBracketThreshold}). Crossing this threshold could increase Medicare Part B and D premiums by thousands annually. Consider strategies to reduce AGI.',
    evidenceFields: [
      'signals.irmaa.magi',
      'signals.irmaa.irmaaBracketThreshold',
      'signals.irmaa.distanceToBracket',
      'householdMetadata.clientAge',
    ],
    contextFields: [
      'signals.irmaa.b1',
      'signals.irmaa.b2',
      'signals.irmaa.b3',
      'signals.irmaa.b4',
      'taxOutput.summary.agi',
    ],
    estimatedValueField: 'signals.irmaa.distanceToBracket',
  },

  isActive: true,
};

// ============================================================================
// RULE: WITHHOLDING PAYMENT MISMATCH
// ============================================================================

export const WITHHOLDING_PAYMENT_MISMATCH_RULE: OpportunityRule = {
  ruleName: 'withholding_payment_mismatch',
  ruleVersion: '1.0.0',
  category: 'withholding',
  title: 'Withholding Payment Mismatch',
  description:
    'Detects when federal tax withholding or estimated payments are significantly misaligned with actual tax liability, leading to large refunds or underpayment penalties.',
  priority: 85,

  // Eligibility: Has wages or other withholding
  eligibility: [
    {
      type: 'threshold',
      field: 'taxOutput.summary.totalTax',
      operator: 'gt',
      value: 1000,
      label: 'Total tax > $1,000',
      description: 'Household must have meaningful tax liability',
    },
  ],

  // Triggers: Shortfall OR overpayment
  triggers: [
    {
      type: 'composite',
      field: 'signals.withholding.isShortfall',
      operator: 'eq',
      value: true,
      label: 'Underpayment detected',
      description: 'Withholding is less than 90% of tax liability',
    },
  ],

  // No blocking
  blocking: [],

  // Scoring
  scoringFormula: {
    impact: {
      type: 'scaled',
      field: 'signals.withholding.shortfall',
      scale: { min: 1000, max: 20000 },
    },
    urgency: {
      type: 'seasonal',
      seasonalWindow: { start: '01-01', end: '04-15' }, // Q1 estimated payment
    },
    confidence: {
      type: 'field_based',
      fields: [
        { field: 'taxOutput.summary.totalTax', weight: 0.5 },
        { field: 'signals.withholding.totalWithheld', weight: 0.5 },
      ],
    },
    complexity: {
      type: 'fixed',
      fixedScore: 90, // Very simple (adjust W-4 or make estimated payment)
    },
    weights: {
      impact: 0.3,
      urgency: 0.3,
      confidence: 0.25,
      complexity: 0.15,
    },
  },

  // Output
  outputTemplate: {
    titleTemplate: 'Withholding Shortfall: $${signals.withholding.shortfall} underpaid',
    summaryTemplate:
      'Your current withholding ($${signals.withholding.totalWithheld}) is $${signals.withholding.shortfall} less than your estimated tax liability ($${signals.withholding.totalTax}). This may result in an underpayment penalty. Consider adjusting your W-4 or making quarterly estimated payments.',
    evidenceFields: [
      'signals.withholding.shortfall',
      'signals.withholding.totalWithheld',
      'signals.withholding.totalTax',
      'taxOutput.summary.totalTax',
    ],
    contextFields: [
      'signals.withholding.isShortfall',
      'signals.withholding.overpayment',
      'taxOutput.summary.refundOrBalanceDue',
    ],
    estimatedValueField: 'signals.withholding.shortfall',
  },

  isActive: true,
};

// ============================================================================
// RULE PACKAGE
// ============================================================================

export const OPPORTUNITY_RULE_PACKAGE_2025_V1: OpportunityRulePackage = {
  packageVersion: '2025_v1',
  taxYear: 2025,
  rules: [
    ROTH_CONVERSION_HEADROOM_RULE,
    IRMAA_PROXIMITY_ALERT_RULE,
    WITHHOLDING_PAYMENT_MISMATCH_RULE,
  ],
  publishedAt: new Date('2025-01-01'),
  publishedBy: 'system',
};

// Export individual rules for testing
export const ALL_RULES = {
  ROTH_CONVERSION_HEADROOM: ROTH_CONVERSION_HEADROOM_RULE,
  IRMAA_PROXIMITY_ALERT: IRMAA_PROXIMITY_ALERT_RULE,
  WITHHOLDING_PAYMENT_MISMATCH: WITHHOLDING_PAYMENT_MISMATCH_RULE,
};
