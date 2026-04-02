// =============================================================================
// Rollover Engine — Factor Scorers Tests
// =============================================================================

import { describe, it, expect } from 'vitest';
import {
  scoreFeeComparison,
  scoreInvestmentQuality,
  scoreInvestmentOptions,
  scoreServiceLevel,
  scorePenaltyFreeAccess,
  scoreCreditorProtection,
  scoreRMDFlexibility,
  scoreEmployerStockNUA,
  scorePlanStability,
  scoreSpecialCircumstances,
  FACTOR_SCORERS,
} from '../scoring/factor-scorers';
import type { RolloverAnalysis, RolloverPlan, AmountCents, EIN, BasisPoints } from '../types';
import { MOCK_PLANS } from '../mock-data';

function makeAnalysis(overrides?: Partial<RolloverAnalysis>): RolloverAnalysis {
  return {
    analysis_id: 'test-001',
    firm_id: 'firm-001',
    advisor_id: 'user-002',
    household_id: 'hh-001',
    client_name: 'Test Client',
    plan_id: 'plan-001',
    plan_name: 'Test Plan',
    plan_ein: '12-3456789' as EIN,
    participant_balance_cents: 25000000 as AmountCents,
    participant_age: 55,
    years_of_service: 15,
    retirement_target_age: 65,
    state_of_residence: 'AZ',
    has_outstanding_loan: false,
    outstanding_loan_cents: 0 as AmountCents,
    has_employer_stock: false,
    employer_stock_cost_basis_cents: 0 as AmountCents,
    status: 'DRAFT',
    narrative_template: 'STANDARD',
    notes: '',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    created_by: 'user-002',
    last_modified_by: 'user-002',
    ...overrides,
  };
}

const highFeePlan = MOCK_PLANS.find((p) => p.plan_id === 'plan-007')!; // 185 bps
const lowFeePlan = MOCK_PLANS.find((p) => p.plan_id === 'plan-003')!;  // 22 bps
const standardPlan = MOCK_PLANS.find((p) => p.plan_id === 'plan-001')!; // 85 bps

describe('scoreFeeComparison', () => {
  it('favors rollover for high-fee plans', () => {
    const result = scoreFeeComparison({ analysis: makeAnalysis(), plan: highFeePlan });
    expect(result.direction).toBe('FAVOR_ROLLOVER');
    expect(result.score).toBeGreaterThanOrEqual(61);
  });

  it('favors stay for low-fee mega plans', () => {
    const result = scoreFeeComparison({ analysis: makeAnalysis(), plan: lowFeePlan });
    expect(result.direction).toBe('FAVOR_STAY');
    expect(result.score).toBeLessThanOrEqual(39);
  });
});

describe('scoreInvestmentQuality', () => {
  it('returns score in valid range', () => {
    const result = scoreInvestmentQuality({ analysis: makeAnalysis(), plan: standardPlan });
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.factor_name).toBe('INVESTMENT_QUALITY');
  });
});

describe('scoreInvestmentOptions', () => {
  it('favors rollover when plan lacks brokerage window', () => {
    const noBrokeragePlan = { ...standardPlan, self_directed_brokerage: false, fund_count: 10 };
    const result = scoreInvestmentOptions({ analysis: makeAnalysis(), plan: noBrokeragePlan });
    expect(result.score).toBeGreaterThanOrEqual(50);
  });
});

describe('scoreServiceLevel', () => {
  it('generally favors rollover (Farther advantage)', () => {
    const result = scoreServiceLevel({ analysis: makeAnalysis(), plan: standardPlan });
    expect(result.direction).toBe('FAVOR_ROLLOVER');
    expect(result.score).toBeGreaterThanOrEqual(60);
  });
});

