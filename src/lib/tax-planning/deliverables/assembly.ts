// =============================================================================
// Deliverables & Reporting Engine — Assembly Orchestrator
// =============================================================================
//
// Main orchestrator for assembling a deliverable from a source package and template.
// Coordinates template resolution, source binding, section building, and policies.
// =============================================================================

import type { Deliverable, DeliverableCreateRequest, DeliverableSourcePackage } from './types';
import type { TaxYear } from '../types';
import { getActiveTemplate, getTemplate } from './templates';
import { buildDeliverableSourcePackage } from './source-binding';
import {
  buildSummaryBlock,
  buildComparisonTableBlock,
  buildOpportunityBlock,
  buildRecommendationBlock,
  buildNarrativeBlock,
  buildAssumptionsBlock,
  buildWarningsBlock,
  buildDisclaimerBlock,
  buildImplementationStepsBlock,
  buildAppendixBlock,
} from './block-builders';
import { randomUUID } from 'crypto';

/**
 * Assembles a complete deliverable from a create request.
 *
 * This function:
 * 1. Resolves the template (auto-selected or explicit)
 * 2. Builds the source package
 * 3. Validates source completeness
 * 4. Iterates through blueprints and calls block builders
 * 5. Appends disclaimers/appendix per template policy
 * 6. Returns the assembled Deliverable object
 *
 * @param request - The create request with household, tax year, and type.
 * @param createdBy - The user creating this deliverable.
 * @returns The fully assembled Deliverable object.
 * @throws Error if template not found or validation fails.
 */
export function assembleDeliverable(
  request: DeliverableCreateRequest,
  createdBy: string
): Deliverable {
  const now = new Date().toISOString();

  // ---- 1. Resolve template ----
  const template = request.templateId
    ? getTemplate(request.templateId)
    : getActiveTemplate(request.deliverableType, request.audienceMode);

  if (!template) {
    throw new Error(
      `No active template found for deliverable type "${request.deliverableType}" and audience mode "${request.audienceMode}".`
    );
  }

  // ---- 2. Build source package ----
  const sourcePackage = buildDeliverableSourcePackage(
    request.householdId,
    request.taxYear as TaxYear,
    request.deliverableType,
    request.audienceMode
  );

  // ---- 3. Validate source completeness ----
  validateSourcePackage(sourcePackage, template.requiredSourceTypes);

  // ---- 4. Build section blocks ----
  const sectionBlocks = [];
  let order = 0;

  for (const blueprint of template.sectionBlueprints) {
    const block = buildBlockFromBlueprint(blueprint, sourcePackage, order);
    sectionBlocks.push(block);
    order++;
  }

  // ---- 5. Append disclaimer per policy ----
  if (
    template.disclaimerPolicy === 'always_include' ||
    (template.disclaimerPolicy === 'conditional' && shouldIncludeDisclaimer(sourcePackage))
  ) {
    const disclaimerBlock = buildDisclaimerBlock(
      { blockType: 'disclaimer', required: true, sourcePriority: [] },
      sourcePackage,
      order
    );
    sectionBlocks.push(disclaimerBlock);
    order++;
  }

  // ---- 6. Append appendix per policy ----
  if (
    template.appendixPolicy === 'always_include' ||
    (template.appendixPolicy === 'conditional' && shouldIncludeAppendix(sourcePackage))
  ) {
    const appendixBlock = buildAppendixBlock(
      { blockType: 'appendix', required: false, sourcePriority: [] },
      sourcePackage,
      order
    );
    sectionBlocks.push(appendixBlock);
    order++;
  }

  // ---- 7. Assemble deliverable ----
  const sourceObjectRefs = collectSourceRefs(sectionBlocks);

  const deliverable: Deliverable = {
    deliverableId: randomUUID(),
    householdId: request.householdId,
    taxYear: request.taxYear as TaxYear,
    deliverableType: request.deliverableType,
    audienceMode: request.audienceMode,
    title:
      request.title ??
      `${template.name} - ${request.householdId.slice(0, 8)} - ${request.taxYear}`,
    templateId: template.templateId,
    templateVersion: template.version,
    sourceObjectRefs,
    sectionBlocks,
    status: 'draft',
    version: 1,
    createdBy,
    createdAt: now,
    updatedAt: now,
  };

  return deliverable;
}

