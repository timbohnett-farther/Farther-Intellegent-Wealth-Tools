// =============================================================================
// Update Engine — Table Builder
// =============================================================================
//
// Constructs updated tax tables from detected changes. Handles building
// new table versions for brackets, contribution limits, IRMAA, AFR rates,
// Social Security data, and merging partial updates into existing tables.
// =============================================================================

import type { ChangeItem, TaxTableType } from '../types';

// ==================== Interfaces ====================

/**
 * Generic container for any type of tax table data.
 * Wraps the actual data with metadata for versioning and provenance.
 */
export interface TaxTableData {
  /** The table type identifier. */
  tableType: TaxTableType | string;
  /** The tax year this table applies to. */
  taxYear: number;
  /** Semantic version of this table data. */
  version: string;
  /** ISO timestamp when this table version was built. */
  builtAt: string;
  /** Data source(s) that contributed to this table. */
  sources: string[];
  /** The actual table data (structure varies by table type). */
  data: Record<string, unknown>;
  /** Number of changes incorporated in this version. */
  changeCount: number;
  /** Checksum for integrity verification. */
  checksum: string;
}

/**
 * A bracket entry in a bracket table.
 */
interface BracketRow {
  min: number;
  max: number | null;
  rate: number;
}

/**
 * A contribution limit entry.
 */
interface ContributionLimitRow {
  accountType: string;
  limit: number;
  catchUpLimit: number;
  catchUpAge: number;
}

/**
 * An IRMAA bracket entry.
 */
interface IRMAABracketRow {
  magiMin: number;
  magiMax: number | null;
  partBPremium: number;
  partDSurcharge: number;
}

// ==================== ID & Checksum Generation ====================

let tableVersionCounter = 0;

/**
 * Generates a unique version identifier for a table build.
 */
function generateVersionId(): string {
  tableVersionCounter++;
  const ts = Date.now().toString(36);
  const count = tableVersionCounter.toString(36).padStart(4, '0');
  return `v_${ts}_${count}`;
}

/**
 * Computes a simple checksum for data integrity verification.
 * In production, this would use a proper hash function.
 */
