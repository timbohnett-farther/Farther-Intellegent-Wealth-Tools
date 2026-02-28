/**
 * State income tax calculation engine — all 50 states + DC.
 * Pure function — no side effects, no DB calls.
 *
 * Handles:
 *   - No-income-tax states (AK, FL, NV, NH, SD, TN, TX, WA, WY)
 *   - Flat-rate states (AZ, CO, GA, ID, IL, IN, KY, MA, MI, MS, NC, ND, PA, UT)
 *   - Graduated-rate states (remaining 28 + DC)
 *   - Social Security exemptions
 *   - Pension / retirement income exemptions
 *   - Senior exemptions (age 65+)
 *   - State standard deductions
 */

import Decimal from 'decimal.js';
import type {
  StateTaxInput,
  StateTaxResult,
  StateTaxConfig,
  TaxBracket,
  FilingStatus,
} from '../types';

// ---------------------------------------------------------------------------
// State Tax Configuration — all 50 states + DC
// ---------------------------------------------------------------------------

export const STATE_TAX_CONFIG: Record<string, StateTaxConfig> = {
  // ========== NO INCOME TAX STATES ==========
  AK: {
    type: 'none',
    ssExempt: true,
    pensionExempt: true,
    retirementExempt: true,
  },
  FL: {
    type: 'none',
    ssExempt: true,
    pensionExempt: true,
    retirementExempt: true,
  },
  NV: {
    type: 'none',
    ssExempt: true,
    pensionExempt: true,
    retirementExempt: true,
  },
  NH: {
    // Dividends/interest only — simplified as 'none'
    type: 'none',
    ssExempt: true,
    pensionExempt: true,
    retirementExempt: true,
  },
  SD: {
    type: 'none',
    ssExempt: true,
    pensionExempt: true,
    retirementExempt: true,
  },
  TN: {
    // Dividends/interest only (phased out) — simplified as 'none'
    type: 'none',
    ssExempt: true,
    pensionExempt: true,
    retirementExempt: true,
  },
  TX: {
    type: 'none',
    ssExempt: true,
    pensionExempt: true,
    retirementExempt: true,
  },
  WA: {
    type: 'none',
    ssExempt: true,
    pensionExempt: true,
    retirementExempt: true,
  },
  WY: {
    type: 'none',
    ssExempt: true,
    pensionExempt: true,
    retirementExempt: true,
  },

  // ========== FLAT RATE STATES ==========
  AZ: {
    type: 'flat',
    rate: 0.025,
    ssExempt: true,
    pensionExempt: false,
    retirementExempt: false,
    standardDeduction: { single: 14_600, mfj: 29_200, mfs: 14_600, hoh: 21_900, qw: 29_200 },
  },
  CO: {
    type: 'flat',
    rate: 0.044,
    ssExempt: true,
    pensionExempt: 'partial',
    retirementExempt: 'partial',
    standardDeduction: { single: 14_600, mfj: 29_200, mfs: 14_600, hoh: 21_900, qw: 29_200 },
    seniorExemption: 20_000,
  },
  GA: {
    type: 'flat',
    rate: 0.0549,
    ssExempt: true,
    pensionExempt: 'partial',
    retirementExempt: 'partial',
    standardDeduction: { single: 5_400, mfj: 7_100, mfs: 3_550, hoh: 5_400, qw: 7_100 },
    seniorExemption: 65_000,
  },
  ID: {
    type: 'flat',
    rate: 0.058,
    ssExempt: true,
    pensionExempt: false,
    retirementExempt: false,
    standardDeduction: { single: 14_600, mfj: 29_200, mfs: 14_600, hoh: 21_900, qw: 29_200 },
  },
  IL: {
    type: 'flat',
    rate: 0.0495,
    ssExempt: true,
    pensionExempt: true,
    retirementExempt: true,
    personalExemption: { single: 2_625, mfj: 5_250, mfs: 2_625, hoh: 2_625, qw: 5_250 },
  },
  IN: {
    type: 'flat',
    rate: 0.0305,
    ssExempt: true,
    pensionExempt: false,
    retirementExempt: false,
    personalExemption: { single: 1_000, mfj: 2_000, mfs: 1_000, hoh: 1_000, qw: 2_000 },
  },
  KY: {
    type: 'flat',
    rate: 0.04,
    ssExempt: true,
    pensionExempt: 'partial',
    retirementExempt: 'partial',
    standardDeduction: { single: 3_160, mfj: 3_160, mfs: 3_160, hoh: 3_160, qw: 3_160 },
    seniorExemption: 31_110,
  },
  MA: {
    type: 'flat',
    rate: 0.05,
    ssExempt: true,
    pensionExempt: false,
    retirementExempt: false,
    personalExemption: { single: 4_400, mfj: 8_800, mfs: 4_400, hoh: 6_800, qw: 8_800 },
  },
  MI: {
    type: 'flat',
    rate: 0.0425,
    ssExempt: true,
    pensionExempt: 'partial',
    retirementExempt: 'partial',
    personalExemption: { single: 5_400, mfj: 10_800, mfs: 5_400, hoh: 5_400, qw: 10_800 },
    seniorExemption: 20_000,
  },
  MS: {
    type: 'flat',
    rate: 0.047,
    ssExempt: true,
    pensionExempt: true,
    retirementExempt: true,
    standardDeduction: { single: 2_300, mfj: 4_600, mfs: 2_300, hoh: 3_400, qw: 4_600 },
  },
  NC: {
    type: 'flat',
    rate: 0.045,
    ssExempt: true,
    pensionExempt: false,
    retirementExempt: false,
    standardDeduction: { single: 12_750, mfj: 25_500, mfs: 12_750, hoh: 19_125, qw: 25_500 },
  },
  ND: {
    type: 'flat',
    rate: 0.0195,
    ssExempt: true,
    pensionExempt: false,
    retirementExempt: false,
    standardDeduction: { single: 14_600, mfj: 29_200, mfs: 14_600, hoh: 21_900, qw: 29_200 },
  },
  PA: {
    type: 'flat',
    rate: 0.0307,
    ssExempt: true,
    pensionExempt: true,
    retirementExempt: true,
  },
  UT: {
    type: 'flat',
    rate: 0.0465,
    ssExempt: true,
    pensionExempt: false,
    retirementExempt: false,
    personalExemption: { single: 1_750, mfj: 3_500, mfs: 1_750, hoh: 1_750, qw: 3_500 },
  },

  // ========== GRADUATED RATE STATES ==========
  AL: {
    type: 'graduated',
    brackets: [
      { rate: 0.02, minIncome: 0, maxIncome: 1_000 },
      { rate: 0.04, minIncome: 1_000, maxIncome: 6_000 },
      { rate: 0.05, minIncome: 6_000, maxIncome: null },
    ],
    ssExempt: true,
    pensionExempt: 'partial',
    retirementExempt: false,
    standardDeduction: { single: 3_000, mfj: 8_500, mfs: 4_250, hoh: 5_250, qw: 8_500 },
    personalExemption: { single: 1_500, mfj: 3_000, mfs: 1_500, hoh: 3_000, qw: 3_000 },
    seniorExemption: 6_000,
  },
  AR: {
    type: 'graduated',
    brackets: [
      { rate: 0.02, minIncome: 0, maxIncome: 5_100 },
      { rate: 0.04, minIncome: 5_100, maxIncome: 12_199 },
      { rate: 0.044, minIncome: 12_199, maxIncome: null },
    ],
    ssExempt: true,
    pensionExempt: false,
    retirementExempt: 'partial',
    standardDeduction: { single: 2_340, mfj: 4_680, mfs: 2_340, hoh: 2_340, qw: 4_680 },
    seniorExemption: 6_000,
  },
  CA: {
    type: 'graduated',
    brackets: [
      { rate: 0.01, minIncome: 0, maxIncome: 20_824 },
      { rate: 0.02, minIncome: 20_824, maxIncome: 49_368 },
      { rate: 0.04, minIncome: 49_368, maxIncome: 77_918 },
      { rate: 0.06, minIncome: 77_918, maxIncome: 108_162 },
      { rate: 0.08, minIncome: 108_162, maxIncome: 136_700 },
      { rate: 0.093, minIncome: 136_700, maxIncome: 698_274 },
      { rate: 0.103, minIncome: 698_274, maxIncome: 837_922 },
      { rate: 0.113, minIncome: 837_922, maxIncome: 1_396_542 },
      { rate: 0.123, minIncome: 1_396_542, maxIncome: null },
    ],
    ssExempt: true,
    pensionExempt: false,
    retirementExempt: false,
    standardDeduction: { single: 5_540, mfj: 11_080, mfs: 5_540, hoh: 11_080, qw: 11_080 },
    seniorExemption: 144,
  },
  CT: {
    type: 'graduated',
    brackets: [
      { rate: 0.03, minIncome: 0, maxIncome: 20_000 },
      { rate: 0.05, minIncome: 20_000, maxIncome: 100_000 },
      { rate: 0.055, minIncome: 100_000, maxIncome: 200_000 },
      { rate: 0.06, minIncome: 200_000, maxIncome: 400_000 },
      { rate: 0.065, minIncome: 400_000, maxIncome: 800_000 },
      { rate: 0.069, minIncome: 800_000, maxIncome: 1_600_000 },
      { rate: 0.0699, minIncome: 1_600_000, maxIncome: null },
    ],
    ssExempt: true,
    pensionExempt: false,
    retirementExempt: false,
    personalExemption: { single: 15_000, mfj: 24_000, mfs: 12_000, hoh: 19_000, qw: 24_000 },
  },
  DC: {
    type: 'graduated',
    brackets: [
      { rate: 0.04, minIncome: 0, maxIncome: 10_000 },
      { rate: 0.06, minIncome: 10_000, maxIncome: 40_000 },
      { rate: 0.065, minIncome: 40_000, maxIncome: 60_000 },
      { rate: 0.085, minIncome: 60_000, maxIncome: 250_000 },
      { rate: 0.0925, minIncome: 250_000, maxIncome: 500_000 },
      { rate: 0.0975, minIncome: 500_000, maxIncome: 1_000_000 },
      { rate: 0.1075, minIncome: 1_000_000, maxIncome: null },
    ],
    ssExempt: true,
    pensionExempt: false,
    retirementExempt: false,
    standardDeduction: { single: 14_600, mfj: 29_200, mfs: 14_600, hoh: 21_900, qw: 29_200 },
  },
  DE: {
    type: 'graduated',
    brackets: [
      { rate: 0.022, minIncome: 0, maxIncome: 5_000 },
      { rate: 0.039, minIncome: 5_000, maxIncome: 10_000 },
      { rate: 0.048, minIncome: 10_000, maxIncome: 20_000 },
      { rate: 0.052, minIncome: 20_000, maxIncome: 25_000 },
      { rate: 0.0555, minIncome: 25_000, maxIncome: 60_000 },
      { rate: 0.066, minIncome: 60_000, maxIncome: null },
    ],
    ssExempt: true,
    pensionExempt: 'partial',
    retirementExempt: 'partial',
    standardDeduction: { single: 3_250, mfj: 6_500, mfs: 3_250, hoh: 3_250, qw: 6_500 },
    personalExemption: { single: 110, mfj: 220, mfs: 110, hoh: 110, qw: 220 },
    seniorExemption: 12_500,
  },
  HI: {
    type: 'graduated',
    brackets: [
      { rate: 0.014, minIncome: 0, maxIncome: 4_800 },
      { rate: 0.032, minIncome: 4_800, maxIncome: 9_600 },
      { rate: 0.055, minIncome: 9_600, maxIncome: 19_200 },
      { rate: 0.064, minIncome: 19_200, maxIncome: 28_800 },
      { rate: 0.068, minIncome: 28_800, maxIncome: 38_400 },
      { rate: 0.072, minIncome: 38_400, maxIncome: 48_000 },
      { rate: 0.076, minIncome: 48_000, maxIncome: 72_000 },
      { rate: 0.079, minIncome: 72_000, maxIncome: 96_000 },
      { rate: 0.0825, minIncome: 96_000, maxIncome: 300_000 },
      { rate: 0.09, minIncome: 300_000, maxIncome: 350_000 },
      { rate: 0.10, minIncome: 350_000, maxIncome: 400_000 },
      { rate: 0.11, minIncome: 400_000, maxIncome: null },
    ],
    ssExempt: true,
    pensionExempt: false,
    retirementExempt: false,
    standardDeduction: { single: 2_200, mfj: 4_400, mfs: 2_200, hoh: 3_212, qw: 4_400 },
    personalExemption: { single: 1_144, mfj: 2_288, mfs: 1_144, hoh: 1_144, qw: 2_288 },
  },
  IA: {
    type: 'graduated',
    brackets: [
      { rate: 0.044, minIncome: 0, maxIncome: 6_210 },
      { rate: 0.0482, minIncome: 6_210, maxIncome: 31_050 },
      { rate: 0.057, minIncome: 31_050, maxIncome: 62_100 },
      { rate: 0.06, minIncome: 62_100, maxIncome: null },
    ],
    ssExempt: true,
    pensionExempt: 'partial',
    retirementExempt: 'partial',
    standardDeduction: { single: 2_210, mfj: 5_450, mfs: 2_210, hoh: 5_450, qw: 5_450 },
    seniorExemption: 6_000,
  },
  KS: {
    type: 'graduated',
    brackets: [
      { rate: 0.031, minIncome: 0, maxIncome: 30_000 },
      { rate: 0.0525, minIncome: 30_000, maxIncome: 60_000 },
      { rate: 0.057, minIncome: 60_000, maxIncome: null },
    ],
    ssExempt: true,
    pensionExempt: false,
    retirementExempt: false,
    standardDeduction: { single: 3_500, mfj: 8_000, mfs: 4_000, hoh: 6_000, qw: 8_000 },
    personalExemption: { single: 2_250, mfj: 4_500, mfs: 2_250, hoh: 2_250, qw: 4_500 },
  },
  LA: {
    type: 'graduated',
    brackets: [
      { rate: 0.0185, minIncome: 0, maxIncome: 12_500 },
      { rate: 0.035, minIncome: 12_500, maxIncome: 50_000 },
      { rate: 0.0425, minIncome: 50_000, maxIncome: null },
    ],
    ssExempt: true,
    pensionExempt: true,
    retirementExempt: 'partial',
    standardDeduction: { single: 4_500, mfj: 9_000, mfs: 4_500, hoh: 4_500, qw: 9_000 },
    personalExemption: { single: 4_500, mfj: 9_000, mfs: 4_500, hoh: 4_500, qw: 9_000 },
    seniorExemption: 6_000,
  },
  ME: {
    type: 'graduated',
    brackets: [
      { rate: 0.058, minIncome: 0, maxIncome: 26_050 },
      { rate: 0.0675, minIncome: 26_050, maxIncome: 61_600 },
      { rate: 0.0715, minIncome: 61_600, maxIncome: null },
    ],
    ssExempt: true,
    pensionExempt: 'partial',
    retirementExempt: false,
    standardDeduction: { single: 14_600, mfj: 29_200, mfs: 14_600, hoh: 21_900, qw: 29_200 },
    seniorExemption: 10_000,
  },
  MD: {
    type: 'graduated',
    brackets: [
      { rate: 0.02, minIncome: 0, maxIncome: 1_000 },
      { rate: 0.03, minIncome: 1_000, maxIncome: 2_000 },
      { rate: 0.04, minIncome: 2_000, maxIncome: 3_000 },
      { rate: 0.0475, minIncome: 3_000, maxIncome: 100_000 },
      { rate: 0.05, minIncome: 100_000, maxIncome: 125_000 },
      { rate: 0.0525, minIncome: 125_000, maxIncome: 150_000 },
      { rate: 0.055, minIncome: 150_000, maxIncome: 250_000 },
      { rate: 0.0575, minIncome: 250_000, maxIncome: null },
    ],
    ssExempt: true,
    pensionExempt: 'partial',
    retirementExempt: 'partial',
    standardDeduction: { single: 2_550, mfj: 5_150, mfs: 2_550, hoh: 5_150, qw: 5_150 },
    personalExemption: { single: 3_200, mfj: 6_400, mfs: 3_200, hoh: 3_200, qw: 6_400 },
    seniorExemption: 1_000,
  },
  MN: {
    type: 'graduated',
    brackets: [
      { rate: 0.0535, minIncome: 0, maxIncome: 43_890 },
      { rate: 0.068, minIncome: 43_890, maxIncome: 174_610 },
      { rate: 0.0785, minIncome: 174_610, maxIncome: 304_970 },
      { rate: 0.0985, minIncome: 304_970, maxIncome: null },
    ],
    ssExempt: true,
    pensionExempt: false,
    retirementExempt: false,
    standardDeduction: { single: 14_575, mfj: 29_200, mfs: 14_575, hoh: 21_900, qw: 29_200 },
  },
  MO: {
    type: 'graduated',
    brackets: [
      { rate: 0.02, minIncome: 0, maxIncome: 1_207 },
      { rate: 0.025, minIncome: 1_207, maxIncome: 2_414 },
      { rate: 0.03, minIncome: 2_414, maxIncome: 3_621 },
      { rate: 0.035, minIncome: 3_621, maxIncome: 4_828 },
      { rate: 0.04, minIncome: 4_828, maxIncome: 6_035 },
      { rate: 0.045, minIncome: 6_035, maxIncome: 7_242 },
      { rate: 0.0495, minIncome: 7_242, maxIncome: null },
    ],
    ssExempt: true,
    pensionExempt: 'partial',
    retirementExempt: false,
    standardDeduction: { single: 14_600, mfj: 29_200, mfs: 14_600, hoh: 21_900, qw: 29_200 },
    seniorExemption: 6_000,
  },
  MT: {
    type: 'graduated',
    brackets: [
      { rate: 0.047, minIncome: 0, maxIncome: 20_500 },
      { rate: 0.057, minIncome: 20_500, maxIncome: 36_000 },
      { rate: 0.0675, minIncome: 36_000, maxIncome: null },
    ],
    ssExempt: true,
    pensionExempt: 'partial',
    retirementExempt: 'partial',
    standardDeduction: { single: 5_540, mfj: 11_080, mfs: 5_540, hoh: 8_310, qw: 11_080 },
    seniorExemption: 5_500,
  },
  NE: {
    type: 'graduated',
    brackets: [
      { rate: 0.0246, minIncome: 0, maxIncome: 7_390 },
      { rate: 0.0351, minIncome: 7_390, maxIncome: 44_340 },
      { rate: 0.0501, minIncome: 44_340, maxIncome: 71_160 },
      { rate: 0.0664, minIncome: 71_160, maxIncome: null },
    ],
    ssExempt: true,
    pensionExempt: false,
    retirementExempt: false,
    standardDeduction: { single: 7_900, mfj: 15_800, mfs: 7_900, hoh: 11_600, qw: 15_800 },
    personalExemption: { single: 157, mfj: 314, mfs: 157, hoh: 157, qw: 314 },
  },
  NJ: {
    type: 'graduated',
    brackets: [
      { rate: 0.014, minIncome: 0, maxIncome: 20_000 },
      { rate: 0.0175, minIncome: 20_000, maxIncome: 35_000 },
      { rate: 0.035, minIncome: 35_000, maxIncome: 40_000 },
      { rate: 0.05525, minIncome: 40_000, maxIncome: 75_000 },
      { rate: 0.0637, minIncome: 75_000, maxIncome: 500_000 },
      { rate: 0.0897, minIncome: 500_000, maxIncome: 1_000_000 },
      { rate: 0.1075, minIncome: 1_000_000, maxIncome: null },
    ],
    ssExempt: true,
    pensionExempt: 'partial',
    retirementExempt: 'partial',
    personalExemption: { single: 1_000, mfj: 2_000, mfs: 1_000, hoh: 1_000, qw: 2_000 },
    seniorExemption: 1_000,
  },
  NM: {
    type: 'graduated',
    brackets: [
      { rate: 0.017, minIncome: 0, maxIncome: 5_500 },
      { rate: 0.032, minIncome: 5_500, maxIncome: 11_000 },
      { rate: 0.047, minIncome: 11_000, maxIncome: 16_000 },
      { rate: 0.049, minIncome: 16_000, maxIncome: 210_000 },
      { rate: 0.059, minIncome: 210_000, maxIncome: null },
    ],
    ssExempt: true,
    pensionExempt: false,
    retirementExempt: false,
    standardDeduction: { single: 14_600, mfj: 29_200, mfs: 14_600, hoh: 21_900, qw: 29_200 },
    seniorExemption: 8_000,
  },
  NY: {
    type: 'graduated',
    brackets: [
      { rate: 0.04, minIncome: 0, maxIncome: 17_150 },
      { rate: 0.045, minIncome: 17_150, maxIncome: 23_600 },
      { rate: 0.0525, minIncome: 23_600, maxIncome: 27_900 },
      { rate: 0.0585, minIncome: 27_900, maxIncome: 161_550 },
      { rate: 0.0625, minIncome: 161_550, maxIncome: 323_200 },
      { rate: 0.0685, minIncome: 323_200, maxIncome: 2_155_350 },
      { rate: 0.0965, minIncome: 2_155_350, maxIncome: 5_000_000 },
      { rate: 0.103, minIncome: 5_000_000, maxIncome: 25_000_000 },
      { rate: 0.109, minIncome: 25_000_000, maxIncome: null },
    ],
    ssExempt: true,
    pensionExempt: 'partial',
    retirementExempt: 'partial',
    standardDeduction: { single: 8_000, mfj: 16_050, mfs: 8_000, hoh: 11_200, qw: 16_050 },
    seniorExemption: 20_000,
  },
  OH: {
    type: 'graduated',
    brackets: [
      { rate: 0.0, minIncome: 0, maxIncome: 26_050 },
      { rate: 0.0275, minIncome: 26_050, maxIncome: 100_000 },
      { rate: 0.035, minIncome: 100_000, maxIncome: null },
    ],
    ssExempt: true,
    pensionExempt: false,
    retirementExempt: false,
    personalExemption: { single: 2_400, mfj: 4_800, mfs: 2_400, hoh: 2_400, qw: 4_800 },
    seniorExemption: 50,
  },
  OK: {
    type: 'graduated',
    brackets: [
      { rate: 0.0025, minIncome: 0, maxIncome: 2_300 },
      { rate: 0.0075, minIncome: 2_300, maxIncome: 5_700 },
      { rate: 0.0175, minIncome: 5_700, maxIncome: 8_700 },
      { rate: 0.0275, minIncome: 8_700, maxIncome: 11_200 },
      { rate: 0.0375, minIncome: 11_200, maxIncome: 13_550 },
      { rate: 0.0475, minIncome: 13_550, maxIncome: null },
    ],
    ssExempt: true,
    pensionExempt: 'partial',
    retirementExempt: 'partial',
    standardDeduction: { single: 6_350, mfj: 12_700, mfs: 6_350, hoh: 9_350, qw: 12_700 },
    personalExemption: { single: 1_000, mfj: 2_000, mfs: 1_000, hoh: 1_000, qw: 2_000 },
    seniorExemption: 10_000,
  },
  OR: {
    type: 'graduated',
    brackets: [
      { rate: 0.0475, minIncome: 0, maxIncome: 7_500 },
      { rate: 0.0675, minIncome: 7_500, maxIncome: 18_900 },
      { rate: 0.0875, minIncome: 18_900, maxIncome: 250_000 },
      { rate: 0.099, minIncome: 250_000, maxIncome: null },
    ],
    ssExempt: true,
    pensionExempt: false,
    retirementExempt: false,
    standardDeduction: { single: 2_745, mfj: 5_495, mfs: 2_745, hoh: 4_435, qw: 5_495 },
    personalExemption: { single: 236, mfj: 472, mfs: 236, hoh: 236, qw: 472 },
    seniorExemption: 1_200,
  },
  RI: {
    type: 'graduated',
    brackets: [
      { rate: 0.0375, minIncome: 0, maxIncome: 73_450 },
      { rate: 0.0475, minIncome: 73_450, maxIncome: 166_950 },
      { rate: 0.0599, minIncome: 166_950, maxIncome: null },
    ],
    ssExempt: true,
    pensionExempt: false,
    retirementExempt: false,
    standardDeduction: { single: 10_550, mfj: 21_150, mfs: 10_550, hoh: 15_850, qw: 21_150 },
    personalExemption: { single: 4_700, mfj: 9_400, mfs: 4_700, hoh: 4_700, qw: 9_400 },
  },
  SC: {
    type: 'graduated',
    brackets: [
      { rate: 0.0, minIncome: 0, maxIncome: 3_460 },
      { rate: 0.03, minIncome: 3_460, maxIncome: 6_920 },
      { rate: 0.04, minIncome: 6_920, maxIncome: 10_380 },
      { rate: 0.05, minIncome: 10_380, maxIncome: 13_840 },
      { rate: 0.06, minIncome: 13_840, maxIncome: 17_300 },
      { rate: 0.065, minIncome: 17_300, maxIncome: null },
    ],
    ssExempt: true,
    pensionExempt: 'partial',
    retirementExempt: 'partial',
    standardDeduction: { single: 14_600, mfj: 29_200, mfs: 14_600, hoh: 21_900, qw: 29_200 },
    seniorExemption: 15_000,
  },
  VT: {
    type: 'graduated',
    brackets: [
      { rate: 0.0335, minIncome: 0, maxIncome: 45_400 },
      { rate: 0.066, minIncome: 45_400, maxIncome: 110_050 },
      { rate: 0.076, minIncome: 110_050, maxIncome: 229_550 },
      { rate: 0.0875, minIncome: 229_550, maxIncome: null },
    ],
    ssExempt: true,
    pensionExempt: false,
    retirementExempt: false,
    standardDeduction: { single: 7_000, mfj: 14_600, mfs: 7_000, hoh: 10_750, qw: 14_600 },
    personalExemption: { single: 4_850, mfj: 9_700, mfs: 4_850, hoh: 4_850, qw: 9_700 },
  },
  VA: {
    type: 'graduated',
    brackets: [
      { rate: 0.02, minIncome: 0, maxIncome: 3_000 },
      { rate: 0.03, minIncome: 3_000, maxIncome: 5_000 },
      { rate: 0.05, minIncome: 5_000, maxIncome: 17_000 },
      { rate: 0.0575, minIncome: 17_000, maxIncome: null },
    ],
    ssExempt: true,
    pensionExempt: false,
    retirementExempt: false,
    standardDeduction: { single: 8_000, mfj: 16_000, mfs: 8_000, hoh: 8_000, qw: 16_000 },
    personalExemption: { single: 930, mfj: 1_860, mfs: 930, hoh: 930, qw: 1_860 },
    seniorExemption: 12_000,
  },
  WI: {
    type: 'graduated',
    brackets: [
      { rate: 0.035, minIncome: 0, maxIncome: 14_320 },
      { rate: 0.044, minIncome: 14_320, maxIncome: 28_640 },
      { rate: 0.053, minIncome: 28_640, maxIncome: 315_310 },
      { rate: 0.0765, minIncome: 315_310, maxIncome: null },
    ],
    ssExempt: true,
    pensionExempt: false,
    retirementExempt: false,
    standardDeduction: { single: 12_760, mfj: 23_620, mfs: 11_090, hoh: 16_740, qw: 23_620 },
  },
  WV: {
    type: 'graduated',
    brackets: [
      { rate: 0.0236, minIncome: 0, maxIncome: 10_000 },
      { rate: 0.0315, minIncome: 10_000, maxIncome: 25_000 },
      { rate: 0.0354, minIncome: 25_000, maxIncome: 40_000 },
      { rate: 0.0472, minIncome: 40_000, maxIncome: 60_000 },
      { rate: 0.0512, minIncome: 60_000, maxIncome: null },
    ],
    ssExempt: true,
    pensionExempt: false,
    retirementExempt: false,
    personalExemption: { single: 2_000, mfj: 4_000, mfs: 2_000, hoh: 2_000, qw: 4_000 },
  },
};

