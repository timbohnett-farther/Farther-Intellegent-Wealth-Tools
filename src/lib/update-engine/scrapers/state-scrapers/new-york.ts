/**
 * Farther Prism — New York State Tax Scraper
 *
 * Monitors the NY Department of Taxation and Finance (DTF) for
 * changes to state income tax brackets, NYC surcharge, and the
 * estate tax cliff. New York has graduated state brackets with
 * a top rate of 10.9% plus an NYC resident surcharge.
 *
 * This is a stub implementation returning realistic demo data.
 * In production, replace with actual fetch calls to tax.ny.gov.
 */

import type {
  ChangeItem,
  ScrapedStateTaxData,
} from '../../types';

// ==================== CONSTANTS ====================

/** NY DTF tax rate schedule URL. */
const NY_DTF_RATES_URL =
  'https://www.tax.ny.gov/pit/file/tax_tables.htm';

// ==================== MAIN SCRAPER ====================

/**
 * Runs the New York state tax scraper.
 *
 * Monitors:
 * - NY state income tax brackets (8 brackets, 4% to 10.9%)
 * - NYC resident surcharge (3.078% to 3.876%)
 * - NY estate tax cliff ($6.94M for 2027)
 *
 * @returns Array of ChangeItems for any detected New York tax changes.
 *
 * @example
 * ```ts
 * const changes = await runNewYorkScraper();
 * console.log(`NY: ${changes.length} changes detected`);
 * ```
 */
export async function runNewYorkScraper(): Promise<ChangeItem[]> {
  // In production:
  //   const page = await fetch(NY_DTF_RATES_URL);
  //   const html = await page.text();
  //   const brackets = parseNYBrackets(html);
  //   return compareWithCurrent(brackets);
  void NY_DTF_RATES_URL;

  const taxYear = new Date().getFullYear() + 1;
  const data = getNewYorkData(taxYear);

  if (!data) {
    return [];
  }

  const changes: ChangeItem[] = [];

  // State income tax brackets
  changes.push({
    type: 'numeric_adjustment',
    tableType: 'state_income_tax',
    source: `NY DTF — ${taxYear} Tax Rate Schedules`,
    effectiveDate: `${taxYear}-01-01`,
    description:
      `${taxYear} New York state income tax brackets updated. 8 brackets from ` +
      `4% to 10.9%. NYC resident surcharge ranges from 3.078% to 3.876%.`,
    newData: {
      state: data.state,
      taxYear: data.taxYear,
      structure: data.structure,
      brackets: data.brackets,
      surtax: data.surtax,
    },
    previousData: {
      state: 'NY',
      taxYear: taxYear - 1,
      structure: 'graduated',
      note: 'Previous year brackets — see versioned table for detail',
    },
    severity: 'medium',
    affectedTables: ['state_income_tax'],
    autoApprovable: true,
  });

  // Estate tax cliff
  if (data.estateTax) {
    changes.push({
      type: 'numeric_adjustment',
      tableType: 'state_income_tax',
      source: `NY DTF — ${taxYear} Estate Tax`,
      effectiveDate: `${taxYear}-01-01`,
      description:
        `${taxYear} New York estate tax exemption: $${(data.estateTax.exemption / 1000000).toFixed(2)}M. ` +
        `IMPORTANT: NY has a "cliff" — if the estate exceeds 105% of the exemption, ` +
        'the entire estate is taxed, not just the excess. Top rate: ' +
        `${(data.estateTax.topRate * 100).toFixed(1)}%.`,
      newData: {
        state: 'NY',
        taxYear,
        hasEstateTax: data.estateTax.hasEstateTax,
        exemption: data.estateTax.exemption,
        topRate: data.estateTax.topRate,
        hasCliff: data.estateTax.hasCliff,
        cliffThreshold: data.estateTax.exemption * 1.05,
      },
      previousData: {
        state: 'NY',
        taxYear: taxYear - 1,
        exemption: 6580000,
        topRate: 0.16,
        hasCliff: true,
      },
      severity: 'high',
      affectedTables: ['state_income_tax', 'estate_exemption'],
      autoApprovable: false,
    });
  }

  return changes;
}

// ==================== DATA BUILDER ====================

/**
 * Returns demo New York tax data for the given year.
 *
 * @param taxYear - The tax year to generate data for.
 * @returns Scraped state tax data, or null if unavailable.
 */
function getNewYorkData(taxYear: number): ScrapedStateTaxData | null {
  if (taxYear !== 2027) {
    return null;
  }

  return {
    state: 'NY',
    taxYear: 2027,
    hasIncomeTax: true,
    structure: 'graduated',
    brackets: [
      { filingStatus: 'single', rate: 0.04, minIncome: 0, maxIncome: 8500 },
      { filingStatus: 'single', rate: 0.045, minIncome: 8500, maxIncome: 11700 },
      { filingStatus: 'single', rate: 0.0525, minIncome: 11700, maxIncome: 13900 },
      { filingStatus: 'single', rate: 0.0585, minIncome: 13900, maxIncome: 80650 },
      { filingStatus: 'single', rate: 0.0625, minIncome: 80650, maxIncome: 215400 },
      { filingStatus: 'single', rate: 0.0685, minIncome: 215400, maxIncome: 1077550 },
      { filingStatus: 'single', rate: 0.0965, minIncome: 1077550, maxIncome: 5000000 },
      { filingStatus: 'single', rate: 0.103, minIncome: 5000000, maxIncome: 25000000 },
      { filingStatus: 'married_filing_jointly', rate: 0.04, minIncome: 0, maxIncome: 17150 },
      { filingStatus: 'married_filing_jointly', rate: 0.045, minIncome: 17150, maxIncome: 23600 },
      { filingStatus: 'married_filing_jointly', rate: 0.0525, minIncome: 23600, maxIncome: 27900 },
      { filingStatus: 'married_filing_jointly', rate: 0.0585, minIncome: 27900, maxIncome: 161550 },
      { filingStatus: 'married_filing_jointly', rate: 0.0625, minIncome: 161550, maxIncome: 323200 },
      { filingStatus: 'married_filing_jointly', rate: 0.0685, minIncome: 323200, maxIncome: 2155350 },
      { filingStatus: 'married_filing_jointly', rate: 0.0965, minIncome: 2155350, maxIncome: 5000000 },
      { filingStatus: 'married_filing_jointly', rate: 0.109, minIncome: 5000000, maxIncome: null },
    ],
    surtax: {
      description:
        'NYC resident surcharge — additional 3.078% to 3.876% on NYC residents. ' +
        'Yonkers residents pay a surcharge of 16.75% of net state tax.',
      rate: 0.03876,
      threshold: 0,
    },
    estateTax: {
      hasEstateTax: true,
      exemption: 6940000,
      topRate: 0.16,
      hasCliff: true,
    },
    conformityNotes:
      'New York generally conforms to the IRC but decouples on many TCJA provisions. ' +
      'NY does not conform to SALT cap, bonus depreciation (uses own ACRS), or QBI deduction. ' +
      'NY has its own itemized deduction limitations for high-income taxpayers.',
  };
}
