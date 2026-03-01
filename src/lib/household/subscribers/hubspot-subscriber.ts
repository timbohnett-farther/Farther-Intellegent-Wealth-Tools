/**
 * Farther Unified Platform — HubSpot CRM Subscriber
 *
 * Bidirectional sync between household data and HubSpot contacts.
 * Outbound: household changes -> HubSpot contact properties
 * Inbound: HubSpot webhook events -> household updates (handled in hubspot-webhook.ts)
 *
 * Maps household fields to HubSpot custom properties using the fp_ prefix,
 * consistent with the property definitions in hubspot-properties.ts.
 *
 * Uses the stub/log pattern matching the existing hubspot-sync.ts module.
 * In production, stubs would be replaced with actual HubSpot API calls.
 *
 * This module is self-contained and does not depend on React or Next.js.
 */

import { eventBus } from '../event-bus';
import type { HouseholdEvent, HouseholdEventType } from '../event-bus';

// ==================== TYPES ====================

/** Map of HubSpot property names to their values. */
export type HubSpotPropertyMap = Record<string, string | number | boolean | null>;

/** Lifecycle stages in HubSpot mapped from household status. */
export type HubSpotLifecycleStage =
  | 'subscriber'
  | 'lead'
  | 'marketingqualifiedlead'
  | 'salesqualifiedlead'
  | 'opportunity'
  | 'customer'
  | 'evangelist'
  | 'other';

/** Entry in the sync log for audit and diagnostics. */
export interface SyncLogEntry {
  id: string;
  timestamp: string;
  eventType: HouseholdEventType;
  eventId: string;
  householdId: string;
  action: 'create_contact' | 'update_contact' | 'update_properties' | 'create_task' | 'skip';
  hubspotContactId: string | null;
  propertiesSynced: string[];
  success: boolean;
  error: string | null;
}

/** Maps household status values to HubSpot lifecycle stages. */
const HOUSEHOLD_STATUS_TO_LIFECYCLE: Record<string, HubSpotLifecycleStage> = {
  prospect: 'lead',
  onboarding: 'opportunity',
  active: 'customer',
  inactive: 'other',
  churned: 'other',
  pending: 'salesqualifiedlead',
};

// ==================== LOGGING HELPER ====================

function log(method: string, detail: string): void {
  console.log(`[HubSpotSubscriber:${method}] ${detail}`);
}

// ==================== ID GENERATORS ====================

let syncLogCounter = 0;

function generateSyncLogId(): string {
  syncLogCounter++;
  return `hslog_${Date.now()}_${syncLogCounter}`;
}

