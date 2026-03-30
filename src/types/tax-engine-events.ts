/**
 * Tax Engine Events — Phase 3
 *
 * Event definitions for downstream consumption by:
 * - Recommendation Engine (Phase 4)
 * - AI Copilot (Phase 10)
 * - Reporting Engine
 * - Analytics Service
 * - Workflow/Task System
 * - Compliance Monitoring
 */

import type { ValidationSeverity, RunType, InterpretationTag } from './tax-engine';

// ==================== BASE EVENT ====================

export interface BaseCalculationEvent {
  eventId: string;
  eventName: string;
  timestamp: string; // ISO8601
  source: 'tax-engine';
  version: '1.0';
}

// ==================== SNAPSHOT EVENTS ====================

export interface TaxInputSnapshotCreatedEvent extends BaseCalculationEvent {
  eventName: 'tax_input_snapshot.created';
  payload: {
    snapshotId: string;
    householdId: string;
    taxYear: number;
    filingStatus: string;
    missingInputCount: number;
    warningCount: number;
    sourceFactCount: number;
    createdBy: string;
  };
}

export interface TaxInputSnapshotValidationFailedEvent extends BaseCalculationEvent {
  eventName: 'tax_input_snapshot.validation_failed';
  payload: {
    snapshotId: string;
    householdId: string;
    taxYear: number;
    status: 'soft_fail_requires_review' | 'hard_fail_block_run';
    errorCount: number;
    warningCount: number;
    failureReasons: string[];
    severity: ValidationSeverity;
  };
}

export interface TaxInputSnapshotValidationPassedEvent extends BaseCalculationEvent {
  eventName: 'tax_input_snapshot.validation_passed';
  payload: {
    snapshotId: string;
    householdId: string;
    taxYear: number;
    status: 'pass' | 'pass_with_warning';
    warningCount: number;
  };
}

// ==================== CALCULATION RUN EVENTS ====================

export interface CalculationRunQueuedEvent extends BaseCalculationEvent {
  eventName: 'calculation_run.queued';
  payload: {
    runId: string;
    snapshotId: string;
    householdId: string;
    taxYear: number;
    runType: RunType;
    rulesVersion: string;
    requestedBy: string;
  };
}

export interface CalculationRunStartedEvent extends BaseCalculationEvent {
  eventName: 'calculation_run.started';
  payload: {
    runId: string;
    snapshotId: string;
    householdId: string;
    taxYear: number;
    runType: RunType;
    rulesVersion: string;
    engineVersion: string;
  };
}

export interface CalculationRunCompletedEvent extends BaseCalculationEvent {
  eventName: 'calculation_run.completed';
  payload: {
    runId: string;
    snapshotId: string;
    householdId: string;
    taxYear: number;
    runType: RunType;
    rulesVersion: string;
    engineVersion: string;
    status: 'completed' | 'completed_with_warning';
    outputHash: string;
    warningCount: number;
    computeTimeMs: number;
    summary: {
      agi: number;
      taxableIncome: number;
      totalTax: number;
      refundOrBalanceDue: number;
      effectiveTaxRate: number;
      marginalTaxRate: number;
    };
  };
}

export interface CalculationRunFailedEvent extends BaseCalculationEvent {
  eventName: 'calculation_run.failed';
  payload: {
    runId: string;
    snapshotId: string;
    householdId: string;
    taxYear: number;
    runType: RunType;
    errorCode: string;
    errorMessage: string;
    failedModule?: string;
    stackTrace?: string;
  };
}

export interface CalculationRunSupersededEvent extends BaseCalculationEvent {
  eventName: 'calculation_run.superseded';
  payload: {
    oldRunId: string;
    newRunId?: string;
    householdId: string;
    taxYear: number;
    reason: 'fact_update' | 'rules_update' | 'manual_recalc';
    triggeredBy: string; // userId or 'system'
    changedFactIds?: string[];
    newSnapshotRecommended: boolean;
  };
}

// ==================== SCENARIO EVENTS ====================

export interface ScenarioOverrideSetCreatedEvent extends BaseCalculationEvent {
  eventName: 'scenario_override_set.created';
  payload: {
    scenarioId: string;
    baselineSnapshotId: string;
    householdId: string;
    taxYear: number;
    overrideCount: number;
    createdBy: string;
  };
}

export interface ScenarioRunCompletedEvent extends BaseCalculationEvent {
  eventName: 'scenario_run.completed';
  payload: {
    scenarioRunId: string;
    baselineRunId: string;
    scenarioId: string;
    householdId: string;
    taxYear: number;
    rulesVersion: string;
    status: 'completed' | 'completed_with_warning';
    warningCount: number;
    computeTimeMs: number;
    diff: {
      agiDelta: number;
      taxableIncomeDelta: number;
      totalTaxDelta: number;
      refundOrBalanceDueDelta: number;
      effectiveRateDelta: number;
    };
    interpretationTags: InterpretationTag[];
  };
}

// ==================== RECOMMENDATION SIGNALS EVENTS ====================

export interface TaxResultAvailableForRecommendationsEvent extends BaseCalculationEvent {
  eventName: 'tax_result.available_for_recommendations';
  payload: {
    runId: string;
    householdId: string;
    taxYear: number;
    runType: RunType;
    status: 'ready';
    signals: {
      marginalBracket: number;
      niitApplies: boolean;
      niitProximity: number | null;
      irmaaB1: boolean;
      irmaaProximity: number | null;
      rothConversionSpace: number | null;
      capitalGainHarvestingSpace: number | null;
      charitableBunchingOpportunity: boolean;
      estimatedTaxShortfall: number | null;
      potentialPenalty: boolean;
    };
  };
}

// ==================== COMPARISON EVENTS ====================

