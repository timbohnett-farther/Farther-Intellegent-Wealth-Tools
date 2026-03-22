/**
 * Farther Prism — HubSpot CRM Sync
 *
 * Maps financial plan data to HubSpot custom contact properties and
 * syncs insights as HubSpot tasks. All external HTTP calls are
 * abstracted and stubbed for now; replace with actual fetch calls
 * when the HubSpot private app is provisioned.
 */

import type {
  HubSpotConfig,
  HubSpotSyncResult,
  PlanSyncData,
  InsightForSync,
  HubSpotContactProperties,
} from '../types';

// ==================== CUSTOM PROPERTY DEFINITIONS ====================

/**
 * All 15 custom HubSpot contact properties used by Farther Prism.
 * Each entry carries its internal name and HubSpot data type.
 */
export const HUBSPOT_CUSTOM_PROPERTIES: Array<{
  name: keyof HubSpotContactProperties;
  label: string;
  type: 'string' | 'number' | 'date' | 'enumeration';
  groupName: string;
}> = [
  { name: 'fp_plan_success_rate', label: 'Plan Success Rate (%)', type: 'number', groupName: 'farther_prism' },
  { name: 'fp_net_worth', label: 'Net Worth', type: 'number', groupName: 'farther_prism' },
  { name: 'fp_aum', label: 'AUM', type: 'number', groupName: 'farther_prism' },
  { name: 'fp_wealth_tier', label: 'Wealth Tier', type: 'enumeration', groupName: 'farther_prism' },
  { name: 'fp_plan_completion_score', label: 'Plan Completion Score', type: 'number', groupName: 'farther_prism' },
  { name: 'fp_plan_status', label: 'Plan Status', type: 'enumeration', groupName: 'farther_prism' },
  { name: 'fp_last_plan_update', label: 'Last Plan Update', type: 'date', groupName: 'farther_prism' },
  { name: 'fp_last_meeting_date', label: 'Last Meeting Date', type: 'date', groupName: 'farther_prism' },
  { name: 'fp_retirement_year', label: 'Target Retirement Year', type: 'number', groupName: 'farther_prism' },
  { name: 'fp_active_goals', label: 'Active Goals', type: 'number', groupName: 'farther_prism' },
  { name: 'fp_at_risk_goals', label: 'At-Risk Goals', type: 'number', groupName: 'farther_prism' },
  { name: 'fp_primary_advisor', label: 'Primary Advisor', type: 'string', groupName: 'farther_prism' },
  { name: 'fp_annual_income', label: 'Annual Income', type: 'number', groupName: 'farther_prism' },
  { name: 'fp_projected_estate_value', label: 'Projected Estate Value', type: 'number', groupName: 'farther_prism' },
  { name: 'fp_open_insights', label: 'Open Insights', type: 'number', groupName: 'farther_prism' },
];

// ==================== PROPERTY BUILDER ====================

/**
 * Transforms a PlanSyncData object into a flat key-value map suitable
 * for the HubSpot contacts API.
 *
 * @param planSummary - Financial plan summary data.
 * @returns A Record mapping HubSpot property names to their values.
 *
 * @example
 * ```ts
 * const props = buildHubSpotProperties(planData);
 * // { fp_plan_success_rate: 87, fp_net_worth: 4500000, ... }
 * ```
 */
export function buildHubSpotProperties(
  planSummary: PlanSyncData,
): Record<string, string | number> {
  return {
    // Standard HubSpot properties
    firstname: planSummary.firstName,
    lastname: planSummary.lastName,
    email: planSummary.email,

    // Farther Prism custom properties
    fp_plan_success_rate: planSummary.planSuccessRate,
    fp_net_worth: planSummary.netWorth,
    fp_aum: planSummary.aum,
    fp_wealth_tier: planSummary.wealthTier,
    fp_plan_completion_score: planSummary.planCompletionScore,
    fp_plan_status: planSummary.planStatus,
    fp_last_plan_update: planSummary.lastPlanUpdate,
    fp_last_meeting_date: planSummary.lastMeetingDate,
    fp_retirement_year: planSummary.retirementYear,
    fp_active_goals: planSummary.activeGoals,
    fp_at_risk_goals: planSummary.atRiskGoals,
    fp_primary_advisor: planSummary.primaryAdvisor,
    fp_annual_income: planSummary.annualIncome,
    fp_projected_estate_value: planSummary.projectedEstateValue,
    fp_open_insights: planSummary.openInsights,
  };
}

// ==================== SYNC PLAN TO HUBSPOT ====================

/**
 * Syncs a financial plan summary to a HubSpot contact.
 *
 * If a contact matching the email already exists it will be updated;
 * otherwise a new contact is created. This is a stub implementation
 * that simulates the HubSpot API call.
 *
 * @param planSummary - The plan data to sync.
 * @param config - HubSpot API configuration.
 * @returns A HubSpotSyncResult describing what happened.
 *
 * @example
 * ```ts
 * const result = await syncPlanToHubSpot(planData, hubspotConfig);
 * console.log(`Updated: ${result.contactsUpdated}, Created: ${result.contactsCreated}`);
 * ```
 */
