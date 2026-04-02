// =============================================================================
// Rollover Engine — Benchmark Data Fetcher (Mock)
// =============================================================================

import { store } from '@/lib/tax-planning/store';
import type { ScrapeResult } from './types';
import type { PlanSizeTier } from '../types';

/**
 * Fetches benchmark data for a given plan size tier.
 * Mock: reads from store benchmarks.
 */
export async function fetchBenchmarkData(
  planSizeTier: PlanSizeTier,
): Promise<ScrapeResult> {
  const start = Date.now();

  await delay(100);

  const benchmarks = store.listRolloverBenchmarks({
    planSizeTier,
  });

  if (benchmarks.length === 0) {
    return {
      source: 'BENCHMARK_SERVICE',
      success: false,
      data_points: 0,
      data: {},
      error: `No benchmarks found for tier ${planSizeTier}`,
      duration_ms: Date.now() - start,
    };
  }

  return {
    source: 'BENCHMARK_SERVICE',
    success: true,
    data_points: benchmarks.length * 4, // 4 percentile values each
    data: {
      tier: planSizeTier,
      benchmarks,
    },
    duration_ms: Date.now() - start,
  };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
