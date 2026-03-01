/**
 * Farther Unified Platform — Client Portal Subscriber
 *
 * Pushes real-time updates to the client portal when:
 * - Proposal is ready for review
 * - Account balances updated
 * - Goal status changes
 * - Review is scheduled
 * - Plan results are available
 *
 * Stage 1 (current): In-memory notification queue per household.
 * Stage 2 (future):  WebSocket / Server-Sent Events push to clients.
 *
 * This module is self-contained and does not depend on React or Next.js.
 */

import { eventBus } from '../event-bus';
import type { HouseholdEvent, HouseholdEventType } from '../event-bus';

// ==================== TYPES ====================

/** Priority levels for client notifications. */
export type NotificationPriority = 'urgent' | 'high' | 'normal' | 'low';

/** Categories of client-facing notifications. */
export type NotificationType =
  | 'proposal_ready'
  | 'account_update'
  | 'goal_update'
  | 'review_scheduled'
  | 'plan_update'
  | 'general';

/** A notification destined for the client portal. */
export interface ClientNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  householdId: string;
  timestamp: string;
  read: boolean;
  priority: NotificationPriority;
  /** Optional deep-link path within the client portal. */
  actionUrl: string | null;
  /** Optional metadata for the notification. */
  metadata: Record<string, unknown>;
}

// ==================== LOGGING HELPER ====================

function log(method: string, detail: string): void {
  console.log(`[ClientPortalSubscriber:${method}] ${detail}`);
}

// ==================== ID GENERATOR ====================

let notificationCounter = 0;

function generateNotificationId(): string {
  notificationCounter++;
  return `notif_${Date.now()}_${notificationCounter}`;
}

// ==================== SUBSCRIBER CLASS ====================

/**
 * ClientPortalSubscriber maintains an in-memory notification queue
 * for each household and provides methods to query and manage
 * notifications for the client portal.
 */
export class ClientPortalSubscriber {
  private unsubscribeFns: Array<() => void> = [];

  /**
   * In-memory notification store, keyed by householdId.
   * In production this would be backed by a database table.
   */
  private notifications: Map<string, ClientNotification[]> = new Map();

  /** Event types this subscriber listens to. */
  private static readonly SUBSCRIBED_EVENTS: HouseholdEventType[] = [
    'proposal.created',
    'account.balance_changed',
    'account.updated',
    'goal.status_changed',
    'review.scheduled',
    'plan.calculated',
  ];

  /**
   * Registers all event subscriptions with the event bus.
   */
  register(): void {
    log('register', `Registering ${ClientPortalSubscriber.SUBSCRIBED_EVENTS.length} event subscriptions`);

    for (const eventType of ClientPortalSubscriber.SUBSCRIBED_EVENTS) {
      const unsub = eventBus.subscribe(
        eventType,
        (event: HouseholdEvent) => { this.routeEvent(event); },
        'ClientPortalSubscriber',
      );
      this.unsubscribeFns.push(unsub);
    }

    log('register', 'All client portal subscriptions registered');
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
    log('unregister', 'All client portal subscriptions removed');
  }

  /**
   * Routes an event to the appropriate handler method.
   */
  private routeEvent(event: HouseholdEvent): void {
    switch (event.eventType) {
      case 'proposal.created':
        this.handleProposalCreated(event);
        break;
      case 'account.balance_changed':
      case 'account.updated':
        this.handleAccountUpdated(event);
        break;
      case 'goal.status_changed':
        this.handleGoalStatusChanged(event);
        break;
      case 'review.scheduled':
        this.handleReviewScheduled(event);
        break;
      case 'plan.calculated':
        this.handlePlanCalculated(event);
        break;
      default:
        log('routeEvent', `Unhandled event type: ${event.eventType}`);
    }
  }

  /**
   * When a proposal is created, notify the client that a new proposal
   * is ready for their review.
   */
  private handleProposalCreated(event: HouseholdEvent): void {
    const payload = (event.payload as Record<string, unknown>) ?? {};
    const proposalId = (payload.proposalId as string) ?? 'unknown';

    this.addNotification({
      type: 'proposal_ready',
      title: 'New Proposal Ready',
      message: 'Your advisor has prepared a new investment proposal for your review.',
      householdId: event.householdId,
      priority: 'high',
      actionUrl: `/portal/proposals/${proposalId}`,
      metadata: { proposalId },
    });

    log(
      'handleProposalCreated',
      `Notification queued for household ${event.householdId}: proposal ${proposalId} ready`,
    );
  }

