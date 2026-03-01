// =============================================================================
// Compliance Layer — Audit Log Management
// =============================================================================

import type {
  AuditEntry,
  CreateAuditInput,
  AuditFilters,
  AuditSummary,
} from './types';

// ==================== ID Generation ====================

/** Counter for generating unique IDs within a session. */
let auditIdCounter = 0;

/**
 * Generates a unique audit entry identifier.
 * Uses a combination of timestamp and incrementing counter.
 */
function generateAuditId(): string {
  auditIdCounter++;
  const timestamp = Date.now().toString(36);
  const counter = auditIdCounter.toString(36).padStart(4, '0');
  const random = Math.random().toString(36).substring(2, 8);
  return `aud_${timestamp}_${counter}_${random}`;
}

// ==================== Audit Entry Creation ====================

/**
 * Creates a new immutable audit log entry from the provided input.
 *
 * Each entry is stamped with the current time and assigned a unique ID.
 * Missing optional fields are filled with sensible defaults.
 *
 * @param input - The data for the audit entry.
 * @returns A fully populated, frozen AuditEntry.
 */
export function createAuditEntry(input: CreateAuditInput): AuditEntry {
  const entry: AuditEntry = {
    id: generateAuditId(),
    timestamp: new Date(),
    actorType: input.actorType,
    actorId: input.actorId,
    actorName: input.actorName,
    ipAddress: input.ipAddress ?? '0.0.0.0',
    userAgent: input.userAgent ?? 'unknown',
    action: input.action,
    resourceType: input.resourceType,
    resourceId: input.resourceId,
    beforeState: input.beforeState ?? null,
    afterState: input.afterState ?? null,
    planId: input.planId ?? null,
    clientId: input.clientId ?? null,
    firmId: input.firmId,
    sessionId: input.sessionId ?? generateSessionId(),
  };

  // Freeze to enforce immutability
  return Object.freeze(entry) as AuditEntry;
}

/**
 * Generates a session identifier when one is not provided.
 */
function generateSessionId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `sess_${timestamp}_${random}`;
}

// ==================== Audit Log Filtering ====================

/**
 * Filters a list of audit entries according to the provided filter criteria.
 * All filter fields are optional; only non-undefined fields are applied.
 * Multiple filters are combined with AND logic.
 *
 * @param entries - The full list of audit entries to filter.
 * @param filters - The filter criteria to apply.
 * @returns A new array containing only matching entries.
 */
export function filterAuditLog(
  entries: AuditEntry[],
  filters: AuditFilters
): AuditEntry[] {
  return entries.filter((entry) => {
    if (filters.actorId !== undefined && entry.actorId !== filters.actorId) {
      return false;
    }
    if (filters.actorType !== undefined && entry.actorType !== filters.actorType) {
      return false;
    }
    if (filters.resourceType !== undefined && entry.resourceType !== filters.resourceType) {
      return false;
    }
    if (filters.resourceId !== undefined && entry.resourceId !== filters.resourceId) {
      return false;
    }
    if (filters.action !== undefined && entry.action !== filters.action) {
      return false;
    }
    if (filters.firmId !== undefined && entry.firmId !== filters.firmId) {
      return false;
    }
    if (filters.planId !== undefined && entry.planId !== filters.planId) {
      return false;
    }
    if (filters.clientId !== undefined && entry.clientId !== filters.clientId) {
      return false;
    }
    if (filters.sessionId !== undefined && entry.sessionId !== filters.sessionId) {
      return false;
    }
    if (filters.startDate !== undefined) {
      const ts = entry.timestamp instanceof Date
        ? entry.timestamp
        : new Date(entry.timestamp);
      if (ts < filters.startDate) {
        return false;
      }
    }
    if (filters.endDate !== undefined) {
      const ts = entry.timestamp instanceof Date
        ? entry.timestamp
        : new Date(entry.timestamp);
      if (ts > filters.endDate) {
        return false;
      }
    }
    return true;
  });
}

// ==================== Audit Log Export ====================

