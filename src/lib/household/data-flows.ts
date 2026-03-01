/**
 * Farther Unified Platform — Cross-Platform Data Flows
 *
 * Orchestrates the primary data flow patterns that span multiple
 * platform subsystems. Each flow is a coordinated series of events
 * published to the household event bus, which subscribers pick up
 * and process asynchronously.
 *
 * Primary data flows:
 * 1. New Household -> Plan -> CRM -> Portal
 * 2. Account Connected -> Sync -> Proposal -> Analytics
 * 3. Proposal Accepted -> Transition -> Tracking -> Billing
 * 4. Tax Table Updated -> Impact -> Recalc -> Alert
 * 5. Review Cycle -> Schedule -> CRM -> Portal
 *
 * Each orchestrator function publishes the initial event(s) and
 * logs the flow execution for audit and monitoring.
 *
 * This module is self-contained and does not depend on React or Next.js.
 */

import { eventBus } from './event-bus';
import type { HouseholdEventType } from './event-bus';

// ==================== TYPES ====================

/** Status of a flow execution. */
export type FlowStatus = 'started' | 'in_progress' | 'completed' | 'failed';

/** Identifies one of the platform data flows. */
export type DataFlowType =
  | 'new_household'
  | 'account_connected'
  | 'proposal_accepted'
  | 'tax_table_updated'
  | 'review_cycle';

/** A single step within a data flow. */
export interface FlowStep {
  name: string;
  eventType: HouseholdEventType;
  status: FlowStatus;
  timestamp: string;
  detail: string;
}

/** Tracks the execution of a complete data flow. */
export interface FlowExecution {
  id: string;
  flowType: DataFlowType;
  householdId: string;
  status: FlowStatus;
  startedAt: string;
  completedAt: string | null;
  steps: FlowStep[];
  metadata: Record<string, unknown>;
  error: string | null;
}

/** Input data for the new household flow. */
export interface NewHouseholdInput {
  householdId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  advisorId: string;
  advisorName: string;
  firmId: string;
  initialStatus?: string;
}

/** Input data for the account connected flow. */
export interface AccountConnectedInput {
  accountId: string;
  accountName: string;
  accountType: string;
  custodian: string;
  balance: number;
  isHeldAway: boolean;
}

/** Input data for the tax table update flow. */
export interface TaxTableChange {
  tableType: string;
  previousVersion: string;
  newVersion: string;
  description: string;
}

/** Input data for the review cycle flow. */
export interface ReviewCycleInput {
  reviewDate: string;
  reviewType: 'annual' | 'semi_annual' | 'quarterly' | 'ad_hoc';
  advisorId: string;
  advisorName: string;
  agenda?: string[];
}

// ==================== LOGGING HELPER ====================

function log(method: string, detail: string): void {
  console.log(`[DataFlows:${method}] ${detail}`);
}

// ==================== ID GENERATORS ====================

let flowCounter = 0;

function generateFlowId(flowType: DataFlowType): string {
  flowCounter++;
  return `flow_${flowType}_${Date.now()}_${flowCounter}`;
}

// ==================== FLOW EXECUTION STORE ====================

/** In-memory store for flow executions. */
const flowExecutions: FlowExecution[] = [];

/**
 * Creates a new flow execution tracker.
 */
function createFlowExecution(
  flowType: DataFlowType,
  householdId: string,
  metadata: Record<string, unknown> = {},
): FlowExecution {
  const execution: FlowExecution = {
    id: generateFlowId(flowType),
    flowType,
    householdId,
    status: 'started',
    startedAt: new Date().toISOString(),
    completedAt: null,
    steps: [],
    metadata,
    error: null,
  };

  flowExecutions.push(execution);
  return execution;
}

/**
 * Records a step in a flow execution and publishes the corresponding event.
 */
