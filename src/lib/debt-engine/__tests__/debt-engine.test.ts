/**
 * FP-DebtIQ Comprehensive Debt Engine Test Suite
 *
 * Covers all calculation modules: universal, mortgage, student loan,
 * credit card, securities lending, auto loan, business debt, and
 * the Farther Debt Score.
 */
import { describe, it, expect } from 'vitest';

import {
  generateAmortizationSchedule,
  calculateTrueAPR,
  calculateAfterTaxCostOfDebt,
  calculateDebtMetrics,
  optimizeDebtPayoff,
} from '../universal/calculations';

import {
  analyzeMortgageRefinance,
  analyzeHomeEquity,
  analyzeMortgageVsInvest,
  analyzePMIElimination,
} from '../mortgage/calculations';

import {
  optimizeStudentLoanRepayment,
  optimizeStudentLoanTax,
} from '../student-loan/calculations';

import {
  optimizeCreditCardDebt,
  analyzeDebtConsolidation,
} from '../credit-card/calculations';

import {
  analyzeSecuritiesBackedLending,
  analyzeMarginLoan,
} from '../securities-lending/calculations';

import { analyzeAutoLoan } from '../auto-loan/calculations';

import {
  analyzeBusinessDebt,
  calculateFartherDebtScore,
} from '../debt-score/calculations';

import type {
  HouseholdDebt,
  HouseholdTaxProfile,
  HouseholdIncome,
  HouseholdBalanceSheet,
  AmortizationInput,
  TrueAPRInput,
  AfterTaxCostInput,
  StudentLoanProfile,
  CreditCard,
  BalanceTransferOffer,
  ConsolidationOption,
  SBLOCInput,
  MarginLoanInput,
  AutoLoanInput,
  BusinessDebtInput,
  DebtScoreInput,
  RefinanceCurrentLoan,
  RefinanceProposedLoan,
  HomeEquityInput,
  MortgageVsInvestInput,
  PMIInput,
} from '../types';

// =====================================================================
// Fixture Factories
// =====================================================================

function makeTaxProfile(overrides: Partial<HouseholdTaxProfile> = {}): HouseholdTaxProfile {
  return {
    filingStatus: 'MFJ',
    federalMarginalRate: 0.32,
    stateMarginalRate: 0.05,
    effectiveFederalRate: 0.22,
    effectiveStateRate: 0.04,
    agi: 350000,
    taxableIncome: 300000,
    itemizingDeductions: true,
    standardDeduction: 29200,
    totalItemizedDeductions: 45000,
    niitApplies: false,
    niitRate: 0.038,
    state: 'CA',
    ...overrides,
  };
}

function makeIncome(overrides: Partial<HouseholdIncome> = {}): HouseholdIncome {
  return {
    grossMonthlyIncome: 25000,
    netMonthlyIncome: 18000,
    annualGrossIncome: 300000,
    sources: [
      { type: 'salary', annualAmount: 250000, isStable: true },
      { type: 'bonus', annualAmount: 50000, isStable: false },
    ],
    ...overrides,
  };
}

function makeBalanceSheet(overrides: Partial<HouseholdBalanceSheet> = {}): HouseholdBalanceSheet {
  return {
    totalAssets: 2000000,
    liquidAssets: 300000,
    investmentAssets: 800000,
    realEstateValue: 700000,
    retirementAssets: 400000,
    totalLiabilities: 500000,
    netWorth: 1500000,
    ...overrides,
  };
}

function makeDebt(overrides: Partial<HouseholdDebt> = {}): HouseholdDebt {
  return {
    id: 'debt-1',
    householdId: 'hh-1',
    category: 'MORTGAGE',
    name: 'Primary Mortgage',
    lender: 'Bank of Test',
    originalBalance: 500000,
    currentBalance: 400000,
    interestRate: 0.065,
    rateType: 'FIXED',
    monthlyPayment: 3161,
    minimumPayment: 3161,
    remainingTermMonths: 300,
    originationDate: '2020-01-01',
    isDeductible: true,
    deductibilityType: 'ITEMIZED_ONLY',
    hasPrePaymentPenalty: false,
    ...overrides,
  };
}

function makeCreditCard(overrides: Partial<CreditCard> = {}): CreditCard {
  return {
    id: 'cc-1',
    issuer: 'Chase',
    balance: 5000,
    apr: 0.2199,
    creditLimit: 15000,
    minimumPayment: 150,
    promoPeriod: null,
    ...overrides,
  };
}

function makeStudentLoanProfile(overrides: Partial<StudentLoanProfile> = {}): StudentLoanProfile {
  return {
    loans: [
      {
        id: 'sl-1',
        type: 'DIRECT_UNSUBSIDIZED',
        balance: 50000,
        interestRate: 0.06,
        disbursementDate: '2018-09-01',
        isConsolidated: false,
      },
    ],
    agi: 80000,
    agiGrowthRate: 0.03,
    familySize: 1,
    stateOfResidence: 'NY',
    filingStatus: 'SINGLE',
    employerType: 'FOR_PROFIT',
    isPSLFEligible: false,
    pslfQualifyingPaymentsMade: 0,
    expectedAgiChanges: [],
    planningToMarry: false,
    spouseAgi: null,
    expectedFamilySizeChanges: [],
    ...overrides,
  };
}

// =====================================================================
// Category 1: Universal Calculations (>= 20 tests)
// =====================================================================

