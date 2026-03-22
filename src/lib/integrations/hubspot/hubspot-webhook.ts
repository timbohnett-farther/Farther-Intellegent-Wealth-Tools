/**
 * Farther Prism — HubSpot Webhook Handler
 *
 * Processes inbound HubSpot webhook payloads and returns an array of
 * action objects that describe what downstream operations should be
 * performed (e.g. update client data, create advisor tasks, etc.).
 *
 * This module is a pure function with no side effects. The caller is
 * responsible for executing the returned actions.
 */

import type {
  HubSpotWebhookPayload,
  HubSpotWebhookEvent,
  WebhookAction,
} from '../types';

// ==================== SUPPORTED EVENT TYPES ====================

/** HubSpot subscription types that this handler processes. */
const SUPPORTED_EVENTS = [
  'contact.propertyChange',
  'contact.creation',
  'contact.deletion',
  'deal.propertyChange',
  'deal.creation',
  'task.propertyChange',
  'task.creation',
] as const;

/** Contact properties that trigger a client data refresh when changed. */
const REFRESH_TRIGGER_PROPERTIES = new Set([
  'email',
  'phone',
  'firstname',
  'lastname',
  'address',
  'lifecyclestage',
]);

/** Deal properties whose changes are worth logging. */
const DEAL_WATCH_PROPERTIES = new Set([
  'dealstage',
  'amount',
  'closedate',
  'dealname',
]);

// ==================== MAIN HANDLER ====================

/**
 * Processes a HubSpot webhook payload and returns an array of actions
 * to be executed by the application layer.
 *
 * This is a pure, synchronous function. It does not make network calls
 * or produce side effects. Each incoming event is mapped to zero or
 * more WebhookAction objects.
 *
 * @param payload - The raw webhook payload from HubSpot.
 * @returns An array of actions describing what to do in response.
 *
 * @example
 * ```ts
 * const actions = handleHubSpotWebhook(payload);
 * for (const action of actions) {
 *   switch (action.type) {
 *     case 'update_client': // update local client record
 *     case 'create_task':   // create an advisor task
 *     case 'notify_advisor': // send notification
 *     // ...
 *   }
 * }
 * ```
 */
export function handleHubSpotWebhook(
  payload: HubSpotWebhookPayload,
): WebhookAction[] {
  const actions: WebhookAction[] = [];

  if (!payload?.events || !Array.isArray(payload.events)) {
    return actions;
  }

  // Deduplicate events by eventId to handle HubSpot retries
  const seen = new Set<number>();
  const uniqueEvents = payload.events.filter((event) => {
    if (seen.has(event.eventId)) return false;
    seen.add(event.eventId);
    return true;
  });

  for (const event of uniqueEvents) {
    const eventActions = processEvent(event);
    actions.push(...eventActions);
  }

  return actions;
}

// ==================== EVENT PROCESSORS ====================

/**
 * Routes a single webhook event to the appropriate processor.
 */
function processEvent(event: HubSpotWebhookEvent): WebhookAction[] {
  const subscriptionBase = normalizeSubscriptionType(event.subscriptionType);

  switch (subscriptionBase) {
    case 'contact.updated':
    case 'contact.propertyChange':
      return processContactUpdated(event);

    case 'contact.creation':
      return processContactCreated(event);

    case 'contact.deletion':
      return processContactDeleted(event);

    case 'deal.updated':
    case 'deal.propertyChange':
      return processDealUpdated(event);

    case 'deal.creation':
      return processDealCreated(event);

    case 'task.completed':
    case 'task.propertyChange':
      return processTaskEvent(event);

    case 'task.creation':
      return processTaskCreated(event);

    default:
      // Unrecognized event: log it but take no action
      return [
        {
          type: 'log_activity',
          sourceEvent: event.subscriptionType,
          objectId: event.objectId,
          data: {
            message: `Unhandled HubSpot event type: ${event.subscriptionType}`,
            propertyName: event.propertyName ?? '',
            propertyValue: event.propertyValue ?? '',
          },
          timestamp: toISO(event.occurredAt),
        },
      ];
  }
}

