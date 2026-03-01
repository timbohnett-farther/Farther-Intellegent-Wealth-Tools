// =============================================================================
// Update Engine — Change Detector
// =============================================================================
//
// Deep-diffs two versions of tax table data and returns field-level changes.
// Provides specialized diffing for tax brackets, contribution limits, and
// inflation-adjusted values.
// =============================================================================

import type { ChangeItem, TaxTableType } from '../types';

// ==================== Interfaces ====================

/**
 * A single field-level difference between two versions of a tax table.
 */
export interface ChangeDiff {
  /** The field path that changed (e.g. 'brackets[2].rate'). */
  field: string;
  /** The value before the change. */
  previousValue: unknown;
  /** The value after the change. */
  newValue: unknown;
  /** The type of change. */
  changeType: 'added' | 'modified' | 'removed';
  /** Percent change for numeric values. Undefined for non-numeric fields. */
  percentChange?: number;
}

/**
 * A tax bracket entry used for bracket comparison.
 */
interface BracketEntry {
  min: number;
  max: number | null;
  rate: number;
  [key: string]: unknown;
}

/**
 * A contribution limit entry used for limit comparison.
 */
interface LimitEntry {
  name: string;
  limit: number;
  catchUp?: number;
  [key: string]: unknown;
}

// ==================== Core Detection ====================

/**
 * Deep-diffs two versions of tax table data and returns a list of
 * field-level changes. Handles nested objects and arrays by flattening
 * paths with dot notation.
 *
 * @param currentData - The currently stored version of the table.
 * @param newData - The incoming version to compare against.
 * @param tableType - The type of table being compared (for context in output).
 * @returns Array of field-level diffs.
 */
export function detectChanges(
  currentData: unknown,
  newData: unknown,
  tableType: TaxTableType | string
): ChangeDiff[] {
  const diffs: ChangeDiff[] = [];

  if (currentData === null || currentData === undefined) {
    // Entire table is new
    diffs.push({
      field: tableType,
      previousValue: null,
      newValue: newData,
      changeType: 'added',
    });
    return diffs;
  }

  if (newData === null || newData === undefined) {
    diffs.push({
      field: tableType,
      previousValue: currentData,
      newValue: null,
      changeType: 'removed',
    });
    return diffs;
  }

  deepDiff(currentData, newData, '', diffs);
  return diffs;
}

/**
 * Recursively walks two objects and records all differences.
 */
function deepDiff(
  current: unknown,
  incoming: unknown,
  path: string,
  diffs: ChangeDiff[]
): void {
  // Both are primitives or nulls
  if (typeof current !== 'object' || current === null ||
      typeof incoming !== 'object' || incoming === null) {
    if (current !== incoming) {
      const percentChange = computePercentChange(current, incoming);
      diffs.push({
        field: path || '(root)',
        previousValue: current,
        newValue: incoming,
        changeType: 'modified',
        ...(percentChange !== undefined ? { percentChange } : {}),
      });
    }
    return;
  }

  // Handle arrays
  if (Array.isArray(current) && Array.isArray(incoming)) {
    const maxLen = Math.max(current.length, incoming.length);
    for (let i = 0; i < maxLen; i++) {
      const fieldPath = path ? `${path}[${i}]` : `[${i}]`;
      if (i >= current.length) {
        diffs.push({
          field: fieldPath,
          previousValue: undefined,
          newValue: incoming[i],
          changeType: 'added',
        });
      } else if (i >= incoming.length) {
        diffs.push({
          field: fieldPath,
          previousValue: current[i],
          newValue: undefined,
          changeType: 'removed',
        });
      } else {
        deepDiff(current[i], incoming[i], fieldPath, diffs);
      }
    }
    return;
  }

  // Handle objects
  const currentObj = current as Record<string, unknown>;
  const incomingObj = incoming as Record<string, unknown>;

  const allKeys = new Set([
    ...Object.keys(currentObj),
    ...Object.keys(incomingObj),
  ]);

  for (const key of allKeys) {
    const fieldPath = path ? `${path}.${key}` : key;
    const hasCurrent = key in currentObj;
    const hasIncoming = key in incomingObj;

    if (!hasCurrent && hasIncoming) {
      diffs.push({
        field: fieldPath,
        previousValue: undefined,
        newValue: incomingObj[key],
        changeType: 'added',
      });
    } else if (hasCurrent && !hasIncoming) {
      diffs.push({
        field: fieldPath,
        previousValue: currentObj[key],
        newValue: undefined,
        changeType: 'removed',
      });
    } else {
      deepDiff(currentObj[key], incomingObj[key], fieldPath, diffs);
    }
  }
}

