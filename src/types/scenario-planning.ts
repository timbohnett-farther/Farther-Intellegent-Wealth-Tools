/**
 * Scenario Planning Workspace Types
 *
 * Phase 5: Complete type system for scenario planning, comparison, templates, and lifecycle.
 */

// ==================== CORE SCENARIO TYPES ====================

export type ScenarioType =
  | 'roth_conversion'
  | 'charitable'
  | 'capital_gains'
  | 'payments'
  | 'retirement_income'
  | 'transition'
  | 'custom';

export type ScenarioStatus =
  | 'draft'
  | 'ready_for_review'
  | 'reviewed'
  | 'recommended'
  | 'presented'
  | 'archived'
  | 'superseded';

export interface PlanningScenario {
  id: string;
  householdId: string;
  planId?: string | null;
  taxYear: number;

  // Baseline references
  baselineSnapshotId: string;
  baselineRunId: string;

  // Scenario references
  scenarioSnapshotId: string;
  scenarioRunId: string;

  // Metadata
  scenarioType: ScenarioType;
  title: string;
  description?: string | null;

  // Origin
  originatingOpportunityId?: string | null;

  // Data
  overrides: ScenarioOverride[];
  assumptions: ScenarioAssumption[];
  warnings: string[];
  blockers?: MissingInfoItem[];

  // Notes
  notes?: string | null;

  // Lifecycle
  status: ScenarioStatus;
  recommended: boolean;

  // Versioning
  version: number;
  supersededBy?: string | null;

  // Attribution
  createdBy: string;
  publishedAt?: Date | null;

  createdAt: Date;
  updatedAt: Date;
}

// ==================== SCENARIO OVERRIDE ====================

export type OverrideOperator = 'replace' | 'add' | 'subtract' | 'toggle';
export type OverrideSourceType = 'manual' | 'template' | 'opportunity_seed';

export interface ScenarioOverride {
  field: string;
  operator: OverrideOperator;
  value: number | string | boolean | null;
  reason: string;
  sourceType: OverrideSourceType;
  createdBy: string;
  createdAt: string;
}

// ==================== SCENARIO ASSUMPTION ====================

export interface ScenarioAssumption {
  assumptionId: string;
  label: string;
  description?: string | null;
  value: number | string | boolean | null;
  units?: string | null;
  confidence?: 'high' | 'medium' | 'low';
}

// ==================== MISSING INFO ITEM ====================

export interface MissingInfoItem {
  field: string;
  label: string;
  description: string;
  severity: 'blocking' | 'warning' | 'info';
  suggestedSource?: string;
}

// ==================== SCENARIO NOTE ====================

export type NoteType = 'advisor_internal' | 'meeting_prep' | 'assumption' | 'compliance';

export interface ScenarioNote {
  id: string;
  scenarioId: string;
  noteType: NoteType;
  body: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// ==================== SCENARIO COMPARISON ====================

export interface ScenarioComparison {
  id: string;
  householdId: string;
  taxYear: number;

  // Baseline
  baselineScenarioId: string;

  // Comparison scenarios
  comparisonScenarioIds: string[];

  // Results
  comparisonPayload: ScenarioComparisonPayload;
  interpretationNotes?: string[];
  warnings?: string[];

  createdBy: string;
  createdAt: Date;
}

export interface ScenarioComparisonPayload {
  comparisonId: string;
  householdId: string;
  taxYear: number;
  baselineRunId: string;
  comparisonRunIds: string[];
  summaryCards: ComparisonSummaryCard[];
  rowComparisons: ComparisonRow[];
  interpretationNotes: string[];
  warnings: string[];
}

export interface ComparisonSummaryCard {
  label: string;
  baselineValue: number | string | null;
  comparisonValues: Array<{
    runId: string;
    value: number | string | null;
    delta: number | null;
  }>;
}

export interface ComparisonRow {
  field: string;
  label: string;
  baselineValue: number | string | null;
  comparisonValues: Array<{
    runId: string;
    value: number | string | null;
    delta: number | null;
  }>;
  significance: 'high' | 'medium' | 'low';
}

// ==================== SCENARIO TEMPLATE ====================

export interface ScenarioTemplate {
  id: string;
  templateName: string;
  scenarioType: ScenarioType;
  name: string;
  description: string;

