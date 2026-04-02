// =============================================================================
// Rollover Engine — Types Tests
// =============================================================================

import { describe, it, expect } from 'vitest';
import {
  isValidEIN,
  toEIN,
  toAmountCents,
  toDollars,
  toBasisPoints,
  toPercent,
  toScore,
  PlanType,
  AnalysisStatus,
  FactorName,
  RecommendationTier,
  NarrativeTemplate,
  PlanSizeTier,
} from '../types';

describe('EIN Validation', () => {
  it('accepts valid EIN format XX-XXXXXXX', () => {
    expect(isValidEIN('12-3456789')).toBe(true);
    expect(isValidEIN('00-0000000')).toBe(true);
    expect(isValidEIN('99-9999999')).toBe(true);
  });

  it('rejects invalid EIN formats', () => {
    expect(isValidEIN('123456789')).toBe(false);
    expect(isValidEIN('12-345678')).toBe(false);
    expect(isValidEIN('12-34567890')).toBe(false);
    expect(isValidEIN('AB-CDEFGHI')).toBe(false);
    expect(isValidEIN('')).toBe(false);
    expect(isValidEIN('12345-6789')).toBe(false);
  });
});

describe('Branded Primitive Helpers', () => {
  it('toAmountCents converts dollars to cents', () => {
    expect(toAmountCents(100)).toBe(10000);
    expect(toAmountCents(0.01)).toBe(1);
    expect(toAmountCents(250000.50)).toBe(25000050);
  });

  it('toDollars converts cents to dollars', () => {
    expect(toDollars(toAmountCents(100))).toBe(100);
    expect(toDollars(toAmountCents(0.01))).toBe(0.01);
  });

  it('toBasisPoints converts percent to bps', () => {
    expect(toBasisPoints(1.0)).toBe(100);
    expect(toBasisPoints(0.85)).toBe(85);
    expect(toBasisPoints(0.05)).toBe(5);
  });

  it('toPercent converts bps to percent', () => {
    expect(toPercent(toBasisPoints(1.0))).toBe(1.0);
    expect(toPercent(toBasisPoints(0.5))).toBe(0.5);
  });

  it('toScore clamps to 0-100 range', () => {
    expect(toScore(50)).toBe(50);
    expect(toScore(0)).toBe(0);
    expect(toScore(100)).toBe(100);
    expect(toScore(-10)).toBe(0);
    expect(toScore(150)).toBe(100);
    expect(toScore(72.6)).toBe(73);
  });

  it('toEIN returns branded string', () => {
    const ein = toEIN('12-3456789');
    expect(ein).toBe('12-3456789');
  });
});

describe('Enum Values', () => {
  it('PlanType has expected values', () => {
    expect(PlanType.TRADITIONAL_401K).toBe('TRADITIONAL_401K');
    expect(PlanType.ROTH_401K).toBe('ROTH_401K');
    expect(PlanType['403B']).toBe('403B');
    expect(PlanType.SEP_IRA).toBe('SEP_IRA');
    expect(Object.keys(PlanType).length).toBe(15);
  });

  it('AnalysisStatus has expected lifecycle states', () => {
    expect(AnalysisStatus.DRAFT).toBe('DRAFT');
    expect(AnalysisStatus.SCORING).toBe('SCORING');
    expect(AnalysisStatus.APPROVED).toBe('APPROVED');
    expect(AnalysisStatus.ARCHIVED).toBe('ARCHIVED');
    expect(Object.keys(AnalysisStatus).length).toBe(9);
  });

  it('FactorName has all 10 scoring factors', () => {
    expect(Object.keys(FactorName).length).toBe(10);
    expect(FactorName.FEE_COMPARISON).toBe('FEE_COMPARISON');
    expect(FactorName.EMPLOYER_STOCK_NUA).toBe('EMPLOYER_STOCK_NUA');
    expect(FactorName.SPECIAL_CIRCUMSTANCES).toBe('SPECIAL_CIRCUMSTANCES');
  });

  it('RecommendationTier has 5 tiers', () => {
    expect(Object.keys(RecommendationTier).length).toBe(5);
    expect(RecommendationTier.STRONG_ROLLOVER).toBe('STRONG_ROLLOVER');
    expect(RecommendationTier.NEUTRAL).toBe('NEUTRAL');
    expect(RecommendationTier.STRONG_STAY).toBe('STRONG_STAY');
  });

  it('NarrativeTemplate has 5 templates', () => {
    expect(Object.keys(NarrativeTemplate).length).toBe(5);
  });

  it('PlanSizeTier has 5 tiers', () => {
    expect(Object.keys(PlanSizeTier).length).toBe(5);
    expect(PlanSizeTier.MICRO).toBe('MICRO');
    expect(PlanSizeTier.MEGA).toBe('MEGA');
  });
});
