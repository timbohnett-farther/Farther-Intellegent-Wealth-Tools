/**
 * Tax table loader — provides 2026 federal tax tables as typed defaults.
 * All functions are pure — no side effects, no DB calls.
 *
 * Bracket data sourced from projected/enacted 2026 values reflecting
 * TCJA sunset adjustments.
 */

import type {
  AllTaxTables,
  TaxBracket,
  CapitalGainsBracket,
  StandardDeductions,
  NIITConfig,
  IRMAAbracket,
  ContributionLimits,
  FilingStatus,
} from '../types';

// =====================================================================
// Ordinary income tax brackets — 2026
// =====================================================================

const ORDINARY_BRACKETS_SINGLE_2026: TaxBracket[] = [
  { rate: 0.10, minIncome: 0, maxIncome: 12_400 },
  { rate: 0.12, minIncome: 12_401, maxIncome: 50_400 },
  { rate: 0.22, minIncome: 50_401, maxIncome: 105_700 },
  { rate: 0.24, minIncome: 105_701, maxIncome: 197_600 },
  { rate: 0.32, minIncome: 197_601, maxIncome: 262_200 },
  { rate: 0.35, minIncome: 262_201, maxIncome: 640_600 },
  { rate: 0.37, minIncome: 640_601, maxIncome: null },
];

const ORDINARY_BRACKETS_MFJ_2026: TaxBracket[] = [
  { rate: 0.10, minIncome: 0, maxIncome: 24_800 },
  { rate: 0.12, minIncome: 24_801, maxIncome: 100_800 },
  { rate: 0.22, minIncome: 100_801, maxIncome: 211_400 },
  { rate: 0.24, minIncome: 211_401, maxIncome: 395_200 },
  { rate: 0.32, minIncome: 395_201, maxIncome: 524_400 },
  { rate: 0.35, minIncome: 524_401, maxIncome: 768_700 },
  { rate: 0.37, minIncome: 768_701, maxIncome: null },
];

const ORDINARY_BRACKETS_HOH_2026: TaxBracket[] = [
  { rate: 0.10, minIncome: 0, maxIncome: 18_800 },
  { rate: 0.12, minIncome: 18_801, maxIncome: 77_850 },
  { rate: 0.22, minIncome: 77_851, maxIncome: 105_700 },
  { rate: 0.24, minIncome: 105_701, maxIncome: 197_600 },
  { rate: 0.32, minIncome: 197_601, maxIncome: 262_200 },
  { rate: 0.35, minIncome: 262_201, maxIncome: 640_600 },
  { rate: 0.37, minIncome: 640_601, maxIncome: null },
];

// MFS uses same brackets as Single
const ORDINARY_BRACKETS_MFS_2026: TaxBracket[] = ORDINARY_BRACKETS_SINGLE_2026;

// QW uses same brackets as MFJ
const ORDINARY_BRACKETS_QW_2026: TaxBracket[] = ORDINARY_BRACKETS_MFJ_2026;

const ORDINARY_BRACKETS_2026: Record<FilingStatus, TaxBracket[]> = {
  single: ORDINARY_BRACKETS_SINGLE_2026,
  mfj: ORDINARY_BRACKETS_MFJ_2026,
  mfs: ORDINARY_BRACKETS_MFS_2026,
  hoh: ORDINARY_BRACKETS_HOH_2026,
  qw: ORDINARY_BRACKETS_QW_2026,
};

// =====================================================================
// Capital gains brackets — 2026
// =====================================================================

const CG_BRACKETS_SINGLE_2026: CapitalGainsBracket[] = [
  { rate: 0.00, minIncome: 0, maxIncome: 48_350 },
  { rate: 0.15, minIncome: 48_351, maxIncome: 533_400 },
  { rate: 0.20, minIncome: 533_401, maxIncome: null },
];

const CG_BRACKETS_MFJ_2026: CapitalGainsBracket[] = [
  { rate: 0.00, minIncome: 0, maxIncome: 96_700 },
  { rate: 0.15, minIncome: 96_701, maxIncome: 600_050 },
  { rate: 0.20, minIncome: 600_051, maxIncome: null },
];