/**
 * Validates that the source package contains all required source types.
 * Throws an error if any required sources are missing.
 */
function validateSourcePackage(
  sourcePackage: DeliverableSourcePackage,
  requiredSourceTypes: string[]
): void {
  const availableSources = new Set<string>();

  if (sourcePackage.facts.length > 0) availableSources.add('facts');
  if (sourcePackage.calculations.length > 0) availableSources.add('calculations');
  if (sourcePackage.opportunities.length > 0) availableSources.add('opportunities');
  if (sourcePackage.scenarios.length > 0) availableSources.add('scenarios');
  if (sourcePackage.approvedAiAnswers.length > 0) availableSources.add('approved_ai_answers');

  const missing = requiredSourceTypes.filter((type) => !availableSources.has(type));

  if (missing.length > 0) {
    throw new Error(
      `Source package is missing required source types: ${missing.join(', ')}. Cannot assemble deliverable.`
    );
  }
}

/**
 * Builds a section block from a blueprint by dispatching to the appropriate builder.
 */
function buildBlockFromBlueprint(
  blueprint: {
    blockType: string;
    title?: string;
    required: boolean;
    sourcePriority: string[];
    audienceRenderingMode?: 'simplified' | 'technical' | 'executive';
  },
  sourcePackage: DeliverableSourcePackage,
  order: number
) {
  // Cast blueprint to DeliverableSectionBlueprint for builder functions
  const typedBlueprint = blueprint as import('./types').DeliverableSectionBlueprint;

  switch (blueprint.blockType) {
    case 'summary':
      return buildSummaryBlock(typedBlueprint, sourcePackage, order);
    case 'comparison_table':
      return buildComparisonTableBlock(typedBlueprint, sourcePackage, order);
    case 'opportunity':
      return buildOpportunityBlock(typedBlueprint, sourcePackage, order);
    case 'recommendation':
      return buildRecommendationBlock(typedBlueprint, sourcePackage, order);
    case 'narrative':
      return buildNarrativeBlock(typedBlueprint, sourcePackage, order);
    case 'assumptions':
      return buildAssumptionsBlock(typedBlueprint, sourcePackage, order);
    case 'warnings':
      return buildWarningsBlock(typedBlueprint, sourcePackage, order);
    case 'disclaimer':
      return buildDisclaimerBlock(typedBlueprint, sourcePackage, order);
    case 'implementation_steps':
      return buildImplementationStepsBlock(typedBlueprint, sourcePackage, order);
    case 'appendix':
      return buildAppendixBlock(typedBlueprint, sourcePackage, order);
    default:
      throw new Error(`Unknown block type: ${blueprint.blockType}`);
  }
}

/**
 * Determines if a disclaimer should be included based on source package warnings.
 */
function shouldIncludeDisclaimer(sourcePackage: DeliverableSourcePackage): boolean {
  // Include disclaimer if there are any warnings or limitations
  return sourcePackage.warnings.length > 0 || sourcePackage.limitations.length > 0;
}

/**
 * Determines if an appendix should be included based on source package authorities.
 */
function shouldIncludeAppendix(sourcePackage: DeliverableSourcePackage): boolean {
  // Include appendix if there are authoritative sources or multiple calculations
  return sourcePackage.authorities.length > 0 || sourcePackage.calculations.length > 1;
}

/**
 * Collects all unique source object references from section blocks.
 */
function collectSourceRefs(sectionBlocks: { sourceRefs: string[] }[]): string[] {
  const allRefs = new Set<string>();
  for (const block of sectionBlocks) {
    for (const ref of block.sourceRefs) {
      allRefs.add(ref);
    }
  }
  return Array.from(allRefs);
}
