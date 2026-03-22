// =============================================================================
// Farther Unified Platform — Data Ownership & Conflict Resolution
// =============================================================================
//
// When data arrives from multiple sources (advisor, custodian feed, client
// portal, system computations), conflicts must be resolved deterministically.
//
// Priority hierarchy (highest to lowest):
//   1. CUSTODIAN  — Authoritative for account balances, positions, transactions
//   2. ADVISOR    — Authoritative for planning data, goals, notes, relationships
//   3. CLIENT_PORTAL — Authoritative for personal preferences, contact info updates
//   4. SYSTEM     — Authoritative for computed/derived fields only
//   5. IMPORT     — Lowest priority; only wins if no other source exists
//
// Conflict resolution strategies:
//   AUTO   — Apply the ownership hierarchy automatically
//   MANUAL — Flag the conflict for advisor review
//
// This module is self-contained — no React, Next.js, or Prisma dependencies.
//
// @module household/conflict-resolution
// =============================================================================

import type { Household, DataSource } from './types';

// =====================================================================
// Types
// =====================================================================

/**
 * Data source priority for conflict resolution.
 * Higher number = higher authority.
 */
const SOURCE_PRIORITY: Record<DataSource, number> = {
  CUSTODIAN: 50,
  ADVISOR: 40,
  CLIENT_PORTAL: 30,
  SYSTEM: 20,
  IMPORT: 10,
};

/**
 * Strategy for resolving detected conflicts.
 *
 * - AUTO: apply the ownership hierarchy rules automatically
 * - MANUAL: flag the conflict for advisor review
 */
export type ResolutionStrategy = 'AUTO' | 'MANUAL';

/**
 * A single detected conflict between the current and incoming data.
 */
export interface Conflict {
  /** Dot-delimited path to the conflicting field. */
  fieldPath: string;
  /** The value currently stored. */
  currentValue: unknown;
  /** The incoming value from the new source. */
  incomingValue: unknown;
  /** The data source of the current value. */
  currentSource: DataSource;
  /** The data source of the incoming value. */
  incomingSource: DataSource;
  /** The authoritative source for this field. */
  authoritativeSource: DataSource;
  /** The resolved value (based on ownership rules). */
  resolvedValue: unknown;
  /** Whether the incoming value wins the conflict. */
  incomingWins: boolean;
  /** ISO 8601 timestamp of conflict detection. */
  detectedAt: string;
}

/**
 * A record of a resolved conflict for audit purposes.
 */
export interface ConflictRecord {
  /** The conflict that was detected. */
  conflict: Conflict;
  /** How the conflict was resolved. */
  strategy: ResolutionStrategy;
  /** Whether the resolution was applied. */
  applied: boolean;
  /** UUID of the user who resolved it (for MANUAL), or 'SYSTEM' for AUTO. */
  resolvedBy: string;
  /** ISO 8601 timestamp of resolution. */
  resolvedAt: string;
}

// =====================================================================
// Field Ownership Registry
// =====================================================================

/**
 * Maps field path patterns to their authoritative data source.
 *
 * The authoritative source is the system of record for that field.
 * When conflicts arise, the authoritative source wins (in AUTO mode).
 */
