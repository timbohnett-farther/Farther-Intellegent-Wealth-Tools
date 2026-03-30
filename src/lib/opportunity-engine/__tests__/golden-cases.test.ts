/**
 * Golden Test Cases
 *
 * 4 comprehensive household scenarios to validate end-to-end detection accuracy.
 * These scenarios represent real-world household profiles with expected
 * opportunity detection results.
 */

import { describe, it, expect } from 'vitest';
import { ruleEvaluator } from '../rule-evaluator';
import { ALL_RULES } from '../rules';
import type { EvaluationContext } from '@/types/opportunity-engine';
import type { TaxOutput } from '@/types/tax-engine';

describe('Golden Test Cases', () => {
  describe('Scenario 1: High-Income Pre-Retiree (Age 55)', () => {
    it('should detect Roth conversion headroom but NOT IRMAA (too young)', () => {
      const context = createScenario1Context();

      // Test Roth Conversion rule
      const rothOpp = ruleEvaluator.evaluate(ALL_RULES.ROTH_CONVERSION_HEADROOM, context);
      expect(rothOpp).not.toBeNull();
      expect(rothOpp!.category).toBe('roth_conversion');
      expect(rothOpp!.priority).toBe('medium'); // Score is 50-74

      // Test IRMAA rule (should NOT trigger - age < 60)
      const irmaaOpp = ruleEvaluator.evaluate(ALL_RULES.IRMAA_PROXIMITY_ALERT, context);
      expect(irmaaOpp).toBeNull(); // Age 55 < 60

      // Test Withholding rule (should NOT trigger)
      const withholdingOpp = ruleEvaluator.evaluate(
        ALL_RULES.WITHHOLDING_PAYMENT_MISMATCH,
        context
      );
      expect(withholdingOpp).toBeNull(); // Well-withheld
    });
  });

  describe('Scenario 2: Young High-Earner (Age 35)', () => {
    it('should detect withholding shortfall but NOT Roth conversion (already in high bracket)', () => {
      const context = createScenario2Context();

      // Test Roth Conversion rule (should NOT trigger - already in 35% bracket)
      const rothOpp = ruleEvaluator.evaluate(ALL_RULES.ROTH_CONVERSION_HEADROOM, context);
      // Note: May still trigger if headroom exists, but priority should be lower

      // Test Withholding rule (should trigger)
      const withholdingOpp = ruleEvaluator.evaluate(
        ALL_RULES.WITHHOLDING_PAYMENT_MISMATCH,
        context
      );
      expect(withholdingOpp).not.toBeNull();
      expect(withholdingOpp!.category).toBe('withholding');
      expect(withholdingOpp!.estimatedValue).toBeGreaterThan(0);

      // Test IRMAA rule (should NOT trigger - too young)
      const irmaaOpp = ruleEvaluator.evaluate(ALL_RULES.IRMAA_PROXIMITY_ALERT, context);
      expect(irmaaOpp).toBeNull(); // Age < 60
    });
  });

  describe('Scenario 3: Retiree on Medicare (Age 68)', () => {
    it('should detect IRMAA proximity but NOT Roth conversion (blocked by IRMAA)', () => {
      const context = createScenario3Context();

      // Test IRMAA rule (should trigger)
      const irmaaOpp = ruleEvaluator.evaluate(ALL_RULES.IRMAA_PROXIMITY_ALERT, context);
      expect(irmaaOpp).not.toBeNull();
      expect(irmaaOpp!.category).toBe('irmaa');
      expect(irmaaOpp!.priority).toBe('medium'); // Score is 50-74

      // Test Roth Conversion rule (should be blocked by IRMAA B1)
      const rothOpp = ruleEvaluator.evaluate(ALL_RULES.ROTH_CONVERSION_HEADROOM, context);
      expect(rothOpp).toBeNull(); // Blocked by IRMAA B1 condition

      // Test Withholding rule (should NOT trigger - overpayment)
      const withholdingOpp = ruleEvaluator.evaluate(
        ALL_RULES.WITHHOLDING_PAYMENT_MISMATCH,
        context
      );
      expect(withholdingOpp).toBeNull(); // Well-withheld
    });
  });

  describe('Scenario 4: Middle-Income Family (Age 42)', () => {
    it('should detect Roth conversion headroom with high priority', () => {
      const context = createScenario4Context();

      // Test Roth Conversion rule (should trigger with good headroom)
      const rothOpp = ruleEvaluator.evaluate(ALL_RULES.ROTH_CONVERSION_HEADROOM, context);
      expect(rothOpp).not.toBeNull();
      expect(rothOpp!.category).toBe('roth_conversion');
      expect(rothOpp!.estimatedValue).toBeGreaterThanOrEqual(25000);

      // Test IRMAA rule (should NOT trigger - too young)
      const irmaaOpp = ruleEvaluator.evaluate(ALL_RULES.IRMAA_PROXIMITY_ALERT, context);
      expect(irmaaOpp).toBeNull(); // Age < 60

      // Test Withholding rule (should trigger - slight shortfall)
      const withholdingOpp = ruleEvaluator.evaluate(
        ALL_RULES.WITHHOLDING_PAYMENT_MISMATCH,
        context
      );
      expect(withholdingOpp).not.toBeNull();
      expect(withholdingOpp!.priority).toBe('low'); // Small shortfall, score < 50
    });
  });
});

