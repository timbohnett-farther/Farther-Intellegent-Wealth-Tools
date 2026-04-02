// =============================================================================
// Rollover Engine — HubSpot Deal Service (Mock)
// =============================================================================

import { store } from '@/lib/tax-planning/store';
import { hasPermission, type AuthContext } from '@/lib/tax-planning/rbac';
import { auditService } from '@/lib/tax-planning/audit';
import type { HubSpotDealSync, AmountCents } from '../types';
import { ROLLOVER_DEAL_PROPERTIES } from './hubspot-properties';

/**
 * Creates or updates a HubSpot deal for a rollover analysis.
 * Mock implementation — builds the deal payload but doesn't call HubSpot API.
 */
export async function syncToHubSpot(
  analysisId: string,
  auth: AuthContext,
  ip?: string,
): Promise<HubSpotDealSync> {
  if (!hasPermission(auth.role, 'rollover:write')) {
    throw new Error('Authorization denied: role does not have rollover:write permission.');
  }

  const analysis = store.getRolloverAnalysis(analysisId);
  if (!analysis) throw new Error(`Rollover analysis not found: ${analysisId}`);
  if (analysis.firm_id !== auth.firmId) throw new Error(`Rollover analysis not found: ${analysisId}`);

  const score = store.getRolloverScoreByAnalysis(analysisId);

  const now = new Date().toISOString();
  const syncId = `hs-${crypto.randomUUID().slice(0, 8)}`;
  const existingSync = store.getHubSpotDealSyncByAnalysis(analysisId);

  // Build deal properties
  const properties: Record<string, unknown> = {
    dealname: `Rollover: ${analysis.client_name} — ${analysis.plan_name}`,
    amount: analysis.participant_balance_cents / 100,
    pipeline: 'rollover',
    dealstage: mapStatusToDealStage(analysis.status),
    [ROLLOVER_DEAL_PROPERTIES.rollover_analysis_id.name]: analysis.analysis_id,
    [ROLLOVER_DEAL_PROPERTIES.rollover_plan_name.name]: analysis.plan_name,
    [ROLLOVER_DEAL_PROPERTIES.rollover_plan_ein.name]: analysis.plan_ein,
    [ROLLOVER_DEAL_PROPERTIES.rollover_balance.name]: analysis.participant_balance_cents / 100,
  };

  if (score) {
    properties[ROLLOVER_DEAL_PROPERTIES.rollover_rrs_score.name] = score.composite_score;
    properties[ROLLOVER_DEAL_PROPERTIES.rollover_recommendation.name] = score.recommendation_tier;
  }

  if (analysis.report_id) {
    properties[ROLLOVER_DEAL_PROPERTIES.rollover_report_generated.name] = true;
  }

  // Mock: generate a fake HubSpot deal ID
  const hubspotDealId = existingSync?.hubspot_deal_id ?? `hs-deal-${Date.now()}`;

  const sync: HubSpotDealSync = {
    sync_id: syncId,
    analysis_id: analysisId,
    hubspot_deal_id: hubspotDealId,
    deal_amount_cents: analysis.participant_balance_cents,
    deal_stage: mapStatusToDealStage(analysis.status),
    properties_synced: Object.keys(properties),
    report_attached: !!analysis.report_id,
    last_synced_at: now,
    sync_status: 'SYNCED',
  };

  store.upsertHubSpotDealSync(sync);

  // Update analysis with HubSpot deal ID
  store.upsertRolloverAnalysis({
    ...analysis,
    hubspot_deal_id: hubspotDealId,
    updated_at: now,
    last_modified_by: auth.userId,
  });

  auditService.emit({
    firmId: auth.firmId,
    userId: auth.userId,
    eventKey: 'rollover.hubspot.synced',
    ip,
    payload: { analysisId, syncId, hubspotDealId },
  });

  return sync;
}

/**
 * Gets the HubSpot sync status for an analysis.
 */
export function getHubSpotSync(
  analysisId: string,
  auth: AuthContext,
): HubSpotDealSync | undefined {
  if (!hasPermission(auth.role, 'rollover:read')) {
    throw new Error('Authorization denied.');
  }
  return store.getHubSpotDealSyncByAnalysis(analysisId);
}

function mapStatusToDealStage(status: string): string {
  switch (status) {
    case 'DRAFT':
    case 'DATA_COLLECTION':
      return 'qualification';
    case 'SCRAPING':
    case 'SCORING':
      return 'analysis';
    case 'NARRATIVE_GENERATION':
    case 'REVIEW':
      return 'proposal';
    case 'APPROVED':
      return 'decision_maker_bought_in';
    case 'DELIVERED':
      return 'closed_won';
    case 'ARCHIVED':
      return 'closed_lost';
    default:
      return 'qualification';
  }
}
