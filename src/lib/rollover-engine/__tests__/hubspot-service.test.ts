// =============================================================================
// Rollover Engine — HubSpot Service Tests
// =============================================================================

import { describe, it, expect } from 'vitest';
import type { AuthContext } from '@/lib/tax-planning/rbac';
import { createAnalysis } from '../analysis-service';
import { syncToHubSpot, getHubSpotSync } from '../hubspot/hubspot-service';
import type { CreateAnalysisInput } from '../schemas';

function makeAuth(): AuthContext {
  return { userId: 'user-002', firmId: 'firm-001', role: 'ADVISOR', email: 'advisor@farther.com' };
}

const validInput: CreateAnalysisInput = {
  household_id: 'hh-001',
  client_name: 'HubSpot Test Client',
  plan_id: 'plan-001',
  participant_balance_cents: 25000000,
  participant_age: 55,
  years_of_service: 15,
  state_of_residence: 'AZ',
  has_outstanding_loan: false,
  outstanding_loan_cents: 0,
  has_employer_stock: false,
  employer_stock_cost_basis_cents: 0,
  notes: '',
};

describe('syncToHubSpot', () => {
  it('creates a HubSpot deal sync', async () => {
    const auth = makeAuth();
    const analysis = createAnalysis(validInput, auth);

    const sync = await syncToHubSpot(analysis.analysis_id, auth);
    expect(sync.sync_id).toMatch(/^hs-/);
    expect(sync.hubspot_deal_id).toMatch(/^hs-deal-/);
    expect(sync.sync_status).toBe('SYNCED');
    expect(sync.deal_amount_cents).toBe(25000000);
    expect(sync.properties_synced.length).toBeGreaterThan(0);
  });

  it('updates existing sync on re-sync', async () => {
    const auth = makeAuth();
    const analysis = createAnalysis({ ...validInput, client_name: 'Resync Client' }, auth);

    const sync1 = await syncToHubSpot(analysis.analysis_id, auth);
    const sync2 = await syncToHubSpot(analysis.analysis_id, auth);

    // Same deal ID should be preserved
    expect(sync2.hubspot_deal_id).toBe(sync1.hubspot_deal_id);
  });
});

describe('getHubSpotSync', () => {
  it('returns sync after creation', async () => {
    const auth = makeAuth();
    const analysis = createAnalysis({ ...validInput, client_name: 'Get Sync Client' }, auth);
    await syncToHubSpot(analysis.analysis_id, auth);

    const sync = getHubSpotSync(analysis.analysis_id, auth);
    expect(sync).toBeDefined();
    expect(sync!.sync_status).toBe('SYNCED');
  });

  it('returns undefined when not synced', () => {
    const auth = makeAuth();
    const analysis = createAnalysis({ ...validInput, client_name: 'No Sync Client' }, auth);

    const sync = getHubSpotSync(analysis.analysis_id, auth);
    expect(sync).toBeUndefined();
  });
});
