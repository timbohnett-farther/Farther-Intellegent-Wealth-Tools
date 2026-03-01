/**
 * Farther Prism — HubSpot Custom Property Definitions
 *
 * Defines the complete set of custom HubSpot contact properties used by
 * Farther Prism and provides a stub function for provisioning them
 * via the HubSpot Properties API.
 */

import type { HubSpotConfig, HubSpotPropertyDefinition } from '../types';

// ==================== PROPERTY DEFINITIONS ====================

/**
 * Complete array of custom HubSpot contact property definitions for
 * the Farther Prism integration. These properties live in the
 * `farther_prism` property group.
 *
 * Each property uses the `fp_` prefix to avoid collisions with
 * standard HubSpot properties or other integrations.
 */
export const HUBSPOT_CUSTOM_PROPERTIES: HubSpotPropertyDefinition[] = [
  {
    name: 'fp_plan_success_rate',
    label: 'Plan Success Rate (%)',
    type: 'number',
    groupName: 'farther_prism',
    description: 'Monte Carlo probability of financial plan success (0-100).',
  },
  {
    name: 'fp_net_worth',
    label: 'Net Worth',
    type: 'number',
    groupName: 'farther_prism',
    description: 'Client total net worth (assets minus liabilities).',
  },
  {
    name: 'fp_aum',
    label: 'AUM',
    type: 'number',
    groupName: 'farther_prism',
    description: 'Assets under management at Farther.',
  },
  {
    name: 'fp_wealth_tier',
    label: 'Wealth Tier',
    type: 'enumeration',
    groupName: 'farther_prism',
    description: 'Client wealth tier classification.',
    options: [
      { label: 'Emerging (<$500K)', value: 'emerging' },
      { label: 'Mass Affluent ($500K-$2M)', value: 'mass_affluent' },
      { label: 'HNW ($2M-$10M)', value: 'hnw' },
      { label: 'UHNW ($10M+)', value: 'uhnw' },
    ],
  },
  {
    name: 'fp_plan_completion_score',
    label: 'Plan Completion Score',
    type: 'number',
    groupName: 'farther_prism',
    description: 'Financial plan data completeness score (0-100).',
  },
  {
    name: 'fp_plan_status',
    label: 'Plan Status',
    type: 'enumeration',
    groupName: 'farther_prism',
    description: 'Current status of the financial plan.',
    options: [
      { label: 'Draft', value: 'draft' },
      { label: 'Active', value: 'active' },
      { label: 'Needs Review', value: 'needs_review' },
      { label: 'Archived', value: 'archived' },
    ],
  },
  {
    name: 'fp_last_plan_update',
    label: 'Last Plan Update',
    type: 'date',
    groupName: 'farther_prism',
    description: 'Date the financial plan was last updated.',
  },
  {
    name: 'fp_last_meeting_date',
    label: 'Last Meeting Date',
    type: 'date',
    groupName: 'farther_prism',
    description: 'Date of the last client meeting.',
  },
  {
    name: 'fp_retirement_year',
    label: 'Target Retirement Year',
    type: 'number',
    groupName: 'farther_prism',
    description: 'Client target retirement year.',
  },
  {
    name: 'fp_active_goals',
    label: 'Active Goals',
    type: 'number',
    groupName: 'farther_prism',
    description: 'Number of active financial planning goals.',
  },
  {
    name: 'fp_at_risk_goals',
    label: 'At-Risk Goals',
    type: 'number',
    groupName: 'farther_prism',
    description: 'Number of goals currently at risk of not being met.',
  },
  {
    name: 'fp_primary_advisor',
    label: 'Primary Advisor',
    type: 'string',
    groupName: 'farther_prism',
    description: 'Name of the primary financial advisor.',
  },
  {
    name: 'fp_annual_income',
    label: 'Annual Income',
    type: 'number',
    groupName: 'farther_prism',
    description: 'Client total annual income.',
  },
  {
    name: 'fp_projected_estate_value',
    label: 'Projected Estate Value',
    type: 'number',
    groupName: 'farther_prism',
    description: 'Projected estate value at planning horizon.',
  },
  {
    name: 'fp_open_insights',
    label: 'Open Insights',
    type: 'number',
    groupName: 'farther_prism',
    description: 'Number of open financial planning insights / action items.',
  },
];

// ==================== PROPERTY GROUP NAME ====================

/** HubSpot property group for all Farther Prism custom properties. */
export const HUBSPOT_PROPERTY_GROUP = 'farther_prism';

/** Display label for the HubSpot property group. */
export const HUBSPOT_PROPERTY_GROUP_LABEL = 'Farther Prism';

// ==================== PROVISIONING ====================

/**
 * Provisions all Farther Prism custom properties in HubSpot.
 *
 * This function first creates the property group (if it does not exist),
 * then creates or updates each custom property. This is a stub
 * implementation; replace with actual HubSpot API calls when ready.
 *
 * @param config - HubSpot API configuration.
 *
 * @example
 * ```ts
 * await createHubSpotProperties({
 *   accessToken: 'pat-na1-xxxx',
 *   portalId: '12345678',
 * });
 * ```
 */
export async function createHubSpotProperties(config: HubSpotConfig): Promise<void> {
  const baseUrl = config.baseUrl ?? 'https://api.hubapi.com';
  const _headers = {
    'Authorization': `Bearer ${config.accessToken}`,
    'Content-Type': 'application/json',
  };

  // Step 1: Create the property group if it does not already exist.
  //
  // In production:
  //   POST {baseUrl}/crm/v3/properties/contacts/groups
  //   Body: { name: 'farther_prism', label: 'Farther Prism' }
  //
  // Stub: log intent
  const _groupPayload = {
    name: HUBSPOT_PROPERTY_GROUP,
    label: HUBSPOT_PROPERTY_GROUP_LABEL,
  };

  // Step 2: Create each custom property.
  //
  // In production:
  //   POST {baseUrl}/crm/v3/properties/contacts
  //   Body: { name, label, type, groupName, fieldType, options? }
  //
  // Stub: iterate and log
  for (const prop of HUBSPOT_CUSTOM_PROPERTIES) {
    const _propertyPayload = {
      name: prop.name,
      label: prop.label,
      type: prop.type,
      groupName: prop.groupName,
      description: prop.description ?? '',
      fieldType: mapTypeToFieldType(prop.type),
      ...(prop.options ? { options: prop.options } : {}),
    };

    // Stub: In production, POST to {baseUrl}/crm/v3/properties/contacts
    // If property exists (409 Conflict), PATCH to update it instead.
    void _propertyPayload;
    void baseUrl;
  }
}

// ==================== HELPERS ====================

/**
 * Maps a HubSpot property type to the corresponding field type.
 * HubSpot requires both `type` and `fieldType` when creating properties.
 */
function mapTypeToFieldType(
  type: 'string' | 'number' | 'date' | 'enumeration',
): string {
  switch (type) {
    case 'string':
      return 'text';
    case 'number':
      return 'number';
    case 'date':
      return 'date';
    case 'enumeration':
      return 'select';
    default:
      return 'text';
  }
}