const FIELD_OWNERSHIP: Record<string, DataSource> = {
  // ---- Custodian-owned (account/balance data) ----
  'accounts[].currentBalance': 'CUSTODIAN',
  'accounts[].costBasis': 'CUSTODIAN',
  'accounts[].unrealizedGain': 'CUSTODIAN',
  'accounts[].equityPct': 'CUSTODIAN',
  'accounts[].bondPct': 'CUSTODIAN',
  'accounts[].cashPct': 'CUSTODIAN',
  'accounts[].alternativePct': 'CUSTODIAN',
  'accounts[].ytdReturn': 'CUSTODIAN',
  'accounts[].inceptionReturn': 'CUSTODIAN',
  'accounts[].lastSyncedAt': 'CUSTODIAN',
  'accounts[].balanceAsOf': 'CUSTODIAN',
  'accounts[].accountNumberLast4': 'CUSTODIAN',
  'accounts[].institution': 'CUSTODIAN',
  'accounts[].custodian': 'CUSTODIAN',

  // ---- Advisor-owned (planning & relationship data) ----
  'name': 'ADVISOR',
  'status': 'ADVISOR',
  'wealthTier': 'ADVISOR',
  'advisorId': 'ADVISOR',
  'tags': 'ADVISOR',
  'notes': 'ADVISOR',
  'nextReviewAt': 'ADVISOR',
  'members[].role': 'ADVISOR',
  'members[].relationship': 'ADVISOR',
  'members[].retirementAge': 'ADVISOR',
  'members[].lifeExpectancy': 'ADVISOR',
  'accounts[].name': 'ADVISOR',
  'accounts[].accountType': 'ADVISOR',
  'accounts[].registration': 'ADVISOR',
  'accounts[].taxBucket': 'ADVISOR',
  'accounts[].isManagedByFarther': 'ADVISOR',
  'accounts[].isHeldAway': 'ADVISOR',
  'income[].type': 'ADVISOR',
  'income[].name': 'ADVISOR',
  'income[].annualAmount': 'ADVISOR',
  'income[].growthRate': 'ADVISOR',
  'income[].taxCharacter': 'ADVISOR',
  'expenses[].category': 'ADVISOR',
  'expenses[].name': 'ADVISOR',
  'expenses[].annualAmount': 'ADVISOR',
  'expenses[].isEssential': 'ADVISOR',
  'goals[].type': 'ADVISOR',
  'goals[].name': 'ADVISOR',
  'goals[].targetAmount': 'ADVISOR',
  'goals[].priority': 'ADVISOR',
  'goals[].targetYear': 'ADVISOR',
  'goals[].monthlyContribution': 'ADVISOR',
  'goals[].linkedAccountIds': 'ADVISOR',
  'debts[].type': 'ADVISOR',
  'debts[].name': 'ADVISOR',
  'debts[].interestRate': 'ADVISOR',
  'debts[].monthlyPayment': 'ADVISOR',
  'realEstate[].type': 'ADVISOR',
  'realEstate[].estimatedValue': 'ADVISOR',
  'realEstate[].costBasis': 'ADVISOR',
  'taxProfile.filingStatus': 'ADVISOR',
  'taxProfile.federalBracket': 'ADVISOR',
  'taxProfile.stateBracket': 'ADVISOR',
  'taxProfile.domicileState': 'ADVISOR',
  'taxProfile.estimatedAGI': 'ADVISOR',
  'taxProfile.estimatedTaxableIncome': 'ADVISOR',
  'estatePlan.status': 'ADVISOR',
  'estatePlan.estimatedGrossEstate': 'ADVISOR',
  'estatePlan.estimatedEstateTax': 'ADVISOR',

  // ---- Client-portal-owned (personal info & preferences) ----
  'members[].firstName': 'CLIENT_PORTAL',
  'members[].middleName': 'CLIENT_PORTAL',
  'members[].lastName': 'CLIENT_PORTAL',
  'members[].preferredName': 'CLIENT_PORTAL',
  'members[].email': 'CLIENT_PORTAL',
  'members[].phoneMobile': 'CLIENT_PORTAL',
  'members[].gender': 'CLIENT_PORTAL',
  'members[].employmentStatus': 'CLIENT_PORTAL',
  'members[].employerName': 'CLIENT_PORTAL',
  'members[].occupation': 'CLIENT_PORTAL',
  'members[].healthStatus': 'CLIENT_PORTAL',
  'realEstate[].address': 'CLIENT_PORTAL',

  // ---- System-owned (computed / derived) ----
  'totalAssets': 'SYSTEM',
  'totalLiabilities': 'SYSTEM',
  'netWorth': 'SYSTEM',
  'totalAum': 'SYSTEM',
  'updatedAt': 'SYSTEM',
  'version': 'SYSTEM',
  'lastSyncedAt': 'SYSTEM',
  'goals[].fundingStatus': 'SYSTEM',
  'goals[].currentFunding': 'SYSTEM',
};

// =====================================================================
// Conflict Log (In-Memory)
// =====================================================================

/** In-memory log of all conflict resolution records. */
const conflictLog: ConflictRecord[] = [];

/** Maximum number of conflict records to retain. */
const MAX_CONFLICT_LOG_SIZE = 5_000;

// =====================================================================
// Public API
// =====================================================================

/**
 * Returns the authoritative data source for a given field path.
 *
 * If the field is not in the ownership registry, falls back to ADVISOR
 * as the default authority (advisor is the primary data steward).
 *
 * @param fieldPath - Dot-delimited field path (e.g., "accounts[].currentBalance")
 * @returns The authoritative DataSource for the field
 *
 * @example
 * ```ts
 * getFieldOwnership('accounts[].currentBalance'); // 'CUSTODIAN'
 * getFieldOwnership('goals[].targetAmount');       // 'ADVISOR'
 * getFieldOwnership('members[].email');            // 'CLIENT_PORTAL'
 * getFieldOwnership('totalAssets');                 // 'SYSTEM'
 * ```
 */