describe('Universal Calculations', () => {
  // -----------------------------------------------------------------
  // generateAmortizationSchedule
  // -----------------------------------------------------------------
  describe('generateAmortizationSchedule', () => {
    it('should produce 360 payments for a 30yr mortgage with no extra', () => {
      const input: AmortizationInput = {
        principal: 400000,
        annualRate: 0.065,
        termMonths: 360,
        extraPayment: 0,
        startDate: new Date('2024-01-01'),
      };
      const result = generateAmortizationSchedule(input);
      expect(result.schedule.length).toBe(360);
      expect(result.monthsSaved).toBe(0);
      expect(result.interestSaved).toBeCloseTo(0, 0);
      expect(result.schedule[result.schedule.length - 1].balance).toBeCloseTo(0, 0);
    });

    it('should reduce payoff time with extra payments', () => {
      const input: AmortizationInput = {
        principal: 400000,
        annualRate: 0.065,
        termMonths: 360,
        extraPayment: 500,
        startDate: new Date('2024-01-01'),
      };
      const result = generateAmortizationSchedule(input);
      expect(result.schedule.length).toBeLessThan(360);
      expect(result.monthsSaved).toBeGreaterThan(0);
    });

    it('should calculate positive interestSaved with extra payments', () => {
      const input: AmortizationInput = {
        principal: 400000,
        annualRate: 0.065,
        termMonths: 360,
        extraPayment: 500,
        startDate: new Date('2024-01-01'),
      };
      const result = generateAmortizationSchedule(input);
      expect(result.interestSaved).toBeGreaterThan(0);
    });

    it('should handle zero principal gracefully', () => {
      const input: AmortizationInput = {
        principal: 0,
        annualRate: 0.065,
        termMonths: 360,
        extraPayment: 0,
        startDate: new Date('2024-01-01'),
      };
      const result = generateAmortizationSchedule(input);
      expect(result.schedule.length).toBe(0);
      expect(result.totalInterest).toBe(0);
      expect(result.totalPaid).toBe(0);
    });

    it('should end with zero balance', () => {
      const input: AmortizationInput = {
        principal: 200000,
        annualRate: 0.05,
        termMonths: 180,
        extraPayment: 200,
        startDate: new Date('2024-06-01'),
      };
      const result = generateAmortizationSchedule(input);
      const lastRow = result.schedule[result.schedule.length - 1];
      expect(lastRow.balance).toBeCloseTo(0, 0);
    });

    it('should have monotonically decreasing balance', () => {
      const input: AmortizationInput = {
        principal: 300000,
        annualRate: 0.06,
        termMonths: 360,
        extraPayment: 0,
        startDate: new Date('2024-01-01'),
      };
      const result = generateAmortizationSchedule(input);
      for (let i = 1; i < result.schedule.length; i++) {
        expect(result.schedule[i].balance).toBeLessThanOrEqual(result.schedule[i - 1].balance);
      }
    });
  });

  // -----------------------------------------------------------------
  // calculateTrueAPR
  // -----------------------------------------------------------------
  describe('calculateTrueAPR', () => {
    it('should compute totalFees and rateDifference when fees are present', () => {
      const input: TrueAPRInput = {
        loanAmount: 100000,
        statedRate: 0.065,
        termMonths: 60,
        originationFee: 2000,
        discountPoints: 0,
        pmiMonthly: 0,
        pmiMonthsRemaining: 0,
        otherFees: 500,
      };
      const result = calculateTrueAPR(input);
      expect(result.totalFees).toBeCloseTo(2500, 0);
      expect(result.nominalRate).toBeCloseTo(0.065, 1);
      expect(result.feeAsMonthlyRate).toBeGreaterThan(0);
    });

    it('should include discount points in totalFees and calculate breakEvenMonths', () => {
      const input: TrueAPRInput = {
        loanAmount: 400000,
        statedRate: 0.06,
        termMonths: 360,
        originationFee: 0,
        discountPoints: 0.01,
        pmiMonthly: 0,
        pmiMonthsRemaining: 0,
        otherFees: 0,
      };
      const result = calculateTrueAPR(input);
      expect(result.totalFees).toBeCloseTo(4000, 0);
      expect(result.breakEvenMonths).toBeGreaterThan(0);
    });

    it('should return zero rateDifference with no fees', () => {
      const input: TrueAPRInput = {
        loanAmount: 300000,
        statedRate: 0.07,
        termMonths: 360,
        originationFee: 0,
        discountPoints: 0,
        pmiMonthly: 0,
        pmiMonthsRemaining: 0,
        otherFees: 0,
      };
      const result = calculateTrueAPR(input);
      expect(result.rateDifference).toBeCloseTo(0, 3);
      expect(result.trueAPR).toBeCloseTo(0.07, 3);
    });

    it('should include PMI in totalFees calculation', () => {
      const withoutPMI: TrueAPRInput = {
        loanAmount: 100000,
        statedRate: 0.065,
        termMonths: 60,
        originationFee: 0,
        discountPoints: 0,
        pmiMonthly: 0,
        pmiMonthsRemaining: 0,
        otherFees: 0,
      };
      const withPMI: TrueAPRInput = {
        ...withoutPMI,
        pmiMonthly: 100,
        pmiMonthsRemaining: 36,
      };
      const resultNoPMI = calculateTrueAPR(withoutPMI);
      const resultPMI = calculateTrueAPR(withPMI);
      // PMI adds 100 * 36 = 3600 to total fees
      expect(resultPMI.totalFees).toBeCloseTo(3600, 0);
      expect(resultPMI.totalFees).toBeGreaterThan(resultNoPMI.totalFees);
    });
  });

  // -----------------------------------------------------------------
  // calculateAfterTaxCostOfDebt
  // -----------------------------------------------------------------
  describe('calculateAfterTaxCostOfDebt', () => {
    it('should reduce effective rate for deductible mortgage (itemizing)', () => {
      const input: AfterTaxCostInput = {
        nominalRate: 0.065,
        isInterestDeductible: true,
        deductibilityType: 'ITEMIZED_ONLY',
        federalMarginalRate: 0.32,
        stateMarginalRate: 0.05,
        niitApplies: false,
        itemizingDeductions: true,
        loanBalance: 400000,
        mortgageDebtLimit: 750000,
      };
      const result = calculateAfterTaxCostOfDebt(input);
      expect(result.afterTaxRate).toBeLessThan(0.065);
      expect(result.taxBenefit).toBeGreaterThan(0);
      expect(result.taxBenefitPV).toBeGreaterThan(0);
    });

    it('should not reduce rate for non-deductible debt', () => {
      const input: AfterTaxCostInput = {
        nominalRate: 0.22,
        isInterestDeductible: false,
        deductibilityType: 'NONE',
        federalMarginalRate: 0.32,
        stateMarginalRate: 0.05,
        niitApplies: false,
        itemizingDeductions: true,
        loanBalance: 5000,
        mortgageDebtLimit: 750000,
      };
      const result = calculateAfterTaxCostOfDebt(input);
      expect(result.afterTaxRate).toBeCloseTo(0.22, 4);
      expect(result.taxBenefit).toBeCloseTo(0, 2);
    });

    it('should apply 50% deductibility for PHASE_OUT type', () => {
      const input: AfterTaxCostInput = {
        nominalRate: 0.06,
        isInterestDeductible: true,
        deductibilityType: 'PHASE_OUT',
        federalMarginalRate: 0.24,
        stateMarginalRate: 0.05,
        niitApplies: false,
        itemizingDeductions: true,
        loanBalance: 50000,
        mortgageDebtLimit: 750000,
      };
      const result = calculateAfterTaxCostOfDebt(input);
      // PHASE_OUT applies 50% deductibility; combined marginal is 29%
      // After-tax rate = 0.06 * (1 - 0.29 * 0.5) = 0.06 * 0.855 = 0.0513
      // Decimal.js rounds to 2 d.p. -> 0.05
      expect(result.afterTaxRate).toBeLessThan(0.06);
      expect(result.afterTaxRate).toBeGreaterThan(0.04);
    });

    it('should produce higher tax benefit for high bracket vs low bracket', () => {
      const baseInput: AfterTaxCostInput = {
        nominalRate: 0.065,
        isInterestDeductible: true,
        deductibilityType: 'FULL',
        stateMarginalRate: 0.05,
        niitApplies: false,
        itemizingDeductions: true,
        loanBalance: 400000,
        mortgageDebtLimit: 750000,
        federalMarginalRate: 0,
      };
      const highBracket = calculateAfterTaxCostOfDebt({
        ...baseInput,
        federalMarginalRate: 0.37,
      });
      const lowBracket = calculateAfterTaxCostOfDebt({
        ...baseInput,
        federalMarginalRate: 0.12,
      });
      expect(highBracket.taxBenefit).toBeGreaterThan(lowBracket.taxBenefit);
      expect(highBracket.afterTaxRate).toBeLessThan(lowBracket.afterTaxRate);
    });
  });

  // -----------------------------------------------------------------
  // calculateDebtMetrics
  // -----------------------------------------------------------------
  describe('calculateDebtMetrics', () => {
    it('should report EXCELLENT DTI for low debt ratios', () => {
      const debts = [
        makeDebt({ monthlyPayment: 2000, minimumPayment: 2000, category: 'MORTGAGE' }),
      ];
      const income = makeIncome({ grossMonthlyIncome: 25000 });
      const bs = makeBalanceSheet();
      const result = calculateDebtMetrics({ debts, income, balanceSheet: bs });
      // 2000/25000 = 8% back-end DTI -> EXCELLENT
      expect(result.dtiRating).toBe('EXCELLENT');
      expect(result.backEndDTI).toBeCloseTo(0.08, 2);
    });

    it('should report CONCERNING DTI for high ratios', () => {
      const debts = [
        makeDebt({ monthlyPayment: 10000, minimumPayment: 10000, category: 'MORTGAGE' }),
      ];
      const income = makeIncome({ grossMonthlyIncome: 25000 });
      const bs = makeBalanceSheet();
      const result = calculateDebtMetrics({ debts, income, balanceSheet: bs });
      // 10000/25000 = 40% back-end DTI -> CONCERNING
      expect(result.dtiRating).toBe('CONCERNING');
    });

    it('should report CRITICAL DTI when back-end exceeds 43%', () => {
      const debts = [
        makeDebt({ monthlyPayment: 12000, minimumPayment: 12000, category: 'MORTGAGE' }),
      ];
      const income = makeIncome({ grossMonthlyIncome: 25000 });
      const bs = makeBalanceSheet();
      const result = calculateDebtMetrics({ debts, income, balanceSheet: bs });
      // 12000/25000 = 48% -> CRITICAL
      expect(result.dtiRating).toBe('CRITICAL');
    });

    it('should compute liquidity ratio as liquid assets / total payments', () => {
      const debts = [
        makeDebt({ monthlyPayment: 3000, minimumPayment: 3000, category: 'MORTGAGE' }),
      ];
      const income = makeIncome({ grossMonthlyIncome: 25000 });
      const bs = makeBalanceSheet({ liquidAssets: 90000 });
      const result = calculateDebtMetrics({ debts, income, balanceSheet: bs });
      // 90000 / 3000 = 30
      expect(result.liquidityRatio).toBeCloseTo(30, 0);
    });

    it('should compute additional debt capacity at 36% DTI', () => {
      const debts = [
        makeDebt({ monthlyPayment: 5000, minimumPayment: 5000, category: 'MORTGAGE' }),
      ];
      const income = makeIncome({ grossMonthlyIncome: 25000 });
      const bs = makeBalanceSheet();
      const result = calculateDebtMetrics({ debts, income, balanceSheet: bs });
      // Max at 36% = 25000 * 0.36 = 9000, current = 5000, capacity = 4000
      expect(result.additionalDebtCapacity).toBeCloseTo(4000, 0);
    });
  });

  // -----------------------------------------------------------------
  // optimizeDebtPayoff
  // -----------------------------------------------------------------
  describe('optimizeDebtPayoff', () => {
    const highRateDebt = makeDebt({
      id: 'high-rate',
      name: 'Credit Card',
      category: 'CREDIT_CARD',
      currentBalance: 10000,
      interestRate: 0.22,
      monthlyPayment: 300,
      minimumPayment: 200,
      remainingTermMonths: 60,
      isDeductible: false,
      deductibilityType: 'NONE',
    });

    const lowRateDebt = makeDebt({
      id: 'low-rate',
      name: 'Mortgage',
      category: 'MORTGAGE',
      currentBalance: 200000,
      interestRate: 0.04,
      monthlyPayment: 955,
      minimumPayment: 955,
      remainingTermMonths: 300,
      isDeductible: true,
      deductibilityType: 'ITEMIZED_ONLY',
    });

    const smallDebt = makeDebt({
      id: 'small-balance',
      name: 'Personal Loan',
      category: 'PERSONAL_LOAN',
      currentBalance: 2000,
      interestRate: 0.12,
      monthlyPayment: 100,
      minimumPayment: 50,
      remainingTermMonths: 24,
      isDeductible: false,
      deductibilityType: 'NONE',
    });

    it('should order avalanche by highest rate first', () => {
      const result = optimizeDebtPayoff({
        debts: [highRateDebt, lowRateDebt, smallDebt],
        monthlyExtraPayment: 500,
        taxProfile: makeTaxProfile(),
        investmentReturn: 0.08,
      });
      const avalanche = result.strategies.AVALANCHE!;
      // High-rate debt should be paid off first in avalanche
      expect(avalanche.debtPayoffSequence[0].debtId).toBe('high-rate');
    });

    it('should order snowball by lowest balance first', () => {
      const result = optimizeDebtPayoff({
        debts: [highRateDebt, lowRateDebt, smallDebt],
        monthlyExtraPayment: 500,
        taxProfile: makeTaxProfile(),
        investmentReturn: 0.08,
      });
      const snowball = result.strategies.SNOWBALL!;
      // Small balance should be first in snowball
      expect(snowball.debtPayoffSequence[0].debtId).toBe('small-balance');
    });

    it('should prioritize non-deductible debt in TAX_OPTIMIZED strategy', () => {
      const result = optimizeDebtPayoff({
        debts: [highRateDebt, lowRateDebt, smallDebt],
        monthlyExtraPayment: 500,
        taxProfile: makeTaxProfile(),
        investmentReturn: 0.08,
      });
      const taxOpt = result.strategies.TAX_OPTIMIZED!;
      // Non-deductible debts should come before deductible
      const firstPayoffId = taxOpt.debtPayoffSequence[0].debtId;
      const firstDebt = [highRateDebt, lowRateDebt, smallDebt].find(d => d.id === firstPayoffId);
      expect(firstDebt?.isDeductible).toBe(false);
    });

    it('should handle a single debt correctly', () => {
      const result = optimizeDebtPayoff({
        debts: [highRateDebt],
        monthlyExtraPayment: 500,
        taxProfile: makeTaxProfile(),
        investmentReturn: 0.08,
      });
      expect(result.strategies.AVALANCHE).toBeDefined();
      expect(result.strategies.SNOWBALL).toBeDefined();
      // With only 1 debt, all strategies should produce the same sequence
      expect(result.strategies.AVALANCHE!.debtPayoffSequence.length).toBe(1);
      expect(result.strategies.SNOWBALL!.debtPayoffSequence.length).toBe(1);
    });

    it('should produce all 8 strategy keys', () => {
      const result = optimizeDebtPayoff({
        debts: [highRateDebt, lowRateDebt, smallDebt],
        monthlyExtraPayment: 500,
        taxProfile: makeTaxProfile(),
        investmentReturn: 0.08,
      });
      const expectedStrategies = [
        'AVALANCHE', 'SNOWBALL', 'HYBRID', 'HIGHEST_PAYMENT',
        'SHORTEST_TERM', 'TAX_OPTIMIZED', 'CREDIT_SCORE', 'NET_WORTH_MAX',
      ];
      for (const s of expectedStrategies) {
        expect(result.strategies[s as keyof typeof result.strategies]).toBeDefined();
      }
    });

    it('should save more interest than minimum-only path', () => {
      const result = optimizeDebtPayoff({
        debts: [highRateDebt, lowRateDebt, smallDebt],
        monthlyExtraPayment: 500,
        taxProfile: makeTaxProfile(),
        investmentReturn: 0.08,
      });
      const avalanche = result.strategies.AVALANCHE!;
      expect(avalanche.summary.totalInterestSaved).toBeGreaterThan(0);
      expect(avalanche.summary.monthsSavedVsMinimum).toBeGreaterThan(0);
    });
  });
});

