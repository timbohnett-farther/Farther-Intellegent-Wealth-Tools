// =============================================================================
// Deliverables & Reporting Engine — Supersede Logic
// =============================================================================
//
// Handles deliverable staleness detection and supersede operations.
// Checks if source objects have changed and marks deliverables as stale.
// =============================================================================

import type { Deliverable } from './types';
import { store } from '../store';
import { auditService } from '../audit';

// =====================================================================
// Supersede Operations
// =====================================================================

/**
 * Marks a deliverable as superseded.
 * Superseded deliverables are archived and cannot be exported or modified.
 *
 * @param deliverableId - The deliverable ID to supersede.
 * @param supersededBy - The user ID performing the supersede operation.
 * @returns The superseded deliverable.
 * @throws {Error} If deliverable not found or already superseded.
 */
export function supersedeDeliverable(
  deliverableId: string,
  supersededBy: string
): Deliverable {
  const deliverable = store.getDeliverable(deliverableId);
  if (!deliverable) {
    throw new Error(`Deliverable "${deliverableId}" not found.`);
  }

  if (deliverable.status === 'superseded') {
    throw new Error(`Deliverable "${deliverableId}" is already superseded.`);
  }

  const now = new Date().toISOString();
  const updated: Deliverable = {
    ...deliverable,
    status: 'superseded',
    updatedAt: now,
  };

  store.upsertDeliverable(updated);

  // Emit audit event
  auditService.emit({
    firmId: 'firm-001', // TODO: Extract from authContext
    userId: supersededBy,
    eventKey: 'deliverable.superseded',
    payload: {
      deliverable_id: deliverableId,
      household_id: deliverable.householdId,
      tax_year: deliverable.taxYear,
      deliverable_type: deliverable.deliverableType,
      previous_status: deliverable.status,
    },
  });

  return updated;
}

// =====================================================================
// Staleness Detection
// =====================================================================

/**
 * Checks if a deliverable's source objects have changed since creation.
 * Returns true if any source objects have been modified or deleted.
 *
 * @param deliverableId - The deliverable ID to check.
 * @returns An object with staleness status and details.
 */
export function checkDeliverableStaleness(deliverableId: string): {
  isStale: boolean;
  modifiedSources: string[];
  missingSources: string[];
} {
  const deliverable = store.getDeliverable(deliverableId);
  if (!deliverable) {
    throw new Error(`Deliverable "${deliverableId}" not found.`);
  }

  const modifiedSources: string[] = [];
  const missingSources: string[] = [];

  // Check each source ref for modifications or deletions
  for (const ref of deliverable.sourceObjectRefs) {
    const sourceObj = findSourceObject(ref);

    if (!sourceObj) {
      missingSources.push(ref);
      continue;
    }

    // Check if source was updated after deliverable creation
    if (sourceObj.updated_at && sourceObj.updated_at > deliverable.createdAt) {
      modifiedSources.push(ref);
    }
  }

  const isStale = modifiedSources.length > 0 || missingSources.length > 0;

  return {
    isStale,
    modifiedSources,
    missingSources,
  };
}

/**
 * Batch check for staleness across all deliverables for a household + tax year.
 *
 * @param householdId - The household ID.
 * @param taxYear - The tax year.
 * @returns An array of staleness results for each deliverable.
 */
export function batchCheckDeliverableStaleness(
  householdId: string,
  taxYear: number
): Array<{
  deliverableId: string;
  title: string;
  isStale: boolean;
  modifiedSources: string[];
  missingSources: string[];
}> {
  const { deliverables } = store.listDeliverables({
    householdId,
    taxYear,
  });

  return deliverables.map((d) => {
    const staleness = checkDeliverableStaleness(d.deliverableId);
    return {
      deliverableId: d.deliverableId,
      title: d.title,
      ...staleness,
    };
  });
}

// =====================================================================
// Source Object Lookup
// =====================================================================

/**
 * Finds a source object by its ID across all store collections.
 * Returns the object with an updated_at timestamp if available.
 */
function findSourceObject(
  sourceId: string
): { updated_at?: string } | undefined {
  // Check extracted fields
  const field = store.getExtractedField(sourceId);
  if (field) {
    // ExtractedField doesn't have updated_at in current schema
    // Return a stub to indicate object exists
    return {};
  }

  // Check calc runs
  const calcRun = store.getCalcRun(sourceId);
  if (calcRun) {
    // CalcRun doesn't have updated_at in current schema
    return {};
  }

  // Check scenarios
  const scenario = store.getScenario(sourceId);
  if (scenario) {
    return { updated_at: scenario.updated_at };
  }

  // Check copilot answers
  const answer = store.getCopilotAnswer(sourceId);
  if (answer) {
    return { updated_at: answer.updated_at };
  }

  // Not found
  return undefined;
}
