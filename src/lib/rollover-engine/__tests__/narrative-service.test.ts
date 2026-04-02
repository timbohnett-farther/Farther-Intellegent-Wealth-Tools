// =============================================================================
// Rollover Engine — Narrative Service Tests
// =============================================================================

import { describe, it, expect } from 'vitest';
import type { AuthContext } from '@/lib/tax-planning/rbac';
import { createAnalysis } from '../analysis-service';
import { scoreAnalysis } from '../scoring/score-service';
import { generateNarrative, getNarrative } from '../narrative/narrative-service';
import type { CreateAnalysisInput } from '../schemas';

function makeAuth(): AuthContext {
  return { userId: 'user-002', firmId: 'firm-001', role: 'ADVISOR', email: 'advisor@farther.com' };
}

const validInput: CreateAnalysisInput = {
  household_id: 'hh-001',
  client_name: 'Narrative Test Client',
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

describe('generateNarrative', () => {
  it('generates narrative for scored analysis', async () => {
    const auth = makeAuth();
    const analysis = createAnalysis(validInput, auth);
    scoreAnalysis(analysis.analysis_id, auth);

    const narrative = await generateNarrative(analysis.analysis_id, auth);
    expect(narrative.narrative_id).toMatch(/^rn-/);
    expect(narrative.executive_summary.length).toBeGreaterThan(10);
    expect(narrative.recommendation_text.length).toBeGreaterThan(10);
    expect(narrative.regulatory_citations.length).toBeGreaterThan(0);
    expect(narrative.disclaimers.length).toBeGreaterThan(0);
  });

  it('throws for unscored analysis', async () => {
    const auth = makeAuth();
    const analysis = createAnalysis({ ...validInput, client_name: 'Unscored Narr' }, auth);

    await expect(generateNarrative(analysis.analysis_id, auth)).rejects.toThrow('must be scored');
  });
});

describe('getNarrative', () => {
  it('retrieves narrative after generation', async () => {
    const auth = makeAuth();
    const analysis = createAnalysis({ ...validInput, client_name: 'Get Narr Client' }, auth);
    scoreAnalysis(analysis.analysis_id, auth);
    await generateNarrative(analysis.analysis_id, auth);

    const narrative = getNarrative(analysis.analysis_id, auth);
    expect(narrative).toBeDefined();
    expect(narrative!.template).toBe('STANDARD');
  });

  it('returns undefined when no narrative', () => {
    const auth = makeAuth();
    const analysis = createAnalysis({ ...validInput, client_name: 'No Narr Client' }, auth);

    const narrative = getNarrative(analysis.analysis_id, auth);
    expect(narrative).toBeUndefined();
  });
});
