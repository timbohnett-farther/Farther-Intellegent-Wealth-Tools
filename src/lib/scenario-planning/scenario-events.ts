/**
 * Scenario Events — Phase 5A
 *
 * Event emitters for scenario lifecycle events.
 * Wraps the household event bus with scenario-specific event types.
 */

import { eventBus } from '@/lib/household/event-bus';

// ==================== EVENT EMITTERS ====================

/**
 * Emit scenario.created event
 */
export function emitScenarioCreated(params: {
  scenarioId: string;
  householdId: string;
  taxYear: number;
  scenarioType: string;
  createdBy: string;
  firmId?: string;
}): void {
  eventBus.publish({
    eventType: 'scenario.created',
    householdId: params.householdId,
    firmId: params.firmId || 'firm-001', // TODO: derive from household
    advisorId: params.createdBy,
    source: 'ADVISOR',
    actor: { userId: params.createdBy, role: 'ADVISOR' },
    payload: {
      scenarioId: params.scenarioId,
      taxYear: params.taxYear,
      scenarioType: params.scenarioType,
    },
  });
}

/**
 * Emit scenario.updated event
 */
export function emitScenarioUpdated(params: {
  scenarioId: string;
  householdId: string;
  taxYear: number;
  updatedBy: string;
  changedFields?: string[];
  firmId?: string;
}): void {
  eventBus.publish({
    eventType: 'scenario.updated',
    householdId: params.householdId,
    firmId: params.firmId || 'firm-001',
    advisorId: params.updatedBy,
    source: 'ADVISOR',
    actor: { userId: params.updatedBy, role: 'ADVISOR' },
    payload: {
      scenarioId: params.scenarioId,
      taxYear: params.taxYear,
      changedFields: params.changedFields,
    },
  });
}

/**
 * Emit scenario.calculated event
 */
export function emitScenarioCalculated(params: {
  scenarioId: string;
  scenarioRunId: string;
  householdId: string;
  taxYear: number;
  totalTax: number;
  computeTimeMs: number;
  firmId?: string;
}): void {
  eventBus.publish({
    eventType: 'scenario.calculated',
    householdId: params.householdId,
    firmId: params.firmId || 'firm-001',
    advisorId: 'system',
    source: 'SYSTEM',
    actor: { userId: 'system', role: 'SYSTEM' },
    payload: {
      scenarioId: params.scenarioId,
      scenarioRunId: params.scenarioRunId,
      taxYear: params.taxYear,
      totalTax: params.totalTax,
      computeTimeMs: params.computeTimeMs,
    },
  });
}

/**
 * Emit scenario.recommended event
 */
export function emitScenarioRecommended(params: {
  scenarioId: string;
  householdId: string;
  taxYear: number;
  recommendedBy: string;
  reason?: string;
  firmId?: string;
}): void {
  eventBus.publish({
    eventType: 'scenario.recommended',
    householdId: params.householdId,
    firmId: params.firmId || 'firm-001',
    advisorId: params.recommendedBy,
    source: 'ADVISOR',
    actor: { userId: params.recommendedBy, role: 'ADVISOR' },
    payload: {
      scenarioId: params.scenarioId,
      taxYear: params.taxYear,
      reason: params.reason,
    },
  });
}

/**
 * Emit scenario.archived event
 */
export function emitScenarioArchived(params: {
  scenarioId: string;
  householdId: string;
  taxYear: number;
  archivedBy: string;
  reason?: string;
  firmId?: string;
}): void {
  eventBus.publish({
    eventType: 'scenario.archived',
    householdId: params.householdId,
    firmId: params.firmId || 'firm-001',
    advisorId: params.archivedBy,
    source: 'ADVISOR',
    actor: { userId: params.archivedBy, role: 'ADVISOR' },
    payload: {
      scenarioId: params.scenarioId,
      taxYear: params.taxYear,
      reason: params.reason,
    },
  });
}

/**
 * Emit scenario.comparison_created event
 */
export function emitScenarioComparisonCreated(params: {
  comparisonId: string;
  householdId: string;
  taxYear: number;
  baselineScenarioId: string;
  comparisonScenarioIds: string[];
  createdBy: string;
  firmId?: string;
}): void {
  eventBus.publish({
    eventType: 'scenario.comparison_created',
    householdId: params.householdId,
    firmId: params.firmId || 'firm-001',
    advisorId: params.createdBy,
    source: 'ADVISOR',
    actor: { userId: params.createdBy, role: 'ADVISOR' },
    payload: {
      comparisonId: params.comparisonId,
      taxYear: params.taxYear,
      baselineScenarioId: params.baselineScenarioId,
      comparisonScenarioIds: params.comparisonScenarioIds,
    },
  });
}
