/**
 * Farther Unified Platform — Proposal Engine Subscriber
 *
 * Listens for events that affect active proposals:
 * - Account connected -> update held-away capture in proposal
 * - Custodian sync completed -> refresh current portfolio in proposals
 * - Plan calculated -> update proposal analytics
 * - Proposal accepted -> trigger account transition workflow
 * - Proposal rejected -> log and update tracking
 * - Proposal created -> initialize proposal tracking
 *
 * Tracks proposal state transitions and triggers downstream workflows
 * such as account transitions and billing setup.
 *
 * This module is self-contained and does not depend on React or Next.js.
 */

import { eventBus } from '../event-bus';
import type { HouseholdEvent, HouseholdEventType } from '../event-bus';

// ==================== TYPES ====================

/** Lifecycle states a proposal can be in. */
export type ProposalState =
  | 'draft'
  | 'pending_review'
  | 'presented'
  | 'accepted'
  | 'rejected'
  | 'expired'
  | 'superseded';

/** A record of a proposal state transition. */
export interface ProposalTransition {
  id: string;
  proposalId: string;
  householdId: string;
  fromState: ProposalState | null;
  toState: ProposalState;
  triggeredBy: HouseholdEventType;
  triggerEventId: string;
  timestamp: string;
  metadata: Record<string, unknown>;
}

/** Tracks the current state and history of a proposal. */
export interface ProposalTracker {
  proposalId: string;
  householdId: string;
  currentState: ProposalState;
  createdAt: string;
  updatedAt: string;
  transitions: ProposalTransition[];
  analyticsUpdated: boolean;
  portfolioRefreshed: boolean;
}

// ==================== LOGGING HELPER ====================

function log(method: string, detail: string): void {
  console.log(`[ProposalSubscriber:${method}] ${detail}`);
}

// ==================== ID GENERATOR ====================

let transitionCounter = 0;

function generateTransitionId(): string {
  transitionCounter++;
  return `ptrans_${Date.now()}_${transitionCounter}`;
}

// ==================== SUBSCRIBER CLASS ====================

/**
 * ProposalSubscriber listens for events that affect the proposal
 * lifecycle and triggers appropriate workflows.
 */
export class ProposalSubscriber {
  private unsubscribeFns: Array<() => void> = [];
  private proposalTrackers: Map<string, ProposalTracker> = new Map();

  /** Event types this subscriber listens to. */
  private static readonly SUBSCRIBED_EVENTS: HouseholdEventType[] = [
    'account.connected',
    'custodian.sync_completed',
    'plan.calculated',
    'proposal.created',
    'proposal.accepted',
    'proposal.rejected',
  ];

  /**
   * Registers all event subscriptions with the event bus.
   */
  register(): void {
    log('register', `Registering ${ProposalSubscriber.SUBSCRIBED_EVENTS.length} event subscriptions`);

    for (const eventType of ProposalSubscriber.SUBSCRIBED_EVENTS) {
      const unsub = eventBus.subscribe(
        eventType,
        (event: HouseholdEvent) => { this.routeEvent(event); },
        'ProposalSubscriber',
      );
      this.unsubscribeFns.push(unsub);
    }

    log('register', 'All proposal subscriptions registered');
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
    log('unregister', 'All proposal subscriptions removed');
  }

  /**
   * Routes an event to the appropriate handler method.
   */
  private routeEvent(event: HouseholdEvent): void {
    switch (event.eventType) {
      case 'account.connected':
        this.handleAccountConnected(event);
        break;
      case 'custodian.sync_completed':
        this.handleCustodianSyncCompleted(event);
        break;
      case 'plan.calculated':
        this.handlePlanCalculated(event);
        break;
      case 'proposal.created':
        this.handleProposalCreated(event);
        break;
      case 'proposal.accepted':
        this.handleProposalAccepted(event);
        break;
      case 'proposal.rejected':
        this.handleProposalRejected(event);
        break;
      default:
        log('routeEvent', `Unhandled event type: ${event.eventType}`);
    }
  }

