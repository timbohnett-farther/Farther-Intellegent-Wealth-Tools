// =============================================================================
// Automation Engine — Trigger Definitions & Event Matching
// =============================================================================

import type {
  TriggerDefinition,
  WorkflowEvent,
  WorkflowTemplate,
} from './types';
import { evaluateTrigger } from './workflow-engine';

// ==================== Trigger Definitions ====================

/**
 * All available trigger types with their descriptions and
 * configurable parameters. Used for UI display and validation.
 */
export const TRIGGER_DEFINITIONS: TriggerDefinition[] = [
  {
    type: 'client_created',
    label: 'New Client Created',
    description:
      'Fires when a new client is added to the system. Typically used for onboarding workflows that set up CRM records, send welcome communications, and create initial plan structures.',
    configKeys: ['clientType', 'wealthTier', 'referralSource'],
  },
  {
    type: 'plan_calculated',
    label: 'Plan Calculated',
    description:
      'Fires when a financial plan completes calculation. Can be used to generate reports, send notifications, create Reg BI documentation, or trigger follow-up analysis workflows.',
    configKeys: ['planType', 'calculationType', 'isRecalculation'],
  },
  {
    type: 'scheduled',
    label: 'Scheduled',
    description:
      'Fires on a recurring schedule (daily, weekly, monthly, quarterly, or annually). Used for periodic reviews, RMD reminders, rebalancing checks, and compliance reporting.',
    configKeys: ['schedule', 'cronExpression', 'month', 'dayOfMonth', 'dayOfWeek', 'hour'],
  },
  {
    type: 'life_event',
    label: 'Life Event Recorded',
    description:
      'Fires when a life event is recorded for a client (e.g., marriage, new child, job change, inheritance). Triggers plan review workflows and advisor notifications.',
    configKeys: ['eventTypes', 'eventType'],
  },
  {
    type: 'account_synced',
    label: 'Account Synced',
    description:
      'Fires when account data is synced from a custodian or aggregator. Can trigger balance change alerts, market correction responses, or drift monitoring workflows.',
    configKeys: ['condition', 'declineThresholdPct', 'changeThresholdPct', 'accountTypes'],
  },
  {
    type: 'manual',
    label: 'Manual Trigger',
    description:
      'Fired manually by an advisor or admin. Used for ad-hoc workflows that need to be executed on demand, such as generating a specific report or running a custom analysis.',
    configKeys: ['requiredRole', 'confirmationRequired'],
  },
];

// ==================== Event-to-Workflow Matching ====================

/**
 * Finds all active workflows whose triggers match the given event.
 *
 * Iterates through all provided workflows, checking each trigger against
 * the event using the `evaluateTrigger` function. Only active workflows
 * are considered.
 *
 * @param event - The event that occurred in the system.
 * @param workflows - All available workflow templates to check.
 * @returns An array of workflow templates whose triggers match the event.
 */
export function matchEventToWorkflows(
  event: WorkflowEvent,
  workflows: WorkflowTemplate[]
): WorkflowTemplate[] {
  const matched: WorkflowTemplate[] = [];

  for (const workflow of workflows) {
    // Skip inactive workflows
    if (!workflow.isActive) {
      continue;
    }

    // Check if the event matches this workflow's trigger
    if (evaluateTrigger(workflow.trigger, event)) {
      matched.push(workflow);
    }
  }

  return matched;
}

// ==================== Cron Schedule Builder ====================

/**
 * Pre-defined cron expression mappings for common schedule frequencies.
 */
const CRON_SCHEDULES: Record<string, string> = {
  // Standard frequencies
  daily: '0 8 * * *',          // Every day at 8:00 AM
  weekly: '0 8 * * 1',         // Every Monday at 8:00 AM
  biweekly: '0 8 1,15 * *',   // 1st and 15th of each month at 8:00 AM
  monthly: '0 8 1 * *',        // 1st of each month at 8:00 AM
  quarterly: '0 8 1 1,4,7,10 *', // 1st of Jan, Apr, Jul, Oct at 8:00 AM
  semiannual: '0 8 1 1,7 *',  // 1st of Jan and Jul at 8:00 AM
  annual: '0 8 1 1 *',         // January 1st at 8:00 AM

  // Business-specific frequencies
  business_daily: '0 8 * * 1-5',    // Weekdays at 8:00 AM
  market_open: '30 9 * * 1-5',      // Weekdays at 9:30 AM (market open)
  market_close: '0 16 * * 1-5',     // Weekdays at 4:00 PM (market close)
  end_of_month: '0 8 28-31 * *',    // Last days of month at 8:00 AM
  end_of_quarter: '0 8 28-31 3,6,9,12 *', // Last days of quarter at 8:00 AM
  end_of_year: '0 8 31 12 *',       // December 31st at 8:00 AM
  tax_season: '0 8 1 1-4 *',        // January through April, monthly
  rmd_season: '0 8 1 10-12 *',      // October through December, monthly

  // Time-of-day variants
  morning: '0 6 * * *',        // Every day at 6:00 AM
  midday: '0 12 * * *',        // Every day at 12:00 PM
  evening: '0 18 * * *',       // Every day at 6:00 PM
  overnight: '0 2 * * *',      // Every day at 2:00 AM

  // Hourly
  hourly: '0 * * * *',         // Every hour on the hour
  every_15_min: '*/15 * * * *', // Every 15 minutes
  every_30_min: '*/30 * * * *', // Every 30 minutes
};

/**
 * Maps a human-friendly schedule frequency name to a cron expression.
 *
 * Supports standard frequencies (daily, weekly, monthly, quarterly, annual),
 * business-specific schedules (market_open, market_close, tax_season, rmd_season),
 * and time-of-day variants.
 *
 * If the input is already a valid cron expression (contains spaces and consists
 * of 5 fields), it is returned as-is.
 *
 * @param frequency - A friendly name like 'daily', 'weekly', 'quarterly', etc.
 * @returns A cron expression string.
 * @throws Error if the frequency is not recognized and is not a valid cron expression.
 */
export function buildCronSchedule(frequency: string): string {
  // Normalize input
  const normalized = frequency.trim().toLowerCase().replace(/[\s-]+/g, '_');

  // Check if it's a known friendly name
  const knownCron = CRON_SCHEDULES[normalized];
  if (knownCron) {
    return knownCron;
  }

  // Check if the input is already a cron expression (5 space-separated fields)
  const parts = frequency.trim().split(/\s+/);
  if (parts.length === 5) {
    // Validate each field has only valid cron characters
    const cronFieldPattern = /^[0-9*,/\-]+$/;
    const isValidCron = parts.every((part) => cronFieldPattern.test(part));
    if (isValidCron) {
      return frequency.trim();
    }
  }

  throw new Error(
    `Unknown schedule frequency: "${frequency}". ` +
    `Valid options: ${Object.keys(CRON_SCHEDULES).join(', ')}, or a valid 5-field cron expression.`
  );
}
