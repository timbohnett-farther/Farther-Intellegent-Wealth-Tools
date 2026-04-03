/**
 * Tests for Interstate Tax Migration Calculator Engine
 */

import { describe, it, expect } from 'vitest';
import {
  calculateStateTax,
  estimateEstateTax,
  calculateTaxComparison,
} from './calculator';
import type {
  JurisdictionTaxRules,
  UserInputFacts,
  PuertoRicoExtension,
} from '../types';

describe('calculateStateTax', () => {
  it('should calculate zero tax for no-income-tax states', () => {
    const florida: JurisdictionTaxRules = {
      jurisdictionCode: 'FL',
      jurisdictionName: 'Florida',
      jurisdictionType: 'state',
      effectiveDate: '2026-01-01',
      taxYear: 2026,
      rulesVersion: '1.0.0',
      lastReviewed: '2026-03-20',
      sourceUrls: [],
      incomeTaxSystemType: 'none',
      capitalGainsTreatment: 'exempt',
      hasEstateTax: false,
      hasInheritanceTax: false,
    };

    const result = calculateStateTax(florida, 'single', 100000, 50000);

    expect(result.ordinaryIncomeTax).toBe(0);
    expect(result.capitalGainsTax).toBe(0);
    expect(result.totalIncomeTax).toBe(0);
    expect(result.effectiveTaxRate).toBe(0);
  });

  it('should calculate flat tax correctly', () => {
    const flatTaxState: JurisdictionTaxRules = {
      jurisdictionCode: 'TS',
      jurisdictionName: 'Test State',
      jurisdictionType: 'state',
      effectiveDate: '2026-01-01',
      taxYear: 2026,
      rulesVersion: '1.0.0',
      lastReviewed: '2026-03-20',
      sourceUrls: [],
      incomeTaxSystemType: 'flat',
      flatRate: 0.05, // 5% flat tax
      capitalGainsTreatment: 'as_ordinary',
      hasEstateTax: false,
      hasInheritanceTax: false,
    };

    const result = calculateStateTax(flatTaxState, 'single', 100000, 0);

    // 5% of $100,000 = $5,000
    expect(result.ordinaryIncomeTax).toBe(5000);
    expect(result.totalIncomeTax).toBe(5000);
  });

  it('should calculate graduated brackets correctly', () => {
    const graduatedState: JurisdictionTaxRules = {
      jurisdictionCode: 'GS',
      jurisdictionName: 'Graduated State',
      jurisdictionType: 'state',
      effectiveDate: '2026-01-01',
      taxYear: 2026,
      rulesVersion: '1.0.0',
      lastReviewed: '2026-03-20',
      sourceUrls: [],
      incomeTaxSystemType: 'graduated',
      brackets: {
        single: [
          { minIncome: 0, maxIncome: 10000, rate: 0.01 },
          { minIncome: 10000, maxIncome: 50000, rate: 0.05 },
          { minIncome: 50000, maxIncome: null, rate: 0.10 },
        ],
        marriedJoint: [
          { minIncome: 0, maxIncome: 20000, rate: 0.01 },
          { minIncome: 20000, maxIncome: 100000, rate: 0.05 },
          { minIncome: 100000, maxIncome: null, rate: 0.10 },
        ],
        marriedSeparate: [
          { minIncome: 0, maxIncome: 10000, rate: 0.01 },
          { minIncome: 10000, maxIncome: 50000, rate: 0.05 },
          { minIncome: 50000, maxIncome: null, rate: 0.10 },
        ],
        headOfHousehold: [
          { minIncome: 0, maxIncome: 15000, rate: 0.01 },
          { minIncome: 15000, maxIncome: 75000, rate: 0.05 },
          { minIncome: 75000, maxIncome: null, rate: 0.10 },
        ],
      },
      capitalGainsTreatment: 'exempt',
      hasEstateTax: false,
      hasInheritanceTax: false,
    };

    const result = calculateStateTax(graduatedState, 'single', 60000, 0);

    // First $10k at 1%: $100
    // Next $40k at 5%: $2,000
    // Next $10k at 10%: $1,000
    // Total: $3,100
    expect(result.ordinaryIncomeTax).toBe(3100);
  });

  it('should handle capital gains as ordinary income', () => {
    const state: JurisdictionTaxRules = {
      jurisdictionCode: 'TS',
      jurisdictionName: 'Test State',
      jurisdictionType: 'state',
      effectiveDate: '2026-01-01',
      taxYear: 2026,
      rulesVersion: '1.0.0',
      lastReviewed: '2026-03-20',
      sourceUrls: [],
      incomeTaxSystemType: 'flat',
      flatRate: 0.05,
      capitalGainsTreatment: 'as_ordinary',
      hasEstateTax: false,
      hasInheritanceTax: false,
    };

    const result = calculateStateTax(state, 'single', 100000, 50000);

    // Total income $150k at 5% = $7,500
    // Ordinary portion: $100k at 5% = $5,000
    // Capital gains portion: $50k at 5% = $2,500
    expect(result.totalIncomeTax).toBe(7500);
    expect(result.capitalGainsTax).toBe(2500);
  });

  it('should handle separate capital gains rate', () => {
    const state: JurisdictionTaxRules = {
      jurisdictionCode: 'TS',
      jurisdictionName: 'Test State',
      jurisdictionType: 'state',
      effectiveDate: '2026-01-01',
      taxYear: 2026,
      rulesVersion: '1.0.0',
      lastReviewed: '2026-03-20',
      sourceUrls: [],
      incomeTaxSystemType: 'flat',
      flatRate: 0.05,
      capitalGainsTreatment: 'separate_rate',
      capitalGainsRate: 0.03, // 3% separate rate
      hasEstateTax: false,
      hasInheritanceTax: false,
    };

    const result = calculateStateTax(state, 'single', 100000, 50000);

    expect(result.ordinaryIncomeTax).toBe(5000); // $100k at 5%
    expect(result.capitalGainsTax).toBe(1500); // $50k at 3%
    expect(result.totalIncomeTax).toBe(6500);
  });

  it('should handle Puerto Rico Act 60 pre-2026 cohort', () => {
    const puertoRico: JurisdictionTaxRules = {
      jurisdictionCode: 'PR',
      jurisdictionName: 'Puerto Rico',
      jurisdictionType: 'territory',
      effectiveDate: '2026-01-01',
      taxYear: 2026,
      rulesVersion: '1.0.0',
      lastReviewed: '2026-03-20',
      sourceUrls: [],
      incomeTaxSystemType: 'graduated',
      brackets: {
        single: [
          { minIncome: 0, maxIncome: 9000, rate: 0.0 },
          { minIncome: 9000, maxIncome: 25000, rate: 0.07 },
          { minIncome: 25000, maxIncome: null, rate: 0.33 },
        ],
        marriedJoint: [
          { minIncome: 0, maxIncome: 9000, rate: 0.0 },
          { minIncome: 9000, maxIncome: 25000, rate: 0.07 },
          { minIncome: 25000, maxIncome: null, rate: 0.33 },
        ],
        marriedSeparate: [
          { minIncome: 0, maxIncome: 9000, rate: 0.0 },
          { minIncome: 9000, maxIncome: 25000, rate: 0.07 },
          { minIncome: 25000, maxIncome: null, rate: 0.33 },
        ],
        headOfHousehold: [
          { minIncome: 0, maxIncome: 9000, rate: 0.0 },
          { minIncome: 9000, maxIncome: 25000, rate: 0.07 },
          { minIncome: 25000, maxIncome: null, rate: 0.33 },
        ],
      },
      capitalGainsTreatment: 'special',
      hasEstateTax: true,
      estateExemption: 5000000,
      hasInheritanceTax: false,
    };

    const act60Pre2026: PuertoRicoExtension = {
      assumeBonaFideResidency: true,
      act60Enabled: true,
      act60Cohort: 'pre_2026',
      act60CapitalGainsRate: 0.0, // 0% for pre-2026 decree
    };

    const result = calculateStateTax(puertoRico, 'single', 100000, 50000, act60Pre2026);

    expect(result.capitalGainsTax).toBe(0); // 0% for pre-2026 Act 60 holders
  });

  it('should handle Puerto Rico Act 60 post-2026 cohort', () => {
    const puertoRico: JurisdictionTaxRules = {
      jurisdictionCode: 'PR',
      jurisdictionName: 'Puerto Rico',
      jurisdictionType: 'territory',
      effectiveDate: '2026-01-01',
      taxYear: 2026,
      rulesVersion: '1.0.0',
      lastReviewed: '2026-03-20',
      sourceUrls: [],
      incomeTaxSystemType: 'graduated',
      brackets: {
        single: [
          { minIncome: 0, maxIncome: 9000, rate: 0.0 },
          { minIncome: 9000, maxIncome: 25000, rate: 0.07 },
          { minIncome: 25000, maxIncome: null, rate: 0.33 },
        ],
        marriedJoint: [
          { minIncome: 0, maxIncome: 9000, rate: 0.0 },
          { minIncome: 9000, maxIncome: 25000, rate: 0.07 },
          { minIncome: 25000, maxIncome: null, rate: 0.33 },
        ],
        marriedSeparate: [
          { minIncome: 0, maxIncome: 9000, rate: 0.0 },
          { minIncome: 9000, maxIncome: 25000, rate: 0.07 },
          { minIncome: 25000, maxIncome: null, rate: 0.33 },
        ],
        headOfHousehold: [
          { minIncome: 0, maxIncome: 9000, rate: 0.0 },
          { minIncome: 9000, maxIncome: 25000, rate: 0.07 },
          { minIncome: 25000, maxIncome: null, rate: 0.33 },
        ],
      },
      capitalGainsTreatment: 'special',
      hasEstateTax: true,
      estateExemption: 5000000,
      hasInheritanceTax: false,
    };

    const act60Post2026: PuertoRicoExtension = {
      assumeBonaFideResidency: true,
      act60Enabled: true,
      act60Cohort: 'post_2026',
    };

    const result = calculateStateTax(puertoRico, 'single', 100000, 50000, act60Post2026);

    expect(result.capitalGainsTax).toBe(2000); // 4% for post-2026 regime ($50k * 0.04)
  });
});