// =====================================================================
// Category 2: Mortgage Calculations (>= 15 tests)
// =====================================================================

describe('Mortgage Calculations', () => {
  // -----------------------------------------------------------------
  // analyzeMortgageRefinance
  // -----------------------------------------------------------------
  describe('analyzeMortgageRefinance', () => {
    const currentLoan: RefinanceCurrentLoan = {
      balance: 350000,
      rate: 0.07,
      remainingTermMonths: 300,
      monthlyPayment: 2470,
    };

    it('should compute break-even within horizon for a meaningful rate drop', () => {
      const results = analyzeMortgageRefinance({
        currentLoan,
        proposedLoans: [
          {
            label: '5.5% 30yr',
            newRate: 0.055,
            newTermMonths: 360,
            closingCosts: 8000,
            discountPoints: 0,
            lenderCredit: 0,
          },
        ],
        taxProfile: makeTaxProfile(),
        yearsInHome: 10,
      });
      expect(results.length).toBe(1);
      const scenario = results[0];
      expect(scenario.newMonthlyPayment).toBeLessThan(currentLoan.monthlyPayment);
      expect(scenario.willBreakEven).toBe(true);
      expect(scenario.breakEvenMonths).toBeLessThan(120);
    });

    it('should flag willBreakEven as false when breakeven exceeds horizon', () => {
      const results = analyzeMortgageRefinance({
        currentLoan: { ...currentLoan, balance: 100000, rate: 0.055, monthlyPayment: 700, remainingTermMonths: 240 },
        proposedLoans: [
          {
            label: 'Marginal drop',
            newRate: 0.0545,
            newTermMonths: 360,
            closingCosts: 15000,
            discountPoints: 0,
            lenderCredit: 0,
          },
        ],
        taxProfile: makeTaxProfile(),
        yearsInHome: 1,
      });
      const scenario = results[0];
      expect(scenario.willBreakEven).toBe(false);
    });

    it('should evaluate multiple proposed scenarios', () => {
      const results = analyzeMortgageRefinance({
        currentLoan,
        proposedLoans: [
          { label: 'A', newRate: 0.055, newTermMonths: 360, closingCosts: 8000, discountPoints: 0, lenderCredit: 0 },
          { label: 'B', newRate: 0.05, newTermMonths: 180, closingCosts: 10000, discountPoints: 0, lenderCredit: 0 },
          { label: 'C', newRate: 0.06, newTermMonths: 360, closingCosts: 3000, discountPoints: 0, lenderCredit: 0 },
        ],
        taxProfile: makeTaxProfile(),
        yearsInHome: 10,
      });
      expect(results.length).toBe(3);
      expect(results[0].scenario).toBe('A');
      expect(results[1].scenario).toBe('B');
      expect(results[2].scenario).toBe('C');
    });

    it('should compute totalInterestSavings when new rate is lower', () => {
      const results = analyzeMortgageRefinance({
        currentLoan,
        proposedLoans: [
          { label: 'Lower rate', newRate: 0.05, newTermMonths: 300, closingCosts: 5000, discountPoints: 0, lenderCredit: 0 },
        ],
        taxProfile: makeTaxProfile(),
        yearsInHome: 10,
      });
      expect(results[0].totalInterestSavings).toBeGreaterThan(0);
    });
  });

  // -----------------------------------------------------------------
  // analyzeHomeEquity
  // -----------------------------------------------------------------
  describe('analyzeHomeEquity', () => {
    const baseInput: HomeEquityInput = {
      homeValue: 700000,
      mortgageBalance: 350000,
      currentRate: 0.065,
      creditScore: 760,
      purpose: 'HOME_IMPROVEMENT',
      amountNeeded: 80000,
      taxProfile: makeTaxProfile(),
    };

    it('should calculate equity correctly', () => {
      const result = analyzeHomeEquity(baseInput);
      expect(result.currentEquity).toBeCloseTo(350000, 0);
    });

    it('should cap maxBorrowable at 80% CLTV', () => {
      const result = analyzeHomeEquity(baseInput);
      // 80% of 700000 = 560000, minus 350000 mortgage = 210000
      expect(result.maxBorrowable).toBeCloseTo(210000, 0);
    });

    it('should estimate HELOC rate based on credit score', () => {
      const result = analyzeHomeEquity(baseInput);
      // 760+ score gets -0.5% spread on prime 8.5% = 8.0%
      expect(result.options.heloc.estimatedRate).toBeCloseTo(0.08, 2);
    });

    it('should note tax deductibility for HOME_IMPROVEMENT purpose', () => {
      const result = analyzeHomeEquity(baseInput);
      expect(result.options.heloc.interestDeductible).toBe(true);
      expect(result.taxNote).toContain('deductible');
    });

    it('should mark interest as NOT deductible for debt consolidation purpose', () => {
      const result = analyzeHomeEquity({
        ...baseInput,
        purpose: 'DEBT_CONSOLIDATION',
      });
      expect(result.options.heloc.interestDeductible).toBe(false);
      expect(result.taxNote).toContain('NOT deductible');
    });
  });

  // -----------------------------------------------------------------
  // analyzeMortgageVsInvest
  // -----------------------------------------------------------------
  describe('analyzeMortgageVsInvest', () => {
    const baseInput: MortgageVsInvestInput = {
      mortgageBalance: 300000,
      mortgageRate: 0.04,
      remainingTermMonths: 300,
      monthlyExtraCapacity: 1500,
      investmentReturn: 0.10,
      taxProfile: makeTaxProfile(),
      timeHorizon: 10,
      riskTolerance: 0.7,
    };

    it('should recommend INVEST when return far exceeds mortgage rate', () => {
      const result = analyzeMortgageVsInvest(baseInput);
      expect(result.recommendation).toBe('INVEST');
    });

    it('should recommend PAY_MORTGAGE when return is lower than mortgage rate', () => {
      const result = analyzeMortgageVsInvest({
        ...baseInput,
        investmentReturn: 0.02,
        mortgageRate: 0.07,
      });
      expect(result.recommendation).toBe('PAY_MORTGAGE');
    });

    it('should produce sensitivity analysis entries', () => {
      const result = analyzeMortgageVsInvest(baseInput);
      expect(result.sensitivityToReturn.length).toBeGreaterThan(0);
      for (const entry of result.sensitivityToReturn) {
        expect(entry.investmentReturn).toBeGreaterThanOrEqual(0);
        expect(['INVEST', 'PAY_MORTGAGE']).toContain(entry.recommendation);
      }
    });

    it('should produce a crossoverYear when paths cross', () => {
      const result = analyzeMortgageVsInvest(baseInput);
      // With high return and low mortgage rate, investing should eventually cross over
      // crossoverYear can be null or a number
      if (result.crossoverYear !== null) {
        expect(result.crossoverYear).toBeGreaterThan(0);
        expect(result.crossoverYear).toBeLessThanOrEqual(30);
      }
    });

    it('should calculate break-even investment return', () => {
      const result = analyzeMortgageVsInvest(baseInput);
      expect(result.breakEvenInvestmentReturn).toBeGreaterThanOrEqual(0);
      expect(result.breakEvenInvestmentReturn).toBeLessThan(0.25);
    });

    it('should produce a narrative string', () => {
      const result = analyzeMortgageVsInvest(baseInput);
      expect(result.narrative).toBeTruthy();
      expect(typeof result.narrative).toBe('string');
    });
  });

  // -----------------------------------------------------------------
  // analyzePMIElimination
  // -----------------------------------------------------------------
  describe('analyzePMIElimination', () => {
    const baseInput: PMIInput = {
      homeValue: 500000,
      currentBalance: 440000,
      monthlyPMI: 200,
      pmiRate: 0.005,
      monthlyPayment: 2800,
      lumpSumAvailable: 50000,
    };

    it('should compute current LTV correctly', () => {
      const result = analyzePMIElimination(baseInput);
      // 440000 / 500000 = 0.88
      expect(result.currentLTV).toBeCloseTo(0.88, 2);
    });

    it('should compute principalNeeded to reach 80% LTV', () => {
      const result = analyzePMIElimination(baseInput);
      // target = 500000 * 0.80 = 400000, needed = 440000 - 400000 = 40000
      expect(result.principalNeeded).toBeCloseTo(40000, 0);
    });

    it('should compute positive lump sum ROI', () => {
      const result = analyzePMIElimination(baseInput);
      expect(result.lumpSumStrategy.roiOnLumpSum).toBeGreaterThan(0);
    });

    it('should flag appealAppraisal when 5% appreciation would reach 80% LTV', () => {
      // Balance at 440000 / (500000 * 1.05) = 440000/525000 = 0.838 > 0.80 -> no appeal
      const result = analyzePMIElimination(baseInput);
      expect(result.appealAppraisal).toBe(false);

      // Now test with balance closer to 80%
      const closeToThreshold = analyzePMIElimination({
        ...baseInput,
        currentBalance: 395000,
      });
      // 395000 / (500000 * 1.05) = 395000/525000 = 0.752 <= 0.80 -> appeal
      expect(closeToThreshold.appealAppraisal).toBe(true);
    });
  });
});