export function getFieldOwnership(fieldPath: string): DataSource {
  // Direct lookup
  if (fieldPath in FIELD_OWNERSHIP) {
    return FIELD_OWNERSHIP[fieldPath];
  }

  // Normalize numbered array indices to [] for lookup
  const normalized = fieldPath.replace(/\[\d+\]/g, '[]');
  if (normalized in FIELD_OWNERSHIP) {
    return FIELD_OWNERSHIP[normalized];
  }

  // Default: advisor is authoritative for unregistered fields
  return 'ADVISOR';
}

/**
 * Resolves a conflict between a current and incoming value for a field.
 *
 * Resolution logic:
 * 1. Look up the authoritative source for the field.
 * 2. If the incoming source IS the authoritative source, the incoming value wins.
 * 3. If neither source is authoritative, the higher-priority source wins.
 * 4. If both sources have equal priority, the incoming value wins (last-write-wins).
 *
 * @param field - The field path in conflict
 * @param currentValue - The currently stored value
 * @param incomingValue - The new incoming value
 * @param currentSource - The data source of the current value
 * @param incomingSource - The data source of the incoming value
 * @returns The resolved value
 */
export function resolveConflict(
  field: string,
  currentValue: unknown,
  incomingValue: unknown,
  currentSource: DataSource,
  incomingSource: DataSource
): unknown {
  const authoritativeSource = getFieldOwnership(field);

  // If incoming is the authoritative source, it always wins
  if (incomingSource === authoritativeSource) {
    return incomingValue;
  }

  // If current is the authoritative source, it keeps its value
  if (currentSource === authoritativeSource) {
    return currentValue;
  }

  // Neither is authoritative — higher priority wins
  const currentPriority = SOURCE_PRIORITY[currentSource];
  const incomingPriority = SOURCE_PRIORITY[incomingSource];

  if (incomingPriority > currentPriority) {
    return incomingValue;
  }

  if (currentPriority > incomingPriority) {
    return currentValue;
  }

  // Equal priority — last-write-wins
  return incomingValue;
}

/**
 * Detects all conflicts between the current household state and
 * incoming partial updates from a given source.
 *
 * Only fields present in the incoming data are checked. Fields with
 * identical values are not considered conflicts.
 *
 * @param current - The current household record
 * @param incoming - The incoming partial household data
 * @param incomingSource - The data source of the incoming data
 * @returns An array of detected Conflict objects
 *
 * @example
 * ```ts
 * const conflicts = detectConflicts(
 *   currentHousehold,
 *   { name: 'Smith Family Updated', status: 'ACTIVE' },
 *   'CLIENT_PORTAL'
 * );
 * ```
 */
export function detectConflicts(
  current: Household,
  incoming: Partial<Household>,
  incomingSource: DataSource
): Conflict[] {
  const conflicts: Conflict[] = [];
  const now = new Date().toISOString();

  for (const [key, incomingValue] of Object.entries(incoming)) {
    // Skip undefined values
    if (incomingValue === undefined) continue;

    const currentValue = (current as unknown as Record<string, unknown>)[key];

    // Skip if values are identical (deep comparison for simple types)
    if (JSON.stringify(currentValue) === JSON.stringify(incomingValue)) {
      continue;
    }

    const fieldPath = key;
    const authoritativeSource = getFieldOwnership(fieldPath);
    const resolved = resolveConflict(
      fieldPath,
      currentValue,
      incomingValue,
      current.dataOwner,
      incomingSource
    );
    const incomingWins =
      JSON.stringify(resolved) === JSON.stringify(incomingValue);

    conflicts.push({
      fieldPath,
      currentValue,
      incomingValue,
      currentSource: current.dataOwner,
      incomingSource,
      authoritativeSource,
      resolvedValue: resolved,
      incomingWins,
      detectedAt: now,
    });
  }

  return conflicts;
}

/**
 * Applies conflict resolutions to a household record.
 *
 * In AUTO mode, all conflicts are resolved according to the ownership
 * hierarchy and applied immediately.
 *
 * In MANUAL mode, conflicts are logged but not applied. The returned
 * household is unchanged (conflicts await advisor review).
 *
 * @param household - The current household record
 * @param conflicts - The detected conflicts to resolve
 * @param strategy - Resolution strategy (AUTO or MANUAL)
 * @param resolvedBy - UUID of the user resolving (or 'SYSTEM' for AUTO)
 * @returns The household with resolved conflicts applied (or unchanged for MANUAL)
 */