  /**
   * When account balances are updated, notify the client with
   * a summary of the change.
   */
  private handleAccountUpdated(event: HouseholdEvent): void {
    const payload = (event.payload as Record<string, unknown>) ?? {};
    const accountId = (payload.accountId as string) ?? 'unknown';
    const previousBalance = payload.previousBalance as number | undefined;
    const newBalance = payload.newBalance as number | undefined;

    let message = 'Your account balances have been updated.';
    if (previousBalance !== undefined && newBalance !== undefined) {
      const change = newBalance - previousBalance;
      const direction = change >= 0 ? 'increased' : 'decreased';
      const absChange = Math.abs(change);
      message = `Your account balance has ${direction} by $${absChange.toLocaleString()}.`;
    }

    this.addNotification({
      type: 'account_update',
      title: 'Account Balance Updated',
      message,
      householdId: event.householdId,
      priority: 'normal',
      actionUrl: `/portal/accounts/${accountId}`,
      metadata: { accountId, previousBalance, newBalance },
    });

    log(
      'handleAccountUpdated',
      `Notification queued for household ${event.householdId}: account ${accountId} updated`,
    );
  }

  /**
   * When a goal's status changes, notify the client with the
   * new status and any relevant details.
   */
  private handleGoalStatusChanged(event: HouseholdEvent): void {
    const payload = (event.payload as Record<string, unknown>) ?? {};
    const goalId = (payload.goalId as string) ?? 'unknown';
    const goalName = (payload.goalName as string) ?? 'Your goal';
    const newStatus = (payload.newStatus as string) ?? 'updated';
    const previousStatus = (payload.previousStatus as string) ?? '';

    const statusMessages: Record<string, string> = {
      on_track: `${goalName} is on track to be met.`,
      at_risk: `${goalName} may need attention - it is currently at risk.`,
      behind: `${goalName} is behind schedule. Consider reviewing with your advisor.`,
      achieved: `Congratulations! ${goalName} has been achieved!`,
      cancelled: `${goalName} has been marked as cancelled.`,
    };

    const message = statusMessages[newStatus] ?? `${goalName} status has been updated to ${newStatus}.`;

    const priorityMap: Record<string, NotificationPriority> = {
      at_risk: 'high',
      behind: 'urgent',
      achieved: 'high',
      on_track: 'low',
      cancelled: 'normal',
    };

    this.addNotification({
      type: 'goal_update',
      title: 'Goal Status Update',
      message,
      householdId: event.householdId,
      priority: priorityMap[newStatus] ?? 'normal',
      actionUrl: `/portal/goals/${goalId}`,
      metadata: { goalId, goalName, newStatus, previousStatus },
    });

    log(
      'handleGoalStatusChanged',
      `Notification queued for household ${event.householdId}: ` +
        `goal ${goalId} status changed to ${newStatus}`,
    );
  }

  /**
   * When a review is scheduled, notify the client with the
   * date and details.
   */
  private handleReviewScheduled(event: HouseholdEvent): void {
    const payload = (event.payload as Record<string, unknown>) ?? {};
    const reviewDate = (payload.reviewDate as string) ?? '';
    const reviewType = (payload.reviewType as string) ?? 'review';
    const advisorName = (payload.advisorName as string) ?? 'your advisor';

    const formattedDate = reviewDate
      ? new Date(reviewDate).toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : 'a date to be confirmed';

    this.addNotification({
      type: 'review_scheduled',
      title: 'Review Meeting Scheduled',
      message: `Your ${reviewType} review with ${advisorName} has been scheduled for ${formattedDate}.`,
      householdId: event.householdId,
      priority: 'normal',
      actionUrl: '/portal/calendar',
      metadata: { reviewDate, reviewType, advisorName },
    });

    log(
      'handleReviewScheduled',
      `Notification queued for household ${event.householdId}: ` +
        `${reviewType} review scheduled for ${reviewDate}`,
    );
  }

  /**
   * When a financial plan is calculated, notify the client that
   * updated results are available.
   */
  private handlePlanCalculated(event: HouseholdEvent): void {
    const payload = (event.payload as Record<string, unknown>) ?? {};
    const planId = (payload.planId as string) ?? 'unknown';
    const changesDetected = (payload.changesDetected as boolean) ?? false;
    const newSuccessRate = payload.newSuccessRate as number | undefined;

    if (!changesDetected) {
      log('handlePlanCalculated', `No changes detected for plan ${planId}, skipping notification`);
      return;
    }

    let message = 'Your financial plan has been updated with the latest data.';
    if (newSuccessRate !== undefined) {
      const pct = Math.round(newSuccessRate * 100);
      message = `Your financial plan has been updated. Current success probability: ${pct}%.`;
    }

    this.addNotification({
      type: 'plan_update',
      title: 'Financial Plan Updated',
      message,
      householdId: event.householdId,
      priority: 'normal',
      actionUrl: `/portal/plan/${planId}`,
      metadata: { planId, newSuccessRate, changesDetected },
    });

    log(
      'handlePlanCalculated',
      `Notification queued for household ${event.householdId}: plan ${planId} updated`,
    );
  }

