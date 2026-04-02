// =============================================================================
// Rollover Engine — Admin Service Tests
// =============================================================================

import { describe, it, expect } from 'vitest';
import type { AuthContext } from '@/lib/tax-planning/rbac';
import { createAnalysis } from '../analysis-service';
import { getEngineStats } from '../admin-service';
import type { CreateAnalysisInput } from '../schemas';

function makeAuth(role: 'ADMIN' | 'ADVISOR' = 'ADMIN'): AuthContext {
  return { userId: 'user-001', firmId: 'firm-001', role, email: 'admin@farther.com' };
}

const validInput: CreateAnalysisInput = {
  household_id: 'hh-001',
  client_name: 'Admin Test Client',
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

describe('getEngineStats', () => {
  it('returns stats for admin', () => {
    const auth = makeAuth();
    createAnalysis(validInput, auth);

    const stats = getEngineStats(auth);
    expect(stats.total_analyses).toBeGreaterThanOrEqual(1);
    expect(stats.total_plans).toBeGreaterThan(0);
    expect(stats.total_benchmarks).toBeGreaterThan(0);
    expect(typeof stats.by_status).toBe('object');
  });

  it('throws for non-admin', () => {
    const advisorAuth = makeAuth('ADVISOR');
    expect(() => getEngineStats(advisorAuth)).toThrow('Authorization denied');
  });

  it('includes recommendation distribution', () => {
    const auth = makeAuth();
    const stats = getEngineStats(auth);
    expect(typeof stats.recommendation_distribution).toBe('object');
  });
});