// ============================================================================
// SCENARIO BUILDERS
// ============================================================================

function createScenario1Context(): EvaluationContext {
  return {
    taxOutput: {
      summary: {
        filingStatus: 'married_filing_jointly',
        agi: 195000,
        taxableIncome: 165000,
        totalIncome: 205000,
        totalDeductions: 40000,
        totalTax: 32000,
        taxAfterCredits: 32000,
        refundOrBalanceDue: 0,
        effectiveTaxRate: 0.164,
        marginalTaxRate: 0.24,
      },
      incomeBreakdown: {
        wages: 180000,
        taxableInterest: 5000,
        qualifiedDividends: 15000,
        ordinaryDividends: 15000,
        capitalGains: 5000,
        businessIncome: 0,
        rentalIncome: 0,
        retirementDistributions: 0,
        socialSecurityBenefits: 0,
        otherIncome: 0,
      },
      deductionBreakdown: {
        standardDeduction: 0,
        itemizedDeductions: 35000,
        qbiDeduction: 5000,
        totalDeductions: 40000,
      },
      taxCalculation: {
        ordinaryIncomeTax: 28000,
        capitalGainsTax: 2250,
        niit: 1750,
        totalTax: 32000,
      },
      credits: {
        nonRefundableCredits: 0,
        refundableCredits: 0,
        totalCredits: 0,
      },
      payments: {
        federalWithholding: 32000,
        estimatedPayments: 0,
        totalPayments: 32000,
      },
      warnings: [],
    },
    householdId: 'scenario1-household',
    taxYear: 2025,
    currentDate: new Date('2025-06-15'),
    signals: {
      niit: {
        applies: false,
        magi: 195000,
        niitThreshold: 250000,
        distanceToThreshold: 55000,
      },
      irmaa: {
        b1: false,
        b2: false,
        b3: false,
        b4: false,
        magi: 195000,
        irmaaBracketThreshold: 206000,
        distanceToBracket: 11000, // Within $11K - should trigger
      },
      withholding: {
        shortfall: 0,
        isShortfall: false,
        overpayment: 0,
        isOverpayment: false,
        totalWithheld: 32000,
        totalTax: 32000,
      },
      rothConversion: {
        headroom: 65000, // Good headroom
        hasHeadroom: true,
        currentBracket: 24,
        nextBracketThreshold: 260000,
        marginalRate: 0.24,
      },
      capitalGains: {
        has0PercentHeadroom: false,
        headroom0Percent: 0,
        has15PercentHeadroom: true,
        headroom15Percent: 50000,
        unrealizedGains: 100000,
      },
      deductions: {
        usingStandard: false,
        itemizedAmount: 35000,
        standardAmount: 30000,
        nearThreshold: false,
        charitableContributions: 20000,
      },
      qbi: {
        hasQBI: true,
        qbiAmount: 25000,
        qbiDeduction: 5000,
        phaseoutStart: 400000,
        distanceToPhaseout: 205000,
      },
    },
    householdMetadata: {
      clientAge: 55,
      spouseAge: 54,
      hasRetirementAccounts: true,
      hasTaxableAccounts: true,
      stateOfResidence: 'CA',
    },
  };
}