describe('estimateEstateTax', () => {
  it('should return undefined for states without estate tax', () => {
    const noEstateTaxState: JurisdictionTaxRules = {
      jurisdictionCode: 'FL',
      jurisdictionName: 'Florida',
      jurisdictionType: 'state',
      effectiveDate: '2026-01-01',
      taxYear: 2026,
      rulesVersion: '1.0.0',
      lastReviewed: '2026-03-20',
      sourceUrls: [],
      incomeTaxSystemType: 'none',
      capitalGainsTreatment: 'exempt',
      hasEstateTax: false,
      hasInheritanceTax: false,
    };

    const result = estimateEstateTax(noEstateTaxState, 10000000);

    expect(result).toBeUndefined();
  });

  it('should calculate estate tax with exemption', () => {
    const estateTaxState: JurisdictionTaxRules = {
      jurisdictionCode: 'NY',
      jurisdictionName: 'New York',
      jurisdictionType: 'state',
      effectiveDate: '2026-01-01',
      taxYear: 2026,
      rulesVersion: '1.0.0',
      lastReviewed: '2026-03-20',
      sourceUrls: [],
      incomeTaxSystemType: 'graduated',
      brackets: {
        single: [{ minIncome: 0, maxIncome: null, rate: 0.05 }],
        marriedJoint: [{ minIncome: 0, maxIncome: null, rate: 0.05 }],
        marriedSeparate: [{ minIncome: 0, maxIncome: null, rate: 0.05 }],
        headOfHousehold: [{ minIncome: 0, maxIncome: null, rate: 0.05 }],
      },
      capitalGainsTreatment: 'as_ordinary',
      hasEstateTax: true,
      estateExemption: 6940000,
      estateTopRate: 0.16,
      hasInheritanceTax: false,
    };

    const result = estimateEstateTax(estateTaxState, 10000000);

    expect(result).toBeDefined();
    expect(result!.taxableAmount).toBe(3060000); // $10M - $6.94M
    expect(result!.estimatedTax).toBe(489600); // $3.06M * 16%
  });

  it('should return zero tax if estate is below exemption', () => {
    const estateTaxState: JurisdictionTaxRules = {
      jurisdictionCode: 'NY',
      jurisdictionName: 'New York',
      jurisdictionType: 'state',
      effectiveDate: '2026-01-01',
      taxYear: 2026,
      rulesVersion: '1.0.0',
      lastReviewed: '2026-03-20',
      sourceUrls: [],
      incomeTaxSystemType: 'graduated',
      brackets: {
        single: [{ minIncome: 0, maxIncome: null, rate: 0.05 }],
        marriedJoint: [{ minIncome: 0, maxIncome: null, rate: 0.05 }],
        marriedSeparate: [{ minIncome: 0, maxIncome: null, rate: 0.05 }],
        headOfHousehold: [{ minIncome: 0, maxIncome: null, rate: 0.05 }],
      },
      capitalGainsTreatment: 'as_ordinary',
      hasEstateTax: true,
      estateExemption: 6940000,
      estateTopRate: 0.16,
      hasInheritanceTax: false,
    };

    const result = estimateEstateTax(estateTaxState, 5000000);

    expect(result).toBeUndefined(); // Below exemption, no tax
  });
});

