/**
 * Farther Prism — Illinois State Tax Scraper
 *
 * Monitors the Illinois Department of Revenue (IDOR) for changes
 * to the state flat income tax rate and any legislative proposals
 * to move to a graduated (progressive) rate structure. Illinois
 * currently uses a flat 4.95% rate; a 2020 ballot measure to
 * adopt graduated rates was defeated by voters.
 *
 * This is a stub implementation returning realistic demo data.
 * In production, replace with actual fetch calls to tax.illinois.gov.
 */

import type {
  ChangeItem,
  ScrapedStateTaxData,
} from '../../types';

// ==================== CONSTANTS ====================

/** IL DOR tax rate information URL. */
const IL_IDOR_RATES_URL =
  'https://tax.illinois.gov/individuals/filingrequirements/taxrate.html';

// ==================== MAIN SCRAPER ====================

/**
 * Runs the Illinois state tax scraper.
 *
 * Monitors:
 * - IL flat income tax rate (currently 4.95%)
 * - Progressive / graduated tax proposals (none currently active)
 * - Any legislative changes to the flat rate
 *
 * @returns Array of ChangeItems for any detected Illinois tax changes.
 *
 * @example
 * ```ts
 * const changes = await runIllinoisScraper();
 * console.log(`IL: ${changes.length} changes detected`);
 * ```
 */
export async function runIllinoisScraper(): Promise<ChangeItem[]> {
  // In production:
  //   const page = await fetch(IL_IDOR_RATES_URL);
  //   const html = await page.text();
  //   const rateData = parseILRates(html);
  //   return compareWithCurrent(rateData);
  void IL_IDOR_RATES_URL;

  const taxYear = new Date().getFullYear() + 1;
  const data = getIllinoisData(taxYear);

  if (!data) {
    return [];
  }

  const changes: ChangeItem[] = [];

  changes.push({
    type: 'numeric_adjustment',
    tableType: 'state_income_tax',
    source: `IL IDOR — ${taxYear} Tax Rate`,
    effectiveDate: `${taxYear}-01-01`,
    description:
      `${taxYear} Illinois income tax: flat rate ${((data.flatRate ?? 0) * 100).toFixed(2)}%. ` +
      'No changes from prior year. Illinois continues to use a flat rate structure. ' +
      'No active proposals to adopt a graduated rate system.',
    newData: {
      state: data.state,
      taxYear: data.taxYear,
      structure: data.structure,
      flatRate: data.flatRate,
      conformityNotes: data.conformityNotes,
    },
    previousData: {
      state: 'IL',
      taxYear: taxYear - 1,
      flatRate: 0.0495,
    },
    severity: 'low',
    affectedTables: ['state_income_tax'],
    autoApprovable: true,
  });

  return changes;
}

// ==================== DATA BUILDER ====================

/**
 * Returns demo Illinois tax data for the given year.
 *
 * @param taxYear - The tax year to generate data for.
 * @returns Scraped state tax data, or null if unavailable.
 */
function getIllinoisData(taxYear: number): ScrapedStateTaxData | null {
  if (taxYear !== 2027) {
    return null;
  }

  return {
    state: 'IL',
    taxYear: 2027,
    hasIncomeTax: true,
    structure: 'flat',
    flatRate: 0.0495,
    conformityNotes:
      'Illinois starts with federal AGI and makes specific additions and subtractions. ' +
      'IL does not allow a standard deduction or personal exemptions (uses its own ' +
      'personal exemption of $2,475 per person). IL taxes retirement income from ' +
      'most sources (401(k), IRA) as exempt, which is favorable for retirees. ' +
      'Social Security benefits are fully exempt from Illinois income tax.',
  };
}
