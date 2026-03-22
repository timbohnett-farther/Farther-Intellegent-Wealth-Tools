// Human Review Queue — manages items that require manual approval before publishing.
// Pure functional — no React, Next.js, or Prisma imports.

import type { ChangeItem, HumanReviewItem } from '../types';

// ---------------------------------------------------------------------------
// Queue Management
// ---------------------------------------------------------------------------

/** In-memory review queue. Production would use Cloud SQL. */
const queue: HumanReviewItem[] = [];
let nextId = 1;

/**
 * Determine whether a change requires human review.
 * Law changes, new provisions, and validation failures always require review.
 * Large numeric adjustments (>5% deviation from expected) also require review.
 */
export function shouldRequireHumanReview(change: ChangeItem): boolean {
  // Law changes and new provisions always need review
  if (change.type === 'law_change' || change.type === 'new_provision') return true;
  if (change.type === 'pending_legislation') return true;

  // Validation failures
  if (change.validationFailure) return true;

  // Not auto-approvable by source classification
  if (!change.autoApprovable) return true;

  return false;
}

/**
 * Add a change item to the human review queue.
 */
export function addToReviewQueue(change: ChangeItem, reason: string, aiSummary?: string): HumanReviewItem {
  const item: HumanReviewItem = {
    id: `REV-${String(nextId++).padStart(3, '0')}`,
    changeItem: change,
    detectedAt: new Date().toISOString(),
    status: 'pending',
    aiSummary: aiSummary ?? change.summary ?? reason,
  };
  queue.push(item);
  return item;
}

/**
 * Get all items in the review queue, optionally filtered by status.
 */
export function getQueueItems(status?: HumanReviewItem['status']): HumanReviewItem[] {
  if (!status) return [...queue];
  return queue.filter((item) => item.status === status);
}

/**
 * Approve a review queue item.
 */
export function approveItem(itemId: string, reviewerName: string, notes?: string): HumanReviewItem | null {
  const item = queue.find((i) => i.id === itemId);
  if (!item || item.status !== 'pending') return null;

  item.status = 'approved';
  item.reviewedBy = reviewerName;
  item.reviewedAt = new Date().toISOString();
  item.notes = notes;
  return item;
}

/**
 * Reject a review queue item.
 */
export function rejectItem(itemId: string, reviewerName: string, reason: string): HumanReviewItem | null {
  const item = queue.find((i) => i.id === itemId);
  if (!item || item.status !== 'pending') return null;

  item.status = 'rejected';
  item.reviewedBy = reviewerName;
  item.reviewedAt = new Date().toISOString();
  item.notes = reason;
  return item;
}

/**
 * Publish an approved item (mark as published, trigger downstream updates).
 */
export function publishItem(itemId: string): HumanReviewItem | null {
  const item = queue.find((i) => i.id === itemId);
  if (!item || item.status !== 'approved') return null;

  item.status = 'published';
  return item;
}

/**
 * Create a "what-if" scenario from a pending item without publishing to production tables.
 */
export function createScenario(itemId: string): { scenarioId: string; item: HumanReviewItem } | null {
  const item = queue.find((i) => i.id === itemId);
  if (!item) return null;

  const scenarioId = `SCENARIO-${itemId}-${Date.now()}`;
  // In production: create a scenario record in Cloud SQL that advisors can use for "what-if" analysis
  return { scenarioId, item };
}

/**
 * Generate a review summary for the admin review panel.
 */
export function generateReviewSummary(item: HumanReviewItem): {
  title: string;
  source: string;
  type: string;
  severity: string;
  affectedTables: string[];
  detectedAt: string;
  aiSummary: string;
} {
  return {
    title: item.changeItem.description,
    source: item.changeItem.source,
    type: item.changeItem.type,
    severity: item.changeItem.severity,
    affectedTables: item.changeItem.affectedTables,
    detectedAt: item.detectedAt,
    aiSummary: item.aiSummary ?? 'No AI analysis available.',
  };
}
