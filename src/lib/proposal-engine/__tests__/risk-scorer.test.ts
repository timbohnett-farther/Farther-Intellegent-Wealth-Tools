/**
 * Tests for proposal-engine/risk-scorer.ts
 *
 * Covers: scoreRiskProfile, scoreToAllocation, 3-dimensional scoring.
 */

import { describe, it, expect } from 'vitest';

import { scoreRiskProfile, scoreToAllocation } from '../risk-scorer';
import type { QuestionnaireResponse } from '../types';
import { cents } from '../../tax-planning/types';
import type { MoneyCents } from '../../tax-planning/types';

// =============================================================================
// Helper to build QuestionnaireResponse arrays
// =============================================================================

function makeResponses(scores: number[], weights?: number[]): QuestionnaireResponse[] {
  return scores.map((score, i) => ({
    questionId: `Q${i + 1}`,
    questionText: `Question ${i + 1}`,
    answer: String(score),
    score,
    weight: weights ? weights[i] : 1,
  }));
}

// =============================================================================
// scoreToAllocation
// =============================================================================

describe('scoreToAllocation()', () => {
  it('returns conservative allocation for low scores', () => {
    const alloc = scoreToAllocation(10);
    expect(alloc.equity).toBeLessThanOrEqual(30);
    expect(alloc.fixedIncome).toBeGreaterThanOrEqual(50);
    expect(alloc.equity + alloc.fixedIncome + alloc.alternatives + alloc.cash).toBe(100);
  });

  it('returns aggressive allocation for high scores', () => {
    const alloc = scoreToAllocation(90);
    expect(alloc.equity).toBeGreaterThanOrEqual(70);
    expect(alloc.fixedIncome).toBeLessThanOrEqual(20);
  });

  it('returns moderate allocation for score 50', () => {
    const alloc = scoreToAllocation(50);
    expect(alloc.equity).toBeGreaterThan(40);
    expect(alloc.equity).toBeLessThan(70);
  });

  it('allocations always sum to 100', () => {
    for (const score of [1, 20, 40, 60, 80, 100]) {
      const alloc = scoreToAllocation(score);
      const sum = alloc.equity + alloc.fixedIncome + alloc.alternatives + alloc.cash;
      expect(sum).toBe(100);
    }
  });

  it('equity increases monotonically with score', () => {
    const scores = [10, 30, 50, 70, 90];
    const equities = scores.map((s) => scoreToAllocation(s).equity);
    for (let i = 1; i < equities.length; i++) {
      expect(equities[i]).toBeGreaterThanOrEqual(equities[i - 1]);
    }
  });
});

// =============================================================================
// scoreRiskProfile
// =============================================================================

describe('scoreRiskProfile()', () => {
  const baseParams = {
    responses: makeResponses([50, 60, 55, 45, 50, 55, 50, 60]),
    timeHorizon: 20,
    annualIncome: cents(150_000) as MoneyCents,
    portfolioValue: cents(500_000) as MoneyCents,
    emergencyFundMonths: 12,
    totalDebt: cents(100_000) as MoneyCents,
    totalAssets: cents(800_000) as MoneyCents,
    goalFundingNeeded: cents(2_000_000) as MoneyCents,
    currentSavings: cents(500_000) as MoneyCents,
    yearsToGoal: 20,
  };

  it('returns a composite score between 1 and 100', () => {
    const profile = scoreRiskProfile(baseParams);
    expect(profile.compositeScore).toBeGreaterThanOrEqual(1);
    expect(profile.compositeScore).toBeLessThanOrEqual(100);
  });

  it('returns a valid risk label', () => {
    const profile = scoreRiskProfile(baseParams);
    const validLabels = [
      'CONSERVATIVE',
      'MODERATELY_CONSERVATIVE',
      'MODERATE',
      'MODERATELY_AGGRESSIVE',
      'AGGRESSIVE',
    ];
    expect(validLabels).toContain(profile.compositeLabel);
  });

  it('returns behavioral, capacity, and required scores', () => {
    const profile = scoreRiskProfile(baseParams);
    expect(profile.behavioralScore).toBeGreaterThanOrEqual(1);
    expect(profile.behavioralScore).toBeLessThanOrEqual(100);
    expect(profile.capacityScore).toBeGreaterThanOrEqual(1);
    expect(profile.capacityScore).toBeLessThanOrEqual(100);
    expect(profile.requiredScore).toBeGreaterThanOrEqual(1);
    expect(profile.requiredScore).toBeLessThanOrEqual(100);
  });

  it('returns recommended allocation that sums to 100', () => {
    const profile = scoreRiskProfile(baseParams);
    const alloc = profile.recommendedAllocation;
    const sum = alloc.equity + alloc.fixedIncome + alloc.alternatives + alloc.cash;
    expect(sum).toBe(100);
  });

  it('aggressive responses produce higher composite score', () => {
    const conservative = scoreRiskProfile({
      ...baseParams,
      responses: makeResponses([10, 10, 10, 10, 10, 10, 10, 10]),
    });
    const aggressive = scoreRiskProfile({
      ...baseParams,
      responses: makeResponses([90, 90, 90, 90, 90, 90, 90, 90]),
    });
    expect(aggressive.compositeScore).toBeGreaterThan(conservative.compositeScore);
  });

  it('longer time horizon increases capacity score', () => {
    const shortHorizon = scoreRiskProfile({ ...baseParams, timeHorizon: 2 });
    const longHorizon = scoreRiskProfile({ ...baseParams, timeHorizon: 25 });
    expect(longHorizon.capacityScore).toBeGreaterThanOrEqual(shortHorizon.capacityScore);
  });

  it('fully funded goals produce low required score', () => {
    const fullyFunded = scoreRiskProfile({
      ...baseParams,
      goalFundingNeeded: cents(500_000) as MoneyCents,
      currentSavings: cents(600_000) as MoneyCents,
    });
    expect(fullyFunded.requiredScore).toBeLessThanOrEqual(25);
  });

  it('empty responses default to moderate behavioral score', () => {
    const profile = scoreRiskProfile({
      ...baseParams,
      responses: [],
    });
    expect(profile.behavioralScore).toBe(50);
  });

  it('returns capacity factors', () => {
    const profile = scoreRiskProfile(baseParams);
    expect(profile.capacityFactors).toBeDefined();
    expect(typeof profile.capacityFactors.timeHorizon).toBe('number');
    expect(typeof profile.capacityFactors.incomeStability).toBe('number');
    expect(typeof profile.capacityFactors.liquidityRatio).toBe('number');
    expect(typeof profile.capacityFactors.debtRatio).toBe('number');
    expect(typeof profile.capacityFactors.humanCapitalValue).toBe('number');
  });

  it('high debt ratio lowers capacity score', () => {
    const lowDebt = scoreRiskProfile({
      ...baseParams,
      totalDebt: cents(10_000) as MoneyCents,
    });
    const highDebt = scoreRiskProfile({
      ...baseParams,
      totalDebt: cents(600_000) as MoneyCents,
    });
    expect(lowDebt.capacityScore).toBeGreaterThan(highDebt.capacityScore);
  });
});
