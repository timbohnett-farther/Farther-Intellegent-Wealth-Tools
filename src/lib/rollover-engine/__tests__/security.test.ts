// =============================================================================
// Rollover Engine — Security Tests
// =============================================================================

import { describe, it, expect } from 'vitest';
import type { AuthContext } from '@/lib/tax-planning/rbac';
import { createAnalysis, getAnalysis, deleteAnalysis } from '../analysis-service';
import { scoreAnalysis } from '../scoring/score-service';
import { getEngineStats } from '../admin-service';
import type { CreateAnalysisInput } from '../schemas';

const validInput: CreateAnalysisInput = {
  household_id: 'hh-001',
  client_name: 'Security Test Client',
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

describe('RBAC enforcement', () => {
  it('CLIENT cannot create analyses', () => {
    const auth: AuthContext = { userId: 'u-client', firmId: 'firm-001', role: 'CLIENT', email: 'c@test.com' };
    expect(() => createAnalysis(validInput, auth)).toThrow('Authorization denied');
  });

  it('READONLY can read but not write', () => {
    const writeAuth: AuthContext = { userId: 'u-adv', firmId: 'firm-001', role: 'ADVISOR', email: 'a@test.com' };
    const created = createAnalysis(validInput, writeAuth);

    const readAuth: AuthContext = { userId: 'u-read', firmId: 'firm-001', role: 'READONLY', email: 'r@test.com' };
    // Can read
    const found = getAnalysis(created.analysis_id, readAuth);
    expect(found).toBeDefined();

    // Cannot score
    expect(() => scoreAnalysis(created.analysis_id, readAuth)).toThrow('Authorization denied');
  });

  it('ADVISOR cannot access admin stats', () => {
    const auth: AuthContext = { userId: 'u-adv', firmId: 'firm-001', role: 'ADVISOR', email: 'a@test.com' };
    expect(() => getEngineStats(auth)).toThrow('Authorization denied');
  });

  it('ADMIN can access admin stats', () => {
    const auth: AuthContext = { userId: 'u-admin', firmId: 'firm-001', role: 'ADMIN', email: 'admin@test.com' };
    const stats = getEngineStats(auth);
    expect(stats.total_plans).toBeGreaterThan(0);
  });
});

describe('Firm scoping', () => {
  it('prevents cross-firm access', () => {
    const auth1: AuthContext = { userId: 'u-1', firmId: 'firm-001', role: 'ADVISOR', email: 'a@test.com' };
    const created = createAnalysis(validInput, auth1);

    const auth2: AuthContext = { userId: 'u-2', firmId: 'firm-999', role: 'ADMIN', email: 'b@test.com' };
    expect(() => getAnalysis(created.analysis_id, auth2)).toThrow('not found');
  });

  it('prevents cross-firm deletion', () => {
    const auth1: AuthContext = { userId: 'u-1', firmId: 'firm-001', role: 'ADVISOR', email: 'a@test.com' };
    const created = createAnalysis(validInput, auth1);

    const auth2: AuthContext = { userId: 'u-2', firmId: 'firm-999', role: 'ADMIN', email: 'b@test.com' };
    expect(() => deleteAnalysis(created.analysis_id, auth2)).toThrow('not found');
  });
});
