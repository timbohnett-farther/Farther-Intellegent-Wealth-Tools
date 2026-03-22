/**
 * Farther Prism — Florida State Tax Scraper
 *
 * Monitors Florida for any state income tax or estate tax changes.
 * Florida has no state personal income tax (constitutionally
 * prohibited) and no state estate tax. This scraper primarily
 * serves as a sentinel for any legislative proposals that could
 * change this status.
 *
 * This is a stub implementation returning realistic demo data.
 * In production, this would monitor the Florida Legislature and
 * Department of Revenue for relevant proposals.
 */

import type { ChangeItem } from '../../types';

// ==================== MAIN SCRAPER ====================

/**
 * Runs the Florida state tax scraper.
 *
 * Florida has no state income tax or estate tax. This scraper
 * confirms that status and watches for any legislative changes.
 *
 * @returns Array of ChangeItems (typically empty or confirmatory).
 *
 * @example
 * ```ts
 * const changes = await runFloridaScraper();
 * // Usually returns a single confirmatory item
 * ```
 */
export async function runFloridaScraper(): Promise<ChangeItem[]> {
  const taxYear = new Date().getFullYear() + 1;

  return [
    {
      type: 'numeric_adjustment',
      tableType: 'state_income_tax',
      source: `FL DOR — ${taxYear} Status Confirmation`,
      effectiveDate: `${taxYear}-01-01`,
      description:
        `Florida continues to have no state personal income tax for ${taxYear}. ` +
        'The Florida Constitution (Article VII, Section 5) prohibits a personal ' +
        'income tax. Florida also has no state estate or inheritance tax.',
      newData: {
        state: 'FL',
        taxYear,
        hasIncomeTax: false,
        structure: 'none',
        hasEstateTax: false,
        note: 'No state income, estate, or inheritance tax. Constitutional prohibition on income tax.',
      },
      previousData: null,
      severity: 'low',
      affectedTables: ['state_income_tax'],
      autoApprovable: true,
    },
  ];
}