describe('scorePenaltyFreeAccess', () => {
  it('favors stay for age 55-59.5 (Rule of 55)', () => {
    const result = scorePenaltyFreeAccess({
      analysis: makeAnalysis({ participant_age: 56 }),
      plan: standardPlan,
    });
    expect(result.score).toBeLessThan(50);
  });

  it('penalizes rollover with outstanding loan', () => {
    const result = scorePenaltyFreeAccess({
      analysis: makeAnalysis({
        has_outstanding_loan: true,
        outstanding_loan_cents: 2500000 as AmountCents,
      }),
      plan: standardPlan,
    });
    expect(result.score).toBeLessThan(50);
  });

  it('is neutral for over 59.5', () => {
    const result = scorePenaltyFreeAccess({
      analysis: makeAnalysis({ participant_age: 62 }),
      plan: standardPlan,
    });
    expect(result.score).toBeGreaterThanOrEqual(40);
    expect(result.score).toBeLessThanOrEqual(60);
  });
});

describe('scoreCreditorProtection', () => {
  it('is neutral for states with unlimited IRA protection', () => {
    const result = scoreCreditorProtection({
      analysis: makeAnalysis({ state_of_residence: 'TX' }),
      plan: standardPlan,
    });
    expect(result.score).toBeGreaterThanOrEqual(40);
  });

  it('favors stay for states with limited IRA protection', () => {
    const result = scoreCreditorProtection({
      analysis: makeAnalysis({ state_of_residence: 'NY' }),
      plan: standardPlan,
    });
    expect(result.direction).toBe('FAVOR_STAY');
  });
});

describe('scoreRMDFlexibility', () => {
  it('is neutral for young participants', () => {
    const result = scoreRMDFlexibility({
      analysis: makeAnalysis({ participant_age: 45 }),
      plan: standardPlan,
    });
    expect(result.score).toBe(50);
  });

  it('favors stay for participants at RMD age', () => {
    const result = scoreRMDFlexibility({
      analysis: makeAnalysis({ participant_age: 75 }),
      plan: standardPlan,
    });
    expect(result.score).toBeLessThan(50);
  });
});

describe('scoreEmployerStockNUA', () => {
  it('is neutral when no employer stock', () => {
    const result = scoreEmployerStockNUA({
      analysis: makeAnalysis(),
      plan: standardPlan,
    });
    expect(result.direction).toBe('NEUTRAL');
    expect(result.score).toBe(50);
  });

  it('considers NUA when employer stock present', () => {
    const stockPlan = { ...standardPlan, employer_stock: true, employer_stock_pct: 25 };
    const result = scoreEmployerStockNUA({
      analysis: makeAnalysis({
        has_employer_stock: true,
        employer_stock_cost_basis_cents: 5000000 as AmountCents,
      }),
      plan: stockPlan,
    });
    expect(result.score).toBeLessThan(50);
  });
});

describe('scorePlanStability', () => {
  it('favors rollover for micro plans', () => {
    const microPlan = MOCK_PLANS.find((p) => p.plan_size_tier === 'MICRO')!;
    const result = scorePlanStability({ analysis: makeAnalysis(), plan: microPlan });
    expect(result.score).toBeGreaterThan(60);
  });

  it('is near-neutral for mega plans', () => {
    const megaPlan = MOCK_PLANS.find((p) => p.plan_size_tier === 'MEGA')!;
    const result = scorePlanStability({ analysis: makeAnalysis(), plan: megaPlan });
    expect(result.score).toBeLessThanOrEqual(55);
  });
});

describe('scoreSpecialCircumstances', () => {
  it('penalizes outstanding loan', () => {
    const result = scoreSpecialCircumstances({
      analysis: makeAnalysis({
        has_outstanding_loan: true,
        outstanding_loan_cents: 2500000 as AmountCents,
      }),
      plan: standardPlan,
    });
    expect(result.score).toBeLessThan(55);
  });
});

describe('FACTOR_SCORERS registry', () => {
  it('has all 10 factors', () => {
    expect(Object.keys(FACTOR_SCORERS)).toHaveLength(10);
  });

  it('all scorers produce valid results', () => {
    const input = { analysis: makeAnalysis(), plan: standardPlan };
    for (const [name, scorer] of Object.entries(FACTOR_SCORERS)) {
      const result = scorer(input);
      expect(result.factor_name).toBe(name);
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(['FAVOR_ROLLOVER', 'FAVOR_STAY', 'NEUTRAL']).toContain(result.direction);
      expect(typeof result.rationale).toBe('string');
    }
  });
});
