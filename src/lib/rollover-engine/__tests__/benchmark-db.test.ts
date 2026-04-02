// =============================================================================
// Rollover Engine — Benchmark DB Tests
// =============================================================================

import { describe, it, expect } from 'vitest';
import {
  getBenchmark,
  getBenchmarksByTier,
  calculateFeePercentile,
  compareFees,
} from '../benchmarks/benchmark-db';

describe('getBenchmark', () => {
  it('returns benchmark for valid tier', () => {
    const benchmark = getBenchmark('MID');
    expect(benchmark).toBeDefined();
    expect(benchmark!.plan_size_tier).toBe('MID');
    expect(benchmark!.metric_name).toBe('total_plan_expense_bps');
  });

  it('returns all 5 tiers', () => {
    const tiers = ['MICRO', 'SMALL', 'MID', 'LARGE', 'MEGA'] as const;
    for (const tier of tiers) {
      const benchmark = getBenchmark(tier);
      expect(benchmark).toBeDefined();
    }
  });
});

describe('getBenchmarksByTier', () => {
  it('returns benchmarks array for a tier', () => {
    const benchmarks = getBenchmarksByTier('SMALL');
    expect(benchmarks.length).toBeGreaterThan(0);
    expect(benchmarks.every((b) => b.plan_size_tier === 'SMALL')).toBe(true);
  });
});

describe('calculateFeePercentile', () => {
  it('returns high percentile for low fees', () => {
    // MID tier 25th percentile is 35 bps
    const percentile = calculateFeePercentile(20, 'MID');
    expect(percentile).toBeGreaterThan(75);
  });

  it('returns around 50 for median fees', () => {
    // MID tier median is 55 bps
    const percentile = calculateFeePercentile(55, 'MID');
    expect(percentile).toBeGreaterThanOrEqual(45);
    expect(percentile).toBeLessThanOrEqual(55);
  });

  it('returns low percentile for high fees', () => {
    // MID tier 90th percentile is 115 bps
    const percentile = calculateFeePercentile(150, 'MID');
    expect(percentile).toBeLessThan(15);
  });

  it('returns 50 for unknown tier', () => {
    const percentile = calculateFeePercentile(50, 'UNKNOWN' as any);
    expect(percentile).toBe(50);
  });
});

describe('compareFees', () => {
  it('identifies Farther as cheaper for high-fee plans', () => {
    const comparison = compareFees(120, 55, 'MID');
    expect(comparison.direction).toBe('FARTHER_CHEAPER');
    expect(comparison.fee_difference_bps).toBe(65);
  });

  it('identifies plan as cheaper for low-fee mega plans', () => {
    const comparison = compareFees(15, 55, 'MEGA');
    expect(comparison.direction).toBe('PLAN_CHEAPER');
    expect(comparison.fee_difference_bps).toBe(-40);
  });

  it('identifies equal when fees are close', () => {
    const comparison = compareFees(55, 55, 'MID');
    expect(comparison.direction).toBe('EQUAL');
  });

  it('includes percentile rankings', () => {
    const comparison = compareFees(85, 55, 'MID');
    expect(typeof comparison.plan_percentile).toBe('number');
    expect(typeof comparison.farther_percentile).toBe('number');
    expect(comparison.plan_percentile).toBeGreaterThanOrEqual(0);
    expect(comparison.farther_percentile).toBeGreaterThanOrEqual(0);
  });
});
