// =============================================================================
// Rollover Insight Engine — Store Seeder
// =============================================================================

import { store } from '@/lib/tax-planning/store';
import { MOCK_PLANS, MOCK_BENCHMARKS } from './mock-data';

let seeded = false;

/**
 * Seeds the store with mock rollover plans and benchmarks.
 * Idempotent — only seeds once per process lifecycle.
 */
export function seedRolloverData(): void {
  if (seeded) return;

  for (const plan of MOCK_PLANS) {
    store.upsertRolloverPlan(plan);
  }

  for (const benchmark of MOCK_BENCHMARKS) {
    store.upsertRolloverBenchmark(benchmark);
  }

  seeded = true;
}
