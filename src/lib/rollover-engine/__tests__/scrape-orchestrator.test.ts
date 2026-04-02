// =============================================================================
// Rollover Engine — Scrape Orchestrator Tests
// =============================================================================

import { describe, it, expect } from 'vitest';
import { initiateScrape, getScrapeJobStatus, listScrapeJobs } from '../scraper/scrape-orchestrator';

describe('initiateScrape', () => {
  it('completes with all sources for known EIN', async () => {
    const job = await initiateScrape('test-analysis-1', {
      ein: '12-3456789',
      sources: ['DOL_EFAST', 'PROVIDER_PORTAL', 'BENCHMARK_SERVICE'],
    });

    expect(job.job_id).toMatch(/^scrape-/);
    expect(job.status).toBe('COMPLETED');
    expect(job.sources_succeeded).toContain('DOL_EFAST');
    expect(job.sources_succeeded).toContain('PROVIDER_PORTAL');
    expect(job.sources_succeeded).toContain('BENCHMARK_SERVICE');
    expect(job.data_points_extracted).toBeGreaterThan(0);
    expect(job.completed_at).toBeDefined();
  });

  it('fails for unknown EIN', async () => {
    const job = await initiateScrape('test-analysis-2', {
      ein: '00-0000000',
      sources: ['DOL_EFAST'],
    });

    expect(job.status).toBe('FAILED');
    expect(job.sources_succeeded).toHaveLength(0);
    expect(job.error_message).toBeDefined();
  });

  it('handles partial success', async () => {
    const job = await initiateScrape('test-analysis-3', {
      ein: '12-3456789',
      sources: ['DOL_EFAST', 'PROVIDER_PORTAL'],
    });

    // Both should succeed for known EIN
    expect(['COMPLETED', 'PARTIAL']).toContain(job.status);
    expect(job.sources_succeeded.length).toBeGreaterThan(0);
  });
});

describe('getScrapeJobStatus', () => {
  it('returns job by ID after scrape', async () => {
    const job = await initiateScrape('test-analysis-4', {
      ein: '12-3456789',
      sources: ['DOL_EFAST'],
    });

    const retrieved = getScrapeJobStatus(job.job_id);
    expect(retrieved).toBeDefined();
    expect(retrieved!.job_id).toBe(job.job_id);
    expect(retrieved!.status).toBe('COMPLETED');
  });

  it('returns undefined for unknown ID', () => {
    const result = getScrapeJobStatus('nonexistent');
    expect(result).toBeUndefined();
  });
});

describe('listScrapeJobs', () => {
  it('lists jobs for analysis', async () => {
    await initiateScrape('test-analysis-5', {
      ein: '12-3456789',
      sources: ['DOL_EFAST'],
    });

    const jobs = listScrapeJobs('test-analysis-5');
    expect(jobs.length).toBeGreaterThanOrEqual(1);
    expect(jobs[0].analysis_id).toBe('test-analysis-5');
  });
});