function generateContactId(): string {
  return `hs_contact_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ==================== SUBSCRIBER CLASS ====================

/**
 * HubSpotSubscriber listens for household events and syncs relevant
 * data to HubSpot CRM as contact properties and tasks.
 */
export class HubSpotSubscriber {
  private unsubscribeFns: Array<() => void> = [];
  private syncLog: SyncLogEntry[] = [];

  /**
   * In-memory cache of householdId -> HubSpot contactId mappings.
   * In production this would be persisted in the database.
   */
  private contactIdMap: Map<string, string> = new Map();

  /** Event types this subscriber listens to. */
  private static readonly SUBSCRIBED_EVENTS: HouseholdEventType[] = [
    'household.created',
    'household.updated',
    'household.status_changed',
    'plan.calculated',
    'goal.status_changed',
    'review.scheduled',
  ];

  /**
   * Registers all event subscriptions with the event bus.
   */
  register(): void {
    log('register', `Registering ${HubSpotSubscriber.SUBSCRIBED_EVENTS.length} event subscriptions`);

    for (const eventType of HubSpotSubscriber.SUBSCRIBED_EVENTS) {
      const unsub = eventBus.subscribe(
        eventType,
        (event: HouseholdEvent) => { this.routeEvent(event); },
        'HubSpotSubscriber',
      );
      this.unsubscribeFns.push(unsub);
    }

    log('register', 'All HubSpot subscriptions registered');
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
    log('unregister', 'All HubSpot subscriptions removed');
  }

  /**
   * Routes an event to the appropriate handler method.
   */
  private routeEvent(event: HouseholdEvent): void {
    switch (event.eventType) {
      case 'household.created':
        this.handleHouseholdCreated(event);
        break;
      case 'household.updated':
        this.handleHouseholdUpdated(event);
        break;
      case 'household.status_changed':
        this.handleHouseholdStatusChanged(event);
        break;
      case 'plan.calculated':
        this.handlePlanCalculated(event);
        break;
      case 'goal.status_changed':
        this.handleGoalStatusChanged(event);
        break;
      case 'review.scheduled':
        this.handleReviewScheduled(event);
        break;
      default:
        log('routeEvent', `Unhandled event type: ${event.eventType}`);
    }
  }

  /**
   * When a household is created, create a new HubSpot contact with
   * initial properties.
   */
  private handleHouseholdCreated(event: HouseholdEvent): void {
    const payload = (event.payload as Record<string, unknown>) ?? {};
    const firstName = (payload.firstName as string) ?? '';
    const lastName = (payload.lastName as string) ?? '';
    const email = (payload.email as string) ?? '';
    const advisorName = (payload.advisorName as string) ?? '';

    log(
      'handleHouseholdCreated',
      `Creating HubSpot contact for household ${event.householdId}: ` +
        `${firstName} ${lastName} (${email})`,
    );

    const properties = this.buildContactProperties({
      firstName,
      lastName,
      email,
      advisorName,
      lifecycleStage: 'lead',
    });

    // Stub: simulate HubSpot contact creation
    // In production: POST https://api.hubapi.com/crm/v3/objects/contacts
    const contactId = generateContactId();
    this.contactIdMap.set(event.householdId, contactId);

    log(
      'handleHouseholdCreated',
      `Created HubSpot contact ${contactId} with ${Object.keys(properties).length} properties`,
    );

    this.addSyncLog({
      eventType: event.eventType,
      eventId: event.eventId,
      householdId: event.householdId,
      action: 'create_contact',
      hubspotContactId: contactId,
      propertiesSynced: Object.keys(properties),
      success: true,
      error: null,
    });
  }

  /**
   * When household data is updated, sync changed properties to HubSpot.
   */
  private handleHouseholdUpdated(event: HouseholdEvent): void {
    const contactId = this.contactIdMap.get(event.householdId);

    if (!contactId) {
      log(
        'handleHouseholdUpdated',
        `No HubSpot contact found for household ${event.householdId}, skipping`,
      );
      this.addSyncLog({
        eventType: event.eventType,
        eventId: event.eventId,
        householdId: event.householdId,
        action: 'skip',
        hubspotContactId: null,
        propertiesSynced: [],
        success: true,
        error: null,
      });
      return;
    }

    const payload = (event.payload as Record<string, unknown>) ?? {};
    const changedFields = (payload.changedFields as string[]) ?? [];

    // Build a partial property map from only the changed fields
    const properties: HubSpotPropertyMap = {};

    for (const field of changedFields) {
      const hsProperty = this.mapFieldToHubSpotProperty(field);
      if (hsProperty && payload[field] !== undefined) {
        properties[hsProperty] = payload[field] as string | number;
      }
    }

    if (Object.keys(properties).length === 0) {
      log('handleHouseholdUpdated', `No syncable properties changed for household ${event.householdId}`);
      return;
    }

    // Stub: simulate HubSpot contact update
    // In production: PATCH https://api.hubapi.com/crm/v3/objects/contacts/{contactId}
    log(
      'handleHouseholdUpdated',
      `Updated HubSpot contact ${contactId} with properties: ` +
        `[${Object.keys(properties).join(', ')}]`,
    );

    this.addSyncLog({
      eventType: event.eventType,
      eventId: event.eventId,
      householdId: event.householdId,
      action: 'update_properties',
      hubspotContactId: contactId,
      propertiesSynced: Object.keys(properties),
      success: true,
      error: null,
    });
  }

  /**
   * When household status changes, update the HubSpot lifecycle stage.
   */
  private handleHouseholdStatusChanged(event: HouseholdEvent): void {
    const contactId = this.contactIdMap.get(event.householdId);
    const payload = (event.payload as Record<string, unknown>) ?? {};
    const newStatus = (payload.newStatus as string) ?? '';
    const lifecycleStage = HOUSEHOLD_STATUS_TO_LIFECYCLE[newStatus] ?? 'other';

    if (!contactId) {
      log(
        'handleHouseholdStatusChanged',
        `No HubSpot contact for household ${event.householdId}, skipping`,
      );
      return;
    }

    const properties: HubSpotPropertyMap = {
      lifecyclestage: lifecycleStage,
    };

    // Stub: simulate lifecycle stage update
    // In production: PATCH contact with lifecyclestage property
    log(
      'handleHouseholdStatusChanged',
      `Updated lifecycle stage for contact ${contactId}: ` +
        `status="${newStatus}" -> lifecyclestage="${lifecycleStage}"`,
    );

    this.addSyncLog({
      eventType: event.eventType,
      eventId: event.eventId,
      householdId: event.householdId,
      action: 'update_properties',
      hubspotContactId: contactId,
      propertiesSynced: Object.keys(properties),
      success: true,
      error: null,
    });
  }

  /**
   * When a financial plan is calculated, sync key metrics to HubSpot.
   */
  private handlePlanCalculated(event: HouseholdEvent): void {
    const contactId = this.contactIdMap.get(event.householdId);
    const payload = (event.payload as Record<string, unknown>) ?? {};

    if (!contactId) {
      log(
        'handlePlanCalculated',
        `No HubSpot contact for household ${event.householdId}, skipping`,
      );
      return;
    }

    const successRate = payload.newSuccessRate as number | undefined;
    const netWorth = payload.netWorth as number | undefined;
    const aum = payload.aum as number | undefined;

    const properties: HubSpotPropertyMap = {
      fp_last_plan_update: new Date().toISOString().split('T')[0],
    };

    if (successRate !== undefined) {
      properties.fp_plan_success_rate = Math.round(successRate * 100);
    }
    if (netWorth !== undefined) {
      properties.fp_net_worth = netWorth;
    }
    if (aum !== undefined) {
      properties.fp_aum = aum;
    }

    // Stub: simulate property update
    // In production: PATCH contact with financial plan properties
    log(
      'handlePlanCalculated',
      `Synced plan metrics to contact ${contactId}: ` +
        `success_rate=${successRate}, net_worth=${netWorth}, aum=${aum}`,
    );

    this.addSyncLog({
      eventType: event.eventType,
      eventId: event.eventId,
      householdId: event.householdId,
      action: 'update_properties',
      hubspotContactId: contactId,
      propertiesSynced: Object.keys(properties),
      success: true,
      error: null,
    });
  }

  /**
   * When a goal's status changes, update the active/at-risk goal counts.
   */
  private handleGoalStatusChanged(event: HouseholdEvent): void {
    const contactId = this.contactIdMap.get(event.householdId);
    const payload = (event.payload as Record<string, unknown>) ?? {};

    if (!contactId) {
      log(
        'handleGoalStatusChanged',
        `No HubSpot contact for household ${event.householdId}, skipping`,
      );
      return;
    }

    const activeGoals = payload.activeGoals as number | undefined;
    const atRiskGoals = payload.atRiskGoals as number | undefined;

    const properties: HubSpotPropertyMap = {};

    if (activeGoals !== undefined) {
      properties.fp_active_goals = activeGoals;
    }
    if (atRiskGoals !== undefined) {
      properties.fp_at_risk_goals = atRiskGoals;
    }

    if (Object.keys(properties).length === 0) {
      log('handleGoalStatusChanged', 'No goal count data in payload, skipping');
      return;
    }

    // Stub: simulate property update
    log(
      'handleGoalStatusChanged',
      `Updated goal counts for contact ${contactId}: ` +
        `active=${activeGoals}, at_risk=${atRiskGoals}`,
    );

    this.addSyncLog({
      eventType: event.eventType,
      eventId: event.eventId,
      householdId: event.householdId,
      action: 'update_properties',
      hubspotContactId: contactId,
      propertiesSynced: Object.keys(properties),
      success: true,
      error: null,
    });
  }

  /**
   * When a review is scheduled, create a HubSpot task for the advisor.
   */
  private handleReviewScheduled(event: HouseholdEvent): void {
    const contactId = this.contactIdMap.get(event.householdId);
    const payload = (event.payload as Record<string, unknown>) ?? {};
    const reviewDate = (payload.reviewDate as string) ?? '';
    const advisorId = (payload.advisorId as string) ?? '';
    const reviewType = (payload.reviewType as string) ?? 'annual';

    if (!contactId) {
      log(
        'handleReviewScheduled',
        `No HubSpot contact for household ${event.householdId}, skipping task creation`,
      );
      return;
    }

    // Stub: simulate HubSpot task creation
    // In production: POST https://api.hubapi.com/crm/v3/objects/tasks
    // with association to the contact
    const taskSubject = `${reviewType.charAt(0).toUpperCase() + reviewType.slice(1)} Review - ${event.householdId}`;

    log(
      'handleReviewScheduled',
      `Creating HubSpot task "${taskSubject}" for contact ${contactId}, ` +
        `date=${reviewDate}, advisor=${advisorId}`,
    );

    // Also update the last meeting date property
    const properties: HubSpotPropertyMap = {
      fp_last_meeting_date: reviewDate,
    };

    log(
      'handleReviewScheduled',
      `Updated fp_last_meeting_date to ${reviewDate} for contact ${contactId}`,
    );

    this.addSyncLog({
      eventType: event.eventType,
      eventId: event.eventId,
      householdId: event.householdId,
      action: 'create_task',
      hubspotContactId: contactId,
      propertiesSynced: Object.keys(properties),
      success: true,
      error: null,
    });
  }

  // ==================== PROPERTY MAPPING ====================

  /**
   * Builds a complete HubSpot contact property map from household data.
   */
  buildContactProperties(data: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    advisorName?: string;
    lifecycleStage?: HubSpotLifecycleStage;
    planSuccessRate?: number;
    netWorth?: number;
    aum?: number;
    activeGoals?: number;
    atRiskGoals?: number;
    annualIncome?: number;
    retirementYear?: number;
  }): HubSpotPropertyMap {
    const properties: HubSpotPropertyMap = {};

    // Standard HubSpot properties
    if (data.firstName) properties.firstname = data.firstName;
    if (data.lastName) properties.lastname = data.lastName;
    if (data.email) properties.email = data.email;
    if (data.phone) properties.phone = data.phone;
    if (data.lifecycleStage) properties.lifecyclestage = data.lifecycleStage;

    // Farther Prism custom properties (fp_ prefix)
    if (data.advisorName) properties.fp_primary_advisor = data.advisorName;
    if (data.planSuccessRate !== undefined) {
      properties.fp_plan_success_rate = Math.round(data.planSuccessRate * 100);
    }
    if (data.netWorth !== undefined) properties.fp_net_worth = data.netWorth;
    if (data.aum !== undefined) properties.fp_aum = data.aum;
    if (data.activeGoals !== undefined) properties.fp_active_goals = data.activeGoals;
    if (data.atRiskGoals !== undefined) properties.fp_at_risk_goals = data.atRiskGoals;
    if (data.annualIncome !== undefined) properties.fp_annual_income = data.annualIncome;
    if (data.retirementYear !== undefined) properties.fp_retirement_year = data.retirementYear;

    return properties;
  }

  /**
   * Maps internal household field names to HubSpot property names.
   */
  private mapFieldToHubSpotProperty(field: string): string | null {
    const fieldMap: Record<string, string> = {
      firstName: 'firstname',
      lastName: 'lastname',
      email: 'email',
      phone: 'phone',
      advisorName: 'fp_primary_advisor',
      planSuccessRate: 'fp_plan_success_rate',
      netWorth: 'fp_net_worth',
      aum: 'fp_aum',
      activeGoals: 'fp_active_goals',
      atRiskGoals: 'fp_at_risk_goals',
      annualIncome: 'fp_annual_income',
      retirementYear: 'fp_retirement_year',
      planStatus: 'fp_plan_status',
      wealthTier: 'fp_wealth_tier',
      projectedEstateValue: 'fp_projected_estate_value',
    };

    return fieldMap[field] ?? null;
  }

  // ==================== SYNC LOG ====================

  /**
   * Adds an entry to the sync log.
   */
  private addSyncLog(entry: Omit<SyncLogEntry, 'id' | 'timestamp'>): void {
    this.syncLog.push({
      id: generateSyncLogId(),
      timestamp: new Date().toISOString(),
      ...entry,
    });
  }

  /**
   * Returns the full sync log for diagnostics and audit.
   */
  getSyncLog(): SyncLogEntry[] {
    return [...this.syncLog];
  }

  /**
   * Returns sync log entries for a specific household.
   */
  getSyncLogForHousehold(householdId: string): SyncLogEntry[] {
    return this.syncLog.filter((entry) => entry.householdId === householdId);
  }

  /**
   * Returns the count of failed syncs.
   */
  getFailedSyncCount(): number {
    return this.syncLog.filter((entry) => !entry.success).length;
  }

  /**
   * Clears the sync log. Useful for testing.
   */
  clearSyncLog(): void {
    this.syncLog = [];
    log('clearSyncLog', 'Sync log cleared');
  }
}

// ==================== SINGLETON & REGISTRATION ====================

let hubspotSubscriberInstance: HubSpotSubscriber | null = null;

/**
 * Returns the singleton HubSpotSubscriber instance.
 */
export function getHubSpotSubscriber(): HubSpotSubscriber {
  if (!hubspotSubscriberInstance) {
    hubspotSubscriberInstance = new HubSpotSubscriber();
  }
  return hubspotSubscriberInstance;
}

/**
 * Registers the HubSpot subscriber with the event bus.
 */
export function registerHubSpotSubscriber(): void {
  const subscriber = getHubSpotSubscriber();
  subscriber.register();
  log('registerHubSpotSubscriber', 'HubSpot subscriber registered');
}

/**
 * Unregisters the HubSpot subscriber from the event bus.
 */
export function unregisterHubSpotSubscriber(): void {
  if (hubspotSubscriberInstance) {
    hubspotSubscriberInstance.unregister();
    hubspotSubscriberInstance = null;
    log('unregisterHubSpotSubscriber', 'HubSpot subscriber unregistered');
  }
}
