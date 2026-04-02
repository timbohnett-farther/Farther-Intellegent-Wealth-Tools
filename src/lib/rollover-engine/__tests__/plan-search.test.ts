// =============================================================================
// Rollover Engine — Plan Search Tests
// =============================================================================

import { describe, it, expect } from 'vitest';
import type { AuthContext } from '@/lib/tax-planning/rbac';
import { searchPlans, getPlanById, getPlanByEIN } from '../plan-search-service';

function makeAuth(): AuthContext {
  return {
    userId: 'user-002',
    firmId: 'firm-001',
    role: 'ADVISOR',
    email: 'advisor@farther.com',
  };
}

describe('searchPlans', () => {
  it('returns results matching plan name', () => {
    const auth = makeAuth();
    const results = searchPlans('Acme', auth);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].plan_name).toContain('Acme');
  });

  it('returns results matching sponsor name', () => {
    const auth = makeAuth();
    const results = searchPlans('TechStart', auth);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].sponsor_name).toContain('TechStart');
  });

  it('returns results matching EIN prefix', () => {
    const auth = makeAuth();
    const results = searchPlans('12-345', auth);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].ein).toBe('12-3456789');
  });

  it('returns results matching recordkeeper', () => {
    const auth = makeAuth();
    const results = searchPlans('Fidelity', auth);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].recordkeeper).toBe('Fidelity Investments');
  });

  it('returns empty for query shorter than 2 chars', () => {
    const auth = makeAuth();
    const results = searchPlans('A', auth);
    expect(results.length).toBe(0);
  });

  it('respects limit parameter', () => {
    const auth = makeAuth();
    const results = searchPlans('Plan', auth, { limit: 2 });
    expect(results.length).toBeLessThanOrEqual(2);
  });

  it('filters by plan type', () => {
    const auth = makeAuth();
    const results = searchPlans('Plan', auth, { planType: '403B' });
    for (const r of results) {
      expect(r.plan_type).toBe('403B');
    }
  });

  it('returns PlanSearchResult shape', () => {
    const auth = makeAuth();
    const results = searchPlans('Acme', auth);
    const plan = results[0];
    expect(plan).toHaveProperty('plan_id');
    expect(plan).toHaveProperty('ein');
    expect(plan).toHaveProperty('plan_name');
    expect(plan).toHaveProperty('sponsor_name');
    expect(plan).toHaveProperty('plan_type');
    expect(plan).toHaveProperty('total_assets_cents');
    expect(plan).toHaveProperty('participant_count');
    expect(plan).toHaveProperty('recordkeeper');
  });

  it('throws for unauthorized role', () => {
    const auth: AuthContext = {
      userId: 'user-x',
      firmId: 'firm-001',
      role: 'CLIENT',
      email: 'client@test.com',
    };
    expect(() => searchPlans('Acme', auth)).toThrow('Authorization denied');
  });
});

describe('getPlanById', () => {
  it('returns plan by ID', () => {
    const auth = makeAuth();
    const plan = getPlanById('plan-001', auth);
    expect(plan).toBeDefined();
    expect(plan?.plan_name).toBe('Acme Corp 401(k) Plan');
  });

  it('returns undefined for unknown ID', () => {
    const auth = makeAuth();
    const plan = getPlanById('plan-999', auth);
    expect(plan).toBeUndefined();
  });
});

describe('getPlanByEIN', () => {
  it('returns plan by EIN', () => {
    const auth = makeAuth();
    const plan = getPlanByEIN('12-3456789', auth);
    expect(plan).toBeDefined();
    expect(plan?.plan_name).toBe('Acme Corp 401(k) Plan');
  });

  it('returns undefined for invalid EIN format', () => {
    const auth = makeAuth();
    const plan = getPlanByEIN('invalid', auth);
    expect(plan).toBeUndefined();
  });

  it('returns undefined for unknown EIN', () => {
    const auth = makeAuth();
    const plan = getPlanByEIN('00-0000000', auth);
    expect(plan).toBeUndefined();
  });
});
