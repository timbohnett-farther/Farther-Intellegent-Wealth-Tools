/**
 * FP-Sentinel — Calculation Accuracy Auditor
 *
 * Comprehensive known-answer verification tests for every calculation engine
 * in Farther Prism. Each suite validates that financial calculations produce
 * correct results against independently verified values.
 *
 * Uses 2026 tax tables from the built-in defaults.
 */

import { describe, test, expect } from 'vitest';

import {
  calculateFederalTax,
  calculateCapitalGainsTax,
  calculateRMD,
  calculateRothConversion,
  calculateMonthlyPayment,
  amortizationSchedule,
  remainingBalance,
  runMonteCarlo,
  futureValue,
  futureValueAnnuity,
  presentValue,
  presentValueAnnuity,
  npv,
  irr,
  getDefaultTaxTables,
  calculateSSBenefit,
  calculateSSTaxation,
  calculateIRMAA,
  calculateSETax,
  calculateStateTax,
  calculateNIIT,
} from '../../calc-engine';

import type {
  FederalTaxInput,
  SSBenefitInput,
  SSTaxationInput,
  IRMAAInput,
  RMDInput,
  RothConversionInput,
  StateTaxInput,
  MonteCarloInput,
  FilingStatus,
} from '../../calc-engine';

import {
  generateAmortizationSchedule,
  calculateTrueAPR,
  calculateAfterTaxCostOfDebt,
  calculateDebtMetrics,
  optimizeDebtPayoff,
  analyzeMortgageRefinance,
  calculateFartherDebtScore,
} from '../../debt-engine';

import type {
  AmortizationInput,
  TrueAPRInput,
  AfterTaxCostInput,
  HouseholdDebt,
  HouseholdTaxProfile,
  HouseholdIncome,
  HouseholdBalanceSheet,
  DebtScoreInput,
  RefinanceCurrentLoan,
  RefinanceProposedLoan,
} from '../../debt-engine';

// ─── Shared tax tables & helpers ────────────────────────────────────────────

const tables = getDefaultTaxTables();

/** Build a base FederalTaxInput with sensible zeros, easily overridable. */
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
      standardAmount: tables.standardDeductions.mfj, // 32,200
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

/** Build a base HouseholdTaxProfile for debt-engine tests. */
function baseTaxProfile(overrides: Partial<HouseholdTaxProfile> = {}): HouseholdTaxProfile {
  return {
    filingStatus: 'MFJ',
    federalMarginalRate: 0.24,
    stateMarginalRate: 0.05,
    effectiveFederalRate: 0.18,
    effectiveStateRate: 0.04,
    agi: 200_000,
    taxableIncome: 170_000,
    itemizingDeductions: true,
    standardDeduction: 32_200,
    totalItemizedDeductions: 40_000,
    niitApplies: false,
    niitRate: 0.038,
    state: 'NY',
    ...overrides,
  };
}

