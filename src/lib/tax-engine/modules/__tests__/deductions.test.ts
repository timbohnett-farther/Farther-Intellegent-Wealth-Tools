/**
 * Deductions & Taxable Income - Integration Tests
 *
 * Tests for itemized deductions, deduction chooser, QBI deduction, and taxable income calculation.
 */

import { vi } from 'vitest';
import type { TaxInputSnapshot } from '@/types/tax-engine';
import { runTaxCalculation } from '../orchestrator';
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

describe('Deductions & Taxable Income Modules', () => {
  describe('Itemized Deductions', () => {
    it('should calculate medical expenses with 7.5% AGI floor', async () => {
      const snapshot = createMockSnapshot({
        wages: 100000,
        medicalDentalExpenses: 10000,
      });

      const result = await runTaxCalculation(snapshot, FEDERAL_RULES_2025_V1, [
        'filing_status_resolver',
        'income_aggregation',
        'adjustments_to_income',
        'agi_composer',
        'itemized_deductions',
      ]);

      // AGI = 100000, Floor = 100000 * 0.075 = 7500
      // Deductible = 10000 - 7500 = 2500
      const itemizedBreakdown = result.context.intermediates.itemizedDeductionsBreakdown;
      expect(itemizedBreakdown.medicalDentalExpenses).toBe(2500);
    });

    it('should apply SALT cap of $10,000', async () => {
      const snapshot = createMockSnapshot({
        wages: 200000,
        stateLocalIncomeTaxes: 15000,
        realEstateTaxes: 8000,
        personalPropertyTaxes: 2000,
      });

      const result = await runTaxCalculation(snapshot, FEDERAL_RULES_2025_V1, [
        'filing_status_resolver',
        'income_aggregation',
        'adjustments_to_income',
        'agi_composer',
        'itemized_deductions',
      ]);

      // Total SALT = 15000 + 8000 + 2000 = 25000
      // Capped at 10000
      const itemizedBreakdown = result.context.intermediates.itemizedDeductionsBreakdown;
      expect(itemizedBreakdown.stateLocalTaxes).toBe(10000);

      // Should have warning about SALT cap
      expect(result.context.warnings).toContainEqual(
        expect.objectContaining({
          code: 'SALT_CAPPED',
          severity: 'info',
        })
      );
    });

    it('should limit investment interest to net investment income', async () => {
      const snapshot = createMockSnapshot({
        wages: 100000,
        taxableInterest: 5000,
        qualifiedDividends: 3000,
        investmentInterest: 10000,
      });

      const result = await runTaxCalculation(snapshot, FEDERAL_RULES_2025_V1, [
        'filing_status_resolver',
        'income_aggregation',
        'adjustments_to_income',
        'agi_composer',
        'itemized_deductions',
      ]);

      // Net investment income = taxableInterest (5000) + qualifiedDividends (3000) = 8000
      // Investment interest limited to 8000
      const itemizedBreakdown = result.context.intermediates.itemizedDeductionsBreakdown;
      expect(itemizedBreakdown.investmentInterest).toBe(8000);

      // Should have warning about limitation
      expect(result.context.warnings).toContainEqual(
        expect.objectContaining({
          code: 'INVESTMENT_INTEREST_LIMITED',
        })
      );
    });

    it('should limit charitable cash contributions to 60% AGI', async () => {
      const snapshot = createMockSnapshot({
        wages: 100000,
        charitableCashContributions: 80000,
      });

      const result = await runTaxCalculation(snapshot, FEDERAL_RULES_2025_V1, [
        'filing_status_resolver',
        'income_aggregation',
        'adjustments_to_income',
        'agi_composer',
        'itemized_deductions',
      ]);

      // AGI = 100000, Limit = 100000 * 0.6 = 60000
      // Charitable limited to 60000
      const itemizedBreakdown = result.context.intermediates.itemizedDeductionsBreakdown;
      expect(itemizedBreakdown.charitableContributions).toBe(60000);

      expect(result.context.warnings).toContainEqual(
        expect.objectContaining({
          code: 'CHARITABLE_CASH_LIMITED',
        })
      );
    });

    it('should limit charitable noncash contributions to 30% AGI', async () => {
      const snapshot = createMockSnapshot({
        wages: 100000,
        charitableNoncashContributions: 50000,
      });

      const result = await runTaxCalculation(snapshot, FEDERAL_RULES_2025_V1, [
        'filing_status_resolver',
        'income_aggregation',
        'adjustments_to_income',
        'agi_composer',
        'itemized_deductions',
      ]);

      // AGI = 100000, Limit = 100000 * 0.3 = 30000
      const itemizedBreakdown = result.context.intermediates.itemizedDeductionsBreakdown;
      expect(itemizedBreakdown.charitableContributions).toBe(30000);

      expect(result.context.warnings).toContainEqual(
        expect.objectContaining({
          code: 'CHARITABLE_NONCASH_LIMITED',
        })
      );
    });

    it('should calculate total itemized deductions correctly', async () => {
      const snapshot = createMockSnapshot({
        wages: 150000,
        medicalDentalExpenses: 20000,
        stateLocalIncomeTaxes: 8000,
        mortgageInterest: 12000,
        charitableCashContributions: 15000,
      });

      const result = await runTaxCalculation(snapshot, FEDERAL_RULES_2025_V1, [
        'filing_status_resolver',
        'income_aggregation',
        'adjustments_to_income',
        'agi_composer',
        'itemized_deductions',
      ]);

      // AGI = 150000
      // Medical: 20000 - (150000 * 0.075) = 20000 - 11250 = 8750
      // SALT: 8000 (under cap)
      // Mortgage: 12000
      // Charitable: 15000 (under 60% AGI limit of 90000)
      // Total: 8750 + 8000 + 12000 + 15000 = 43750

      expect(result.context.intermediates.itemizedDeductions).toBe(43750);
    });
  });

  describe('Deduction Chooser', () => {
    it('should choose standard deduction when itemized is lower', async () => {
      const snapshot = createMockSnapshot({
        wages: 100000,
        stateLocalIncomeTaxes: 5000,
        mortgageInterest: 3000,
      });

      const result = await runTaxCalculation(snapshot, FEDERAL_RULES_2025_V1, [
        'filing_status_resolver',
        'income_aggregation',
        'adjustments_to_income',
        'agi_composer',
        'itemized_deductions',
        'deduction_chooser',
      ]);

      // Itemized: 5000 + 3000 = 8000
      // Standard: 15000 (single)
      // Should choose standard

      expect(result.context.intermediates.deductionType).toBe('standard');
      expect(result.context.intermediates.totalDeduction).toBe(15000);
      expect(result.context.intermediates.itemizingBenefit).toBe(0);
    });

    it('should choose itemized deductions when higher than standard', async () => {
      const snapshot = createMockSnapshot({
        wages: 150000,
        stateLocalIncomeTaxes: 10000,
        mortgageInterest: 12000,
        charitableCashContributions: 5000,
      });

      const result = await runTaxCalculation(snapshot, FEDERAL_RULES_2025_V1, [
        'filing_status_resolver',
        'income_aggregation',
        'adjustments_to_income',
        'agi_composer',
        'itemized_deductions',
        'deduction_chooser',
      ]);

      // Itemized: 10000 (SALT capped) + 12000 + 5000 = 27000
      // Standard: 15000
      // Should choose itemized

      expect(result.context.intermediates.deductionType).toBe('itemized');
      expect(result.context.intermediates.totalDeduction).toBe(27000);
      expect(result.context.intermediates.itemizingBenefit).toBe(12000);
    });

    it('should warn when close to itemizing threshold', async () => {
      const snapshot = createMockSnapshot({
        wages: 100000,
        stateLocalIncomeTaxes: 10000,
        mortgageInterest: 4000,
      });

      const result = await runTaxCalculation(snapshot, FEDERAL_RULES_2025_V1, [
        'filing_status_resolver',
        'income_aggregation',
        'adjustments_to_income',
        'agi_composer',
        'itemized_deductions',
        'deduction_chooser',
      ]);

      // Itemized: 10000 (SALT capped) + 4000 = 14000
      // Standard: 15000
      // Close to threshold (14000 > 15000 * 0.9 = 13500 and < 15750)

      expect(result.context.intermediates.deductionType).toBe('standard');
      expect(result.context.warnings).toContainEqual(
        expect.objectContaining({
          code: 'CLOSE_TO_ITEMIZING_THRESHOLD',
        })
      );
    });
  });

  describe('QBI Deduction', () => {
    it('should calculate 20% QBI deduction when below threshold', async () => {
      const snapshot = createMockSnapshot({
        wages: 50000,
        businessIncome: 80000, // Schedule C business income (part of AGI)
        qualifiedBusinessIncome: 80000, // Same amount qualifies for QBI deduction
      });

      const result = await runTaxCalculation(snapshot, FEDERAL_RULES_2025_V1, [
        'filing_status_resolver',
        'income_aggregation',
        'adjustments_to_income',
        'agi_composer',
        'itemized_deductions',
        'deduction_chooser',
        'qbi_deduction',
      ]);

      // AGI = 130000 (50000 wages + 80000 business income)
      // Taxable income before QBI = 130000 - 15000 (standard) = 115000
      // Below threshold for single (191950)
      // QBI deduction = 80000 * 0.2 = 16000

      expect(result.context.intermediates.qbiBasicDeduction).toBe(16000);
      expect(result.context.intermediates.qbiDeduction).toBe(16000);
      expect(result.context.intermediates.qbiLimitationApplied).toBe(false);
    });

    it('should phase out QBI for SSTB above threshold', async () => {
      const snapshot = createMockSnapshot({
        wages: 100000,
        businessIncome: 120000, // Schedule C business income
        qualifiedBusinessIncome: 120000,
        isSpecifiedServiceBusiness: true,
      });

      const result = await runTaxCalculation(snapshot, FEDERAL_RULES_2025_V1, [
        'filing_status_resolver',
        'income_aggregation',
        'adjustments_to_income',
        'agi_composer',
        'itemized_deductions',
        'deduction_chooser',
        'qbi_deduction',
      ]);

      // AGI = 220000
      // Taxable income before QBI = 220000 - 15000 = 205000
      // Single threshold = 191950, phaseout range = 50000
      // Upper limit = 191950 + 50000 = 241950
      // Since 205000 is in phaseout range, phaseout applies
      // Phaseout %: (205000 - 191950) / 50000 = 13050 / 50000 = 26.1%
      // Basic deduction = 120000 * 0.2 = 24000
      // Phased out deduction = 24000 * (1 - 0.261) = 24000 * 0.739 ≈ 17736

      expect(result.context.intermediates.qbiBasicDeduction).toBe(24000);
      expect(result.context.intermediates.qbiDeduction).toBeGreaterThan(17000);
      expect(result.context.intermediates.qbiDeduction).toBeLessThan(18000);
      expect(result.context.intermediates.qbiLimitationApplied).toBe(true);
    });

    it('should disallow QBI for SSTB above phaseout threshold', async () => {
      const snapshot = createMockSnapshot({
        wages: 150000,
        businessIncome: 150000, // Schedule C business income
        qualifiedBusinessIncome: 150000,
        isSpecifiedServiceBusiness: true,
      });

      const result = await runTaxCalculation(snapshot, FEDERAL_RULES_2025_V1, [
        'filing_status_resolver',
        'income_aggregation',
        'adjustments_to_income',
        'agi_composer',
        'itemized_deductions',
        'deduction_chooser',
        'qbi_deduction',
      ]);

      // AGI = 300000
      // Taxable income before QBI = 300000 - 15000 = 285000
      // Above threshold + phaseout (191950 + 50000 = 241950)
      // SSTB: no deduction

      expect(result.context.intermediates.qbiDeduction).toBe(0);
      expect(result.context.intermediates.qbiLimitationApplied).toBe(true);

      expect(result.context.warnings).toContainEqual(
        expect.objectContaining({
          code: 'QBI_SSTB_DISALLOWED',
        })
      );
    });

    it('should handle zero QBI', async () => {
      const snapshot = createMockSnapshot({
        wages: 100000,
      });

      const result = await runTaxCalculation(snapshot, FEDERAL_RULES_2025_V1, [
        'filing_status_resolver',
        'income_aggregation',
        'adjustments_to_income',
        'agi_composer',
        'itemized_deductions',
        'deduction_chooser',
        'qbi_deduction',
      ]);

      expect(result.context.intermediates.qbiDeduction).toBe(0);
    });
  });

  describe('Taxable Income Composer', () => {
    it('should calculate taxable income correctly', async () => {
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
        'itemized_deductions',
        'deduction_chooser',
        'qbi_deduction',
        'taxable_income_composer',
      ]);

      // Gross income: 105000
      // Adjustments: 7000
      // AGI: 98000
      // Deductions: 15000 (standard)
      // QBI: 0
      // Taxable income: 98000 - 15000 = 83000

      expect(result.context.intermediates.taxableIncome).toBe(83000);
    });

    it('should calculate taxable income with itemized deductions', async () => {
      const snapshot = createMockSnapshot({
        wages: 150000,
        stateLocalIncomeTaxes: 10000,
        mortgageInterest: 15000,
        charitableCashContributions: 10000,
      });

      const result = await runTaxCalculation(snapshot, FEDERAL_RULES_2025_V1, [
        'filing_status_resolver',
        'income_aggregation',
        'adjustments_to_income',
        'agi_composer',
        'itemized_deductions',
        'deduction_chooser',
        'qbi_deduction',
        'taxable_income_composer',
      ]);

      // AGI: 150000
      // Itemized: 10000 + 15000 + 10000 = 35000
      // Taxable income: 150000 - 35000 = 115000

      expect(result.context.intermediates.taxableIncome).toBe(115000);
    });

    it('should calculate taxable income with QBI deduction', async () => {
      const snapshot = createMockSnapshot({
        wages: 50000,
        businessIncome: 80000, // Schedule C business income
        qualifiedBusinessIncome: 80000,
      });

      const result = await runTaxCalculation(snapshot, FEDERAL_RULES_2025_V1, [
        'filing_status_resolver',
        'income_aggregation',
        'adjustments_to_income',
        'agi_composer',
        'itemized_deductions',
        'deduction_chooser',
        'qbi_deduction',
        'taxable_income_composer',
      ]);

      // AGI: 130000
      // Deductions: 15000 (standard)
      // QBI: 16000
      // Taxable income: 130000 - 15000 - 16000 = 99000

      expect(result.context.intermediates.taxableIncome).toBe(99000);
    });

    it('should not allow negative taxable income', async () => {
      const snapshot = createMockSnapshot({
        wages: 10000,
        iraContributionsDeductible: 7000,
      });

      const result = await runTaxCalculation(snapshot, FEDERAL_RULES_2025_V1, [
        'filing_status_resolver',
        'income_aggregation',
        'adjustments_to_income',
        'agi_composer',
        'itemized_deductions',
        'deduction_chooser',
        'qbi_deduction',
        'taxable_income_composer',
      ]);

      // AGI: 10000 - 7000 = 3000
      // Deductions: 15000
      // Would be negative, but floored at 0

      expect(result.context.intermediates.taxableIncome).toBe(0);
    });
  });

  describe('Full Pipeline Integration', () => {
    it('should execute complete pipeline from income to taxable income', async () => {
      const snapshot = createMockSnapshot({
        wages: 120000,
        taxableInterest: 3000,
        ordinaryDividends: 2000, // Total dividends
        qualifiedDividends: 2000, // All dividends are qualified
        stateLocalIncomeTaxes: 10000,
        mortgageInterest: 12000,
        charitableCashContributions: 8000,
        iraContributionsDeductible: 7000,
      });

      const result = await runTaxCalculation(snapshot, FEDERAL_RULES_2025_V1);

      // Verify all modules executed
      expect(result.executionOrder).toContain('filing_status_resolver');
      expect(result.executionOrder).toContain('income_aggregation');
      expect(result.executionOrder).toContain('agi_composer');
      expect(result.executionOrder).toContain('itemized_deductions');
      expect(result.executionOrder).toContain('deduction_chooser');
      expect(result.executionOrder).toContain('qbi_deduction');
      expect(result.executionOrder).toContain('taxable_income_composer');

      // Verify calculation flow
      expect(result.context.intermediates.grossIncome).toBe(125000);
      expect(result.context.intermediates.agi).toBe(118000);
      expect(result.context.intermediates.itemizedDeductions).toBe(30000);
      expect(result.context.intermediates.deductionType).toBe('itemized');
      expect(result.context.intermediates.taxableIncome).toBe(88000);
    });
  });
});

// Helper function to create mock snapshots
function createMockSnapshot(inputs: Partial<any>, filingStatus: string = 'single'): TaxInputSnapshot {
  return {
    snapshotId: `test_snapshot_${Date.now()}`,
    householdId: 'test_household_123',
    taxYear: 2025,
    filingStatus: filingStatus as any,
    taxpayers: [{ role: 'primary', age: 45, isBlind: false }],
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
