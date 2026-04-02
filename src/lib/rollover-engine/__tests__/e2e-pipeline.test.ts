// =============================================================================
// Rollover Engine — End-to-End Pipeline Test
// =============================================================================

import { describe, it, expect } from 'vitest';
import type { AuthContext } from '@/lib/tax-planning/rbac';
import { createAnalysis, getAnalysis, listAnalyses } from '../analysis-service';
import { scoreAnalysis } from '../scoring/score-service';
import { generateNarrative } from '../narrative/narrative-service';
import { syncToHubSpot } from '../hubspot/hubspot-service';
import type { CreateAnalysisInput } from '../schemas';

function makeAuth(): AuthContext {
  return { userId: 'user-002', firmId: 'firm-001', role: 'ADVISOR', email: 'advisor@farther.com' };
}

describe('Full Pipeline E2E', () => {
  it('creates, scores, narrates, and syncs an analysis', async () => {
    const auth = makeAuth();

    // Step 1: Create analysis
    const input: CreateAnalysisInput = {
      household_id: 'hh-001',
      client_name: 'E2E Pipeline Client',
      plan_id: 'plan-004', // Small plan with high fees
      participant_balance_cents: 15000000, // $150K
      participant_age: 50,
      years_of_service: 10,
      state_of_residence: 'TX',
      has_outstanding_loan: false,
      outstanding_loan_cents: 0,
      has_employer_stock: false,
      employer_stock_cost_basis_cents: 0,
      notes: 'E2E test',
    };
    const analysis = createAnalysis(input, auth);
    expect(analysis.status).toBe('DRAFT');
    expect(analysis.analysis_id).toMatch(/^ra-/);

    // Step 2: Score
    const score = scoreAnalysis(analysis.analysis_id, auth);
    expect(score.composite_score).toBeGreaterThanOrEqual(0);
    expect(score.composite_score).toBeLessThanOrEqual(100);
    expect(score.factor_scores).toHaveLength(10);

    // High-fee small plan should favor rollover
    expect(score.composite_score).toBeGreaterThan(50);

    // Step 3: Generate narrative
    const narrative = await generateNarrative(analysis.analysis_id, auth);
    expect(narrative.executive_summary.length).toBeGreaterThan(0);
    expect(narrative.regulatory_citations.length).toBeGreaterThan(0);

    // Step 4: Sync to HubSpot
    const sync = await syncToHubSpot(analysis.analysis_id, auth);
    expect(sync.sync_status).toBe('SYNCED');
    expect(sync.deal_amount_cents).toBe(15000000);

    // Step 5: Verify final analysis state
    const final = getAnalysis(analysis.analysis_id, auth);
    expect(final.score_id).toBeDefined();
    expect(final.narrative_id).toBeDefined();
    expect(final.hubspot_deal_id).toBeDefined();
    expect(final.composite_score).toBe(score.composite_score);

    // Step 6: Verify it shows in list
    const { analyses } = listAnalyses(auth);
    const found = analyses.find((a) => a.analysis_id === analysis.analysis_id);
    expect(found).toBeDefined();
  });

  it('handles near-retirement scenario correctly', async () => {
    const auth = makeAuth();

    const analysis = createAnalysis({
      household_id: 'hh-001',
      client_name: 'Near Retirement Client',
      plan_id: 'plan-003', // Mega plan with low fees
      participant_balance_cents: 85000000, // $850K
      participant_age: 57, // Rule of 55 applies
      years_of_service: 25,
      state_of_residence: 'NY', // Limited IRA protection
      has_outstanding_loan: true,
      outstanding_loan_cents: 5000000, // $50K loan
      has_employer_stock: true,
      employer_stock_cost_basis_cents: 10000000, // $100K basis
      narrative_template: 'NEAR_RETIREMENT',
      notes: 'Near retirement with loan and stock',
    }, auth);

    const score = scoreAnalysis(analysis.analysis_id, auth);

    // Low-fee mega plan + Rule of 55 + loan + NUA should moderate rollover recommendation
    expect(score.composite_score).toBeLessThan(70);

    // Penalty-free access should favor stay (Rule of 55)
    const penaltyFactor = score.factor_scores.find((f) => f.factor_name === 'PENALTY_FREE_ACCESS');
    expect(penaltyFactor).toBeDefined();
    expect(penaltyFactor!.score).toBeLessThan(40);

    // Creditor protection should favor stay (NY)
    const creditorFactor = score.factor_scores.find((f) => f.factor_name === 'CREDITOR_PROTECTION');
    expect(creditorFactor).toBeDefined();
    expect(creditorFactor!.score).toBeLessThan(50);
  });
});