export interface RunComparisonCompletedEvent extends BaseCalculationEvent {
  eventName: 'run_comparison.completed';
  payload: {
    comparisonId: string;
    baselineRunId: string;
    scenarioRunId: string;
    householdId: string;
    taxYear: number;
    interpretationTags: InterpretationTag[];
    summaryDiff: {
      agiDelta: number;
      taxableIncomeDelta: number;
      totalTaxDelta: number;
      effectiveRateDelta: number;
    };
    narrativeGenerated: boolean;
  };
}

// ==================== RULES EVENTS ====================

export interface RulesPackagePublishedEvent extends BaseCalculationEvent {
  eventName: 'rules_package.published';
  payload: {
    rulesVersion: string;
    taxYear: number;
    jurisdiction: string;
    publishedBy: string;
    changelogCount: number;
    checksum: string;
  };
}

export interface RulesPackageDeprecatedEvent extends BaseCalculationEvent {
  eventName: 'rules_package.deprecated';
  payload: {
    rulesVersion: string;
    taxYear: number;
    reason: string;
    deprecatedBy: string;
    replacedBy?: string;
  };
}

// ==================== TRACE & EXPLANATION EVENTS ====================

export interface ExplanationPayloadGeneratedEvent extends BaseCalculationEvent {
  eventName: 'explanation_payload.generated';
  payload: {
    runId: string;
    householdId: string;
    taxYear: number;
    payloadType: 'baseline' | 'scenario' | 'comparison';
    majorDriversCount: number;
    warningCount: number;
    unsupportedItemsCount: number;
    generatedAt: string;
  };
}

// ==================== AUDIT EVENTS ====================

export interface ManualRecalculationTriggeredEvent extends BaseCalculationEvent {
  eventName: 'manual_recalculation.triggered';
  payload: {
    oldRunId: string;
    newRunId: string;
    householdId: string;
    taxYear: number;
    triggeredBy: string;
    reason: string;
  };
}

export interface FactVersionUpdateDetectedEvent extends BaseCalculationEvent {
  eventName: 'fact_version_update.detected';
  payload: {
    factId: string;
    oldVersion: number;
    newVersion: number;
    householdId: string;
    taxYear: number;
    impactedSnapshotIds: string[];
    impactedRunIds: string[];
  };
}

// ==================== UNION TYPE ====================

export type TaxEngineEvent =
  | TaxInputSnapshotCreatedEvent
  | TaxInputSnapshotValidationFailedEvent
  | TaxInputSnapshotValidationPassedEvent
  | CalculationRunQueuedEvent
  | CalculationRunStartedEvent
  | CalculationRunCompletedEvent
  | CalculationRunFailedEvent
  | CalculationRunSupersededEvent
  | ScenarioOverrideSetCreatedEvent
  | ScenarioRunCompletedEvent
  | TaxResultAvailableForRecommendationsEvent
  | RunComparisonCompletedEvent
  | RulesPackagePublishedEvent
  | RulesPackageDeprecatedEvent
  | ExplanationPayloadGeneratedEvent
  | ManualRecalculationTriggeredEvent
  | FactVersionUpdateDetectedEvent;

// ==================== EVENT EMITTER INTERFACE ====================

export interface TaxEngineEventEmitter {
  emit(event: TaxEngineEvent): Promise<void>;
  emitBatch(events: TaxEngineEvent[]): Promise<void>;
}

// ==================== EVENT HANDLER INTERFACE ====================

export interface TaxEngineEventHandler<T extends TaxEngineEvent = TaxEngineEvent> {
  eventName: T['eventName'];
  handle(event: T): Promise<void>;
}

// ==================== EVENT UTILITIES ====================

/**
 * Create a new event ID
 */
export function createEventId(): string {
  return `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Create base event structure
 */
export function createBaseEvent(eventName: string): BaseCalculationEvent {
  return {
    eventId: createEventId(),
    eventName,
    timestamp: new Date().toISOString(),
    source: 'tax-engine',
    version: '1.0',
  };
}

/**
 * Type guard to check if event is a specific type
 */
export function isEventOfType<T extends TaxEngineEvent>(
  event: TaxEngineEvent,
  eventName: T['eventName']
): event is T {
  return event.eventName === eventName;
}

// ==================== EVENT REGISTRY ====================

export const TAX_ENGINE_EVENT_NAMES = {
  SNAPSHOT_CREATED: 'tax_input_snapshot.created',
  SNAPSHOT_VALIDATION_FAILED: 'tax_input_snapshot.validation_failed',
  SNAPSHOT_VALIDATION_PASSED: 'tax_input_snapshot.validation_passed',
  RUN_QUEUED: 'calculation_run.queued',
  RUN_STARTED: 'calculation_run.started',
  RUN_COMPLETED: 'calculation_run.completed',
  RUN_FAILED: 'calculation_run.failed',
  RUN_SUPERSEDED: 'calculation_run.superseded',
  SCENARIO_OVERRIDE_CREATED: 'scenario_override_set.created',
  SCENARIO_RUN_COMPLETED: 'scenario_run.completed',
  TAX_RESULT_AVAILABLE: 'tax_result.available_for_recommendations',
  RUN_COMPARISON_COMPLETED: 'run_comparison.completed',
  RULES_PACKAGE_PUBLISHED: 'rules_package.published',
  RULES_PACKAGE_DEPRECATED: 'rules_package.deprecated',
  EXPLANATION_PAYLOAD_GENERATED: 'explanation_payload.generated',
  MANUAL_RECALCULATION_TRIGGERED: 'manual_recalculation.triggered',
  FACT_VERSION_UPDATE_DETECTED: 'fact_version_update.detected',
} as const;
