/**
 * Farther Portfolio Proposal Engine -- Investment Model Library
 *
 * Pre-defined model portfolios maintained by Farther's investment committee.
 * Each model conforms to the `InvestmentModel` interface and includes
 * realistic allocations with real ETF tickers, historical performance
 * metrics, and stress test results.
 *
 * Design system: Steel Blue (bg-brand-700), Limestone (bg-limestone-*),
 * charcoal text. Tailwind CSS.
 *
 * @module proposal-engine/model-library
 */

import type {
  InvestmentModel,
  ModelCategory,
} from './types';
import { cents } from './types';

// =====================================================================
// Constants
// =====================================================================

const FIRM_ID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';

// =====================================================================
// Model Definitions
// =====================================================================

const MODELS: InvestmentModel[] = [
  // -----------------------------------------------------------------
  // 1. Farther Conservative Income
  // -----------------------------------------------------------------
  {
    modelId: 'mdl-001-conservative-income',
    firmId: FIRM_ID,
    name: 'Farther Conservative Income',
    category: 'INCOME',
    riskScore: 15,
    targetReturn: 0.038,
    targetVolatility: 0.045,
    allocation: [
      { ticker: 'AGG', assetClass: 'FIXED_INCOME_GOVT', targetPct: 30, minPct: 25, maxPct: 35, notes: 'Core aggregate bond exposure' },
      { ticker: 'BND', assetClass: 'FIXED_INCOME_CORP_IG', targetPct: 20, minPct: 15, maxPct: 25, notes: 'Total bond market for diversification' },
      { ticker: 'VCSH', assetClass: 'FIXED_INCOME_CORP_IG', targetPct: 15, minPct: 10, maxPct: 20, notes: 'Short-term corporate bonds for yield stability' },
      { ticker: 'VTIP', assetClass: 'FIXED_INCOME_TIPS', targetPct: 10, minPct: 5, maxPct: 15, notes: 'TIPS for inflation protection' },
      { ticker: 'VYM', assetClass: 'EQUITY_US_LARGE', targetPct: 10, minPct: 5, maxPct: 15, notes: 'High-dividend US equities for income' },
      { ticker: 'VXUS', assetClass: 'EQUITY_INTL_DEVELOPED', targetPct: 5, minPct: 0, maxPct: 10, notes: 'International diversification' },
      { ticker: 'SGOV', assetClass: 'CASH_EQUIVALENT', targetPct: 10, minPct: 5, maxPct: 15, notes: 'Ultra-short Treasury bills for liquidity' },
    ],
    inceptionDate: '2019-03-15',
    benchmarkIndex: 'Bloomberg US Aggregate Bond Index',
    expenseRatio: 0.0006,
    annualTurnoverPct: 8,
    taxEfficiency: 'MEDIUM',
    performance: {
      ytd: 0.018,
      oneYear: 0.042,
      threeYear: 0.031,
      fiveYear: 0.035,
      tenYear: 0.033,
      sinceInception: 0.034,
      sharpeRatio: 0.72,
      sortinoRatio: 0.98,
      maxDrawdown: -0.08,
      maxDrawdownRecoveryDays: 95,
      beta: 0.25,
      alpha: 0.008,
      informationRatio: 0.35,
    },
    stressTests: [
      { scenario: '2008_FINANCIAL_CRISIS', scenarioLabel: '2008 Global Financial Crisis', portfolioReturn: -0.06, benchmarkReturn: -0.05, maxDrawdown: -0.09, recoveryMonths: 6 },
      { scenario: 'COVID_2020', scenarioLabel: 'COVID-19 Sell-off (Feb-Mar 2020)', portfolioReturn: -0.04, benchmarkReturn: -0.03, maxDrawdown: -0.06, recoveryMonths: 3 },
      { scenario: '2022_RATE_SHOCK', scenarioLabel: '2022 Interest Rate Shock', portfolioReturn: -0.09, benchmarkReturn: -0.13, maxDrawdown: -0.11, recoveryMonths: 10 },
      { scenario: 'RATES_UP_200BPS', scenarioLabel: 'Rates +200bps Shock', portfolioReturn: -0.07, benchmarkReturn: -0.10, maxDrawdown: -0.09, recoveryMonths: 8 },
    ],
    isActive: true,
    approvedForUse: true,
    minInvestmentAmount: cents(25000),
    vehicleType: 'ETF_ONLY',
  },

  // -----------------------------------------------------------------
  // 2. Farther Moderate 40/60
  // -----------------------------------------------------------------
  {
    modelId: 'mdl-002-moderate-40-60',
    firmId: FIRM_ID,
    name: 'Farther Moderate 40/60',
    category: 'STRATEGIC',
    riskScore: 30,
    targetReturn: 0.052,
    targetVolatility: 0.065,
    allocation: [
      { ticker: 'VTI', assetClass: 'EQUITY_US_LARGE', targetPct: 25, minPct: 20, maxPct: 30, notes: 'US total stock market core' },
      { ticker: 'VXUS', assetClass: 'EQUITY_INTL_DEVELOPED', targetPct: 10, minPct: 5, maxPct: 15, notes: 'International developed markets' },
      { ticker: 'VWO', assetClass: 'EQUITY_INTL_EMERGING', targetPct: 5, minPct: 2, maxPct: 8, notes: 'Emerging markets for growth' },
      { ticker: 'AGG', assetClass: 'FIXED_INCOME_GOVT', targetPct: 25, minPct: 20, maxPct: 30, notes: 'Core aggregate bond index' },
      { ticker: 'VCIT', assetClass: 'FIXED_INCOME_CORP_IG', targetPct: 15, minPct: 10, maxPct: 20, notes: 'Intermediate-term corporate bonds' },
      { ticker: 'VTIP', assetClass: 'FIXED_INCOME_TIPS', targetPct: 10, minPct: 5, maxPct: 15, notes: 'Inflation-linked bonds' },
      { ticker: 'VNQ', assetClass: 'REAL_ESTATE', targetPct: 5, minPct: 2, maxPct: 8, notes: 'REITs for real asset exposure' },
      { ticker: 'SGOV', assetClass: 'CASH_EQUIVALENT', targetPct: 5, minPct: 2, maxPct: 10, notes: 'Cash buffer' },
    ],
    inceptionDate: '2018-06-01',
    benchmarkIndex: '40% MSCI ACWI / 60% Bloomberg US Agg',
    expenseRatio: 0.0005,
    annualTurnoverPct: 10,
    taxEfficiency: 'MEDIUM',
    performance: {
      ytd: 0.032,
      oneYear: 0.058,
      threeYear: 0.045,
      fiveYear: 0.052,
      tenYear: 0.050,
      sinceInception: 0.051,
      sharpeRatio: 0.82,
      sortinoRatio: 1.10,
      maxDrawdown: -0.14,
      maxDrawdownRecoveryDays: 180,
      beta: 0.42,
      alpha: 0.010,
      informationRatio: 0.42,
    },
    stressTests: [
      { scenario: '2008_FINANCIAL_CRISIS', scenarioLabel: '2008 Global Financial Crisis', portfolioReturn: -0.18, benchmarkReturn: -0.20, maxDrawdown: -0.22, recoveryMonths: 14 },
      { scenario: 'COVID_2020', scenarioLabel: 'COVID-19 Sell-off (Feb-Mar 2020)', portfolioReturn: -0.10, benchmarkReturn: -0.12, maxDrawdown: -0.14, recoveryMonths: 5 },
      { scenario: '2022_RATE_SHOCK', scenarioLabel: '2022 Interest Rate Shock', portfolioReturn: -0.14, benchmarkReturn: -0.16, maxDrawdown: -0.16, recoveryMonths: 12 },
    ],
    isActive: true,
    approvedForUse: true,
    minInvestmentAmount: cents(25000),
    vehicleType: 'ETF_ONLY',
  },

  // -----------------------------------------------------------------
  // 3. Farther Balanced 50/50
  // -----------------------------------------------------------------
  {
    modelId: 'mdl-003-balanced-50-50',
    firmId: FIRM_ID,
    name: 'Farther Balanced 50/50',
    category: 'STRATEGIC',
    riskScore: 45,
    targetReturn: 0.062,
    targetVolatility: 0.085,
    allocation: [
      { ticker: 'VTI', assetClass: 'EQUITY_US_LARGE', targetPct: 30, minPct: 25, maxPct: 35, notes: 'US total stock market core' },
      { ticker: 'VXUS', assetClass: 'EQUITY_INTL_DEVELOPED', targetPct: 12, minPct: 8, maxPct: 16, notes: 'International developed equity' },
      { ticker: 'VWO', assetClass: 'EQUITY_INTL_EMERGING', targetPct: 5, minPct: 3, maxPct: 8, notes: 'Emerging market equity' },
      { ticker: 'VNQ', assetClass: 'REAL_ESTATE', targetPct: 3, minPct: 0, maxPct: 6, notes: 'REIT diversification' },
      { ticker: 'AGG', assetClass: 'FIXED_INCOME_GOVT', targetPct: 20, minPct: 15, maxPct: 25, notes: 'Core bond allocation' },
      { ticker: 'VCIT', assetClass: 'FIXED_INCOME_CORP_IG', targetPct: 15, minPct: 10, maxPct: 20, notes: 'Investment-grade corporates' },
      { ticker: 'VTIP', assetClass: 'FIXED_INCOME_TIPS', targetPct: 8, minPct: 4, maxPct: 12, notes: 'Inflation protection' },
      { ticker: 'BNDX', assetClass: 'FIXED_INCOME_INTL', targetPct: 5, minPct: 2, maxPct: 8, notes: 'International bond diversification' },
      { ticker: 'SGOV', assetClass: 'CASH_EQUIVALENT', targetPct: 2, minPct: 0, maxPct: 5, notes: 'Tactical cash reserve' },
    ],
    inceptionDate: '2017-01-15',
    benchmarkIndex: '50% MSCI ACWI / 50% Bloomberg US Agg',
    expenseRatio: 0.0005,
    annualTurnoverPct: 11,
    taxEfficiency: 'MEDIUM',
    performance: {
      ytd: 0.041,
      oneYear: 0.068,
      threeYear: 0.055,
      fiveYear: 0.062,
      tenYear: 0.059,
      sinceInception: 0.060,
      sharpeRatio: 0.88,
      sortinoRatio: 1.18,
      maxDrawdown: -0.18,
      maxDrawdownRecoveryDays: 220,
      beta: 0.52,
      alpha: 0.012,
      informationRatio: 0.48,
    },
    stressTests: [
      { scenario: '2008_FINANCIAL_CRISIS', scenarioLabel: '2008 Global Financial Crisis', portfolioReturn: -0.24, benchmarkReturn: -0.26, maxDrawdown: -0.28, recoveryMonths: 18 },
      { scenario: 'COVID_2020', scenarioLabel: 'COVID-19 Sell-off (Feb-Mar 2020)', portfolioReturn: -0.14, benchmarkReturn: -0.16, maxDrawdown: -0.18, recoveryMonths: 6 },
      { scenario: '2022_RATE_SHOCK', scenarioLabel: '2022 Interest Rate Shock', portfolioReturn: -0.16, benchmarkReturn: -0.18, maxDrawdown: -0.19, recoveryMonths: 13 },
      { scenario: 'RECESSION_MILD', scenarioLabel: 'Mild Recession Scenario', portfolioReturn: -0.10, benchmarkReturn: -0.12, maxDrawdown: -0.13, recoveryMonths: 8 },
    ],
    isActive: true,
    approvedForUse: true,
    minInvestmentAmount: cents(25000),
    vehicleType: 'ETF_ONLY',
  },

  // -----------------------------------------------------------------
  // 4. Farther Growth 60/40
  // -----------------------------------------------------------------
  {
    modelId: 'mdl-004-growth-60-40',
    firmId: FIRM_ID,
    name: 'Farther Growth 60/40',
    category: 'STRATEGIC',
    riskScore: 55,
    targetReturn: 0.072,
    targetVolatility: 0.10,
    allocation: [
      { ticker: 'VTI', assetClass: 'EQUITY_US_LARGE', targetPct: 35, minPct: 30, maxPct: 40, notes: 'US total stock market anchor' },
      { ticker: 'VXUS', assetClass: 'EQUITY_INTL_DEVELOPED', targetPct: 15, minPct: 10, maxPct: 20, notes: 'International developed equity' },
      { ticker: 'VWO', assetClass: 'EQUITY_INTL_EMERGING', targetPct: 7, minPct: 4, maxPct: 10, notes: 'Emerging markets growth' },
      { ticker: 'VO', assetClass: 'EQUITY_US_MID', targetPct: 3, minPct: 0, maxPct: 6, notes: 'US mid-cap tilt' },
      { ticker: 'AGG', assetClass: 'FIXED_INCOME_GOVT', targetPct: 18, minPct: 14, maxPct: 22, notes: 'Core aggregate bonds' },
      { ticker: 'VCIT', assetClass: 'FIXED_INCOME_CORP_IG', targetPct: 10, minPct: 6, maxPct: 14, notes: 'Investment-grade corporate bonds' },
      { ticker: 'VTIP', assetClass: 'FIXED_INCOME_TIPS', targetPct: 5, minPct: 2, maxPct: 8, notes: 'Inflation hedge' },
      { ticker: 'VNQ', assetClass: 'REAL_ESTATE', targetPct: 4, minPct: 2, maxPct: 7, notes: 'Real estate income and diversification' },
      { ticker: 'SGOV', assetClass: 'CASH_EQUIVALENT', targetPct: 3, minPct: 0, maxPct: 5, notes: 'Cash buffer' },
    ],
    inceptionDate: '2016-09-01',
    benchmarkIndex: '60% MSCI ACWI / 40% Bloomberg US Agg',
    expenseRatio: 0.0005,
    annualTurnoverPct: 12,
    taxEfficiency: 'MEDIUM',
    performance: {
      ytd: 0.049,
      oneYear: 0.079,
      threeYear: 0.064,
      fiveYear: 0.072,
      tenYear: 0.069,
      sinceInception: 0.070,
      sharpeRatio: 0.92,
      sortinoRatio: 1.25,
      maxDrawdown: -0.22,
      maxDrawdownRecoveryDays: 290,
      beta: 0.62,
      alpha: 0.014,
      informationRatio: 0.52,
    },
    stressTests: [
      { scenario: '2008_FINANCIAL_CRISIS', scenarioLabel: '2008 Global Financial Crisis', portfolioReturn: -0.30, benchmarkReturn: -0.32, maxDrawdown: -0.35, recoveryMonths: 22 },
      { scenario: 'COVID_2020', scenarioLabel: 'COVID-19 Sell-off (Feb-Mar 2020)', portfolioReturn: -0.18, benchmarkReturn: -0.20, maxDrawdown: -0.22, recoveryMonths: 7 },
      { scenario: '2022_RATE_SHOCK', scenarioLabel: '2022 Interest Rate Shock', portfolioReturn: -0.17, benchmarkReturn: -0.19, maxDrawdown: -0.20, recoveryMonths: 14 },
    ],
    isActive: true,
    approvedForUse: true,
    minInvestmentAmount: cents(25000),
    vehicleType: 'ETF_ONLY',
  },

  // -----------------------------------------------------------------
  // 5. Farther Aggressive Growth
  // -----------------------------------------------------------------
  {
    modelId: 'mdl-005-aggressive-growth',
    firmId: FIRM_ID,
    name: 'Farther Aggressive Growth',
    category: 'STRATEGIC',
    riskScore: 75,
    targetReturn: 0.088,
    targetVolatility: 0.14,
    allocation: [
      { ticker: 'VTI', assetClass: 'EQUITY_US_LARGE', targetPct: 40, minPct: 35, maxPct: 45, notes: 'US total stock market anchor' },
      { ticker: 'VXUS', assetClass: 'EQUITY_INTL_DEVELOPED', targetPct: 18, minPct: 14, maxPct: 22, notes: 'International developed markets' },
      { ticker: 'VWO', assetClass: 'EQUITY_INTL_EMERGING', targetPct: 10, minPct: 7, maxPct: 14, notes: 'Emerging markets growth engine' },
      { ticker: 'VB', assetClass: 'EQUITY_US_SMALL', targetPct: 7, minPct: 4, maxPct: 10, notes: 'US small-cap premium capture' },
      { ticker: 'VNQ', assetClass: 'REAL_ESTATE', targetPct: 5, minPct: 2, maxPct: 8, notes: 'Real estate diversification' },
      { ticker: 'AGG', assetClass: 'FIXED_INCOME_GOVT', targetPct: 10, minPct: 7, maxPct: 14, notes: 'Bond ballast' },
      { ticker: 'VCIT', assetClass: 'FIXED_INCOME_CORP_IG', targetPct: 5, minPct: 2, maxPct: 8, notes: 'Corporate bond yield' },
      { ticker: 'GLD', assetClass: 'GOLD', targetPct: 3, minPct: 0, maxPct: 6, notes: 'Gold as tail-risk hedge' },
      { ticker: 'SGOV', assetClass: 'CASH_EQUIVALENT', targetPct: 2, minPct: 0, maxPct: 5, notes: 'Minimal cash reserve' },
    ],
    inceptionDate: '2016-09-01',
    benchmarkIndex: '80% MSCI ACWI / 20% Bloomberg US Agg',
    expenseRatio: 0.0005,
    annualTurnoverPct: 13,
    taxEfficiency: 'MEDIUM',
    performance: {
      ytd: 0.058,
      oneYear: 0.095,
      threeYear: 0.078,
      fiveYear: 0.088,
      tenYear: 0.084,
      sinceInception: 0.085,
      sharpeRatio: 0.85,
      sortinoRatio: 1.15,
      maxDrawdown: -0.30,
      maxDrawdownRecoveryDays: 380,
      beta: 0.78,
      alpha: 0.016,
      informationRatio: 0.48,
    },
    stressTests: [
      { scenario: '2008_FINANCIAL_CRISIS', scenarioLabel: '2008 Global Financial Crisis', portfolioReturn: -0.40, benchmarkReturn: -0.42, maxDrawdown: -0.46, recoveryMonths: 28 },
      { scenario: 'COVID_2020', scenarioLabel: 'COVID-19 Sell-off (Feb-Mar 2020)', portfolioReturn: -0.26, benchmarkReturn: -0.28, maxDrawdown: -0.30, recoveryMonths: 8 },
      { scenario: '2022_RATE_SHOCK', scenarioLabel: '2022 Interest Rate Shock', portfolioReturn: -0.19, benchmarkReturn: -0.21, maxDrawdown: -0.22, recoveryMonths: 15 },
      { scenario: 'EQUITY_BEAR_50', scenarioLabel: 'Equity Bear Market (-50%)', portfolioReturn: -0.38, benchmarkReturn: -0.42, maxDrawdown: -0.42, recoveryMonths: 30 },
    ],
    isActive: true,
    approvedForUse: true,
    minInvestmentAmount: cents(50000),
    vehicleType: 'ETF_ONLY',
  },

  // -----------------------------------------------------------------
  // 6. Farther All-Equity
  // -----------------------------------------------------------------
  {
    modelId: 'mdl-006-all-equity',
    firmId: FIRM_ID,
    name: 'Farther All-Equity',
    category: 'STRATEGIC',
    riskScore: 90,
    targetReturn: 0.098,
    targetVolatility: 0.17,
    allocation: [
      { ticker: 'VTI', assetClass: 'EQUITY_US_LARGE', targetPct: 42, minPct: 37, maxPct: 47, notes: 'US total stock market core' },
      { ticker: 'VXUS', assetClass: 'EQUITY_INTL_DEVELOPED', targetPct: 20, minPct: 16, maxPct: 24, notes: 'International developed broad exposure' },
      { ticker: 'VWO', assetClass: 'EQUITY_INTL_EMERGING', targetPct: 12, minPct: 8, maxPct: 16, notes: 'Emerging markets growth' },
      { ticker: 'VB', assetClass: 'EQUITY_US_SMALL', targetPct: 10, minPct: 7, maxPct: 14, notes: 'US small-cap for size premium' },
      { ticker: 'VO', assetClass: 'EQUITY_US_MID', targetPct: 8, minPct: 5, maxPct: 12, notes: 'US mid-cap growth tilt' },
      { ticker: 'VNQ', assetClass: 'REAL_ESTATE', targetPct: 5, minPct: 2, maxPct: 8, notes: 'REITs for real asset exposure' },
      { ticker: 'GLD', assetClass: 'GOLD', targetPct: 3, minPct: 0, maxPct: 6, notes: 'Gold hedge against tail risk' },
    ],
    inceptionDate: '2015-01-10',
    benchmarkIndex: 'MSCI ACWI IMI',
    expenseRatio: 0.0005,
    annualTurnoverPct: 9,
    taxEfficiency: 'HIGH',
    performance: {
      ytd: 0.072,
      oneYear: 0.112,
      threeYear: 0.091,
      fiveYear: 0.098,
      tenYear: 0.095,
      sinceInception: 0.094,
      sharpeRatio: 0.78,
      sortinoRatio: 1.05,
      maxDrawdown: -0.38,
      maxDrawdownRecoveryDays: 450,
      beta: 0.96,
      alpha: 0.012,
      informationRatio: 0.38,
    },
    stressTests: [
      { scenario: '2008_FINANCIAL_CRISIS', scenarioLabel: '2008 Global Financial Crisis', portfolioReturn: -0.50, benchmarkReturn: -0.52, maxDrawdown: -0.55, recoveryMonths: 36 },
      { scenario: 'COVID_2020', scenarioLabel: 'COVID-19 Sell-off (Feb-Mar 2020)', portfolioReturn: -0.32, benchmarkReturn: -0.34, maxDrawdown: -0.35, recoveryMonths: 9 },
      { scenario: '2000_DOTCOM', scenarioLabel: '2000 Dot-Com Crash', portfolioReturn: -0.42, benchmarkReturn: -0.45, maxDrawdown: -0.48, recoveryMonths: 42 },
      { scenario: 'EQUITY_BEAR_50', scenarioLabel: 'Equity Bear Market (-50%)', portfolioReturn: -0.48, benchmarkReturn: -0.50, maxDrawdown: -0.52, recoveryMonths: 36 },
    ],
    isActive: true,
    approvedForUse: true,
    minInvestmentAmount: cents(100000),
    vehicleType: 'ETF_ONLY',
  },

  // -----------------------------------------------------------------
  // 7. Farther Tax-Efficient Growth
  // -----------------------------------------------------------------
  {
    modelId: 'mdl-007-tax-efficient-growth',
    firmId: FIRM_ID,
    name: 'Farther Tax-Efficient Growth',
    category: 'TAX_EFFICIENT',
    riskScore: 60,
    targetReturn: 0.074,
    targetVolatility: 0.105,
    allocation: [
      { ticker: 'VTI', assetClass: 'EQUITY_US_LARGE', targetPct: 35, minPct: 30, maxPct: 40, notes: 'Low-turnover US broad market; tax-efficient index' },
      { ticker: 'VXUS', assetClass: 'EQUITY_INTL_DEVELOPED', targetPct: 15, minPct: 10, maxPct: 20, notes: 'Foreign tax credit eligible' },
      { ticker: 'VWO', assetClass: 'EQUITY_INTL_EMERGING', targetPct: 5, minPct: 2, maxPct: 8, notes: 'Emerging markets via tax-efficient ETF' },
      { ticker: 'VTEB', assetClass: 'FIXED_INCOME_MUNI', targetPct: 20, minPct: 15, maxPct: 25, notes: 'Tax-exempt municipal bonds for taxable accounts' },
      { ticker: 'MUB', assetClass: 'FIXED_INCOME_MUNI', targetPct: 10, minPct: 6, maxPct: 14, notes: 'National muni bond index for broad municipal exposure' },
      { ticker: 'SCHD', assetClass: 'EQUITY_US_LARGE', targetPct: 8, minPct: 4, maxPct: 12, notes: 'Qualified dividend focus for preferential tax rates' },
      { ticker: 'VNQ', assetClass: 'REAL_ESTATE', targetPct: 4, minPct: 2, maxPct: 7, notes: 'REITs best held in tax-deferred; shown for taxable overlay' },
      { ticker: 'SGOV', assetClass: 'CASH_EQUIVALENT', targetPct: 3, minPct: 0, maxPct: 5, notes: 'State-tax-exempt Treasury bills' },
    ],
    inceptionDate: '2019-07-01',
    benchmarkIndex: '60% MSCI ACWI / 40% Bloomberg Muni Bond',
    expenseRatio: 0.0005,
    annualTurnoverPct: 6,
    taxEfficiency: 'HIGH',
    performance: {
      ytd: 0.046,
      oneYear: 0.078,
      threeYear: 0.063,
      fiveYear: 0.071,
      tenYear: 0.068,
      sinceInception: 0.069,
      sharpeRatio: 0.90,
      sortinoRatio: 1.22,
      maxDrawdown: -0.20,
      maxDrawdownRecoveryDays: 260,
      beta: 0.58,
      alpha: 0.018,
      informationRatio: 0.55,
    },
    stressTests: [
      { scenario: '2008_FINANCIAL_CRISIS', scenarioLabel: '2008 Global Financial Crisis', portfolioReturn: -0.26, benchmarkReturn: -0.30, maxDrawdown: -0.30, recoveryMonths: 20 },
      { scenario: 'COVID_2020', scenarioLabel: 'COVID-19 Sell-off (Feb-Mar 2020)', portfolioReturn: -0.15, benchmarkReturn: -0.18, maxDrawdown: -0.18, recoveryMonths: 6 },
      { scenario: '2022_RATE_SHOCK', scenarioLabel: '2022 Interest Rate Shock', portfolioReturn: -0.13, benchmarkReturn: -0.16, maxDrawdown: -0.15, recoveryMonths: 11 },
    ],
    isActive: true,
    approvedForUse: true,
    minInvestmentAmount: cents(50000),
    vehicleType: 'ETF_ONLY',
  },

  // -----------------------------------------------------------------
  // 8. Farther ESG Balanced
  // -----------------------------------------------------------------
  {
    modelId: 'mdl-008-esg-balanced',
    firmId: FIRM_ID,
    name: 'Farther ESG Balanced',
    category: 'ESG',
    riskScore: 50,
    targetReturn: 0.065,
    targetVolatility: 0.09,
    allocation: [
      { ticker: 'ESGU', assetClass: 'EQUITY_US_LARGE', targetPct: 30, minPct: 25, maxPct: 35, notes: 'MSCI USA ESG Aware; excludes controversial weapons, tobacco' },
      { ticker: 'ESGD', assetClass: 'EQUITY_INTL_DEVELOPED', targetPct: 12, minPct: 8, maxPct: 16, notes: 'International developed ESG screened' },
      { ticker: 'ESGE', assetClass: 'EQUITY_INTL_EMERGING', targetPct: 5, minPct: 2, maxPct: 8, notes: 'Emerging markets ESG screened' },
      { ticker: 'EAGG', assetClass: 'FIXED_INCOME_CORP_IG', targetPct: 22, minPct: 18, maxPct: 26, notes: 'ESG-screened US aggregate bond' },
      { ticker: 'SUSC', assetClass: 'FIXED_INCOME_CORP_IG', targetPct: 12, minPct: 8, maxPct: 16, notes: 'Sustainable corporate bond ETF' },
      { ticker: 'ICLN', assetClass: 'EQUITY_SECTOR', targetPct: 5, minPct: 2, maxPct: 8, notes: 'Clean energy thematic exposure' },
      { ticker: 'VNQ', assetClass: 'REAL_ESTATE', targetPct: 4, minPct: 2, maxPct: 7, notes: 'Green REIT-tilted real estate' },
      { ticker: 'VTIP', assetClass: 'FIXED_INCOME_TIPS', targetPct: 7, minPct: 4, maxPct: 10, notes: 'TIPS for inflation protection' },
      { ticker: 'SGOV', assetClass: 'CASH_EQUIVALENT', targetPct: 3, minPct: 0, maxPct: 5, notes: 'Cash liquidity buffer' },
    ],
    inceptionDate: '2020-01-15',
    benchmarkIndex: '50% MSCI ACWI ESG Leaders / 50% Bloomberg MSCI US Agg ESG',
    expenseRatio: 0.0012,
    annualTurnoverPct: 14,
    taxEfficiency: 'MEDIUM',
    performance: {
      ytd: 0.039,
      oneYear: 0.068,
      threeYear: 0.054,
      fiveYear: 0.063,
      tenYear: 0.058,
      sinceInception: 0.060,
      sharpeRatio: 0.86,
      sortinoRatio: 1.14,
      maxDrawdown: -0.19,
      maxDrawdownRecoveryDays: 240,
      beta: 0.54,
      alpha: 0.011,
      informationRatio: 0.44,
    },
    stressTests: [
      { scenario: '2008_FINANCIAL_CRISIS', scenarioLabel: '2008 Global Financial Crisis', portfolioReturn: -0.25, benchmarkReturn: -0.28, maxDrawdown: -0.29, recoveryMonths: 19 },
      { scenario: 'COVID_2020', scenarioLabel: 'COVID-19 Sell-off (Feb-Mar 2020)', portfolioReturn: -0.15, benchmarkReturn: -0.17, maxDrawdown: -0.19, recoveryMonths: 6 },
      { scenario: '2022_RATE_SHOCK', scenarioLabel: '2022 Interest Rate Shock', portfolioReturn: -0.15, benchmarkReturn: -0.17, maxDrawdown: -0.18, recoveryMonths: 12 },
      { scenario: 'INFLATION_5PCT_3YR', scenarioLabel: 'Sustained 5% Inflation (3yr)', portfolioReturn: -0.08, benchmarkReturn: -0.10, maxDrawdown: -0.12, recoveryMonths: 15 },
    ],
    isActive: true,
    approvedForUse: true,
    minInvestmentAmount: cents(25000),
    vehicleType: 'ETF_ONLY',
  },

  // -----------------------------------------------------------------
  // 9. Farther Factor Tilt
  // -----------------------------------------------------------------
  {
    modelId: 'mdl-009-factor-tilt',
    firmId: FIRM_ID,
    name: 'Farther Factor Tilt',
    category: 'FACTOR',
    riskScore: 65,
    targetReturn: 0.082,
    targetVolatility: 0.12,
    allocation: [
      { ticker: 'VTV', assetClass: 'EQUITY_US_LARGE', targetPct: 18, minPct: 14, maxPct: 22, notes: 'US large-cap value factor tilt' },
      { ticker: 'MTUM', assetClass: 'EQUITY_US_LARGE', targetPct: 14, minPct: 10, maxPct: 18, notes: 'US momentum factor' },
      { ticker: 'QUAL', assetClass: 'EQUITY_US_LARGE', targetPct: 12, minPct: 8, maxPct: 16, notes: 'US quality factor (high ROE, low debt)' },
      { ticker: 'VBR', assetClass: 'EQUITY_US_SMALL', targetPct: 10, minPct: 6, maxPct: 14, notes: 'Small-cap value for size + value premium' },
      { ticker: 'VXUS', assetClass: 'EQUITY_INTL_DEVELOPED', targetPct: 12, minPct: 8, maxPct: 16, notes: 'International developed market exposure' },
      { ticker: 'VWO', assetClass: 'EQUITY_INTL_EMERGING', targetPct: 6, minPct: 3, maxPct: 9, notes: 'Emerging markets diversification' },
      { ticker: 'AGG', assetClass: 'FIXED_INCOME_GOVT', targetPct: 12, minPct: 8, maxPct: 16, notes: 'Core bond ballast' },
      { ticker: 'VCIT', assetClass: 'FIXED_INCOME_CORP_IG', targetPct: 8, minPct: 5, maxPct: 12, notes: 'Corporate bond income' },
      { ticker: 'GLD', assetClass: 'GOLD', targetPct: 4, minPct: 2, maxPct: 7, notes: 'Gold as diversification and inflation hedge' },
      { ticker: 'SGOV', assetClass: 'CASH_EQUIVALENT', targetPct: 4, minPct: 0, maxPct: 7, notes: 'Cash buffer for rebalancing' },
    ],
    inceptionDate: '2018-03-01',
    benchmarkIndex: '70% MSCI ACWI Multi-Factor / 30% Bloomberg US Agg',
    expenseRatio: 0.0010,
    annualTurnoverPct: 22,
    taxEfficiency: 'LOW',
    performance: {
      ytd: 0.055,
      oneYear: 0.089,
      threeYear: 0.073,
      fiveYear: 0.082,
      tenYear: 0.079,
      sinceInception: 0.080,
      sharpeRatio: 0.91,
      sortinoRatio: 1.28,
      maxDrawdown: -0.26,
      maxDrawdownRecoveryDays: 320,
      beta: 0.70,
      alpha: 0.022,
      informationRatio: 0.62,
    },
    stressTests: [
      { scenario: '2008_FINANCIAL_CRISIS', scenarioLabel: '2008 Global Financial Crisis', portfolioReturn: -0.34, benchmarkReturn: -0.38, maxDrawdown: -0.39, recoveryMonths: 24 },
      { scenario: 'COVID_2020', scenarioLabel: 'COVID-19 Sell-off (Feb-Mar 2020)', portfolioReturn: -0.22, benchmarkReturn: -0.25, maxDrawdown: -0.26, recoveryMonths: 8 },
      { scenario: '2022_RATE_SHOCK', scenarioLabel: '2022 Interest Rate Shock', portfolioReturn: -0.15, benchmarkReturn: -0.18, maxDrawdown: -0.18, recoveryMonths: 11 },
      { scenario: '1987_BLACK_MONDAY', scenarioLabel: '1987 Black Monday Crash', portfolioReturn: -0.28, benchmarkReturn: -0.32, maxDrawdown: -0.34, recoveryMonths: 16 },
    ],
    isActive: true,
    approvedForUse: true,
    minInvestmentAmount: cents(50000),
    vehicleType: 'ETF_ONLY',
  },

  // -----------------------------------------------------------------
  // 10. Farther Alternatives Plus
  // -----------------------------------------------------------------
  {
    modelId: 'mdl-010-alternatives-plus',
    firmId: FIRM_ID,
    name: 'Farther Alternatives Plus',
    category: 'ALTERNATIVES',
    riskScore: 55,
    targetReturn: 0.076,
    targetVolatility: 0.095,
    allocation: [
      { ticker: 'VTI', assetClass: 'EQUITY_US_LARGE', targetPct: 25, minPct: 20, maxPct: 30, notes: 'US equity core for growth' },
      { ticker: 'VXUS', assetClass: 'EQUITY_INTL_DEVELOPED', targetPct: 10, minPct: 6, maxPct: 14, notes: 'International equity diversification' },
      { ticker: 'VNQ', assetClass: 'REAL_ESTATE', targetPct: 10, minPct: 7, maxPct: 14, notes: 'Public REITs for real estate exposure' },
      { ticker: 'GLD', assetClass: 'GOLD', targetPct: 8, minPct: 5, maxPct: 12, notes: 'Gold as macro hedge and store of value' },
      { ticker: 'PDBC', assetClass: 'COMMODITIES', targetPct: 5, minPct: 2, maxPct: 8, notes: 'Diversified commodity exposure' },
      { ticker: 'APTS', assetClass: 'ALTERNATIVE_PE', targetPct: 5, minPct: 2, maxPct: 8, notes: 'Private equity access via interval fund structure' },
      { ticker: 'SRLN', assetClass: 'ALTERNATIVE_PRIVATE_CREDIT', targetPct: 7, minPct: 4, maxPct: 10, notes: 'Senior loans / private credit proxy' },
      { ticker: 'AGG', assetClass: 'FIXED_INCOME_GOVT', targetPct: 15, minPct: 10, maxPct: 20, notes: 'Core bond allocation for stability' },
      { ticker: 'VCIT', assetClass: 'FIXED_INCOME_CORP_IG', targetPct: 8, minPct: 5, maxPct: 12, notes: 'Investment-grade corporate bonds' },
      { ticker: 'SGOV', assetClass: 'CASH_EQUIVALENT', targetPct: 7, minPct: 3, maxPct: 10, notes: 'Higher cash buffer for illiquidity management' },
    ],
    inceptionDate: '2020-06-15',
    benchmarkIndex: '50% MSCI ACWI / 30% Bloomberg US Agg / 20% HFRI FoF Composite',
    expenseRatio: 0.0025,
    annualTurnoverPct: 18,
    taxEfficiency: 'LOW',
    performance: {
      ytd: 0.042,
      oneYear: 0.074,
      threeYear: 0.061,
      fiveYear: 0.070,
      tenYear: 0.066,
      sinceInception: 0.068,
      sharpeRatio: 0.94,
      sortinoRatio: 1.32,
      maxDrawdown: -0.16,
      maxDrawdownRecoveryDays: 200,
      beta: 0.48,
      alpha: 0.024,
      informationRatio: 0.68,
    },
    stressTests: [
      { scenario: '2008_FINANCIAL_CRISIS', scenarioLabel: '2008 Global Financial Crisis', portfolioReturn: -0.22, benchmarkReturn: -0.30, maxDrawdown: -0.26, recoveryMonths: 16 },
      { scenario: 'COVID_2020', scenarioLabel: 'COVID-19 Sell-off (Feb-Mar 2020)', portfolioReturn: -0.14, benchmarkReturn: -0.18, maxDrawdown: -0.18, recoveryMonths: 6 },
      { scenario: 'INFLATION_5PCT_3YR', scenarioLabel: 'Sustained 5% Inflation (3yr)', portfolioReturn: -0.04, benchmarkReturn: -0.10, maxDrawdown: -0.08, recoveryMonths: 6 },
      { scenario: 'DOLLAR_COLLAPSE', scenarioLabel: 'US Dollar Collapse Scenario', portfolioReturn: -0.06, benchmarkReturn: -0.14, maxDrawdown: -0.10, recoveryMonths: 10 },
    ],
    isActive: true,
    approvedForUse: true,
    minInvestmentAmount: cents(100000),
    vehicleType: 'MIXED',
  },
];