// ---------------------------------------------------------------------------
// Default deduction fallback
// ---------------------------------------------------------------------------

const DEFAULT_STANDARD_DEDUCTION: Record<FilingStatus, number> = {
  single: 5_000,
  mfj: 8_000,
  mfs: 4_000,
  hoh: 6_500,
  qw: 8_000,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Compute tax via graduated brackets (same algorithm as federal).
 * Stacks income through each bracket sequentially.
 */
function computeGraduatedTax(
  taxableIncome: Decimal,
  brackets: TaxBracket[],
): Decimal {
  let remaining = taxableIncome;
  let tax = new Decimal(0);

  for (const bracket of brackets) {
    if (remaining.lte(0)) break;

    const bracketMin = new Decimal(bracket.minIncome);
    const bracketMax =
      bracket.maxIncome !== null
        ? new Decimal(bracket.maxIncome)
        : new Decimal(Infinity);

    const bracketWidth = bracketMax.minus(bracketMin);
    const incomeInBracket = Decimal.min(remaining, bracketWidth);
    const rate = new Decimal(bracket.rate);

    tax = tax.plus(incomeInBracket.mul(rate));
    remaining = remaining.minus(incomeInBracket);
  }

  return tax;
}

/**
 * Get the state standard deduction for the given filing status.
 * Falls back to a reasonable default if the state does not define one.
 */
function getStateDeduction(
  config: StateTaxConfig,
  filingStatus: FilingStatus,
): Decimal {
  if (config.standardDeduction) {
    const amount = config.standardDeduction[filingStatus];
    if (amount !== undefined) {
      return new Decimal(amount);
    }
  }
  return new Decimal(DEFAULT_STANDARD_DEDUCTION[filingStatus]);
}

/**
 * Get the personal exemption amount for the given filing status.
 * Returns 0 if the state does not define personal exemptions.
 */
function getPersonalExemption(
  config: StateTaxConfig,
  filingStatus: FilingStatus,
): Decimal {
  if (config.personalExemption) {
    const amount = config.personalExemption[filingStatus];
    if (amount !== undefined) {
      return new Decimal(amount);
    }
  }
  return new Decimal(0);
}

// ---------------------------------------------------------------------------
// Massachusetts surtax helper
// ---------------------------------------------------------------------------

const MA_SURTAX_RATE = new Decimal('0.04');
const MA_SURTAX_THRESHOLD = new Decimal(1_000_000);

// ---------------------------------------------------------------------------
// Mississippi first $10K exemption
// ---------------------------------------------------------------------------

const MS_EXEMPT_INCOME = new Decimal(10_000);

// ---------------------------------------------------------------------------
// Main calculation
// ---------------------------------------------------------------------------

/**
 * Calculate state income tax for any US state + DC.
 *
 * Pure function — no side effects.
 */
export function calculateStateTax(input: StateTaxInput): StateTaxResult {
  const {
    agi,
    state,
    filingStatus,
    ssIncome,
    pensionIncome,
    retirementDistributions,
    age,
  } = input;

  const stateCode = state.toUpperCase();
  const config = STATE_TAX_CONFIG[stateCode];

  // Unknown state — treat as no tax and note it
  if (!config) {
    return {
      stateAGI: agi,
      stateDeduction: 0,
      stateTaxableIncome: agi,
      stateTax: 0,
      effectiveRate: 0,
      notes: [`Unknown state code: ${stateCode}. No state tax calculated.`],
    };
  }

  // ------------------------------------------------------------------
  // 1. No-income-tax states
  // ------------------------------------------------------------------
  if (config.type === 'none') {
    return {
      stateAGI: agi,
      stateDeduction: 0,
      stateTaxableIncome: 0,
      stateTax: 0,
      effectiveRate: 0,
      notes: [`${stateCode} has no state income tax.`],
    };
  }

  // ------------------------------------------------------------------
  // 2. Compute state AGI with exemptions
  // ------------------------------------------------------------------
  const notes: string[] = [];
  let stateAGI = new Decimal(agi);

  // Social Security exemption
  if (config.ssExempt && ssIncome > 0) {
    stateAGI = stateAGI.minus(ssIncome);
    notes.push(`Social Security income ($${ssIncome.toLocaleString()}) exempt from ${stateCode} tax.`);
  }

  // Pension exemption
  if (config.pensionExempt === true && pensionIncome > 0) {
    stateAGI = stateAGI.minus(pensionIncome);
    notes.push(`Pension income ($${pensionIncome.toLocaleString()}) fully exempt from ${stateCode} tax.`);
  } else if (config.pensionExempt === 'partial' && pensionIncome > 0) {
    // Partial pension exemption — use senior exemption amount if available, else $20K
    const exemptionLimit = config.seniorExemption ?? 20_000;
    const exemptAmount = Math.min(pensionIncome, exemptionLimit);
    stateAGI = stateAGI.minus(exemptAmount);
    notes.push(
      `Pension income: $${exemptAmount.toLocaleString()} of $${pensionIncome.toLocaleString()} exempt from ${stateCode} tax (partial exemption up to $${exemptionLimit.toLocaleString()}).`,
    );
  }

  // Retirement distribution exemption
  if (config.retirementExempt === true && retirementDistributions > 0) {
    stateAGI = stateAGI.minus(retirementDistributions);
    notes.push(
      `Retirement distributions ($${retirementDistributions.toLocaleString()}) fully exempt from ${stateCode} tax.`,
    );
  } else if (config.retirementExempt === 'partial' && retirementDistributions > 0) {
    const exemptionLimit = config.seniorExemption ?? 20_000;
    // Don't double-count with pension: reduce by remaining exemption after pension
    const pensionExemptUsed =
      config.pensionExempt === 'partial'
        ? Math.min(pensionIncome, exemptionLimit)
        : 0;
    const remainingExemption = Math.max(exemptionLimit - pensionExemptUsed, 0);
    const exemptAmount = Math.min(retirementDistributions, remainingExemption);
    if (exemptAmount > 0) {
      stateAGI = stateAGI.minus(exemptAmount);
      notes.push(
        `Retirement distributions: $${exemptAmount.toLocaleString()} of $${retirementDistributions.toLocaleString()} exempt from ${stateCode} tax (partial exemption).`,
      );
    }
  }

  // Floor at 0
  stateAGI = Decimal.max(stateAGI, 0);

  // ------------------------------------------------------------------
  // 3. Apply state standard deduction and personal exemption
  // ------------------------------------------------------------------
  const deduction = getStateDeduction(config, filingStatus);
  const personalExemption = getPersonalExemption(config, filingStatus);
  const totalDeduction = deduction.plus(personalExemption);

  let taxableIncome = Decimal.max(stateAGI.minus(totalDeduction), 0);

  // ------------------------------------------------------------------
  // 4. Apply senior exemption (age 65+) where applicable
  // ------------------------------------------------------------------
  const isSenior = age >= 65;
  if (isSenior && config.seniorExemption && config.seniorExemption > 0) {
    // Some states use seniorExemption as an additional deduction for seniors
    // (distinct from retirement/pension partial exemptions handled above).
    // We apply an additional senior deduction here only for states that
    // explicitly model it as a tax-filing deduction rather than an
    // income-type exemption. To avoid double-counting with the partial
    // pension/retirement exemptions that already used seniorExemption as
    // a cap, we apply the senior deduction only if the state doesn't have
    // partial pension or retirement exemptions that already consumed it.
    const alreadyUsedAsCap =
      config.pensionExempt === 'partial' || config.retirementExempt === 'partial';
    if (!alreadyUsedAsCap) {
      const seniorDeduction = new Decimal(config.seniorExemption);
      taxableIncome = Decimal.max(taxableIncome.minus(seniorDeduction), 0);
      notes.push(
        `Senior exemption of $${config.seniorExemption.toLocaleString()} applied (age ${age}).`,
      );
    }
  }

  // ------------------------------------------------------------------
  // 5. Calculate tax based on type
  // ------------------------------------------------------------------
  let stateTax = new Decimal(0);

  if (config.type === 'flat') {
    const rate = new Decimal(config.rate!);

    // Mississippi: flat rate applies only to income above $10,000
    if (stateCode === 'MS') {
      const msTaxable = Decimal.max(taxableIncome.minus(MS_EXEMPT_INCOME), 0);
      stateTax = msTaxable.mul(rate);
      if (taxableIncome.gt(0)) {
        notes.push(`Mississippi: flat ${(config.rate! * 100).toFixed(1)}% applied to income above $10,000.`);
      }
    } else {
      stateTax = taxableIncome.mul(rate);
    }

    // Massachusetts millionaire surtax: additional 4% on income over $1M
    if (stateCode === 'MA') {
      const maAGI = new Decimal(agi);
      if (maAGI.gt(MA_SURTAX_THRESHOLD)) {
        const surtax = maAGI.minus(MA_SURTAX_THRESHOLD).mul(MA_SURTAX_RATE);
        stateTax = stateTax.plus(surtax);
        notes.push(
          `Massachusetts millionaire surtax: additional 4% on income above $1,000,000.`,
        );
      }
    }
  } else if (config.type === 'graduated') {
    stateTax = computeGraduatedTax(taxableIncome, config.brackets!);
  }

  // Floor at 0
  stateTax = Decimal.max(stateTax, 0);

  // ------------------------------------------------------------------
  // 6. Compute effective rate
  // ------------------------------------------------------------------
  const agiDecimal = new Decimal(agi);
  const effectiveRate = agiDecimal.gt(0)
    ? stateTax.div(agiDecimal).toNumber()
    : 0;

  // ------------------------------------------------------------------
  // 7. Return result
  // ------------------------------------------------------------------
  return {
    stateAGI: stateAGI.toNumber(),
    stateDeduction: totalDeduction.toNumber(),
    stateTaxableIncome: taxableIncome.toNumber(),
    stateTax: stateTax.toNumber(),
    effectiveRate,
    notes,
  };
}
