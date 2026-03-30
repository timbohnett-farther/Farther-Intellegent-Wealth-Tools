/**
 * Rule Evaluator Tests
 *
 * Comprehensive test suite for the rule evaluation engine.
 * Tests condition evaluation, field resolution, scoring algorithms,
 * and template interpolation.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ruleEvaluator } from '../rule-evaluator';
import type {
  OpportunityRule,
  EvaluationContext,
  RuleCondition,
  ScoringFormula,
} from '@/types/opportunity-engine';
import type { TaxOutput } from '@/types/tax-engine';

// Mock tax output for testing
const createMockTaxOutput = (): TaxOutput => ({
  summary: {
    filingStatus: 'married_filing_jointly',
    agi: 150000,
    taxableIncome: 120000,
    totalIncome: 160000,
    totalDeductions: 40000,
    totalTax: 24000,
    taxAfterCredits: 22000,
    refundOrBalanceDue: -2000,
    effectiveTaxRate: 0.16,
    marginalTaxRate: 0.24,
  },
  incomeBreakdown: {
    wages: 140000,
    taxableInterest: 2000,
    qualifiedDividends: 8000,
    ordinaryDividends: 8000,
    capitalGains: 10000,
    businessIncome: 0,
    rentalIncome: 0,
    retirementDistributions: 0,
    socialSecurityBenefits: 0,
    otherIncome: 0,
  },
  deductionBreakdown: {
    standardDeduction: 0,
    itemizedDeductions: 30000,
    qbiDeduction: 10000,
    totalDeductions: 40000,
  },
  taxCalculation: {
    ordinaryIncomeTax: 20000,
    capitalGainsTax: 1500,
    niit: 2500,
    totalTax: 24000,
  },
  credits: {
    nonRefundableCredits: 2000,
    refundableCredits: 0,
    totalCredits: 2000,
  },
  payments: {
    federalWithholding: 24000,
    estimatedPayments: 0,
    totalPayments: 24000,
  },
  warnings: [],
});

const createMockContext = (overrides?: Partial<EvaluationContext>): EvaluationContext => ({
  taxOutput: createMockTaxOutput(),
  householdId: 'test-household-123',
  taxYear: 2025,
  currentDate: new Date('2025-06-15'),
  signals: {
    niit: {
      applies: true,
      magi: 260000,
      niitThreshold: 250000,
      distanceToThreshold: -10000,
      niitAmount: 2500,
    },
    irmaa: {
      b1: false,
      b2: false,
      b3: false,
      b4: false,
      magi: 190000,
      irmaaBracketThreshold: 206000,
      distanceToBracket: 16000,
    },
    withholding: {
      shortfall: 5000,
      isShortfall: true,
      overpayment: 0,
      isOverpayment: false,
      totalWithheld: 19000,
      totalTax: 24000,
    },
    rothConversion: {
      headroom: 50000,
      hasHeadroom: true,
      currentBracket: 24,
      nextBracketThreshold: 200000,
      marginalRate: 0.24,
    },
    capitalGains: {
      has0PercentHeadroom: false,
      headroom0Percent: 0,
      has15PercentHeadroom: true,
      headroom15Percent: 100000,
      unrealizedGains: 50000,
    },
    deductions: {
      usingStandard: false,
      itemizedAmount: 30000,
      standardAmount: 30000,
      nearThreshold: true,
      charitableContributions: 15000,
    },
    qbi: {
      hasQBI: true,
      qbiAmount: 50000,
      qbiDeduction: 10000,
      phaseoutStart: 400000,
      distanceToPhaseout: 250000,
    },
  },
  householdMetadata: {
    clientAge: 55,
    spouseAge: 53,
    hasRetirementAccounts: true,
    hasTaxableAccounts: true,
    stateOfResidence: 'CA',
  },
  ...overrides,
});

describe('RuleEvaluator', () => {
  describe('Condition Evaluation', () => {
    it('should evaluate eq (equals) operator', () => {
      const condition: RuleCondition = {
        type: 'threshold',
        field: 'signals.niit.applies',
        operator: 'eq',
        value: true,
      };

      const context = createMockContext();
      const result = (ruleEvaluator as any).evaluateCondition(condition, context);
      expect(result).toBe(true);
    });

    it('should evaluate ne (not equals) operator', () => {
      const condition: RuleCondition = {
        type: 'threshold',
        field: 'signals.irmaa.b1',
        operator: 'ne',
        value: true,
      };

      const context = createMockContext();
      const result = (ruleEvaluator as any).evaluateCondition(condition, context);
      expect(result).toBe(true); // b1 is false, so ne true = true
    });

    it('should evaluate gt (greater than) operator', () => {
      const condition: RuleCondition = {
        type: 'threshold',
        field: 'taxOutput.summary.agi',
        operator: 'gt',
        value: 100000,
      };

      const context = createMockContext();
      const result = (ruleEvaluator as any).evaluateCondition(condition, context);
      expect(result).toBe(true); // 150000 > 100000
    });

    it('should evaluate gte (greater than or equal) operator', () => {
      const condition: RuleCondition = {
        type: 'threshold',
        field: 'taxOutput.summary.agi',
        operator: 'gte',
        value: 150000,
      };

      const context = createMockContext();
      const result = (ruleEvaluator as any).evaluateCondition(condition, context);
      expect(result).toBe(true); // 150000 >= 150000
    });

    it('should evaluate lt (less than) operator', () => {
      const condition: RuleCondition = {
        type: 'threshold',
        field: 'taxOutput.summary.marginalTaxRate',
        operator: 'lt',
        value: 0.37,
      };

      const context = createMockContext();
      const result = (ruleEvaluator as any).evaluateCondition(condition, context);
      expect(result).toBe(true); // 0.24 < 0.37
    });

    it('should evaluate lte (less than or equal) operator', () => {
      const condition: RuleCondition = {
        type: 'threshold',
        field: 'taxOutput.summary.marginalTaxRate',
        operator: 'lte',
        value: 0.24,
      };

      const context = createMockContext();
      const result = (ruleEvaluator as any).evaluateCondition(condition, context);
      expect(result).toBe(true); // 0.24 <= 0.24
    });

    it('should evaluate between operator', () => {
      const condition: RuleCondition = {
        type: 'range',
        field: 'taxOutput.summary.agi',
        operator: 'between',
        value: [100000, 200000],
      };

      const context = createMockContext();
      const result = (ruleEvaluator as any).evaluateCondition(condition, context);
      expect(result).toBe(true); // 150000 is between 100K and 200K
    });

    it('should evaluate in operator', () => {
      const condition: RuleCondition = {
        type: 'flag',
        field: 'householdMetadata.stateOfResidence',
        operator: 'in',
        value: ['CA', 'NY', 'TX'],
      };

      const context = createMockContext();
      const result = (ruleEvaluator as any).evaluateCondition(condition, context);
      expect(result).toBe(true); // CA is in the list
    });

    it('should evaluate contains operator for strings', () => {
      const condition: RuleCondition = {
        type: 'flag',
        field: 'householdMetadata.stateOfResidence',
        operator: 'contains',
        value: 'A',
      };

      const context = createMockContext();
      const result = (ruleEvaluator as any).evaluateCondition(condition, context);
      expect(result).toBe(true); // "CA" contains "A"
    });
  });

  describe('Field Resolution', () => {
    it('should resolve simple field', () => {
      const context = createMockContext();
      const value = (ruleEvaluator as any).resolveFieldValue('taxYear', context);
      expect(value).toBe(2025);
    });

    it('should resolve nested field (2 levels)', () => {
      const context = createMockContext();
      const value = (ruleEvaluator as any).resolveFieldValue('taxOutput.summary', context);
      expect(value).toHaveProperty('agi');
      expect(value.agi).toBe(150000);
    });

    it('should resolve deeply nested field (3 levels)', () => {
      const context = createMockContext();
      const value = (ruleEvaluator as any).resolveFieldValue('taxOutput.summary.agi', context);
      expect(value).toBe(150000);
    });

    it('should resolve nested field in signals', () => {
      const context = createMockContext();
      const value = (ruleEvaluator as any).resolveFieldValue('signals.niit.applies', context);
      expect(value).toBe(true);
    });

    it('should return undefined for non-existent field', () => {
      const context = createMockContext();
      const value = (ruleEvaluator as any).resolveFieldValue('nonExistent.field', context);
      expect(value).toBeUndefined();
    });

    it('should resolve household metadata fields', () => {
      const context = createMockContext();
      const value = (ruleEvaluator as any).resolveFieldValue(
        'householdMetadata.clientAge',
        context
      );
      expect(value).toBe(55);
    });
  });

  describe('Scoring Algorithms', () => {
    describe('Impact Score', () => {
      it('should calculate direct impact score', () => {
        const formula: ScoringFormula['impact'] = {
          type: 'direct',
          field: 'signals.rothConversion.headroom',
        };

        const context = createMockContext();
        const score = (ruleEvaluator as any).calculateImpactScore(formula, context);
        expect(score).toBe(100); // Capped at 100
      });

      it('should calculate scaled impact score', () => {
        const formula: ScoringFormula['impact'] = {
          type: 'scaled',
          field: 'signals.rothConversion.headroom',
          scale: { min: 25000, max: 200000 },
        };

        const context = createMockContext();
        const score = (ruleEvaluator as any).calculateImpactScore(formula, context);
        // (50000 - 25000) / (200000 - 25000) * 100 = 14.29
        expect(score).toBeCloseTo(14.29, 1);
      });

      it('should calculate tiered impact score', () => {
        const formula: ScoringFormula['impact'] = {
          type: 'tiered',
          field: 'signals.irmaa.distanceToBracket',
          tiers: [
            { threshold: 0, score: 100 },
            { threshold: 5000, score: 75 },
            { threshold: 10000, score: 50 },
          ],
        };

        const context = createMockContext();
        const score = (ruleEvaluator as any).calculateImpactScore(formula, context);
        expect(score).toBe(50); // 16000 is >= 10000, so score 50
      });
    });

    describe('Urgency Score', () => {
      it('should calculate deadline urgency (within 30 days)', () => {
        const deadline = new Date('2025-07-10'); // 25 days from context date
        const formula: ScoringFormula['urgency'] = {
          type: 'deadline',
          deadline,
        };

        const context = createMockContext();
        const score = (ruleEvaluator as any).calculateUrgencyScore(formula, context);
        expect(score).toBe(100); // < 30 days = 100
      });

      it('should calculate deadline urgency (3 months out)', () => {
        const deadline = new Date('2025-09-15'); // ~92 days from context date (Jun 15)
        const formula: ScoringFormula['urgency'] = {
          type: 'deadline',
          deadline,
        };

        const context = createMockContext();
        const score = (ruleEvaluator as any).calculateUrgencyScore(formula, context);
        expect(score).toBe(50); // < 180 days but >= 90 days = 50
      });

      it('should calculate seasonal urgency (in window)', () => {
        const formula: ScoringFormula['urgency'] = {
          type: 'seasonal',
          seasonalWindow: { start: '06-01', end: '06-30' }, // June
        };

        const context = createMockContext({ currentDate: new Date('2025-06-15') });
        const score = (ruleEvaluator as any).calculateUrgencyScore(formula, context);
        expect(score).toBe(100); // In window = 100
      });

      it('should calculate seasonal urgency (out of window)', () => {
        const formula: ScoringFormula['urgency'] = {
          type: 'seasonal',
          seasonalWindow: { start: '01-01', end: '01-31' }, // January
        };

        const context = createMockContext({ currentDate: new Date('2025-06-15') });
        const score = (ruleEvaluator as any).calculateUrgencyScore(formula, context);
        expect(score).toBe(25); // Out of window = 25
      });

      it('should use fixed urgency score', () => {
        const formula: ScoringFormula['urgency'] = {
          type: 'fixed',
          fixedScore: 60,
        };

        const context = createMockContext();
        const score = (ruleEvaluator as any).calculateUrgencyScore(formula, context);
        expect(score).toBe(60);
      });
    });

    describe('Confidence Score', () => {
      it('should calculate field-based confidence', () => {
        const formula: ScoringFormula['confidence'] = {
          type: 'field_based',
          fields: [
            { field: 'taxOutput.summary.agi', weight: 0.5 },
            { field: 'signals.rothConversion.marginalRate', weight: 0.5 },
          ],
        };

        const context = createMockContext();
        const score = (ruleEvaluator as any).calculateConfidenceScore(formula, context, []);
        // (150000 * 0.5 + 0.24 * 0.5) / 1.0 * 100 = very high (capped at 100)
        expect(score).toBe(100);
      });

      it('should use fixed confidence score', () => {
        const formula: ScoringFormula['confidence'] = {
          type: 'fixed',
          fixedScore: 85,
        };

        const context = createMockContext();
        const score = (ruleEvaluator as any).calculateConfidenceScore(formula, context, []);
        expect(score).toBe(85);
      });
    });

    describe('Complexity Score', () => {
      it('should calculate fixed complexity score', () => {
        const formula: ScoringFormula['complexity'] = {
          type: 'fixed',
          fixedScore: 70,
        };

        const context = createMockContext();
        const score = (ruleEvaluator as any).calculateComplexityScore(formula, context);
        expect(score).toBe(70);
      });

      it('should calculate field count complexity (simple)', () => {
        const formula: ScoringFormula['complexity'] = {
          type: 'field_count',
          fieldCount: 2,
        };

        const context = createMockContext();
        const score = (ruleEvaluator as any).calculateComplexityScore(formula, context);
        expect(score).toBe(100); // <= 2 fields = 100
      });

      it('should calculate field count complexity (moderate)', () => {
        const formula: ScoringFormula['complexity'] = {
          type: 'field_count',
          fieldCount: 5,
        };

        const context = createMockContext();
        const score = (ruleEvaluator as any).calculateComplexityScore(formula, context);
        expect(score).toBe(50); // 5 fields: <= 6 but > 4 = 50
      });
    });
  });

  describe('Template Interpolation', () => {
    it('should interpolate simple template', () => {
      const template = 'AGI is $${taxOutput.summary.agi}';
      const context = createMockContext();

      const result = (ruleEvaluator as any).interpolateTemplate(template, context);
      expect(result).toBe('AGI is $150,000');
    });

    it('should interpolate multiple fields', () => {
      const template =
        'Headroom: $${signals.rothConversion.headroom} at ${signals.rothConversion.marginalRate}% rate';
      const context = createMockContext();

      const result = (ruleEvaluator as any).interpolateTemplate(template, context);
      expect(result).toBe('Headroom: $50,000 at 0.24% rate'); // 0.24 formatted as 0.24
    });

    it('should handle missing fields gracefully', () => {
      const template = 'Value: $${nonExistent.field}';
      const context = createMockContext();

      const result = (ruleEvaluator as any).interpolateTemplate(template, context);
      expect(result).toBe('Value: $undefined'); // Template includes $, formatValue doesn't add it
    });
  });

  describe('Full Rule Evaluation', () => {
    it('should evaluate complete rule and generate opportunity', () => {
      const rule: OpportunityRule = {
        ruleName: 'test_rule',
        ruleVersion: '1.0.0',
        category: 'roth_conversion',
        title: 'Test Rule',
        description: 'Test rule description',
        priority: 50,
        eligibility: [
          {
            type: 'flag',
            field: 'householdMetadata.hasRetirementAccounts',
            operator: 'eq',
            value: true,
          },
        ],
        triggers: [
          {
            type: 'threshold',
            field: 'signals.rothConversion.headroom',
            operator: 'gte',
            value: 25000,
          },
        ],
        blocking: [],
        scoringFormula: {
          impact: { type: 'direct', field: 'signals.rothConversion.headroom' },
          urgency: { type: 'fixed', fixedScore: 60 },
          confidence: { type: 'fixed', fixedScore: 80 },
          complexity: { type: 'fixed', fixedScore: 85 },
          weights: {
            impact: 0.4,
            urgency: 0.2,
            confidence: 0.2,
            complexity: 0.2,
          },
        },
        outputTemplate: {
          titleTemplate: 'Test: $${signals.rothConversion.headroom}',
          summaryTemplate: 'Headroom available: $${signals.rothConversion.headroom}',
          evidenceFields: ['signals.rothConversion.headroom', 'taxOutput.summary.agi'],
          contextFields: ['signals.rothConversion.marginalRate'],
        },
        isActive: true,
      };

      const context = createMockContext();
      const opportunity = ruleEvaluator.evaluate(rule, context);

      expect(opportunity).not.toBeNull();
      expect(opportunity!.ruleName).toBe('test_rule');
      expect(opportunity!.category).toBe('roth_conversion');
      expect(opportunity!.title).toContain('50,000');
      expect(opportunity!.evidence).toHaveLength(2);
      expect(opportunity!.score.finalScore).toBeGreaterThan(0);
    });

    it('should return null if eligibility fails', () => {
      const rule: OpportunityRule = {
        ruleName: 'test_rule',
        ruleVersion: '1.0.0',
        category: 'roth_conversion',
        title: 'Test Rule',
        description: 'Test rule description',
        priority: 50,
        eligibility: [
          {
            type: 'flag',
            field: 'householdMetadata.hasRetirementAccounts',
            operator: 'eq',
            value: false, // This will fail
          },
        ],
        triggers: [],
        blocking: [],
        scoringFormula: {
          impact: { type: 'fixed', fixedScore: 50 },
          urgency: { type: 'fixed', fixedScore: 50 },
          confidence: { type: 'fixed', fixedScore: 50 },
          complexity: { type: 'fixed', fixedScore: 50 },
          weights: { impact: 0.25, urgency: 0.25, confidence: 0.25, complexity: 0.25 },
        },
        outputTemplate: {
          titleTemplate: 'Test',
          summaryTemplate: 'Test',
          evidenceFields: [],
          contextFields: [],
        },
        isActive: true,
      };

      const context = createMockContext();
      const opportunity = ruleEvaluator.evaluate(rule, context);

      expect(opportunity).toBeNull();
    });

    it('should return null if triggers fail', () => {
      const rule: OpportunityRule = {
        ruleName: 'test_rule',
        ruleVersion: '1.0.0',
        category: 'roth_conversion',
        title: 'Test Rule',
        description: 'Test rule description',
        priority: 50,
        eligibility: [
          {
            type: 'flag',
            field: 'householdMetadata.hasRetirementAccounts',
            operator: 'eq',
            value: true,
          },
        ],
        triggers: [
          {
            type: 'threshold',
            field: 'signals.rothConversion.headroom',
            operator: 'gte',
            value: 1000000, // This will fail (headroom is 50K)
          },
        ],
        blocking: [],
        scoringFormula: {
          impact: { type: 'fixed', fixedScore: 50 },
          urgency: { type: 'fixed', fixedScore: 50 },
          confidence: { type: 'fixed', fixedScore: 50 },
          complexity: { type: 'fixed', fixedScore: 50 },
          weights: { impact: 0.25, urgency: 0.25, confidence: 0.25, complexity: 0.25 },
        },
        outputTemplate: {
          titleTemplate: 'Test',
          summaryTemplate: 'Test',
          evidenceFields: [],
          contextFields: [],
        },
        isActive: true,
      };

      const context = createMockContext();
      const opportunity = ruleEvaluator.evaluate(rule, context);

      expect(opportunity).toBeNull();
    });

    it('should return null if blocking conditions pass', () => {
      const rule: OpportunityRule = {
        ruleName: 'test_rule',
        ruleVersion: '1.0.0',
        category: 'roth_conversion',
        title: 'Test Rule',
        description: 'Test rule description',
        priority: 50,
        eligibility: [
          {
            type: 'flag',
            field: 'householdMetadata.hasRetirementAccounts',
            operator: 'eq',
            value: true,
          },
        ],
        triggers: [
          {
            type: 'threshold',
            field: 'signals.rothConversion.headroom',
            operator: 'gte',
            value: 25000,
          },
        ],
        blocking: [
          {
            type: 'flag',
            field: 'signals.niit.applies', // This is true in mock context
            operator: 'eq',
            value: true,
          },
        ],
        scoringFormula: {
          impact: { type: 'fixed', fixedScore: 50 },
          urgency: { type: 'fixed', fixedScore: 50 },
          confidence: { type: 'fixed', fixedScore: 50 },
          complexity: { type: 'fixed', fixedScore: 50 },
          weights: { impact: 0.25, urgency: 0.25, confidence: 0.25, complexity: 0.25 },
        },
        outputTemplate: {
          titleTemplate: 'Test',
          summaryTemplate: 'Test',
          evidenceFields: [],
          contextFields: [],
        },
        isActive: true,
      };

      const context = createMockContext();
      const opportunity = ruleEvaluator.evaluate(rule, context);

      expect(opportunity).toBeNull();
    });
  });
});