function executeStep(
  execution: FlowExecution,
  stepName: string,
  eventType: HouseholdEventType,
  payload: Record<string, unknown>,
  detail: string,
  context: { firmId: string; advisorId: string },
): void {
  const step: FlowStep = {
    name: stepName,
    eventType,
    status: 'completed',
    timestamp: new Date().toISOString(),
    detail,
  };

  execution.steps.push(step);
  execution.status = 'in_progress';

  log(
    'executeStep',
    `Flow ${execution.id} step "${stepName}": publishing ${eventType}`,
  );

  eventBus.publish({
    eventType,
    householdId: execution.householdId,
    firmId: context.firmId,
    advisorId: context.advisorId,
    source: 'SYSTEM',
    actor: { userId: 'data-flow-orchestrator', role: 'SYSTEM' },
    payload,
  });
}

/**
 * Marks a flow execution as completed.
 */
function completeFlow(execution: FlowExecution): void {
  execution.status = 'completed';
  execution.completedAt = new Date().toISOString();

  log(
    'completeFlow',
    `Flow ${execution.id} (${execution.flowType}) completed. ` +
      `Steps: ${execution.steps.length}, ` +
      `duration: ${Date.now() - new Date(execution.startedAt).getTime()}ms`,
  );
}

/**
 * Marks a flow execution as failed.
 */
function failFlow(execution: FlowExecution, error: string): void {
  execution.status = 'failed';
  execution.completedAt = new Date().toISOString();
  execution.error = error;

  log('failFlow', `Flow ${execution.id} (${execution.flowType}) failed: ${error}`);
}

// ==================== FLOW 1: NEW HOUSEHOLD ====================

/**
 * Orchestrates the new household onboarding data flow.
 *
 * Flow sequence:
 * 1. household.created -> triggers CRM contact creation, portal setup
 * 2. plan.created -> triggers initial plan scaffold
 * 3. household.status_changed -> sets initial lifecycle stage
 *
 * Downstream subscribers handle:
 * - HubSpotSubscriber: creates CRM contact
 * - ClientPortalSubscriber: no notification yet (plan not ready)
 * - PlanningSubscriber: awaits plan data input
 *
 * @param input - Household and advisor data for onboarding.
 * @returns The flow execution tracker.
 */
export function executeNewHouseholdFlow(input: NewHouseholdInput): FlowExecution {
  log('executeNewHouseholdFlow', `Starting new household flow for ${input.householdId}`);

  const execution = createFlowExecution('new_household', input.householdId, {
    firstName: input.firstName,
    lastName: input.lastName,
    email: input.email,
    advisorId: input.advisorId,
  });

  const ctx = { firmId: input.firmId, advisorId: input.advisorId };

  try {
    // Step 1: Publish household.created
    executeStep(execution, 'create_household', 'household.created', {
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      phone: input.phone ?? null,
      advisorId: input.advisorId,
      advisorName: input.advisorName,
    }, `Created household for ${input.firstName} ${input.lastName}`, ctx);

    // Step 2: Publish plan.created to scaffold an initial financial plan
    const planId = `plan_${input.householdId}`;
    executeStep(execution, 'create_plan', 'plan.created', {
      planId,
      planType: 'comprehensive',
      advisorId: input.advisorId,
      status: 'draft',
    }, `Created initial plan ${planId}`, ctx);

    // Step 3: Set initial household status
    const initialStatus = input.initialStatus ?? 'onboarding';
    executeStep(execution, 'set_status', 'household.status_changed', {
      previousStatus: null,
      newStatus: initialStatus,
    }, `Set household status to ${initialStatus}`, ctx);

    completeFlow(execution);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    failFlow(execution, message);
  }

  return execution;
}

// ==================== FLOW 2: ACCOUNT CONNECTED ====================

/**
 * Orchestrates the account connected data flow.
 *
 * Flow sequence:
 * 1. account.connected -> notifies proposal subscriber of new account
 * 2. custodian.sync_completed -> triggers portfolio refresh
 * 3. account.balance_changed -> triggers plan recalculation
 *
 * Downstream subscribers handle:
 * - ProposalSubscriber: updates held-away capture in active proposals
 * - PlanningSubscriber: recalculates projections with new account data
 * - ClientPortalSubscriber: notifies client of balance update
 *
 * @param householdId - The household that connected the account.
 * @param account - Account details.
 * @param context - Firm and advisor context for event metadata.
 * @returns The flow execution tracker.
 */
