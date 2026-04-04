/**
 * Farther Proposal Engine — HubSpot CRM Sync
 *
 * Bidirectional sync between proposal engine and HubSpot CRM.
 * - Writes proposal status, risk scores, and metrics to HubSpot contact properties
 * - Creates/updates deals to track proposal lifecycle
 * - Reads contact context for proposal enrichment
 *
 * @module proposal-engine/integrations/hubspot-sync
 */

import { fetchWithTimeout } from '@/lib/fetch-with-timeout';

// =====================================================================
// HubSpot v3 API Constants
// =====================================================================

const HUBSPOT_API_BASE = 'https://api.hubapi.com';
const HUBSPOT_CONTACTS_ENDPOINT = `${HUBSPOT_API_BASE}/crm/v3/objects/contacts`;
const HUBSPOT_DEALS_ENDPOINT = `${HUBSPOT_API_BASE}/crm/v3/objects/deals`;

// Custom properties (ensure these exist in HubSpot)
const CONTACT_PROPERTIES = {
  RISK_SCORE: 'farther_risk_score',
  PORTFOLIO_RISK: 'farther_portfolio_risk',
  PROPOSAL_STATUS: 'farther_proposal_status',
  PROPOSAL_DATE: 'farther_proposal_date',
  ASSETS_IN_SCOPE: 'farther_assets_in_scope',
  FEE_SAVINGS: 'farther_fee_savings',
} as const;

// Deal stage mapping: proposal status → HubSpot deal stage
const DEAL_STAGE_MAP: Record<string, string> = {
  DRAFT: 'appointmentscheduled',
  SENT: 'presentationscheduled',
  VIEWED: 'decisionmakerboughtin',
  ACCEPTED: 'closedwon',
  DECLINED: 'closedlost',
};

// =====================================================================
// Types
// =====================================================================

export interface HubSpotSyncParams {
  contactId: string;
  proposalId: string;
  clientName: string;
  proposalType: string;
  status: string;
  riskScore?: number;
  riskLabel?: string;
  assetsInScope?: number;        // in dollars
  feeSavingsAnnual?: number;     // in dollars
  proposedModel?: string;
  advisorId?: string;
}

export interface HubSpotSyncResult {
  success: boolean;
  contactUpdated: boolean;
  dealUpdated: boolean;
  errors: string[];
}

export interface HubSpotContactContext {
  name: string;
  email: string;
  estimatedAUM?: number;
  meetingNotes?: string;
  lifecycleStage?: string;
}

// =====================================================================
// Main Sync Function
// =====================================================================

/**
 * Sync proposal data to HubSpot contact and deal records.
 *
 * @param params - Proposal sync parameters
 * @returns Result object indicating success and what was updated
 *
 * @example
 * ```ts
 * const result = await syncProposalToHubSpot({
 *   contactId: '123456',
 *   proposalId: 'prop-uuid',
 *   clientName: 'John Smith',
 *   proposalType: 'NEW_RELATIONSHIP',
 *   status: 'SENT',
 *   riskScore: 62,
 *   riskLabel: 'MODERATELY_AGGRESSIVE',
 *   assetsInScope: 1000000,
 *   feeSavingsAnnual: 5000,
 *   proposedModel: 'Farther Growth 60/40',
 *   advisorId: 'advisor-uuid'
 * });
 *
 * if (!result.success) {
 *   console.error('Sync failed:', result.errors);
 * }
 * ```
 */