/**
 * Computes the percent change between two numeric values.
 * Returns undefined if either value is not a finite number.
 */
function computePercentChange(
  previous: unknown,
  current: unknown
): number | undefined {
  if (typeof previous !== 'number' || typeof current !== 'number') {
    return undefined;
  }
  if (!isFinite(previous) || !isFinite(current)) {
    return undefined;
  }
  if (previous === 0) {
    return current === 0 ? 0 : undefined;
  }
  return ((current - previous) / Math.abs(previous)) * 100;
}

// ==================== Specialized Bracket Diffing ====================

/**
 * Specialized diff for tax bracket arrays. Compares brackets by index
 * and detects rate changes, threshold changes, and structural changes
 * (brackets added or removed).
 *
 * @param currentBrackets - Current bracket array.
 * @param newBrackets - Incoming bracket array.
 * @returns Array of field-level diffs specific to bracket changes.
 */
export function detectBracketChanges(
  currentBrackets: BracketEntry[],
  newBrackets: BracketEntry[]
): ChangeDiff[] {
  const diffs: ChangeDiff[] = [];

  const maxLen = Math.max(currentBrackets.length, newBrackets.length);

  for (let i = 0; i < maxLen; i++) {
    const current = currentBrackets[i];
    const incoming = newBrackets[i];

    if (!current && incoming) {
      diffs.push({
        field: `brackets[${i}]`,
        previousValue: undefined,
        newValue: incoming,
        changeType: 'added',
      });
      continue;
    }

    if (current && !incoming) {
      diffs.push({
        field: `brackets[${i}]`,
        previousValue: current,
        newValue: undefined,
        changeType: 'removed',
      });
      continue;
    }

    // Compare min threshold
    if (current.min !== incoming.min) {
      diffs.push({
        field: `brackets[${i}].min`,
        previousValue: current.min,
        newValue: incoming.min,
        changeType: 'modified',
        percentChange: computePercentChange(current.min, incoming.min),
      });
    }

    // Compare max threshold
    if (current.max !== incoming.max) {
      diffs.push({
        field: `brackets[${i}].max`,
        previousValue: current.max,
        newValue: incoming.max,
        changeType: 'modified',
        percentChange: current.max !== null && incoming.max !== null
          ? computePercentChange(current.max, incoming.max)
          : undefined,
      });
    }

    // Compare rate
    if (current.rate !== incoming.rate) {
      diffs.push({
        field: `brackets[${i}].rate`,
        previousValue: current.rate,
        newValue: incoming.rate,
        changeType: 'modified',
        percentChange: computePercentChange(current.rate, incoming.rate),
      });
    }
  }

  return diffs;
}

// ==================== Specialized Limit Diffing ====================

/**
 * Specialized diff for contribution limit tables. Matches limits by name
 * and detects value changes and new/removed limits.
 *
 * @param currentLimits - Current limit entries.
 * @param newLimits - Incoming limit entries.
 * @returns Array of field-level diffs for limits.
 */