// =====================================================================
// Category 3: Student Loan Calculations (>= 12 tests)
// =====================================================================

describe('Student Loan Calculations', () => {
  // -----------------------------------------------------------------
  // optimizeStudentLoanRepayment
  // -----------------------------------------------------------------
  describe('optimizeStudentLoanRepayment', () => {
    it('should compute Standard 10yr plan', () => {
      const profile = makeStudentLoanProfile();
      const result = optimizeStudentLoanRepayment(profile);
      expect(result.plans.STANDARD_10YR).toBeDefined();
      expect(result.plans.STANDARD_10YR!.monthlyPaymentNow).toBeGreaterThan(0);
      expect(result.plans.STANDARD_10YR!.totalPaid).toBeGreaterThan(50000);
    });

    it('should compute IDR plans with lower monthly payments than standard', () => {
      const profile = makeStudentLoanProfile({ agi: 50000 });
      const result = optimizeStudentLoanRepayment(profile);
      const standardPayment = result.plans.STANDARD_10YR!.monthlyPaymentNow;
      const savePlan = result.plans.SAVE;
      if (savePlan) {
        expect(savePlan.monthlyPaymentNow).toBeLessThan(standardPayment);
      }
    });

    it('should analyze PSLF for eligible borrowers', () => {
      const profile = makeStudentLoanProfile({
        employerType: 'NONPROFIT_501C3',
        isPSLFEligible: true,
        pslfQualifyingPaymentsMade: 60,
      });
      const result = optimizeStudentLoanRepayment(profile);
      expect(result.pslfAnalysis.isEligible).toBe(true);
      expect(result.pslfAnalysis.paymentsRemaining).toBe(60);
    });

    it('should report PSLF as ineligible for for-profit employer', () => {
      const profile = makeStudentLoanProfile({
        employerType: 'FOR_PROFIT',
        isPSLFEligible: false,
      });
      const result = optimizeStudentLoanRepayment(profile);
      expect(result.pslfAnalysis.isEligible).toBe(false);
    });

    it('should calculate forgiveness for IDR plans when balance exceeds payments', () => {
      const profile = makeStudentLoanProfile({
        loans: [
          {
            id: 'sl-big',
            type: 'GRAD_PLUS',
            balance: 200000,
            interestRate: 0.07,
            disbursementDate: '2018-09-01',
            isConsolidated: false,
          },
        ],
        agi: 60000,
      });
      const result = optimizeStudentLoanRepayment(profile);
      const savePlan = result.plans.SAVE;
      if (savePlan) {
        expect(savePlan.forgiveness).toBeGreaterThan(0);
        expect(savePlan.forgivenessYear).toBeGreaterThan(0);
      }
    });

    it('should compute NPV ranking for plans', () => {
      const profile = makeStudentLoanProfile();
      const result = optimizeStudentLoanRepayment(profile);
      expect(result.plans.STANDARD_10YR!.npv).toBeGreaterThan(0);
    });

    it('should produce a recommendation string', () => {
      const profile = makeStudentLoanProfile();
      const result = optimizeStudentLoanRepayment(profile);
      expect(result.recommendation).toBeTruthy();
      expect(result.recommendationReason).toBeTruthy();
    });

    it('should compute private refinance analysis', () => {
      const profile = makeStudentLoanProfile();
      const result = optimizeStudentLoanRepayment(profile);
      expect(result.privateRefinanceAnalysis.estimatedPrivateRate).toBeGreaterThan(0);
      expect(result.privateRefinanceAnalysis.monthlyPayment).toBeGreaterThan(0);
    });
  });

  // -----------------------------------------------------------------
  // optimizeStudentLoanTax
  // -----------------------------------------------------------------
  describe('optimizeStudentLoanTax', () => {
    it('should produce 401k AGI reduction strategy', () => {
      const result = optimizeStudentLoanTax({
        studentLoanProfile: makeStudentLoanProfile(),
        taxProfile: makeTaxProfile(),
      });
      expect(result.strategies.length).toBeGreaterThanOrEqual(1);
      const k401 = result.strategies.find(s => s.strategy.includes('401'));
      expect(k401).toBeDefined();
      expect(k401!.agiReduction).toBe(23500);
    });

    it('should calculate marriage penalty', () => {
      const result = optimizeStudentLoanTax({
        studentLoanProfile: makeStudentLoanProfile({
          planningToMarry: true,
          spouseAgi: 80000,
        }),
        taxProfile: makeTaxProfile({ filingStatus: 'MFJ' }),
      });
      expect(result.marriagePenalty.payingJointly).toBeGreaterThan(0);
      expect(typeof result.marriagePenalty.shouldFileSeparately).toBe('boolean');
    });

    it('should compute interest deduction with phase-out for high earners', () => {
      const result = optimizeStudentLoanTax({
        studentLoanProfile: makeStudentLoanProfile({ agi: 82000 }),
        taxProfile: makeTaxProfile({ agi: 82000, filingStatus: 'SINGLE' }),
      });
      // Phase-out starts at $75k for single -> isPhaseOut should be true
      expect(result.interestDeduction.isPhaseOut).toBe(true);
      expect(result.interestDeduction.phaseOutReduction).toBeGreaterThan(0);
    });

    it('should give full deduction below phase-out threshold', () => {
      const result = optimizeStudentLoanTax({
        studentLoanProfile: makeStudentLoanProfile({ agi: 60000 }),
        taxProfile: makeTaxProfile({ agi: 60000, filingStatus: 'SINGLE' }),
      });
      expect(result.interestDeduction.isPhaseOut).toBe(false);
      expect(result.interestDeduction.deductibleAmount).toBeGreaterThan(0);
    });
  });
});

