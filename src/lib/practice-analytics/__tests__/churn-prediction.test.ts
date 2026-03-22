/**
 * FP-Pulse — Churn Prediction Tests
 *
 * Comprehensive tests for the client churn prediction module covering:
 * - Churn signal generation and distribution
 * - Risk level classification
 * - Top risk factor identification
 * - Intervention recommendation
 * - Churn summary computation
 * - BigQuery SQL constant validation
 */

import { describe, it, expect } from 'vitest';
import {
  generateChurnSignals,
  classifyChurnRisk,
  getTopRiskFactors,
  recommendIntervention,
  getChurnSummary,
  CHURN_SCORING_SQL,
  CHURN_FEATURES_VIEW_SQL,
} from '../churn-prediction';
import { firmId } from '../types';

// =============================================================================
// Helpers
// =============================================================================

const DEMO_FIRM_ID = firmId('firm-001');

// =============================================================================
// generateChurnSignals
// =============================================================================

describe('generateChurnSignals', () => {
  it('returns an array of churn signals', () => {
    const signals = generateChurnSignals(DEMO_FIRM_ID);
    expect(Array.isArray(signals)).toBe(true);
    expect(signals.length).toBeGreaterThan(0);
  });

  it('each signal has required fields', () => {
    const signals = generateChurnSignals(DEMO_FIRM_ID);
    for (const signal of signals) {
      expect(signal).toHaveProperty('householdId');
      expect(signal).toHaveProperty('advisorId');
      expect(signal).toHaveProperty('churnRiskScore');
      expect(signal).toHaveProperty('churnRiskLabel');
      expect(signal).toHaveProperty('topRiskFactors');
      expect(signal).toHaveProperty('recommendedAction');
      expect(signal).toHaveProperty('aum');
      expect(signal).toHaveProperty('annualRevenueAtRisk');
    }
  });

  it('has realistic distribution of risk labels', () => {
    const signals = generateChurnSignals(DEMO_FIRM_ID);
    const labels = signals.map((s) => s.churnRiskLabel);
    const uniqueLabels = new Set(labels);
    // Should have at least 2 different risk labels in the demo data
    expect(uniqueLabels.size).toBeGreaterThanOrEqual(2);
  });

  it('churn risk scores are between 0 and 100', () => {
    const signals = generateChurnSignals(DEMO_FIRM_ID);
    for (const signal of signals) {
      expect(signal.churnRiskScore).toBeGreaterThanOrEqual(0);
      expect(signal.churnRiskScore).toBeLessThanOrEqual(100);
    }
  });

  it('each signal has positive AUM', () => {
    const signals = generateChurnSignals(DEMO_FIRM_ID);
    for (const signal of signals) {
      expect(signal.aum).toBeGreaterThan(0);
    }
  });

  it('each signal has non-negative annual revenue at risk', () => {
    const signals = generateChurnSignals(DEMO_FIRM_ID);
    for (const signal of signals) {
      expect(signal.annualRevenueAtRisk).toBeGreaterThanOrEqual(0);
    }
  });

  it('each signal has topRiskFactors as an array', () => {
    const signals = generateChurnSignals(DEMO_FIRM_ID);
    for (const signal of signals) {
      expect(Array.isArray(signal.topRiskFactors)).toBe(true);
    }
  });
});

// =============================================================================
// classifyChurnRisk
// =============================================================================

describe('classifyChurnRisk', () => {
  it('classifies score >= 70 as critical', () => {
    expect(classifyChurnRisk(70)).toBe('critical');
    expect(classifyChurnRisk(85)).toBe('critical');
    expect(classifyChurnRisk(100)).toBe('critical');
  });

  it('classifies score >= 45 and < 70 as elevated', () => {
    expect(classifyChurnRisk(45)).toBe('elevated');
    expect(classifyChurnRisk(55)).toBe('elevated');
    expect(classifyChurnRisk(69)).toBe('elevated');
  });

  it('classifies score >= 25 and < 45 as watch', () => {
    expect(classifyChurnRisk(25)).toBe('watch');
    expect(classifyChurnRisk(35)).toBe('watch');
    expect(classifyChurnRisk(44)).toBe('watch');
  });

  it('classifies score < 25 as healthy', () => {
    expect(classifyChurnRisk(0)).toBe('healthy');
    expect(classifyChurnRisk(10)).toBe('healthy');
    expect(classifyChurnRisk(24)).toBe('healthy');
  });
});

// =============================================================================
// getTopRiskFactors
// =============================================================================

describe('getTopRiskFactors', () => {
  it('returns an array of risk factors', () => {
    const signals = generateChurnSignals(DEMO_FIRM_ID);
    if (signals.length > 0) {
      const factors = getTopRiskFactors(signals[0]);
      expect(Array.isArray(factors)).toBe(true);
    }
  });

  it('returns factors as valid ChurnRiskFactor values', () => {
    const signals = generateChurnSignals(DEMO_FIRM_ID);
    if (signals.length > 0) {
      const factors = getTopRiskFactors(signals[0]);
      const validFactors = [
        'LOW_ENGAGEMENT',
        'PLAN_HEALTH_DECLINE',
        'AUM_OUTFLOWS',
        'PORTFOLIO_DRIFT',
        'NO_RECENT_CONTACT',
        'LIFE_EVENT',
        'PROPOSAL_DECLINED',
        'LOW_PORTAL_USAGE',
      ];
      for (const factor of factors) {
        expect(validFactors).toContain(factor);
      }
    }
  });

  it('high-risk signals have risk factors', () => {
    const signals = generateChurnSignals(DEMO_FIRM_ID);
    const highRiskSignal = signals.find((s) => s.churnRiskLabel === 'critical' || s.churnRiskLabel === 'elevated');
    if (highRiskSignal) {
      const factors = getTopRiskFactors(highRiskSignal);
      expect(factors.length).toBeGreaterThan(0);
    }
  });
});

