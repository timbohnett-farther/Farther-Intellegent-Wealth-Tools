// =============================================================================
// Governance, Compliance, & Admin Layer — Review Queue Service
// =============================================================================
//
// Manages review queue items for approval workflows.
// Handles state machine: pending → in_review → approved/rejected.
// =============================================================================

import { randomUUID } from 'crypto';
import type { ReviewQueueItem, ReviewDecision, ApprovalObjectType } from './types';
import { store } from '../store';
import { auditService } from '../audit';

// =====================================================================
// Review Queue Service
// =====================================================================

/**
 * Creates a new review queue item.
 * Initial status is 'pending'.
 */
export function createQueueItem(
  objectType: ApprovalObjectType,
  objectId: string,
  requiredRoleIds: string[]
): ReviewQueueItem {
  const now = new Date().toISOString();

  const item: ReviewQueueItem = {
    queueItemId: randomUUID(),
    objectType,
    objectId,
    requiredRoleIds,
    status: 'pending',
    createdAt: now,
  };

  store.upsertGovernanceObject('review_queue_items', item.queueItemId, item);

  // Audit event
  auditService.emit({
    firmId: 'firm-001', // TODO: get from context
    userId: 'system',
    eventKey: 'governance.review.created',
    payload: {
      queueItemId: item.queueItemId,
      objectType,
      objectId,
      requiredRoleIds,
    },
  });

  return item;
}

/**
 * Processes a review decision (approved or rejected).
 * Updates status and records completion timestamp.
 */
export function processDecision(
  queueItemId: string,
  decision: ReviewDecision,
  actor: string,
  reviewNotes?: string
): ReviewQueueItem {
  const item = store.getGovernanceObject<ReviewQueueItem>('review_queue_items', queueItemId);
  if (!item) {
    throw new Error(`Review queue item not found: ${queueItemId}`);
  }

  // State validation
  if (item.status !== 'pending' && item.status !== 'in_review') {
    throw new Error(`Cannot process decision for item in status: ${item.status}`);
  }

  const now = new Date().toISOString();
  const newStatus = decision === 'approved' ? 'approved' : 'rejected';

  const updated: ReviewQueueItem = {
    ...item,
    status: newStatus,
    reviewedBy: actor,
    reviewNotes,
    completedAt: now,
  };

  store.upsertGovernanceObject('review_queue_items', queueItemId, updated);

  // Audit event
  auditService.emit({
    firmId: 'firm-001', // TODO: get from context
    userId: actor,
    eventKey: 'governance.review.completed',
    payload: {
      queueItemId,
      objectType: item.objectType,
      objectId: item.objectId,
      decision,
      reviewNotes: reviewNotes ?? null,
    },
  });

  return updated;
}

/**
 * Lists review queue items with optional filters.
 */
export function listQueueItems(filters?: {
  status?: string;
  objectType?: ApprovalObjectType;
  requiredRoleId?: string;
}): ReviewQueueItem[] {
  let items = store.listGovernanceObjects<ReviewQueueItem>('review_queue_items');

  if (filters?.status) {
    items = items.filter((i) => i.status === filters.status);
  }

  if (filters?.objectType) {
    items = items.filter((i) => i.objectType === filters.objectType);
  }

  if (filters?.requiredRoleId) {
    items = items.filter((i) => i.requiredRoleIds.includes(filters.requiredRoleId!));
  }

  // Sort newest first
  return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/**
 * Cancels a pending review queue item.
 */
export function cancelQueueItem(queueItemId: string, actor: string): ReviewQueueItem {
  const item = store.getGovernanceObject<ReviewQueueItem>('review_queue_items', queueItemId);
  if (!item) {
    throw new Error(`Review queue item not found: ${queueItemId}`);
  }

  if (item.status !== 'pending' && item.status !== 'in_review') {
    throw new Error(`Cannot cancel item in status: ${item.status}`);
  }

  const now = new Date().toISOString();

  const updated: ReviewQueueItem = {
    ...item,
    status: 'canceled',
    reviewedBy: actor,
    completedAt: now,
  };

  store.upsertGovernanceObject('review_queue_items', queueItemId, updated);

  auditService.emit({
    firmId: 'firm-001',
    userId: actor,
    eventKey: 'governance.review.completed',
    payload: {
      queueItemId,
      objectType: item.objectType,
      objectId: item.objectId,
      decision: 'canceled',
    },
  });

  return updated;
}