// =====================================================================
// Public API
// =====================================================================

/**
 * Returns all pre-defined investment models in the library.
 */
export function getAllModels(): InvestmentModel[] {
  return [...MODELS];
}

/**
 * Finds a single model by its unique identifier.
 *
 * @param id - The `modelId` to search for.
 * @returns The matching `InvestmentModel`, or `undefined` if not found.
 */
export function getModelById(id: string): InvestmentModel | undefined {
  return MODELS.find((m) => m.modelId === id);
}

/**
 * Returns all models whose risk score falls within +/-15 points
 * of the provided score.
 *
 * @param score - The target risk score (1-100).
 * @returns An array of models within the risk tolerance band, sorted
 *          by ascending risk score.
 */
export function getModelsForRiskScore(score: number): InvestmentModel[] {
  return MODELS
    .filter((m) => Math.abs(m.riskScore - score) <= 15)
    .sort((a, b) => a.riskScore - b.riskScore);
}

/**
 * Returns all models matching a given category classification.
 *
 * @param category - The `ModelCategory` to filter by.
 * @returns An array of models in the specified category, sorted
 *          by ascending risk score.
 */
export function getModelsByCategory(category: ModelCategory): InvestmentModel[] {
  return MODELS
    .filter((m) => m.category === category)
    .sort((a, b) => a.riskScore - b.riskScore);
}

// =====================================================================
// Backward-Compatible Aliases
// =====================================================================

/** @deprecated Use `getModelById` instead. */
export const getModel = getModelById;

/** @deprecated Use `getModelsForRiskScore` instead. */
export const matchModels = getModelsForRiskScore;

/** @deprecated Use `getAllModels` instead. */
export const listModels = getAllModels;

/** @deprecated Use `getAllModels` instead. */
export const getModels = getAllModels;
