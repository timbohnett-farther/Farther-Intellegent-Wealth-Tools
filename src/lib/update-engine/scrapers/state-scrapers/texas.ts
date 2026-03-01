/**
 * Farther Prism — Texas State Tax Scraper
 *
 * Monitors Texas for any state income tax or estate tax changes.
 * Texas has no state personal income tax (constitutionally prohibited
 * without voter approval) and no state estate tax. This scraper
 * primarily serves as a sentinel for any legislative proposals.
 *
 * This is a stub implementation returning realistic demo data.
 * In production, this would monitor the Texas Legislature and
 * Comptroller of Public Accounts for relevant proposals.
 */

import type { ChangeItem } from '../../types';

// ==================== MAIN SCRAPER ====================

/**
 * Runs the Texas state tax scraper.
 *
 * Texas has no state income tax or estate tax. This scraper
 * confirms that status and watches for any legislative changes.
 *
 * @returns Array of ChangeItems (typically empty or confirmatory).
 *
 * @example
 * ```ts
 * const changes = await runTexasScraper();
 * // Usually returns a single confirmatory item
 * ```
 */
export async function runTexasScraper(): Promise<ChangeItem[]> {
  const taxYear = new Date().getFullYear() + 1;

  return [
    {
      type: 'numeric_adjustment',
      tableType: 'state_income_tax',
      source: `TX Comptroller — ${taxYear} Status Confirmation`,
      effectiveDate: `${taxYear}-01-01`,
      description:
        `Texas continues to have no state personal income tax for ${taxYear}. ` +
        'The Texas Constitution (Article VIII, Section 24-a) prohibits a personal ' +
        'income tax unless approved by voters in a statewide referendum. ' +
        'Texas also has no state estate or inheritance tax.',
      newData: {
        state: 'TX',
        taxYear,
        hasIncomeTax: false,
        structure: 'none',
        hasEstateTax: false,
        note: 'No state income, estate, or inheritance tax. Constitutional prohibition on income tax without voter approval.',
      },
      previousData: null,
      severity: 'low',
      affectedTables: ['state_income_tax'],
      autoApprovable: true,
    },
  ];
}
