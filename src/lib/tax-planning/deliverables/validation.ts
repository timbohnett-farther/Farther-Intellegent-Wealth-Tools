// =============================================================================
// Deliverables & Reporting Engine — Validation
// =============================================================================
//
// Validation rules for deliverables and source packages.
// Checks required sections, source refs, disclaimer policy compliance, etc.
// =============================================================================

import type {
  Deliverable,
  DeliverableValidationResult,
  DeliverableValidationStatus,
} from './types';
import { getTemplate } from './templates';
import { store } from '../store';

/**
 * Validates a deliverable against its template rules and data integrity requirements.
 *
 * Validation checks:
 * 1. All required sections from the template are present
 * 2. All source refs point to valid objects in the store
 * 3. Disclaimer policy is satisfied
 * 4. Section blocks are in correct order
 * 5. Block content is not empty
 *
 * @param deliverable - The deliverable to validate.
 * @returns A validation result with status, warnings, and blockers.
 */
export function validateDeliverable(deliverable: Deliverable): DeliverableValidationResult {
  const warnings: string[] = [];
  const blockers: string[] = [];

  // ---- 1. Validate template exists ----
  const template = getTemplate(deliverable.templateId);
  if (!template) {
    blockers.push(`Template "${deliverable.templateId}" not found.`);
    return { status: 'hard_fail_block_creation', warnings, blockers };
  }

  // ---- 2. Validate required sections are present ----
  const requiredBlocks = template.sectionBlueprints.filter((bp) => bp.required);
  const presentBlockTypes = new Set(deliverable.sectionBlocks.map((b) => b.blockType));

  for (const required of requiredBlocks) {
    if (!presentBlockTypes.has(required.blockType)) {
      blockers.push(`Required section "${required.blockType}" is missing.`);
    }
  }

  // ---- 3. Validate source refs ----
  const invalidRefs = validateSourceRefs(deliverable.sourceObjectRefs);
  if (invalidRefs.length > 0) {
    warnings.push(
      `${invalidRefs.length} source references point to objects that no longer exist: ${invalidRefs.slice(0, 3).join(', ')}${invalidRefs.length > 3 ? '...' : ''}`
    );
  }

  // ---- 4. Validate disclaimer policy ----
  if (template.disclaimerPolicy === 'always_include') {
    const hasDisclaimer = deliverable.sectionBlocks.some((b) => b.blockType === 'disclaimer');
    if (!hasDisclaimer) {
      blockers.push('Template requires a disclaimer section, but none is present.');
    }
  }

  // ---- 5. Validate section order ----
  const orderIssues = validateSectionOrder(deliverable.sectionBlocks);
  if (orderIssues.length > 0) {
    warnings.push(...orderIssues);
  }

  // ---- 6. Validate block content is not empty ----
  const emptyBlocks = deliverable.sectionBlocks.filter(
    (b) => !b.content || Object.keys(b.content).length === 0
  );
  if (emptyBlocks.length > 0) {
    warnings.push(
      `${emptyBlocks.length} section blocks have empty content. This may indicate incomplete data.`
    );
  }

  // ---- 7. Determine overall status ----
  let status: DeliverableValidationStatus;
  if (blockers.length > 0) {
    status = 'hard_fail_block_creation';
  } else if (warnings.length > 3) {
    status = 'soft_fail_requires_review';
  } else if (warnings.length > 0) {
    status = 'pass_with_warning';
  } else {
    status = 'pass';
  }

  return { status, warnings, blockers };
}

/**
 * Validates that source object references point to valid objects in the store.
 * Returns an array of invalid ref IDs.
 */
function validateSourceRefs(sourceRefs: string[]): string[] {
  const invalid: string[] = [];

  for (const ref of sourceRefs) {
    // Check if ref exists in any store collection
    const exists =
      store.getExtractedField(ref) ||
      store.getCalcRun(ref) ||
      store.getScenario(ref) ||
      store.getCopilotAnswer(ref);

    if (!exists) {
      invalid.push(ref);
    }
  }

  return invalid;
}

/**
 * Validates that section blocks are in correct sequential order.
 * Returns an array of warning messages if order issues are detected.
 */
function validateSectionOrder(
  sectionBlocks: { blockId: string; order: number; blockType: string }[]
): string[] {
  const warnings: string[] = [];

  // Check for duplicate order numbers
  const orderCounts = new Map<number, number>();
  for (const block of sectionBlocks) {
    orderCounts.set(block.order, (orderCounts.get(block.order) ?? 0) + 1);
  }

  for (const entry of Array.from(orderCounts.entries())) {
    const [order, count] = entry;
    if (count > 1) {
      warnings.push(`Multiple section blocks have the same order number: ${order}`);
    }
  }

  // Check for gaps in order sequence
  const sortedOrders = Array.from(orderCounts.keys()).sort((a, b) => a - b);
  for (let i = 0; i < sortedOrders.length - 1; i++) {
    const current = sortedOrders[i];
    const next = sortedOrders[i + 1];
    if (next !== current + 1) {
      warnings.push(`Gap in section order sequence between ${current} and ${next}`);
    }
  }

  // Check if disclaimer is last (if present)
  const disclaimerBlock = sectionBlocks.find((b) => b.blockType === 'disclaimer');
  if (disclaimerBlock) {
    const maxOrder = Math.max(...sectionBlocks.map((b) => b.order));
    if (disclaimerBlock.order !== maxOrder) {
      warnings.push('Disclaimer section should be the last section in the deliverable.');
    }
  }

  return warnings;
}

/**
 * Quick validation check for source package completeness.
 * Returns true if the source package has at least minimal data.
 */
export function isSourcePackageComplete(sourcePackage: {
  facts: unknown[];
  calculations: unknown[];
  scenarios: unknown[];
}): boolean {
  return (
    sourcePackage.facts.length > 0 &&
    sourcePackage.calculations.length > 0 &&
    sourcePackage.scenarios.length > 0
  );
}