  /**
   * When an account is connected, update any active proposals for that
   * household to capture held-away assets in the proposal model.
   */
  private handleAccountConnected(event: HouseholdEvent): void {
    const payload = event.payload as Record<string, unknown>;
    const accountId = (payload?.accountId as string) ?? 'unknown';
    const custodian = (payload?.custodian as string) ?? 'unknown';

    log(
      'handleAccountConnected',
      `Account ${accountId} connected (custodian=${custodian}) ` +
        `for household ${event.householdId}`,
    );

    // Find active proposals for this household
    const activeProposals = this.getActiveProposals(event.householdId);

    for (const tracker of activeProposals) {
      log(
        'handleAccountConnected',
        `Updating held-away capture in proposal ${tracker.proposalId}`,
      );
      // Stub: in production, recalculate the proposal's held-away asset section
      tracker.updatedAt = new Date().toISOString();
    }

    if (activeProposals.length === 0) {
      log('handleAccountConnected', 'No active proposals to update');
    }
  }

  /**
   * When a custodian sync completes, refresh portfolio data in any
   * active proposals for the household.
   */
  private handleCustodianSyncCompleted(event: HouseholdEvent): void {
    const payload = event.payload as Record<string, unknown>;
    const custodian = (payload?.custodian as string) ?? 'unknown';
    const accountCount = (payload?.accountCount as number) ?? 0;

    log(
      'handleCustodianSyncCompleted',
      `Custodian ${custodian} sync completed for household ${event.householdId}, ` +
        `${accountCount} accounts synced`,
    );

    const activeProposals = this.getActiveProposals(event.householdId);

    for (const tracker of activeProposals) {
      log(
        'handleCustodianSyncCompleted',
        `Refreshing portfolio data in proposal ${tracker.proposalId}`,
      );
      // Stub: refresh current portfolio holdings, balances, and allocations
      tracker.portfolioRefreshed = true;
      tracker.updatedAt = new Date().toISOString();
    }
  }

  /**
   * When a plan is calculated, update analytics in any active proposals
   * (e.g. projected success rates, risk metrics).
   */
  private handlePlanCalculated(event: HouseholdEvent): void {
    const payload = event.payload as Record<string, unknown>;
    const planId = (payload?.planId as string) ?? 'unknown';
    const successRate = (payload?.newSuccessRate as number) ?? null;

    log(
      'handlePlanCalculated',
      `Plan ${planId} calculated for household ${event.householdId}, ` +
        `success rate=${successRate}`,
    );

    const activeProposals = this.getActiveProposals(event.householdId);

    for (const tracker of activeProposals) {
      log(
        'handlePlanCalculated',
        `Updating analytics in proposal ${tracker.proposalId} with new plan results`,
      );
      // Stub: update proposal analytics with latest plan calculation results
      tracker.analyticsUpdated = true;
      tracker.updatedAt = new Date().toISOString();
    }
  }

  /**
   * When a proposal is created, initialize tracking for it.
   */
  private handleProposalCreated(event: HouseholdEvent): void {
    const payload = event.payload as Record<string, unknown>;
    const proposalId = payload?.proposalId as string | undefined;
    if (!proposalId) {
      log('handleProposalCreated', 'Missing proposalId in event payload');
      return;
    }

    const tracker: ProposalTracker = {
      proposalId,
      householdId: event.householdId,
      currentState: 'draft',
      createdAt: event.timestamp,
      updatedAt: event.timestamp,
      transitions: [],
      analyticsUpdated: false,
      portfolioRefreshed: false,
    };

    this.proposalTrackers.set(proposalId, tracker);

    const transition = this.recordTransition(
      tracker, null, 'draft', event,
    );

    log(
      'handleProposalCreated',
      `Initialized tracking for proposal ${proposalId}, ` +
        `household=${event.householdId}, transition=${transition.id}`,
    );
  }

  /**
   * When a proposal is accepted, trigger the account transition
   * workflow and update tracking.
   */
  private handleProposalAccepted(event: HouseholdEvent): void {
    const payload = event.payload as Record<string, unknown>;
    const proposalId = payload?.proposalId as string | undefined;
    if (!proposalId) {
      log('handleProposalAccepted', 'Missing proposalId in event payload');
      return;
    }

    const tracker = this.proposalTrackers.get(proposalId);
    const previousState = tracker?.currentState ?? 'presented';

    if (tracker) {
      this.recordTransition(tracker, previousState, 'accepted', event);
      tracker.currentState = 'accepted';
      tracker.updatedAt = new Date().toISOString();
    }

    log(
      'handleProposalAccepted',
      `Proposal ${proposalId} accepted for household ${event.householdId}`,
    );

    // Trigger downstream workflows
    this.triggerAccountTransitionWorkflow(event.householdId, proposalId);
    this.triggerBillingSetup(event.householdId, proposalId);
  }

