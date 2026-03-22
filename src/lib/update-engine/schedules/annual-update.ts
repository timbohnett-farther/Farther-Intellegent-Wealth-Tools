// Annual Update — triggered by IRS Rev Proc publication (typically October/November).
// Full annual table rebuild. ALWAYS requires human review.

import type { ChangeItem, SourceCheckResult, UpdateRunResult } from '../types';
import { runIRSScraper } from '../scrapers/irs-scraper';
import { runSSAScraper } from '../scrapers/ssa-scraper';
import { runCMSScraper } from '../scrapers/cms-scraper';
import { runAllStateScrapers } from '../scrapers/state-scrapers/index';
import { addToReviewQueue } from '../validators/human-review-queue';
import { findAffectedPlans, estimateRecalcTime } from '../publishers/plan-recalculator';
import { generateAdvisorAlerts, publishAlerts } from '../publishers/alert-publisher';

/**
 * Run the full annual table update.
 * Triggered when IRS publishes the Rev Proc with next-year inflation adjustments.
 *
 * ALL changes from the annual update require human review before publishing.
 * This ensures a tax professional validates every number before it affects client plans.
 *
 * After approval, all plans are recalculated with the new tables.
 */
export async function runAnnualTableUpdate(nextYear: number): Promise<UpdateRunResult> {
  const runId = `UPD-${nextYear - 1}-A`;
  const errors: string[] = [];

  // Run all relevant scrapers for next-year data
  const [irsResult, ssaResult, cmsResult, stateResult] = await Promise.allSettled([
    runIRSScraper(),
    runSSAScraper(),
    runCMSScraper(),
    runAllStateScrapers(),
  ]);

  const scraperResults = [irsResult, ssaResult, cmsResult, stateResult];
  const allChanges: ChangeItem[] = [];
  const sourceNames: string[] = [];

  for (const result of scraperResults) {
    if (result.status === 'fulfilled') {
      const scr = result.value as SourceCheckResult;
      allChanges.push(...scr.changesFound);
      sourceNames.push(scr.source);
      if (scr.errors.length > 0) {
        errors.push(...scr.errors);
      }
    } else {
      errors.push(String(result.reason));
    }
  }

  // ALL annual changes require human review — no auto-approval
  for (const change of allChanges) {
    addToReviewQueue(
      { ...change, autoApprovable: false },
      `Annual ${nextYear} table update — requires human review`,
    );
  }

  // Estimate recalc scope (will only execute after human approval)
  const allPlanIds = findAffectedPlans(['ordinary_income_brackets', 'standard_deductions', 'irmaa_part_b', 'ss_cola']);
  const recalcEstimate = estimateRecalcTime(allPlanIds.length);

  // Notify advisors that annual tables are pending review
  const alerts = generateAdvisorAlerts([], allChanges);
  publishAlerts(alerts);

  const summary = [
    `Annual ${nextYear} table update: ${allChanges.length} changes extracted from IRS, SSA, CMS, and ${scraperResults[3].status === 'fulfilled' ? '51 state' : '0 state'} sources.`,
    `ALL ${allChanges.length} items routed to human review queue.`,
    `After approval: ${allPlanIds.length} plans will be recalculated (est. ${recalcEstimate.estimatedMinutes} min).`,
    `${alerts.length} advisor notifications generated.`,
  ].join(' ');

  return {
    runId,
    runDate: new Date().toISOString(),
    sourcesChecked: sourceNames,
    changesDetected: allChanges.length,
    tablesUpdated: 0, // Annual tables are NEVER auto-published
    plansRequiringRecalc: allPlanIds.length,
    humanReviewRequired: true,
    humanReviewItems: allChanges.map((c: ChangeItem) => ({
      id: `REV-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      changeItem: c,
      detectedAt: new Date().toISOString(),
      status: 'pending' as const,
      aiSummary: c.summary,
    })),
    advisorAlertsGenerated: alerts.length,
    errors,
    summary,
  };
}
