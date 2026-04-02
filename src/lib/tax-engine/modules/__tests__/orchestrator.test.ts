/**
 * Tax Calculation Modules - Integration Tests
 *
 * Tests for module orchestration, dependency resolution, and individual module calculations.
 */

import { vi, beforeEach } from 'vitest';
import type { TaxInputSnapshot, TaxRulesPackage } from '@/types/tax-engine';
import {
  runTaxCalculation,
  getAvailableModules,
  getModuleDependencies,
  validateModuleDependencies,
} from '../orchestrator';
import { FEDERAL_RULES_2025_V1 } from '../../rules/federal-2025-v1';

// Mock Prisma to avoid database connection in tests
vi.mock('@/lib/prisma', () => ({
  prisma: {
    taxRulesPackage: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn(),
    },
  },
}));

describe('Tax Calculation Orchestrator', () => {
  describe('Module Registry', () => {
    it('should list all available modules', () => {
      const modules = getAvailableModules();
      expect(modules).toContain('filing_status_resolver');
      expect(modules).toContain('income_aggregation');
      expect(modules).toContain('social_security_taxability');
      expect(modules).toContain('adjustments_to_income');
      expect(modules).toContain('agi_composer');
      expect(modules).toContain('itemized_deductions');
      expect(modules).toContain('deduction_chooser');
      expect(modules).toContain('qbi_deduction');
      expect(modules).toContain('taxable_income_composer');
    });

    it('should validate module dependencies (no circular dependencies)', () => {
      const validation = validateModuleDependencies();
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should correctly resolve module dependencies', () => {
      const deps = getModuleDependencies('agi_composer', false);
      expect(deps).toContain('income_aggregation');
      expect(deps).toContain('adjustments_to_income');
    });

    it('should recursively resolve module dependencies', () => {
      const deps = getModuleDependencies('agi_composer', true);
      expect(deps).toContain('income_aggregation');
      expect(deps).toContain('adjustments_to_income');
      expect(deps).toContain('filing_status_resolver');
    });
  });

  describe('Module Execution Order', () => {
    it('should execute modules in correct dependency order', async () => {
      const snapshot = createMockSnapshot({
        wages: 100000,
      });

      const result = await runTaxCalculation(snapshot, FEDERAL_RULES_2025_V1);

      // Verify correct number of modules executed (all 15 modules)
      expect(result.executionOrder).toHaveLength(15);

      // Verify required dependencies are satisfied
      expect(result.executionOrder[0]).toBe('filing_status_resolver'); // Must be first (no dependencies)
      expect(result.executionOrder.indexOf('income_aggregation')).toBeGreaterThan(
        result.executionOrder.indexOf('filing_status_resolver')
      );
      expect(result.executionOrder.indexOf('agi_composer')).toBeGreaterThan(
        result.executionOrder.indexOf('income_aggregation')
      );
      expect(result.executionOrder.indexOf('agi_composer')).toBeGreaterThan(
        result.executionOrder.indexOf('adjustments_to_income')
      );
      expect(result.executionOrder.indexOf('deduction_chooser')).toBeGreaterThan(
        result.executionOrder.indexOf('itemized_deductions')
      );
      expect(result.executionOrder.indexOf('taxable_income_composer')).toBeGreaterThan(
        result.executionOrder.indexOf('deduction_chooser')
      );
      expect(result.executionOrder.indexOf('taxable_income_composer')).toBeGreaterThan(
        result.executionOrder.indexOf('qbi_deduction')
      );

      // Verify all expected modules ran
      expect(result.executionOrder).toContain('filing_status_resolver');
      expect(result.executionOrder).toContain('income_aggregation');
      expect(result.executionOrder).toContain('social_security_taxability');
      expect(result.executionOrder).toContain('adjustments_to_income');
      expect(result.executionOrder).toContain('agi_composer');
      expect(result.executionOrder).toContain('itemized_deductions');
      expect(result.executionOrder).toContain('deduction_chooser');
      expect(result.executionOrder).toContain('qbi_deduction');
      expect(result.executionOrder).toContain('taxable_income_composer');
    });

    it('should execute specified modules only', async () => {
      const snapshot = createMockSnapshot({
        wages: 100000,
      });

      const result = await runTaxCalculation(snapshot, FEDERAL_RULES_2025_V1, [
        'filing_status_resolver',
        'income_aggregation',
      ]);

      expect(result.executionOrder).toEqual(['filing_status_resolver', 'income_aggregation']);
      expect(result.context.executedModules).toHaveLength(2);
    });
  });

  describe('Filing Status Resolver', () => {
    it('should resolve filing status and calculate standard deduction', async () => {
      const snapshot = createMockSnapshot({}, 'single');

      const result = await runTaxCalculation(snapshot, FEDERAL_RULES_2025_V1, ['filing_status_resolver']);

      expect(result.context.intermediates.filingStatus).toBe('single');
      expect(result.context.intermediates.standardDeduction).toBe(15000);
    });

    it('should apply age 65+ standard deduction adjustment', async () => {
      const snapshot = createMockSnapshot({}, 'single', [
        { role: 'primary', age: 67, isBlind: false },
      ]);

      const result = await runTaxCalculation(snapshot, FEDERAL_RULES_2025_V1, ['filing_status_resolver']);

      expect(result.context.intermediates.standardDeduction).toBeGreaterThan(15000);
      expect(result.context.intermediates.primaryAge65OrBlind).toBe(true);
    });

    it('should handle MFJ filing status', async () => {
      const snapshot = createMockSnapshot({}, 'married_filing_jointly');

      const result = await runTaxCalculation(snapshot, FEDERAL_RULES_2025_V1, ['filing_status_resolver']);

      expect(result.context.intermediates.filingStatus).toBe('married_filing_jointly');
      expect(result.context.intermediates.standardDeduction).toBe(30000);
    });
  });

  describe('Income Aggregation', () => {
    it('should aggregate wages correctly', async () => {
      const snapshot = createMockSnapshot({
        wages: 75000,
        salaries: 25000,
        tips: 5000,
      });

      const result = await runTaxCalculation(snapshot, FEDERAL_RULES_2025_V1, [
        'filing_status_resolver',
        'income_aggregation',
      ]);

      expect(result.context.intermediates.wagesTotal).toBe(105000);
      expect(result.context.intermediates.ordinaryIncomeGross).toBe(105000);
      expect(result.context.intermediates.grossIncome).toBe(105000);
    });

    it('should separate ordinary and preferential income', async () => {
      const snapshot = createMockSnapshot({
        wages: 100000,
        taxableInterest: 5000,
        ordinaryDividends: 3000,
        qualifiedDividends: 2000,
        capitalGainLossNet: 10000,
      });

      const result = await runTaxCalculation(snapshot, FEDERAL_RULES_2025_V1, [
        'filing_status_resolver',
        'income_aggregation',
      ]);

      // Ordinary income: wages + interest + (ordinary dividends - qualified dividends)
      expect(result.context.intermediates.ordinaryIncomeGross).toBe(100000 + 5000 + 1000);
      // Preferential income: qualified dividends + capital gains
      expect(result.context.intermediates.preferentialIncomeGross).toBe(2000 + 10000);
      // Gross income: ordinary + preferential
      expect(result.context.intermediates.grossIncome).toBe(106000 + 12000);
    });

    it('should calculate provisional income for Social Security', async () => {
      const snapshot = createMockSnapshot({
        wages: 50000,
        taxableInterest: 2000,
        taxExemptInterest: 1000,
        socialSecurityTotal: 20000,
      });

      const result = await runTaxCalculation(snapshot, FEDERAL_RULES_2025_V1, [
        'filing_status_resolver',
        'income_aggregation',
      ]);

      // Provisional income = wages + taxable interest + tax-exempt interest + 50% of SS
      expect(result.context.intermediates.provisionalIncomeForSS).toBe(50000 + 2000 + 1000 + 10000);
    });
  });

  describe('Social Security Taxability', () => {
    it('should calculate 0% taxability when provisional income below tier 1', async () => {
      const snapshot = createMockSnapshot(
        {
          wages: 15000,
          socialSecurityTotal: 18000,
        },
        'single'
      );

      const result = await runTaxCalculation(snapshot, FEDERAL_RULES_2025_V1, [
        'filing_status_resolver',
        'income_aggregation',
        'social_security_taxability',
      ]);

      // Provisional income = 15000 + 9000 (50% of SS) = 24000 < 25000 (tier1 for single)
      expect(result.context.intermediates.taxableSocialSecurity).toBe(0);
      expect(result.context.intermediates.socialSecurityTaxabilityPercentage).toBe(0);
    });

    it('should calculate 50% taxability when provisional income between tier 1 and tier 2', async () => {
      const snapshot = createMockSnapshot(
        {
          wages: 20000,
          socialSecurityTotal: 18000,
        },
        'single'
      );

      const result = await runTaxCalculation(snapshot, FEDERAL_RULES_2025_V1, [
        'filing_status_resolver',
        'income_aggregation',
        'social_security_taxability',
      ]);

      // Provisional income = 20000 + 9000 (50% of SS) = 29000
      // tier1 = 25000, tier2 = 34000
      // Taxable = min(50% of SS, 50% of (29000 - 25000)) = min(9000, 2000) = 2000
      expect(result.context.intermediates.taxableSocialSecurity).toBe(2000);
      expect(result.context.intermediates.socialSecurityTaxabilityPercentage).toBeCloseTo(11.11, 1);
    });

    it('should calculate up to 85% taxability when provisional income above tier 2', async () => {
      const snapshot = createMockSnapshot(
        {
          wages: 50000,
          socialSecurityTotal: 20000,
        },
        'single'
      );

      const result = await runTaxCalculation(snapshot, FEDERAL_RULES_2025_V1, [
        'filing_status_resolver',
        'income_aggregation',
        'social_security_taxability',
      ]);

      // Provisional income = 50000 + 10000 (50% of SS) = 60000
      // tier1 = 25000, tier2 = 34000
      // Well above tier2, so should approach 85% taxability
      expect(result.context.intermediates.taxableSocialSecurity).toBeGreaterThan(0);
      expect(result.context.intermediates.socialSecurityTaxabilityPercentage).toBeGreaterThan(50);
    });

    it('should handle zero Social Security income', async () => {
      const snapshot = createMockSnapshot({
        wages: 100000,
        socialSecurityTotal: 0,
      });

      const result = await runTaxCalculation(snapshot, FEDERAL_RULES_2025_V1, [
        'filing_status_resolver',
        'income_aggregation',
        'social_security_taxability',
      ]);

      expect(result.context.intermediates.taxableSocialSecurity).toBe(0);
      expect(result.context.intermediates.socialSecurityTaxabilityPercentage).toBe(0);
    });
  });

  describe('Adjustments to Income', () => {
    it('should calculate IRA contribution deduction', async () => {
      const snapshot = createMockSnapshot({
        wages: 100000,
        iraContributionsDeductible: 7000,
      });

      const result = await runTaxCalculation(snapshot, FEDERAL_RULES_2025_V1, [
        'filing_status_resolver',
        'income_aggregation',
        'adjustments_to_income',
      ]);

      expect(result.context.intermediates.adjustmentsToIncome).toBe(7000);
      expect(result.context.intermediates.adjustmentsBreakdown.iraContributionsDeductible).toBe(7000);
    });

    it('should cap student loan interest at $2,500', async () => {
      const snapshot = createMockSnapshot({
        wages: 100000,
        studentLoanInterest: 5000,
      });

      const result = await runTaxCalculation(snapshot, FEDERAL_RULES_2025_V1, [
        'filing_status_resolver',
        'income_aggregation',
        'adjustments_to_income',
      ]);

      expect(result.context.intermediates.adjustmentsBreakdown.studentLoanInterest).toBe(2500);
      expect(result.context.warnings).toContainEqual(
        expect.objectContaining({
          code: 'STUDENT_LOAN_INTEREST_CAPPED',
          severity: 'info',
        })
      );
    });

    it('should calculate multiple adjustments correctly', async () => {
      const snapshot = createMockSnapshot({
        wages: 120000,
        iraContributionsDeductible: 7000,
        studentLoanInterest: 2000,
        hsaContributionsDeductible: 4000,
      });

      const result = await runTaxCalculation(snapshot, FEDERAL_RULES_2025_V1, [
        'filing_status_resolver',
        'income_aggregation',
        'adjustments_to_income',
      ]);

      expect(result.context.intermediates.adjustmentsToIncome).toBe(13000);
      expect(result.context.intermediates.adjustmentsBreakdown).toEqual({
        iraContributionsDeductible: 7000,
        studentLoanInterest: 2000,
        hsaContributionsDeductible: 4000,
      });
    });

    it('should cap educator expenses correctly', async () => {
      const snapshot = createMockSnapshot(
        {
          wages: 50000,
          educatorExpenses: 500,
        },
        'single'
      );

      const result = await runTaxCalculation(snapshot, FEDERAL_RULES_2025_V1, [
        'filing_status_resolver',
        'income_aggregation',
        'adjustments_to_income',
      ]);

      expect(result.context.intermediates.adjustmentsBreakdown.educatorExpenses).toBe(300);
      expect(result.context.warnings).toContainEqual(
        expect.objectContaining({
          code: 'EDUCATOR_EXPENSES_CAPPED',
        })
      );
    });
  });

  describe('AGI Composer', () => {
    it('should calculate AGI correctly', async () => {
      const snapshot = createMockSnapshot({
        wages: 100000,
        taxableInterest: 5000,
        iraContributionsDeductible: 7000,
      });

      const result = await runTaxCalculation(snapshot, FEDERAL_RULES_2025_V1, [
        'filing_status_resolver',
        'income_aggregation',
        'adjustments_to_income',
        'agi_composer',
      ]);

      // Gross income: 100000 + 5000 = 105000
      // Adjustments: 7000
      // AGI: 105000 - 7000 = 98000
      expect(result.context.intermediates.grossIncome).toBe(105000);
      expect(result.context.intermediates.adjustmentsToIncome).toBe(7000);
      expect(result.context.intermediates.agi).toBe(98000);
    });

    it('should handle zero adjustments', async () => {
      const snapshot = createMockSnapshot({
        wages: 100000,
      });

      const result = await runTaxCalculation(snapshot, FEDERAL_RULES_2025_V1, [
        'filing_status_resolver',
        'income_aggregation',
        'adjustments_to_income',
        'agi_composer',
      ]);

      expect(result.context.intermediates.agi).toBe(100000);
    });

    it('should not allow negative AGI', async () => {
      const snapshot = createMockSnapshot({
        wages: 5000,
        iraContributionsDeductible: 7000,
      });

      const result = await runTaxCalculation(snapshot, FEDERAL_RULES_2025_V1, [
        'filing_status_resolver',
        'income_aggregation',
        'adjustments_to_income',
        'agi_composer',
      ]);

      // AGI should be max(0, gross - adjustments)
      expect(result.context.intermediates.agi).toBe(0);
    });
  });

  describe('Full Pipeline Integration', () => {
    it('should execute complete pipeline for simple W-2 earner', async () => {
      const snapshot = createMockSnapshot(
        {
          wages: 75000,
          taxableInterest: 1000,
          iraContributionsDeductible: 6000,
        },
        'single'
      );

      const result = await runTaxCalculation(snapshot, FEDERAL_RULES_2025_V1);

      expect(result.context.intermediates.filingStatus).toBe('single');
      expect(result.context.intermediates.standardDeduction).toBe(15000);
      expect(result.context.intermediates.grossIncome).toBe(76000);
      expect(result.context.intermediates.adjustmentsToIncome).toBe(6000);
      expect(result.context.intermediates.agi).toBe(70000);
      expect(result.context.intermediates.deductionType).toBe('standard');
      expect(result.context.intermediates.taxableIncome).toBe(55000);
      expect(result.executionOrder).toHaveLength(15);
      expect(result.context.traceSteps).toHaveLength(15);
    });

    it('should execute complete pipeline for retiree with Social Security', async () => {
      const snapshot = createMockSnapshot(
        {
          pensionIncomeTaxable: 40000,
          socialSecurityTotal: 24000,
          taxableInterest: 3000,
          ordinaryDividends: 2000,
          qualifiedDividends: 2000,
        },
        'married_filing_jointly',
        [
          { role: 'primary', age: 70, isBlind: false },
          { role: 'spouse', age: 68, isBlind: false },
        ]
      );

      const result = await runTaxCalculation(snapshot, FEDERAL_RULES_2025_V1);

      expect(result.context.intermediates.filingStatus).toBe('married_filing_jointly');
      expect(result.context.intermediates.standardDeduction).toBeGreaterThan(30000); // Age 65+ bonus
      expect(result.context.intermediates.retirementIncomeGross).toBe(40000);
      expect(result.context.intermediates.socialSecurityGross).toBe(24000);
      expect(result.context.intermediates.taxableSocialSecurity).toBeGreaterThan(0);
      expect(result.context.intermediates.agi).toBeGreaterThan(0);
      expect(result.context.intermediates.taxableIncome).toBeGreaterThan(0);
    });

    it('should create complete trace for all executed modules', async () => {
      const snapshot = createMockSnapshot({
        wages: 100000,
        iraContributionsDeductible: 7000,
      });

      const result = await runTaxCalculation(snapshot, FEDERAL_RULES_2025_V1);

      expect(result.context.traceSteps).toHaveLength(15);

      // Verify trace step structure
      for (const step of result.context.traceSteps) {
        expect(step).toHaveProperty('stepId');
        expect(step).toHaveProperty('stepOrder');
        expect(step).toHaveProperty('moduleName');
        expect(step).toHaveProperty('ruleReference');
        expect(step).toHaveProperty('inputsUsed');
        expect(step).toHaveProperty('outputsProduced');
        expect(step.ruleReference).toContain('2025_federal_v1');
      }
    });

    it('should track compute time', async () => {
      const snapshot = createMockSnapshot({
        wages: 100000,
      });

      const result = await runTaxCalculation(snapshot, FEDERAL_RULES_2025_V1);

      expect(result.totalComputeTimeMs).toBeGreaterThanOrEqual(0);
      expect(result.totalComputeTimeMs).toBeLessThan(1000); // Should be fast
    });
  });
});

// Helper function to create mock snapshots
function createMockSnapshot(
  inputs: Partial<any>,
  filingStatus: string = 'single',
  taxpayers: any[] = []
): TaxInputSnapshot {
  return {
    snapshotId: `test_snapshot_${Date.now()}`,
    householdId: 'test_household_123',
    taxYear: 2025,
    filingStatus: filingStatus as any,
    taxpayers: taxpayers.length > 0 ? taxpayers : [{ role: 'primary', age: 45, isBlind: false }],
    inputs: inputs as any,
    sourceFactVersions: {},
    sourceFactIds: [],
    unresolvedFlags: [],
    missingInputs: [],
    warnings: [],
    createdAt: new Date().toISOString(),
    createdBy: 'test_user',
    sourceFactVersionSignature: 'test_signature',
  };
}
