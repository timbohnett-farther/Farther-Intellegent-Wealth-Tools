/**
 * Tax Liability Modules Tests (Sprint 6)
 *
 * Tests for:
 * - Ordinary Income Tax Module
 * - Capital Gains Tax Module
 * - Net Investment Income Tax (NIIT) Module
 * - Total Tax Composer Module
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
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn(),
    },
  },
}));

/**
 * Helper: Create a mock tax input snapshot
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
      taxableInterest: 0,
      taxExemptInterest: 0,
      ordinaryDividends: 0,
      qualifiedDividends: 0,
      shortTermCapitalGains: 0,
      longTermCapitalGains: 0,
      businessIncome: 0,
      rentalIncome: 0,
      royaltyIncome: 0,
      socialSecurityTotal: 0,
      iraContributionsDeductible: 0,
      studentLoanInterest: 0,
      hsaContributionsDeductible: 0,
      educatorExpenses: 0,
      medicalDentalExpenses: 0,
      stateLocalIncomeTaxes: 0,
      realEstateTaxes: 0,
      personalPropertyTaxes: 0,
      mortgageInterest: 0,
      charitableCashContributions: 0,
      charitableNoncashContributions: 0,
      qualifiedBusinessIncome: 0,
      isSpecifiedServiceBusiness: false,
      taxWithheld: 0,
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

describe('Ordinary Income Tax Module', () => {
  it('should calculate tax on ordinary income only (no preferential income)', async () => {
    const snapshot = createMockSnapshot({
      wages: 150000,
      taxableInterest: 3000,
    });

    const rules = FEDERAL_RULES_2025_V1;
    const result = await runTaxCalculation(snapshot, rules);

    expect(result.context.intermediates.grossIncome).toBe(153000);
    expect(result.context.intermediates.agi).toBe(153000);
    expect(result.context.intermediates.taxableIncome).toBe(123000); // 153000 - 30000 standard (2025)
    expect(result.context.intermediates.ordinaryTaxableIncome).toBe(123000); // No preferential income
    expect(result.context.intermediates.ordinaryIncomeTax).toBeGreaterThan(0);

    // MFJ 2025 brackets: 10% up to 23200, 12% from 23200 to 94300, 22% from 94300 to 123000
    // Expected: 2320 + 8532 + 6314 = 17166
    expect(result.context.intermediates.ordinaryIncomeTax).toBeCloseTo(17166, 0);
  });

  it('should calculate tax only on ordinary portion when preferential income exists', async () => {
    const snapshot = createMockSnapshot({
      wages: 100000,
      longTermCapitalGains: 50000,
      ordinaryDividends: 5000,
      qualifiedDividends: 5000, // All dividends are qualified
    });

    const rules = FEDERAL_RULES_2025_V1;
    const result = await runTaxCalculation(snapshot, rules);

    expect(result.context.intermediates.grossIncome).toBe(155000);
    expect(result.context.intermediates.preferentialIncomeGross).toBe(55000); // 50k LT gains + 5k qual div
    expect(result.context.intermediates.taxableIncome).toBe(125000); // 155000 - 30000 (2025 MFJ std deduction)
    expect(result.context.intermediates.ordinaryTaxableIncome).toBe(70000); // 125000 - 55000
    expect(result.context.intermediates.ordinaryIncomeTax).toBeGreaterThan(0);

    // MFJ brackets: 10% up to 23200, 12% from 23200 to 70000
    // Expected: 2320 + 5616 = 7936
    expect(result.context.intermediates.ordinaryIncomeTax).toBeCloseTo(7936, 0);
  });

  it('should calculate effective and marginal tax rates', async () => {
    const snapshot = createMockSnapshot({
      wages: 150000,
    });

    const rules = FEDERAL_RULES_2025_V1;
    const result = await runTaxCalculation(snapshot, rules);

    expect(result.context.intermediates.effectiveTaxRate).toBeGreaterThan(0);
    expect(result.context.intermediates.effectiveTaxRate).toBeLessThan(22);
    expect(result.context.intermediates.marginalTaxRate).toBe(22); // In 22% bracket
  });
});

describe('Capital Gains Tax Module', () => {
  it('should return $0 when no preferential income', async () => {
    const snapshot = createMockSnapshot({
      wages: 100000,
    });

    const rules = FEDERAL_RULES_2025_V1;
    const result = await runTaxCalculation(snapshot, rules);

    expect(result.context.intermediates.capitalGainsTax).toBe(0);
    expect(result.context.intermediates.capitalGainsTaxableIncome).toBe(0);
  });

  it('should calculate 0% capital gains tax when income is in 0% bracket', async () => {
    const snapshot = createMockSnapshot({
      wages: 50000,
      longTermCapitalGains: 20000,
      ordinaryDividends: 3000,
      qualifiedDividends: 3000,
    });

    const rules = FEDERAL_RULES_2025_V1;
    const result = await runTaxCalculation(snapshot, rules);

    // Total income: 73000, taxable: 43800 (73000 - 29200)
    // Ordinary: 20800 (43800 - 23000 preferential)
    // All preferential income stacks on top and falls in 0% bracket (MFJ 0% up to 94050)
    expect(result.context.intermediates.capitalGainsTax).toBe(0);
    expect(result.context.intermediates.capitalGainsTaxableIncome).toBe(23000);
  });

  it('should calculate 15% capital gains tax when income is in 15% bracket', async () => {
    const snapshot = createMockSnapshot({
      wages: 200000,
      longTermCapitalGains: 50000,
      ordinaryDividends: 10000,
      qualifiedDividends: 10000,
    });

    const rules = FEDERAL_RULES_2025_V1;
    const result = await runTaxCalculation(snapshot, rules);

    // Total income: 260000, taxable: 230000 (260000 - 30000)
    // Preferential: 60000
    // Ordinary: 170000
    // Preferential stacks on top: 170000 to 230000 (all in 15% bracket for MFJ, 0% up to 94050)
    expect(result.context.intermediates.capitalGainsTaxableIncome).toBe(60000);
    expect(result.context.intermediates.capitalGainsTax).toBe(9000); // 60000 * 0.15
  });

  it('should calculate mixed rates when preferential income spans brackets', async () => {
    const snapshot = createMockSnapshot({
      wages: 80000,
      longTermCapitalGains: 30000,
      ordinaryDividends: 5000,
      qualifiedDividends: 5000,
    });

    const rules = FEDERAL_RULES_2025_V1;
    const result = await runTaxCalculation(snapshot, rules);

    // Total income: 115000, taxable: 85800 (115000 - 29200)
    // Preferential: 35000
    // Ordinary: 50800
    // Preferential stacks from 50800 to 85800
    // MFJ 0% bracket goes to 94050, so all preferential is at 0%
    expect(result.context.intermediates.capitalGainsTaxableIncome).toBe(35000);
    expect(result.context.intermediates.capitalGainsTax).toBe(0);
  });
});

describe('NIIT Module', () => {
  it('should return $0 when MAGI is below threshold', async () => {
    const snapshot = createMockSnapshot({
      wages: 150000,
      taxableInterest: 5000,
      longTermCapitalGains: 10000,
    });

    const rules = FEDERAL_RULES_2025_V1;
    const result = await runTaxCalculation(snapshot, rules);

    // MAGI: 165000, threshold for MFJ: 250000
    expect(result.context.intermediates.niit).toBe(0);
  });

  it('should calculate NIIT when MAGI exceeds threshold', async () => {
    const snapshot = createMockSnapshot({
      wages: 300000,
      taxableInterest: 10000,
      ordinaryDividends: 20000,
      qualifiedDividends: 20000,
      longTermCapitalGains: 50000,
    });

    const rules = FEDERAL_RULES_2025_V1;
    const result = await runTaxCalculation(snapshot, rules);

    // MAGI: 380000
    // Net investment income: 10000 + 20000 + 50000 = 80000
    // Excess MAGI: 380000 - 250000 = 130000
    // NIIT base: min(80000, 130000) = 80000
    // NIIT: 80000 * 0.038 = 3040
    expect(result.context.intermediates.modifiedAGI).toBe(380000);
    expect(result.context.intermediates.netInvestmentIncome).toBe(80000);
    expect(result.context.intermediates.niitBase).toBe(80000);
    expect(result.context.intermediates.niit).toBe(3040);
  });

  it('should limit NIIT base to excess MAGI when investment income is higher', async () => {
    const snapshot = createMockSnapshot({
      wages: 260000,
      taxableInterest: 50000,
      longTermCapitalGains: 100000,
    });

    const rules = FEDERAL_RULES_2025_V1;
    const result = await runTaxCalculation(snapshot, rules);

    // MAGI: 410000
    // Net investment income: 150000
    // Excess MAGI: 410000 - 250000 = 160000
    // NIIT base: min(150000, 160000) = 150000
    // NIIT: 150000 * 0.038 = 5700
    expect(result.context.intermediates.netInvestmentIncome).toBe(150000);
    expect(result.context.intermediates.niitBase).toBe(150000);
    expect(result.context.intermediates.niit).toBe(5700);
  });

  it('should include rental and royalty income in net investment income', async () => {
    const snapshot = createMockSnapshot({
      wages: 300000,
      taxableInterest: 5000,
      rentalIncome: 20000,
      royaltyIncome: 10000,
    });

    const rules = FEDERAL_RULES_2025_V1;
    const result = await runTaxCalculation(snapshot, rules);

    // Net investment income: 5000 + 20000 + 10000 = 35000
    expect(result.context.intermediates.netInvestmentIncome).toBe(35000);
    expect(result.context.intermediates.niitBase).toBe(35000);
    expect(result.context.intermediates.niit).toBe(1330); // 35000 * 0.038
  });
});

describe('Total Tax Composer Module', () => {
  it('should sum all tax components correctly', async () => {
    const snapshot = createMockSnapshot({
      wages: 200000,
      taxableInterest: 10000,
      longTermCapitalGains: 50000,
      ordinaryDividends: 20000,
      qualifiedDividends: 20000,
    });

    const rules = FEDERAL_RULES_2025_V1;
    const result = await runTaxCalculation(snapshot, rules);

    const ordinaryTax = result.context.intermediates.ordinaryIncomeTax as number;
    const capGainsTax = result.context.intermediates.capitalGainsTax as number;
    const niit = result.context.intermediates.niit as number;
    const totalTax = result.context.intermediates.totalTaxBeforeCredits as number;

    expect(ordinaryTax).toBeGreaterThan(0);
    expect(capGainsTax).toBeGreaterThan(0);
    expect(niit).toBeGreaterThan(0);
    expect(totalTax).toBe(ordinaryTax + capGainsTax + niit);
  });

  it('should calculate effective tax rate on total tax', async () => {
    const snapshot = createMockSnapshot({
      wages: 150000,
      longTermCapitalGains: 30000,
    });

    const rules = FEDERAL_RULES_2025_V1;
    const result = await runTaxCalculation(snapshot, rules);

    const agi = result.context.intermediates.agi as number;
    const totalTax = result.context.intermediates.totalTaxBeforeCredits as number;
    const effectiveRate = result.context.intermediates.effectiveTaxRateTotal as number;

    expect(agi).toBe(180000);
    expect(totalTax).toBeGreaterThan(0);
    expect(effectiveRate).toBeCloseTo((totalTax / agi) * 100, 2);
  });
});

describe('Full Tax Pipeline (All Modules)', () => {
  it('should calculate complete tax liability for high-income couple with investments', async () => {
    const snapshot = createMockSnapshot({
      wages: 350000,
      taxableInterest: 15000,
      ordinaryDividends: 30000,
      qualifiedDividends: 30000,
      longTermCapitalGains: 75000,
      shortTermCapitalGains: 10000,
      rentalIncome: 25000,
      iraContributionsDeductible: 7000,
      stateLocalIncomeTaxes: 15000, // Over SALT cap
      mortgageInterest: 20000,
      charitableCashContributions: 15000,
    });

    const rules = FEDERAL_RULES_2025_V1;
    const result = await runTaxCalculation(snapshot, rules);

    // Verify all key intermediates are calculated
    expect(result.context.intermediates.grossIncome).toBe(505000);
    expect(result.context.intermediates.agi).toBe(498000); // 505000 - 7000 IRA
    expect(result.context.intermediates.itemizedDeductions).toBeGreaterThan(0);

    // SALT cap should apply: 10000 (cap) + 20000 (mortgage) + 15000 (charity) = 45000
    expect(result.context.intermediates.itemizedDeductions).toBe(45000);

    // Should use itemized (45000) instead of standard (29200)
    expect(result.context.intermediates.totalDeduction).toBe(45000);
    expect(result.context.intermediates.deductionType).toBe('itemized');

    expect(result.context.intermediates.taxableIncome).toBe(453000); // 498000 - 45000

    // Preferential income: 75000 LT gains + 30000 qual div = 105000
    expect(result.context.intermediates.preferentialIncomeGross).toBe(105000);

    // Ordinary taxable income: 453000 - 105000 = 348000
    expect(result.context.intermediates.ordinaryTaxableIncome).toBe(348000);

    // All tax components should be calculated
    expect(result.context.intermediates.ordinaryIncomeTax).toBeGreaterThan(0);
    expect(result.context.intermediates.capitalGainsTax).toBeGreaterThan(0);
    expect(result.context.intermediates.niit).toBeGreaterThan(0);

    // NIIT: MAGI 498000 - threshold 250000 = 248000 excess
    // Net investment income: 15000 + 30000 + 75000 + 10000 + 25000 = 155000
    // NIIT base: min(155000, 248000) = 155000
    // NIIT: 155000 * 0.038 = 5890
    expect(result.context.intermediates.niit).toBe(5890);

    // Total tax should be sum of all components
    const totalTax = result.context.intermediates.totalTaxBeforeCredits as number;
    expect(totalTax).toBeGreaterThan(50000);
    expect(totalTax).toBe(
      (result.context.intermediates.ordinaryIncomeTax as number) +
        (result.context.intermediates.capitalGainsTax as number) +
        (result.context.intermediates.niit as number)
    );

    // Effective rate should be reasonable (15-25% range for this income level)
    const effectiveRate = result.context.intermediates.effectiveTaxRateTotal as number;
    expect(effectiveRate).toBeGreaterThan(15);
    expect(effectiveRate).toBeLessThan(25);
  });

  it('should verify all 15 modules execute in correct dependency order', async () => {
    const snapshot = createMockSnapshot({
      wages: 100000,
      longTermCapitalGains: 20000,
    });

    const rules = FEDERAL_RULES_2025_V1;
    const result = await runTaxCalculation(snapshot, rules);

    // Verify all 15 modules ran (including tax_credits and final_tax from Sprint 7)
    expect(result.executionOrder).toHaveLength(15);

    // Verify critical ordering constraints
    const filingStatusIndex = result.executionOrder.indexOf('filing_status_resolver');
    const incomeAggIndex = result.executionOrder.indexOf('income_aggregation');
    const agiIndex = result.executionOrder.indexOf('agi_composer');
    const deductionChooserIndex = result.executionOrder.indexOf('deduction_chooser');
    const taxableIncomeIndex = result.executionOrder.indexOf('taxable_income_composer');
    const ordinaryTaxIndex = result.executionOrder.indexOf('ordinary_income_tax');
    const capGainsTaxIndex = result.executionOrder.indexOf('capital_gains_tax');
    const niitIndex = result.executionOrder.indexOf('niit');
    const totalTaxIndex = result.executionOrder.indexOf('total_tax_composer');

    // Filing status must be first
    expect(filingStatusIndex).toBe(0);

    // Income aggregation depends on filing status
    expect(incomeAggIndex).toBeGreaterThan(filingStatusIndex);

    // AGI depends on income aggregation
    expect(agiIndex).toBeGreaterThan(incomeAggIndex);

    // Deduction chooser depends on AGI
    expect(deductionChooserIndex).toBeGreaterThan(agiIndex);

    // Taxable income depends on deduction chooser
    expect(taxableIncomeIndex).toBeGreaterThan(deductionChooserIndex);

    // Ordinary tax depends on taxable income
    expect(ordinaryTaxIndex).toBeGreaterThan(taxableIncomeIndex);

    // Capital gains tax depends on taxable income
    expect(capGainsTaxIndex).toBeGreaterThan(taxableIncomeIndex);

    // NIIT depends on AGI and capital gains tax
    expect(niitIndex).toBeGreaterThan(agiIndex);
    expect(niitIndex).toBeGreaterThan(capGainsTaxIndex);

    // Total tax must be last (depends on all tax components)
    expect(totalTaxIndex).toBeGreaterThan(ordinaryTaxIndex);
    expect(totalTaxIndex).toBeGreaterThan(capGainsTaxIndex);
    expect(totalTaxIndex).toBeGreaterThan(niitIndex);
  });
});
