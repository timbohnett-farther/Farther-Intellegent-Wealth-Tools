/**
 * Scenario Planning Service
 *
 * Core service for creating, updating, and managing planning scenarios.
 * Handles scenario lifecycle, validation, and persistence.
 */

import { prisma } from '@/lib/prisma';
import type {
  CreateScenarioRequest,
  UpdateScenarioRequest,
  PlanningScenario,
  ScenarioOverride,
  ScenarioAssumption,
  MissingInfoItem,
  ScenarioValidationResult,
  ValidationError,
  ValidationWarning,
  ScenarioCalculationContext,
  CreateScenarioFromTemplateRequest,
} from '@/types/scenario-planning';

// ==================== SCENARIO CREATION ====================

/**
 * Create a new planning scenario from baseline
 *
 * @param request Scenario creation request
 * @param createdBy User ID
 * @returns Created scenario
 */
export async function createScenario(
  request: CreateScenarioRequest,
  createdBy: string
): Promise<PlanningScenario> {
  // Validate request
  const validation = validateScenarioRequest(request);
  if (!validation.valid) {
    throw new Error(`Scenario validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
  }

  // Generate scenario title if not provided
  const title = request.title || generateScenarioTitle(request.scenarioType, request.overrides);

  // Create scenario record
  const scenario = await prisma.planningScenario.create({
    data: {
      householdId: request.householdId,
      taxYear: request.taxYear,
      baselineSnapshotId: request.baselineSnapshotId,
      baselineRunId: request.baselineRunId,
      scenarioSnapshotId: '', // Will be set after calculation
      scenarioRunId: '', // Will be set after calculation
      scenarioType: request.scenarioType,
      title,
      description: request.description || null,
      originatingOpportunityId: request.originatingOpportunityId || null,
      overridesJson: JSON.stringify(request.overrides),
      assumptionsJson: JSON.stringify(request.assumptions || []),
      warningsJson: JSON.stringify(validation.warnings.map(w => w.message)),
      blockersJson: null,
      notes: request.notes || null,
      status: 'draft',
      recommended: false,
      version: 1,
      createdBy,
    },
  });

  // Create audit event
  await createAuditEvent({
    eventType: 'created',
    scenarioId: scenario.id,
    actor: createdBy,
    actorType: 'advisor',
    changesAfter: scenario,
  });

  // Parse JSON fields for return
  return parsePlanningScenario(scenario);
}

/**
 * Create scenario from opportunity
 *
 * Uses opportunity-suggested scenario templates and seed values
 *
 * @param opportunityId Opportunity ID
 * @param baselineSnapshotId Baseline snapshot ID
 * @param baselineRunId Baseline run ID
 * @param createdBy User ID
 * @returns Created scenario
 */
export async function createScenarioFromOpportunity(
  opportunityId: string,
  baselineSnapshotId: string,
  baselineRunId: string,
  createdBy: string
): Promise<PlanningScenario> {
  // Fetch opportunity
  const opportunity = await prisma.opportunity.findUnique({
    where: { id: opportunityId },
  });

  if (!opportunity) {
    throw new Error(`Opportunity ${opportunityId} not found`);
  }

  // Generate seed overrides based on opportunity context
  const seedOverrides = generateSeedOverridesFromOpportunity(opportunity);

  // Create scenario request
  const request: CreateScenarioRequest = {
    householdId: opportunity.householdId,
    taxYear: opportunity.taxYear,
    baselineSnapshotId,
    baselineRunId,
    scenarioType: mapOpportunityCategoryToScenarioType(opportunity.category),
    originatingOpportunityId: opportunityId,
    overrides: seedOverrides,
  };

  return createScenario(request, createdBy);
}

/**
 * Create scenario from template
 *
 * @param request Template-based creation request
 * @param createdBy User ID
 * @returns Created scenario
 */
export async function createScenarioFromTemplate(
  request: CreateScenarioFromTemplateRequest,
  createdBy: string
): Promise<PlanningScenario> {
  // Fetch template
  const template = await prisma.scenarioTemplate.findUnique({
    where: { id: request.templateId },
  });

  if (!template) {
    throw new Error(`Template ${request.templateId} not found`);
  }

  if (!template.isActive) {
    throw new Error(`Template ${request.templateId} is not active`);
  }

  // Parse template data
  const seedOverrides: Partial<ScenarioOverride>[] = JSON.parse(template.seedOverrides);
  const seedAssumptions: Partial<ScenarioAssumption>[] = JSON.parse(template.seedAssumptions);

  // Apply template inputs to seed values
  const resolvedOverrides = seedOverrides.map(override => ({
    ...override,
    value: resolveTemplateValue(override.field!, request.templateInputs),
    sourceType: 'template' as const,
    createdBy,
    createdAt: new Date().toISOString(),
  })) as ScenarioOverride[];

  const resolvedAssumptions = seedAssumptions.map((assumption, index) => ({
    assumptionId: `assumption_${index}`,
    label: assumption.label!,
    description: assumption.description || null,
    value: resolveTemplateValue(assumption.label!, request.templateInputs),
    units: assumption.units || null,
    confidence: assumption.confidence || 'medium',
  })) as ScenarioAssumption[];

  // Create scenario
  const scenarioRequest: CreateScenarioRequest = {
    householdId: request.householdId,
    taxYear: request.taxYear,
    baselineSnapshotId: request.baselineSnapshotId,
    baselineRunId: request.baselineRunId,
    scenarioType: template.scenarioType as any,
    originatingOpportunityId: request.originatingOpportunityId,
    overrides: resolvedOverrides,
    assumptions: resolvedAssumptions,
  };

  return createScenario(scenarioRequest, createdBy);
}

// ==================== SCENARIO UPDATES ====================

/**
 * Update scenario
 *
 * @param scenarioId Scenario ID
 * @param request Update request
 * @param updatedBy User ID
 * @returns Updated scenario
 */
export async function updateScenario(
  scenarioId: string,
  request: UpdateScenarioRequest,
  updatedBy: string
): Promise<PlanningScenario> {
  // Fetch current scenario
  const current = await prisma.planningScenario.findUnique({
    where: { id: scenarioId },
  });

  if (!current) {
    throw new Error(`Scenario ${scenarioId} not found`);
  }

  // Prepare update data
  const updateData: any = {
    updatedAt: new Date(),
  };

  if (request.title !== undefined) updateData.title = request.title;
  if (request.description !== undefined) updateData.description = request.description;
  if (request.notes !== undefined) updateData.notes = request.notes;
  if (request.overrides !== undefined) updateData.overridesJson = JSON.stringify(request.overrides);
  if (request.assumptions !== undefined) updateData.assumptionsJson = JSON.stringify(request.assumptions);
  if (request.status !== undefined) updateData.status = request.status;

  // Update scenario
  const updated = await prisma.planningScenario.update({
    where: { id: scenarioId },
    data: updateData,
  });

  // Create audit event
  await createAuditEvent({
    eventType: 'updated',
    scenarioId,
    actor: updatedBy,
    actorType: 'advisor',
    changesBefore: current,
    changesAfter: updated,
  });

  return parsePlanningScenario(updated);
}

/**
 * Recommend scenario
 *
 * Marks scenario as recommended and un-recommends others in the same household/taxYear
 *
 * @param scenarioId Scenario ID
 * @param setBy User ID
 * @param reason Optional reason
 * @returns Updated scenario
 */
export async function recommendScenario(
  scenarioId: string,
  setBy: string,
  reason?: string
): Promise<PlanningScenario> {
  // Fetch scenario
  const scenario = await prisma.planningScenario.findUnique({
    where: { id: scenarioId },
  });

  if (!scenario) {
    throw new Error(`Scenario ${scenarioId} not found`);
  }

  // Un-recommend other scenarios for this household/taxYear
  await prisma.planningScenario.updateMany({
    where: {
      householdId: scenario.householdId,
      taxYear: scenario.taxYear,
      id: { not: scenarioId },
      recommended: true,
    },
    data: {
      recommended: false,
    },
  });

  // Recommend this scenario
  const updated = await prisma.planningScenario.update({
    where: { id: scenarioId },
    data: {
      recommended: true,
      status: 'recommended',
      publishedAt: new Date(),
    },
  });

  // Create audit event
  await createAuditEvent({
    eventType: 'recommended',
    scenarioId,
    actor: setBy,
    actorType: 'advisor',
    metadata: { reason },
  });

  return parsePlanningScenario(updated);
}

/**
 * Archive scenario
 *
 * @param scenarioId Scenario ID
 * @param archivedBy User ID
 * @param reason Reason for archiving
 * @returns Updated scenario
 */
export async function archiveScenario(
  scenarioId: string,
  archivedBy: string,
  reason: string
): Promise<PlanningScenario> {
  const updated = await prisma.planningScenario.update({
    where: { id: scenarioId },
    data: {
      status: 'archived',
      recommended: false,
    },
  });

  await createAuditEvent({
    eventType: 'archived',
    scenarioId,
    actor: archivedBy,
    actorType: 'advisor',
    metadata: { reason },
  });

  return parsePlanningScenario(updated);
}

/**
 * Duplicate scenario
 *
 * Creates a copy of an existing scenario
 *
 * @param scenarioId Scenario ID to duplicate
 * @param createdBy User ID
 * @returns New scenario
 */
export async function duplicateScenario(
  scenarioId: string,
  createdBy: string
): Promise<PlanningScenario> {
  // Fetch original
  const original = await prisma.planningScenario.findUnique({
    where: { id: scenarioId },
  });

  if (!original) {
    throw new Error(`Scenario ${scenarioId} not found`);
  }

  // Create duplicate
  const duplicate = await prisma.planningScenario.create({
    data: {
      householdId: original.householdId,
      planId: original.planId,
      taxYear: original.taxYear,
      baselineSnapshotId: original.baselineSnapshotId,
      baselineRunId: original.baselineRunId,
      scenarioSnapshotId: '', // Will recalculate
      scenarioRunId: '', // Will recalculate
      scenarioType: original.scenarioType,
      title: `${original.title} (Copy)`,
      description: original.description,
      originatingOpportunityId: original.originatingOpportunityId,
      overridesJson: original.overridesJson,
      assumptionsJson: original.assumptionsJson,
      warningsJson: original.warningsJson,
      blockersJson: original.blockersJson,
      notes: original.notes,
      status: 'draft',
      recommended: false,
      version: 1,
      createdBy,
    },
  });

  await createAuditEvent({
    eventType: 'created',
    scenarioId: duplicate.id,
    actor: createdBy,
    actorType: 'advisor',
    metadata: { duplicatedFrom: scenarioId },
  });

  return parsePlanningScenario(duplicate);
}

// ==================== SCENARIO RETRIEVAL ====================

/**
 * Get scenario by ID
 *
 * @param scenarioId Scenario ID
 * @returns Scenario
 */
export async function getScenario(scenarioId: string): Promise<PlanningScenario | null> {
  const scenario = await prisma.planningScenario.findUnique({
    where: { id: scenarioId },
  });

  if (!scenario) return null;

  return parsePlanningScenario(scenario);
}

/**
 * List scenarios for household
 *
 * @param householdId Household ID
 * @param taxYear Optional tax year filter
 * @param status Optional status filter
 * @returns Scenarios
 */
export async function listScenarios(
  householdId: string,
  taxYear?: number,
  status?: string
): Promise<PlanningScenario[]> {
  const where: any = { householdId };

  if (taxYear) where.taxYear = taxYear;
  if (status) where.status = status;

  const scenarios = await prisma.planningScenario.findMany({
    where,
    orderBy: [
      { recommended: 'desc' },
      { updatedAt: 'desc' },
    ],
  });

  return scenarios.map(parsePlanningScenario);
}

// ==================== HELPERS ====================

/**
 * Parse Prisma scenario to PlanningScenario type
 */
function parsePlanningScenario(scenario: any): PlanningScenario {
  return {
    id: scenario.id,
    householdId: scenario.householdId,
    planId: scenario.planId,
    taxYear: scenario.taxYear,
    baselineSnapshotId: scenario.baselineSnapshotId,
    baselineRunId: scenario.baselineRunId,
    scenarioSnapshotId: scenario.scenarioSnapshotId,
    scenarioRunId: scenario.scenarioRunId,
    scenarioType: scenario.scenarioType,
    title: scenario.title,
    description: scenario.description,
    originatingOpportunityId: scenario.originatingOpportunityId,
    overrides: JSON.parse(scenario.overridesJson),
    assumptions: JSON.parse(scenario.assumptionsJson),
    warnings: JSON.parse(scenario.warningsJson),
    blockers: scenario.blockersJson ? JSON.parse(scenario.blockersJson) : undefined,
    notes: scenario.notes,
    status: scenario.status,
    recommended: scenario.recommended,
    version: scenario.version,
    supersededBy: scenario.supersededBy,
    createdBy: scenario.createdBy,
    publishedAt: scenario.publishedAt,
    createdAt: scenario.createdAt,
    updatedAt: scenario.updatedAt,
  };
}

/**
 * Validate scenario request
 */
function validateScenarioRequest(request: CreateScenarioRequest): ScenarioValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  if (!request.householdId) {
    errors.push({ field: 'householdId', message: 'householdId is required', severity: 'error' });
  }

  if (!request.taxYear) {
    errors.push({ field: 'taxYear', message: 'taxYear is required', severity: 'error' });
  }

  if (!request.baselineSnapshotId) {
    errors.push({ field: 'baselineSnapshotId', message: 'baselineSnapshotId is required', severity: 'error' });
  }

  if (!request.baselineRunId) {
    errors.push({ field: 'baselineRunId', message: 'baselineRunId is required', severity: 'error' });
  }

  if (!request.scenarioType) {
    errors.push({ field: 'scenarioType', message: 'scenarioType is required', severity: 'error' });
  }

  if (!request.overrides || request.overrides.length === 0) {
    warnings.push({ field: 'overrides', message: 'No overrides specified - scenario will match baseline', severity: 'warning' });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Generate scenario title from type and overrides
 */
function generateScenarioTitle(scenarioType: string, overrides: ScenarioOverride[]): string {
  const typeLabel = scenarioType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

  if (overrides.length === 0) {
    return `${typeLabel} Scenario`;
  }

  // Extract key override values for title
  const keyOverride = overrides[0];
  if (typeof keyOverride.value === 'number') {
    return `${typeLabel}: $${keyOverride.value.toLocaleString()}`;
  }

  return `${typeLabel} Scenario`;
}

/**
 * Generate seed overrides from opportunity
 */
function generateSeedOverridesFromOpportunity(opportunity: any): ScenarioOverride[] {
  const context = JSON.parse(opportunity.contextJson);
  const category = opportunity.category;

  const overrides: ScenarioOverride[] = [];

  if (category === 'roth_conversion' && context.headroom) {
    overrides.push({
      field: 'iraDistributionsTaxable',
      operator: 'add',
      value: context.headroom,
      reason: 'Roth conversion amount from opportunity detection',
      sourceType: 'opportunity_seed',
      createdBy: 'system',
      createdAt: new Date().toISOString(),
    });
  }

  return overrides;
}

/**
 * Map opportunity category to scenario type
 */
function mapOpportunityCategoryToScenarioType(category: string): any {
  const mapping: Record<string, string> = {
    'roth_conversion': 'roth_conversion',
    'irmaa': 'payments',
    'withholding': 'payments',
    'bunching': 'charitable',
    'tax_loss_harvest': 'capital_gains',
  };

  return mapping[category] || 'custom';
}

/**
 * Resolve template value from inputs
 */
function resolveTemplateValue(field: string, inputs: Record<string, any>): any {
  return inputs[field] || null;
}

/**
 * Create audit event
 */
async function createAuditEvent(params: {
  eventType: string;
  scenarioId: string;
  actor: string;
  actorType: string;
  changesBefore?: any;
  changesAfter?: any;
  metadata?: any;
}) {
  await prisma.scenarioAuditEvent.create({
    data: {
      eventType: params.eventType,
      scenarioId: params.scenarioId,
      actor: params.actor,
      actorType: params.actorType,
      changesBefore: params.changesBefore ? JSON.stringify(params.changesBefore) : null,
      changesAfter: params.changesAfter ? JSON.stringify(params.changesAfter) : null,
      metadata: params.metadata ? JSON.stringify(params.metadata) : null,
    },
  });
}
