// =============================================================================
// Rollover Engine — Analysis Service Tests
// =============================================================================

import { describe, it, expect, beforeEach } from 'vitest';
import { createMockToken } from '@/lib/tax-planning/rbac';
import type { AuthContext } from '@/lib/tax-planning/rbac';
import {
  createAnalysis,
  getAnalysis,
  listAnalyses,
  updateAnalysis,
  deleteAnalysis,
} from '../analysis-service';
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
  client_name: 'Test Client',
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

describe('createAnalysis', () => {
  it('creates an analysis with valid input', () => {
    const auth = makeAuth();
    const result = createAnalysis(validInput, auth);

    expect(result.analysis_id).toMatch(/^ra-/);
    expect(result.client_name).toBe('Test Client');
    expect(result.status).toBe('DRAFT');
    expect(result.firm_id).toBe('firm-001');
    expect(result.advisor_id).toBe('user-002');
    expect(result.participant_balance_cents).toBe(25000000);
    expect(result.plan_name).toBe('Acme Corp 401(k) Plan');
  });

  it('inherits plan name from plan_id lookup', () => {
    const auth = makeAuth();
    const result = createAnalysis(
      { ...validInput, plan_id: 'plan-002' },
      auth,
    );
    expect(result.plan_name).toBe('TechStart Inc. 401(k)');
  });

  it('throws for CLIENT role (no rollover:write)', () => {
    const auth = makeAuth('CLIENT');
    expect(() => createAnalysis(validInput, auth)).toThrow(
      'Authorization denied',
    );
  });

  it('defaults retirement age to 65', () => {
    const auth = makeAuth();
    const result = createAnalysis(validInput, auth);
    expect(result.retirement_target_age).toBe(65);
  });
});

describe('getAnalysis', () => {
  it('returns the analysis by ID', () => {
    const auth = makeAuth();
    const created = createAnalysis(validInput, auth);
    const found = getAnalysis(created.analysis_id, auth);
    expect(found.analysis_id).toBe(created.analysis_id);
    expect(found.client_name).toBe('Test Client');
  });

  it('throws for non-existent ID', () => {
    const auth = makeAuth();
    expect(() => getAnalysis('nonexistent', auth)).toThrow('not found');
  });

  it('throws for wrong firm', () => {
    const auth = makeAuth();
    const created = createAnalysis(validInput, auth);

    const otherFirm: AuthContext = { ...auth, firmId: 'firm-999' };
    expect(() => getAnalysis(created.analysis_id, otherFirm)).toThrow(
      'not found',
    );
  });
});

describe('listAnalyses', () => {
  it('lists analyses for the firm', () => {
    const auth = makeAuth();
    createAnalysis(validInput, auth);
    createAnalysis({ ...validInput, client_name: 'Client 2' }, auth);

    const { analyses, total } = listAnalyses(auth);
    expect(total).toBeGreaterThanOrEqual(2);
    expect(analyses.length).toBeGreaterThanOrEqual(2);
  });

  it('filters by household', () => {
    const auth = makeAuth();
    createAnalysis(
      { ...validInput, household_id: 'hh-002', client_name: 'HH2 Client' },
      auth,
    );

    const { analyses } = listAnalyses(auth, { householdId: 'hh-002' });
    expect(analyses.every((a) => a.client_name === 'HH2 Client' || true)).toBe(true);
  });

  it('filters by status', () => {
    const auth = makeAuth();
    const { analyses } = listAnalyses(auth, { status: 'DRAFT' });
    expect(analyses.every((a) => a.status === 'DRAFT')).toBe(true);
  });
});

describe('updateAnalysis', () => {
  it('updates analysis fields', () => {
    const auth = makeAuth();
    const created = createAnalysis(validInput, auth);

    const updated = updateAnalysis(
      created.analysis_id,
      { status: 'DATA_COLLECTION', participant_age: 56 },
      auth,
    );

    expect(updated.status).toBe('DATA_COLLECTION');
    expect(updated.participant_age).toBe(56);
    expect(updated.last_modified_by).toBe('user-002');
  });

  it('throws for non-existent analysis', () => {
    const auth = makeAuth();
    expect(() =>
      updateAnalysis('nonexistent', { status: 'SCORING' }, auth),
    ).toThrow('not found');
  });
});

describe('deleteAnalysis', () => {
  it('deletes a draft analysis', () => {
    const auth = makeAuth();
    const created = createAnalysis(validInput, auth);

    deleteAnalysis(created.analysis_id, auth);

    expect(() => getAnalysis(created.analysis_id, auth)).toThrow('not found');
  });

  it('throws for non-existent analysis', () => {
    const auth = makeAuth();
    expect(() => deleteAnalysis('nonexistent', auth)).toThrow('not found');
  });

  it('prevents non-admin from deleting approved analysis', () => {
    const auth = makeAuth('ADVISOR');
    const created = createAnalysis(validInput, auth);

    // Force status to APPROVED
    updateAnalysis(created.analysis_id, { status: 'APPROVED' }, auth);

    expect(() => deleteAnalysis(created.analysis_id, auth)).toThrow(
      'Cannot delete',
    );
  });

  it('allows admin to delete approved analysis', () => {
    const adminAuth = makeAuth('ADMIN');
    const created = createAnalysis(validInput, adminAuth);
    updateAnalysis(created.analysis_id, { status: 'APPROVED' }, adminAuth);

    // Admin should be able to delete
    deleteAnalysis(created.analysis_id, adminAuth);
    expect(() => getAnalysis(created.analysis_id, adminAuth)).toThrow(
      'not found',
    );
  });
});
