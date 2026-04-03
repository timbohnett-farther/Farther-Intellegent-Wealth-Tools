/**
 * SMA Ingestion Worker
 *
 * Complete pipeline for ingesting SMA strategies:
 * 1. Fetch URL as markdown (Bright Data → Tavily fallback)
 * 2. Extract structured data with MiniMax M2.7
 * 3. Upsert to fmss_sma_strategies table
 * 4. Update fmss_sma_url_manifest with content hash
 * 5. Log run to fmss_ingest_log
 *
 * Usage:
 *   const result = await ingestSMAStrategy('https://example.com/sma-factsheet.pdf');
 */

import { db } from '@/lib/db';
import {
  smaStrategies,
  smaUrlManifest,
  ingestLog,
} from '@/lib/db/schema';
import { fetchUrlAsMarkdown } from '../scraper/fetch-url-as-markdown';
import { extractSMAData, type SMAData } from '../extraction/minimax-sma-extractor';
import { eq } from 'drizzle-orm';

// Ingestion result interface
export interface SMAIngestionResult {
  success: boolean;
  strategy_id: string | null;
  url: string;
  scrape_source: 'bright_data' | 'tavily' | null;
  extraction_success: boolean;
  content_hash: string | null;
  error: string | null;
  duration_ms: number;
  tokens_used: number;
  ingestedAt: Date;
}

/**
 * Ingest a single SMA strategy from URL
 */
export async function ingestSMAStrategy(
  url: string,
  options?: {
    skip_if_unchanged?: boolean;  // Skip if content hash matches
    scrape_timeout?: number;
    extraction_model?: 'minimax-2.7' | 'minimax-2.7-highspeed';
  }
): Promise<SMAIngestionResult> {
  const startTime = Date.now();
  const {
    skip_if_unchanged = true,
    scrape_timeout = 30000,
    extraction_model = 'minimax-2.7',
  } = options || {};

  let scrapeSource: 'bright_data' | 'tavily' | null = null;
  let contentHash: string | null = null;
  let extractionSuccess = false;
  let tokensUsed = 0;
  let error: string | null = null;
  let strategyId: string | null = null;

  try {
    // Step 1: Scrape URL
    console.log(`[SMA Ingestion] Scraping ${url}...`);
    const scrapeResult = await fetchUrlAsMarkdown(url, {
      timeout: scrape_timeout,
      retries: 2,
    });

    if (!scrapeResult.success || !scrapeResult.content) {
      error = scrapeResult.error || 'Scraping failed';
      await logIngestionRun(url, false, error, Date.now() - startTime);
      return {
        success: false,
        strategy_id: null,
        url,
        scrape_source: scrapeResult.source,
        extraction_success: false,
        content_hash: null,
        error,
        duration_ms: Date.now() - startTime,
        tokens_used: 0,
        ingestedAt: new Date(),
      };
    }

    scrapeSource = scrapeResult.source;
    contentHash = scrapeResult.contentHash;

    // Step 2: Check if content unchanged (optional optimization)
    if (skip_if_unchanged && contentHash) {
      const existing = await db
        .select()
        .from(smaUrlManifest)
        .where(eq(smaUrlManifest.url, url))
        .limit(1);

      if (existing.length > 0 && existing[0].content_hash === contentHash) {
        console.log(`[SMA Ingestion] Skipping ${url} - content unchanged`);
        return {
          success: true,
          strategy_id: null,  // No direct link in current schema
          url,
          scrape_source: scrapeSource,
          extraction_success: false,
          content_hash: contentHash,
          error: 'Skipped - content unchanged',
          duration_ms: Date.now() - startTime,
          tokens_used: 0,
          ingestedAt: new Date(),
        };
      }
    }

    // Step 3: Extract structured data with MiniMax
    console.log(`[SMA Ingestion] Extracting data from ${url}...`);
    const extractionResult = await extractSMAData(
      scrapeResult.content,
      url,
      { model: extraction_model }
    );

    extractionSuccess = extractionResult.success;
    tokensUsed = extractionResult.tokensUsed || 0;

    if (!extractionResult.success || !extractionResult.data) {
      error = extractionResult.error || 'Extraction failed';
      await logIngestionRun(url, false, error, Date.now() - startTime, tokensUsed);
      return {
        success: false,
        strategy_id: null,
        url,
        scrape_source: scrapeSource,
        extraction_success: false,
        content_hash: contentHash,
        error,
        duration_ms: Date.now() - startTime,
        tokens_used: tokensUsed,
        ingestedAt: new Date(),
      };
    }

    // Step 4: Upsert to fmss_sma_strategies table
    console.log(`[SMA Ingestion] Upserting ${extractionResult.data.strategy_name}...`);
    const upsertedStrategy = await upsertSMAStrategy(extractionResult.data, contentHash);
    strategyId = upsertedStrategy.id;

    // Step 5: Update fmss_sma_url_manifest
    await upsertUrlManifest(url, extractionResult.data.manager_name, contentHash, scrapeSource);

    // Step 6: Log successful run
    await logIngestionRun(url, true, null, Date.now() - startTime, tokensUsed);

    console.log(`[SMA Ingestion] ✓ Successfully ingested ${url}`);

    return {
      success: true,
      strategy_id: strategyId,
      url,
      scrape_source: scrapeSource,
      extraction_success: true,
      content_hash: contentHash,
      error: null,
      duration_ms: Date.now() - startTime,
      tokens_used: tokensUsed,
      ingestedAt: new Date(),
    };
  } catch (err) {
    error = err instanceof Error ? err.message : 'Unknown ingestion error';
    await logIngestionRun(url, false, error, Date.now() - startTime, tokensUsed);

    return {
      success: false,
      strategy_id: null,
      url,
      scrape_source: scrapeSource,
      extraction_success: extractionSuccess,
      content_hash: contentHash,
      error,
      duration_ms: Date.now() - startTime,
      tokens_used: tokensUsed,
      ingestedAt: new Date(),
    };
  }
}

