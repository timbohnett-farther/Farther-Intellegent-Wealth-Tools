import { FilingStatus } from '../types';

interface TaxBracket {
  min: number;
  max: number;
  rate: number;
}

export const FEDERAL_TAX_BRACKETS_2025: Record<FilingStatus, TaxBracket[]> = {
  single: [
    { min: 0, max: 11925, rate: 0.10 },
    { min: 11925, max: 48475, rate: 0.12 },
    { min: 48475, max: 103350, rate: 0.22 },
    { min: 103350, max: 197300, rate: 0.24 },
    { min: 197300, max: 250525, rate: 0.32 },
    { min: 250525, max: 626350, rate: 0.35 },
    { min: 626350, max: Infinity, rate: 0.37 },
  ],
  mfj: [
    { min: 0, max: 23850, rate: 0.10 },
    { min: 23850, max: 96950, rate: 0.12 },
    { min: 96950, max: 206700, rate: 0.22 },
    { min: 206700, max: 394600, rate: 0.24 },
    { min: 394600, max: 501050, rate: 0.32 },
    { min: 501050, max: 751600, rate: 0.35 },
    { min: 751600, max: Infinity, rate: 0.37 },
  ],
  mfs: [
    { min: 0, max: 11925, rate: 0.10 },
    { min: 11925, max: 48475, rate: 0.12 },
    { min: 48475, max: 103350, rate: 0.22 },
    { min: 103350, max: 197300, rate: 0.24 },
    { min: 197300, max: 250525, rate: 0.32 },
    { min: 250525, max: 375800, rate: 0.35 },
    { min: 375800, max: Infinity, rate: 0.37 },
  ],
  hoh: [
    { min: 0, max: 17000, rate: 0.10 },
    { min: 17000, max: 64850, rate: 0.12 },
    { min: 64850, max: 103350, rate: 0.22 },
    { min: 103350, max: 197300, rate: 0.24 },
    { min: 197300, max: 250500, rate: 0.32 },
    { min: 250500, max: 626350, rate: 0.35 },
    { min: 626350, max: Infinity, rate: 0.37 },
  ],
};

export const LTCG_THRESHOLDS_2025: Record<FilingStatus, { zero: number; fifteen: number }> = {
  single: { zero: 48350, fifteen: 533400 },
  mfj: { zero: 96700, fifteen: 600050 },
  mfs: { zero: 48350, fifteen: 300025 },
  hoh: { zero: 64750, fifteen: 566700 },
};

export const NIIT_THRESHOLDS: Record<FilingStatus, number> = {
  single: 200000,
  mfj: 250000,
  mfs: 125000,
  hoh: 200000,
};

export function getMarginalOrdinaryRate(income: number, status: FilingStatus): number {
  const brackets = FEDERAL_TAX_BRACKETS_2025[status];
  for (let i = brackets.length - 1; i >= 0; i--) {
    if (income > brackets[i].min) return brackets[i].rate;
  }
  return brackets[0].rate;
}

export function getLTCGRate(income: number, status: FilingStatus): number {
  const thresholds = LTCG_THRESHOLDS_2025[status];
  if (income <= thresholds.zero) return 0;
  if (income <= thresholds.fifteen) return 0.15;
  return 0.20;
}

export function getNIITRate(income: number, status: FilingStatus): number {
  return income > NIIT_THRESHOLDS[status] ? 0.038 : 0;
}

export function getBlended1256Rate(
  ltcgRate: number,
  stcgRate: number,
  niitRate: number
): number {
  return 0.60 * (ltcgRate + niitRate) + 0.40 * (stcgRate + niitRate);
}
