/**
 * Tax Engine Adapter Tests
 *
 * Tests for calculateScenario and tax output transformation
 *
 * Note: These are integration-style tests that require mocking
 * the tax engine orchestrator and Prisma database calls.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { calculateScenario } from '../tax-engine-adapter';
import type { ScenarioSnapshot } from '../snapshot-builder';
import type { TaxInputSnapshot } from '@/types/tax-engine';

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    taxRulesPackage: {
      findFirst: vi.fn(),
    },
    taxCalculationRun: {
      create: vi.fn(),
    },
  },
}));

// Mock orchestrator
vi.mock('@/lib/tax-engine/modules/orchestrator', () => ({
  runTaxCalculation: vi.fn(),
}));

import { prisma } from '@/lib/prisma';
import { runTaxCalculation } from '@/lib/tax-engine/modules/orchestrator';

describe('Tax Engine Adapter', () => {
  const mockScenarioSnapshot: ScenarioSnapshot = {
    snapshotId: 'snap_scenario_001',
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
      wages: 120000,
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
      iraDistributions: 50000,
      iraDistributionsTaxable: 50000,
      pensionsAnnuities: 0,
      pensionsAnnuitiesTaxable: 0,
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
      studentLoanInterest: 0,
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
      federalIncomeTaxWithheld: 25000,
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
    parentSnapshotId: 'snap_baseline_001',
    overrideSignature: 'abc123',
    appliedOverrides: [],
  };

  const mockTaxRules = {
    rulesVersion: '2025_federal_v1',
    taxYear: 2025,
    jurisdiction: 'federal',
    publishedAt: new Date(),
    publishedBy: 'system',
    isActive: true,
    checksum: 'abc123',
    metadataJson: JSON.stringify({ description: 'Test rules' }),
    ordinaryBracketsJson: JSON.stringify({}),
    capitalGainBracketsJson: JSON.stringify({}),
    standardDeductionJson: JSON.stringify({}),
    niitJson: JSON.stringify({}),
    socialSecurityTaxabilityJson: JSON.stringify({}),
    amtJson: JSON.stringify({}),
    childTaxCreditJson: JSON.stringify({}),
    retirementContributionsJson: JSON.stringify({}),
    eitcJson: JSON.stringify({}),
    deductionLimitsJson: JSON.stringify({}),
    kiddieTaxJson: JSON.stringify({}),
    educationCreditsJson: JSON.stringify({}),
    capitalLossJson: JSON.stringify({}),
    estateAndGiftJson: JSON.stringify({}),
    selfEmploymentTaxJson: JSON.stringify({}),
    section199AJson: JSON.stringify({}),
  };

  const mockOrchestrationResult = {
    context: {
      snapshot: mockScenarioSnapshot,
      rules: mockTaxRules as any,
      intermediates: {
        agi: 172500,
        taxableIncome: 143300,
        ordinaryIncomeTax: 25000,
        capitalGainsTax: 0,
        niit: 0,
        totalTaxBeforeCredits: 25000,
        totalCredits: 0,
        taxAfterCredits: 25000,
        totalPayments: 25000,
        refund: 0,
        taxDue: 0,
        totalIncome: 172500,
        adjustments: 0,
        standardDeduction: 29200,
        itemizedDeduction: 0,
        deductionMethod: 'standard',
        qbiDeduction: 0,
        ordinaryTaxableIncome: 143300,
        preferentialIncome: 0,
        childTaxCredit: 0,
        otherCredits: 0,
        federalTaxWithheld: 25000,
        estimatedTaxPayments: 0,
        marginalTaxRate: 24,
      },
      warnings: [],
      unsupportedItems: [],
      traceSteps: [],
      executedModules: [],
    },
    executionOrder: ['income_aggregation', 'agi_composer', 'deduction_chooser'],
    totalComputeTimeMs: 150,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup mock implementations
    (prisma.taxRulesPackage.findFirst as any).mockResolvedValue(mockTaxRules);
    (runTaxCalculation as any).mockResolvedValue(mockOrchestrationResult);
    (prisma.taxCalculationRun.create as any).mockResolvedValue({ id: 'run_001' });
  });

  describe('calculateScenario', () => {
    it('should load tax rules for correct year', async () => {
      await calculateScenario(mockScenarioSnapshot, 'scenario_001');

      expect(prisma.taxRulesPackage.findFirst).toHaveBeenCalledWith({
        where: {
          taxYear: 2025,
          isActive: true,
        },
      });
    });

    it('should throw error if tax rules not found', async () => {
      (prisma.taxRulesPackage.findFirst as any).mockResolvedValue(null);

      await expect(
        calculateScenario(mockScenarioSnapshot, 'scenario_001')
      ).rejects.toThrow('No active tax rules found for tax year 2025');
    });

    it('should call runTaxCalculation with snapshot and rules', async () => {
      await calculateScenario(mockScenarioSnapshot, 'scenario_001');

      expect(runTaxCalculation).toHaveBeenCalledWith(
        mockScenarioSnapshot,
        expect.objectContaining({
          rulesVersion: '2025_federal_v1',
          taxYear: 2025,
        })
      );
    });

    it('should transform orchestration result to tax output', async () => {
      const result = await calculateScenario(mockScenarioSnapshot, 'scenario_001');

      expect(result.taxOutput).toBeDefined();
      expect(result.taxOutput.summary).toBeDefined();
      expect(result.taxOutput.summary.agi).toBe(172500);
      expect(result.taxOutput.summary.taxableIncome).toBe(143300);
      expect(result.taxOutput.summary.totalTax).toBe(25000);
    });

    it('should generate scenario run ID', async () => {
      const result = await calculateScenario(mockScenarioSnapshot, 'scenario_001');

      expect(result.scenarioRunId).toMatch(/^run_scenario_001_\d+$/);
    });

    it('should persist calculation run to database', async () => {
      await calculateScenario(mockScenarioSnapshot, 'scenario_001');

      expect(prisma.taxCalculationRun.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          scenarioId: 'scenario_001',
          snapshotId: 'snap_scenario_001',
          taxYear: 2025,
          runType: 'scenario',
          computeTimeMs: 150,
        }),
      });
    });

    it('should include warnings from orchestration', async () => {
      const warningResult = {
        ...mockOrchestrationResult,
        context: {
          ...mockOrchestrationResult.context,
          warnings: [
            { code: 'WARN_001', message: 'Test warning', severity: 'warning' as const },
          ],
        },
      };
      (runTaxCalculation as any).mockResolvedValue(warningResult);

      const result = await calculateScenario(mockScenarioSnapshot, 'scenario_001');

      expect(result.warnings).toContain('Test warning');
    });

    it('should calculate effective tax rate correctly', async () => {
      const result = await calculateScenario(mockScenarioSnapshot, 'scenario_001');

      const expectedRate = Math.round((25000 / 172500) * 10000) / 100;
      expect(result.taxOutput.summary.effectiveTaxRate).toBe(expectedRate);
    });

    it('should return compute time metrics', async () => {
      const result = await calculateScenario(mockScenarioSnapshot, 'scenario_001');

      // Compute time should be a non-negative number
      expect(result.computeTimeMs).toBeGreaterThanOrEqual(0);
      expect(typeof result.computeTimeMs).toBe('number');
    });

    it('should include trace steps', async () => {
      const result = await calculateScenario(mockScenarioSnapshot, 'scenario_001');

      expect(result.trace).toBeDefined();
      expect(Array.isArray(result.trace)).toBe(true);
    });

    it('should handle calculation errors gracefully', async () => {
      (runTaxCalculation as any).mockRejectedValue(new Error('Calculation failed'));

      await expect(
        calculateScenario(mockScenarioSnapshot, 'scenario_001')
      ).rejects.toThrow('Tax calculation failed: Calculation failed');
    });
  });

  describe('Tax Output Transformation', () => {
    it('should map all summary fields correctly', async () => {
      const result = await calculateScenario(mockScenarioSnapshot, 'scenario_001');

      expect(result.taxOutput.summary).toMatchObject({
        agi: 172500,
        taxableIncome: 143300,
        totalTax: 25000,
        paymentsTotal: 25000,
        effectiveTaxRate: expect.any(Number),
        marginalTaxRate: 24,
      });
    });

    it('should map income breakdown correctly', async () => {
      const result = await calculateScenario(mockScenarioSnapshot, 'scenario_001');

      expect(result.taxOutput.incomeBreakdown).toMatchObject({
        totalIncome: 172500,
        adjustments: 0,
        agi: 172500,
      });
    });

    it('should map deduction breakdown correctly', async () => {
      const result = await calculateScenario(mockScenarioSnapshot, 'scenario_001');

      expect(result.taxOutput.deductionBreakdown).toMatchObject({
        standardDeduction: 29200,
        itemizedDeduction: 0,
        deductionMethod: 'standard',
        qualifiedBusinessIncomeDeduction: 0,
      });
    });

    it('should map tax calculation correctly', async () => {
      const result = await calculateScenario(mockScenarioSnapshot, 'scenario_001');

      expect(result.taxOutput.taxCalculation).toMatchObject({
        ordinaryTaxableIncome: 143300,
        ordinaryIncomeTax: 25000,
        preferentialIncome: 0,
        preferentialIncomeTax: 0,
        subtotal: 25000,
        niit: 0,
        total: 25000,
      });
    });

    it('should map payments correctly', async () => {
      const result = await calculateScenario(mockScenarioSnapshot, 'scenario_001');

      expect(result.taxOutput.payments).toMatchObject({
        withheld: 25000,
        estimated: 0,
        otherPayments: 0,
        total: 25000,
      });
    });
  });
});
