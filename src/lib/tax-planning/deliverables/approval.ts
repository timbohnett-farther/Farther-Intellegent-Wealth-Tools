// =============================================================================
// Deliverables & Reporting Engine — Approval State Machine
// =============================================================================
//
// Manages deliverable lifecycle transitions through approval states.
// Enforces valid state transitions and emits audit events for all changes.
// =============================================================================

import type { Deliverable, DeliverableStatus } from './types';
import { store } from '../store';
import { auditService } from '../audit';

// =====================================================================
// State Transition Rules
// =====================================================================

/**
 * Valid state transitions map.
 * Key: current status, Value: array of allowed next statuses.
 */
const VALID_TRANSITIONS: Record<DeliverableStatus, DeliverableStatus[]> = {
  draft: ['reviewed', 'archived'],
  reviewed: ['approved', 'draft', 'archived'],
  approved: ['exported', 'superseded'],
  exported: ['superseded'],
  archived: [],
  superseded: [],
};

/**
 * Checks whether a transition from one status to another is valid.
 *
 * @param from - The current status.
 * @param to - The desired next status.
 * @returns `true` if the transition is allowed, `false` otherwise.
 */
export function canTransitionDeliverable(
  from: DeliverableStatus,
  to: DeliverableStatus
): boolean {
  const allowed = VALID_TRANSITIONS[from];
  if (!allowed) return false;
  return allowed.includes(to);
}

/**
 * Validates and returns the allowed transitions for a given status.
 *
 * @param status - The current deliverable status.
 * @returns An array of valid next statuses.
 */
export function getAllowedTransitions(status: DeliverableStatus): DeliverableStatus[] {
  return VALID_TRANSITIONS[status] ?? [];
}

/**
 * Checks if a deliverable status is terminal (no further transitions allowed).
 *
 * @param status - The deliverable status to check.
 * @returns `true` if the status is terminal, `false` otherwise.
 */
export function isTerminalDeliverableState(status: DeliverableStatus): boolean {
  const allowed = VALID_TRANSITIONS[status];
  return !allowed || allowed.length === 0;
}

// =====================================================================
// Transition Functions
// =====================================================================

/**
 * Attempts to transition a deliverable from one status to another.
 * Throws an error if the transition is invalid.
 *
 * @param deliverable - The deliverable to transition.
 * @param newStatus - The desired new status.
 * @param userId - The user performing the transition.
 * @returns The updated deliverable.
 * @throws {Error} If the transition is not allowed.
 */
export function transitionDeliverable(
  deliverable: Deliverable,
  newStatus: DeliverableStatus,
  userId: string
): Deliverable {
  if (!canTransitionDeliverable(deliverable.status, newStatus)) {
    const allowed = getAllowedTransitions(deliverable.status);
    throw new Error(
      `Cannot transition deliverable from "${deliverable.status}" to "${newStatus}". Allowed transitions: ${allowed.join(', ')}`
    );
  }

  const now = new Date().toISOString();
  const updated: Deliverable = {
    ...deliverable,
    status: newStatus,
    updatedAt: now,
  };

  return updated;
}

// =====================================================================
// Approval Functions
// =====================================================================

/**
 * Approves a deliverable, transitioning it from reviewed to approved.
 *
 * @param deliverableId - The deliverable ID to approve.
 * @param approvedBy - The user ID approving this deliverable.
 * @param notes - Optional approval notes.
 * @returns The approved deliverable.
 * @throws {Error} If deliverable not found or transition invalid.
 */
export function approveDeliverable(
  deliverableId: string,
  approvedBy: string,
  notes?: string
): Deliverable {
  const deliverable = store.getDeliverable(deliverableId);
  if (!deliverable) {
    throw new Error(`Deliverable "${deliverableId}" not found.`);
  }

  // Ensure current state allows approval
  if (!canTransitionDeliverable(deliverable.status, 'approved')) {
    throw new Error(
      `Cannot approve deliverable in status "${deliverable.status}". Must be in "reviewed" status.`
    );
  }

  const now = new Date().toISOString();
  const updated: Deliverable = {
    ...deliverable,
    status: 'approved',
    approvedBy,
    approvedAt: now,
    reviewNote: notes ?? deliverable.reviewNote,
    updatedAt: now,
  };

  store.upsertDeliverable(updated);

  // Emit audit event
  auditService.emit({
    firmId: 'firm-001', // TODO: Extract from authContext
    userId: approvedBy,
    eventKey: 'deliverable.approved',
    payload: {
      deliverable_id: deliverableId,
      household_id: deliverable.householdId,
      tax_year: deliverable.taxYear,
      deliverable_type: deliverable.deliverableType,
      approval_notes: notes,
    },
  });

  return updated;
}

/**
 * Marks a deliverable as reviewed, transitioning it from draft to reviewed.
 *
 * @param deliverableId - The deliverable ID to review.
 * @param reviewedBy - The user ID reviewing this deliverable.
 * @param notes - Optional review notes.
 * @returns The reviewed deliverable.
 * @throws {Error} If deliverable not found or transition invalid.
 */
export function reviewDeliverable(
  deliverableId: string,
  reviewedBy: string,
  notes?: string
): Deliverable {
  const deliverable = store.getDeliverable(deliverableId);
  if (!deliverable) {
    throw new Error(`Deliverable "${deliverableId}" not found.`);
  }

  // Ensure current state allows review
  if (!canTransitionDeliverable(deliverable.status, 'reviewed')) {
    throw new Error(
      `Cannot review deliverable in status "${deliverable.status}". Must be in "draft" status.`
    );
  }

  const now = new Date().toISOString();
  const updated: Deliverable = {
    ...deliverable,
    status: 'reviewed',
    reviewNote: notes ?? deliverable.reviewNote,
    updatedAt: now,
  };

  store.upsertDeliverable(updated);

  // Emit audit event
  auditService.emit({
    firmId: 'firm-001', // TODO: Extract from authContext
    userId: reviewedBy,
    eventKey: 'deliverable.reviewed',
    payload: {
      deliverable_id: deliverableId,
      household_id: deliverable.householdId,
      tax_year: deliverable.taxYear,
      deliverable_type: deliverable.deliverableType,
      review_notes: notes,
    },
  });

  return updated;
}
