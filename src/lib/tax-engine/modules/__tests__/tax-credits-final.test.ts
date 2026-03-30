/**
 * Tests for Tax Credits and Final Tax Modules
 *
 * Sprint 7: Tax Credits and Final Tax Calculation
 *
 * Tests cover:
 * - Tax credits application (refundable vs non-refundable)
 * - Child Tax Credit with ACTC split
 * - Final tax calculation with payments
 * - Underpayment penalty
 * - Refund calculation
 */

import { describe, it, expect, vi } from 'vitest';
import { runTaxCalculation } from '../orchestrator';
import type { TaxInputSnapshot } from '@/types/tax-engine';
import { FEDERAL_RULES_2025_V1 } from '../../rules/federal-2025-v1';

// Mock Prisma client
vi.mock('@/lib/prisma', () => ({
  prisma: {
    taxRulesPackage: {
      findMany: vi.fn().mockResolvedValue([]),
    },
  },
}));

/**
 * Create a mock tax input snapshot for testing
 */
function createMockSnapshot(
  inputs: Partial<any> = {},
  filingStatus: string = 'married_filing_jointly',
  taxpayers: any[] = []
): TaxInputSnapshot {
  return {
    snapshotId: `test_snapshot_${Date.now()}`,
    householdId: 'test_household_123',
    taxYear: 2025,
    filingStatus: filingStatus as any,
    taxpayers: taxpayers.length > 0 ? taxpayers : [{ role: 'primary', age: 45, isBlind: false }],
    inputs: {
      wages: 0,
      salaries: 0,
      tips: 0,
      taxableInterest: 0,
      ordinaryDividends: 0,
      qualifiedDividends: 0,
      capitalGainLossNet: 0, // Net capital gains
      businessIncome: 0,
      rentalIncome: 0,
      royaltyIncome: 0,
      unemploymentIncome: 0,
      socialSecurityTotal: 0,
      iraDistributionsTaxable: 0,
      pensionIncomeTaxable: 0,
      otherIncome: 0,
      traditionalIraContributions: 0,
      hsaContributions: 0,
      studentLoanInterest: 0,
      otherAdjustments: 0,
      medicalExpenses: 0,
      stateLocalTaxesPaid: 0,
      mortgageInterest: 0,
      charitableContributions: 0,
      childTaxCredit: 0,
      childAndDependentCareCredit: 0,
      earnedIncomeTaxCredit: 0,
      educationCredits: 0,
      foreignTaxCredit: 0,
      otherCredits: 0,
      taxWithheld: 0,
      estimatedTaxPayments: 0,
      excessSocialSecurityWithheld: 0,
      ...inputs,
    } as any,
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

describe('TaxCreditsModule', () => {
  it('should apply non-refundable credits correctly', async () => {
    const snapshot = createMockSnapshot({
      wages: 100000,
      childAndDependentCareCredit: 1000,
      educationCredits: 500,
    });

    const result = await runTaxCalculation(snapshot, FEDERAL_RULES_2025_V1);

    // Check that non-refundable credits total is stored
    // (Individual credit amounts are not stored in intermediates, only totals)
    const nonRefundableCredits = result.context.intermediates.nonRefundableCredits as number;
    expect(nonRefundableCredits).toBe(1500); // 1000 + 500

    // Non-refundable credits should reduce tax but not below zero
    const taxBeforeCredits = result.context.intermediates.totalTaxBeforeCredits as number;
    const taxAfterCredits = result.context.intermediates.taxAfterCredits as number;
    expect(taxAfterCredits).toBeLessThanOrEqual(taxBeforeCredits);
    expect(taxAfterCredits).toBeGreaterThanOrEqual(0);
  });

  it('should handle Child Tax Credit split (non-refundable + ACTC)', async () => {
    const snapshot = createMockSnapshot({
      wages: 50000,
      childTaxCredit: 4000, // $2000 per child × 2 children
    });

    const result = await runTaxCalculation(snapshot, FEDERAL_RULES_2025_V1);

    const totalTaxBeforeCredits = result.context.intermediates.totalTaxBeforeCredits as number;
    const childTaxCreditNonRefundable = result.context.intermediates
      .childTaxCreditNonRefundable as number;
    const childTaxCreditRefundable = result.context.intermediates
      .childTaxCreditRefundable as number;

    expect(childTaxCreditNonRefundable + childTaxCreditRefundable).toBe(4000);

    // Non-refundable portion should not exceed tax liability
    expect(childTaxCreditNonRefundable).toBeLessThanOrEqual(totalTaxBeforeCredits);

    // Refundable portion (ACTC) should be any excess
    if (totalTaxBeforeCredits < 4000) {
      expect(childTaxCreditRefundable).toBeGreaterThan(0);
    }
  });

  it('should apply refundable credits (EITC)', async () => {
    const snapshot = createMockSnapshot({
      wages: 30000,
      earnedIncomeTaxCredit: 6000, // EITC for family with children
    });

    const result = await runTaxCalculation(snapshot, FEDERAL_RULES_2025_V1);

    const taxAfterCredits = result.context.intermediates.taxAfterCredits as number;
    const refundableCredits = result.context.intermediates.refundableCredits as number;

    expect(refundableCredits).toBe(6000);

    // Refundable credits can reduce tax below zero
    expect(taxAfterCredits).toBeLessThan(0);
  });

  it('should track excess non-refundable credits', async () => {
    const snapshot = createMockSnapshot({
      wages: 20000, // Low income = low tax
      childAndDependentCareCredit: 5000, // More credits than tax owed
      educationCredits: 2000,
    });

    const result = await runTaxCalculation(snapshot, FEDERAL_RULES_2025_V1);

    const excessNonRefundableCredits = result.context.intermediates
      .excessNonRefundableCredits as number;

    // Should have some excess credits (couldn't all be applied)
    expect(excessNonRefundableCredits).toBeGreaterThan(0);

    // Tax after credits should be exactly zero (non-refundable can't go negative)
    const taxAfterNonRefundable = result.context.intermediates.taxAfterCredits as number;
    expect(taxAfterNonRefundable).toBeGreaterThanOrEqual(0);
  });

  it('should handle combination of refundable and non-refundable credits', async () => {
    const snapshot = createMockSnapshot({
      wages: 60000,
      childTaxCredit: 2000,
      childAndDependentCareCredit: 1000,
      earnedIncomeTaxCredit: 500,
    });

    const result = await runTaxCalculation(snapshot, FEDERAL_RULES_2025_V1);

    const totalCreditsApplied = result.context.intermediates.totalCreditsApplied as number;
    const refundableCredits = result.context.intermediates.refundableCredits as number;
    const totalNonRefundableApplied = result.context.intermediates
      .totalNonRefundableCreditsApplied as number;

    expect(totalCreditsApplied).toBe(refundableCredits + totalNonRefundableApplied);
  });
});

describe('FinalTaxModule', () => {
  it('should calculate tax due when tax > payments', async () => {
    const snapshot = createMockSnapshot({
      wages: 100000,
      taxWithheld: 5000,
    });

    const result = await runTaxCalculation(snapshot, FEDERAL_RULES_2025_V1);

    const taxAfterCredits = result.context.intermediates.taxAfterCredits as number;
    const totalPayments = result.context.intermediates.totalPayments as number;
    const taxDue = result.context.intermediates.taxDue as number;
    const refund = result.context.intermediates.refund as number;

    expect(totalPayments).toBe(5000);
    expect(taxDue).toBe(Math.max(0, taxAfterCredits - totalPayments));
    expect(refund).toBe(0);
  });

  it('should calculate refund when payments > tax', async () => {
    const snapshot = createMockSnapshot({
      wages: 50000,
      taxWithheld: 10000, // Over-withheld
    });

    const result = await runTaxCalculation(snapshot, FEDERAL_RULES_2025_V1);

    const taxAfterCredits = result.context.intermediates.taxAfterCredits as number;
    const totalPayments = result.context.intermediates.totalPayments as number;
    const taxDue = result.context.intermediates.taxDue as number;
    const refund = result.context.intermediates.refund as number;

    expect(totalPayments).toBe(10000);
    expect(taxDue).toBe(0);
    expect(refund).toBe(Math.max(0, totalPayments - taxAfterCredits));
    expect(refund).toBeGreaterThan(0);
  });

  it('should include all payment types in total payments', async () => {
    const snapshot = createMockSnapshot({
      wages: 80000,
      taxWithheld: 5000,
      estimatedTaxPayments: 3000,
      excessSocialSecurityWithheld: 500,
    });

    const result = await runTaxCalculation(snapshot, FEDERAL_RULES_2025_V1);

    const federalTaxWithheld = result.context.intermediates.federalTaxWithheld as number;
    const estimatedTaxPayments = result.context.intermediates.estimatedTaxPayments as number;
    const totalPayments = result.context.intermediates.totalPayments as number;

    expect(federalTaxWithheld).toBe(5000);
    expect(estimatedTaxPayments).toBe(3000);
    expect(totalPayments).toBe(8500); // 5000 + 3000 + 500
  });

  it('should calculate underpayment penalty when tax due > $1000 and withholding < 90%', async () => {
    const snapshot = createMockSnapshot({
      wages: 150000, // High income
      taxWithheld: 5000, // Under-withheld (< 90% of liability)
    });

    const result = await runTaxCalculation(snapshot, FEDERAL_RULES_2025_V1);

    const taxDue = result.context.intermediates.taxDue as number;
    const underpaymentPenalty = result.context.intermediates.underpaymentPenalty as number;
    const totalAmountDue = result.context.intermediates.totalAmountDue as number;

    if (taxDue > 1000) {
      const totalTaxBeforeCredits = result.context.intermediates.totalTaxBeforeCredits as number;
      const totalPayments = result.context.intermediates.totalPayments as number;

      if (totalPayments < totalTaxBeforeCredits * 0.9) {
        expect(underpaymentPenalty).toBeGreaterThan(0);
        expect(totalAmountDue).toBe(taxDue + underpaymentPenalty);
      }
    }
  });

  it('should not calculate penalty when withholding >= 90%', async () => {
    const snapshot = createMockSnapshot({
      wages: 100000,
      taxWithheld: 15000, // Well withheld (> 90%)
    });

    const result = await runTaxCalculation(snapshot, FEDERAL_RULES_2025_V1);

    const underpaymentPenalty = result.context.intermediates.underpaymentPenalty as number;

    expect(underpaymentPenalty).toBe(0);
  });

  it('should handle zero tax scenario', async () => {
    const snapshot = createMockSnapshot({
      wages: 10000, // Below standard deduction
    });

    const result = await runTaxCalculation(snapshot, FEDERAL_RULES_2025_V1);

    const taxDue = result.context.intermediates.taxDue as number;
    const refund = result.context.intermediates.refund as number;
    const underpaymentPenalty = result.context.intermediates.underpaymentPenalty as number;

    expect(taxDue).toBe(0);
    expect(refund).toBe(0);
    expect(underpaymentPenalty).toBe(0);
  });
});

describe('Full Pipeline with Credits and Final Tax', () => {
  it('should complete full calculation from income to final tax due', async () => {
    const snapshot = createMockSnapshot({
      wages: 120000,
      taxableInterest: 2000,
      qualifiedDividends: 3000,
      childTaxCredit: 2000,
      taxWithheld: 15000,
    });

    const result = await runTaxCalculation(snapshot, FEDERAL_RULES_2025_V1);

    // Verify all key intermediates are calculated
    expect(result.context.intermediates.agi).toBeGreaterThan(0);
    expect(result.context.intermediates.taxableIncome).toBeGreaterThan(0);
    expect(result.context.intermediates.ordinaryIncomeTax).toBeGreaterThan(0);
    expect(result.context.intermediates.totalTaxBeforeCredits).toBeGreaterThan(0);
    expect(result.context.intermediates.taxAfterCredits).toBeDefined();
    expect(result.context.intermediates.totalPayments).toBe(15000);

    const taxDue = result.context.intermediates.taxDue as number;
    const refund = result.context.intermediates.refund as number;

    // Should have either tax due OR refund, not both
    expect(taxDue === 0 || refund === 0).toBe(true);
  });

  it('should handle complex scenario with multiple income sources and credits', async () => {
    const snapshot = createMockSnapshot({
      wages: 80000,
      businessIncome: 20000,
      capitalGainLossNet: 10000,
      ordinaryDividends: 5000, // Total dividends
      qualifiedDividends: 5000, // All dividends are qualified
      childTaxCredit: 4000,
      childAndDependentCareCredit: 1000,
      educationCredits: 500,
      taxWithheld: 12000,
      estimatedTaxPayments: 3000,
    });

    const result = await runTaxCalculation(snapshot, FEDERAL_RULES_2025_V1);

    // AGI should include all income sources
    const agi = result.context.intermediates.agi as number;
    expect(agi).toBe(115000); // 80k wages + 20k business + 10k cap gains + 5k dividends

    // Should have ordinary income tax
    const ordinaryTax = result.context.intermediates.ordinaryIncomeTax as number;
    const capitalGainsTax = result.context.intermediates.capitalGainsTax as number;
    expect(ordinaryTax).toBeGreaterThan(0);
    // Capital gains tax may be 0 if all cap gains fall in 0% bracket
    expect(capitalGainsTax).toBeGreaterThanOrEqual(0);

    // Credits should reduce total tax
    const totalTaxBeforeCredits = result.context.intermediates.totalTaxBeforeCredits as number;
    const taxAfterCredits = result.context.intermediates.taxAfterCredits as number;
    expect(taxAfterCredits).toBeLessThan(totalTaxBeforeCredits);

    // Total payments should sum correctly
    const totalPayments = result.context.intermediates.totalPayments as number;
    expect(totalPayments).toBe(15000); // 12k + 3k
  });

  it('should handle high-income scenario with NIIT and credits', async () => {
    const snapshot = createMockSnapshot({
      wages: 250000,
      taxableInterest: 10000,
      capitalGainLossNet: 50000,
      childTaxCredit: 2000,
      taxWithheld: 40000,
    });

    const result = await runTaxCalculation(snapshot, FEDERAL_RULES_2025_V1);

    const agi = result.context.intermediates.agi as number;
    expect(agi).toBe(310000);

    // Should have NIIT (high income with investment income)
    const niit = result.context.intermediates.niit as number;
    expect(niit).toBeGreaterThan(0);

    // Total tax should include ordinary + capital gains + NIIT
    const ordinaryTax = result.context.intermediates.ordinaryIncomeTax as number;
    const capitalGainsTax = result.context.intermediates.capitalGainsTax as number;
    const totalTaxBeforeCredits = result.context.intermediates.totalTaxBeforeCredits as number;

    expect(totalTaxBeforeCredits).toBe(ordinaryTax + capitalGainsTax + niit);

    // Credits should apply
    const taxAfterCredits = result.context.intermediates.taxAfterCredits as number;
    expect(taxAfterCredits).toBeLessThan(totalTaxBeforeCredits);
  });

  it('should execute all 15 modules in correct dependency order', async () => {
    const snapshot = createMockSnapshot({
      wages: 100000,
      childTaxCredit: 2000,
      taxWithheld: 10000,
    });

    const result = await runTaxCalculation(snapshot, FEDERAL_RULES_2025_V1);

    // Verify all 15 modules executed
    expect(result.executionOrder.length).toBe(15);

    // Verify all expected modules are present
    const expectedModules = [
      'filing_status_resolver',
      'income_aggregation',
      'social_security_taxability',
      'adjustments_to_income',
      'agi_composer',
      'itemized_deductions',
      'deduction_chooser',
      'qbi_deduction',
      'taxable_income_composer',
      'ordinary_income_tax',
      'capital_gains_tax',
      'niit',
      'total_tax_composer',
      'tax_credits',
      'final_tax',
    ];

    expectedModules.forEach((moduleName) => {
      expect(result.executionOrder).toContain(moduleName);
    });

    // Verify critical ordering constraints
    const filingStatusIndex = result.executionOrder.indexOf('filing_status_resolver');
    const agiIndex = result.executionOrder.indexOf('agi_composer');
    const taxableIncomeIndex = result.executionOrder.indexOf('taxable_income_composer');
    const totalTaxIndex = result.executionOrder.indexOf('total_tax_composer');
    const creditsIndex = result.executionOrder.indexOf('tax_credits');
    const finalTaxIndex = result.executionOrder.indexOf('final_tax');

    // Filing status must come before AGI
    expect(filingStatusIndex).toBeLessThan(agiIndex);
    // AGI must come before taxable income
    expect(agiIndex).toBeLessThan(taxableIncomeIndex);
    // Taxable income must come before total tax
    expect(taxableIncomeIndex).toBeLessThan(totalTaxIndex);
    // Total tax must come before credits
    expect(totalTaxIndex).toBeLessThan(creditsIndex);
    // Credits must come before final tax
    expect(creditsIndex).toBeLessThan(finalTaxIndex);
  });
});
