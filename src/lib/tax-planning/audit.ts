// =============================================================================
// Tax Planning Platform -- Audit Event Service
// =============================================================================
//
// In-memory audit trail for Stage 1.  Every security-relevant or data-mutating
// action emits an AuditEvent through the singleton `auditService`.  Events are
// immutable once created and queryable by firm, user, event key, and time range.
//
// Stage 2 will swap the in-memory store for a persistent write-ahead log
// backed by a durable data store (e.g. BigQuery / Postgres).
// =============================================================================

import type { AuditEvent } from './types';

// ==================== Audit Event Keys ====================

/**
 * Canonical event keys for auditable actions within the platform.
 * These keys appear in dashboards, compliance exports, and alerting rules.
 */
type AuditEventKey =
  | 'auth.login'
  | 'household.create'
  | 'household.update'
  | 'household.delete'
  | 'doc.upload'
  | 'doc.extraction.completed'
  | 'doc.extraction.failed'
  | 'scenario.create'
  | 'scenario.update'
  | 'scenario.delete'
  | 'calc.run'
  | 'export.pdf'
  | 'integration.token.created'
  | 'integration.token.rotated'
  | 'integration.token.revoked'
  | 'security.data_export'
  | 'security.privacy_notice_sent'
  | 'copilot.ask'
  | 'copilot.answer.reviewed'
  | 'copilot.answer.approved'
  | 'copilot.answer.discarded'
  | 'copilot.answer.superseded'
  | 'deliverable.created'
  | 'deliverable.updated'
  | 'deliverable.reviewed'
  | 'deliverable.approved'
  | 'deliverable.exported'
  | 'deliverable.archived'
  | 'deliverable.superseded'
  | 'task.created'
  | 'task.updated'
  | 'task.completed'
  | 'task.assigned'
  | 'workflow.created'
  | 'workflow.updated'
  | 'workflow.completed'
  | 'recommendation.status_updated'
  | 'crm_sync.created'
  | 'crm_sync.sent'
  | 'crm_sync.failed'
  | 'cpa_request.created'
  | 'cpa_request.updated'
  | 'cpa_request.completed'
  | 'governance.role.updated'
  | 'governance.permission.updated'
  | 'governance.scope.updated'
  | 'governance.approval_policy.updated'
  | 'governance.ai_policy.updated'
  | 'governance.template.updated'
  | 'governance.setting.updated'
  | 'governance.feature_flag.updated'
  | 'governance.review.created'
  | 'governance.review.completed'
  | 'governance.authorization.denied'
  | 'analytics.metric.calculated'
  | 'analytics.dashboard.refreshed'
  | 'analytics.value.attributed';

// ==================== ID Generation ====================

/** Counter for generating unique audit event IDs within a session. */
let auditIdCounter = 0;

/**
 * Generates a unique audit event identifier.
 * Uses a combination of timestamp, incrementing counter, and randomness.
 */
function generateEventId(): string {
  auditIdCounter++;
  const timestamp = Date.now().toString(36);
  const counter = auditIdCounter.toString(36).padStart(4, '0');
  const random = Math.random().toString(36).substring(2, 8);
  return `evt_${timestamp}_${counter}_${random}`;
}

// ==================== Query Parameters ====================

/** Parameters for querying the audit event store. */
interface AuditQueryParams {
  firmId: string;
  eventKey?: string;
  userId?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}

/** Paginated query result. */
interface AuditQueryResult {
  events: AuditEvent[];
  total: number;
}

// ==================== Emit Parameters ====================

/** Parameters for emitting a new audit event. */
interface AuditEmitParams {
  firmId: string;
  userId: string;
  eventKey: AuditEventKey;
  ip?: string;
  payload: Record<string, unknown>;
}

// ==================== Audit Service ====================

/**
 * In-memory audit event service.
 *
 * Provides `emit` to record events and `query` to retrieve them with
 * filtering and pagination.  All events are stored chronologically and
 * are immutable once created.
 *
 * This class is not exported directly -- consumers use the singleton
 * {@link auditService} instance.
 */
class AuditService {
  private events: AuditEvent[] = [];

  // -------------------- Emit --------------------

  /**
   * Records a new audit event and returns the frozen event object.
   *
   * @param params - The event attributes.
   * @returns The newly created, immutable AuditEvent.
   */
  emit(params: AuditEmitParams): AuditEvent {
    const event: AuditEvent = {
      event_id: generateEventId(),
      firm_id: params.firmId,
      user_id: params.userId,
      event_key: params.eventKey,
      ip: params.ip ?? '0.0.0.0',
      payload: params.payload,
      timestamp: new Date().toISOString(),
    };

    const frozen = Object.freeze(event) as AuditEvent;
    this.events.push(frozen);
    return frozen;
  }

  // -------------------- Query --------------------

  /**
   * Queries stored audit events with optional filters and pagination.
   *
   * Events are returned in reverse chronological order (newest first).
   * All filters are combined with AND logic; omitted filters are ignored.
   *
   * @param params - The query parameters.
   * @returns An object containing the matching events slice and total count.
   */
  query(params: AuditQueryParams): AuditQueryResult {
    let filtered = this.events.filter((evt) => evt.firm_id === params.firmId);

    if (params.eventKey !== undefined) {
      filtered = filtered.filter((evt) => evt.event_key === params.eventKey);
    }

    if (params.userId !== undefined) {
      filtered = filtered.filter((evt) => evt.user_id === params.userId);
    }

    if (params.from !== undefined) {
      const fromDate = new Date(params.from);
      filtered = filtered.filter((evt) => new Date(evt.timestamp) >= fromDate);
    }

    if (params.to !== undefined) {
      const toDate = new Date(params.to);
      filtered = filtered.filter((evt) => new Date(evt.timestamp) <= toDate);
    }

    // Reverse chronological order
    const sorted = [...filtered].reverse();

    const total = sorted.length;
    const offset = params.offset ?? 0;
    const limit = params.limit ?? 100;
    const page = sorted.slice(offset, offset + limit);

    return { events: page, total };
  }

  // -------------------- Get by ID --------------------

  /**
   * Retrieves a single audit event by its unique identifier.
   *
   * @param eventId - The event ID to look up.
   * @returns The matching AuditEvent, or undefined if not found.
   */
  getById(eventId: string): AuditEvent | undefined {
    return this.events.find((evt) => evt.event_id === eventId);
  }

  // -------------------- Testing Utilities --------------------

  /**
   * Removes all stored events.  Intended for use in test suites only.
   */
  clear(): void {
    this.events = [];
  }
}

// ==================== Singleton Export ====================

/** Global audit service instance for the application. */
export const auditService = new AuditService();

export type { AuditEventKey };
