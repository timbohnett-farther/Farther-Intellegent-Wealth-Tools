/**
 * Farther Unified Platform — Planning Engine Subscriber
 *
 * Listens for household data changes that affect financial plans:
 * - Account balance changes -> recalculate projections
 * - Income/expense changes -> update cash flow model
 * - Goal changes -> update funding analysis
 * - Member changes (retirement age, etc.) -> recalculate timeline
 * - Tax profile changes -> recompute tax scenarios
 *
 * Each event handler determines:
 * 1. Which plan(s) are affected
 * 2. What calculation modules need to re-run (partial vs full recalc)
 * 3. Whether to queue or immediate-execute based on priority
 *
 * This module is self-contained and does not depend on React or Next.js.
 */

import { eventBus } from '../event-bus';
import type { HouseholdEvent, HouseholdEventType } from '../event-bus';

// ==================== TYPES ====================

/** Calculation modules that can be selectively re-run. */
export type CalcModule =
  | 'projections'
  | 'cash_flow'
  | 'monte_carlo'
  | 'goal_funding'
  | 'tax_scenarios'
  | 'estate_planning'
  | 'insurance_needs'
  | 'retirement_readiness';

/** Priority determines queue ordering and execution timing. */
export type RecalcPriority = 'immediate' | 'high' | 'normal' | 'low';

/** A request to recalculate part or all of a financial plan. */
export interface PlanRecalcRequest {
  id: string;
  householdId: string;
  planId: string;
  triggerEvent: HouseholdEventType;
  triggerEventId: string;
  modules: CalcModule[];
  priority: RecalcPriority;
  fullRecalc: boolean;
  createdAt: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  completedAt: string | null;
  error: string | null;
}

/** Result summary after processing a recalc request. */
export interface RecalcResult {
  requestId: string;
  planId: string;
  householdId: string;
  modulesRun: CalcModule[];
  durationMs: number;
  previousSuccessRate: number | null;
  newSuccessRate: number | null;
  changesDetected: boolean;
}

// ==================== LOGGING HELPER ====================

function log(method: string, detail: string): void {
  console.log(`[PlanningSubscriber:${method}] ${detail}`);
}

// ==================== ID GENERATOR ====================

let recalcCounter = 0;

function generateRecalcId(): string {
  recalcCounter++;
  return `recalc_${Date.now()}_${recalcCounter}`;
}

// ==================== MODULE DETERMINATION ====================

/**
 * Determines which calculation modules need to re-run based on the
 * event type. Returns a tuple of [modules, fullRecalc].
 */
function determineAffectedModules(
  eventType: HouseholdEventType,
): [CalcModule[], boolean] {
  switch (eventType) {
    case 'account.balance_changed':
      return [['projections', 'monte_carlo', 'retirement_readiness'], false];

    case 'income.added':
    case 'income.updated':
    case 'income.removed':
      return [['cash_flow', 'projections', 'tax_scenarios', 'monte_carlo'], false];

    case 'expense.added':
    case 'expense.updated':
    case 'expense.removed':
      return [['cash_flow', 'projections', 'monte_carlo'], false];

    case 'goal.added':
    case 'goal.updated':
    case 'goal.removed':
    case 'goal.status_changed':
      return [['goal_funding', 'monte_carlo'], false];

    case 'member.updated':
      // Member changes (e.g. retirement age) can affect everything
      return [
        ['projections', 'cash_flow', 'monte_carlo', 'goal_funding',
         'tax_scenarios', 'retirement_readiness'],
        true,
      ];

    case 'tax_profile.updated':
      return [['tax_scenarios', 'projections', 'monte_carlo', 'estate_planning'], false];

    case 'account.connected':
    case 'account.updated':
      return [['projections', 'monte_carlo', 'retirement_readiness'], false];

    default:
      return [[], false];
  }
}

/**
 * Determines recalc priority based on the event type.
 * Balance changes and tax updates are higher priority.
 */
function determinePriority(eventType: HouseholdEventType): RecalcPriority {
  switch (eventType) {
    case 'account.balance_changed':
    case 'tax_profile.updated':
      return 'high';

    case 'member.updated':
      return 'immediate';

    case 'income.added':
    case 'income.updated':
    case 'income.removed':
    case 'expense.added':
    case 'expense.updated':
    case 'expense.removed':
      return 'normal';

    case 'goal.added':
    case 'goal.updated':
    case 'goal.removed':
    case 'goal.status_changed':
      return 'normal';

    default:
      return 'low';
  }
}

