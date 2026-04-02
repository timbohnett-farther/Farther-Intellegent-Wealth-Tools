/**
 * Snapshot Builder Tests
 *
 * Tests for buildScenarioSnapshot, override application, and signature generation
 */

import { describe, it, expect } from 'vitest';
import {
  buildScenarioSnapshot,
  getSnapshotDiff,
  verifyOverrideSignature,
} from '../snapshot-builder';
import type { TaxInputSnapshot } from '@/types/tax-engine';
import type { ScenarioOverride } from '@/types/scenario-planning';

describe('Snapshot Builder', () => {
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
      iraDistributions: 0,
      iraDistributionsTaxable: 0,
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

  describe('buildScenarioSnapshot', () => {
    it('should clone baseline without modifications when no overrides', () => {
      const result = buildScenarioSnapshot(mockBaseline, [], 'scenario_001');

      expect(result.snapshot).toBeDefined();
      expect(result.errors).toHaveLength(0);
      expect(result.snapshot!.parentSnapshotId).toBe('snap_baseline_001');
      expect(result.snapshot!.inputs.wages).toBe(100000);
    });

    it('should apply replace operator correctly', () => {
      const overrides: ScenarioOverride[] = [
        {
          field: 'iraDistributionsTaxable',
          operator: 'replace',
          value: 50000,
          reason: 'Roth conversion scenario',
          sourceType: 'manual',
          createdBy: 'advisor-001',
          createdAt: new Date().toISOString(),
        },
      ];

      const result = buildScenarioSnapshot(mockBaseline, overrides, 'scenario_001');

      expect(result.snapshot).toBeDefined();
      expect(result.errors).toHaveLength(0);
      expect(result.snapshot!.inputs.iraDistributionsTaxable).toBe(50000);
    });

    it('should apply add operator correctly', () => {
      const overrides: ScenarioOverride[] = [
        {
          field: 'charitableCashContributions',
          operator: 'add',
          value: 10000,
          reason: 'Charitable bunching',
          sourceType: 'manual',
          createdBy: 'advisor-001',
          createdAt: new Date().toISOString(),
        },
      ];

      const result = buildScenarioSnapshot(mockBaseline, overrides, 'scenario_001');

      expect(result.snapshot).toBeDefined();
      expect(result.errors).toHaveLength(0);
      // Original 5000 + 10000 = 15000
      expect(result.snapshot!.inputs.charitableCashContributions).toBe(15000);
    });

    it('should apply subtract operator correctly', () => {
      const overrides: ScenarioOverride[] = [
        {
          field: 'federalIncomeTaxWithheld',
          operator: 'subtract',
          value: 5000,
          reason: 'Adjust withholding',
          sourceType: 'manual',
          createdBy: 'advisor-001',
          createdAt: new Date().toISOString(),
        },
      ];

      const result = buildScenarioSnapshot(mockBaseline, overrides, 'scenario_001');

      expect(result.snapshot).toBeDefined();
      expect(result.errors).toHaveLength(0);
      // Original 15000 - 5000 = 10000
      expect(result.snapshot!.inputs.federalIncomeTaxWithheld).toBe(10000);
    });

    it('should apply multiple overrides in order', () => {
      const overrides: ScenarioOverride[] = [
        {
          field: 'wages',
          operator: 'replace',
          value: 120000,
          reason: 'Bonus scenario',
          sourceType: 'manual',
          createdBy: 'advisor-001',
          createdAt: new Date().toISOString(),
        },
        {
          field: 'iraDistributionsTaxable',
          operator: 'add',
          value: 30000,
          reason: 'Roth conversion',
          sourceType: 'manual',
          createdBy: 'advisor-001',
          createdAt: new Date().toISOString(),
        },
      ];

      const result = buildScenarioSnapshot(mockBaseline, overrides, 'scenario_001');

      expect(result.snapshot).toBeDefined();
      expect(result.errors).toHaveLength(0);
      expect(result.snapshot!.inputs.wages).toBe(120000);
      expect(result.snapshot!.inputs.iraDistributionsTaxable).toBe(30000);
    });

    it('should reject unknown field', () => {
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

      const result = buildScenarioSnapshot(mockBaseline, overrides, 'scenario_001');

      expect(result.snapshot).toBeNull();
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Unknown field');
    });

    it('should reject invalid operator for field', () => {
      const overrides: ScenarioOverride[] = [
        {
          field: 'wages',
          operator: 'toggle' as any,
          value: true,
          reason: 'Test',
          sourceType: 'manual',
          createdBy: 'advisor-001',
          createdAt: new Date().toISOString(),
        },
      ];

      const result = buildScenarioSnapshot(mockBaseline, overrides, 'scenario_001');

      expect(result.snapshot).toBeNull();
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should generate deterministic override signature', () => {
      const overrides1: ScenarioOverride[] = [
        {
          field: 'wages',
          operator: 'replace',
          value: 120000,
          reason: 'Test',
          sourceType: 'manual',
          createdBy: 'advisor-001',
          createdAt: new Date().toISOString(),
        },
        {
          field: 'iraDistributionsTaxable',
          operator: 'add',
          value: 30000,
          reason: 'Test',
          sourceType: 'manual',
          createdBy: 'advisor-001',
          createdAt: new Date().toISOString(),
        },
      ];

      const overrides2: ScenarioOverride[] = [
        {
          field: 'iraDistributionsTaxable',
          operator: 'add',
          value: 30000,
          reason: 'Test',
          sourceType: 'manual',
          createdBy: 'advisor-001',
          createdAt: new Date().toISOString(),
        },
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

      const result1 = buildScenarioSnapshot(mockBaseline, overrides1, 'scenario_001');
      const result2 = buildScenarioSnapshot(mockBaseline, overrides2, 'scenario_002');

      // Same overrides in different order should produce same signature
      expect(result1.snapshot!.overrideSignature).toBe(
        result2.snapshot!.overrideSignature
      );
    });

    it('should include applied overrides in snapshot', () => {
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

      const result = buildScenarioSnapshot(mockBaseline, overrides, 'scenario_001');

      expect(result.snapshot!.appliedOverrides).toEqual(overrides);
    });
  });

  describe('getSnapshotDiff', () => {
    it('should detect changed fields', () => {
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

      const result = buildScenarioSnapshot(mockBaseline, overrides, 'scenario_001');
      const diff = getSnapshotDiff(mockBaseline, result.snapshot!);

      expect(diff).toHaveLength(1);
      expect(diff[0].field).toBe('wages');
      expect(diff[0].baselineValue).toBe(100000);
      expect(diff[0].scenarioValue).toBe(120000);
    });

    it('should return empty array when no changes', () => {
      const result = buildScenarioSnapshot(mockBaseline, [], 'scenario_001');
      const diff = getSnapshotDiff(mockBaseline, result.snapshot!);

      expect(diff).toHaveLength(0);
    });
  });

  describe('verifyOverrideSignature', () => {
    it('should verify valid signature', () => {
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

      const result = buildScenarioSnapshot(mockBaseline, overrides, 'scenario_001');
      const isValid = verifyOverrideSignature(result.snapshot!);

      expect(isValid).toBe(true);
    });
  });
});