/**
 * Parse date string (YYYY-MM-DD) to Date object
 */
function parseDate(dateString: string | null): Date | null {
  if (!dateString) return null;
  try {
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
}

/**
 * Upsert SMA strategy to database
 */
async function upsertSMAStrategy(data: SMAData, contentHash: string | null) {
  const now = new Date();

  // Check if strategy exists by name + manager (natural key)
  const existing = await db
    .select()
    .from(smaStrategies)
    .where(eq(smaStrategies.strategy_name, data.strategy_name))
    .limit(1);

  if (existing.length > 0) {
    // Update existing
    const updated = await db
      .update(smaStrategies)
      .set({
        manager_name: data.manager_name,
        inception_date: parseDate(data.inception_date),
        aum_mm: data.aum_mm?.toString(),
        asset_class: data.asset_class,
        sub_strategy: data.strategy_type,  // Map strategy_type to sub_strategy
        management_fee_bps: data.management_fee_bps,
        minimum_investment: data.minimum_investment?.toString(),
        ytd_return: data.ytd_return?.toString(),
        one_year_return: data.one_year_return?.toString(),
        three_year_return: data.three_year_return?.toString(),
        five_year_return: data.five_year_return?.toString(),
        sharpe_ratio: data.sharpe_ratio?.toString(),
        sortino_ratio: data.sortino_ratio?.toString(),
        max_drawdown: data.max_drawdown?.toString(),
        volatility: data.standard_deviation?.toString(),  // Map standard_deviation to volatility
        beta: data.beta?.toString(),
        fact_sheet_url: data.source_url,
        last_extracted_at: now,
        updated_at: now,
      })
      .where(eq(smaStrategies.id, existing[0].id))
      .returning();

    return updated[0];
  } else {
    // Insert new
    const inserted = await db
      .insert(smaStrategies)
      .values({
        strategy_name: data.strategy_name,
        manager_name: data.manager_name,
        inception_date: parseDate(data.inception_date),
        aum_mm: data.aum_mm?.toString(),
        asset_class: data.asset_class,
        sub_strategy: data.strategy_type,  // Map strategy_type to sub_strategy
        management_fee_bps: data.management_fee_bps,
        minimum_investment: data.minimum_investment?.toString(),
        ytd_return: data.ytd_return?.toString(),
        one_year_return: data.one_year_return?.toString(),
        three_year_return: data.three_year_return?.toString(),
        five_year_return: data.five_year_return?.toString(),
        sharpe_ratio: data.sharpe_ratio?.toString(),
        sortino_ratio: data.sortino_ratio?.toString(),
        max_drawdown: data.max_drawdown?.toString(),
        volatility: data.standard_deviation?.toString(),  // Map standard_deviation to volatility
        beta: data.beta?.toString(),
        fact_sheet_url: data.source_url,
        last_extracted_at: now,
        created_at: now,
        updated_at: now,
      })
      .returning();

    return inserted[0];
  }
}

/**
 * Upsert URL manifest entry
 */
async function upsertUrlManifest(
  url: string,
  managerName: string,
  contentHash: string | null,
  scrapeSource: 'bright_data' | 'tavily' | null
) {
  const now = new Date();

  const existing = await db
    .select()
    .from(smaUrlManifest)
    .where(eq(smaUrlManifest.url, url))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(smaUrlManifest)
      .set({
        manager_name: managerName,
        content_hash: contentHash,
        scrape_status: 'success',
        last_scraped_at: now,
        updated_at: now,
      })
      .where(eq(smaUrlManifest.id, existing[0].id));
  } else {
    await db.insert(smaUrlManifest).values({
      url,
      manager_name: managerName,
      document_type: 'fact_sheet',
      content_hash: contentHash,
      scrape_status: 'success',
      last_scraped_at: now,
      is_active: true,
      created_at: now,
      updated_at: now,
    });
  }
}