describe('calculateTaxComparison', () => {
  it('should calculate full tax comparison with savings', () => {
    const california: JurisdictionTaxRules = {
      jurisdictionCode: 'CA',
      jurisdictionName: 'California',
      jurisdictionType: 'state',
      effectiveDate: '2026-01-01',
      taxYear: 2026,
      rulesVersion: '1.0.0',
      lastReviewed: '2026-03-20',
      sourceUrls: [],
      incomeTaxSystemType: 'flat',
      flatRate: 0.10, // Simplified 10% for test
      capitalGainsTreatment: 'as_ordinary',
      hasEstateTax: false,
      hasInheritanceTax: false,
    };

    const florida: JurisdictionTaxRules = {
      jurisdictionCode: 'FL',
      jurisdictionName: 'Florida',
      jurisdictionType: 'state',
      effectiveDate: '2026-01-01',
      taxYear: 2026,
      rulesVersion: '1.0.0',
      lastReviewed: '2026-03-20',
      sourceUrls: [],
      incomeTaxSystemType: 'none',
      capitalGainsTreatment: 'exempt',
      hasEstateTax: false,
      hasInheritanceTax: false,
    };

    const userFacts: UserInputFacts = {
      leavingStateCode: 'CA',
      destinationStateCode: 'FL',
      filingStatus: 'married_joint',
      annualOrdinaryIncome: 500000,
      annualCapitalGains: 100000,
    };

    const result = calculateTaxComparison(userFacts, california, florida);

    // CA: $600k total income * 10% = $60,000
    expect(result.originState.totalIncomeTax).toBe(60000);

    // FL: $0
    expect(result.destinationState.totalIncomeTax).toBe(0);

    // Savings: FL is $60k cheaper (negative = destination has lower tax)
    expect(result.annualTaxDifference).toBe(-60000);
    expect(result.tenYearIllustration).toBe(-600000);

    // Verify metadata
    expect(result.assumptions).toBeDefined();
    expect(result.assumptions.length).toBeGreaterThan(0);
    expect(result.caveats).toBeDefined();
    expect(result.caveats.length).toBeGreaterThan(0);
  });
});
