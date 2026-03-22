/**
 * Farther Unified Platform — Subscriber Registration
 *
 * Barrel export for all event bus subscribers. Call registerAllSubscribers()
 * during application bootstrap to wire up all event handlers to the
 * household event bus.
 *
 * Each subscriber listens for specific HouseholdEvent types and
 * performs its domain-specific processing (plan recalcs, proposal
 * tracking, CRM sync, client notifications).
 */

export {
  PlanningSubscriber,
  getPlanningSubscriber,
  registerPlanningSubscriber,
  unregisterPlanningSubscriber,
} from './planning-subscriber';

export type {
  CalcModule,
  RecalcPriority,
  PlanRecalcRequest,
  RecalcResult,
} from './planning-subscriber';

export {
  ProposalSubscriber,
  getProposalSubscriber,
  registerProposalSubscriber,
  unregisterProposalSubscriber,
} from './proposal-subscriber';

export type {
  ProposalState,
  ProposalTransition,
  ProposalTracker,
} from './proposal-subscriber';

export {
  HubSpotSubscriber,
  getHubSpotSubscriber,
  registerHubSpotSubscriber,
  unregisterHubSpotSubscriber,
} from './hubspot-subscriber';

export type {
  HubSpotPropertyMap,
  HubSpotLifecycleStage,
  SyncLogEntry,
} from './hubspot-subscriber';

export {
  ClientPortalSubscriber,
  getClientPortalSubscriber,
  registerClientPortalSubscriber,
  unregisterClientPortalSubscriber,
} from './client-portal-subscriber';

export type {
  NotificationPriority,
  NotificationType,
  ClientNotification,
} from './client-portal-subscriber';

// ==================== AGGREGATE REGISTRATION ====================

import { registerPlanningSubscriber, unregisterPlanningSubscriber } from './planning-subscriber';
import { registerProposalSubscriber, unregisterProposalSubscriber } from './proposal-subscriber';
import { registerHubSpotSubscriber, unregisterHubSpotSubscriber } from './hubspot-subscriber';
import { registerClientPortalSubscriber, unregisterClientPortalSubscriber } from './client-portal-subscriber';

/**
 * Registers all event bus subscribers. Call this once during
 * application bootstrap (e.g. in a Next.js instrumentation hook
 * or server startup script).
 *
 * Registration order matters: planning runs first so that downstream
 * subscribers (proposal, HubSpot, portal) can react to plan.calculated
 * events produced by the planning subscriber.
 *
 * @example
 * ```ts
 * import { registerAllSubscribers } from '@/lib/household/subscribers';
 *
 * // In app bootstrap:
 * registerAllSubscribers();
 * ```
 */
export function registerAllSubscribers(): void {
  console.log('[Subscribers] Registering all event bus subscribers...');

  // Order matters: planning first, then dependents
  registerPlanningSubscriber();
  registerProposalSubscriber();
  registerHubSpotSubscriber();
  registerClientPortalSubscriber();

  console.log('[Subscribers] All subscribers registered successfully');
}

/**
 * Unregisters all event bus subscribers. Call this during
 * application shutdown or for testing teardown.
 *
 * @example
 * ```ts
 * import { unregisterAllSubscribers } from '@/lib/household/subscribers';
 *
 * // In app shutdown:
 * unregisterAllSubscribers();
 * ```
 */
export function unregisterAllSubscribers(): void {
  console.log('[Subscribers] Unregistering all event bus subscribers...');

  unregisterClientPortalSubscriber();
  unregisterHubSpotSubscriber();
  unregisterProposalSubscriber();
  unregisterPlanningSubscriber();

  console.log('[Subscribers] All subscribers unregistered successfully');
}