/**
 * Log ingestion run to fmss_ingest_log
 */
async function logIngestionRun(
  url: string,
  success: boolean,
  errorMessage: string | null,
  durationMs: number,
  tokensUsed: number = 0
) {
  const startedAt = new Date(Date.now() - durationMs);
  await db.insert(ingestLog).values({
    worker_name: 'sma-ingestion-worker',
    worker_type: 'scraper',
    status: success ? 'success' : 'failed',
    records_processed: success ? 1 : 0,
    records_inserted: success ? 1 : 0,
    records_updated: 0,
    records_failed: success ? 0 : 1,
    error_message: errorMessage,
    metadata: {
      url,
      tokens_used: tokensUsed,
      duration_ms: durationMs,
      data_source: 'web_scraper',
      asset_type: 'sma',
    },
    started_at: startedAt,
    completed_at: new Date(),
  });
}

/**
 * Batch ingest multiple SMA URLs
 */
export async function batchIngestSMAStrategies(
  urls: string[],
  options?: {
    skip_if_unchanged?: boolean;
    scrape_timeout?: number;
    extraction_model?: 'minimax-2.7' | 'minimax-2.7-highspeed';
    concurrent?: number;
    delay_between_batches_ms?: number;
  }
): Promise<{
  total: number;
  successful: number;
  failed: number;
  skipped: number;
  results: SMAIngestionResult[];
}> {
  const {
    skip_if_unchanged = true,
    scrape_timeout = 30000,
    extraction_model = 'minimax-2.7',
    concurrent = 3,
    delay_between_batches_ms = 2000,
  } = options || {};

  const results: SMAIngestionResult[] = [];
  let successful = 0;
  let failed = 0;
  let skipped = 0;

  // Process in batches of `concurrent`
  for (let i = 0; i < urls.length; i += concurrent) {
    const batch = urls.slice(i, i + concurrent);
    console.log(`\n[Batch Ingestion] Processing batch ${Math.floor(i / concurrent) + 1}/${Math.ceil(urls.length / concurrent)}`);

    const batchPromises = batch.map((url) =>
      ingestSMAStrategy(url, {
        skip_if_unchanged,
        scrape_timeout,
        extraction_model,
      })
    );

    const batchResults = await Promise.allSettled(batchPromises);

    for (const result of batchResults) {
      if (result.status === 'fulfilled') {
        results.push(result.value);
        if (result.value.success) {
          if (result.value.error === 'Skipped - content unchanged') {
            skipped++;
          } else {
            successful++;
          }
        } else {
          failed++;
        }
      } else {
        // Promise rejected
        failed++;
        results.push({
          success: false,
          strategy_id: null,
          url: 'unknown',
          scrape_source: null,
          extraction_success: false,
          content_hash: null,
          error: result.reason?.message || 'Unknown error',
          duration_ms: 0,
          tokens_used: 0,
          ingestedAt: new Date(),
        });
      }
    }

    // Delay between batches to respect rate limits
    if (i + concurrent < urls.length) {
      console.log(`[Batch Ingestion] Waiting ${delay_between_batches_ms}ms before next batch...`);
      await new Promise((resolve) => setTimeout(resolve, delay_between_batches_ms));
    }
  }

  console.log(`\n[Batch Ingestion] Complete: ${successful} successful, ${failed} failed, ${skipped} skipped out of ${urls.length} total`);

  return {
    total: urls.length,
    successful,
    failed,
    skipped,
    results,
  };
}