// =====================================================================
// Category 4: Credit Card Calculations (>= 10 tests)
// =====================================================================

describe('Credit Card Calculations', () => {
  // -----------------------------------------------------------------
  // optimizeCreditCardDebt
  // -----------------------------------------------------------------
  describe('optimizeCreditCardDebt', () => {
    const card1 = makeCreditCard({
      id: 'cc-high',
      issuer: 'Amex',
      balance: 8000,
      apr: 0.2499,
      creditLimit: 20000,
      minimumPayment: 200,
    });

    const card2 = makeCreditCard({
      id: 'cc-low',
      issuer: 'Discover',
      balance: 3000,
      apr: 0.1499,
      creditLimit: 10000,
      minimumPayment: 75,
    });

    const card3 = makeCreditCard({
      id: 'cc-med',
      issuer: 'Citi',
      balance: 5000,
      apr: 0.1899,
      creditLimit: 15000,
      minimumPayment: 125,
    });

    it('should produce avalanche strategy targeting highest APR first', () => {
      const result = optimizeCreditCardDebt({
        cards: [card1, card2, card3],
        monthlyExtraPayment: 400,
        transferOptions: [],
        creditScore: 720,
      });
      const avalanche = result.strategies.AVALANCHE!;
      expect(avalanche.debtPayoffSequence[0].debtId).toBe('cc-high');
    });

    it('should produce snowball strategy targeting lowest balance first', () => {
      const result = optimizeCreditCardDebt({
        cards: [card1, card2, card3],
        monthlyExtraPayment: 400,
        transferOptions: [],
        creditScore: 720,
      });
      const snowball = result.strategies.SNOWBALL!;
      expect(snowball.debtPayoffSequence[0].debtId).toBe('cc-low');
    });

    it('should analyze balance transfer opportunities', () => {
      const offer: BalanceTransferOffer = {
        offerLabel: '0% BT Card',
        promoRate: 0,
        promoPeriodMonths: 18,
        postPromoRate: 0.2199,
        transferFee: 0.03,
        creditLimit: 10000,
      };
      const result = optimizeCreditCardDebt({
        cards: [card1],
        monthlyExtraPayment: 200,
        transferOptions: [offer],
        creditScore: 720,
      });
      expect(result.balanceTransferOpportunities.length).toBe(1);
      expect(result.balanceTransferOpportunities[0].interestSaved).toBeGreaterThan(0);
    });

    it('should calculate utilization across all cards', () => {
      const result = optimizeCreditCardDebt({
        cards: [card1, card2, card3],
        monthlyExtraPayment: 400,
        transferOptions: [],
        creditScore: 720,
      });
      // total balance = 16000, total limit = 45000
      // utilization = 16000/45000 = 0.3555
      expect(result.utilizationAnalysis.currentTotal).toBeCloseTo(0.36, 1);
    });

    it('should compute minimum payment path projection', () => {
      const result = optimizeCreditCardDebt({
        cards: [card1, card2, card3],
        monthlyExtraPayment: 400,
        transferOptions: [],
        creditScore: 720,
      });
      expect(result.minimumPaymentPath.payoffMonths).toBeGreaterThan(0);
      expect(result.minimumPaymentPath.totalInterest).toBeGreaterThan(0);
      expect(result.minimumPaymentPath.trueAPREffect).toBeTruthy();
    });

    it('should produce a recommendation string', () => {
      const result = optimizeCreditCardDebt({
        cards: [card1, card2, card3],
        monthlyExtraPayment: 400,
        transferOptions: [],
        creditScore: 720,
      });
      expect(result.recommendation).toBeTruthy();
      expect(typeof result.recommendation).toBe('string');
    });
  });

  // -----------------------------------------------------------------
  // analyzeDebtConsolidation
  // -----------------------------------------------------------------
  describe('analyzeDebtConsolidation', () => {
    const debts: HouseholdDebt[] = [
      makeDebt({
        id: 'd1',
        category: 'CREDIT_CARD',
        currentBalance: 10000,
        interestRate: 0.22,
        monthlyPayment: 300,
        minimumPayment: 300,
        remainingTermMonths: 60,
        isDeductible: false,
        deductibilityType: 'NONE',
      }),
      makeDebt({
        id: 'd2',
        category: 'PERSONAL_LOAN',
        currentBalance: 15000,
        interestRate: 0.12,
        monthlyPayment: 450,
        minimumPayment: 450,
        remainingTermMonths: 48,
        isDeductible: false,
        deductibilityType: 'NONE',
      }),
    ];

    it('should compute weighted average APR', () => {
      const result = analyzeDebtConsolidation({
        existingDebts: debts,
        consolidationOptions: [
          { type: 'PERSONAL_LOAN', rate: 0.08, termMonths: 60, originationFee: 0.02, maxAmount: 50000 },
        ],
        taxProfile: makeTaxProfile(),
      });
      // Weighted: (10000*0.22 + 15000*0.12) / 25000 = (2200+1800)/25000 = 0.16
      expect(result.currentState.weightedAvgAPR).toBeCloseTo(0.16, 2);
    });

    it('should show monthly savings when consolidation rate is lower', () => {
      const result = analyzeDebtConsolidation({
        existingDebts: debts,
        consolidationOptions: [
          { type: 'PERSONAL_LOAN', rate: 0.08, termMonths: 60, originationFee: 0.02, maxAmount: 50000 },
        ],
        taxProfile: makeTaxProfile(),
      });
      expect(result.consolidationScenarios.length).toBe(1);
      expect(result.consolidationScenarios[0].monthlyRelief).toBeGreaterThan(0);
    });

    it('should assess risk for secured consolidation options', () => {
      const result = analyzeDebtConsolidation({
        existingDebts: debts,
        consolidationOptions: [
          { type: 'HELOC', rate: 0.08, termMonths: 120, originationFee: 0, maxAmount: 50000 },
        ],
        taxProfile: makeTaxProfile(),
      });
      const scenario = result.consolidationScenarios[0];
      expect(scenario.risks.length).toBeGreaterThan(0);
      expect(scenario.risks.some(r => r.toLowerCase().includes('home'))).toBe(true);
    });

    it('should pick best option and provide reason', () => {
      const result = analyzeDebtConsolidation({
        existingDebts: debts,
        consolidationOptions: [
          { type: 'PERSONAL_LOAN', rate: 0.08, termMonths: 60, originationFee: 0.02, maxAmount: 50000 },
          { type: 'HELOC', rate: 0.075, termMonths: 120, originationFee: 0, maxAmount: 50000 },
        ],
        taxProfile: makeTaxProfile(),
      });
      expect(result.bestOption).toBeTruthy();
      expect(result.bestOptionReason).toBeTruthy();
    });
  });
});