// ==================== SUBSCRIBER CLASS ====================

/**
 * PlanningSubscriber listens for household data changes and
 * queues or immediately executes financial plan recalculations.
 */
export class PlanningSubscriber {
  private unsubscribeFns: Array<() => void> = [];
  private recalcQueue: PlanRecalcRequest[] = [];
  private processedResults: RecalcResult[] = [];
  private isProcessing = false;

  /** Event types this subscriber listens to. */
  private static readonly SUBSCRIBED_EVENTS: HouseholdEventType[] = [
    'account.balance_changed',
    'account.connected',
    'account.updated',
    'income.added',
    'income.updated',
    'income.removed',
    'expense.added',
    'expense.updated',
    'expense.removed',
    'goal.added',
    'goal.updated',
    'goal.removed',
    'goal.status_changed',
    'member.updated',
    'tax_profile.updated',
  ];

  /**
   * Registers all event subscriptions with the event bus.
   */
  register(): void {
    log('register', `Registering ${PlanningSubscriber.SUBSCRIBED_EVENTS.length} event subscriptions`);

    for (const eventType of PlanningSubscriber.SUBSCRIBED_EVENTS) {
      const unsub = eventBus.subscribe(
        eventType,
        (event: HouseholdEvent) => { this.handleEvent(event); },
        'PlanningSubscriber',
      );
      this.unsubscribeFns.push(unsub);
    }

    log('register', 'All planning subscriptions registered');
  }

  /**
   * Removes all event subscriptions from the event bus.
   */
  unregister(): void {
    log('unregister', `Removing ${this.unsubscribeFns.length} subscriptions`);

    for (const unsub of this.unsubscribeFns) {
      unsub();
    }

    this.unsubscribeFns = [];
    log('unregister', 'All planning subscriptions removed');
  }

  /**
   * Central event router. Determines affected modules and queues a recalc.
   */
  private handleEvent(event: HouseholdEvent): void {
    const [modules, fullRecalc] = determineAffectedModules(event.eventType);

    if (modules.length === 0) {
      log('handleEvent', `No modules affected by ${event.eventType}, skipping`);
      return;
    }

    const priority = determinePriority(event.eventType);
    const planId = this.resolvePlanId(event);

    const request: PlanRecalcRequest = {
      id: generateRecalcId(),
      householdId: event.householdId,
      planId,
      triggerEvent: event.eventType,
      triggerEventId: event.eventId,
      modules,
      priority,
      fullRecalc,
      createdAt: new Date().toISOString(),
      status: 'queued',
      completedAt: null,
      error: null,
    };

    log(
      'handleEvent',
      `Queued recalc ${request.id} for household=${event.householdId}, ` +
        `plan=${planId}, modules=[${modules.join(', ')}], ` +
        `priority=${priority}, fullRecalc=${fullRecalc}`,
    );

    this.recalcQueue.push(request);

    // Immediate priority requests are processed right away
    if (priority === 'immediate') {
      this.processQueue();
    }
  }

  /**
   * Resolves the plan ID from the event payload. Falls back to a
   * conventional plan ID derived from the household ID.
   */
  private resolvePlanId(event: HouseholdEvent): string {
    const payload = event.payload as Record<string, unknown> | undefined;
    if (payload?.planId && typeof payload.planId === 'string') {
      return payload.planId;
    }
    // Default: assume a primary plan keyed by household
    return `plan_${event.householdId}`;
  }

  /**
   * Returns all pending recalc requests, ordered by priority.
   */
  getRecalcQueue(): PlanRecalcRequest[] {
    const priorityOrder: Record<RecalcPriority, number> = {
      immediate: 0,
      high: 1,
      normal: 2,
      low: 3,
    };

    return [...this.recalcQueue]
      .filter((r) => r.status === 'queued')
      .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  }