  /**
   * When a proposal is rejected, log the rejection and update tracking.
   */
  private handleProposalRejected(event: HouseholdEvent): void {
    const payload = event.payload as Record<string, unknown>;
    const proposalId = payload?.proposalId as string | undefined;
    const reason = (payload?.reason as string) ?? 'No reason provided';

    if (!proposalId) {
      log('handleProposalRejected', 'Missing proposalId in event payload');
      return;
    }

    const tracker = this.proposalTrackers.get(proposalId);
    const previousState = tracker?.currentState ?? 'presented';

    if (tracker) {
      this.recordTransition(tracker, previousState, 'rejected', event);
      tracker.currentState = 'rejected';
      tracker.updatedAt = new Date().toISOString();
    }

    log(
      'handleProposalRejected',
      `Proposal ${proposalId} rejected for household ${event.householdId}. ` +
        `Reason: ${reason}`,
    );
  }

  // ==================== HELPER METHODS ====================

  /**
   * Records a state transition in the proposal tracker.
   */
  private recordTransition(
    tracker: ProposalTracker,
    fromState: ProposalState | null,
    toState: ProposalState,
    event: HouseholdEvent,
  ): ProposalTransition {
    const transition: ProposalTransition = {
      id: generateTransitionId(),
      proposalId: tracker.proposalId,
      householdId: tracker.householdId,
      fromState,
      toState,
      triggeredBy: event.eventType,
      triggerEventId: event.eventId,
      timestamp: new Date().toISOString(),
      metadata: (event.payload as Record<string, unknown>) ?? {},
    };

    tracker.transitions.push(transition);
    return transition;
  }

  /**
   * Returns active proposals (not accepted, rejected, or expired) for a household.
   */
  private getActiveProposals(householdId: string): ProposalTracker[] {
    const inactive: ProposalState[] = ['accepted', 'rejected', 'expired', 'superseded'];
    return Array.from(this.proposalTrackers.values()).filter(
      (t) => t.householdId === householdId && !inactive.includes(t.currentState),
    );
  }

  /**
   * Stub: triggers the account transition workflow when a proposal is accepted.
   * In production, this would initiate ACAT transfers, account re-registrations, etc.
   */
  private triggerAccountTransitionWorkflow(householdId: string, proposalId: string): void {
    log(
      'triggerAccountTransitionWorkflow',
      `Initiating account transition for household=${householdId}, ` +
        `proposal=${proposalId}. Would trigger ACAT transfers and account setup.`,
    );
  }

  /**
   * Stub: triggers billing setup when a proposal is accepted.
   * In production, this would set up fee schedules and billing agreements.
   */
  private triggerBillingSetup(householdId: string, proposalId: string): void {
    log(
      'triggerBillingSetup',
      `Setting up billing for household=${householdId}, ` +
        `proposal=${proposalId}. Would configure fee schedule and billing agreement.`,
    );
  }

  /**
   * Returns all proposal trackers for diagnostics.
   */
  getProposalTrackers(): ProposalTracker[] {
    return Array.from(this.proposalTrackers.values());
  }

  /**
   * Returns the tracker for a specific proposal.
   */
  getProposalTracker(proposalId: string): ProposalTracker | undefined {
    return this.proposalTrackers.get(proposalId);
  }
}

// ==================== SINGLETON & REGISTRATION ====================

let proposalSubscriberInstance: ProposalSubscriber | null = null;

/**
 * Returns the singleton ProposalSubscriber instance.
 */
export function getProposalSubscriber(): ProposalSubscriber {
  if (!proposalSubscriberInstance) {
    proposalSubscriberInstance = new ProposalSubscriber();
  }
  return proposalSubscriberInstance;
}

/**
 * Registers the proposal subscriber with the event bus.
 */
export function registerProposalSubscriber(): void {
  const subscriber = getProposalSubscriber();
  subscriber.register();
  log('registerProposalSubscriber', 'Proposal subscriber registered');
}

/**
 * Unregisters the proposal subscriber from the event bus.
 */
export function unregisterProposalSubscriber(): void {
  if (proposalSubscriberInstance) {
    proposalSubscriberInstance.unregister();
    proposalSubscriberInstance = null;
    log('unregisterProposalSubscriber', 'Proposal subscriber unregistered');
  }
}