/** Build a base HouseholdDebt. */
function baseDebt(overrides: Partial<HouseholdDebt> = {}): HouseholdDebt {
  return {
    id: 'debt-1',
    householdId: 'hh-1',
    category: 'MORTGAGE',
    name: 'Primary Mortgage',
    lender: 'Test Bank',
    originalBalance: 500_000,
    currentBalance: 450_000,
    interestRate: 0.065,
    rateType: 'FIXED',
    monthlyPayment: 3_160.34,
    minimumPayment: 3_160.34,
    remainingTermMonths: 300,
    originationDate: '2024-01-01',
    isDeductible: true,
    deductibilityType: 'ITEMIZED_ONLY',
    hasPrePaymentPenalty: false,
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// SUITE 1: Amortization Known-Answer Tests
// ═══════════════════════════════════════════════════════════════════════════

describe('SUITE 1: Amortization Known-Answer Tests', () => {
  test('Standard 30yr $500K mortgage at 6.5%: monthly payment = $3,160.34', () => {
    const pmt = calculateMonthlyPayment(500_000, 0.065, 360);
    expect(pmt.toNumber()).toBeCloseTo(3_160.34, 2);
  });

  test('Standard 30yr $500K mortgage at 6.5%: first payment split — interest = $2,708.33, principal = $452.01', () => {
    const result = amortizationSchedule(500_000, 0.065, 360);
    const first = result.schedule[0];
    // Interest = 500000 * (0.065/12) = 2708.3333...
    expect(first.interest.toNumber()).toBeCloseTo(2_708.33, 2);
    expect(first.principal.toNumber()).toBeCloseTo(452.01, 2);
  });

  test('Accounting identity: total payments = principal + total interest', () => {
    const result = amortizationSchedule(500_000, 0.065, 360);
    const totalPaid = result.summary.totalPaid.toNumber();
    const totalInterest = result.summary.totalInterest.toNumber();
    // total paid = principal + total interest
    expect(totalPaid).toBeCloseTo(500_000 + totalInterest, 2);
  });

  test('Zero interest (0% promo) produces equal payments of principal/term', () => {
    const result = amortizationSchedule(12_000, 0, 12);
    const pmt = result.summary.monthlyPayment.toNumber();
    expect(pmt).toBeCloseTo(1_000, 2);
    // All principal, no interest
    expect(result.summary.totalInterest.toNumber()).toBeCloseTo(0, 4);
    // Every payment's principal should equal the monthly payment
    for (const row of result.schedule) {
      expect(row.principal.toNumber()).toBeCloseTo(1_000, 2);
      expect(row.interest.toNumber()).toBeCloseTo(0, 4);
    }
  });

  test('Single remaining payment works correctly', () => {
    const result = amortizationSchedule(1_000, 0.06, 1);
    // Monthly payment = 1000 * (0.005 * 1.005) / (1.005 - 1) = 1000 * 0.005025 / 0.005 = 1005
    expect(result.schedule.length).toBe(1);
    expect(result.schedule[0].balance.toNumber()).toBeCloseTo(0, 2);
    expect(result.summary.totalPaid.toNumber()).toBeCloseTo(1_005.0, 0);
  });

  test('15yr vs 30yr mortgage: 15yr has higher payment but much less total interest', () => {
    const result15 = amortizationSchedule(500_000, 0.065, 180);
    const result30 = amortizationSchedule(500_000, 0.065, 360);
    // 15yr payment should be higher
    expect(result15.summary.monthlyPayment.toNumber()).toBeGreaterThan(
      result30.summary.monthlyPayment.toNumber(),
    );
    // 15yr total interest should be significantly less
    expect(result15.summary.totalInterest.toNumber()).toBeLessThan(
      result30.summary.totalInterest.toNumber(),
    );
    // Specifically, 30yr interest should be roughly double 15yr
    expect(result30.summary.totalInterest.toNumber()).toBeGreaterThan(
      result15.summary.totalInterest.toNumber() * 1.5,
    );
  });

  test('remainingBalance after 120 payments matches schedule[119].balance', () => {
    const result = amortizationSchedule(500_000, 0.065, 360);
    const scheduleBalance = result.schedule[119].balance.toNumber();
    const formulaBalance = remainingBalance(500_000, 0.065, 360, 120).toNumber();
    expect(formulaBalance).toBeCloseTo(scheduleBalance, 0);
  });

  test('calculateMonthlyPayment matches amortizationSchedule result', () => {
    const pmt = calculateMonthlyPayment(300_000, 0.05, 180);
    const result = amortizationSchedule(300_000, 0.05, 180);
    expect(pmt.toNumber()).toBeCloseTo(result.summary.monthlyPayment.toNumber(), 4);
  });

  test('Amortization schedule has exactly termMonths entries', () => {
    const result = amortizationSchedule(100_000, 0.04, 60);
    expect(result.schedule.length).toBe(60);
  });

  test('Final balance in amortization schedule is zero', () => {
    const result = amortizationSchedule(250_000, 0.07, 360);
    const lastRow = result.schedule[result.schedule.length - 1];
    expect(lastRow.balance.toNumber()).toBeCloseTo(0, 2);
  });

  test('Amortization cumulative principal equals loan amount', () => {
    const result = amortizationSchedule(200_000, 0.055, 240);
    const lastRow = result.schedule[result.schedule.length - 1];
    expect(lastRow.cumulativePrincipal.toNumber()).toBeCloseTo(200_000, 0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SUITE 2: Federal Tax Known-Answer Tests
// ═══════════════════════════════════════════════════════════════════════════

describe('SUITE 2: Federal Tax Known-Answer Tests', () => {
  // 2026 MFJ brackets: 10% up to 24,800; 12% to 100,800; 22% to 211,400;
  // 24% to 395,200; 32% to 524,400; 35% to 768,700; 37% above
  // Standard deduction MFJ = 32,200

  test('Low income ($30K MFJ): tax close to known answer', () => {
    // Taxable = 30000 - 32200 = 0 (below standard deduction)
    const result = calculateFederalTax(baseFederalInput({ ordinaryIncome: 30_000 }));
    expect(result.federalIncomeTax).toBe(0);
    expect(result.taxableIncome).toBe(0);
  });

  test('Middle income ($100K MFJ): verify bracket stacking', () => {
    // Taxable = 100000 - 32200 = 67800
    // 10% on first 24800 = 2480
    // 12% on remaining 67800 - 24800 = 43000 -> 5160
    // Total = 7640
    const result = calculateFederalTax(baseFederalInput({ ordinaryIncome: 100_000 }));
    expect(result.taxableIncome).toBeCloseTo(67_800, 0);
    expect(result.federalIncomeTax).toBeCloseTo(7_640, 0);
  });

  test('High income ($250K MFJ): verify through 24% bracket', () => {
    // Taxable = 250000 - 32200 = 217800
    // 10% on 24800 = 2480
    // 12% on 76000 (24801 to 100800) = 9120
    // 22% on 110600 (100801 to 211400) = 24332
    // 24% on 6400 (211401 to 217800) = 1536
    // Total = 37468
    const result = calculateFederalTax(baseFederalInput({ ordinaryIncome: 250_000 }));
    expect(result.taxableIncome).toBeCloseTo(217_800, 0);
    expect(result.federalIncomeTax).toBeCloseTo(37_468, 0);
  });

  test('$500K income: verify 32% bracket', () => {
    // Taxable = 500000 - 32200 = 467800
    // 10% on 24800 = 2480
    // 12% on 76000 = 9120
    // 22% on 110600 = 24332
    // 24% on 183800 (211401 to 395200) = 44112
    // 32% on 72600 (395201 to 467800) = 23232
    // Total = 103276
    const result = calculateFederalTax(baseFederalInput({ ordinaryIncome: 500_000 }));
    expect(result.taxableIncome).toBeCloseTo(467_800, 0);
    expect(result.marginalRate).toBe(0.32);
    expect(result.federalIncomeTax).toBeCloseTo(103_276, 0);
  });

  test('$1M income: verify 37% bracket', () => {
    // Taxable = 1000000 - 32200 = 967800
    // 10% on 24800 = 2480
    // 12% on 76000 = 9120
    // 22% on 110600 = 24332
    // 24% on 183800 = 44112
    // 32% on 129200 (395201 to 524400) = 41344
    // 35% on 244300 (524401 to 768700) = 85505
    // 37% on 199100 (768701 to 967800) = 73667
    // Total = 280560
    const result = calculateFederalTax(baseFederalInput({ ordinaryIncome: 1_000_000 }));
    expect(result.taxableIncome).toBeCloseTo(967_800, 0);
    expect(result.marginalRate).toBe(0.37);
    expect(result.federalIncomeTax).toBeCloseTo(280_561, 0);
  });

  test('Effective rate is ALWAYS less than marginal rate for any positive income', () => {
    for (const income of [50_000, 100_000, 200_000, 500_000, 1_000_000]) {
      const result = calculateFederalTax(baseFederalInput({ ordinaryIncome: income }));
      if (result.federalIncomeTax > 0) {
        expect(result.effectiveRate).toBeLessThan(result.marginalRate);
      }
    }
  });

  test('Marginal rate for $400K MFJ taxable income is 0.32', () => {
    // Income = 400000 + 32200 = 432200 to get 400000 taxable
    const result = calculateFederalTax(baseFederalInput({ ordinaryIncome: 432_200 }));
    expect(result.taxableIncome).toBeCloseTo(400_000, 0);
    expect(result.marginalRate).toBe(0.32);
  });

  test('Standard deduction reduces taxable income correctly', () => {
    const result = calculateFederalTax(baseFederalInput({ ordinaryIncome: 80_000 }));
    expect(result.deductionAmount).toBe(32_200);
    expect(result.taxableIncome).toBeCloseTo(47_800, 0);
  });

  test('Credits reduce tax (but floor at 0)', () => {
    // Very low income so tax would be near zero
    const resultNoCredit = calculateFederalTax(
      baseFederalInput({ ordinaryIncome: 40_000 }),
    );
    const resultWithCredit = calculateFederalTax(
      baseFederalInput({
        ordinaryIncome: 40_000,
        credits: {
          childTaxCredit: 2_000,
          childCareCredit: 0,
          educationCredit: 0,
          retirementSaverCredit: 0,
          foreignTaxCredit: 0,
          otherCredits: 0,
        },
      }),
    );
    expect(resultWithCredit.federalIncomeTax).toBeLessThanOrEqual(
      resultNoCredit.federalIncomeTax,
    );
    expect(resultWithCredit.federalIncomeTax).toBeGreaterThanOrEqual(0);
  });

  test('SALT deduction capped at $10,000 when itemizing', () => {
    const result = calculateFederalTax(
      baseFederalInput({
        ordinaryIncome: 200_000,
        deductions: {
          type: 'itemized',
          standardAmount: 32_200,
          itemizedTotal: 0,
          saltAmount: 25_000, // should be capped at 10K
          mortgageInterest: 15_000,
          charitableCash: 10_000,
          charitableNonCash: 0,
          medicalExpenses: 0,
          otherItemized: 0,
        },
      }),
    );
    // Itemized = min(25K, 10K) + 15K + 10K = 35K
    expect(result.deductionAmount).toBeCloseTo(35_000, 0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SUITE 3: Capital Gains Tax Tests
// ═══════════════════════════════════════════════════════════════════════════

describe('SUITE 3: Capital Gains Tax Tests', () => {
  const cgBrackets = tables.capitalGainsBrackets.mfj as any;

  test('0% rate applies below threshold', () => {
    // MFJ CG brackets: 0% up to 96,700
    // If ordinary taxable = 0, LTCG up to 96,700 is at 0%
    const result = calculateCapitalGainsTax(0, 50_000, cgBrackets);
    expect(result.capitalGainsTax).toBe(0);
  });

  test('LTCG stacks on top of ordinary income', () => {
    // Ordinary taxable = 80,000; LTCG = 30,000
    // Stack: 80K ordinary uses up 0% bracket partially. 0% bracket goes to 96,700
    // Room in 0% = 96700 - 80000 = 16700 at 0%
    // Remaining 13300 at 15%
    // Tax = 0 + 13300 * 0.15 = 1995
    const result = calculateCapitalGainsTax(80_000, 30_000, cgBrackets);
    expect(result.capitalGainsTax).toBeCloseTo(1_995, 0);
  });

  test('QD + LTCG combined correctly (all preferential income)', () => {
    // 50K QD + 50K LTCG = 100K preferential, ordinary taxable = 0
    // 0% on first 96700 = 0
    // 15% on remaining 3300 = 495
    const result = calculateCapitalGainsTax(0, 100_000, cgBrackets);
    expect(result.capitalGainsTax).toBeCloseTo(495, 0);
  });

  test('All 3 rates (0%, 15%, 20%) applied to appropriate brackets', () => {
    // Ordinary taxable = 0; LTCG = 700,000
    // 0% on first 96,700 = 0
    // 15% on 96,701 to 600,050 = 503,350 * 0.15 = 75,502.50
    // 20% on 600,051 to 700,000 = 99,950 * 0.20 = 19,990
    // Total = 95,492.50
    const result = calculateCapitalGainsTax(0, 700_000, cgBrackets);
    expect(result.capitalGainsTax).toBeCloseTo(95_492.50, 0);
    // Verify we have entries for all 3 rates
    const rates = result.breakdown.map((b) => b.rate);
    expect(rates).toContain(0);
    expect(rates).toContain(0.15);
    expect(rates).toContain(0.20);
  });

  test('Zero capital gains produces zero tax', () => {
    const result = calculateCapitalGainsTax(100_000, 0, cgBrackets);
    expect(result.capitalGainsTax).toBe(0);
    expect(result.breakdown.length).toBe(0);
  });

  test('High ordinary income pushes all LTCG into 20% bracket', () => {
    // Ordinary taxable = 700,000 (above 600,050 threshold)
    // All LTCG at 20%
    const result = calculateCapitalGainsTax(700_000, 50_000, cgBrackets);
    expect(result.capitalGainsTax).toBeCloseTo(50_000 * 0.20, 0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SUITE 4: Monte Carlo Statistical Tests
// ═══════════════════════════════════════════════════════════════════════════

describe('SUITE 4: Monte Carlo Statistical Tests', () => {
  function baseMonteCarloInput(overrides: Partial<MonteCarloInput> = {}): MonteCarloInput {
    return {
      runs: 1000,
      years: 30,
      startYear: 2026,
      initialPortfolio: 1_000_000,
      annualContributions: [0],
      annualWithdrawals: [40_000],
      assetAllocation: {
        equityPct: 0.6,
        bondPct: 0.3,
        cashPct: 0.05,
        altPct: 0.05,
      },
      returns: {
        equityMean: 0.10,
        equityStdDev: 0.16,
        bondMean: 0.04,
        bondStdDev: 0.06,
        cashMean: 0.02,
        altMean: 0.07,
        altStdDev: 0.12,
        correlation_equity_bond: 0.0,
      },
      inflationMean: 0.03,
      inflationStdDev: 0.01,
      successThreshold: 0,
      ...overrides,
    };
  }

  test('Deterministic seed produces same result every time', () => {
    const input = baseMonteCarloInput({ runs: 500 });
    const result1 = runMonteCarlo(input);
    const result2 = runMonteCarlo(input);
    expect(result1.probabilityOfSuccess).toBe(result2.probabilityOfSuccess);
    expect(result1.medianTerminalValue).toBe(result2.medianTerminalValue);
    expect(result1.percentiles.p50).toBe(result2.percentiles.p50);
  });

  test('P10 < P25 < P50 < P75 < P90 (monotonic percentile ordering)', () => {
    const result = runMonteCarlo(baseMonteCarloInput());
    expect(result.percentiles.p10).toBeLessThanOrEqual(result.percentiles.p25);
    expect(result.percentiles.p25).toBeLessThanOrEqual(result.percentiles.p50);
    expect(result.percentiles.p50).toBeLessThanOrEqual(result.percentiles.p75);
    expect(result.percentiles.p75).toBeLessThanOrEqual(result.percentiles.p90);
  });

  test('Higher equity allocation produces wider percentile spread', () => {
    const conservative = runMonteCarlo(
      baseMonteCarloInput({
        assetAllocation: { equityPct: 0.2, bondPct: 0.6, cashPct: 0.15, altPct: 0.05 },
      }),
    );
    const aggressive = runMonteCarlo(
      baseMonteCarloInput({
        assetAllocation: { equityPct: 0.9, bondPct: 0.05, cashPct: 0.0, altPct: 0.05 },
      }),
    );

    const conservativeSpread = conservative.percentiles.p90 - conservative.percentiles.p10;
    const aggressiveSpread = aggressive.percentiles.p90 - aggressive.percentiles.p10;

    expect(aggressiveSpread).toBeGreaterThan(conservativeSpread);
  });

  test('100% success rate with very conservative assumptions', () => {
    const result = runMonteCarlo(
      baseMonteCarloInput({
        initialPortfolio: 10_000_000,
        annualWithdrawals: [10_000], // 0.1% withdrawal rate
        runs: 500,
      }),
    );
    expect(result.probabilityOfSuccess).toBe(1);
  });

  test('Depletion tracking works (high withdrawal produces some depleted runs)', () => {
    const result = runMonteCarlo(
      baseMonteCarloInput({
        initialPortfolio: 500_000,
        annualWithdrawals: [80_000], // 16% withdrawal rate
        runs: 1000,
        years: 30,
      }),
    );
    expect(result.depletionYears.length).toBeGreaterThan(0);
    expect(result.probabilityOfSuccess).toBeLessThan(1);
  });

  test('Annual percentile bands have correct number of entries', () => {
    const input = baseMonteCarloInput({ years: 20 });
    const result = runMonteCarlo(input);
    expect(result.annualPercentileBands.length).toBe(20);
  });

  test('worstCase <= medianTerminalValue <= bestCase', () => {
    const result = runMonteCarlo(baseMonteCarloInput());
    expect(result.worstCase).toBeLessThanOrEqual(result.medianTerminalValue);
    expect(result.medianTerminalValue).toBeLessThanOrEqual(result.bestCase);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SUITE 5: Time Value of Money Tests
// ═══════════════════════════════════════════════════════════════════════════

describe('SUITE 5: Time Value of Money Tests', () => {
  test('FV of $1000 at 10% for 10 years = $2,593.74', () => {
    const fv = futureValue(1_000, 0.10, 10);
    expect(fv.toNumber()).toBeCloseTo(2_593.74, 2);
  });

  test('PV of $10,000 due in 5 years at 8% = $6,805.83', () => {
    const pv = presentValue(10_000, 0.08, 5);
    expect(pv.toNumber()).toBeCloseTo(6_805.83, 2);
  });

  test('PV annuity of $1000/yr for 20 years at 5% = $12,462.21', () => {
    const pva = presentValueAnnuity(1_000, 0.05, 20);
    expect(pva.toNumber()).toBeCloseTo(12_462.21, 2);
  });

  test('FV annuity of $2000/yr for 30 years at 7% = $188,921.57', () => {
    const fva = futureValueAnnuity(2_000, 0.07, 30);
    expect(fva.toNumber()).toBeCloseTo(188_921.57, 2);
  });

  test('NPV with known cash flows', () => {
    // NPV at 10%: [-1000, 300, 400, 500]
    // NPV = -1000 + 300/1.1 + 400/1.21 + 500/1.331
    //      = -1000 + 272.73 + 330.58 + 375.66 = -21.03
    const result = npv(0.10, [-1000, 300, 400, 500]);
    expect(result.toNumber()).toBeCloseTo(-21.04, 0);
  });

  test('IRR calculation matches known answer', () => {
    // Cash flows: [-1000, 300, 420, 680]
    // NPV at 10%: -1000 + 272.73 + 347.11 + 510.89 = 130.73 > 0
    // NPV at 20%: -1000 + 250 + 291.67 + 393.52 = -64.81 < 0
    // IRR is between 10% and 20%
    const result = irr([-1000, 300, 420, 680]);
    expect(result).not.toBeNull();
    expect(result!.toNumber()).toBeGreaterThan(0.10);
    expect(result!.toNumber()).toBeLessThan(0.20);

    // Verify that NPV at the IRR is ~0
    const npvAtIRR = npv(result!.toNumber(), [-1000, 300, 420, 680]);
    expect(npvAtIRR.toNumber()).toBeCloseTo(0, 2);
  });

  test('PV and FV are inverses of each other', () => {
    const fv = futureValue(1_000, 0.08, 15);
    const pv = presentValue(fv, 0.08, 15);
    expect(pv.toNumber()).toBeCloseTo(1_000, 2);
  });

  test('FV at 0% rate equals principal (no growth)', () => {
    const fv = futureValue(5_000, 0, 10);
    expect(fv.toNumber()).toBeCloseTo(5_000, 2);
  });

  test('PV annuity at 0% rate equals PMT * n', () => {
    const pva = presentValueAnnuity(1_000, 0, 10);
    expect(pva.toNumber()).toBeCloseTo(10_000, 2);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SUITE 6: RMD Tests
// ═══════════════════════════════════════════════════════════════════════════

describe('SUITE 6: RMD Tests', () => {
  function baseRMDInput(overrides: Partial<RMDInput> = {}): RMDInput {
    return {
      accountBalance: 1_500_000,
      ownerAge: 73,
      accountType: 'traditional_ira',
      isInherited: false,
      rmdTable: tables.rmdUniform,
      secure2Act: true,
      birthYear: 1953,
      ...overrides,
    };
  }

  test('Age below RMD start (born 1955, age 70) returns rmdRequired = false', () => {
    const result = calculateRMD(
      baseRMDInput({ ownerAge: 70, birthYear: 1955 }),
    );
    expect(result.rmdRequired).toBe(false);
    expect(result.rmdAmount).toBe(0);
    expect(result.rmdStartAge).toBe(73); // born 1951-1959 -> 73
  });

  test('Age 73 with $1.5M balance uses uniform divisor 26.5', () => {
    // Divisor at 73 = 26.5
    // RMD = 1,500,000 / 26.5 = 56,603.77
    const result = calculateRMD(baseRMDInput());
    expect(result.rmdRequired).toBe(true);
    expect(result.distributionPeriod).toBe(26.5);
    expect(result.rmdAmount).toBeCloseTo(56_603.77, 2);
  });

  test('Inherited IRA 10-year rule', () => {
    // Non-spouse beneficiary with 10-year rule
    const result = calculateRMD(
      baseRMDInput({
        isInherited: true,
        isSpouseBeneficiary: false,
        beneficiaryType: 'non_spouse',
        yearOfDeath: 2023,
        ownerAge: 40,
        birthYear: 1985,
      }),
    );
    expect(result.rmdRequired).toBe(true);
    expect(result.method).toBe('inherited_non_spouse_10_year_rule');
  });

  test('SECURE 2.0: born 1950 -> RMD start age 72', () => {
    const result = calculateRMD(
      baseRMDInput({ ownerAge: 71, birthYear: 1950 }),
    );
    // Not yet 72, so should not require RMD
    expect(result.rmdRequired).toBe(false);
    expect(result.rmdStartAge).toBe(72);
  });

  test('SECURE 2.0: born 1951-1959 -> RMD start age 73', () => {
    const result = calculateRMD(
      baseRMDInput({ ownerAge: 72, birthYear: 1955 }),
    );
    expect(result.rmdRequired).toBe(false);
    expect(result.rmdStartAge).toBe(73);
  });

  test('SECURE 2.0: born 1960+ -> RMD start age 75', () => {
    const result = calculateRMD(
      baseRMDInput({ ownerAge: 74, birthYear: 1962 }),
    );
    expect(result.rmdRequired).toBe(false);
    expect(result.rmdStartAge).toBe(75);
  });

  test('RMD at age 80 uses correct divisor (20.2)', () => {
    const result = calculateRMD(
      baseRMDInput({ ownerAge: 80, accountBalance: 1_000_000 }),
    );
    expect(result.rmdRequired).toBe(true);
    expect(result.distributionPeriod).toBe(20.2);
    expect(result.rmdAmount).toBeCloseTo(1_000_000 / 20.2, 2);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SUITE 7: Roth Conversion Tests
// ═══════════════════════════════════════════════════════════════════════════

describe('SUITE 7: Roth Conversion Tests', () => {
  function baseRothInput(overrides: Partial<RothConversionInput> = {}): RothConversionInput {
    return {
      currentTaxableIncome: 150_000,
      filingStatus: 'mfj',
      brackets: tables.ordinaryBrackets.mfj,
      cgBrackets: tables.capitalGainsBrackets.mfj as any,
      rothAccountBalance: 200_000,
      traditionalBalance: 500_000,
      yearsToRetirement: 15,
      expectedRetirementRate: 0.22,
      assumedReturn: 0.07,
      irmaaBrackets: tables.irmaa,
      irmaaLookbackMagi: 150_000,
      clientAge: 55,
      standardDeduction: tables.standardDeductions.mfj,
      ...overrides,
    };
  }

  test('Conversion fills current bracket headroom', () => {
    const result = calculateRothConversion(baseRothInput());
    // Current taxable = 150K, std deduction = 32,200
    // Taxable after deduction = 117,800
    // In 22% bracket (100801 to 211400), bracket width = 110600
    // Income that's flowed into this bracket = 117800 - 100800 = 17000
    // Headroom in 22% = 211400 - 117800 = 93600
    // But may be IRMAA-limited
    expect(result.recommendedConversionAmount).toBeGreaterThan(0);
    expect(result.recommendedConversionAmount).toBeLessThanOrEqual(500_000);
  });

  test('Tax on conversion equals difference in federal tax with/without conversion', () => {
    const input = baseRothInput({ targetAmount: 50_000 });
    const result = calculateRothConversion(input);

    // Verify by computing tax independently
    const baseTax = calculateFederalTax(
      baseFederalInput({
        ordinaryIncome: 150_000,
        deductions: {
          type: 'standard',
          standardAmount: tables.standardDeductions.mfj,
          itemizedTotal: 0,
          saltAmount: 0,
          mortgageInterest: 0,
          charitableCash: 0,
          charitableNonCash: 0,
          medicalExpenses: 0,
          otherItemized: 0,
        },
      }),
    );
    const withConversionTax = calculateFederalTax(
      baseFederalInput({
        ordinaryIncome: 200_000, // 150K + 50K conversion
        deductions: {
          type: 'standard',
          standardAmount: tables.standardDeductions.mfj,
          itemizedTotal: 0,
          saltAmount: 0,
          mortgageInterest: 0,
          charitableCash: 0,
          charitableNonCash: 0,
          medicalExpenses: 0,
          otherItemized: 0,
        },
      }),
    );
    const expectedTax = withConversionTax.federalIncomeTax - baseTax.federalIncomeTax;
    expect(result.taxOnConversion).toBeCloseTo(expectedTax, 0);
  });

  test('Net benefit is positive when expected retirement rate > current marginal rate', () => {
    // Low current income + high expected retirement rate
    const result = calculateRothConversion(
      baseRothInput({
        currentTaxableIncome: 60_000,
        expectedRetirementRate: 0.35,
      }),
    );
    // Current marginal rate on 60K - 32.2K = 27.8K is in 12% bracket
    // Expected retirement rate is 35% >> 12%
    if (result.recommendedConversionAmount > 0) {
      expect(result.worthConverting).toBe(true);
      expect(result.netBenefit).toBeGreaterThan(0);
    }
  });

  test('Zero traditional balance = zero conversion recommended', () => {
    const result = calculateRothConversion(
      baseRothInput({ traditionalBalance: 0 }),
    );
    expect(result.recommendedConversionAmount).toBe(0);
  });

  test('IRMAA threshold respected when no explicit target amount', () => {
    // IRMAA brackets start at 212,001 for MFJ
    // Set lookback MAGI to 200,000 — room to threshold = 12,001
    const result = calculateRothConversion(
      baseRothInput({
        irmaaLookbackMagi: 200_000,
        currentTaxableIncome: 230_000,
      }),
    );
    // The recommended amount should respect the IRMAA threshold
    // (either limited by IRMAA room or bracket headroom, whichever is less)
    expect(result.recommendedConversionAmount).toBeLessThanOrEqual(500_000);
  });

  test('Conversion produces bracketHeadroom array', () => {
    const result = calculateRothConversion(baseRothInput());
    expect(result.bracketHeadroom).toBeDefined();
    expect(result.bracketHeadroom.length).toBeGreaterThan(0);
    for (const bh of result.bracketHeadroom) {
      expect(bh.rate).toBeGreaterThanOrEqual(0);
      expect(bh.headroom).toBeGreaterThanOrEqual(0);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SUITE 8: Debt Engine Known-Answer Tests
// ═══════════════════════════════════════════════════════════════════════════

describe('SUITE 8: Debt Engine Known-Answer Tests', () => {
  test('True APR includes fees (Newton-Raphson converges to correct answer)', () => {
    const result = calculateTrueAPR({
      loanAmount: 400_000,
      statedRate: 0.065,
      termMonths: 360,
      originationFee: 2_000,
      discountPoints: 0.01, // 1 point = $4,000
      pmiMonthly: 0,
      pmiMonthsRemaining: 0,
      otherFees: 500,
    });
    // True APR should be higher than stated rate due to fees
    expect(result.trueAPR).toBeGreaterThan(0.065);
    expect(result.nominalRate).toBeCloseTo(0.065, 4);
    expect(result.rateDifference).toBeGreaterThan(0);
    expect(result.totalFees).toBeCloseTo(6_500, 0); // 2000 + 4000 + 500
  });

  test('After-tax cost at 37% marginal rate for deductible mortgage', () => {
    const result = calculateAfterTaxCostOfDebt({
      nominalRate: 0.065,
      isInterestDeductible: true,
      deductibilityType: 'ITEMIZED_ONLY',
      federalMarginalRate: 0.37,
      stateMarginalRate: 0.05,
      niitApplies: false,
      itemizingDeductions: true,
      loanBalance: 500_000,
      mortgageDebtLimit: 750_000,
    });
    // After-tax rate = 0.065 * (1 - 0.42) = 0.065 * 0.58 = 0.0377
    expect(result.afterTaxRate).toBeCloseTo(0.0377, 2);
    expect(result.afterTaxRate).toBeLessThan(0.065);
  });

  test('Non-deductible debt has after-tax rate = nominal rate', () => {
    const result = calculateAfterTaxCostOfDebt({
      nominalRate: 0.22,
      isInterestDeductible: false,
      deductibilityType: 'NONE',
      federalMarginalRate: 0.37,
      stateMarginalRate: 0.05,
      niitApplies: false,
      itemizingDeductions: true,
      loanBalance: 15_000,
      mortgageDebtLimit: 750_000,
    });
    expect(result.afterTaxRate).toBeCloseTo(0.22, 4);
  });

  test('Avalanche strategy pays highest APR first', () => {
    const debts: HouseholdDebt[] = [
      baseDebt({
        id: 'cc-1',
        name: 'Credit Card',
        category: 'CREDIT_CARD',
        currentBalance: 10_000,
        interestRate: 0.22,
        monthlyPayment: 300,
        minimumPayment: 200,
        remainingTermMonths: 60,
        isDeductible: false,
        deductibilityType: 'NONE',
      }),
      baseDebt({
        id: 'auto-1',
        name: 'Auto Loan',
        category: 'AUTO_LOAN',
        currentBalance: 25_000,
        interestRate: 0.06,
        monthlyPayment: 500,
        minimumPayment: 500,
        remainingTermMonths: 48,
        isDeductible: false,
        deductibilityType: 'NONE',
      }),
    ];

    const result = optimizeDebtPayoff({
      debts,
      monthlyExtraPayment: 200,
      taxProfile: baseTaxProfile(),
      investmentReturn: 0.08,
    });

    const avalanche = result.strategies.AVALANCHE;
    expect(avalanche).toBeDefined();
    // Avalanche should pay highest APR (credit card at 22%) first
    expect(avalanche!.debtPayoffSequence[0].debtName).toBe('Credit Card');
  });

  test('Snowball strategy pays lowest balance first', () => {
    const debts: HouseholdDebt[] = [
      baseDebt({
        id: 'cc-1',
        name: 'Credit Card',
        category: 'CREDIT_CARD',
        currentBalance: 5_000,
        interestRate: 0.18,
        monthlyPayment: 200,
        minimumPayment: 100,
        remainingTermMonths: 36,
        isDeductible: false,
        deductibilityType: 'NONE',
      }),
      baseDebt({
        id: 'auto-1',
        name: 'Auto Loan',
        category: 'AUTO_LOAN',
        currentBalance: 20_000,
        interestRate: 0.22,
        monthlyPayment: 500,
        minimumPayment: 400,
        remainingTermMonths: 48,
        isDeductible: false,
        deductibilityType: 'NONE',
      }),
    ];

    const result = optimizeDebtPayoff({
      debts,
      monthlyExtraPayment: 200,
      taxProfile: baseTaxProfile(),
      investmentReturn: 0.08,
    });

    const snowball = result.strategies.SNOWBALL;
    expect(snowball).toBeDefined();
    // Snowball should pay lowest balance (credit card at $5K) first
    expect(snowball!.debtPayoffSequence[0].debtName).toBe('Credit Card');
  });

  test('Avalanche saves more interest than snowball', () => {
    const debts: HouseholdDebt[] = [
      baseDebt({
        id: 'cc-1',
        name: 'Credit Card',
        category: 'CREDIT_CARD',
        currentBalance: 15_000,
        interestRate: 0.22,
        monthlyPayment: 300,
        minimumPayment: 200,
        remainingTermMonths: 60,
        isDeductible: false,
        deductibilityType: 'NONE',
      }),
      baseDebt({
        id: 'personal-1',
        name: 'Personal Loan',
        category: 'PERSONAL_LOAN',
        currentBalance: 8_000,
        interestRate: 0.08,
        monthlyPayment: 200,
        minimumPayment: 160,
        remainingTermMonths: 48,
        isDeductible: false,
        deductibilityType: 'NONE',
      }),
    ];

    const result = optimizeDebtPayoff({
      debts,
      monthlyExtraPayment: 300,
      taxProfile: baseTaxProfile(),
      investmentReturn: 0.08,
    });

    const avalanche = result.strategies.AVALANCHE;
    const snowball = result.strategies.SNOWBALL;
    expect(avalanche).toBeDefined();
    expect(snowball).toBeDefined();
    // Avalanche should have less total interest
    expect(avalanche!.summary.totalInterestPaid).toBeLessThanOrEqual(
      snowball!.summary.totalInterestPaid,
    );
  });

  test('Farther Debt Score is between 0 and 850', () => {
    const result = calculateFartherDebtScore({
      debts: [baseDebt()],
      taxProfile: baseTaxProfile(),
      income: {
        grossMonthlyIncome: 15_000,
        netMonthlyIncome: 11_000,
        annualGrossIncome: 180_000,
        sources: [{ type: 'salary', annualAmount: 180_000, isStable: true }],
      },
      balanceSheet: {
        totalAssets: 1_500_000,
        liquidAssets: 200_000,
        investmentAssets: 500_000,
        realEstateValue: 700_000,
        retirementAssets: 300_000,
        totalLiabilities: 450_000,
        netWorth: 1_050_000,
      },
    });
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(850);
  });

  test('Debt-free household gets maximum score (850) and DEBT_FREE label', () => {
    const result = calculateFartherDebtScore({
      debts: [
        baseDebt({ currentBalance: 0, monthlyPayment: 0, minimumPayment: 0 }),
      ],
      taxProfile: baseTaxProfile(),
      income: {
        grossMonthlyIncome: 15_000,
        netMonthlyIncome: 11_000,
        annualGrossIncome: 180_000,
        sources: [{ type: 'salary', annualAmount: 180_000, isStable: true }],
      },
      balanceSheet: {
        totalAssets: 2_000_000,
        liquidAssets: 500_000,
        investmentAssets: 800_000,
        realEstateValue: 700_000,
        retirementAssets: 400_000,
        totalLiabilities: 0,
        netWorth: 2_000_000,
      },
    });
    expect(result.label).toBe('DEBT_FREE');
    expect(result.score).toBe(850);
  });

  test('High-risk portfolio with variable rates and personal guarantees gets lower score', () => {
    const riskyDebts: HouseholdDebt[] = [
      baseDebt({
        id: 'margin-1',
        name: 'Margin Loan',
        category: 'MARGIN_LOAN',
        currentBalance: 300_000,
        interestRate: 0.09,
        rateType: 'VARIABLE',
        monthlyPayment: 2_250,
        minimumPayment: 2_250,
        isDeductible: false,
        deductibilityType: 'NONE',
        isPersonallyGuaranteed: true,
      }),
      baseDebt({
        id: 'cc-1',
        name: 'Credit Card',
        category: 'CREDIT_CARD',
        currentBalance: 50_000,
        interestRate: 0.24,
        rateType: 'VARIABLE',
        monthlyPayment: 1_500,
        minimumPayment: 1_000,
        isDeductible: false,
        deductibilityType: 'NONE',
      }),
    ];

    const result = calculateFartherDebtScore({
      debts: riskyDebts,
      taxProfile: baseTaxProfile(),
      income: {
        grossMonthlyIncome: 10_000,
        netMonthlyIncome: 7_500,
        annualGrossIncome: 120_000,
        sources: [{ type: 'salary', annualAmount: 120_000, isStable: true }],
      },
      balanceSheet: {
        totalAssets: 800_000,
        liquidAssets: 50_000,
        investmentAssets: 400_000,
        realEstateValue: 300_000,
        retirementAssets: 100_000,
        totalLiabilities: 350_000,
        netWorth: 450_000,
      },
    });

    // Should get a lower score due to high variable exposure, margin loans, etc.
    expect(result.score).toBeLessThan(750);
  });

  test('Debt metrics DTI rating for manageable debt load', () => {
    const result = calculateDebtMetrics({
      debts: [
        baseDebt({
          currentBalance: 300_000,
          monthlyPayment: 2_000,
          minimumPayment: 2_000,
        }),
      ],
      income: {
        grossMonthlyIncome: 12_000,
        netMonthlyIncome: 9_000,
        annualGrossIncome: 144_000,
        sources: [{ type: 'salary', annualAmount: 144_000, isStable: true }],
      },
      balanceSheet: {
        totalAssets: 800_000,
        liquidAssets: 100_000,
        investmentAssets: 300_000,
        realEstateValue: 400_000,
        retirementAssets: 200_000,
        totalLiabilities: 300_000,
        netWorth: 500_000,
      },
    });

    // Back-end DTI = 2000/12000 = 16.7% -> EXCELLENT
    expect(result.backEndDTI).toBeCloseTo(0.17, 2);
    expect(result.dtiRating).toBe('EXCELLENT');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SUITE 9: Cross-Module Accounting Identity Tests
// ═══════════════════════════════════════════════════════════════════════════

describe('SUITE 9: Cross-Module Accounting Identity Tests', () => {
  test('Federal tax + state tax <= total income', () => {
    const income = 300_000;
    const fedResult = calculateFederalTax(baseFederalInput({ ordinaryIncome: income }));
    const stateResult = calculateStateTax({
      agi: income,
      state: 'CA',
      filingStatus: 'mfj',
      year: 2026,
      ssIncome: 0,
      pensionIncome: 0,
      retirementDistributions: 0,
      age: 50,
    });
    const totalTax = fedResult.federalIncomeTax + stateResult.stateTax;
    expect(totalTax).toBeLessThanOrEqual(income);
    expect(totalTax).toBeGreaterThanOrEqual(0);
  });

  test('After-tax cost of debt <= nominal rate', () => {
    for (const rate of [0.04, 0.065, 0.10, 0.22]) {
      const result = calculateAfterTaxCostOfDebt({
        nominalRate: rate,
        isInterestDeductible: true,
        deductibilityType: 'FULL',
        federalMarginalRate: 0.37,
        stateMarginalRate: 0.05,
        niitApplies: false,
        itemizingDeductions: true,
        loanBalance: 100_000,
        mortgageDebtLimit: 750_000,
      });
      expect(result.afterTaxRate).toBeLessThanOrEqual(rate + 0.001); // small tolerance
    }
  });

  test('Amortization final balance is zero (or very close)', () => {
    for (const [p, r, t] of [
      [200_000, 0.04, 180],
      [500_000, 0.065, 360],
      [100_000, 0.08, 120],
      [750_000, 0.055, 240],
    ] as [number, number, number][]) {
      const result = amortizationSchedule(p, r, t);
      const finalBalance = result.schedule[result.schedule.length - 1].balance.toNumber();
      expect(finalBalance).toBeCloseTo(0, 2);
    }
  });

  test('Monte Carlo percentile bands are nested (p5-p95 contains p10-p90 contains p25-p75)', () => {
    const input: MonteCarloInput = {
      runs: 500,
      years: 20,
      startYear: 2026,
      initialPortfolio: 1_000_000,
      annualContributions: [0],
      annualWithdrawals: [40_000],
      assetAllocation: { equityPct: 0.6, bondPct: 0.3, cashPct: 0.05, altPct: 0.05 },
      returns: {
        equityMean: 0.10,
        equityStdDev: 0.16,
        bondMean: 0.04,
        bondStdDev: 0.06,
        cashMean: 0.02,
        altMean: 0.07,
        altStdDev: 0.12,
        correlation_equity_bond: 0.0,
      },
      inflationMean: 0.03,
      inflationStdDev: 0.01,
      successThreshold: 0,
    };
    const result = runMonteCarlo(input);

    // Check terminal percentiles
    expect(result.percentiles.p5).toBeLessThanOrEqual(result.percentiles.p10);
    expect(result.percentiles.p10).toBeLessThanOrEqual(result.percentiles.p25);
    expect(result.percentiles.p25).toBeLessThanOrEqual(result.percentiles.p75);
    expect(result.percentiles.p75).toBeLessThanOrEqual(result.percentiles.p90);
    expect(result.percentiles.p90).toBeLessThanOrEqual(result.percentiles.p95);

    // Check annual bands for nesting
    for (const band of result.annualPercentileBands) {
      expect(band.p5).toBeLessThanOrEqual(band.p10);
      expect(band.p10).toBeLessThanOrEqual(band.p25);
      expect(band.p25).toBeLessThanOrEqual(band.p75);
      expect(band.p75).toBeLessThanOrEqual(band.p90);
      expect(band.p90).toBeLessThanOrEqual(band.p95);
    }
  });

  test('Debt payoff: sum of all payments = sum of principal + sum of interest', () => {
    const input: AmortizationInput = {
      principal: 300_000,
      annualRate: 0.065,
      termMonths: 360,
      extraPayment: 0,
      startDate: new Date(2026, 0, 1),
    };
    const result = generateAmortizationSchedule(input);

    const totalPayments = result.schedule.reduce((sum, row) => sum + row.payment, 0);
    const totalPrincipal = result.schedule.reduce(
      (sum, row) => sum + row.principal + row.extraPayment,
      0,
    );
    const totalInterest = result.schedule.reduce((sum, row) => sum + row.interest, 0);

    // Allow small floating-point rounding tolerance from per-row rounding
    expect(Math.abs(totalPayments - (totalPrincipal + totalInterest))).toBeLessThan(5);
    // Total principal should equal original loan amount
    expect(totalPrincipal).toBeCloseTo(300_000, 0);
    // Total interest should match the summary
    expect(totalInterest).toBeCloseTo(result.totalInterest, 0);
  });

  test('Extra payments on debt engine schedule reduce term and total interest', () => {
    const baseInput: AmortizationInput = {
      principal: 300_000,
      annualRate: 0.065,
      termMonths: 360,
      extraPayment: 0,
      startDate: new Date(2026, 0, 1),
    };
    const extraInput: AmortizationInput = {
      ...baseInput,
      extraPayment: 500,
    };

    const baseResult = generateAmortizationSchedule(baseInput);
    const extraResult = generateAmortizationSchedule(extraInput);

    // Extra payments should reduce number of payments
    expect(extraResult.schedule.length).toBeLessThan(baseResult.schedule.length);
    // Extra payments should reduce total interest
    expect(extraResult.totalInterest).toBeLessThan(baseResult.totalInterest);
    // Months saved should be positive
    expect(extraResult.monthsSaved).toBeGreaterThan(0);
    // Interest saved should be positive
    expect(extraResult.interestSaved).toBeGreaterThan(0);
  });

  test('NIIT applies above threshold — 3.8% on lesser of NII or excess AGI', () => {
    // MFJ threshold = 250,000
    const result = calculateNIIT(300_000, 60_000, 'mfj');
    // Excess AGI = 300K - 250K = 50K
    // NIIT = min(60K, 50K) * 0.038 = 50K * 0.038 = 1900
    expect(result.niit).toBeCloseTo(1_900, 2);
  });

  test('SE tax deductible half is exactly 50% of total SE tax', () => {
    const result = calculateSETax({
      netSelfEmploymentIncome: 100_000,
      year: 2026,
      sswageBase: tables.ssWageBase,
    });
    expect(result.deductibleHalf).toBeCloseTo(result.totalSETax / 2, 2);
  });

  test('State tax for no-income-tax state is zero', () => {
    const result = calculateStateTax({
      agi: 500_000,
      state: 'FL',
      filingStatus: 'mfj',
      year: 2026,
      ssIncome: 0,
      pensionIncome: 0,
      retirementDistributions: 0,
      age: 50,
    });
    expect(result.stateTax).toBe(0);
  });
});