/**
 * Exports a list of audit entries in the specified format.
 *
 * For CSV output, produces a header row followed by one row per entry.
 * JSON and complex fields (beforeState, afterState) are serialized as
 * JSON strings within CSV cells.
 *
 * For JSON output, produces a pretty-printed JSON array.
 *
 * @param entries - The audit entries to export.
 * @param format - The output format: 'csv' or 'json'.
 * @returns A string containing the formatted export data.
 */
export function exportAuditLog(
  entries: AuditEntry[],
  format: 'csv' | 'json'
): string {
  if (format === 'json') {
    return JSON.stringify(
      entries.map((entry) => ({
        ...entry,
        timestamp: entry.timestamp instanceof Date
          ? entry.timestamp.toISOString()
          : String(entry.timestamp),
      })),
      null,
      2
    );
  }

  // CSV format
  const headers = [
    'id',
    'timestamp',
    'actorType',
    'actorId',
    'actorName',
    'ipAddress',
    'userAgent',
    'action',
    'resourceType',
    'resourceId',
    'beforeState',
    'afterState',
    'planId',
    'clientId',
    'firmId',
    'sessionId',
  ];

  const rows = entries.map((entry) => {
    const values = [
      escapeCsvField(entry.id),
      escapeCsvField(
        entry.timestamp instanceof Date
          ? entry.timestamp.toISOString()
          : String(entry.timestamp)
      ),
      escapeCsvField(entry.actorType),
      escapeCsvField(entry.actorId),
      escapeCsvField(entry.actorName),
      escapeCsvField(entry.ipAddress),
      escapeCsvField(entry.userAgent),
      escapeCsvField(entry.action),
      escapeCsvField(entry.resourceType),
      escapeCsvField(entry.resourceId),
      escapeCsvField(entry.beforeState ? JSON.stringify(entry.beforeState) : ''),
      escapeCsvField(entry.afterState ? JSON.stringify(entry.afterState) : ''),
      escapeCsvField(entry.planId ?? ''),
      escapeCsvField(entry.clientId ?? ''),
      escapeCsvField(entry.firmId),
      escapeCsvField(entry.sessionId),
    ];
    return values.join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

/**
 * Escapes a string value for safe inclusion in a CSV cell.
 * Wraps in double quotes if the value contains commas, quotes, or newlines.
 */
function escapeCsvField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

// ==================== Audit Log Summarization ====================

/**
 * Computes aggregate statistics for a set of audit entries.
 *
 * Returns counts by actor type, action, and resource type, along with
 * unique actor and session counts and the time range of the entries.
 *
 * @param entries - The audit entries to summarize.
 * @returns An AuditSummary with aggregate statistics.
 */
export function summarizeAuditLog(entries: AuditEntry[]): AuditSummary {
  const byActorType: Record<string, number> = {};
  const byAction: Record<string, number> = {};
  const byResourceType: Record<string, number> = {};
  const uniqueActors = new Set<string>();
  const uniqueSessions = new Set<string>();

  let firstEntry: Date | null = null;
  let lastEntry: Date | null = null;

  for (const entry of entries) {
    // Count by actor type
    byActorType[entry.actorType] = (byActorType[entry.actorType] ?? 0) + 1;

    // Count by action
    byAction[entry.action] = (byAction[entry.action] ?? 0) + 1;

    // Count by resource type
    byResourceType[entry.resourceType] =
      (byResourceType[entry.resourceType] ?? 0) + 1;

    // Track unique actors and sessions
    uniqueActors.add(entry.actorId);
    uniqueSessions.add(entry.sessionId);

    // Track time range
    const ts = entry.timestamp instanceof Date
      ? entry.timestamp
      : new Date(entry.timestamp);

    if (firstEntry === null || ts < firstEntry) {
      firstEntry = ts;
    }
    if (lastEntry === null || ts > lastEntry) {
      lastEntry = ts;
    }
  }

  return {
    totalActions: entries.length,
    byActorType,
    byAction,
    byResourceType,
    uniqueActors: uniqueActors.size,
    uniqueSessions: uniqueSessions.size,
    firstEntry,
    lastEntry,
  };
}