/**
 * Processes a contact.updated / contact.propertyChange event.
 *
 * - If a refresh-trigger property changed, emit an 'update_client' action.
 * - If lifecyclestage changed, also notify the advisor.
 * - Always log the activity.
 */
function processContactUpdated(event: HubSpotWebhookEvent): WebhookAction[] {
  const actions: WebhookAction[] = [];
  const timestamp = toISO(event.occurredAt);
  const propertyName = event.propertyName ?? '';
  const propertyValue = event.propertyValue ?? '';

  // Log every contact property change
  actions.push({
    type: 'log_activity',
    sourceEvent: 'contact.updated',
    objectId: event.objectId,
    data: {
      propertyName,
      propertyValue,
      message: `Contact property "${propertyName}" changed to "${propertyValue}".`,
    },
    timestamp,
  });

  // If a critical property changed, trigger a client data refresh
  if (REFRESH_TRIGGER_PROPERTIES.has(propertyName)) {
    actions.push({
      type: 'update_client',
      sourceEvent: 'contact.updated',
      objectId: event.objectId,
      data: {
        propertyName,
        propertyValue,
        reason: 'Critical contact property changed in HubSpot.',
      },
      timestamp,
    });
  }

  // If lifecycle stage changed, notify the advisor
  if (propertyName === 'lifecyclestage') {
    actions.push({
      type: 'notify_advisor',
      sourceEvent: 'contact.updated',
      objectId: event.objectId,
      data: {
        notificationType: 'lifecycle_change',
        newStage: propertyValue,
        message: `Client lifecycle stage changed to "${propertyValue}".`,
      },
      timestamp,
    });
  }

  return actions;
}

/**
 * Processes a contact.creation event.
 */
function processContactCreated(event: HubSpotWebhookEvent): WebhookAction[] {
  const timestamp = toISO(event.occurredAt);

  return [
    {
      type: 'update_client',
      sourceEvent: 'contact.creation',
      objectId: event.objectId,
      data: {
        action: 'create',
        message: 'New contact created in HubSpot.',
      },
      timestamp,
    },
    {
      type: 'notify_advisor',
      sourceEvent: 'contact.creation',
      objectId: event.objectId,
      data: {
        notificationType: 'new_contact',
        message: 'A new contact was created in HubSpot.',
      },
      timestamp,
    },
    {
      type: 'log_activity',
      sourceEvent: 'contact.creation',
      objectId: event.objectId,
      data: {
        message: 'Contact created in HubSpot.',
      },
      timestamp,
    },
  ];
}

/**
 * Processes a contact.deletion event.
 */
function processContactDeleted(event: HubSpotWebhookEvent): WebhookAction[] {
  const timestamp = toISO(event.occurredAt);

  return [
    {
      type: 'notify_advisor',
      sourceEvent: 'contact.deletion',
      objectId: event.objectId,
      data: {
        notificationType: 'contact_deleted',
        message: 'A contact was deleted in HubSpot. Review if this client should be archived.',
      },
      timestamp,
    },
    {
      type: 'log_activity',
      sourceEvent: 'contact.deletion',
      objectId: event.objectId,
      data: {
        message: 'Contact deleted from HubSpot.',
      },
      timestamp,
    },
  ];
}

/**
 * Processes a deal.updated / deal.propertyChange event.
 *
 * - If a watched deal property changed, notify the advisor.
 * - If dealstage changed to "closedwon", trigger a plan refresh.
 */
