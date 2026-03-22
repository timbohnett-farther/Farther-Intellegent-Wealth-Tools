// Monthly AFR Update — runs on the 1st business day of each month at 8 AM.
// Checks and updates AFR short/mid/long-term rates and Section 7520 rate.

import type { UpdateRunResult } from '../types';
import { scrapeCurrentAFR } from '../scrapers/irs-scraper';
import { validateAFRRates } from '../validators/bracket-validator';
import { publishTaxTableUpdate } from '../publishers/table-publisher';

/**
 * Run the monthly AFR rate update.
 * AFR rates are published by the IRS on the first business day of each month.
 */
export async function runMonthlyAFRUpdate(): Promise<UpdateRunResult> {
  const runId = `UPD-${new Date().getFullYear()}-M${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  const errors: string[] = [];

  // Scrape current AFR rates
  const currentAFR = await scrapeCurrentAFR();

  // Validate using the validator's expected interface
  const validation = validateAFRRates({
    shortTerm: currentAFR.shortTermAnnual,
    midTerm: currentAFR.midTermAnnual,
    longTerm: currentAFR.longTermAnnual,
    section7520Rate: currentAFR.section7520Rate,
  });

  let tablesUpdated = 0;
  if (validation.passed) {
    publishTaxTableUpdate(currentAFR, 'afr_rates', new Date().getFullYear(), 'irs_afr_monthly');
    tablesUpdated = 1;
  } else {
    errors.push(...validation.errors);
  }

  const summary = tablesUpdated > 0
    ? `Monthly AFR update: Short ${currentAFR.shortTermAnnual}%, Mid ${currentAFR.midTermAnnual}%, Long ${currentAFR.longTermAnnual}%, 7520 ${currentAFR.section7520Rate}%.`
    : `Monthly AFR update failed validation: ${validation.errors.join('; ')}`;

  return {
    runId,
    runDate: new Date().toISOString(),
    sourcesChecked: ['IRS AFR Publication'],
    changesDetected: tablesUpdated,
    tablesUpdated,
    plansRequiringRecalc: 0, // AFR changes don't trigger plan recalc
    humanReviewRequired: !validation.passed,
    humanReviewItems: [],
    advisorAlertsGenerated: 0,
    errors,
    summary,
  };
}
