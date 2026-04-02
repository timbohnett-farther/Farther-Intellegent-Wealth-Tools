// =============================================================================
// Rollover Engine — Composite Scorer Tests
// =============================================================================

import { describe, it, expect } from 'vitest';
import { computeCompositeScore, scoreToTier, tierSummary } from '../scoring/composite-scorer';
import type { FactorScoringResult } from '../scoring/factor-scorers';
import { toScore } from '../types';

function makeResults(scores: Record<string, number>): FactorScoringResult[] {
  return Object.entries(scores).map(([name, score]) => ({
    factor_name: name as any,
    score: toScore(score),
    direction: score >= 61 ? 'FAVOR_ROLLOVER' as const : score <= 39 ? 'FAVOR_STAY' as const : 'NEUTRAL' as const,
    rationale: `Test rationale for ${name}`,
    data_points: {},
  }));
}

describe('computeCompositeScore', () => {
  it('produces a weighted average', () => {
    const results = makeResults({
      FEE_COMPARISON: 80,
      INVESTMENT_QUALITY: 70,
      INVESTMENT_OPTIONS: 60,
      SERVICE_LEVEL: 75,
      PENALTY_FREE_ACCESS: 50,
      CREDITOR_PROTECTION: 40,
      RMD_FLEXIBILITY: 50,
      EMPLOYER_STOCK_NUA: 50,
      PLAN_STABILITY: 60,
      SPECIAL_CIRCUMSTANCES: 55,
    });

    const { composite_score, recommendation_tier, factor_scores } =
      computeCompositeScore(results);

    expect(composite_score).toBeGreaterThanOrEqual(0);
    expect(composite_score).toBeLessThanOrEqual(100);
    expect(factor_scores).toHaveLength(10);
    expect(typeof recommendation_tier).toBe('string');
  });

  it('returns STRONG_ROLLOVER for high scores', () => {
    const results = makeResults({
      FEE_COMPARISON: 95,
      INVESTMENT_QUALITY: 90,
      INVESTMENT_OPTIONS: 85,
      SERVICE_LEVEL: 90,
      PENALTY_FREE_ACCESS: 80,
      CREDITOR_PROTECTION: 70,
      RMD_FLEXIBILITY: 75,
      EMPLOYER_STOCK_NUA: 80,
      PLAN_STABILITY: 85,
      SPECIAL_CIRCUMSTANCES: 80,
    });

    const { recommendation_tier } = computeCompositeScore(results);
    expect(recommendation_tier).toBe('STRONG_ROLLOVER');
  });

  it('returns STRONG_STAY for low scores', () => {
    const results = makeResults({
      FEE_COMPARISON: 10,
      INVESTMENT_QUALITY: 15,
      INVESTMENT_OPTIONS: 20,
      SERVICE_LEVEL: 25,
      PENALTY_FREE_ACCESS: 10,
      CREDITOR_PROTECTION: 15,
      RMD_FLEXIBILITY: 20,
      EMPLOYER_STOCK_NUA: 10,
      PLAN_STABILITY: 15,
      SPECIAL_CIRCUMSTANCES: 10,
    });

    const { recommendation_tier } = computeCompositeScore(results);
    expect(recommendation_tier).toBe('STRONG_STAY');
  });

  it('accepts weight overrides', () => {
    const results = makeResults({
      FEE_COMPARISON: 100,
      INVESTMENT_QUALITY: 0,
      INVESTMENT_OPTIONS: 0,
      SERVICE_LEVEL: 0,
      PENALTY_FREE_ACCESS: 0,
      CREDITOR_PROTECTION: 0,
      RMD_FLEXIBILITY: 0,
      EMPLOYER_STOCK_NUA: 0,
      PLAN_STABILITY: 0,
      SPECIAL_CIRCUMSTANCES: 0,
    });

    // Override FEE_COMPARISON to be the only weight
    const { composite_score } = computeCompositeScore(results, {
      FEE_COMPARISON: 1.0,
      INVESTMENT_QUALITY: 0,
      INVESTMENT_OPTIONS: 0,
      SERVICE_LEVEL: 0,
      PENALTY_FREE_ACCESS: 0,
      CREDITOR_PROTECTION: 0,
      RMD_FLEXIBILITY: 0,
      EMPLOYER_STOCK_NUA: 0,
      PLAN_STABILITY: 0,
      SPECIAL_CIRCUMSTANCES: 0,
    });

    expect(composite_score).toBe(100);
  });

  it('factor scores include weight info', () => {
    const results = makeResults({ FEE_COMPARISON: 80 });
    // Only 1 factor — but computeCompositeScore normalizes
    const { factor_scores } = computeCompositeScore(results);
    const fee = factor_scores.find((f) => f.factor_name === 'FEE_COMPARISON');
    expect(fee).toBeDefined();
    expect(fee!.weight).toBeGreaterThan(0);
    expect(fee!.weighted_score).toBeGreaterThan(0);
  });
});

describe('scoreToTier', () => {
  it('maps scores to correct tiers', () => {
    expect(scoreToTier(90)).toBe('STRONG_ROLLOVER');
    expect(scoreToTier(80)).toBe('STRONG_ROLLOVER');
    expect(scoreToTier(70)).toBe('MODERATE_ROLLOVER');
    expect(scoreToTier(61)).toBe('MODERATE_ROLLOVER');
    expect(scoreToTier(50)).toBe('NEUTRAL');
    expect(scoreToTier(40)).toBe('NEUTRAL');
    expect(scoreToTier(30)).toBe('MODERATE_STAY');
    expect(scoreToTier(21)).toBe('MODERATE_STAY');
    expect(scoreToTier(10)).toBe('STRONG_STAY');
    expect(scoreToTier(0)).toBe('STRONG_STAY');
  });
});

describe('tierSummary', () => {
  it('returns non-empty strings for all tiers', () => {
    const tiers = ['STRONG_ROLLOVER', 'MODERATE_ROLLOVER', 'NEUTRAL', 'MODERATE_STAY', 'STRONG_STAY'] as const;
    for (const tier of tiers) {
      const summary = tierSummary(tier);
      expect(summary.length).toBeGreaterThan(10);
    }
  });
});