export async function syncPlanToHubSpot(
  planSummary: PlanSyncData,
  config: HubSpotConfig,
): Promise<HubSpotSyncResult> {
  const errors: string[] = [];
  let contactsCreated = 0;
  let contactsUpdated = 0;

  try {
    // Build the property payload
    const properties = buildHubSpotProperties(planSummary);

    // In production this would call the HubSpot API:
    //   POST https://api.hubapi.com/crm/v3/objects/contacts
    //   or
    //   PATCH https://api.hubapi.com/crm/v3/objects/contacts/{contactId}
    //
    // For now, simulate the API interaction.
    const _endpoint = config.baseUrl ?? 'https://api.hubapi.com';
    const _headers = {
      'Authorization': `Bearer ${config.accessToken}`,
      'Content-Type': 'application/json',
    };

    // Simulate: search for existing contact by email
    const existingContact = await simulateContactSearch(planSummary.email, config);

    if (existingContact) {
      // Update existing contact
      await simulateContactUpdate(existingContact.id, properties, config);
      contactsUpdated = 1;
    } else {
      // Create new contact
      await simulateContactCreate(properties, config);
      contactsCreated = 1;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error during HubSpot sync';
    errors.push(message);
  }

  return {
    contactsCreated,
    contactsUpdated,
    tasksCreated: 0,
    errors,
  };
}

// ==================== SYNC INSIGHTS AS TASKS ====================

/**
 * Creates HubSpot tasks from financial planning insights.
 *
 * Each insight is mapped to a HubSpot task with the appropriate
 * priority, description, and contact association.
 *
 * @param insights - Array of insights to create as tasks.
 * @param config - HubSpot API configuration.
 * @returns Count of created tasks and any errors.
 *
 * @example
 * ```ts
 * const { created, errors } = await syncInsightsAsHubSpotTasks(insights, config);
 * ```
 */
export async function syncInsightsAsHubSpotTasks(
  insights: InsightForSync[],
  config: HubSpotConfig,
): Promise<{ created: number; errors: string[] }> {
  const errors: string[] = [];
  let created = 0;

  for (const insight of insights) {
    try {
      // Map priority to HubSpot task priority
      const hubspotPriority = mapPriorityToHubSpot(insight.priority);

      // In production this would call:
      //   POST https://api.hubapi.com/crm/v3/objects/tasks
      const _taskPayload = {
        properties: {
          hs_task_subject: insight.title,
          hs_task_body: insight.description,
          hs_task_status: 'NOT_STARTED',
          hs_task_priority: hubspotPriority,
          hs_timestamp: insight.dueDate,
          hubspot_owner_id: insight.ownerId,
        },
        associations: [
          {
            to: { id: insight.contactId },
            types: [
              {
                associationCategory: 'HUBSPOT_DEFINED',
                associationTypeId: 204, // task-to-contact
              },
            ],
          },
        ],
      };

      // Simulate the API call
      const _endpoint = config.baseUrl ?? 'https://api.hubapi.com';
      const _headers = {
        'Authorization': `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json',
      };

      // Stub: simulate success
      created++;
    } catch (err) {
      const message = err instanceof Error
        ? err.message
        : `Failed to create task for insight: ${insight.title}`;
      errors.push(message);
    }
  }

  return { created, errors };
}

// ==================== PRIVATE HELPERS ====================

/**
 * Maps internal priority levels to HubSpot task priority values.
 */
function mapPriorityToHubSpot(priority: 'high' | 'medium' | 'low'): string {
  switch (priority) {
    case 'high':
      return 'HIGH';
    case 'medium':
      return 'MEDIUM';
    case 'low':
      return 'LOW';
    default:
      return 'NONE';
  }
}

/** Stub: simulate searching for a contact by email. */
async function simulateContactSearch(
  email: string,
  _config: HubSpotConfig,
): Promise<{ id: string; email: string } | null> {
  // In production, POST to /crm/v3/objects/contacts/search
  // with filterGroups on the email property.
  //
  // Stub: simulate that the contact exists if the email contains "existing"
  if (email.includes('existing')) {
    return { id: 'hubspot-contact-12345', email };
  }
  return null;
}

/** Stub: simulate updating a contact. */
async function simulateContactUpdate(
  _contactId: string,
  _properties: Record<string, string | number>,
  _config: HubSpotConfig,
): Promise<void> {
  // In production, PATCH to /crm/v3/objects/contacts/{contactId}
  // Stub: no-op
}

/** Stub: simulate creating a contact. */
async function simulateContactCreate(
  _properties: Record<string, string | number>,
  _config: HubSpotConfig,
): Promise<{ id: string }> {
  // In production, POST to /crm/v3/objects/contacts
  // Stub: return a fake ID
  return { id: 'hubspot-contact-new-' + Date.now() };
}