export function applyResolution(
  household: Household,
  conflicts: Conflict[],
  strategy: ResolutionStrategy,
  resolvedBy?: string
): Household {
  const now = new Date().toISOString();
  const resolver = resolvedBy ?? (strategy === 'AUTO' ? 'SYSTEM' : 'UNKNOWN');

  if (strategy === 'MANUAL') {
    // Log conflicts for manual review but do not apply
    for (const conflict of conflicts) {
      logConflictRecord({
        conflict,
        strategy: 'MANUAL',
        applied: false,
        resolvedBy: resolver,
        resolvedAt: now,
      });
    }
    return household;
  }

  // AUTO mode: apply all resolved values
  const updated: Household = JSON.parse(JSON.stringify(household));

  for (const conflict of conflicts) {
    const applied = applyFieldValue(
      updated as unknown as Record<string, unknown>,
      conflict.fieldPath,
      conflict.resolvedValue
    );

    logConflictRecord({
      conflict,
      strategy: 'AUTO',
      applied,
      resolvedBy: resolver,
      resolvedAt: now,
    });
  }

  // Bump version for optimistic concurrency
  updated.version = household.version + 1;
  updated.updatedAt = now;

  return updated;
}

/**
 * Returns the conflict resolution log.
 *
 * @returns An array of all conflict resolution records
 */
export function getConflictLog(): ConflictRecord[] {
  return [...conflictLog];
}

/**
 * Queries the conflict log by field path, source, or time range.
 *
 * @param params - Filter parameters
 * @returns Matching conflict records
 */
export function queryConflictLog(params: {
  fieldPath?: string;
  incomingSource?: DataSource;
  strategy?: ResolutionStrategy;
  from?: string;
  to?: string;
}): ConflictRecord[] {
  let filtered = [...conflictLog];

  if (params.fieldPath) {
    filtered = filtered.filter(
      (r) => r.conflict.fieldPath === params.fieldPath
    );
  }
  if (params.incomingSource) {
    filtered = filtered.filter(
      (r) => r.conflict.incomingSource === params.incomingSource
    );
  }
  if (params.strategy) {
    filtered = filtered.filter((r) => r.strategy === params.strategy);
  }
  if (params.from) {
    const fromDate = new Date(params.from);
    filtered = filtered.filter(
      (r) => new Date(r.resolvedAt) >= fromDate
    );
  }
  if (params.to) {
    const toDate = new Date(params.to);
    filtered = filtered.filter(
      (r) => new Date(r.resolvedAt) <= toDate
    );
  }

  return filtered;
}

/**
 * Clears the conflict log.
 * Intended for use in test suites only.
 */
export function clearConflictLog(): void {
  conflictLog.length = 0;
}

/**
 * Returns the full field ownership registry.
 *
 * @returns A record mapping field paths to their authoritative DataSource
 */
export function getFieldOwnershipRegistry(): Record<string, DataSource> {
  return { ...FIELD_OWNERSHIP };
}

// =====================================================================
// Internal Helpers
// =====================================================================

/**
 * Sets a value on an object at a given dot-delimited field path.
 * Handles simple top-level properties. Array element paths are
 * not deeply traversed in Stage 1 (top-level fields only).
 *
 * @returns True if the value was successfully applied
 */
function applyFieldValue(
  obj: Record<string, unknown>,
  fieldPath: string,
  value: unknown
): boolean {
  // Stage 1: handle top-level fields only
  // Nested array/object paths will be supported in Stage 2
  if (fieldPath.includes('[') || fieldPath.includes('.')) {
    // For nested paths in Stage 1, we only apply if the top-level
    // key is a direct property (e.g., "taxProfile" object replacement)
    const topLevelKey = fieldPath.split(/[.[]/)[0];
    if (topLevelKey in obj) {
      // Only replace full sub-objects at the top level
      // Fine-grained nested updates will be in Stage 2
      return false;
    }
    return false;
  }

  obj[fieldPath] = value;
  return true;
}

/**
 * Records a conflict resolution to the in-memory log.
 */
function logConflictRecord(record: ConflictRecord): void {
  conflictLog.push(record);
  if (conflictLog.length > MAX_CONFLICT_LOG_SIZE) {
    conflictLog.splice(0, conflictLog.length - MAX_CONFLICT_LOG_SIZE);
  }
}