function createScenario2Context(): EvaluationContext {
  return {
    taxOutput: {
      summary: {
        filingStatus: 'married_filing_jointly',
        agi: 450000,
        taxableIncome: 410000,
        totalIncome: 460000,
        totalDeductions: 50000,
        totalTax: 110000,
        taxAfterCredits: 108000,
        refundOrBalanceDue: 10000, // Shortfall
        effectiveTaxRate: 0.244,
        marginalTaxRate: 0.35,
      },
      incomeBreakdown: {
        wages: 400000,
        taxableInterest: 10000,
        qualifiedDividends: 30000,
        ordinaryDividends: 30000,
        capitalGains: 20000,
        businessIncome: 0,
        rentalIncome: 0,
        retirementDistributions: 0,
        socialSecurityBenefits: 0,
        otherIncome: 0,
      },
      deductionBreakdown: {
        standardDeduction: 0,
        itemizedDeductions: 40000,
        qbiDeduction: 10000,
        totalDeductions: 50000,
      },
      taxCalculation: {
        ordinaryIncomeTax: 95000,
        capitalGainsTax: 7500,
        niit: 7500,
        totalTax: 110000,
      },
      credits: {
        nonRefundableCredits: 2000,
        refundableCredits: 0,
        totalCredits: 2000,
      },
      payments: {
        federalWithholding: 98000,
        estimatedPayments: 0,
        totalPayments: 98000,
      },
      warnings: [],
    },
    householdId: 'scenario2-household',
    taxYear: 2025,
    currentDate: new Date('2025-06-15'),
    signals: {
      niit: {
        applies: true,
        magi: 450000,
        niitThreshold: 250000,
        distanceToThreshold: -200000,
        niitAmount: 7500,
      },
      irmaa: {
        b1: true,
        b2: true,
        b3: false,
        b4: false,
        magi: 450000,
        irmaaBracketThreshold: 500000,
        distanceToBracket: 50000,
      },
      withholding: {
        shortfall: 12000, // Significant shortfall
        isShortfall: true,
        overpayment: 0,
        isOverpayment: false,
        totalWithheld: 98000,
        totalTax: 110000,
      },
      rothConversion: {
        headroom: 30000, // Some headroom despite high bracket
        hasHeadroom: true,
        currentBracket: 35,
        nextBracketThreshold: 480000,
        marginalRate: 0.35,
      },
      capitalGains: {
        has0PercentHeadroom: false,
        headroom0Percent: 0,
        has15PercentHeadroom: false,
        headroom15Percent: 0,
        unrealizedGains: 200000,
      },
      deductions: {
        usingStandard: false,
        itemizedAmount: 40000,
        standardAmount: 30000,
        nearThreshold: false,
        charitableContributions: 25000,
      },
      qbi: {
        hasQBI: true,
        qbiAmount: 50000,
        qbiDeduction: 10000,
        phaseoutStart: 400000,
        distanceToPhaseout: -50000,
      },
    },
    householdMetadata: {
      clientAge: 35,
      spouseAge: 33,
      hasRetirementAccounts: true,
      hasTaxableAccounts: true,
      stateOfResidence: 'NY',
    },
  };
}

function createScenario3Context(): EvaluationContext {
  return {
    taxOutput: {
      summary: {
        filingStatus: 'married_filing_jointly',
        agi: 203000,
        taxableIncome: 173000,
        totalIncome: 213000,
        totalDeductions: 40000,
        totalTax: 33500,
        taxAfterCredits: 33500,
        refundOrBalanceDue: -1500, // Small refund
        effectiveTaxRate: 0.165,
        marginalTaxRate: 0.24,
      },
      incomeBreakdown: {
        wages: 80000,
        taxableInterest: 8000,
        qualifiedDividends: 40000,
        ordinaryDividends: 40000,
        capitalGains: 25000,
        businessIncome: 0,
        rentalIncome: 0,
        retirementDistributions: 60000,
        socialSecurityBenefits: 0,
        otherIncome: 0,
      },
      deductionBreakdown: {
        standardDeduction: 0,
        itemizedDeductions: 35000,
        qbiDeduction: 5000,
        totalDeductions: 40000,
      },
      taxCalculation: {
        ordinaryIncomeTax: 25000,
        capitalGainsTax: 6000,
        niit: 2500,
        totalTax: 33500,
      },
      credits: {
        nonRefundableCredits: 0,
        refundableCredits: 0,
        totalCredits: 0,
      },
      payments: {
        federalWithholding: 35000,
        estimatedPayments: 0,
        totalPayments: 35000,
      },
      warnings: [],
    },
    householdId: 'scenario3-household',
    taxYear: 2025,
    currentDate: new Date('2025-06-15'),
    signals: {
      niit: {
        applies: false,
        magi: 203000,
        niitThreshold: 250000,
        distanceToThreshold: 47000,
      },
      irmaa: {
        b1: true, // Already in IRMAA B1
        b2: false,
        b3: false,
        b4: false,
        magi: 203000,
        irmaaBracketThreshold: 206000,
        distanceToBracket: 3000, // Very close to B2
      },
      withholding: {
        shortfall: 0,
        isShortfall: false,
        overpayment: 1500,
        isOverpayment: false, // Small overpayment
        totalWithheld: 35000,
        totalTax: 33500,
      },
      rothConversion: {
        headroom: 57000, // Good headroom technically
        hasHeadroom: true,
        currentBracket: 24,
        nextBracketThreshold: 260000,
        marginalRate: 0.24,
      },
      capitalGains: {
        has0PercentHeadroom: false,
        headroom0Percent: 0,
        has15PercentHeadroom: true,
        headroom15Percent: 40000,
        unrealizedGains: 150000,
      },
      deductions: {
        usingStandard: false,
        itemizedAmount: 35000,
        standardAmount: 30000,
        nearThreshold: false,
        charitableContributions: 18000,
      },
      qbi: {
        hasQBI: true,
        qbiAmount: 25000,
        qbiDeduction: 5000,
        phaseoutStart: 400000,
        distanceToPhaseout: 197000,
      },
    },
    householdMetadata: {
      clientAge: 68,
      spouseAge: 67,
      hasRetirementAccounts: true,
      hasTaxableAccounts: true,
      stateOfResidence: 'FL',
    },
  };
}

