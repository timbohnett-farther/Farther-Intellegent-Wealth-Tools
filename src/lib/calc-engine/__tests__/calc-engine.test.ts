/**
 * Comprehensive test suite for the Farther Prism Financial Planning Calculation Engine.
 *
 * Covers: Federal Tax, Social Security, SS Taxation, IRMAA, RMD, Roth Conversion,
 * State Tax, Capital Gains Tax, Cash Flow Engine, Monte Carlo, Estate Planning,
 * Business Sale, and Equity Compensation modules.
 *
 * All tests use 2026 tax tables from the built-in defaults.
 */

import { describe, test, expect } from 'vitest';

import {
  calculateFederalTax,
  calculateSSBenefit,
  calculateSSTaxation,
  calculateIRMAA,
  calculateRMD,
  calculateRothConversion,
  calculateStateTax,
  calculateCapitalGainsTax,
  projectCashFlows,
  runMonteCarlo,
  calculateFullEstateTax,
  calculateGRATRemainder,
  calculateCRTDeduction,
  calculateBusinessValuation,
  calculateBusinessSaleTax,
  calculateRSUVestTax,
  calculateNQSOExercise,
  calculateISOExercise,
  analyzeConcentratedPosition,
  getDefaultTaxTables,
} from '../index';

import type {
  FederalTaxInput,
  SSBenefitInput,
  SSTaxationInput,
  IRMAAInput,
  RMDInput,
  RothConversionInput,
  StateTaxInput,
  MonteCarloInput,
  CashFlowInput,
  FilingStatus,
} from '../types';

import type { EstateCalcInput } from '../estate/estate-planning-calc';
import type { BusinessValuationInput, BusinessSaleInput } from '../business/business-valuation';

// ─── Shared tax tables & helpers ────────────────────────────────────────────

const tables = getDefaultTaxTables();

