/**
 * Farther Prism — Massachusetts State Tax Scraper
 *
 * Monitors the Massachusetts Department of Revenue (DOR) for
 * changes to the state flat income tax rate and the millionaire
 * surtax (Fair Share Amendment). Massachusetts historically had
 * a flat 5% rate; voters approved a 4% surtax on income over
 * $1M effective 2023 (threshold indexed for inflation).
 *
 * This is a stub implementation returning realistic demo data.
 * In production, replace with actual fetch calls to mass.gov/dor.
 */

import type {
  ChangeItem,
  ScrapedStateTaxData,
} from '../../types';

// ==================== CONSTANTS ====================

/** MA DOR tax information URL. */
const MA_DOR_RATES_URL =
  'https://www.mass.gov/info-details/massachusetts-personal-income-tax-rates';

// ==================== MAIN SCRAPER ====================

/**
 * Runs the Massachusetts state tax scraper.
 *
 * Monitors:
 * - MA flat income tax rate (5.00%)
 * - Millionaire surtax / Fair Share Amendment (4% on income > $1M, indexed)
 * - Surtax threshold adjustments for inflation
 *
 * @returns Array of ChangeItems for any detected Massachusetts tax changes.
 *
 * @example
 * ```ts
 * const changes = await runMassachusettsScraper();
 * console.log(`MA: ${changes.length} changes detected`);
 * ```
 */
export async function runMassachusettsScraper(): Promise<ChangeItem[]> {
  // In production:
  //   const page = await fetch(MA_DOR_RATES_URL);
  //   const html = await page.text();
  //   const rateData = parseMARates(html);
  //   return compareWithCurrent(rateData);
  void MA_DOR_RATES_URL;

  const taxYear = new Date().getFullYear() + 1;
  const data = getMassachusettsData(taxYear);

  if (!data) {
    return [];
  }

  const changes: ChangeItem[] = [];

  changes.push({
    type: 'numeric_adjustment',
    tableType: 'state_income_tax',
    source: `MA DOR — ${taxYear} Tax Rates`,
    effectiveDate: `${taxYear}-01-01`,
    description:
      `${taxYear} Massachusetts income tax: flat rate ${((data.flatRate ?? 0) * 100).toFixed(2)}%. ` +
      `Fair Share Amendment surtax: additional ${((data.surtax?.rate ?? 0) * 100).toFixed(0)}% on ` +
      `income exceeding $${((data.surtax?.threshold ?? 0) / 1000000).toFixed(3)}M ` +
      '(threshold adjusted for inflation). Effective combined top rate: ' +
      `${(((data.flatRate ?? 0) + (data.surtax?.rate ?? 0)) * 100).toFixed(2)}%.`,
    newData: {
      state: data.state,
      taxYear: data.taxYear,
      structure: data.structure,
      flatRate: data.flatRate,
      surtax: data.surtax,
      conformityNotes: data.conformityNotes,
    },
    previousData: {
      state: 'MA',
      taxYear: taxYear - 1,
      flatRate: 0.05,
      surtaxRate: 0.04,
      surtaxThreshold: 1053750,
    },
    severity: 'medium',
    affectedTables: ['state_income_tax'],
    autoApprovable: true,
  });

  return changes;
}

// ==================== DATA BUILDER ====================

/**
 * Returns demo Massachusetts tax data for the given year.
 *
 * @param taxYear - The tax year to generate data for.
 * @returns Scraped state tax data, or null if unavailable.
 */
function getMassachusettsData(taxYear: number): ScrapedStateTaxData | null {
  if (taxYear !== 2027) {
    return null;
  }

  return {
    state: 'MA',
    taxYear: 2027,
    hasIncomeTax: true,
    structure: 'flat',
    flatRate: 0.05,
    surtax: {
      description:
        'Fair Share Amendment (Millionaire Surtax) — additional 4% on taxable ' +
        'income exceeding $1,083,150 (2027, indexed for inflation from $1M base).',
      rate: 0.04,
      threshold: 1083150,
    },
    conformityNotes:
      'Massachusetts generally conforms to the IRC for determining gross income ' +
      'but has significant modifications. MA does not conform to the SALT cap ' +
      '(no state income tax deduction regardless). MA does not allow QBI deduction. ' +
      'Short-term capital gains are taxed at 8.5% (separate from the flat rate). ' +
      'Long-term capital gains taxed at the standard 5% flat rate.',
  };
}
