/**
 * Validation Layer Tests
 *
 * Tests for 6-stage validation system
 */

import { describe, it, expect } from 'vitest';
import { validateScenarioForCalculation } from '../validation';
import type { TaxInputSnapshot } from '@/types/tax-engine';
import type { ScenarioOverride } from '@/types/scenario-planning';

describe('Validation Layer', () => {
  // Mock baseline snapshot
  const mockBaseline: TaxInputSnapshot = {
    snapshotId: 'snap_baseline_001',
    householdId: 'hh_001',
    taxYear: 2025,
    filingStatus: 'married_filing_jointly',
    taxpayers: [
      {
        id: 'taxpayer_1',
        role: 'primary',
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: new Date('1980-01-01'),
        age: 45,
      },
    ],
    inputs: {
      wages: 100000,
      salaries: 0,
      tips: 0,
      taxableInterest: 500,
      taxExemptInterest: 0,
      ordinaryDividends: 2000,
      qualifiedDividends: 1500,
      taxRefundsCredits: 0,
      alimonyReceived: 0,
      businessIncomeLoss: 0,
      capitalGainLoss: 0,
      otherGains: 0,
      iraDistributions: 10000,
      iraDistributionsTaxable: 8000,
      pensionsAnnuities: 20000,
      pensionsAnnuitiesTaxable: 15000,
      scheduleE: 0,
      farmIncomeLoss: 0,
      unemploymentCompensation: 0,
      socialSecurityBenefits: 0,
      otherIncome: 0,
      educatorExpenses: 0,
      businessExpensesReservists: 0,
      hsaDeduction: 0,
      movingExpensesArmedForces: 0,
      selfEmployedSepSimple: 0,
      selfEmploymentTax: 0,
      penaltyEarlyWithdrawal: 0,
      alimonyPaid: 0,
      iraContributionDeduction: 0,
      studentLoanInterest: 2000,
      tuitionFees: 0,
      otherAdjustments: 0,
      medicalDentalExpenses: 0,
      stateLocalIncomeTaxes: 5000,
      realEstateTaxes: 3000,
      personalPropertyTaxes: 0,
      mortgageInterest: 12000,
      investmentInterest: 0,
      charitableCashContributions: 5000,
      charitableNoncashContributions: 0,
      casualtyTheftLosses: 0,
      otherItemizedDeductions: 0,
      childTaxCredit: 0,
      childDependentCareCredit: 0,
      educationCredits: 0,
      retirementSavingsCredit: 0,
      residentialEnergyCredit: 0,
      foreignTaxCredit: 0,
      otherCredits: 0,
      federalIncomeTaxWithheld: 15000,
      estimatedTaxPayments: 0,
      amountAppliedFromPriorYear: 0,
      excessSocialSecurityWithheld: 0,
      otherPayments: 0,
      hasChildren: false,
      numberOfChildren: 0,
      numberOfOtherDependents: 0,
      spouseAgeOver65: false,
      spouseBlind: false,
      anyoneDisabled: false,
      anyoneOverSixtyFive: false,
      claimingDependents: false,
    },
    missingInputs: [],
    warnings: [],
    sourceFactVersions: {},
    createdAt: new Date(),
  };

  describe('Schema Validation (Stage 1)', () => {
    it('should pass with valid baseline', () => {
      const result = validateScenarioForCalculation(mockBaseline, []);

      expect(result.valid).toBe(true);
      expect(result.canProceed).toBe(true);
      expect(result.severity).toBe('pass');
    });

    it('should fail with missing householdId', () => {
      const invalidBaseline = {
        ...mockBaseline,
        householdId: '',
      };

      const result = validateScenarioForCalculation(invalidBaseline, []);

      expect(result.canProceed).toBe(false);
      expect(result.errors.some((e) => e.severity === 'hard_fail')).toBe(true);
    });

    it('should fail with missing taxpayers', () => {
      const invalidBaseline = {
        ...mockBaseline,
        taxpayers: [],
      };

      const result = validateScenarioForCalculation(invalidBaseline, []);

      expect(result.canProceed).toBe(false);
      expect(result.errors.some((e) => e.code === 'MISSING_TAXPAYERS')).toBe(true);
    });
  });

  describe('Override Field Validation (Stage 2)', () => {
    it('should pass with valid field names', () => {
      const overrides: ScenarioOverride[] = [
        {
          field: 'wages',
          operator: 'replace',
          value: 120000,
          reason: 'Test',
          sourceType: 'manual',
          createdBy: 'advisor-001',
          createdAt: new Date().toISOString(),
        },
      ];

      const result = validateScenarioForCalculation(mockBaseline, overrides);

      expect(result.canProceed).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail with unknown field', () => {
      const overrides: ScenarioOverride[] = [
        {
          field: 'unknownField',
          operator: 'replace',
          value: 1000,
          reason: 'Test',
          sourceType: 'manual',
          createdBy: 'advisor-001',
          createdAt: new Date().toISOString(),
        },
      ];

      const result = validateScenarioForCalculation(mockBaseline, overrides);

      expect(result.canProceed).toBe(false);
      expect(result.errors.some((e) => e.code === 'UNKNOWN_FIELD')).toBe(true);
    });
  });

  describe('Override Type Validation (Stage 3)', () => {
    it('should pass with valid operator for field', () => {
      const overrides: ScenarioOverride[] = [
        {
          field: 'wages',
          operator: 'add',
          value: 10000,
          reason: 'Test',
          sourceType: 'manual',
          createdBy: 'advisor-001',
          createdAt: new Date().toISOString(),
        },
      ];

      const result = validateScenarioForCalculation(mockBaseline, overrides);

      expect(result.canProceed).toBe(true);
    });

    it('should fail with negative value for positive-only field', () => {
      const overrides: ScenarioOverride[] = [
        {
          field: 'wages',
          operator: 'replace',
          value: -1000,
          reason: 'Test',
          sourceType: 'manual',
          createdBy: 'advisor-001',
          createdAt: new Date().toISOString(),
        },
      ];

      const result = validateScenarioForCalculation(mockBaseline, overrides);

      expect(result.canProceed).toBe(false);
      expect(result.errors.some((e) => e.code === 'INVALID_VALUE')).toBe(true);
    });

    it('should fail with value exceeding max limit', () => {
      const overrides: ScenarioOverride[] = [
        {
          field: 'studentLoanInterest',
          operator: 'replace',
          value: 3000, // Max is 2500
          reason: 'Test',
          sourceType: 'manual',
          createdBy: 'advisor-001',
          createdAt: new Date().toISOString(),
        },
      ];

      const result = validateScenarioForCalculation(mockBaseline, overrides);

      expect(result.canProceed).toBe(false);
      expect(result.errors.some((e) => e.message.includes('must be <= 2500'))).toBe(
        true
      );
    });
  });

  describe('Cross-Field Consistency (Stage 4)', () => {
    it('should warn about SALT cap', () => {
      const overrides: ScenarioOverride[] = [
        {
          field: 'stateLocalIncomeTaxes',
          operator: 'replace',
          value: 8000,
          reason: 'Test',
          sourceType: 'manual',
          createdBy: 'advisor-001',
          createdAt: new Date().toISOString(),
        },
      ];

      const result = validateScenarioForCalculation(mockBaseline, overrides);

      expect(result.canProceed).toBe(true);
      expect(
        result.warnings.some((w) => w.message.includes('SALT deduction will be capped'))
      ).toBe(true);
    });

    it('should fail if taxable IRA exceeds total IRA', () => {
      const overrides: ScenarioOverride[] = [
        {
          field: 'iraDistributionsTaxable',
          operator: 'replace',
          value: 15000, // Exceeds total of 10000
          reason: 'Test',
          sourceType: 'manual',
          createdBy: 'advisor-001',
          createdAt: new Date().toISOString(),
        },
      ];

      const result = validateScenarioForCalculation(mockBaseline, overrides);

      expect(result.canProceed).toBe(false);
      expect(
        result.errors.some(
          (e) => e.code === 'IRA_TAXABLE_EXCEEDS_TOTAL' && e.severity === 'hard_fail'
        )
      ).toBe(true);
    });

    it('should fail if qualified dividends exceed ordinary dividends', () => {
      const overrides: ScenarioOverride[] = [
        {
          field: 'qualifiedDividends',
          operator: 'replace',
          value: 3000, // Exceeds ordinary of 2000
          reason: 'Test',
          sourceType: 'manual',
          createdBy: 'advisor-001',
          createdAt: new Date().toISOString(),
        },
      ];

      const result = validateScenarioForCalculation(mockBaseline, overrides);

      expect(result.canProceed).toBe(false);
      expect(result.errors.some((e) => e.code === 'QUALIFIED_DIV_EXCEEDS_ORDINARY')).toBe(
        true
      );
    });

    it('should warn about large Roth conversion', () => {
      // Use a baseline with sufficient IRA distributions total to accommodate the override
      const baselineWithLargeIRA = {
        ...mockBaseline,
        inputs: {
          ...mockBaseline.inputs,
          iraDistributions: 100000,
          iraDistributionsTaxable: 0,
        },
      };

      const overrides: ScenarioOverride[] = [
        {
          field: 'iraDistributionsTaxable',
          operator: 'add',
          value: 60000, // Large conversion
          reason: 'Test',
          sourceType: 'manual',
          createdBy: 'advisor-001',
          createdAt: new Date().toISOString(),
        },
      ];

      const result = validateScenarioForCalculation(baselineWithLargeIRA, overrides);

      expect(result.canProceed).toBe(true);
      expect(
        result.warnings.some((w) =>
          w.message.includes('Large Roth conversion may push into higher bracket')
        )
      ).toBe(true);
    });
  });

  describe('Supportability Validation (Stage 5)', () => {
    it('should warn about K-1 passthrough income', () => {
      const baselineWithK1 = {
        ...mockBaseline,
        inputs: {
          ...mockBaseline.inputs,
          k1OrdinaryIncome: 50000,
        },
      };

      const result = validateScenarioForCalculation(baselineWithK1, []);

      expect(result.warnings.some((w) => w.message.includes('K-1 passthrough'))).toBe(
        true
      );
    });

    it('should warn about high AGI (AMT risk)', () => {
      const highIncomeBaseline = {
        ...mockBaseline,
        inputs: {
          ...mockBaseline.inputs,
          wages: 600000,
        },
      };

      const result = validateScenarioForCalculation(highIncomeBaseline, []);

      expect(result.warnings.some((w) => w.message.includes('Alternative Minimum Tax'))).toBe(
        true
      );
    });

    it('should warn about foreign tax credit complexity', () => {
      const baselineWithFTC = {
        ...mockBaseline,
        inputs: {
          ...mockBaseline.inputs,
          foreignTaxCredit: 5000,
        },
      };

      const result = validateScenarioForCalculation(baselineWithFTC, []);

      expect(
        result.warnings.some((w) => w.message.includes('Foreign tax credit'))
      ).toBe(true);
    });
  });

  describe('Blocker Generation (Stage 6)', () => {
    it('should generate blockers for missing inputs', () => {
      const baselineWithMissing = {
        ...mockBaseline,
        missingInputs: ['wages', 'filingStatus'],
      };

      const result = validateScenarioForCalculation(baselineWithMissing, []);

      expect(result.blockers.length).toBeGreaterThan(0);
      expect(result.blockers.some((b) => b.field === 'wages')).toBe(true);
    });

    it('should generate blocker for missing taxpayers', () => {
      const invalidBaseline = {
        ...mockBaseline,
        taxpayers: [],
      };

      const result = validateScenarioForCalculation(invalidBaseline, []);

      expect(result.blockers.some((b) => b.field === 'taxpayers')).toBe(true);
    });
  });

  describe('Overall Severity', () => {
    it('should return hard_fail severity for blocking errors', () => {
      const invalidBaseline = {
        ...mockBaseline,
        householdId: '',
      };

      const result = validateScenarioForCalculation(invalidBaseline, []);

      expect(result.severity).toBe('hard_fail');
      expect(result.canProceed).toBe(false);
    });

    it('should return warn severity for warnings only', () => {
      const overrides: ScenarioOverride[] = [
        {
          field: 'stateLocalIncomeTaxes',
          operator: 'replace',
          value: 8000,
          reason: 'Test',
          sourceType: 'manual',
          createdBy: 'advisor-001',
          createdAt: new Date().toISOString(),
        },
      ];

      const result = validateScenarioForCalculation(mockBaseline, overrides);

      expect(result.canProceed).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should return pass severity for clean validation', () => {
      const result = validateScenarioForCalculation(mockBaseline, []);

      expect(result.severity).toBe('pass');
      expect(result.canProceed).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});
