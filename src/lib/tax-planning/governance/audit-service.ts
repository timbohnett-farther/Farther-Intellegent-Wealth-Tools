// =============================================================================
// Governance, Compliance, & Admin Layer — Governance Audit Service
// =============================================================================
//
// Records governance-specific audit events with before/after state.
// Provides querying and object timeline reconstruction.
// =============================================================================

import { randomUUID } from 'crypto';
import type { RecordGovernanceAuditCommand, GovernanceAuditEvent, GovernanceAuditObjectType } from './types';
import { store } from '../store';

// =====================================================================
// Governance Audit Service
// =====================================================================

/**
 * Records a governance audit event.
 */
export function recordGovernanceAudit(command: RecordGovernanceAuditCommand): GovernanceAuditEvent {
  const { objectType, objectId, actor, action, before, after } = command;

  const now = new Date().toISOString();

  const event: GovernanceAuditEvent = {
    eventId: randomUUID(),
    objectType,
    objectId,
    actor,
    action,
    before,
    after,
    createdAt: now,
  };

  store.upsertGovernanceObject('governance_audit_events', event.eventId, event);

  return event;
}

/**
 * Queries governance audit events with filters.
 */
export function queryGovernanceAuditEvents(filters?: {
  objectType?: GovernanceAuditObjectType;
  objectId?: string;
  actor?: string;
  fromDate?: string;
  toDate?: string;
  limit?: number;
}): GovernanceAuditEvent[] {
  let events = store.listGovernanceObjects<GovernanceAuditEvent>('governance_audit_events');

  if (filters?.objectType) {
    events = events.filter((e) => e.objectType === filters.objectType);
  }

  if (filters?.objectId) {
    events = events.filter((e) => e.objectId === filters.objectId);
  }

  if (filters?.actor) {
    events = events.filter((e) => e.actor === filters.actor);
  }

  if (filters?.fromDate) {
    const fromDate = new Date(filters.fromDate);
    events = events.filter((e) => new Date(e.createdAt) >= fromDate);
  }

  if (filters?.toDate) {
    const toDate = new Date(filters.toDate);
    events = events.filter((e) => new Date(e.createdAt) <= toDate);
  }

  // Sort newest first
  events = events.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  if (filters?.limit) {
    events = events.slice(0, filters.limit);
  }

  return events;
}

/**
 * Returns the full audit timeline for a specific object.
 * Events are returned in chronological order (oldest first).
 */
export function getObjectTimeline(
  objectType: GovernanceAuditObjectType,
  objectId: string
): GovernanceAuditEvent[] {
  const events = queryGovernanceAuditEvents({ objectType, objectId });

  // Reverse to get chronological order
  return events.reverse();
}