const CG_BRACKETS_HOH_2026: CapitalGainsBracket[] = [
  { rate: 0.00, minIncome: 0, maxIncome: 64_750 },
  { rate: 0.15, minIncome: 64_751, maxIncome: 566_250 },
  { rate: 0.20, minIncome: 566_251, maxIncome: null },
];

// MFS uses same thresholds as Single
const CG_BRACKETS_MFS_2026: CapitalGainsBracket[] = CG_BRACKETS_SINGLE_2026;

// QW uses same thresholds as MFJ
const CG_BRACKETS_QW_2026: CapitalGainsBracket[] = CG_BRACKETS_MFJ_2026;

const CAPITAL_GAINS_BRACKETS_2026: Record<FilingStatus, CapitalGainsBracket[]> = {
  single: CG_BRACKETS_SINGLE_2026,
  mfj: CG_BRACKETS_MFJ_2026,
  mfs: CG_BRACKETS_MFS_2026,
  hoh: CG_BRACKETS_HOH_2026,
  qw: CG_BRACKETS_QW_2026,
};

// =====================================================================
// Standard deductions — 2026
// =====================================================================

const STANDARD_DEDUCTIONS_2026: StandardDeductions = {
  single: 16_100,
  mfj: 32_200,
  mfs: 16_100,
  hoh: 24_150,
  qw: 32_200,
  additional_single_65: 1_650,
  additional_mfj_65: 1_650,
  senior_bonus: 4_000,
  senior_bonus_phaseout_single_start: 75_000,
  senior_bonus_phaseout_single_end: 175_000,
  senior_bonus_phaseout_mfj_start: 150_000,
  senior_bonus_phaseout_mfj_end: 350_000,
};

// =====================================================================
// NIIT (Net Investment Income Tax) — 2026
// =====================================================================

const NIIT_2026: NIITConfig = {
  rate: 0.038,
  threshold_single: 200_000,
  threshold_mfj: 250_000,
  threshold_mfs: 125_000,
  threshold_hoh: 200_000,
};

// =====================================================================
// IRMAA brackets — 2026 (MFJ thresholds)
// =====================================================================

const IRMAA_2026: IRMAAbracket[] = [
  { magiMin: 0, magiMax: 212_000, partBMonthly: 185.00, partDMonthly: 0 },
  { magiMin: 212_001, magiMax: 266_000, partBMonthly: 259.00, partDMonthly: 13.70 },
  { magiMin: 266_001, magiMax: 334_000, partBMonthly: 370.00, partDMonthly: 35.30 },
  { magiMin: 334_001, magiMax: 400_000, partBMonthly: 480.90, partDMonthly: 57.00 },
  { magiMin: 400_001, magiMax: 750_000, partBMonthly: 591.90, partDMonthly: 78.60 },
  { magiMin: 750_001, magiMax: null, partBMonthly: 628.90, partDMonthly: 85.80 },
];

// =====================================================================
// RMD Uniform Lifetime Table — ages 72–120
// =====================================================================

const RMD_UNIFORM_2026: Record<number, number> = {
  72: 27.4,
  73: 26.5,
  74: 25.5,
  75: 24.6,
  76: 23.7,
  77: 22.9,
  78: 22.0,
  79: 21.1,
  80: 20.2,
  81: 19.4,
  82: 18.5,
  83: 17.7,
  84: 16.8,
  85: 16.0,
  86: 15.2,
  87: 14.4,
  88: 13.7,
  89: 12.9,
  90: 12.2,
  91: 11.5,
  92: 10.8,
  93: 10.1,
  94: 9.5,
  95: 8.9,
  96: 8.4,
  97: 7.8,
  98: 7.3,
  99: 6.8,
  100: 6.4,
  101: 6.0,
  102: 5.6,
  103: 5.2,
  104: 4.9,
  105: 4.6,
  106: 4.3,
  107: 4.1,
  108: 3.9,
  109: 3.7,
  110: 3.5,
  111: 3.4,
  112: 3.3,
  113: 3.1,
  114: 3.0,
  115: 2.9,
  116: 2.8,
  117: 2.7,
  118: 2.5,
  119: 2.3,
  120: 2.0,
};

// =====================================================================
// SS wage base — 2026
// =====================================================================

const SS_WAGE_BASE_2026 = 176_100;

