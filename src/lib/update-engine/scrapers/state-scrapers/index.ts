/**
 * Farther Prism — State Scraper Orchestrator
 *
 * Runs all registered state tax scrapers in parallel and aggregates
 * results into a single SourceCheckResult. Only key states with
 * significant HNW/UHNW client populations have dedicated scrapers;
 * other states return empty change sets by default.
 *
 * This module does not depend on React, Next.js, or Prisma.
 */

import type {
  ChangeItem,
  SourceCheckResult,
} from '../../types';

import { runCaliforniaScraper } from './california';
import { runNewYorkScraper } from './new-york';
import { runMassachusettsScraper } from './massachusetts';
import { runFloridaScraper } from './florida';
import { runTexasScraper } from './texas';
import { runIllinoisScraper } from './illinois';

// ==================== REGISTRY ====================

/**
 * Maps two-letter state abbreviations to their scraper functions.
 * Only states with dedicated scrapers are listed here. States not
 * in this registry will return empty change arrays when queried.
 *
 * To add a new state, create a scraper module under `state-scrapers/`
 * and register it here.
 */
export const STATE_SCRAPER_REGISTRY: Record<
  string,
  () => Promise<ChangeItem[]>
> = {
  CA: runCaliforniaScraper,
  NY: runNewYorkScraper,
  MA: runMassachusettsScraper,
  FL: runFloridaScraper,
  TX: runTexasScraper,
  IL: runIllinoisScraper,
  // Additional states return empty by default — add scrapers as needed:
  // AZ, CO, CT, GA, HI, MD, MN, NJ, NC, OH, OR, PA, VA, WA, etc.
};

// ==================== ORCHESTRATOR ====================

/**
 * Runs all registered state scrapers in parallel and aggregates
 * their results into a single SourceCheckResult.
 *
 * Individual state failures are captured as errors in the result
 * but do not prevent other states from completing. This ensures
 * that a temporary issue with one state's data source does not
 * block the entire state update cycle.
 *
 * @returns A SourceCheckResult aggregating all state scraper outputs.
 *
 * @example
 * ```ts
 * const result = await runAllStateScrapers();
 * console.log(`States checked: ${Object.keys(STATE_SCRAPER_REGISTRY).length}`);
 * console.log(`Changes found: ${result.changesFound.length}`);
 * if (result.errors.length > 0) {
 *   console.warn(`Errors: ${result.errors.join('; ')}`);
 * }
 * ```
 */
export async function runAllStateScrapers(): Promise<SourceCheckResult> {
  const entries = Object.entries(STATE_SCRAPER_REGISTRY);
  const allChanges: ChangeItem[] = [];
  const errors: string[] = [];

  // Run all state scrapers concurrently
  const results = await Promise.allSettled(
    entries.map(async ([state, scraperFn]) => {
      const changes = await scraperFn();
      return { state, changes };
    }),
  );

  // Aggregate results and capture any per-state errors
  for (const result of results) {
    if (result.status === 'fulfilled') {
      allChanges.push(...result.value.changes);
    } else {
      // Extract the state abbreviation from the rejection
      const errorMessage =
        result.reason instanceof Error
          ? result.reason.message
          : String(result.reason);
      errors.push(`State scraper failed: ${errorMessage}`);
    }
  }

  return {
    source: 'State Tax Authorities',
    lastChecked: new Date().toISOString(),
    changesFound: allChanges,
    errors,
  };
}

// ==================== RE-EXPORTS ====================

export { runCaliforniaScraper } from './california';
export { runNewYorkScraper } from './new-york';
export { runMassachusettsScraper } from './massachusetts';
export { runFloridaScraper } from './florida';
export { runTexasScraper } from './texas';
export { runIllinoisScraper } from './illinois';