  // ==================== NOTIFICATION MANAGEMENT ====================

  /**
   * Adds a notification to the in-memory store.
   */
  private addNotification(params: {
    type: NotificationType;
    title: string;
    message: string;
    householdId: string;
    priority: NotificationPriority;
    actionUrl: string | null;
    metadata: Record<string, unknown>;
  }): void {
    const notification: ClientNotification = {
      id: generateNotificationId(),
      type: params.type,
      title: params.title,
      message: params.message,
      householdId: params.householdId,
      timestamp: new Date().toISOString(),
      read: false,
      priority: params.priority,
      actionUrl: params.actionUrl,
      metadata: params.metadata,
    };

    const existing = this.notifications.get(params.householdId) ?? [];
    existing.push(notification);
    this.notifications.set(params.householdId, existing);
  }

  /**
   * Returns all notifications for a household, sorted by timestamp descending.
   */
  getNotifications(householdId: string): ClientNotification[] {
    const notifications = this.notifications.get(householdId) ?? [];
    return [...notifications].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
  }

  /**
   * Marks a notification as read.
   */
  markRead(notificationId: string): boolean {
    for (const notifications of this.notifications.values()) {
      const notification = notifications.find((n) => n.id === notificationId);
      if (notification) {
        notification.read = true;
        log('markRead', `Notification ${notificationId} marked as read`);
        return true;
      }
    }
    log('markRead', `Notification ${notificationId} not found`);
    return false;
  }

  /**
   * Marks all notifications for a household as read.
   */
  markAllRead(householdId: string): number {
    const notifications = this.notifications.get(householdId) ?? [];
    let count = 0;
    for (const notification of notifications) {
      if (!notification.read) {
        notification.read = true;
        count++;
      }
    }
    log('markAllRead', `Marked ${count} notifications as read for household ${householdId}`);
    return count;
  }

  /**
   * Returns the count of unread notifications for a household.
   */
  getUnreadCount(householdId: string): number {
    const notifications = this.notifications.get(householdId) ?? [];
    return notifications.filter((n) => !n.read).length;
  }

  /**
   * Returns only unread notifications for a household, sorted by priority
   * (urgent first) then by timestamp.
   */
  getUnreadNotifications(householdId: string): ClientNotification[] {
    const priorityOrder: Record<NotificationPriority, number> = {
      urgent: 0,
      high: 1,
      normal: 2,
      low: 3,
    };

    const notifications = this.notifications.get(householdId) ?? [];
    return notifications
      .filter((n) => !n.read)
      .sort((a, b) => {
        const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      });
  }

  /**
   * Removes notifications older than the specified number of days.
   */
  pruneOldNotifications(maxAgeDays: number): number {
    const cutoff = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;
    let totalRemoved = 0;

    for (const [householdId, notifications] of this.notifications.entries()) {
      const before = notifications.length;
      const filtered = notifications.filter(
        (n) => new Date(n.timestamp).getTime() >= cutoff,
      );
      totalRemoved += before - filtered.length;
      this.notifications.set(householdId, filtered);
    }

    log('pruneOldNotifications', `Pruned ${totalRemoved} notifications older than ${maxAgeDays} days`);
    return totalRemoved;
  }
}

// ==================== SINGLETON & REGISTRATION ====================

let clientPortalSubscriberInstance: ClientPortalSubscriber | null = null;

/**
 * Returns the singleton ClientPortalSubscriber instance.
 */
export function getClientPortalSubscriber(): ClientPortalSubscriber {
  if (!clientPortalSubscriberInstance) {
    clientPortalSubscriberInstance = new ClientPortalSubscriber();
  }
  return clientPortalSubscriberInstance;
}

/**
 * Registers the client portal subscriber with the event bus.
 */
export function registerClientPortalSubscriber(): void {
  const subscriber = getClientPortalSubscriber();
  subscriber.register();
  log('registerClientPortalSubscriber', 'Client portal subscriber registered');
}

/**
 * Unregisters the client portal subscriber from the event bus.
 */
export function unregisterClientPortalSubscriber(): void {
  if (clientPortalSubscriberInstance) {
    clientPortalSubscriberInstance.unregister();
    clientPortalSubscriberInstance = null;
    log('unregisterClientPortalSubscriber', 'Client portal subscriber unregistered');
  }
}