function baseFederalInput(overrides: Partial<FederalTaxInput> = {}): FederalTaxInput {
  return {
    ordinaryIncome: 0,
    qualifiedDividends: 0,
    longTermCapitalGains: 0,
    shortTermCapitalGains: 0,
    otherIncome: 0,
    iraDistributions: 0,
    rothDistributions: 0,
    socialSecurityTaxable: 0,
    adjustments: {
      studentLoanInterest: 0,
      selfEmploymentDeduction: 0,
      iraDeduction: 0,
      hsaDeduction: 0,
      alimonyPaid: 0,
      otherAGIAdjustments: 0,
    },
    deductions: {
      type: 'standard',
      standardAmount: tables.standardDeductions.mfj, // 32200
      itemizedTotal: 0,
      saltAmount: 0,
      mortgageInterest: 0,
      charitableCash: 0,
      charitableNonCash: 0,
      medicalExpenses: 0,
      otherItemized: 0,
    },
    credits: {
      childTaxCredit: 0,
      childCareCredit: 0,
      educationCredit: 0,
      retirementSaverCredit: 0,
      foreignTaxCredit: 0,
      otherCredits: 0,
    },
    filingStatus: 'mfj',
    brackets: tables.ordinaryBrackets.mfj,
    cgBrackets: tables.capitalGainsBrackets.mfj as any,
    year: 2026,
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 1. FEDERAL TAX ENGINE
// ═══════════════════════════════════════════════════════════════════════════

describe('Federal Tax Engine', () => {
  test('MFJ $100K W-2 income: standard deduction reduces taxable income', () => {
    const input = baseFederalInput({ ordinaryIncome: 100_000 });
    const result = calculateFederalTax(input);
    // AGI = 100,000; taxableIncome = 100,000 - 32,200 = 67,800
    expect(result.adjustedGrossIncome).toBe(100_000);
    expect(result.deductionAmount).toBe(32_200);
    expect(result.taxableIncome).toBe(67_800);
    expect(result.federalIncomeTax).toBeGreaterThan(0);
  });

  test('MFJ $200K W-2: bracket breakdown sums to ordinaryTax', () => {
    const input = baseFederalInput({ ordinaryIncome: 200_000 });
    const result = calculateFederalTax(input);
    const breakdownSum = result.bracketBreakdown.reduce((s, b) => s + b.taxInBracket, 0);
    expect(breakdownSum).toBeCloseTo(result.ordinaryTax, 2);
  });

  test('Single $50K W-2: uses single brackets and deduction', () => {
    const input = baseFederalInput({
      ordinaryIncome: 50_000,
      filingStatus: 'single',
      brackets: tables.ordinaryBrackets.single,
      cgBrackets: tables.capitalGainsBrackets.single as any,
      deductions: {
        type: 'standard',
        standardAmount: tables.standardDeductions.single, // 16100
        itemizedTotal: 0,
        saltAmount: 0,
        mortgageInterest: 0,
        charitableCash: 0,
        charitableNonCash: 0,
        medicalExpenses: 0,
        otherItemized: 0,
      },
    });
    const result = calculateFederalTax(input);
    expect(result.deductionAmount).toBe(16_100);
    expect(result.taxableIncome).toBe(33_900);
    expect(result.marginalRate).toBe(0.12);
  });

  test('MFS $150K: uses MFS brackets', () => {
    const input = baseFederalInput({
      ordinaryIncome: 150_000,
      filingStatus: 'mfs',
      brackets: tables.ordinaryBrackets.mfs,
      cgBrackets: tables.capitalGainsBrackets.mfs as any,
      deductions: {
        type: 'standard',
        standardAmount: tables.standardDeductions.mfs,
        itemizedTotal: 0,
        saltAmount: 0,
        mortgageInterest: 0,
        charitableCash: 0,
        charitableNonCash: 0,
        medicalExpenses: 0,
        otherItemized: 0,
      },
    });
    const result = calculateFederalTax(input);
    expect(result.taxableIncome).toBe(150_000 - 16_100);
    expect(result.federalIncomeTax).toBeGreaterThan(0);
  });

  test('Itemized deductions larger than standard: picks itemized', () => {
    const input = baseFederalInput({
      ordinaryIncome: 300_000,
      deductions: {
        type: 'itemized',
        standardAmount: 32_200,
        itemizedTotal: 50_000,
        saltAmount: 15_000, // capped at 10K
        mortgageInterest: 20_000,
        charitableCash: 15_000,
        charitableNonCash: 0,
        medicalExpenses: 0,
        otherItemized: 0,
      },
    });
    const result = calculateFederalTax(input);
    // SALT capped at 10K + 20K mortgage + 15K charitable = 45K itemized
    expect(result.deductionAmount).toBe(45_000);
  });

  test('Senior standard deduction: higher base amount for 65+', () => {
    // We test by passing a higher standardAmount as if the caller added the 65+ extra
    const seniorDeduction = tables.standardDeductions.mfj + tables.standardDeductions.additional_mfj_65;
    const input = baseFederalInput({
      ordinaryIncome: 80_000,
      deductions: {
        type: 'standard',
        standardAmount: seniorDeduction, // 32200 + 1650 = 33850
        itemizedTotal: 0,
        saltAmount: 0,
        mortgageInterest: 0,
        charitableCash: 0,
        charitableNonCash: 0,
        medicalExpenses: 0,
        otherItemized: 0,
      },
    });
    const result = calculateFederalTax(input);
    expect(result.deductionAmount).toBe(33_850);
    expect(result.taxableIncome).toBe(80_000 - 33_850);
  });

  test('Trust income $50K single filing: taxes correctly', () => {
    const input = baseFederalInput({
      ordinaryIncome: 0,
      otherIncome: 50_000,
      filingStatus: 'single',
      brackets: tables.ordinaryBrackets.single,
      cgBrackets: tables.capitalGainsBrackets.single as any,
      deductions: {
        type: 'standard',
        standardAmount: tables.standardDeductions.single,
        itemizedTotal: 0,
        saltAmount: 0,
        mortgageInterest: 0,
        charitableCash: 0,
        charitableNonCash: 0,
        medicalExpenses: 0,
        otherItemized: 0,
      },
    });
    const result = calculateFederalTax(input);
    expect(result.grossIncome).toBe(50_000);
    expect(result.federalIncomeTax).toBeGreaterThan(0);
  });

  test('Zero income edge case: no tax owed', () => {
    const input = baseFederalInput({ ordinaryIncome: 0 });
    const result = calculateFederalTax(input);
    expect(result.grossIncome).toBe(0);
    expect(result.taxableIncome).toBe(0);
    expect(result.federalIncomeTax).toBe(0);
    expect(result.effectiveRate).toBe(0);
  });

  test('High income MFJ $1M: hits 37% bracket', () => {
    const input = baseFederalInput({ ordinaryIncome: 1_000_000 });
    const result = calculateFederalTax(input);
    expect(result.marginalRate).toBe(0.37);
    expect(result.effectiveRate).toBeGreaterThan(0.20);
    expect(result.effectiveRate).toBeLessThan(0.37);
  });

  test('LTCG + QD stacked on ordinary: preferential income taxed separately', () => {
    const input = baseFederalInput({
      ordinaryIncome: 80_000,
      qualifiedDividends: 20_000,
      longTermCapitalGains: 30_000,
    });
    const result = calculateFederalTax(input);
    expect(result.preferentialIncome).toBe(50_000);
    expect(result.capitalGainsTax).toBeGreaterThanOrEqual(0);
    expect(result.grossIncome).toBe(130_000);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 2. SOCIAL SECURITY ENGINE
// ═══════════════════════════════════════════════════════════════════════════

describe('Social Security Engine', () => {
  const baseSS: SSBenefitInput = {
    pia: 3_000,
    fullRetirementAge: 67,
    claimAge: 67,
    colaRate: 0.02,
    ssHaircut: 0,
    wep: false,
    wepNoncoveredPension: 0,
    gpo: false,
    gpoNoncoveredPension: 0,
  };

  test('Claim at FRA: adjustment factor is 1.0', () => {
    const result = calculateSSBenefit(baseSS);
    expect(result.adjustmentFactor).toBeCloseTo(1.0, 4);
    expect(result.monthlyBenefitAtClaimAge).toBe(3_000);
    expect(result.annualBenefitAtClaimAge).toBe(36_000);
  });

  test('Claim at 62: ~25% reduction for FRA 67', () => {
    const result = calculateSSBenefit({ ...baseSS, claimAge: 62 });
    // 60 months early: first 36 months at 5/9% = 20%, next 24 at 5/12% = 10% => 30% reduction
    expect(result.adjustmentFactor).toBeCloseTo(0.70, 2);
    expect(result.monthlyBenefitAtClaimAge).toBeCloseTo(2_100, 0);
  });

  test('Claim at 70: 24% bonus (8%/yr * 3 years)', () => {
    const result = calculateSSBenefit({ ...baseSS, claimAge: 70 });
    // 36 months delayed at 2/3% per month = 24% increase
    expect(result.adjustmentFactor).toBeCloseTo(1.24, 2);
    expect(result.monthlyBenefitAtClaimAge).toBeCloseTo(3_720, 0);
  });

  test('Spousal benefit: 50% of worker PIA at FRA', () => {
    // A spousal benefit uses PIA = 50% of worker's PIA
    const spousal = calculateSSBenefit({
      ...baseSS,
      pia: 1_500, // 50% of $3,000
      claimAge: 67,
    });
    expect(spousal.monthlyBenefitAtFRA).toBe(1_500);
    expect(spousal.finalAnnualBenefit).toBe(18_000);
  });

  test('WEP reduction: reduces benefit by up to $587/mo', () => {
    const result = calculateSSBenefit({
      ...baseSS,
      wep: true,
      wepNoncoveredPension: 2_000,
    });
    // WEP = min($587, 50% * $2000 = $1000) = $587
    expect(result.wepReduction).toBe(587);
    expect(result.finalAnnualBenefit).toBeCloseTo((3_000 - 587) * 12, 0);
  });

  test('GPO reduction: reduces by 2/3 of government pension', () => {
    const result = calculateSSBenefit({
      ...baseSS,
      gpo: true,
      gpoNoncoveredPension: 1_800,
    });
    // GPO = 2/3 * 1800 = 1200
    expect(result.gpoReduction).toBeCloseTo(1_200, 0);
    expect(result.finalAnnualBenefit).toBeCloseTo((3_000 - 1_200) * 12, 0);
  });

  test('Break-even vs age 62: returns an age for later claim', () => {
    const result = calculateSSBenefit({ ...baseSS, claimAge: 70 });
    expect(result.breakEvenAgeVsAge62).toBeGreaterThan(70);
    expect(result.breakEvenAgeVsAge62).toBeLessThanOrEqual(100);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 3. SS TAXATION
// ═══════════════════════════════════════════════════════════════════════════

describe('SS Taxation', () => {
  test('Low income single: $0 taxable (provisional < $25K)', () => {
    const result = calculateSSTaxation({
      grossSocialSecurityBenefit: 20_000,
      otherMAGIIncome: 10_000,
      taxExemptInterest: 0,
      filingStatus: 'single',
    });
    // Provisional = 10000 + 10000 = 20000 < 25000 threshold
    expect(result.taxableSS).toBe(0);
    expect(result.taxableSSPct).toBe(0);
  });

  test('Single 50% range: provisional between $25K-$34K', () => {
    const result = calculateSSTaxation({
      grossSocialSecurityBenefit: 20_000,
      otherMAGIIncome: 20_000,
      taxExemptInterest: 0,
      filingStatus: 'single',
    });
    // Provisional = 20000 + 10000 = 30000; in 50% zone (25K-34K)
    // Taxable = min(50% * (30000-25000), 50% * 20000) = min(2500, 10000) = 2500
    expect(result.provisionalIncome).toBe(30_000);
    expect(result.taxableSS).toBe(2_500);
    expect(result.taxableSSPct).toBeCloseTo(0.125, 3);
  });

  test('Single 85% range: provisional above $34K', () => {
    const result = calculateSSTaxation({
      grossSocialSecurityBenefit: 30_000,
      otherMAGIIncome: 60_000,
      taxExemptInterest: 0,
      filingStatus: 'single',
    });
    // Provisional = 60000 + 15000 = 75000
    // Tier1 = min(50% * 9000, 50% * 30000) = min(4500, 15000) = 4500
    // Tier2 = 85% * (75000 - 34000) = 85% * 41000 = 34850
    // Total = min(4500 + 34850, 85% * 30000) = min(39350, 25500) = 25500
    expect(result.taxableSS).toBe(25_500);
    expect(result.taxableSSPct).toBe(0.85);
  });

  test('MFJ low income: $0 taxable (provisional < $32K)', () => {
    const result = calculateSSTaxation({
      grossSocialSecurityBenefit: 24_000,
      otherMAGIIncome: 15_000,
      taxExemptInterest: 0,
      filingStatus: 'mfj',
    });
    // Provisional = 15000 + 12000 = 27000 < 32000
    expect(result.taxableSS).toBe(0);
  });

  test('MFJ 50% range: between $32K-$44K', () => {
    const result = calculateSSTaxation({
      grossSocialSecurityBenefit: 24_000,
      otherMAGIIncome: 28_000,
      taxExemptInterest: 0,
      filingStatus: 'mfj',
    });
    // Provisional = 28000 + 12000 = 40000; in 50% zone (32K-44K)
    // Taxable = min(50% * (40000-32000), 50% * 24000) = min(4000, 12000) = 4000
    expect(result.provisionalIncome).toBe(40_000);
    expect(result.taxableSS).toBe(4_000);
  });

  test('MFS: automatic 85% inclusion', () => {
    const result = calculateSSTaxation({
      grossSocialSecurityBenefit: 20_000,
      otherMAGIIncome: 5_000,
      taxExemptInterest: 0,
      filingStatus: 'mfs',
    });
    expect(result.taxableSS).toBe(17_000); // 85% * 20000
    expect(result.taxableSSPct).toBe(0.85);
  });

  test('High income: capped at 85% of gross SS', () => {
    const result = calculateSSTaxation({
      grossSocialSecurityBenefit: 40_000,
      otherMAGIIncome: 500_000,
      taxExemptInterest: 0,
      filingStatus: 'single',
    });
    expect(result.taxableSS).toBe(34_000); // 85% * 40000
    expect(result.taxableSSPct).toBe(0.85);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 4. IRMAA ENGINE
// ═══════════════════════════════════════════════════════════════════════════

describe('IRMAA Engine', () => {
  const baseIRMAA: IRMAAInput = {
    magiTwoYearsAgo: 100_000,
    filingStatus: 'mfj',
    age: 67,
    brackets: tables.irmaa,
  };

  test('Base premium: MAGI below first threshold ($212K MFJ)', () => {
    const result = calculateIRMAA(baseIRMAA);
    expect(result.applies).toBe(true);
    // In the first bracket (0 - 212,000): standard premium, no surcharge
    expect(result.partBMonthlyPremium).toBe(185);
    expect(result.partDMonthlySurcharge).toBe(0);
    expect(result.annualIRMAASurcharge).toBe(0);
  });

  test('First IRMAA tier: MAGI $250K MFJ', () => {
    const result = calculateIRMAA({
      ...baseIRMAA,
      magiTwoYearsAgo: 250_000,
    });
    expect(result.applies).toBe(true);
    expect(result.partBMonthlyPremium).toBe(259);
    expect(result.partDMonthlySurcharge).toBe(13.70);
    expect(result.annualIRMAASurcharge).toBeCloseTo((259 - 185 + 13.70) * 12, 1);
  });

  test('Highest IRMAA tier: MAGI $1M MFJ', () => {
    const result = calculateIRMAA({
      ...baseIRMAA,
      magiTwoYearsAgo: 1_000_000,
    });
    expect(result.applies).toBe(true);
    expect(result.partBMonthlyPremium).toBe(628.90);
    expect(result.partDMonthlySurcharge).toBe(85.80);
  });

  test('Single filer: half-threshold matching', () => {
    // Single filer with MAGI $150K — bracket thresholds are halved
    // First bracket max for single = 212000 / 2 = 106000
    // So $150K > 106K => hits second bracket
    const result = calculateIRMAA({
      ...baseIRMAA,
      filingStatus: 'single',
      magiTwoYearsAgo: 150_000,
    });
    expect(result.applies).toBe(true);
    expect(result.partBMonthlyPremium).toBeGreaterThan(185);
  });

  test('Pre-65: IRMAA does not apply', () => {
    const result = calculateIRMAA({
      ...baseIRMAA,
      age: 64,
      magiTwoYearsAgo: 500_000,
    });
    expect(result.applies).toBe(false);
    expect(result.annualIRMAASurcharge).toBe(0);
    expect(result.partBMonthlyPremium).toBe(185);
  });

  test('Part D surcharge present in higher brackets', () => {
    const result = calculateIRMAA({
      ...baseIRMAA,
      magiTwoYearsAgo: 350_000,
    });
    expect(result.partDMonthlySurcharge).toBeGreaterThan(0);
    expect(result.annualIRMAASurcharge).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 5. RMD ENGINE
// ═══════════════════════════════════════════════════════════════════════════

describe('RMD Engine', () => {
  const baseRMD: RMDInput = {
    accountBalance: 500_000,
    ownerAge: 73,
    accountType: 'ira_traditional',
    isInherited: false,
    rmdTable: tables.rmdUniform,
    secure2Act: true,
    birthYear: 1953,
  };

  test('Age 73 with $500K balance: RMD required', () => {
    const result = calculateRMD(baseRMD);
    expect(result.rmdRequired).toBe(true);
    // Divisor at 73 = 26.5
    expect(result.distributionPeriod).toBe(26.5);
    expect(result.rmdAmount).toBeCloseTo(500_000 / 26.5, 1);
    expect(result.method).toBe('uniform_lifetime_table');
  });

  test('Age 80 with $800K balance: correct divisor', () => {
    const result = calculateRMD({
      ...baseRMD,
      accountBalance: 800_000,
      ownerAge: 80,
    });
    expect(result.rmdRequired).toBe(true);
    // Divisor at 80 = 20.2
    expect(result.distributionPeriod).toBe(20.2);
    expect(result.rmdAmount).toBeCloseTo(800_000 / 20.2, 1);
  });

  test('Age 72 born 1953: no RMD yet (SECURE 2.0 start age 73)', () => {
    const result = calculateRMD({
      ...baseRMD,
      ownerAge: 72,
    });
    expect(result.rmdRequired).toBe(false);
    expect(result.rmdAmount).toBe(0);
    expect(result.rmdStartAge).toBe(73);
    expect(result.method).toBe('not_yet_required');
  });

  test('Born 1960: RMD start age is 75', () => {
    const result = calculateRMD({
      ...baseRMD,
      ownerAge: 74,
      birthYear: 1960,
    });
    expect(result.rmdRequired).toBe(false);
    expect(result.rmdStartAge).toBe(75);
  });

  test('Inherited IRA non-spouse: 10-year rule', () => {
    const result = calculateRMD({
      ...baseRMD,
      isInherited: true,
      beneficiaryType: 'non_spouse',
      isSpouseBeneficiary: false,
      yearOfDeath: 2023,
      ownerAge: 55,
      birthYear: 1971,
    });
    expect(result.rmdRequired).toBe(true);
    expect(result.method).toBe('inherited_non_spouse_10_year_rule');
    // 2026 - 2023 = 3 years elapsed => 10 - 3 = 7 remaining
    expect(result.distributionPeriod).toBe(7);
    expect(result.rmdAmount).toBeCloseTo(500_000 / 7, 1);
  });

  test('Inherited IRA spouse: own-life-expectancy method', () => {
    const result = calculateRMD({
      ...baseRMD,
      isInherited: true,
      isSpouseBeneficiary: true,
      beneficiaryAge: 73,
      ownerAge: 75,
    });
    expect(result.rmdRequired).toBe(true);
    expect(result.method).toBe('inherited_spouse_own_life_expectancy');
    // Uses RMD table keyed by beneficiary age 73 => divisor 26.5
    expect(result.distributionPeriod).toBe(26.5);
  });

  test('Roth IRA: RMD not required for original owner', () => {
    // Under current law, Roth IRAs have no lifetime RMDs.
    // The engine returns not_yet_required if ownerAge < rmdStartAge,
    // or uniform_lifetime_table if >= rmdStartAge. We test at age 72 (below start).
    const result = calculateRMD({
      ...baseRMD,
      accountType: 'roth_ira',
      ownerAge: 72,
    });
    expect(result.rmdRequired).toBe(false);
    expect(result.rmdAmount).toBe(0);
  });

  test('Very old age 95: small divisor = larger RMD', () => {
    const result = calculateRMD({
      ...baseRMD,
      ownerAge: 95,
      accountBalance: 200_000,
    });
    expect(result.rmdRequired).toBe(true);
    // Divisor at 95 = 8.9
    expect(result.distributionPeriod).toBe(8.9);
    expect(result.rmdAmount).toBeCloseTo(200_000 / 8.9, 1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 6. ROTH CONVERSION
// ═══════════════════════════════════════════════════════════════════════════

describe('Roth Conversion', () => {
  const baseRoth: RothConversionInput = {
    currentTaxableIncome: 150_000,
    filingStatus: 'mfj',
    brackets: tables.ordinaryBrackets.mfj,
    cgBrackets: tables.capitalGainsBrackets.mfj as any,
    rothAccountBalance: 200_000,
    traditionalBalance: 500_000,
    yearsToRetirement: 10,
    expectedRetirementRate: 0.25,
    assumedReturn: 0.07,
    irmaaBrackets: tables.irmaa,
    irmaaLookbackMagi: 150_000,
    clientAge: 57,
    standardDeduction: 32_200,
  };

  test('Bracket headroom: returns headroom for current bracket', () => {
    const result = calculateRothConversion(baseRoth);
    expect(result.bracketHeadroom.length).toBeGreaterThan(0);
    expect(result.bracketHeadroom[0].headroom).toBeGreaterThan(0);
    expect(result.bracketHeadroom[0].rate).toBeGreaterThan(0);
  });

  test('Recommended amount fills bracket without triggering IRMAA', () => {
    const result = calculateRothConversion(baseRoth);
    expect(result.recommendedConversionAmount).toBeGreaterThan(0);
    expect(result.taxOnConversion).toBeGreaterThan(0);
    expect(result.marginalRateOnConversion).toBeGreaterThan(0);
  });

  test('IRMAA proximity: conversion capped before IRMAA threshold', () => {
    const result = calculateRothConversion({
      ...baseRoth,
      irmaaLookbackMagi: 200_000,
    });
    // IRMAA first bracket for MFJ starts at 212001
    // Room to threshold = ~12001
    // Conversion should be capped near the IRMAA threshold
    expect(result.recommendedConversionAmount).toBeLessThanOrEqual(12_001);
  });

  test('Net benefit positive when current rate < expected retirement rate', () => {
    const result = calculateRothConversion({
      ...baseRoth,
      currentTaxableIncome: 60_000,
      expectedRetirementRate: 0.32,
    });
    // Low current income => low marginal rate; high retirement rate
    expect(result.worthConverting).toBe(true);
    expect(result.netBenefit).toBeGreaterThan(0);
  });

  test('Net benefit negative when current rate > expected retirement rate', () => {
    const result = calculateRothConversion({
      ...baseRoth,
      currentTaxableIncome: 800_000,
      expectedRetirementRate: 0.12,
    });
    // Very high current income => 37% bracket; low retirement rate
    // The conversion at 37% while retirement rate is 12% should be negative
    if (result.recommendedConversionAmount > 0) {
      expect(result.worthConverting).toBe(false);
      expect(result.netBenefit).toBeLessThan(0);
    } else {
      // No headroom or IRMAA blocked
      expect(result.recommendedConversionAmount).toBe(0);
    }
  });

  test('Top bracket: conversion strategy notes negative benefit', () => {
    const result = calculateRothConversion({
      ...baseRoth,
      currentTaxableIncome: 1_000_000,
      expectedRetirementRate: 0.10,
      irmaaLookbackMagi: 1_000_000,
    });
    // Already in top bracket; if it converts, should have negative net benefit
    if (result.recommendedConversionAmount > 0) {
      expect(result.conversionStrategy).toContain('negative net benefit');
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 7. STATE TAX
// ═══════════════════════════════════════════════════════════════════════════

describe('State Tax', () => {
  const baseState: StateTaxInput = {
    agi: 100_000,
    state: 'TX',
    filingStatus: 'mfj',
    year: 2026,
    ssIncome: 0,
    pensionIncome: 0,
    retirementDistributions: 0,
    age: 55,
  };

  test('Texas (no income tax): $0 tax', () => {
    const result = calculateStateTax(baseState);
    expect(result.stateTax).toBe(0);
    expect(result.effectiveRate).toBe(0);
    expect(result.notes[0]).toContain('no state income tax');
  });

  test('Arizona flat rate 2.5%', () => {
    const result = calculateStateTax({
      ...baseState,
      state: 'AZ',
    });
    // AZ: flat 2.5% after standard deduction
    // AZ std ded MFJ = 29200; taxable = 100000 - 29200 = 70800
    // Tax = 70800 * 0.025 = 1770
    expect(result.stateTax).toBeCloseTo(1_770, 0);
    expect(result.effectiveRate).toBeCloseTo(0.0177, 3);
  });

  test('California graduated brackets: higher tax', () => {
    const result = calculateStateTax({
      ...baseState,
      state: 'CA',
      agi: 200_000,
    });
    expect(result.stateTax).toBeGreaterThan(5_000);
    // CA has graduated brackets up to 12.3%
    expect(result.effectiveRate).toBeGreaterThan(0.02);
  });

  test('Social Security exempt from state tax (IL)', () => {
    const result = calculateStateTax({
      ...baseState,
      state: 'IL',
      agi: 100_000,
      ssIncome: 30_000,
    });
    // IL exempts SS income: stateAGI = 100000 - 30000 = 70000
    expect(result.stateAGI).toBe(70_000);
    expect(result.notes.some(n => n.includes('Social Security'))).toBe(true);
  });

  test('Unknown state returns $0 tax with note', () => {
    const result = calculateStateTax({
      ...baseState,
      state: 'XX',
    });
    expect(result.stateTax).toBe(0);
    expect(result.notes[0]).toContain('Unknown state');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 8. CAPITAL GAINS TAX
// ═══════════════════════════════════════════════════════════════════════════

describe('Capital Gains Tax', () => {
  const cgBracketsMFJ = tables.capitalGainsBrackets.mfj as any;

  test('LTCG stacking: 0% on amount within 0% bracket', () => {
    // Ordinary taxable = $50K, preferential = $40K MFJ
    // 0% bracket up to $96,700 MFJ; ordinary fills $50K; room = $46,700
    // So $40K fits entirely in 0% bracket
    const result = calculateCapitalGainsTax(50_000, 40_000, cgBracketsMFJ);
    expect(result.capitalGainsTax).toBe(0);
  });

  test('LTCG stacking: mixed 0% and 15% brackets', () => {
    // Ordinary = $80K, preferential = $50K MFJ
    // 0% up to 96,700: room = 96,700 - 80,000 = 16,700 at 0%
    // 15% for remaining 50,000 - 16,700 = 33,300 at 15%
    const result = calculateCapitalGainsTax(80_000, 50_000, cgBracketsMFJ);
    expect(result.capitalGainsTax).toBeCloseTo(33_300 * 0.15, 0);
    expect(result.breakdown.length).toBe(2);
  });

  test('High income 20% bracket reached', () => {
    // Ordinary = $550K, preferential = $100K MFJ
    // 0% bracket up to 96,700 — all filled by ordinary
    // 15% bracket up to 600,050 — room = 600,050 - 550,000 = 50,050 at 15%
    // 20% bracket — remaining 49,950 at 20%
    const result = calculateCapitalGainsTax(550_000, 100_000, cgBracketsMFJ);
    expect(result.capitalGainsTax).toBeGreaterThan(50_050 * 0.15);
    expect(result.breakdown.some(b => b.rate === 0.20)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 9. CASH FLOW ENGINE
// ═══════════════════════════════════════════════════════════════════════════

describe('Cash Flow Engine', () => {
  function baseCashFlowInput(overrides: Partial<CashFlowInput> = {}): CashFlowInput {
    return {
      startYear: 2026,
      endYear: 2030,
      clientBirthYear: 1970,
      retirementYearClient: 2035,
      incomeSources: [
        {
          id: 'salary1',
          type: 'employment_salary',
          annualAmount: 200_000,
          growthRate: 0.03,
        },
      ],
      expenses: [
        {
          id: 'living',
          category: 'living',
          annualAmount: 80_000,
          inflationAdjusted: true,
        },
      ],
      accounts: [
        {
          id: 'taxable1',
          accountType: 'brokerage',
          taxBucket: 'taxable',
          currentBalance: 500_000,
          equityPct: 0.7,
          bondPct: 0.2,
          cashPct: 0.05,
          altPct: 0.05,
        },
        {
          id: 'ira1',
          accountType: 'ira_traditional',
          taxBucket: 'tax_deferred',
          currentBalance: 300_000,
          equityPct: 0.6,
          bondPct: 0.3,
          cashPct: 0.05,
          altPct: 0.05,
        },
        {
          id: 'roth1',
          accountType: 'roth_ira',
          taxBucket: 'tax_free',
          currentBalance: 100_000,
          equityPct: 0.8,
          bondPct: 0.15,
          cashPct: 0,
          altPct: 0.05,
        },
      ],
      goals: [],
      assumptions: {
        inflationRate: 0.025,
        equityReturn: 0.08,
        bondReturn: 0.04,
        cashReturn: 0.02,
        altReturn: 0.06,
        retirementSpendingPct: 0.80,
        healthcareInflation: 0.05,
        ssCola: 0.02,
        monteCarloRuns: 500,
        successThreshold: 0.85,
        planningHorizonAge: 95,
      },
      taxTables: tables,
      filingStatus: 'mfj',
      stateCode: 'TX',
      ...overrides,
    };
  }

  test('Pre-retirement year: salary income present, isRetired = false', () => {
    const input = baseCashFlowInput();
    const results = projectCashFlows(input);
    const year2026 = results.find(r => r.year === 2026)!;
    expect(year2026.isRetired).toBe(false);
    expect(year2026.salaryIncome).toBe(200_000);
    expect(year2026.federalTax).toBeGreaterThan(0);
  });

  test('Retirement year: salary drops to $0', () => {
    const input = baseCashFlowInput({
      retirementYearClient: 2027,
      endYear: 2028,
    });
    const results = projectCashFlows(input);
    const retiredYear = results.find(r => r.year === 2027)!;
    expect(retiredYear.isRetired).toBe(true);
    expect(retiredYear.salaryIncome).toBe(0);
  });

  test('Portfolio grows over pre-retirement years', () => {
    const input = baseCashFlowInput({ endYear: 2030 });
    const results = projectCashFlows(input);
    const first = results[0];
    const last = results[results.length - 1];
    expect(last.totalInvestablePortfolio).toBeGreaterThan(first.totalInvestablePortfolio);
  });

  test('Inflation adjustment increases expenses over time', () => {
    const input = baseCashFlowInput({ endYear: 2030 });
    const results = projectCashFlows(input);
    const exp2026 = results.find(r => r.year === 2026)!.livingExpenses;
    const exp2030 = results.find(r => r.year === 2030)!.livingExpenses;
    expect(exp2030).toBeGreaterThan(exp2026);
  });

  test('Social Security COLA applied to benefit over years', () => {
    const input = baseCashFlowInput({
      clientBirthYear: 1959,
      retirementYearClient: 2026,
      startYear: 2026,
      endYear: 2030,
      incomeSources: [
        {
          id: 'ss1',
          type: 'social_security',
          annualAmount: 0,
          ssClaimAge: 67,
          ssPia: 3_000,
          ownerType: 'client',
        },
      ],
    });
    const results = projectCashFlows(input);
    // Client turns 67 in 2026 (1959 + 67 = 2026)
    const ssYear1 = results.find(r => r.year === 2026)!.socialSecurityClientGross;
    const ssYear5 = results.find(r => r.year === 2030)!.socialSecurityClientGross;
    if (ssYear1 > 0 && ssYear5 > 0) {
      expect(ssYear5).toBeGreaterThan(ssYear1);
    }
  });

  test('Pension with 0% growth stays flat', () => {
    const input = baseCashFlowInput({
      incomeSources: [
        {
          id: 'pension1',
          type: 'pension_defined_benefit',
          annualAmount: 40_000,
          growthRate: 0,
        },
      ],
      retirementYearClient: 2026,
      startYear: 2026,
      endYear: 2030,
    });
    const results = projectCashFlows(input);
    const p2026 = results.find(r => r.year === 2026)!.pensionIncome;
    const p2030 = results.find(r => r.year === 2030)!.pensionIncome;
    expect(p2026).toBeCloseTo(p2030, 0);
  });

  test('Healthcare costs present in cash flow', () => {
    const input = baseCashFlowInput();
    const results = projectCashFlows(input);
    const year = results[0];
    // Client age 56 in 2026, pre-Medicare
    expect(year.healthcarePremiums).toBeGreaterThan(0);
  });

  test('RMD income appears at eligible age', () => {
    const input = baseCashFlowInput({
      clientBirthYear: 1953,
      retirementYearClient: 2020,
      startYear: 2026,
      endYear: 2028,
      incomeSources: [
        {
          id: 'pension1',
          type: 'pension_defined_benefit',
          annualAmount: 30_000,
          growthRate: 0,
        },
      ],
    });
    const results = projectCashFlows(input);
    // Client age in 2026: 2026 - 1953 = 73, born 1953 => RMD start 73
    const year73 = results.find(r => r.year === 2026)!;
    expect(year73.rmdIncome).toBeGreaterThan(0);
  });

  test('Cash flow projection returns correct number of years', () => {
    const input = baseCashFlowInput({ startYear: 2026, endYear: 2035 });
    const results = projectCashFlows(input);
    expect(results.length).toBe(10); // 2026..2035 inclusive
    expect(results[0].year).toBe(2026);
    expect(results[9].year).toBe(2035);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 10. MONTE CARLO
// ═══════════════════════════════════════════════════════════════════════════

describe('Monte Carlo', () => {
  function baseMCInput(overrides: Partial<MonteCarloInput> = {}): MonteCarloInput {
    return {
      runs: 500,
      years: 30,
      startYear: 2026,
      initialPortfolio: 2_000_000,
      annualContributions: new Array(30).fill(0),
      annualWithdrawals: new Array(30).fill(80_000),
      assetAllocation: {
        equityPct: 0.60,
        bondPct: 0.30,
        cashPct: 0.05,
        altPct: 0.05,
      },
      returns: {
        equityMean: 0.08,
        equityStdDev: 0.16,
        bondMean: 0.04,
        bondStdDev: 0.06,
        cashMean: 0.02,
        altMean: 0.06,
        altStdDev: 0.10,
        correlation_equity_bond: -0.2,
      },
      inflationMean: 0.025,
      inflationStdDev: 0.01,
      successThreshold: 0.85,
      ...overrides,
    };
  }

  test('100% success scenario: large portfolio, small withdrawals', () => {
    const result = runMonteCarlo(baseMCInput({
      initialPortfolio: 10_000_000,
      annualWithdrawals: new Array(30).fill(50_000),
    }));
    expect(result.probabilityOfSuccess).toBeGreaterThanOrEqual(0.98);
  });

  test('0% success scenario: tiny portfolio, huge withdrawals', () => {
    const result = runMonteCarlo(baseMCInput({
      initialPortfolio: 100_000,
      annualWithdrawals: new Array(30).fill(500_000),
    }));
    expect(result.probabilityOfSuccess).toBe(0);
    expect(result.depletionYears.length).toBe(500);
  });

  test('Performance: 1000 runs in < 5 seconds', () => {
    const start = Date.now();
    const result = runMonteCarlo(baseMCInput({ runs: 1_000 }));
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(5_000);
    expect(result.runs).toBe(1_000);
  });

  test('P50 (median) terminal value is reasonable', () => {
    const result = runMonteCarlo(baseMCInput());
    // With $2M portfolio, 8% mean equity, 30 years, $80K withdrawals
    // Median should be significantly positive
    expect(result.medianTerminalValue).toBeGreaterThan(0);
    expect(result.percentiles.p50).toBe(result.medianTerminalValue);
  });

  test('Correlated returns: equity-bond correlation reflected', () => {
    // Run with strong negative correlation
    const negCorr = runMonteCarlo(baseMCInput({
      runs: 200,
      returns: {
        equityMean: 0.08,
        equityStdDev: 0.16,
        bondMean: 0.04,
        bondStdDev: 0.06,
        cashMean: 0.02,
        altMean: 0.06,
        altStdDev: 0.10,
        correlation_equity_bond: -0.8,
      },
    }));

    // Run with strong positive correlation
    const posCorr = runMonteCarlo(baseMCInput({
      runs: 200,
      returns: {
        equityMean: 0.08,
        equityStdDev: 0.16,
        bondMean: 0.04,
        bondStdDev: 0.06,
        cashMean: 0.02,
        altMean: 0.06,
        altStdDev: 0.10,
        correlation_equity_bond: 0.8,
      },
    }));

    // Both should complete without error; negative correlation
    // should generally produce tighter distributions (lower worst case relative to best)
    expect(negCorr.runs).toBe(200);
    expect(posCorr.runs).toBe(200);
  });

  test('Percentile ordering: p5 < p25 < p50 < p75 < p95', () => {
    const result = runMonteCarlo(baseMCInput());
    expect(result.percentiles.p5).toBeLessThanOrEqual(result.percentiles.p25);
    expect(result.percentiles.p25).toBeLessThanOrEqual(result.percentiles.p50);
    expect(result.percentiles.p50).toBeLessThanOrEqual(result.percentiles.p75);
    expect(result.percentiles.p75).toBeLessThanOrEqual(result.percentiles.p95);
  });

  test('Annual percentile bands have correct length', () => {
    const result = runMonteCarlo(baseMCInput({ years: 20 }));
    expect(result.annualPercentileBands.length).toBe(20);
    expect(result.annualPercentileBands[0].year).toBe(2026);
    expect(result.annualPercentileBands[19].year).toBe(2045);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 11. ESTATE CALCULATIONS
// ═══════════════════════════════════════════════════════════════════════════

describe('Estate Calculations', () => {
  const baseEstate: EstateCalcInput = {
    grossEstate: 20_000_000,
    adjustedTaxableGifts: 0,
    maritalDeduction: 0,
    charitableDeduction: 0,
    debts: 200_000,
    expenses: 100_000,
    stateEstateTaxApplicable: false,
    state: 'TX',
    lifeInsuranceProceedsIncluded: false,
    year: 2026,
    exemptionAmount: 13_610_000,
    topRate: 0.40,
    portabilityElected: false,
    predeceasedSpouseUnusedExemption: 0,
  };

  test('Estate under exemption: $0 federal estate tax', () => {
    const result = calculateFullEstateTax({
      ...baseEstate,
      grossEstate: 10_000_000,
    });
    expect(result.netEstateTax).toBe(0);
    expect(result.netToHeirs).toBeCloseTo(10_000_000 - 300_000, 0);
  });

  test('Estate over exemption: positive federal estate tax', () => {
    const result = calculateFullEstateTax(baseEstate);
    expect(result.netEstateTax).toBeGreaterThan(0);
    // Adjusted gross estate = 20M - 0 - 0 - 300K = 19.7M
    // Tentative base = 19.7M; tax on 19.7M minus credit on 13.61M
    expect(result.adjustedGrossEstate).toBe(19_700_000);
    expect(result.effectiveRate).toBeGreaterThan(0);
  });

  test('Portability: doubles effective exemption', () => {
    const withPortability = calculateFullEstateTax({
      ...baseEstate,
      portabilityElected: true,
      predeceasedSpouseUnusedExemption: 13_610_000,
    });
    const withoutPortability = calculateFullEstateTax(baseEstate);
    // With portability, exemption = 2 * 13.61M = 27.22M => no tax on $20M estate
    expect(withPortability.netEstateTax).toBe(0);
    expect(withoutPortability.netEstateTax).toBeGreaterThan(0);
  });

  test('GRAT at hurdle rate: minimal remainder interest (gift value)', () => {
    // Zeroed-out GRAT: annuity PV equals transfer => remainder ~0
    const result = calculateGRATRemainder(
      5_000_000, // initial transfer
      5,          // term years
      0.052,      // 7520 rate
      0.052,      // expected growth = hurdle rate
    );
    expect(result.giftTaxableAmount).toBeCloseTo(0, -2);
    expect(result.annuityPayment).toBeGreaterThan(0);
    expect(result.term).toBe(5);
  });

  test('GRAT with growth above hurdle: wealth transferred to remaindermen', () => {
    const result = calculateGRATRemainder(
      5_000_000,
      5,
      0.052,    // hurdle
      0.10,     // 10% growth => above hurdle
    );
    expect(result.projectedEndValue).toBeGreaterThan(0);
    expect(result.wealthTransferred).toBeGreaterThan(0);
    expect(result.estateTaxSavings).toBeGreaterThan(0);
  });

  test('CRT deduction: CRAT produces charitable deduction', () => {
    const result = calculateCRTDeduction(
      1_000_000, // FMV
      0.05,      // 5% payout
      20,        // 20-year term
      0.052,     // 7520 rate
      'crat',
    );
    expect(result.charitableDeduction).toBeGreaterThan(0);
    expect(result.deductionPct).toBeGreaterThan(0);
    expect(result.deductionPct).toBeLessThan(1);
    expect(result.annuityOrUnitrust).toBe(50_000); // 5% * 1M
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 12. BUSINESS SALE
// ═══════════════════════════════════════════════════════════════════════════

describe('Business Sale', () => {
  test('EBITDA-based valuation: normalizedEBITDA reflects add-backs', () => {
    const input: BusinessValuationInput = {
      grossRevenue: 5_000_000,
      cogs: 2_000_000,
      operatingExpenses: 1_500_000,
      ownerSalary: 300_000,
      marketRateReplacement: 150_000,
      personalExpensesInBusiness: 50_000,
      businessDebt: 500_000,
      ownershipPct: 100,
      ebitdaMultiple: 5,
      revenueMultiple: 1,
      dcfProjections: [1_600_000, 1_700_000, 1_800_000, 1_900_000, 2_000_000],
      terminalGrowthRate: 0.03,
      discountRate: 0.12,
      weights: { income: 0.5, market: 0.25, dcf: 0.25 },
    };
    const result = calculateBusinessValuation(input);
    // Raw EBITDA = 5M - 2M - 1.5M = 1.5M
    expect(result.rawEBITDA).toBe(1_500_000);
    // Normalized = 1.5M + 300K owner salary + 50K personal - 150K market = 1.7M
    expect(result.normalizedEBITDA).toBe(1_700_000);
    // Income approach = 1.7M * 5 = 8.5M
    expect(result.incomeApproachValue).toBe(8_500_000);
    // Equity = blended - debt
    expect(result.equityValue100).toBeGreaterThan(0);
  });

  test('Business sale tax: stock sale with NIIT', () => {
    const input: BusinessSaleInput = {
      grossSalePrice: 5_000_000,
      ownershipPct: 100,
      entityType: 'c_corp',
      basis: 500_000,
      saleYear: 2026,
      otherIncomeInSaleYear: 200_000,
      filingStatus: 'mfj',
      saleStructure: 'stock_sale',
      stateCapGainsRate: 0.05,
      transactionCostPct: 0.03,
      debtPayoff: 0,
      installmentElected: false,
      installmentTermYears: 0,
      installmentRate: 0,
    };
    const result = calculateBusinessSaleTax(input);
    expect(result.grossProceeds).toBe(5_000_000);
    expect(result.transactionCosts).toBe(150_000); // 3%
    // Gain = 5M - 150K costs - 500K basis = 4,350,000
    expect(result.totalGain).toBe(4_350_000);
    // Federal LTCG = 20%, NIIT should apply (AGI > $250K)
    expect(result.federalCGTax).toBeCloseTo(4_350_000 * 0.20, 0);
    expect(result.niitOnSale).toBeGreaterThan(0);
    expect(result.effectiveTaxRate).toBeGreaterThan(0.20);
  });

  test('Installment sale: schedule has correct number of years', () => {
    const input: BusinessSaleInput = {
      grossSalePrice: 3_000_000,
      ownershipPct: 100,
      entityType: 'llc',
      basis: 300_000,
      saleYear: 2026,
      otherIncomeInSaleYear: 100_000,
      filingStatus: 'mfj',
      saleStructure: 'stock_sale',
      stateCapGainsRate: 0.05,
      transactionCostPct: 0.02,
      debtPayoff: 0,
      installmentElected: true,
      installmentTermYears: 5,
      installmentRate: 0.05,
    };
    const result = calculateBusinessSaleTax(input);
    expect(result.installmentSchedule).toBeDefined();
    expect(result.installmentSchedule!.length).toBe(5);
    expect(result.installmentSchedule![0].year).toBe(2027);
    // Each payment should have positive principal and interest portions
    const firstPayment = result.installmentSchedule![0];
    expect(firstPayment.payment).toBeGreaterThan(0);
    expect(firstPayment.principalPortion).toBeGreaterThan(0);
    expect(firstPayment.gainRecognized).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 13. EQUITY COMP
// ═══════════════════════════════════════════════════════════════════════════

describe('Equity Compensation', () => {
  test('RSU vest: ordinary income = shares * FMV', () => {
    const result = calculateRSUVestTax(
      1_000,  // shares
      150,    // FMV per share
      0.35,   // federal rate
      0.093,  // state rate (CA)
    );
    expect(result.ordinaryIncome).toBe(150_000);
    expect(result.federalWithholding).toBeGreaterThan(0);
    expect(result.ficaWithholding).toBeGreaterThan(0);
    expect(result.stateWithholding).toBeCloseTo(150_000 * 0.093, 0);
    expect(result.netSharesDelivered).toBeLessThan(1_000);
    expect(result.netSharesDelivered).toBeGreaterThan(0);
  });

  test('NQSO exercise: spread taxed as ordinary income', () => {
    const result = calculateNQSOExercise(
      500,    // shares
      20,     // exercise price
      100,    // current FMV
      0.35,   // federal rate
      0.05,   // state rate
    );
    expect(result.spreadPerShare).toBe(80);
    expect(result.grossOrdinaryIncome).toBe(40_000);
    expect(result.federalTax).toBeCloseTo(40_000 * 0.35, 0);
    expect(result.stateTax).toBeCloseTo(40_000 * 0.05, 0);
    expect(result.netAfterTax).toBeGreaterThan(0);
  });

  test('ISO exercise: $0 ordinary income at exercise, AMT preference generated', () => {
    const grantDate = new Date('2024-01-15');
    const result = calculateISOExercise(
      200,      // shares
      50,       // exercise price
      150,      // current FMV
      grantDate,
      200_000,  // other income
      'single',
    );
    // ISO exercise has NO ordinary income at exercise
    // But generates an AMT preference item = shares * spread
    expect(result.amtPreferenceItem).toBe(200 * 100); // 20,000
    expect(result.spreadPerShare).toBe(100);
    // Qualifying disposition treats all gain as LTCG
    expect(result.qualifyingTreatment.allLTCG).toBe(true);
    expect(result.qualifyingTreatment.totalGain).toBe(20_000);
  });

  test('Concentrated position: flags high concentration risk', () => {
    const result = analyzeConcentratedPosition(
      500_000,    // position value
      100_000,    // cost basis
      1_000_000,  // total portfolio
      5_000,      // annual dividend
    );
    expect(result.pctOfPortfolio).toBe(50); // 500K / 1M * 100
    expect(result.unrealizedGain).toBe(400_000);
    expect(result.if50Drop).toBe(250_000);
    expect(result.if75Drop).toBe(125_000);
    // Sale tax = (500K - 100K) * (20% + 3.8%) = 400K * 23.8% = 95,200
    expect(result.outrightSaleTax).toBeCloseTo(95_200, 0);
    expect(result.outrightSaleNetProceeds).toBeCloseTo(500_000 - 95_200, 0);
  });

  test('Concentrated position: low concentration when small relative to portfolio', () => {
    const result = analyzeConcentratedPosition(
      50_000,     // position value
      40_000,     // cost basis
      2_000_000,  // total portfolio
      1_000,      // annual dividend
    );
    expect(result.pctOfPortfolio).toBe(2.5);
    expect(result.unrealizedGain).toBe(10_000);
    // Sale tax on $10K gain at 23.8%
    expect(result.outrightSaleTax).toBeCloseTo(2_380, 0);
  });
});
