// =============================================================================
// Rollover Engine — Benchmark Database
// =============================================================================

import { store } from '@/lib/tax-planning/store';
import { seedRolloverData } from '../seed';
import type { BenchmarkEntry, PlanSizeTier, BasisPoints } from '../types';

// Ensure benchmarks are loaded
seedRolloverData();

/**
 * Gets benchmark data for a specific plan size tier and metric.
 */
export function getBenchmark(
  tier: PlanSizeTier,
  metricName: string = 'total_plan_expense_bps',
): BenchmarkEntry | undefined {
  const benchmarks = store.listRolloverBenchmarks({
    planSizeTier: tier,
    metricName,
  });
  return benchmarks.length > 0 ? benchmarks[0] : undefined;
}

/**
 * Gets all benchmarks for a tier.
 */
export function getBenchmarksByTier(tier: PlanSizeTier): BenchmarkEntry[] {
  return store.listRolloverBenchmarks({ planSizeTier: tier });
}

/**
 * Calculates the percentile ranking of a fee within its tier.
 * Returns a value 0-100 where 100 = lowest fees (best).
 *
 * Interpolates between known percentiles (25th, 50th, 75th, 90th).
 */
export function calculateFeePercentile(
  feeBps: number,
  tier: PlanSizeTier,
  metricName: string = 'total_plan_expense_bps',
): number {
  const benchmark = getBenchmark(tier, metricName);
  if (!benchmark) return 50; // Default to median if no data

  const { percentile_25, percentile_50, percentile_75, percentile_90 } = benchmark;

  // Lower fee = better percentile (inverted: percentile 100 = cheapest)
  if (feeBps <= percentile_25) {
    // Better than 75th percentile
    const ratio = percentile_25 > 0 ? feeBps / percentile_25 : 0;
    return 75 + (1 - ratio) * 25;
  }
  if (feeBps <= percentile_50) {
    // Between 50th and 75th percentile
    const range = percentile_50 - percentile_25;
    const position = range > 0 ? (feeBps - percentile_25) / range : 0;
    return 75 - position * 25;
  }
  if (feeBps <= percentile_75) {
    // Between 25th and 50th percentile
    const range = percentile_75 - percentile_50;
    const position = range > 0 ? (feeBps - percentile_50) / range : 0;
    return 50 - position * 25;
  }
  if (feeBps <= percentile_90) {
    // Between 10th and 25th percentile
    const range = percentile_90 - percentile_75;
    const position = range > 0 ? (feeBps - percentile_75) / range : 0;
    return 25 - position * 15;
  }

  // Worse than 90th percentile (top 10% most expensive)
  return Math.max(0, 10 - ((feeBps - percentile_90) / percentile_90) * 10);
}

/**
 * Compares plan fees to Farther IRA fees and peer benchmarks.
 * Returns a comparison summary.
 */
export function compareFees(
  planFeeBps: number,
  fartherFeeBps: number,
  tier: PlanSizeTier,
): FeeComparison {
  const planPercentile = calculateFeePercentile(planFeeBps, tier);
  const fartherPercentile = calculateFeePercentile(fartherFeeBps, tier);
  const benchmark = getBenchmark(tier);

  const feeDifferenceBps = planFeeBps - fartherFeeBps;
  const direction: 'FARTHER_CHEAPER' | 'PLAN_CHEAPER' | 'EQUAL' =
    feeDifferenceBps > 5 ? 'FARTHER_CHEAPER' :
    feeDifferenceBps < -5 ? 'PLAN_CHEAPER' : 'EQUAL';

  return {
    plan_fee_bps: planFeeBps,
    farther_fee_bps: fartherFeeBps,
    fee_difference_bps: feeDifferenceBps,
    direction,
    plan_percentile: Math.round(planPercentile),
    farther_percentile: Math.round(fartherPercentile),
    peer_median_bps: benchmark?.percentile_50 ?? 0,
    tier,
  };
}

export interface FeeComparison {
  plan_fee_bps: number;
  farther_fee_bps: number;
  fee_difference_bps: number;
  direction: 'FARTHER_CHEAPER' | 'PLAN_CHEAPER' | 'EQUAL';
  plan_percentile: number;
  farther_percentile: number;
  peer_median_bps: number;
  tier: PlanSizeTier;
}
