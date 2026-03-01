/**
 * Farther Prism — California State Tax Scraper
 *
 * Monitors the California Franchise Tax Board (FTB) for changes
 * to state income tax brackets, rates, and federal conformity.
 * California has 10 graduated brackets with a top rate of 13.3%
 * plus a 1% Mental Health Services Tax on income over $1M.
 *
 * This is a stub implementation returning realistic demo data.
 * In production, replace with actual fetch calls to ftb.ca.gov.
 */

import type {
  ChangeItem,
  ScrapedStateTaxData,
} from '../../types';

// ==================== CONSTANTS ====================

/** California FTB tax rate schedule URL. */
const CA_FTB_RATES_URL =
  'https://www.ftb.ca.gov/forms/2027/2027-California-Tax-Rate-Schedules.html';

// ==================== MAIN SCRAPER ====================

/**
 * Runs the California state tax scraper.
 *
 * Monitors:
 * - CA income tax brackets (10 brackets, 1% to 13.3%)
 * - Mental Health Services Tax (1% surtax on income > $1M)
 * - Federal conformity status
 *
 * @returns Array of ChangeItems for any detected California tax changes.
 *
 * @example
 * ```ts
 * const changes = await runCaliforniaScraper();
 * console.log(`CA: ${changes.length} changes detected`);
 * ```
 */
export async function runCaliforniaScraper(): Promise<ChangeItem[]> {
  // In production:
  //   const page = await fetch(CA_FTB_RATES_URL);
  //   const html = await page.text();
  //   const brackets = parseCABrackets(html);
  //   return compareWithCurrent(brackets);
  void CA_FTB_RATES_URL;

  const taxYear = new Date().getFullYear() + 1;
  const data = getCaliforniaData(taxYear);

  if (!data) {
    return [];
  }

  const changes: ChangeItem[] = [];

  changes.push({
    type: 'numeric_adjustment',
    tableType: 'state_income_tax',
    source: `CA FTB — ${taxYear} Tax Rate Schedules`,
    effectiveDate: `${taxYear}-01-01`,
    description:
      `${taxYear} California income tax brackets updated for inflation. ` +
      `10 brackets from 1% to 13.3%. Mental Health Services Tax (1%) ` +
      `continues on income over $1,000,000.`,
    newData: {
      state: data.state,
      taxYear: data.taxYear,
      structure: data.structure,
      brackets: data.brackets,
      surtax: data.surtax,
      conformityNotes: data.conformityNotes,
    },
    previousData: {
      state: 'CA',
      taxYear: taxYear - 1,
      structure: 'graduated',
      note: 'Previous year brackets — see versioned table for detail',
    },
    severity: 'medium',
    affectedTables: ['state_income_tax'],
    autoApprovable: true,
  });

  // Estate tax note — California has no state estate tax but proposals recur
  changes.push({
    type: 'numeric_adjustment',
    tableType: 'state_income_tax',
    source: `CA FTB — ${taxYear} Estate Tax Status`,
    effectiveDate: `${taxYear}-01-01`,
    description:
      `California continues to have no state estate or inheritance tax for ${taxYear}. ` +
      'No pending legislation to impose one.',
    newData: {
      state: 'CA',
      taxYear,
      hasEstateTax: false,
      note: 'No state estate or inheritance tax',
    },
    previousData: null,
    severity: 'low',
    affectedTables: ['state_income_tax'],
    autoApprovable: true,
  });

  return changes;
}

// ==================== DATA BUILDER ====================

/**
 * Returns demo California tax data for the given year.
 *
 * @param taxYear - The tax year to generate data for.
 * @returns Scraped state tax data, or null if unavailable.
 */
function getCaliforniaData(taxYear: number): ScrapedStateTaxData | null {
  if (taxYear !== 2027) {
    return null;
  }

  return {
    state: 'CA',
    taxYear: 2027,
    hasIncomeTax: true,
    structure: 'graduated',
    brackets: [
      { filingStatus: 'single', rate: 0.01, minIncome: 0, maxIncome: 10412 },
      { filingStatus: 'single', rate: 0.02, minIncome: 10412, maxIncome: 24684 },
      { filingStatus: 'single', rate: 0.04, minIncome: 24684, maxIncome: 38959 },
      { filingStatus: 'single', rate: 0.06, minIncome: 38959, maxIncome: 54081 },
      { filingStatus: 'single', rate: 0.08, minIncome: 54081, maxIncome: 68350 },
      { filingStatus: 'single', rate: 0.093, minIncome: 68350, maxIncome: 349137 },
      { filingStatus: 'single', rate: 0.103, minIncome: 349137, maxIncome: 418961 },
      { filingStatus: 'single', rate: 0.113, minIncome: 418961, maxIncome: 698271 },
      { filingStatus: 'single', rate: 0.123, minIncome: 698271, maxIncome: 1000000 },
      { filingStatus: 'single', rate: 0.133, minIncome: 1000000, maxIncome: null },
      { filingStatus: 'married_filing_jointly', rate: 0.01, minIncome: 0, maxIncome: 20824 },
      { filingStatus: 'married_filing_jointly', rate: 0.02, minIncome: 20824, maxIncome: 49368 },
      { filingStatus: 'married_filing_jointly', rate: 0.04, minIncome: 49368, maxIncome: 77918 },
      { filingStatus: 'married_filing_jointly', rate: 0.06, minIncome: 77918, maxIncome: 108162 },
      { filingStatus: 'married_filing_jointly', rate: 0.08, minIncome: 108162, maxIncome: 136700 },
      { filingStatus: 'married_filing_jointly', rate: 0.093, minIncome: 136700, maxIncome: 698274 },
      { filingStatus: 'married_filing_jointly', rate: 0.103, minIncome: 698274, maxIncome: 837922 },
      { filingStatus: 'married_filing_jointly', rate: 0.113, minIncome: 837922, maxIncome: 1396542 },
      { filingStatus: 'married_filing_jointly', rate: 0.123, minIncome: 1396542, maxIncome: 2000000 },
      { filingStatus: 'married_filing_jointly', rate: 0.133, minIncome: 2000000, maxIncome: null },
    ],
    surtax: {
      description: 'Mental Health Services Tax — additional 1% on taxable income over $1,000,000',
      rate: 0.01,
      threshold: 1000000,
    },
    conformityNotes:
      'California generally conforms to the IRC as of January 1, 2015, with ' +
      'significant modifications. Does NOT conform to the TCJA SALT cap, bonus ' +
      'depreciation changes, or QBI deduction. California does not allow SALT ' +
      'deduction for state income taxes paid.',
  };
}
