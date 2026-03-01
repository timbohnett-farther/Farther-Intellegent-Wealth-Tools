// Quarterly Update Orchestrator — main quarterly job running Jan 1, Apr 1, Jul 1, Oct 1 at 3 AM.
// Coordinates all scrapers, classifiers, validators, publishers, and alert generators.
// Pure functional — no React, Next.js, or Prisma imports.

import type { ChangeItem, SourceCheckResult, UpdateRunResult } from '../types';
import { runIRSScraper, runCongressMonitor, runSSAScraper, runCMSScraper, runTreasuryScraper, runAllStateScrapers } from '../scrapers/index';
import { shouldRequireHumanReview, addToReviewQueue } from '../validators/human-review-queue';
import { publishTaxTableUpdate } from '../publishers/table-publisher';
import { findAffectedPlans, queuePlanRecalculations, estimateRecalcTime } from '../publishers/plan-recalculator';
import { generateAdvisorAlerts, generateQuarterlyBulletin, publishAlerts } from '../publishers/alert-publisher';

// ---------------------------------------------------------------------------
// Orchestrator
// ---------------------------------------------------------------------------

/**
 * Run the full quarterly update pipeline.
 *
 * Steps:
 * 1. Run all scrapers in parallel
 * 2. Classify changes (auto-update vs human review)
 * 3. Validate and publish auto-approved changes
 * 4. Queue human review items
 * 5. Find and queue affected plans for recalculation
 * 6. Generate advisor alerts
 * 7. Create quarterly bulletin
 * 8. Return comprehensive run result
 */
export async function runQuarterlyUpdate(): Promise<UpdateRunResult> {
  const runId = `UPD-${new Date().getFullYear()}-Q${Math.ceil((new Date().getMonth() + 1) / 3)}`;
  const startTime = Date.now();
  const errors: string[] = [];
  const allChanges: ChangeItem[] = [];

  // Step 1: Run all scrapers in parallel
  const [irsResult, congressResult, ssaResult, cmsResult, treasuryResult, stateResult] =
    await Promise.allSettled([
      runIRSScraper(),
      runCongressMonitor(),
      runSSAScraper(),
      runCMSScraper(),
      runTreasuryScraper(),
      runAllStateScrapers(),
    ]);

  const scraperResults = [irsResult, congressResult, ssaResult, cmsResult, treasuryResult, stateResult];
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

  const sourcesChecked = sourceNames;

  // Step 2: Classify changes (auto-approve vs human review)
  const autoUpdateChanges = allChanges.filter((c: ChangeItem) => !shouldRequireHumanReview(c));
  const humanReviewChanges = allChanges.filter((c: ChangeItem) => shouldRequireHumanReview(c));

  // Step 3: Publish auto-approved changes
  let tablesUpdated = 0;
  for (const change of autoUpdateChanges) {
    try {
      publishTaxTableUpdate(change.newData, change.tableType as never, new Date().getFullYear(), change.source);
      tablesUpdated++;
    } catch (err) {
      errors.push(`Auto-update failed: ${String(err)}`);
    }
  }

  // Step 4: Queue human review items
  for (const change of humanReviewChanges) {
    addToReviewQueue(change, change.type === 'pending_legislation' ? 'Pending legislation requires review' : 'Non-auto-approvable change');
  }

  // Step 5: Find and queue plan recalculations
  const updatedTableTypes = autoUpdateChanges
    .flatMap((c: ChangeItem) => c.affectedTables)
    .filter((v: string, i: number, a: string[]) => a.indexOf(v) === i) as never[];
  const affectedPlanIds = findAffectedPlans(updatedTableTypes);
  const recalcQueue = queuePlanRecalculations(affectedPlanIds, `quarterly_update_${runId}`);
  const recalcEstimate = estimateRecalcTime(affectedPlanIds.length);

  // Step 6: Generate advisor alerts
  const advisorAlerts = generateAdvisorAlerts(autoUpdateChanges, humanReviewChanges);
  publishAlerts(advisorAlerts);

  // Step 7: Generate quarterly bulletin
  const bulletin = generateQuarterlyBulletin(allChanges, {
    plansRequiringRecalc: affectedPlanIds.length,
  });

  const summary = [
    `Quarterly update ${runId}: ${allChanges.length} changes detected.`,
    `${tablesUpdated} tables auto-updated.`,
    `${humanReviewChanges.length} items routed to human review.`,
    `${affectedPlanIds.length} plans queued for recalculation (est. ${recalcEstimate.estimatedMinutes} min).`,
    `${advisorAlerts.length} advisor alerts generated.`,
  ].join(' ');

  return {
    runId,
    runDate: new Date().toISOString(),
    sourcesChecked,
    changesDetected: allChanges.length,
    tablesUpdated,
    plansRequiringRecalc: affectedPlanIds.length,
    humanReviewRequired: humanReviewChanges.length > 0,
    humanReviewItems: humanReviewChanges.map((c: ChangeItem) => ({
      id: `REV-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      changeItem: c,
      detectedAt: new Date().toISOString(),
      status: 'pending' as const,
      aiSummary: c.summary,
    })),
    advisorAlertsGenerated: advisorAlerts.length,
    errors,
    summary,
  };
}