// =====================================================================
// Contribution limits — 2026
// =====================================================================

const CONTRIBUTION_LIMITS_2026: ContributionLimits = {
  k401_traditional: 24_500,
  k401_catchup_50: 8_000,
  k401_catchup_60_63: 11_250,
  ira_traditional: 7_500,
  ira_catchup_50: 1_100,
  hsa_self: 4_400,
  hsa_family: 8_750,
  hsa_catchup_55: 1_000,
  simple_ira: 17_000,
  simple_catchup: 3_500,
  sep_ira_max: 73_500,
  sep_pct_of_comp: 0.25,
  annual_comp_limit: 360_000,
  annual_gift_excl: 19_000,
  roth_phaseout_single_start: 150_000,
  roth_phaseout_single_end: 165_000,
  roth_phaseout_mfj_start: 236_000,
  roth_phaseout_mfj_end: 246_000,
  trad_ira_active_single_start: 79_000,
  trad_ira_active_single_end: 89_000,
  trad_ira_active_mfj_start: 126_000,
  trad_ira_active_mfj_end: 146_000,
};

// =====================================================================
// Assembled default 2026 tables
// =====================================================================

const DEFAULT_TAX_TABLES_2026: AllTaxTables = {
  ordinaryBrackets: ORDINARY_BRACKETS_2026,
  capitalGainsBrackets: CAPITAL_GAINS_BRACKETS_2026,
  standardDeductions: STANDARD_DEDUCTIONS_2026,
  niit: NIIT_2026,
  irmaa: IRMAA_2026,
  rmdUniform: RMD_UNIFORM_2026,
  contributionLimits: CONTRIBUTION_LIMITS_2026,
  ssWageBase: SS_WAGE_BASE_2026,
  year: 2026,
};

// =====================================================================
// Public API
// =====================================================================

/**
 * Return the complete set of 2026 default tax tables.
 * Returns a new deep-cloned object each time to prevent mutation.
 */
export function getDefaultTaxTables(): AllTaxTables {
  return structuredClone(DEFAULT_TAX_TABLES_2026);
}

/**
 * Return tax tables for a given year.
 * Currently only 2026 defaults are built-in.
 * Throws if the requested year is not available and no override is provided.
 *
 * @param year - The tax year
 * @param override - Optional partial override to merge with defaults
 * @returns Complete AllTaxTables for the requested year
 */
export function getTaxTablesForYear(
  year: number,
  override?: Partial<AllTaxTables>,
): AllTaxTables {
  if (year !== 2026 && !override) {
    throw new Error(
      `Built-in tax tables are only available for 2026. ` +
      `Provide an override for year ${year}.`,
    );
  }

  const base = getDefaultTaxTables();

  if (!override) {
    return base;
  }

  return {
    ...base,
    ...override,
    year: override.year ?? year,
  };
}

/**
 * Get ordinary income brackets for a specific filing status from a tax table.
 *
 * @param tables - The AllTaxTables object
 * @param filingStatus - The filing status
 * @returns Array of TaxBracket
 */
export function getOrdinaryBrackets(
  tables: AllTaxTables,
  filingStatus: FilingStatus,
): TaxBracket[] {
  return tables.ordinaryBrackets[filingStatus];
}

/**
 * Get capital gains brackets for a specific filing status from a tax table.
 *
 * @param tables - The AllTaxTables object
 * @param filingStatus - FilingStatus key
 * @returns Array of CapitalGainsBracket
 */
export function getCapitalGainsBrackets(
  tables: AllTaxTables,
  filingStatus: FilingStatus,
): CapitalGainsBracket[] {
  const brackets = tables.capitalGainsBrackets[filingStatus];
  if (!brackets) {
    throw new Error(`No capital gains brackets found for filing status: ${filingStatus}`);
  }
  return brackets;
}

/**
 * Get the standard deduction for a given filing status.
 * Includes the base amount only — caller should add age-based extras separately.
 *
 * @param tables - The AllTaxTables object
 * @param filingStatus - The filing status
 * @returns Base standard deduction amount
 */
export function getStandardDeduction(
  tables: AllTaxTables,
  filingStatus: FilingStatus,
): number {
  return tables.standardDeductions[filingStatus];
}