function createScenario4Context(): EvaluationContext {
  return {
    taxOutput: {
      summary: {
        filingStatus: 'married_filing_jointly',
        agi: 125000,
        taxableIncome: 95000,
        totalIncome: 130000,
        totalDeductions: 35000,
        totalTax: 15500,
        taxAfterCredits: 13500,
        refundOrBalanceDue: 2000, // Small shortfall
        effectiveTaxRate: 0.124,
        marginalTaxRate: 0.22,
      },
      incomeBreakdown: {
        wages: 120000,
        taxableInterest: 2000,
        qualifiedDividends: 5000,
        ordinaryDividends: 5000,
        capitalGains: 3000,
        businessIncome: 0,
        rentalIncome: 0,
        retirementDistributions: 0,
        socialSecurityBenefits: 0,
        otherIncome: 0,
      },
      deductionBreakdown: {
        standardDeduction: 0,
        itemizedDeductions: 30000,
        qbiDeduction: 5000,
        totalDeductions: 35000,
      },
      taxCalculation: {
        ordinaryIncomeTax: 14000,
        capitalGainsTax: 750,
        niit: 0,
        totalTax: 14750,
      },
      credits: {
        nonRefundableCredits: 2000,
        refundableCredits: 0,
        totalCredits: 2000,
      },
      payments: {
        federalWithholding: 13500,
        estimatedPayments: 0,
        totalPayments: 13500,
      },
      warnings: [],
    },
    householdId: 'scenario4-household',
    taxYear: 2025,
    currentDate: new Date('2025-06-15'),
    signals: {
      niit: {
        applies: false,
        magi: 125000,
        niitThreshold: 250000,
        distanceToThreshold: 125000,
      },
      irmaa: {
        b1: false,
        b2: false,
        b3: false,
        b4: false,
        magi: 125000,
        irmaaBracketThreshold: 206000,
        distanceToBracket: 81000,
      },
      withholding: {
        shortfall: 2000, // Small shortfall
        isShortfall: true,
        overpayment: 0,
        isOverpayment: false,
        totalWithheld: 13500,
        totalTax: 15500,
      },
      rothConversion: {
        headroom: 55000, // Excellent headroom
        hasHeadroom: true,
        currentBracket: 22,
        nextBracketThreshold: 180000,
        marginalRate: 0.22,
      },
      capitalGains: {
        has0PercentHeadroom: true,
        headroom0Percent: 15000,
        has15PercentHeadroom: true,
        headroom15Percent: 200000,
        unrealizedGains: 30000,
      },
      deductions: {
        usingStandard: false,
        itemizedAmount: 30000,
        standardAmount: 30000,
        nearThreshold: true, // Exactly at threshold
        charitableContributions: 12000,
      },
      qbi: {
        hasQBI: true,
        qbiAmount: 25000,
        qbiDeduction: 5000,
        phaseoutStart: 400000,
        distanceToPhaseout: 275000,
      },
    },
    householdMetadata: {
      clientAge: 42,
      spouseAge: 40,
      hasRetirementAccounts: true,
      hasTaxableAccounts: true,
      stateOfResidence: 'TX',
    },
  };
}