export function executeAccountConnectedFlow(
  householdId: string,
  account: AccountConnectedInput,
  context: { firmId: string; advisorId: string },
): FlowExecution {
  log(
    'executeAccountConnectedFlow',
    `Starting account connected flow for household ${householdId}, ` +
      `account ${account.accountId} at ${account.custodian}`,
  );

  const execution = createFlowExecution('account_connected', householdId, {
    accountId: account.accountId,
    custodian: account.custodian,
    balance: account.balance,
  });

  try {
    // Step 1: Publish account.connected
    executeStep(execution, 'account_connected', 'account.connected', {
      accountId: account.accountId,
      accountName: account.accountName,
      accountType: account.accountType,
      custodian: account.custodian,
      balance: account.balance,
      isHeldAway: account.isHeldAway,
    }, `Account ${account.accountId} connected via ${account.custodian}`, context);

    // Step 2: Simulate custodian sync completion
    executeStep(execution, 'custodian_sync', 'custodian.sync_completed', {
      custodian: account.custodian,
      accountCount: 1,
      syncedAccounts: [account.accountId],
      syncTimestamp: new Date().toISOString(),
    }, `Custodian ${account.custodian} sync completed for 1 account`, context);

    // Step 3: Publish balance change to trigger plan recalc
    executeStep(execution, 'balance_update', 'account.balance_changed', {
      accountId: account.accountId,
      previousBalance: 0,
      newBalance: account.balance,
      changeAmount: account.balance,
      changePercent: 100,
    }, `Account ${account.accountId} balance set to $${account.balance.toLocaleString()}`, context);

    completeFlow(execution);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    failFlow(execution, message);
  }

  return execution;
}

// ==================== FLOW 3: PROPOSAL ACCEPTED ====================

/**
 * Orchestrates the proposal accepted data flow.
 *
 * Flow sequence:
 * 1. proposal.accepted -> triggers transition workflow
 * 2. household.status_changed -> updates household to active
 *
 * Downstream subscribers handle:
 * - ProposalSubscriber: records state transition, triggers workflows
 * - HubSpotSubscriber: updates CRM lifecycle stage
 * - ClientPortalSubscriber: notifies client of progress
 *
 * @param householdId - The household accepting the proposal.
 * @param proposalId - The accepted proposal ID.
 * @param context - Firm and advisor context for event metadata.
 * @param proposalDetails - Additional proposal metadata.
 * @returns The flow execution tracker.
 */
export function executeProposalAcceptedFlow(
  householdId: string,
  proposalId: string,
  context: { firmId: string; advisorId: string },
  proposalDetails: {
    proposalName?: string;
    totalAum?: number;
    feeSchedule?: string;
    targetAllocation?: string;
  } = {},
): FlowExecution {
  log(
    'executeProposalAcceptedFlow',
    `Starting proposal accepted flow for household ${householdId}, ` +
      `proposal ${proposalId}`,
  );

  const execution = createFlowExecution('proposal_accepted', householdId, {
    proposalId,
    ...proposalDetails,
  });

  try {
    // Step 1: Publish proposal.accepted
    executeStep(execution, 'proposal_accepted', 'proposal.accepted', {
      proposalId,
      proposalName: proposalDetails.proposalName ?? `Proposal ${proposalId}`,
      totalAum: proposalDetails.totalAum ?? 0,
      acceptedAt: new Date().toISOString(),
    }, `Proposal ${proposalId} accepted`, context);

    // Step 2: Update household status to active
    executeStep(execution, 'activate_household', 'household.status_changed', {
      previousStatus: 'onboarding',
      newStatus: 'active',
      reason: `Proposal ${proposalId} accepted`,
    }, 'Household status changed to active', context);

    // Step 3: Update household with AUM and billing info
    executeStep(execution, 'update_household', 'household.updated', {
      changedFields: ['aum', 'feeSchedule'],
      aum: proposalDetails.totalAum ?? 0,
      feeSchedule: proposalDetails.feeSchedule ?? 'standard',
    }, `Updated household AUM to $${(proposalDetails.totalAum ?? 0).toLocaleString()}`, context);

    completeFlow(execution);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    failFlow(execution, message);
  }

  return execution;
}