export async function syncProposalToHubSpot(params: HubSpotSyncParams): Promise<HubSpotSyncResult> {
  const errors: string[] = [];
  let contactUpdated = false;
  let dealUpdated = false;

  // Check for access token
  const accessToken = process.env.HUBSPOT_ACCESS_TOKEN;
  if (!accessToken) {
    return {
      success: false,
      contactUpdated: false,
      dealUpdated: false,
      errors: ['HUBSPOT_ACCESS_TOKEN not configured'],
    };
  }

  // =====================================================================
  // Step 1: Update Contact Properties
  // =====================================================================

  try {
    const contactProps: Record<string, string | number> = {
      [CONTACT_PROPERTIES.PROPOSAL_STATUS]: params.status,
      [CONTACT_PROPERTIES.PROPOSAL_DATE]: new Date().toISOString(),
    };

    if (params.riskScore !== undefined) {
      contactProps[CONTACT_PROPERTIES.RISK_SCORE] = params.riskScore;
    }

    if (params.riskLabel) {
      contactProps[CONTACT_PROPERTIES.PORTFOLIO_RISK] = params.riskLabel;
    }

    if (params.assetsInScope !== undefined) {
      contactProps[CONTACT_PROPERTIES.ASSETS_IN_SCOPE] = params.assetsInScope;
    }

    if (params.feeSavingsAnnual !== undefined) {
      contactProps[CONTACT_PROPERTIES.FEE_SAVINGS] = params.feeSavingsAnnual;
    }

    const contactResponse = await fetchWithTimeout(
      `${HUBSPOT_CONTACTS_ENDPOINT}/${params.contactId}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ properties: contactProps }),
      },
      10_000
    );

    if (contactResponse.ok) {
      contactUpdated = true;
    } else if (contactResponse.status === 429) {
      console.warn('[HubSpot Sync] Rate limit hit while updating contact');
      errors.push('Rate limit exceeded — contact update skipped');
    } else {
      const errorText = await contactResponse.text();
      errors.push(`Failed to update contact: ${contactResponse.status} ${errorText}`);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    errors.push(`Contact update error: ${message}`);
  }

  // =====================================================================
  // Step 2: Create or Update Deal
  // =====================================================================

  try {
    // Search for existing deal with this proposalId
    const searchResponse = await fetchWithTimeout(
      `${HUBSPOT_DEALS_ENDPOINT}/search`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filterGroups: [
            {
              filters: [
                {
                  propertyName: 'farther_proposal_id',
                  operator: 'EQ',
                  value: params.proposalId,
                },
              ],
            },
          ],
          properties: ['hs_object_id', 'dealstage'],
          limit: 1,
        }),
      },
      10_000
    );

    let dealId: string | null = null;

    if (searchResponse.ok) {
      const searchData = await searchResponse.json();
      if (searchData.results && searchData.results.length > 0) {
        dealId = searchData.results[0].id;
      }
    }

    const dealStage = DEAL_STAGE_MAP[params.status] || 'appointmentscheduled';

    const dealProps: Record<string, string | number> = {
      dealname: `${params.clientName} — ${params.proposalType}`,
      dealstage: dealStage,
      amount: params.assetsInScope || 0,
      farther_proposal_id: params.proposalId,
      farther_proposal_type: params.proposalType,
      farther_risk_score: params.riskScore || 0,
      farther_proposed_model: params.proposedModel || '',
    };

    if (dealId) {
      // Update existing deal
      const updateResponse = await fetchWithTimeout(
        `${HUBSPOT_DEALS_ENDPOINT}/${dealId}`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ properties: dealProps }),
        },
        10_000
      );

      if (updateResponse.ok) {
        dealUpdated = true;
      } else if (updateResponse.status === 429) {
        console.warn('[HubSpot Sync] Rate limit hit while updating deal');
        errors.push('Rate limit exceeded — deal update skipped');
      } else {
        const errorText = await updateResponse.text();
        errors.push(`Failed to update deal: ${updateResponse.status} ${errorText}`);
      }
    } else {
      // Create new deal and associate with contact
      const createResponse = await fetchWithTimeout(
        HUBSPOT_DEALS_ENDPOINT,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            properties: dealProps,
            associations: [
              {
                to: { id: params.contactId },
                types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 3 }], // Deal to Contact
              },
            ],
          }),
        },
        10_000
      );

      if (createResponse.ok) {
        dealUpdated = true;
      } else if (createResponse.status === 429) {
        console.warn('[HubSpot Sync] Rate limit hit while creating deal');
        errors.push('Rate limit exceeded — deal creation skipped');
      } else {
        const errorText = await createResponse.text();
        errors.push(`Failed to create deal: ${createResponse.status} ${errorText}`);
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    errors.push(`Deal sync error: ${message}`);
  }

  // =====================================================================
  // Return Result
  // =====================================================================

  return {
    success: errors.length === 0,
    contactUpdated,
    dealUpdated,
    errors,
  };
}

// =====================================================================
// Read Contact Context
// =====================================================================

/**
 * Read client context from HubSpot contact for proposal enrichment.
 *
 * @param contactId - HubSpot contact ID
 * @returns Contact context with name, email, AUM, and notes
 *
 * @example
 * ```ts
 * const context = await readContactContext('123456');
 * console.log(context.name, context.email, context.estimatedAUM);
 * ```
 */
export async function readContactContext(contactId: string): Promise<HubSpotContactContext> {
  const accessToken = process.env.HUBSPOT_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error('HUBSPOT_ACCESS_TOKEN not configured');
  }

  const response = await fetchWithTimeout(
    `${HUBSPOT_CONTACTS_ENDPOINT}/${contactId}?properties=firstname,lastname,email,farther_estimated_aum,hs_analytics_last_url,lifecyclestage,hs_lead_status,notes_last_updated`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    },
    10_000
  );

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Contact ${contactId} not found in HubSpot`);
    }
    const errorText = await response.text();
    throw new Error(`HubSpot API error: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  const props = data.properties || {};

  return {
    name: [props.firstname, props.lastname].filter(Boolean).join(' ') || 'Unknown',
    email: props.email || '',
    estimatedAUM: props.farther_estimated_aum ? parseFloat(props.farther_estimated_aum) : undefined,
    meetingNotes: props.notes_last_updated || undefined,
    lifecycleStage: props.lifecyclestage || undefined,
  };
}