// =====================================================================
// Category 5: Securities-Backed Lending (>= 8 tests)
// =====================================================================

describe('Securities-Backed Lending', () => {
  // -----------------------------------------------------------------
  // analyzeSecuritiesBackedLending
  // -----------------------------------------------------------------
  describe('analyzeSecuritiesBackedLending', () => {
    const baseInput: SBLOCInput = {
      portfolio: {
        totalValue: 2000000,
        eligibleCollateral: 1800000,
      },
      proposedLoan: {
        amount: 500000,
        purpose: 'Real estate investment',
        rate: 0.055,
        termMonths: 60,
        interestOnly: true,
      },
      taxProfile: makeTaxProfile(),
      alternativeFunding: {
        liquidateCostBasis: 800000,
        liquidateGain: 400000,
        mortgageRate: 0.065,
        cashAvailable: 100000,
      },
    };

    it('should compute max borrowing power at 60% of eligible collateral', () => {
      const result = analyzeSecuritiesBackedLending(baseInput);
      // 1800000 * 0.60 = 1080000
      expect(result.maxBorrowingPower).toBeCloseTo(1080000, 0);
    });

    it('should rate LTV as CONSERVATIVE for low leverage', () => {
      const result = analyzeSecuritiesBackedLending(baseInput);
      // LTV = 500000 / 2000000 = 0.25 -> CONSERVATIVE
      expect(result.ltvRating).toBe('CONSERVATIVE');
    });

    it('should rate LTV as AGGRESSIVE for high leverage', () => {
      const result = analyzeSecuritiesBackedLending({
        ...baseInput,
        proposedLoan: { ...baseInput.proposedLoan, amount: 1200000 },
      });
      // LTV = 1200000 / 2000000 = 0.60 -> AGGRESSIVE
      expect(result.ltvRating).toBe('AGGRESSIVE');
    });

    it('should compute margin call threshold', () => {
      const result = analyzeSecuritiesBackedLending(baseInput);
      // threshold = 500000 / 0.65 = ~769231
      expect(result.marginCallAnalysis.marginCallThreshold).toBeCloseTo(769230.77, 0);
    });

    it('should produce rate stress test entries', () => {
      const result = analyzeSecuritiesBackedLending(baseInput);
      expect(result.rateStressTest.length).toBe(3);
      expect(result.rateStressTest[0].rateScenario).toBe('+1%');
      expect(result.rateStressTest[1].rateScenario).toBe('+2%');
      expect(result.rateStressTest[2].rateScenario).toBe('+3%');
      for (const st of result.rateStressTest) {
        expect(st.annualCostIncrease).toBeGreaterThan(0);
      }
    });

    it('should compute annual interest cost correctly', () => {
      const result = analyzeSecuritiesBackedLending(baseInput);
      // 500000 * 0.055 = 27500
      expect(result.costAnalysis.annualInterestCost).toBeCloseTo(27500, 0);
    });
  });

  // -----------------------------------------------------------------
  // analyzeMarginLoan
  // -----------------------------------------------------------------
  describe('analyzeMarginLoan', () => {
    const baseInput: MarginLoanInput = {
      portfolioValue: 1000000,
      marginableValue: 900000,
      proposedBorrow: 300000,
      marginRate: 0.065,
      holdingPeriod: 'MONTHS',
      portfolioVolatility: 0.18,
    };

    it('should compute Reg T initial margin at 50% of marginable value', () => {
      const result = analyzeMarginLoan(baseInput);
      expect(result.initialMarginRequired).toBeCloseTo(450000, 0);
    });

    it('should report FINRA 25% maintenance margin level', () => {
      const result = analyzeMarginLoan(baseInput);
      expect(result.maintenanceMarginLevel).toBeCloseTo(0.25, 2);
    });

    it('should compute VaR at 95% confidence', () => {
      const result = analyzeMarginLoan(baseInput);
      expect(result.dailyVaR).toBeGreaterThan(0);
    });

    it('should report margin call probability between 0 and 1', () => {
      const result = analyzeMarginLoan(baseInput);
      expect(result.marginCallProbability).toBeGreaterThanOrEqual(0);
      expect(result.marginCallProbability).toBeLessThanOrEqual(1);
    });
  });
});