// ==================== FLOW 4: TAX TABLE UPDATED ====================

/**
 * Orchestrates the tax table update data flow.
 *
 * When tax tables are updated (e.g. new IRS brackets), this flow
 * identifies all affected households and triggers recalculations.
 *
 * Flow sequence:
 * 1. For each affected household: tax_profile.updated
 * 2. PlanningSubscriber picks up each event and queues recalcs
 * 3. Results cascade to proposals and CRM
 *
 * @param taxYear - The tax year being updated.
 * @param changes - Array of specific table changes.
 * @param affectedHouseholdIds - List of household IDs to recalculate.
 * @param firmId - The firm these households belong to.
 * @returns The flow execution tracker.
 */
export function executeTaxTableUpdatedFlow(
  taxYear: number,
  changes: TaxTableChange[],
  affectedHouseholdIds: string[],
  firmId: string,
): FlowExecution {
  // Use a synthetic household ID for the flow-level tracking
  const syntheticHouseholdId = `tax_update_${taxYear}`;

  log(
    'executeTaxTableUpdatedFlow',
    `Starting tax table update flow for year ${taxYear}, ` +
      `${changes.length} changes, ${affectedHouseholdIds.length} affected households`,
  );

  const execution = createFlowExecution('tax_table_updated', syntheticHouseholdId, {
    taxYear,
    changeCount: changes.length,
    affectedHouseholdCount: affectedHouseholdIds.length,
    tableTypes: changes.map((c) => c.tableType),
  });

  try {
    // Step 1: Log the tax table change as a flow step
    const step: FlowStep = {
      name: 'tax_table_changed',
      eventType: 'tax_profile.updated',
      status: 'completed',
      timestamp: new Date().toISOString(),
      detail: `Tax tables updated for year ${taxYear}: ${changes.map((c) => c.tableType).join(', ')}`,
    };
    execution.steps.push(step);
    execution.status = 'in_progress';

    log(
      'executeTaxTableUpdatedFlow',
      `Tax table changes: ${changes.map((c) => `${c.tableType} (${c.previousVersion} -> ${c.newVersion})`).join(', ')}`,
    );

    // Step 2: Publish tax_profile.updated for each affected household
    let processedCount = 0;
    for (const householdId of affectedHouseholdIds) {
      eventBus.publish({
        eventType: 'tax_profile.updated',
        householdId,
        firmId,
        advisorId: 'system',
        source: 'SYSTEM',
        actor: { userId: 'tax-update-engine', role: 'SYSTEM' },
        payload: {
          taxYear,
          reason: 'tax_table_change',
          changedTableTypes: changes.map((c) => c.tableType),
          changeDescriptions: changes.map((c) => c.description),
        },
      });

      processedCount++;
    }

    // Record the batch publish as a single step
    const batchStep: FlowStep = {
      name: 'batch_recalc_trigger',
      eventType: 'tax_profile.updated',
      status: 'completed',
      timestamp: new Date().toISOString(),
      detail: `Published tax_profile.updated for ${processedCount} households`,
    };
    execution.steps.push(batchStep);

    log(
      'executeTaxTableUpdatedFlow',
      `Published recalc triggers for ${processedCount} households`,
    );

    completeFlow(execution);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    failFlow(execution, message);
  }

  return execution;
}

// ==================== FLOW 5: REVIEW CYCLE ====================