function computeChecksum(data: unknown): string {
  const str = JSON.stringify(data);
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = (hash * 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

// ==================== Core Table Builder ====================

/**
 * Constructs an updated tax table from a set of detected changes.
 * Dispatches to the appropriate builder based on table type.
 *
 * @param changes - The changes to incorporate into the table.
 * @param taxYear - The tax year for the new table.
 * @param tableType - The type of table to build.
 * @returns A TaxTableData container with the built table.
 */
export function buildTaxTable(
  changes: ChangeItem[],
  taxYear: number,
  tableType: TaxTableType | string
): TaxTableData {
  const sources = [...new Set(changes.map((c) => c.source))];
  let data: Record<string, unknown>;

  switch (tableType) {
    case 'ordinary_income_brackets':
    case 'capital_gains_brackets':
    case 'amt_exemptions':
    case 'state_income_tax':
      data = buildBracketTableInternal(changes, taxYear, tableType);
      break;
    case 'contribution_limits_401k':
    case 'contribution_limits_ira':
    case 'contribution_limits_hsa':
      data = buildContributionLimitsInternal(changes, taxYear);
      break;
    case 'irmaa_part_b':
    case 'irmaa_part_d':
      data = buildIRMAAInternal(changes, taxYear);
      break;
    case 'afr_rates':
      data = buildAFRInternal(changes);
      break;
    case 'ss_cola':
    case 'ss_wage_base':
    case 'ss_bend_points':
      data = buildSSInternal(changes, taxYear);
      break;
    default:
      // Generic: just collect the newData from all changes
      data = {
        tableType,
        taxYear,
        entries: changes.map((c) => c.newData),
      };
  }

  return {
    tableType,
    taxYear,
    version: generateVersionId(),
    builtAt: new Date().toISOString(),
    sources,
    data,
    changeCount: changes.length,
    checksum: computeChecksum(data),
  };
}

// ==================== Bracket Table Builder ====================

/**
 * Builds an income bracket table from changes.
 * Groups brackets by filing status and ensures they are sorted by min threshold.
 *
 * @param changes - The bracket changes to incorporate.
 * @param filingStatus - The filing status to build brackets for.
 * @param taxYear - The tax year.
 * @returns A TaxTableData containing the bracket table.
 */
export function buildBracketTable(
  changes: ChangeItem[],
  filingStatus: string,
  taxYear: number
): TaxTableData {
  const tableType = 'ordinary_income_brackets' as TaxTableType;
  const sources = [...new Set(changes.map((c) => c.source))];

  const brackets: BracketRow[] = [];

  for (const change of changes) {
    const newData = change.newData;
    if (!newData) continue;

    const changeBrackets = (newData.brackets ?? newData[filingStatus] ?? []) as BracketRow[];
    for (const bracket of changeBrackets) {
      brackets.push({
        min: bracket.min,
        max: bracket.max,
        rate: bracket.rate,
      });
    }
  }

  // Sort by min threshold ascending
  brackets.sort((a, b) => a.min - b.min);

  const data: Record<string, unknown> = {
    filingStatus,
    taxYear,
    brackets,
    bracketCount: brackets.length,
  };

  return {
    tableType,
    taxYear,
    version: generateVersionId(),
    builtAt: new Date().toISOString(),
    sources,
    data,
    changeCount: changes.length,
    checksum: computeChecksum(data),
  };
}

/**
 * Internal bracket builder used by the generic buildTaxTable dispatcher.
 */
function buildBracketTableInternal(
  changes: ChangeItem[],
  taxYear: number,
  tableType: string
): Record<string, unknown> {
  const allBrackets: Record<string, BracketRow[]> = {};

  for (const change of changes) {
    const newData = change.newData;
    if (!newData) continue;

    // Try to extract brackets keyed by filing status
    for (const key of Object.keys(newData)) {
      const value = newData[key];
      if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object') {
        const rows = value as BracketRow[];
        if (!allBrackets[key]) {
          allBrackets[key] = [];
        }
        allBrackets[key].push(...rows);
      }
    }

    // Also check for a flat brackets array
    if (Array.isArray(newData.brackets)) {
      const filingStatus = (newData.filingStatus as string) ?? 'default';
      if (!allBrackets[filingStatus]) {
        allBrackets[filingStatus] = [];
      }
      allBrackets[filingStatus].push(...(newData.brackets as BracketRow[]));
    }
  }

  // Sort each filing status's brackets
  for (const key of Object.keys(allBrackets)) {
    allBrackets[key].sort((a, b) => a.min - b.min);
  }

  return {
    tableType,
    taxYear,
    bracketsByFilingStatus: allBrackets,
  };
}

// ==================== Contribution Limits Builder ====================

/**
 * Builds a contribution limits table from changes.
 *
 * @param changes - The limit changes to incorporate.
 * @param taxYear - The tax year.
 * @returns A TaxTableData containing the limits table.
 */
export function buildContributionLimitsTable(
  changes: ChangeItem[],
  taxYear: number
): TaxTableData {
  const sources = [...new Set(changes.map((c) => c.source))];
  const data = buildContributionLimitsInternal(changes, taxYear);

  return {
    tableType: 'contribution_limits_401k',
    taxYear,
    version: generateVersionId(),
    builtAt: new Date().toISOString(),
    sources,
    data,
    changeCount: changes.length,
    checksum: computeChecksum(data),
  };
}

function buildContributionLimitsInternal(
  changes: ChangeItem[],
  taxYear: number
): Record<string, unknown> {
  const limits: ContributionLimitRow[] = [];

  for (const change of changes) {
    const newData = change.newData;
    if (!newData) continue;

    if (Array.isArray(newData.limits)) {
      limits.push(...(newData.limits as ContributionLimitRow[]));
    } else {
      // Treat the entire newData as a single limit entry
      limits.push({
        accountType: (newData.accountType as string) ?? 'unknown',
        limit: (newData.limit as number) ?? 0,
        catchUpLimit: (newData.catchUpLimit as number) ?? 0,
        catchUpAge: (newData.catchUpAge as number) ?? 50,
      });
    }
  }

  return {
    taxYear,
    limits,
    limitCount: limits.length,
  };
}

// ==================== IRMAA Table Builder ====================

/**
 * Builds an IRMAA bracket table from changes.
 *
 * @param changes - The IRMAA changes to incorporate.
 * @param taxYear - The tax year.
 * @returns A TaxTableData containing the IRMAA table.
 */
export function buildIRMAATable(
  changes: ChangeItem[],
  taxYear: number
): TaxTableData {
  const sources = [...new Set(changes.map((c) => c.source))];
  const data = buildIRMAAInternal(changes, taxYear);

  return {
    tableType: 'irmaa_part_b',
    taxYear,
    version: generateVersionId(),
    builtAt: new Date().toISOString(),
    sources,
    data,
    changeCount: changes.length,
    checksum: computeChecksum(data),
  };
}

function buildIRMAAInternal(
  changes: ChangeItem[],
  taxYear: number
): Record<string, unknown> {
  const brackets: IRMAABracketRow[] = [];

  for (const change of changes) {
    const newData = change.newData;
    if (!newData) continue;

    if (Array.isArray(newData.brackets)) {
      brackets.push(...(newData.brackets as IRMAABracketRow[]));
    }
  }

  // Sort by MAGI min ascending
  brackets.sort((a, b) => a.magiMin - b.magiMin);

  return {
    taxYear,
    brackets,
    bracketCount: brackets.length,
  };
}

// ==================== AFR Table Builder ====================

/**
 * Builds an Applicable Federal Rate (AFR) table from changes.
 *
 * @param changes - The AFR changes to incorporate.
 * @param month - The month (1-12).
 * @param year - The calendar year.
 * @returns A TaxTableData containing the AFR table.
 */
export function buildAFRTable(
  changes: ChangeItem[],
  month: number,
  year: number
): TaxTableData {
  const sources = [...new Set(changes.map((c) => c.source))];
  const data = buildAFRInternal(changes, month, year);

  return {
    tableType: 'afr_rates',
    taxYear: year,
    version: generateVersionId(),
    builtAt: new Date().toISOString(),
    sources,
    data,
    changeCount: changes.length,
    checksum: computeChecksum(data),
  };
}

function buildAFRInternal(
  changes: ChangeItem[],
  month?: number,
  year?: number
): Record<string, unknown> {
  // Merge all AFR data from changes
  let afrData: Record<string, unknown> = {};

  for (const change of changes) {
    const newData = change.newData;
    if (!newData) continue;
    afrData = { ...afrData, ...newData };
  }

  return {
    month: month ?? new Date().getMonth() + 1,
    year: year ?? new Date().getFullYear(),
    rates: afrData,
  };
}

// ==================== Social Security Data Builder ====================

/**
 * Builds a Social Security data table from changes.
 *
 * @param changes - The SS changes to incorporate.
 * @param taxYear - The tax year.
 * @returns A TaxTableData containing the SS data table.
 */
export function buildSSDataTable(
  changes: ChangeItem[],
  taxYear: number
): TaxTableData {
  const sources = [...new Set(changes.map((c) => c.source))];
  const data = buildSSInternal(changes, taxYear);

  return {
    tableType: 'ss_cola',
    taxYear,
    version: generateVersionId(),
    builtAt: new Date().toISOString(),
    sources,
    data,
    changeCount: changes.length,
    checksum: computeChecksum(data),
  };
}

function buildSSInternal(
  changes: ChangeItem[],
  taxYear: number
): Record<string, unknown> {
  let ssData: Record<string, unknown> = {};

  for (const change of changes) {
    const newData = change.newData;
    if (!newData) continue;
    ssData = { ...ssData, ...newData };
  }

  return {
    taxYear,
    ...ssData,
  };
}

// ==================== Merge Utility ====================

/**
 * Merges partial updates into an existing tax table, preserving
 * unchanged fields and overwriting only the fields present in the update.
 *
 * @param existing - The current TaxTableData to update.
 * @param updates - A partial data object with fields to overwrite.
 * @returns A new TaxTableData with the merged result.
 */
export function mergeWithExistingTable(
  existing: TaxTableData,
  updates: Record<string, unknown>
): TaxTableData {
  const mergedData = deepMerge(existing.data, updates);

  const newVersion = generateVersionId();

  return {
    ...existing,
    version: newVersion,
    builtAt: new Date().toISOString(),
    data: mergedData,
    changeCount: existing.changeCount + 1,
    checksum: computeChecksum(mergedData),
  };
}

/**
 * Deep merges two objects. Arrays are replaced, not concatenated.
 */
function deepMerge(
  target: Record<string, unknown>,
  source: Record<string, unknown>
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...target };

  for (const key of Object.keys(source)) {
    const sourceVal = source[key];
    const targetVal = target[key];

    if (
      sourceVal !== null &&
      typeof sourceVal === 'object' &&
      !Array.isArray(sourceVal) &&
      targetVal !== null &&
      typeof targetVal === 'object' &&
      !Array.isArray(targetVal)
    ) {
      result[key] = deepMerge(
        targetVal as Record<string, unknown>,
        sourceVal as Record<string, unknown>
      );
    } else {
      result[key] = sourceVal;
    }
  }

  return result;
}
