// Daily Monitor — lightweight daily check of Congress and IRS RSS.
// Runs at 6 AM daily. Only creates alerts for significant status changes.

import type { ChangeItem, SourceCheckResult, UpdateRunResult } from '../types';
import { runCongressMonitor } from '../scrapers/congress-api';
import { runIRSScraper } from '../scrapers/irs-scraper';
import { shouldRequireHumanReview, addToReviewQueue } from '../validators/human-review-queue';
import { generateAdvisorAlerts, publishAlerts } from '../publishers/alert-publisher';

/**
 * Run the daily monitor — Congress bill status + IRS newsroom RSS.
 * This is a lightweight check (typically <10 seconds).
 */
export async function runDailyMonitor(): Promise<UpdateRunResult> {
  const runId = `UPD-${new Date().getFullYear()}-D${String(new Date().getDate()).padStart(2, '0')}`;
  const errors: string[] = [];

  const [congressResult, irsResult] = await Promise.allSettled([
    runCongressMonitor(),
    runIRSScraper(),
  ]);

  const allChanges: ChangeItem[] = [];
  const sourceNames: string[] = [];

  if (congressResult.status === 'fulfilled') {
    const scr = congressResult.value as SourceCheckResult;
    allChanges.push(...scr.changesFound);
    sourceNames.push(scr.source);
  }
  if (irsResult.status === 'fulfilled') {
    const scr = irsResult.value as SourceCheckResult;
    allChanges.push(...scr.changesFound);
    sourceNames.push(scr.source);
  }

  if (congressResult.status === 'rejected') errors.push(String(congressResult.reason));
  if (irsResult.status === 'rejected') errors.push(String(irsResult.reason));

  // Route any material changes to review queue
  const reviewItems = allChanges.filter(shouldRequireHumanReview);
  for (const item of reviewItems) {
    addToReviewQueue(item, 'Daily monitor detected significant change');
  }

  // Generate alerts only for significant changes
  let alertCount = 0;
  if (reviewItems.length > 0) {
    const alerts = generateAdvisorAlerts([], reviewItems);
    publishAlerts(alerts);
    alertCount = alerts.length;
  }

  const summary = allChanges.length === 0
    ? 'No changes detected.'
    : `${allChanges.length} change${allChanges.length === 1 ? '' : 's'} detected. ${reviewItems.length} routed to review.`;

  return {
    runId,
    runDate: new Date().toISOString(),
    sourcesChecked: sourceNames,
    changesDetected: allChanges.length,
    tablesUpdated: 0,
    plansRequiringRecalc: 0,
    humanReviewRequired: reviewItems.length > 0,
    humanReviewItems: reviewItems.map((c: ChangeItem) => ({
      id: `REV-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      changeItem: c,
      detectedAt: new Date().toISOString(),
      status: 'pending' as const,
      aiSummary: c.summary,
    })),
    advisorAlertsGenerated: alertCount,
    errors,
    summary,
  };
}