// =====================================================================
// Category 6: Auto Loan Calculations (>= 6 tests)
// =====================================================================

describe('Auto Loan Calculations', () => {
  describe('analyzeAutoLoan', () => {
    const baseInput: AutoLoanInput = {
      vehicleValue: 35000,
      loanBalance: 25000,
      interestRate: 0.06,
      remainingMonths: 48,
      monthlyPayment: 587,
      lumpSumAvailable: 25000,
      investmentReturn: 0.08,
    };

    it('should compute positive equity when vehicle > balance', () => {
      const result = analyzeAutoLoan(baseInput);
      expect(result.currentStatus.equity).toBeCloseTo(10000, 0);
      expect(result.currentStatus.isUnderwaterFlag).toBe(false);
    });

    it('should flag underwater when balance > vehicle value', () => {
      const result = analyzeAutoLoan({
        ...baseInput,
        loanBalance: 40000,
      });
      expect(result.currentStatus.equity).toBeLessThan(0);
      expect(result.currentStatus.isUnderwaterFlag).toBe(true);
    });

    it('should recommend INVEST_INSTEAD when investment return >> loan rate', () => {
      const result = analyzeAutoLoan({
        ...baseInput,
        interestRate: 0.03,
        investmentReturn: 0.10,
      });
      expect(result.payoffAnalysis.recommendation).toBe('INVEST_INSTEAD');
    });

    it('should recommend PAY_OFF when loan rate > investment return', () => {
      const result = analyzeAutoLoan({
        ...baseInput,
        interestRate: 0.10,
        investmentReturn: 0.05,
      });
      expect(result.payoffAnalysis.recommendation).toBe('PAY_OFF');
    });

    it('should produce lease vs buy analysis when leaseOption provided', () => {
      const result = analyzeAutoLoan({
        ...baseInput,
        leaseOption: {
          monthlyLease: 450,
          leaseTerm: 36,
          residualValue: 22000,
          acquisitionFee: 895,
          moneyFactor: 0.0025,
          allowedMileage: 12000,
          mileageOverageFee: 0.25,
        },
      });
      expect(result.leaseVsBuyAnalysis).toBeDefined();
      expect(result.leaseVsBuyAnalysis!.moneyFactorAsAPR).toBeCloseTo(6, 0);
      expect(['LEASE', 'BUY', 'DEPENDS']).toContain(result.leaseVsBuyAnalysis!.recommendation);
    });

    it('should not include leaseVsBuyAnalysis when leaseOption is absent', () => {
      const result = analyzeAutoLoan(baseInput);
      expect(result.leaseVsBuyAnalysis).toBeUndefined();
    });
  });
});

// =====================================================================
// Category 7: Business Debt (>= 5 tests)
// =====================================================================