export function detectLimitChanges(
  currentLimits: LimitEntry[],
  newLimits: LimitEntry[]
): ChangeDiff[] {
  const diffs: ChangeDiff[] = [];

  const currentMap = new Map(currentLimits.map((l) => [l.name, l]));
  const newMap = new Map(newLimits.map((l) => [l.name, l]));

  // Check for modified and removed limits
  for (const [name, current] of currentMap) {
    const incoming = newMap.get(name);
    if (!incoming) {
      diffs.push({
        field: `limits.${name}`,
        previousValue: current,
        newValue: undefined,
        changeType: 'removed',
      });
      continue;
    }
    if (current.limit !== incoming.limit) {
      diffs.push({
        field: `limits.${name}.limit`,
        previousValue: current.limit,
        newValue: incoming.limit,
        changeType: 'modified',
        percentChange: computePercentChange(current.limit, incoming.limit),
      });
    }
    if (current.catchUp !== incoming.catchUp) {
      diffs.push({
        field: `limits.${name}.catchUp`,
        previousValue: current.catchUp,
        newValue: incoming.catchUp,
        changeType: 'modified',
        percentChange: computePercentChange(
          current.catchUp ?? 0,
          incoming.catchUp ?? 0
        ),
      });
    }
  }

  // Check for added limits
  for (const [name, incoming] of newMap) {
    if (!currentMap.has(name)) {
      diffs.push({
        field: `limits.${name}`,
        previousValue: undefined,
        newValue: incoming,
        changeType: 'added',
      });
    }
  }

  return diffs;
}

// ==================== Summarization ====================

/**
 * Generates a human-readable summary of all detected changes.
 *
 * @param diffs - The array of field-level diffs to summarize.
 * @returns A multi-line string summarizing the changes.
 */
export function summarizeChanges(diffs: ChangeDiff[]): string {
  if (diffs.length === 0) {
    return 'No changes detected.';
  }

  const added = diffs.filter((d) => d.changeType === 'added');
  const modified = diffs.filter((d) => d.changeType === 'modified');
  const removed = diffs.filter((d) => d.changeType === 'removed');

  const lines: string[] = [];
  lines.push(`Detected ${diffs.length} change(s):`);

  if (added.length > 0) {
    lines.push(`  - ${added.length} field(s) added`);
    for (const diff of added) {
      lines.push(`    + ${diff.field}: ${formatValue(diff.newValue)}`);
    }
  }

  if (modified.length > 0) {
    lines.push(`  - ${modified.length} field(s) modified`);
    for (const diff of modified) {
      const pctStr = diff.percentChange !== undefined
        ? ` (${diff.percentChange >= 0 ? '+' : ''}${diff.percentChange.toFixed(2)}%)`
        : '';
      lines.push(
        `    ~ ${diff.field}: ${formatValue(diff.previousValue)} -> ${formatValue(diff.newValue)}${pctStr}`
      );
    }
  }

  if (removed.length > 0) {
    lines.push(`  - ${removed.length} field(s) removed`);
    for (const diff of removed) {
      lines.push(`    - ${diff.field}: ${formatValue(diff.previousValue)}`);
    }
  }

  return lines.join('\n');
}

/**
 * Formats a value for display in a human-readable summary.
 */
function formatValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '(none)';
  }
  if (typeof value === 'number') {
    return value.toLocaleString('en-US');
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}

// ==================== Inflation Adjustment ====================

/**
 * Calculates the percent change between current and new values and
 * compares it to expected CPI-based inflation adjustments.
 *
 * @param current - The current numeric value.
 * @param new_ - The new numeric value.
 * @returns An object with the percent change and whether it falls within
 *          the expected CPI range (typically 2-4%).
 */
export function calculateInflationAdjustment(
  current: number,
  new_: number
): { percentChange: number; withinCPIRange: boolean; cpiRangeMin: number; cpiRangeMax: number } {
  const CPI_RANGE_MIN = 1.0; // 1%
  const CPI_RANGE_MAX = 6.0; // 6% — wider range to accommodate volatile years

  if (current === 0) {
    return {
      percentChange: 0,
      withinCPIRange: false,
      cpiRangeMin: CPI_RANGE_MIN,
      cpiRangeMax: CPI_RANGE_MAX,
    };
  }

  const percentChange = ((new_ - current) / Math.abs(current)) * 100;
  const withinCPIRange =
    percentChange >= CPI_RANGE_MIN && percentChange <= CPI_RANGE_MAX;

  return {
    percentChange,
    withinCPIRange,
    cpiRangeMin: CPI_RANGE_MIN,
    cpiRangeMax: CPI_RANGE_MAX,
  };
}

// Re-export ChangeItem for convenience
export type { ChangeItem };