function processDealUpdated(event: HubSpotWebhookEvent): WebhookAction[] {
  const actions: WebhookAction[] = [];
  const timestamp = toISO(event.occurredAt);
  const propertyName = event.propertyName ?? '';
  const propertyValue = event.propertyValue ?? '';

  // Log every deal change
  actions.push({
    type: 'log_activity',
    sourceEvent: 'deal.updated',
    objectId: event.objectId,
    data: {
      propertyName,
      propertyValue,
      message: `Deal property "${propertyName}" changed to "${propertyValue}".`,
    },
    timestamp,
  });

  // If a watched property changed, notify advisor
  if (DEAL_WATCH_PROPERTIES.has(propertyName)) {
    actions.push({
      type: 'notify_advisor',
      sourceEvent: 'deal.updated',
      objectId: event.objectId,
      data: {
        notificationType: 'deal_update',
        propertyName,
        propertyValue,
        message: `Deal "${propertyName}" changed to "${propertyValue}".`,
      },
      timestamp,
    });
  }

  // If deal stage moved to closed-won, trigger a plan refresh
  if (propertyName === 'dealstage' && propertyValue === 'closedwon') {
    actions.push({
      type: 'refresh_plan',
      sourceEvent: 'deal.updated',
      objectId: event.objectId,
      data: {
        reason: 'Deal closed-won. Financial plan may need updating.',
        dealStage: propertyValue,
      },
      timestamp,
    });
  }

  return actions;
}

/**
 * Processes a deal.creation event.
 */
function processDealCreated(event: HubSpotWebhookEvent): WebhookAction[] {
  const timestamp = toISO(event.occurredAt);

  return [
    {
      type: 'notify_advisor',
      sourceEvent: 'deal.creation',
      objectId: event.objectId,
      data: {
        notificationType: 'new_deal',
        message: 'A new deal was created in HubSpot.',
      },
      timestamp,
    },
    {
      type: 'log_activity',
      sourceEvent: 'deal.creation',
      objectId: event.objectId,
      data: {
        message: 'New deal created in HubSpot.',
      },
      timestamp,
    },
  ];
}

/**
 * Processes task property change events.
 *
 * When a task's status changes to COMPLETED, emits a 'log_activity'
 * action and optionally a 'refresh_plan' action if the task was
 * associated with an insight.
 */
function processTaskEvent(event: HubSpotWebhookEvent): WebhookAction[] {
  const actions: WebhookAction[] = [];
  const timestamp = toISO(event.occurredAt);
  const propertyName = event.propertyName ?? '';
  const propertyValue = event.propertyValue ?? '';

  // Log every task property change
  actions.push({
    type: 'log_activity',
    sourceEvent: 'task.completed',
    objectId: event.objectId,
    data: {
      propertyName,
      propertyValue,
      message: `Task property "${propertyName}" changed to "${propertyValue}".`,
    },
    timestamp,
  });

  // If the task was completed, trigger a plan refresh
  if (
    propertyName === 'hs_task_status' &&
    (propertyValue === 'COMPLETED' || propertyValue === 'DONE')
  ) {
    actions.push({
      type: 'refresh_plan',
      sourceEvent: 'task.completed',
      objectId: event.objectId,
      data: {
        reason: 'A HubSpot task was marked as completed. Plan insights may need recalculation.',
        completedTaskId: event.objectId,
      },
      timestamp,
    });

    actions.push({
      type: 'notify_advisor',
      sourceEvent: 'task.completed',
      objectId: event.objectId,
      data: {
        notificationType: 'task_completed',
        message: 'A planning task was marked as completed in HubSpot.',
      },
      timestamp,
    });
  }

  return actions;
}

/**
 * Processes a task.creation event.
 */
function processTaskCreated(event: HubSpotWebhookEvent): WebhookAction[] {
  const timestamp = toISO(event.occurredAt);

  return [
    {
      type: 'log_activity',
      sourceEvent: 'task.creation',
      objectId: event.objectId,
      data: {
        message: 'New task created in HubSpot.',
      },
      timestamp,
    },
  ];
}

// ==================== UTILITIES ====================

/**
 * Normalizes HubSpot subscription type strings.
 * HubSpot can send either dot-separated or camelCase formats.
 */
function normalizeSubscriptionType(type: string): string {
  // HubSpot may send 'contact.propertyChange' or similar variants.
  // We normalize to a consistent lowercase dot-separated form.
  return type.toLowerCase().replace(/propertychange/g, 'propertyChange');
}

/**
 * Converts a Unix timestamp in milliseconds to an ISO-8601 string.
 */
function toISO(timestampMs: number): string {
  return new Date(timestampMs).toISOString();
}