  requiredFields: string[];
  seedOverrides: Partial<ScenarioOverride>[];
  seedAssumptions: Partial<ScenarioAssumption>[];
  linkedOpportunityTypes: string[];

  isActive: boolean;
  displayOrder: number;

  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// ==================== SCENARIO AUDIT EVENT ====================

export type ScenarioEventType =
  | 'created'
  | 'updated'
  | 'calculated'
  | 'validation_failed'
  | 'recommended'
  | 'archived'
  | 'superseded'
  | 'converted_to_report'
  | 'converted_to_task';

export type ActorType = 'advisor' | 'system' | 'client';

export interface ScenarioAuditEvent {
  id: string;
  eventType: ScenarioEventType;
  scenarioId: string;

  actor: string;
  actorType: ActorType;

  changesBefore?: any;
  changesAfter?: any;
  metadata?: any;

  ipAddress?: string | null;
  userAgent?: string | null;
  sessionId?: string | null;

  timestamp: Date;
}

// ==================== SCENARIO RECOMMENDATION ====================

export interface ScenarioRecommendationState {
  scenarioId: string;
  isRecommended: boolean;
  setBy: string;
  setAt: string;
  reason?: string | null;
}

// ==================== API REQUEST/RESPONSE TYPES ====================

export interface CreateScenarioRequest {
  householdId: string;
  taxYear: number;
  baselineSnapshotId: string;
  baselineRunId: string;
  scenarioType: ScenarioType;
  originatingOpportunityId?: string;
  overrides: ScenarioOverride[];
  assumptions?: ScenarioAssumption[];
  title?: string;
  description?: string;
  notes?: string;
}

export interface UpdateScenarioRequest {
  title?: string;
  description?: string;
  notes?: string;
  overrides?: ScenarioOverride[];
  assumptions?: ScenarioAssumption[];
  status?: ScenarioStatus;
}

export interface CompareScenariosRequest {
  householdId: string;
  taxYear: number;
  baselineScenarioId: string;
  comparisonScenarioIds: string[];
}

export interface CreateScenarioFromTemplateRequest {
  householdId: string;
  taxYear: number;
  baselineSnapshotId: string;
  baselineRunId: string;
  templateId: string;
  templateInputs: Record<string, any>;
  originatingOpportunityId?: string;
}

export interface RecommendScenarioRequest {
  reason?: string;
}

export interface ArchiveScenarioRequest {
  reason: string;
}

// ==================== LIFECYCLE STATE MACHINE ====================

export interface ScenarioLifecycleState {
  status: ScenarioStatus;
  allowedTransitions: ScenarioStatus[];
  suggestedActions: string[];
  scenarioTemplates?: string[];
}

export const SCENARIO_LIFECYCLE: Record<ScenarioStatus, ScenarioLifecycleState> = {
  draft: {
    status: 'draft',
    allowedTransitions: ['ready_for_review', 'archived'],
    suggestedActions: ['Edit overrides', 'Add assumptions', 'Add notes'],
  },
  ready_for_review: {
    status: 'ready_for_review',
    allowedTransitions: ['draft', 'reviewed', 'archived'],
    suggestedActions: ['Review assumptions', 'Validate calculations', 'Add compliance notes'],
  },
  reviewed: {
    status: 'reviewed',
    allowedTransitions: ['recommended', 'draft', 'archived'],
    suggestedActions: ['Mark as recommended', 'Compare with alternatives', 'Prepare presentation'],
  },
  recommended: {
    status: 'recommended',
    allowedTransitions: ['presented', 'reviewed', 'archived'],
    suggestedActions: ['Create report', 'Schedule client meeting', 'Create task'],
  },
  presented: {
    status: 'presented',
    allowedTransitions: ['recommended', 'archived', 'superseded'],
    suggestedActions: ['Track client decision', 'Create implementation task', 'Monitor progress'],
  },
  archived: {
    status: 'archived',
    allowedTransitions: [],
    suggestedActions: [],
  },
  superseded: {
    status: 'superseded',
    allowedTransitions: [],
    suggestedActions: [],
  },
};

// ==================== SCENARIO TEMPLATES REGISTRY ====================

export interface ScenarioTemplateDefinition {
  templateName: string;
  scenarioType: ScenarioType;
  name: string;
  description: string;
  requiredFields: string[];
  defaultTitle: string;
  warningPrompts: string[];
  linkedOpportunityTypes: string[];
  seedOverridesBuilder: (inputs: Record<string, any>) => Partial<ScenarioOverride>[];
  seedAssumptionsBuilder: (inputs: Record<string, any>) => Partial<ScenarioAssumption>[];
}

// ==================== COMPARISON HELPERS ====================

export interface ComparisonConfig {
  fields: ComparisonFieldConfig[];
  summaryCards: string[];
}

export interface ComparisonFieldConfig {
  field: string;
  label: string;
  format?: 'currency' | 'percentage' | 'number' | 'string';
  significance?: (delta: number | null) => 'high' | 'medium' | 'low';
}

// ==================== SCENARIO CALCULATION CONTEXT ====================

export interface ScenarioCalculationContext {
  scenarioId: string;
  baselineSnapshotId: string;
  baselineRunId: string;
  overrides: ScenarioOverride[];
  assumptions: ScenarioAssumption[];
  warnings: string[];
  blockers: MissingInfoItem[];
}

// ==================== VALIDATION RESULTS ====================

export interface ScenarioValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  severity: 'error';
}

export interface ValidationWarning {
  field: string;
  message: string;
  severity: 'warning';
}

// ==================== EVENT PAYLOADS ====================

export interface ScenarioCreatedEvent {
  eventName: 'scenario.created';
  scenarioId: string;
  householdId: string;
  taxYear: number;
  scenarioType: ScenarioType;
  originatingOpportunityId?: string;
  createdAt: string;
}

export interface ScenarioUpdatedEvent {
  eventName: 'scenario.updated';
  scenarioId: string;
  changesBefore: Partial<PlanningScenario>;
  changesAfter: Partial<PlanningScenario>;
  updatedAt: string;
}

export interface ScenarioCalculatedEvent {
  eventName: 'scenario.calculated';
  scenarioId: string;
  scenarioRunId: string;
  calculationTimeMs: number;
  validationsPassed: boolean;
  calculatedAt: string;
}

export interface ScenarioValidationFailedEvent {
  eventName: 'scenario.validation_failed';
  scenarioId: string;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  failedAt: string;
}

export interface ScenarioRecommendedEvent {
  eventName: 'scenario.recommended';
  scenarioId: string;
  setBy: string;
  reason?: string;
  recommendedAt: string;
}

export interface ScenarioArchivedEvent {
  eventName: 'scenario.archived';
  scenarioId: string;
  reason: string;
  archivedAt: string;
}

export interface ScenarioSupersededEvent {
  eventName: 'scenario.superseded';
  scenarioId: string;
  supersededBy: string;
  reason: string;
  supersededAt: string;
}

export interface ScenarioConvertedToReportEvent {
  eventName: 'scenario.converted_to_report';
  scenarioId: string;
  reportId: string;
  convertedAt: string;
}

export interface ScenarioConvertedToTaskEvent {
  eventName: 'scenario.converted_to_task';
  scenarioId: string;
  taskId: string;
  convertedAt: string;
}

export type ScenarioEvent =
  | ScenarioCreatedEvent
  | ScenarioUpdatedEvent
  | ScenarioCalculatedEvent
  | ScenarioValidationFailedEvent
  | ScenarioRecommendedEvent
  | ScenarioArchivedEvent
  | ScenarioSupersededEvent
  | ScenarioConvertedToReportEvent
  | ScenarioConvertedToTaskEvent;