/**
 * Get the additional standard deduction for age 65+ filers.
 *
 * @param tables - The AllTaxTables object
 * @param filingStatus - The filing status
 * @returns Additional deduction per qualifying person
 */
export function getAdditional65Deduction(
  tables: AllTaxTables,
  filingStatus: FilingStatus,
): number {
  if (filingStatus === 'single' || filingStatus === 'hoh') {
    return tables.standardDeductions.additional_single_65;
  }
  return tables.standardDeductions.additional_mfj_65;
}

/**
 * Calculate the senior bonus deduction (new for 2026) with phaseout.
 *
 * The $4,000 senior bonus phases out ratably between AGI thresholds.
 *
 * @param tables - The AllTaxTables object
 * @param filingStatus - The filing status
 * @param agi - Adjusted gross income
 * @param isOver65 - Whether the taxpayer (or either spouse for MFJ) is 65+
 * @returns Senior bonus deduction amount after phaseout
 */
export function getSeniorBonusDeduction(
  tables: AllTaxTables,
  filingStatus: FilingStatus,
  agi: number,
  isOver65: boolean,
): number {
  if (!isOver65) return 0;

  const bonus = tables.standardDeductions.senior_bonus;

  let phaseoutStart: number;
  let phaseoutEnd: number;

  if (filingStatus === 'mfj' || filingStatus === 'qw') {
    phaseoutStart = tables.standardDeductions.senior_bonus_phaseout_mfj_start;
    phaseoutEnd = tables.standardDeductions.senior_bonus_phaseout_mfj_end;
  } else {
    phaseoutStart = tables.standardDeductions.senior_bonus_phaseout_single_start;
    phaseoutEnd = tables.standardDeductions.senior_bonus_phaseout_single_end;
  }

  if (agi <= phaseoutStart) return bonus;
  if (agi >= phaseoutEnd) return 0;

  // Linear phaseout
  const phaseoutRange = phaseoutEnd - phaseoutStart;
  const excessAgi = agi - phaseoutStart;
  const reduction = (excessAgi / phaseoutRange) * bonus;

  return Math.max(0, Math.round(bonus - reduction));
}

/**
 * Get the NIIT threshold for a given filing status.
 *
 * @param tables - The AllTaxTables object
 * @param filingStatus - The filing status
 * @returns NIIT threshold amount
 */
export function getNIITThreshold(
  tables: AllTaxTables,
  filingStatus: FilingStatus,
): number {
  switch (filingStatus) {
    case 'single':
    case 'hoh':
    case 'qw':
      return tables.niit.threshold_single;
    case 'mfj':
      return tables.niit.threshold_mfj;
    case 'mfs':
      return tables.niit.threshold_mfs;
  }
}

/**
 * Look up the RMD distribution period (divisor) for a given age.
 *
 * @param tables - The AllTaxTables object
 * @param age - The account owner's age
 * @returns Distribution period, or null if age not found in the table
 */
export function getRMDDivisor(
  tables: AllTaxTables,
  age: number,
): number | null {
  return tables.rmdUniform[age] ?? null;
}

/**
 * Find the IRMAA bracket applicable for a given MAGI.
 *
 * @param tables - The AllTaxTables object
 * @param magi - Modified adjusted gross income (from 2 years prior)
 * @returns The matching IRMAAbracket
 */
export function findIRMAABracket(
  tables: AllTaxTables,
  magi: number,
): IRMAAbracket {
  for (const bracket of tables.irmaa) {
    if (bracket.magiMax === null || magi <= bracket.magiMax) {
      return bracket;
    }
  }
  // Fallback to highest bracket (should not normally reach here)
  return tables.irmaa[tables.irmaa.length - 1];
}

/**
 * Get contribution limits from the tax tables.
 *
 * @param tables - The AllTaxTables object
 * @returns ContributionLimits
 */
export function getContributionLimits(
  tables: AllTaxTables,
): ContributionLimits {
  return tables.contributionLimits;
}

/**
 * Get the Social Security wage base for the given tax tables.
 *
 * @param tables - The AllTaxTables object
 * @returns SS wage base
 */
export function getSSWageBase(tables: AllTaxTables): number {
  return tables.ssWageBase;
}