/**
 * Orchestrates the review cycle data flow for a household.
 *
 * Flow sequence:
 * 1. review.scheduled -> triggers CRM task and client notification
 * 2. household.updated -> records review scheduling metadata
 *
 * Downstream subscribers handle:
 * - HubSpotSubscriber: creates CRM task, updates last meeting date
 * - ClientPortalSubscriber: notifies client of review date
 * - PlanningSubscriber: may trigger pre-review plan refresh
 *
 * @param householdId - The household being reviewed.
 * @param input - Review scheduling details.
 * @param context - Firm and advisor context for event metadata.
 * @returns The flow execution tracker.
 */
export function executeReviewCycleFlow(
  householdId: string,
  input: ReviewCycleInput,
  context: { firmId: string; advisorId: string },
): FlowExecution {
  log(
    'executeReviewCycleFlow',
    `Starting review cycle flow for household ${householdId}, ` +
      `type=${input.reviewType}, date=${input.reviewDate}`,
  );

  const execution = createFlowExecution('review_cycle', householdId, {
    reviewDate: input.reviewDate,
    reviewType: input.reviewType,
    advisorId: input.advisorId,
  });

  try {
    // Step 1: Schedule the review
    executeStep(execution, 'schedule_review', 'review.scheduled', {
      reviewDate: input.reviewDate,
      reviewType: input.reviewType,
      advisorId: input.advisorId,
      advisorName: input.advisorName,
      agenda: input.agenda ?? [],
    }, `${input.reviewType} review scheduled for ${input.reviewDate}`, context);

    // Step 2: Update household with review metadata
    executeStep(execution, 'update_household', 'household.updated', {
      changedFields: ['nextReviewDate', 'reviewType'],
      nextReviewDate: input.reviewDate,
      reviewType: input.reviewType,
    }, `Updated household with next review date: ${input.reviewDate}`, context);

    completeFlow(execution);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    failFlow(execution, message);
  }

  return execution;
}

// ==================== FLOW QUERY FUNCTIONS ====================

/**
 * Returns all flow executions, optionally filtered by type or household.
 */
export function getFlowExecutions(filters?: {
  flowType?: DataFlowType;
  householdId?: string;
  status?: FlowStatus;
}): FlowExecution[] {
  let results = [...flowExecutions];

  if (filters?.flowType) {
    results = results.filter((f) => f.flowType === filters.flowType);
  }
  if (filters?.householdId) {
    results = results.filter((f) => f.householdId === filters.householdId);
  }
  if (filters?.status) {
    results = results.filter((f) => f.status === filters.status);
  }

  return results.sort(
    (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
  );
}

/**
 * Returns a specific flow execution by ID.
 */
export function getFlowExecution(flowId: string): FlowExecution | undefined {
  return flowExecutions.find((f) => f.id === flowId);
}

/**
 * Returns summary statistics for flow executions.
 */
export function getFlowStats(): {
  total: number;
  byType: Record<DataFlowType, number>;
  byStatus: Record<FlowStatus, number>;
  avgStepsPerFlow: number;
} {
  const byType: Record<string, number> = {};
  const byStatus: Record<string, number> = {};
  let totalSteps = 0;

  for (const execution of flowExecutions) {
    byType[execution.flowType] = (byType[execution.flowType] ?? 0) + 1;
    byStatus[execution.status] = (byStatus[execution.status] ?? 0) + 1;
    totalSteps += execution.steps.length;
  }

  return {
    total: flowExecutions.length,
    byType: byType as Record<DataFlowType, number>,
    byStatus: byStatus as Record<FlowStatus, number>,
    avgStepsPerFlow: flowExecutions.length > 0
      ? Math.round(totalSteps / flowExecutions.length * 10) / 10
      : 0,
  };
}

/**
 * Clears all flow execution history. Useful for testing.
 */
export function clearFlowExecutions(): number {
  const count = flowExecutions.length;
  flowExecutions.length = 0;
  log('clearFlowExecutions', `Cleared ${count} flow executions`);
  return count;
}