describe('Business Debt Calculations', () => {
  describe('analyzeBusinessDebt', () => {
    const baseInput: BusinessDebtInput = {
      businessType: 'S_CORP',
      businessDebts: [
        {
          type: 'SBA_LOAN',
          balance: 500000,
          rate: 0.07,
          termMonths: 120,
          isPersonallyGuaranteed: true,
          collateral: 'business assets',
          taxDeductible: true,
          section163jApplies: true,
        },
        {
          type: 'LINE_OF_CREDIT',
          balance: 100000,
          rate: 0.09,
          termMonths: 60,
          isPersonallyGuaranteed: false,
          collateral: 'receivables',
          taxDeductible: true,
          section163jApplies: true,
        },
      ],
      businessIncome: 1000000,
      ebitda: 250000,
      personalGuaranteesTotal: 500000,
      taxProfile: makeTaxProfile(),
      netWorth: 1500000,
    };

    it('should compute debt-to-EBITDA ratio', () => {
      const result = analyzeBusinessDebt(baseInput);
      // total debt = 600000, ebitda = 250000 -> 2.4
      expect(result.businessLeverageMetrics.debtToEBITDA).toBeCloseTo(2.4, 1);
    });

    it('should compute DSCR (debt service coverage ratio)', () => {
      const result = analyzeBusinessDebt(baseInput);
      expect(result.businessLeverageMetrics.debtServiceCoverage).toBeGreaterThan(0);
    });

    it('should assess personal exposure risk', () => {
      const result = analyzeBusinessDebt(baseInput);
      // 500000 / 1500000 = 0.333 -> HIGH
      expect(result.personalExposure.percentOfNetWorth).toBeCloseTo(0.33, 2);
      expect(result.personalExposure.riskRating).toBe('HIGH');
    });

    it('should compute Section 163(j) limit at 30% of EBITDA', () => {
      const result = analyzeBusinessDebt(baseInput);
      // 250000 * 0.30 = 75000
      expect(result.taxDeductibility.section163jLimit).toBeCloseTo(75000, 0);
    });

    it('should carry forward disallowed interest exceeding 163(j) limit', () => {
      // Total interest: 500000*0.07 + 100000*0.09 = 35000 + 9000 = 44000
      // Limit: 75000 -> no carryforward in this case
      const result = analyzeBusinessDebt(baseInput);
      expect(result.taxDeductibility.deductibleThisYear).toBeCloseTo(44000, 0);
      expect(result.taxDeductibility.disallowedCarryforward).toBeCloseTo(0, 0);

      // Now test with lower EBITDA to trigger carryforward
      const lowEbitda = analyzeBusinessDebt({
        ...baseInput,
        ebitda: 100000,
      });
      // Limit: 100000 * 0.30 = 30000, interest = 44000 -> carry forward 14000
      expect(lowEbitda.taxDeductibility.section163jLimit).toBeCloseTo(30000, 0);
      expect(lowEbitda.taxDeductibility.disallowedCarryforward).toBeCloseTo(14000, 0);
    });
  });
});

// =====================================================================
// Category 8: Farther Debt Score (>= 5 tests)
// =====================================================================

describe('Farther Debt Score', () => {
  describe('calculateFartherDebtScore', () => {
    const baseInput: DebtScoreInput = {
      debts: [
        makeDebt({
          id: 'mortgage-1',
          category: 'MORTGAGE',
          currentBalance: 400000,
          interestRate: 0.065,
          rateType: 'FIXED',
          monthlyPayment: 2528,
          minimumPayment: 2528,
          remainingTermMonths: 300,
          isDeductible: true,
          deductibilityType: 'ITEMIZED_ONLY',
          collateral: 'primary residence',
        }),
      ],
      taxProfile: makeTaxProfile(),
      income: makeIncome(),
      balanceSheet: makeBalanceSheet(),
    };

    it('should produce a score between 0 and 850', () => {
      const result = calculateFartherDebtScore(baseInput);
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(850);
    });

    it('should produce dimension scores between 0 and 100', () => {
      const result = calculateFartherDebtScore(baseInput);
      const dims = result.dimensions;
      for (const key of ['leverage', 'cost', 'structure', 'risk', 'trajectory'] as const) {
        expect(dims[key]).toBeGreaterThanOrEqual(0);
        expect(dims[key]).toBeLessThanOrEqual(100);
      }
    });

    it('should assign correct label based on score', () => {
      const result = calculateFartherDebtScore(baseInput);
      const validLabels = ['DEBT_FREE', 'EXCELLENT', 'GOOD', 'FAIR', 'CONCERNING', 'CRITICAL'];
      expect(validLabels).toContain(result.label);
    });

    it('should return DEBT_FREE label when all balances are zero', () => {
      const result = calculateFartherDebtScore({
        ...baseInput,
        debts: [
          makeDebt({ currentBalance: 0, monthlyPayment: 0 }),
        ],
      });
      expect(result.label).toBe('DEBT_FREE');
      expect(result.score).toBe(850);
    });

    it('should generate opportunities for high-rate credit card debt', () => {
      const input: DebtScoreInput = {
        ...baseInput,
        debts: [
          ...baseInput.debts,
          makeDebt({
            id: 'cc-1',
            category: 'CREDIT_CARD',
            currentBalance: 15000,
            interestRate: 0.22,
            rateType: 'VARIABLE',
            monthlyPayment: 450,
            minimumPayment: 450,
            remainingTermMonths: 60,
            isDeductible: false,
            deductibilityType: 'NONE',
          }),
        ],
      };
      const result = calculateFartherDebtScore(input);
      const ccOpportunity = result.topOpportunities.find(
        o => o.type === 'HIGH_RATE_CARD_PAYOFF',
      );
      expect(ccOpportunity).toBeDefined();
      expect(ccOpportunity!.annualSavings).toBeGreaterThan(0);
    });

    it('should track score change when previousScore is provided', () => {
      const result = calculateFartherDebtScore({
        ...baseInput,
        previousScore: 600,
      });
      expect(result.scoreChange).toBe(result.score - 600);
    });

    it('should report zero scoreChange when no previousScore', () => {
      const result = calculateFartherDebtScore(baseInput);
      expect(result.scoreChange).toBe(0);
    });

    it('should detect improving trajectory when debt is declining', () => {
      const previousDebts = [
        makeDebt({ currentBalance: 500000 }),
      ];
      const result = calculateFartherDebtScore({
        ...baseInput,
        debts: [makeDebt({ currentBalance: 350000, monthlyPayment: 2528 })],
        previousDebts,
      });
      // Debt decreased by 30% -> trajectory should be high
      expect(result.dimensions.trajectory).toBeGreaterThanOrEqual(80);
    });

    it('should penalize worsening trajectory when debt is growing', () => {
      const previousDebts = [
        makeDebt({ currentBalance: 200000 }),
      ];
      const result = calculateFartherDebtScore({
        ...baseInput,
        debts: [makeDebt({ currentBalance: 400000, monthlyPayment: 2528 })],
        previousDebts,
      });
      // Debt increased by 100% -> trajectory should be low
      expect(result.dimensions.trajectory).toBeLessThanOrEqual(35);
    });

    it('should produce keyDrivers descriptions', () => {
      const result = calculateFartherDebtScore(baseInput);
      expect(result.keyDrivers.length).toBeGreaterThan(0);
      for (const driver of result.keyDrivers) {
        expect(typeof driver).toBe('string');
        expect(driver.length).toBeGreaterThan(0);
      }
    });
  });
});
