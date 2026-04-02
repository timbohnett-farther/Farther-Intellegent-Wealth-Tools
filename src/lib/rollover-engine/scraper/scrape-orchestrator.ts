// =============================================================================
// Rollover Engine — Scrape Pipeline Orchestrator
// =============================================================================

import { store } from '@/lib/tax-planning/store';
import type { ScrapeJob, ScrapeJobStatus, EIN } from '../types';
import type { ScrapeResult, ScrapeTarget } from './types';
import { extractPlanData } from './dol-efast';
import { scrapeProviderPortal } from './provider-portal';
import { fetchBenchmarkData } from './benchmark-fetcher';
import { seedRolloverData } from '../seed';

seedRolloverData();

/**
 * Initiates a scrape job for a rollover analysis.
 * Orchestrates multiple data sources in parallel.
 */
export async function initiateScrape(
  analysisId: string,
  target: ScrapeTarget,
): Promise<ScrapeJob> {
  const now = new Date().toISOString();
  const jobId = `scrape-${crypto.randomUUID().slice(0, 8)}`;

  const job: ScrapeJob = {
    job_id: jobId,
    analysis_id: analysisId,
    plan_ein: target.ein as EIN,
    status: 'RUNNING',
    sources_attempted: target.sources,
    sources_succeeded: [],
    data_points_extracted: 0,
    started_at: now,
  };

  store.upsertScrapeJob(job);

  // Run scrapes in parallel
  const results = await Promise.allSettled(
    target.sources.map((source) => runSource(source, target)),
  );

  let totalDataPoints = 0;
  const succeeded: string[] = [];
  const errors: string[] = [];

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    const source = target.sources[i];

    if (result.status === 'fulfilled' && result.value.success) {
      succeeded.push(source);
      totalDataPoints += result.value.data_points;
    } else {
      const error = result.status === 'rejected'
        ? result.reason?.message ?? 'Unknown error'
        : result.value.error ?? 'Unknown error';
      errors.push(`${source}: ${error}`);
    }
  }

  // Determine final status
  let status: ScrapeJobStatus;
  if (succeeded.length === target.sources.length) {
    status = 'COMPLETED';
  } else if (succeeded.length > 0) {
    status = 'PARTIAL';
  } else {
    status = 'FAILED';
  }

  const completedJob: ScrapeJob = {
    ...job,
    status,
    sources_succeeded: succeeded,
    data_points_extracted: totalDataPoints,
    error_message: errors.length > 0 ? errors.join('; ') : undefined,
    completed_at: new Date().toISOString(),
  };

  store.upsertScrapeJob(completedJob);
  return completedJob;
}

/**
 * Gets the current status of a scrape job.
 */
export function getScrapeJobStatus(jobId: string): ScrapeJob | undefined {
  return store.getScrapeJob(jobId);
}

/**
 * Lists scrape jobs for an analysis.
 */
export function listScrapeJobs(analysisId: string): ScrapeJob[] {
  return store.listScrapeJobs(analysisId);
}

// ==================== Internal Helpers ====================

async function runSource(
  source: string,
  target: ScrapeTarget,
): Promise<ScrapeResult> {
  switch (source) {
    case 'DOL_EFAST':
      return extractPlanData(target.ein);
    case 'PROVIDER_PORTAL': {
      // Look up plan_id from EIN
      const plans = store.listRolloverPlans({ ein: target.ein });
      if (plans.length === 0) {
        return {
          source: 'PROVIDER_PORTAL',
          success: false,
          data_points: 0,
          data: {},
          error: 'Plan not found',
          duration_ms: 0,
        };
      }
      return scrapeProviderPortal(plans[0].plan_id);
    }
    case 'BENCHMARK_SERVICE': {
      const plans = store.listRolloverPlans({ ein: target.ein });
      if (plans.length === 0) {
        return {
          source: 'BENCHMARK_SERVICE',
          success: false,
          data_points: 0,
          data: {},
          error: 'Plan not found for tier lookup',
          duration_ms: 0,
        };
      }
      return fetchBenchmarkData(plans[0].plan_size_tier);
    }
    default:
      return {
        source: source as any,
        success: false,
        data_points: 0,
        data: {},
        error: `Unknown source: ${source}`,
        duration_ms: 0,
      };
  }
}