  /**
   * Processes all queued recalc requests in priority order.
   * Deduplicates requests for the same plan and merges their modules.
   */
  processQueue(): void {
    if (this.isProcessing) {
      log('processQueue', 'Already processing, skipping');
      return;
    }

    this.isProcessing = true;
    const pending = this.getRecalcQueue();

    if (pending.length === 0) {
      log('processQueue', 'No pending requests');
      this.isProcessing = false;
      return;
    }

    log('processQueue', `Processing ${pending.length} queued recalc requests`);

    // Deduplicate by planId: merge modules from multiple requests
    const mergedByPlan = new Map<string, PlanRecalcRequest>();

    for (const request of pending) {
      const existing = mergedByPlan.get(request.planId);
      if (existing) {
        // Merge modules (deduplicated)
        const mergedModules = new Set([...existing.modules, ...request.modules]);
        existing.modules = Array.from(mergedModules) as CalcModule[];
        existing.fullRecalc = existing.fullRecalc || request.fullRecalc;
        // Mark the duplicate as completed (merged)
        request.status = 'completed';
        request.completedAt = new Date().toISOString();
        log('processQueue', `Merged request ${request.id} into ${existing.id}`);
      } else {
        mergedByPlan.set(request.planId, request);
      }
    }

    // Process each merged request
    for (const request of mergedByPlan.values()) {
      this.executeRecalc(request);
    }

    this.isProcessing = false;
  }

  /**
   * Executes a single recalc request (stub implementation).
   * In production this would invoke the calc engine modules.
   */
  private executeRecalc(request: PlanRecalcRequest): void {
    const startTime = Date.now();
    request.status = 'processing';

    log(
      'executeRecalc',
      `Running recalc ${request.id}: plan=${request.planId}, ` +
        `modules=[${request.modules.join(', ')}], fullRecalc=${request.fullRecalc}`,
    );

    try {
      // Stub: simulate running each calculation module
      for (const mod of request.modules) {
        log('executeRecalc', `  Running module: ${mod} for plan ${request.planId}`);
        // In production: dispatch to the appropriate calc-engine module
        // e.g., monteCarloEngine.run(planId), cashFlowEngine.run(planId), etc.
      }

      const durationMs = Date.now() - startTime;
      request.status = 'completed';
      request.completedAt = new Date().toISOString();

      const result: RecalcResult = {
        requestId: request.id,
        planId: request.planId,
        householdId: request.householdId,
        modulesRun: request.modules,
        durationMs,
        previousSuccessRate: 0.87, // Stub: would come from previous calc result
        newSuccessRate: 0.85, // Stub: would come from new calc result
        changesDetected: true,
      };

      this.processedResults.push(result);

      log(
        'executeRecalc',
        `Completed recalc ${request.id} in ${durationMs}ms. ` +
          `Success rate: ${result.previousSuccessRate} -> ${result.newSuccessRate}`,
      );

      // Publish a plan.calculated event so other subscribers can react
      eventBus.publish({
        eventType: 'plan.calculated',
        householdId: request.householdId,
        firmId: 'system',
        advisorId: 'system',
        source: 'SYSTEM',
        actor: { userId: 'system', role: 'SYSTEM' },
        payload: {
          planId: request.planId,
          modulesRun: request.modules,
          previousSuccessRate: result.previousSuccessRate,
          newSuccessRate: result.newSuccessRate,
          changesDetected: result.changesDetected,
          durationMs,
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown recalc error';
      request.status = 'failed';
      request.error = message;
      log('executeRecalc', `Failed recalc ${request.id}: ${message}`);
    }
  }

  /**
   * Returns all processed recalc results for diagnostics.
   */
  getProcessedResults(): RecalcResult[] {
    return [...this.processedResults];
  }

  /**
   * Clears completed and failed requests from the queue.
   */
  clearCompleted(): number {
    const before = this.recalcQueue.length;
    this.recalcQueue = this.recalcQueue.filter(
      (r) => r.status === 'queued' || r.status === 'processing',
    );
    const removed = before - this.recalcQueue.length;
    log('clearCompleted', `Cleared ${removed} completed/failed requests`);
    return removed;
  }
}

// ==================== SINGLETON & REGISTRATION ====================

let planningSubscriberInstance: PlanningSubscriber | null = null;

/**
 * Returns the singleton PlanningSubscriber instance.
 */
export function getPlanningSubscriber(): PlanningSubscriber {
  if (!planningSubscriberInstance) {
    planningSubscriberInstance = new PlanningSubscriber();
  }
  return planningSubscriberInstance;
}

/**
 * Registers the planning subscriber with the event bus.
 * Safe to call multiple times; will only register once.
 */
export function registerPlanningSubscriber(): void {
  const subscriber = getPlanningSubscriber();
  subscriber.register();
  log('registerPlanningSubscriber', 'Planning subscriber registered');
}

/**
 * Unregisters the planning subscriber from the event bus.
 */
export function unregisterPlanningSubscriber(): void {
  if (planningSubscriberInstance) {
    planningSubscriberInstance.unregister();
    planningSubscriberInstance = null;
    log('unregisterPlanningSubscriber', 'Planning subscriber unregistered');
  }
}