// =============================================================================
// recommendIntervention
// =============================================================================

describe('recommendIntervention', () => {
  it('returns a non-empty actionable string', () => {
    const signals = generateChurnSignals(DEMO_FIRM_ID);
    if (signals.length > 0) {
      const intervention = recommendIntervention(signals[0]);
      expect(typeof intervention).toBe('string');
      expect(intervention.length).toBeGreaterThan(0);
    }
  });

  it('returns different interventions for different risk levels', () => {
    const signals = generateChurnSignals(DEMO_FIRM_ID);
    const criticalSignal = signals.find((s) => s.churnRiskLabel === 'critical');
    const healthySignal = signals.find((s) => s.churnRiskLabel === 'healthy');
    if (criticalSignal && healthySignal) {
      const criticalIntervention = recommendIntervention(criticalSignal);
      const healthyIntervention = recommendIntervention(healthySignal);
      // Different risk levels should yield different interventions
      expect(criticalIntervention).not.toBe(healthyIntervention);
    }
  });
});

// =============================================================================
// getChurnSummary
// =============================================================================

describe('getChurnSummary', () => {
  it('returns a valid summary object', () => {
    const signals = generateChurnSignals(DEMO_FIRM_ID);
    const summary = getChurnSummary(signals);
    expect(summary).toBeDefined();
    expect(summary).toHaveProperty('total');
    expect(summary).toHaveProperty('totalAumAtRisk');
    expect(summary).toHaveProperty('totalRevenueAtRisk');
    expect(summary).toHaveProperty('critical');
    expect(summary).toHaveProperty('elevated');
    expect(summary).toHaveProperty('watch');
    expect(summary).toHaveProperty('healthy');
  });

  it('total matches signal count', () => {
    const signals = generateChurnSignals(DEMO_FIRM_ID);
    const summary = getChurnSummary(signals);
    expect(summary.total).toBe(signals.length);
  });

  it('risk level counts sum to total', () => {
    const signals = generateChurnSignals(DEMO_FIRM_ID);
    const summary = getChurnSummary(signals);
    const labelSum = summary.critical + summary.elevated + summary.watch + summary.healthy;
    expect(labelSum).toBe(summary.total);
  });

  it('totalAumAtRisk is non-negative', () => {
    const signals = generateChurnSignals(DEMO_FIRM_ID);
    const summary = getChurnSummary(signals);
    expect(summary.totalAumAtRisk).toBeGreaterThanOrEqual(0);
  });

  it('totalRevenueAtRisk is non-negative', () => {
    const signals = generateChurnSignals(DEMO_FIRM_ID);
    const summary = getChurnSummary(signals);
    expect(summary.totalRevenueAtRisk).toBeGreaterThanOrEqual(0);
  });

  it('has all risk level counts', () => {
    const signals = generateChurnSignals(DEMO_FIRM_ID);
    const summary = getChurnSummary(signals);
    expect(typeof summary.critical).toBe('number');
    expect(typeof summary.elevated).toBe('number');
    expect(typeof summary.watch).toBe('number');
    expect(typeof summary.healthy).toBe('number');
  });
});

// =============================================================================
// BigQuery SQL Constants
// =============================================================================

describe('CHURN_SCORING_SQL', () => {
  it('contains SELECT keyword', () => {
    expect(CHURN_SCORING_SQL.toUpperCase()).toContain('SELECT');
  });

  it('contains FROM keyword', () => {
    expect(CHURN_SCORING_SQL.toUpperCase()).toContain('FROM');
  });

  it('references client or household table', () => {
    const sql = CHURN_SCORING_SQL.toLowerCase();
    expect(sql.includes('client') || sql.includes('household')).toBe(true);
  });

  it('references churn or prediction in the query', () => {
    const sql = CHURN_SCORING_SQL.toLowerCase();
    expect(sql.includes('churn') || sql.includes('prediction') || sql.includes('score')).toBe(true);
  });
});

describe('CHURN_FEATURES_VIEW_SQL', () => {
  it('contains SELECT keyword', () => {
    expect(CHURN_FEATURES_VIEW_SQL.toUpperCase()).toContain('SELECT');
  });

  it('contains FROM keyword', () => {
    expect(CHURN_FEATURES_VIEW_SQL.toUpperCase()).toContain('FROM');
  });

  it('references feature or engagement table', () => {
    const sql = CHURN_FEATURES_VIEW_SQL.toLowerCase();
    expect(
      sql.includes('feature') || sql.includes('engagement') || sql.includes('activity'),
    ).toBe(true);
  });

  it('references household or churn data', () => {
    const sql = CHURN_FEATURES_VIEW_SQL.toLowerCase();
    expect(sql.includes('household') || sql.includes('churn')).toBe(true);
  });
});
