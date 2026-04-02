// =============================================================================
// Rollover Engine — Score Service Tests
// =============================================================================

import { describe, it, expect } from 'vitest';
import type { AuthContext } from '@/lib/tax-planning/rbac';
import { store } from '@/lib/tax-planning/store';
import { createAnalysis } from '../analysis-service';
import { scoreAnalysis, getScore } from '../scoring/score-service';
import type { CreateAnalysisInput } from '../schemas';

function makeAuth(role: 'ADMIN' | 'ADVISOR' | 'CLIENT' = 'ADVISOR'): AuthContext {
  return {
    userId: 'user-002',
    firmId: 'firm-001',
    role,
    email: 'advisor@farther.com',
  };
}

const validInput: CreateAnalysisInput = {
  household_id: 'hh-001',
  client_name: 'Score Test Client',
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

describe('scoreAnalysis', () => {
  it('scores an analysis and returns all 10 factors', () => {
    const auth = makeAuth();
    const analysis = createAnalysis(validInput, auth);
    const score = scoreAnalysis(analysis.analysis_id, auth);

    expect(score.score_id).toMatch(/^rs-/);
    expect(score.analysis_id).toBe(analysis.analysis_id);
    expect(score.composite_score).toBeGreaterThanOrEqual(0);
    expect(score.composite_score).toBeLessThanOrEqual(100);
    expect(score.factor_scores).toHaveLength(10);
    expect(score.scoring_version).toBe('1.0.0');
    expect(typeof score.recommendation_tier).toBe('string');
  });

  it('updates analysis with score reference', () => {
    const auth = makeAuth();
    const analysis = createAnalysis(validInput, auth);
    const score = scoreAnalysis(analysis.analysis_id, auth);

    // Fetch updated analysis
    const updated = store.getRolloverAnalysis(analysis.analysis_id);
    expect(updated.score_id).toBe(score.score_id);
    expect(updated.composite_score).toBe(score.composite_score);
    expect(updated.recommendation_tier).toBe(score.recommendation_tier);
  });

  it('throws for missing plan', () => {
    const auth = makeAuth();
    const analysis = createAnalysis({
      ...validInput,
      plan_id: 'nonexistent-plan',
      client_name: 'No Plan Client',
    }, auth);

    expect(() => scoreAnalysis(analysis.analysis_id, auth)).toThrow('plan not found');
  });

  it('throws for CLIENT role', () => {
    const auth = makeAuth();
    const analysis = createAnalysis(validInput, auth);

    const clientAuth = makeAuth('CLIENT');
    expect(() => scoreAnalysis(analysis.analysis_id, clientAuth)).toThrow(
      'Authorization denied',
    );
  });
});

describe('getScore', () => {
  it('retrieves score after scoring', () => {
    const auth = makeAuth();
    const analysis = createAnalysis(validInput, auth);
    scoreAnalysis(analysis.analysis_id, auth);

    const score = getScore(analysis.analysis_id, auth);
    expect(score).toBeDefined();
    expect(score!.factor_scores).toHaveLength(10);
  });

  it('returns undefined when not scored', () => {
    const auth = makeAuth();
    const analysis = createAnalysis({
      ...validInput,
      client_name: 'Unscored Client',
    }, auth);

    const score = getScore(analysis.analysis_id, auth);
    expect(score).toBeUndefined();
  });
});
