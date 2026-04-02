// =============================================================================
// Rollover Engine — Schema Validation Tests
// =============================================================================

import { describe, it, expect } from 'vitest';
import {
  CreateAnalysisSchema,
  UpdateAnalysisSchema,
  PlanSearchQuerySchema,
  BenchmarkUpsertSchema,
} from '../schemas';

describe('CreateAnalysisSchema', () => {
  const validInput = {
    household_id: 'hh-001',
    client_name: 'John Smith',
    plan_id: 'plan-001',
    plan_ein: '12-3456789',
    participant_balance_cents: 25000000,
    participant_age: 55,
    years_of_service: 15,
    state_of_residence: 'AZ',
  };

  it('accepts valid input', () => {
    const result = CreateAnalysisSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it('rejects missing required fields', () => {
    const result = CreateAnalysisSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects invalid EIN format', () => {
    const result = CreateAnalysisSchema.safeParse({
      ...validInput,
      plan_ein: '123456789',
    });
    expect(result.success).toBe(false);
  });

  it('rejects age below 18', () => {
    const result = CreateAnalysisSchema.safeParse({
      ...validInput,
      participant_age: 16,
    });
    expect(result.success).toBe(false);
  });

  it('rejects negative balance', () => {
    const result = CreateAnalysisSchema.safeParse({
      ...validInput,
      participant_balance_cents: -100,
    });
    expect(result.success).toBe(false);
  });

  it('applies defaults for optional fields', () => {
    const result = CreateAnalysisSchema.safeParse(validInput);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.has_outstanding_loan).toBe(false);
      expect(result.data.has_employer_stock).toBe(false);
      expect(result.data.notes).toBe('');
    }
  });

  it('uppercases state', () => {
    const result = CreateAnalysisSchema.safeParse({
      ...validInput,
      state_of_residence: 'az',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.state_of_residence).toBe('AZ');
    }
  });
});

describe('UpdateAnalysisSchema', () => {
  it('accepts partial updates', () => {
    const result = UpdateAnalysisSchema.safeParse({ status: 'SCORING' });
    expect(result.success).toBe(true);
  });

  it('accepts empty object', () => {
    const result = UpdateAnalysisSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('rejects invalid status', () => {
    const result = UpdateAnalysisSchema.safeParse({ status: 'INVALID' });
    expect(result.success).toBe(false);
  });
});

describe('PlanSearchQuerySchema', () => {
  it('accepts valid query', () => {
    const result = PlanSearchQuerySchema.safeParse({ q: 'Acme' });
    expect(result.success).toBe(true);
  });

  it('rejects too-short query', () => {
    const result = PlanSearchQuerySchema.safeParse({ q: 'A' });
    expect(result.success).toBe(false);
  });

  it('parses limit as number', () => {
    const result = PlanSearchQuerySchema.safeParse({ q: 'Acme', limit: '10' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(10);
    }
  });
});

describe('BenchmarkUpsertSchema', () => {
  it('accepts valid benchmark', () => {
    const result = BenchmarkUpsertSchema.safeParse({
      plan_size_tier: 'MID',
      metric_name: 'total_plan_expense_bps',
      percentile_25: 35,
      percentile_50: 55,
      percentile_75: 82,
      percentile_90: 115,
      source: 'Test Source',
      as_of_date: '2025-06-30',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid date format', () => {
    const result = BenchmarkUpsertSchema.safeParse({
      plan_size_tier: 'MID',
      metric_name: 'test',
      percentile_25: 35,
      percentile_50: 55,
      percentile_75: 82,
      percentile_90: 115,
      source: 'Test',
      as_of_date: '06/30/2025',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid plan size tier', () => {
    const result = BenchmarkUpsertSchema.safeParse({
      plan_size_tier: 'GIANT',
      metric_name: 'test',
      percentile_25: 35,
      percentile_50: 55,
      percentile_75: 82,
      percentile_90: 115,
      source: 'Test',
      as_of_date: '2025-06-30',
    });
    expect(result.success).toBe(false);
  });
});
