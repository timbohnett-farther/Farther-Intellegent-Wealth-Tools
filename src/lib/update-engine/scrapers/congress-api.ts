/**
 * Farther Prism — Congress.gov API v3 Monitor
 *
 * Monitors the Congress.gov API for tax-relevant legislation,
 * tracking bill status changes and assessing their potential
 * impact on financial planning.
 *
 * This is a stub implementation returning realistic demo data.
 * In production, replace with actual Congress.gov API v3 calls
 * using an API key from api.congress.gov.
 */

import type {
  ChangeItem,
  SourceCheckResult,
  LegislativeImpact,
  TaxTableType,
} from '../types';

// ==================== CONSTANTS ====================

/** Base URL for the Congress.gov API v3. */
export const CONGRESS_API_BASE = 'https://api.congress.gov/v3';

/**
 * Keywords used to filter bills for financial-planning relevance.
 * Bills whose title or summary contain any of these keywords
 * are flagged for analysis.
 */
export const TAX_BILL_KEYWORDS: readonly string[] = [
  'income tax',
  'capital gains',
  'estate tax',
  'gift tax',
  'retirement savings',
  '401(k)',
  '401k',
  'IRA',
  'Roth',
  'required minimum distribution',
  'RMD',
  'Social Security',
  'Medicare',
  'IRMAA',
  'standard deduction',
  'SALT',
  'state and local tax',
  'alternative minimum tax',
  'AMT',
  'carried interest',
  'qualified opportunity zone',
  'health savings account',
  'HSA',
  'charitable deduction',
  'child tax credit',
  'earned income',
  'wealth tax',
  'unrealized gains',
  'step-up in basis',
] as const;

/**
 * Congressional committees whose activity is monitored for
 * tax-relevant markups and hearings.
 */
export const WATCHED_COMMITTEES: readonly string[] = [
  'Senate Finance Committee',
  'House Ways and Means Committee',
  'Joint Committee on Taxation',
  'Senate Budget Committee',
  'House Budget Committee',
] as const;

// ==================== MAIN MONITOR ====================

/**
 * Runs the Congress.gov monitor to check for tax-relevant bills.
 *
 * In production, this function:
 * 1. Queries the Congress.gov API for recently introduced/amended bills
 * 2. Filters by TAX_BILL_KEYWORDS
 * 3. Checks for status changes on previously tracked bills
 * 4. Assesses legislative impact for any changes found
 *
 * @returns A SourceCheckResult with any detected legislative changes.
 *
 * @example
 * ```ts
 * const result = await runCongressMonitor();
 * for (const change of result.changesFound) {
 *   console.log(`${change.billNumber}: ${change.description}`);
 * }
 * ```
 */
export async function runCongressMonitor(): Promise<SourceCheckResult> {
  const changes: ChangeItem[] = [];
  const errors: string[] = [];

  try {
    // In production:
    //   const url = `${CONGRESS_API_BASE}/bill/119?api_key=${apiKey}&sort=updateDate+desc&limit=50`;
    //   const response = await fetch(url);
    //   const data = await response.json();
    //   const bills = data.bills.filter(bill =>
    //     TAX_BILL_KEYWORDS.some(kw =>
    //       bill.title.toLowerCase().includes(kw.toLowerCase())
    //     )
    //   );
    void CONGRESS_API_BASE;

    // Stub: return demo bills representing current legislative landscape
    for (const bill of DEMO_TRACKED_BILLS) {
      const impact = assessLegislativeImpact(bill);

      changes.push({
        type: 'pending_legislation',
        tableType: impact.affectedTables[0],
        source: `Congress.gov — ${bill.congress}th Congress`,
        effectiveDate: impact.effectiveDate,
        description: bill.description,
        newData: {
          billNumber: bill.billNumber,
          title: bill.title,
          sponsor: bill.sponsor,
          currentStatus: bill.currentStatus,
          lastAction: bill.lastAction,
          lastActionDate: bill.lastActionDate,
        },
        previousData: null,
        severity: classifyBillSeverity(bill.currentStatus),
        affectedTables: impact.affectedTables,
        autoApprovable: false,
        billNumber: bill.billNumber,
        billCongress: bill.congress,
        billStatus: bill.currentStatus,
        summary: impact.summary,
        estimatedImpact: impact.clientImpactEstimate,
      });
    }
  } catch (err) {
    errors.push(`Congress.gov API check failed: ${String(err)}`);
  }

  return {
    source: 'Congress.gov',
    lastChecked: new Date().toISOString(),
    changesFound: changes,
    errors,
  };
}

// ==================== BILL STATUS CLASSIFICATION ====================

/**
 * Classifies the urgency of a bill status change by comparing
 * old and new statuses. Used to determine alert priority.
 *
 * @param oldStatus - The bill's previous status.
 * @param newStatus - The bill's new status.
 * @returns The urgency level of this status transition.
 *
 * @example
 * ```ts
 * const urgency = classifyBillStatusChange('introduced', 'committee_markup');
 * // Returns 'medium'
 * ```
 */
export function classifyBillStatusChange(
  oldStatus: string,
  newStatus: string,
): 'low' | 'medium' | 'high' | 'critical' {
  // Status transitions ordered by increasing urgency
  const statusWeight: Record<string, number> = {
    introduced: 1,
    referred_to_committee: 2,
    committee_hearing: 3,
    committee_markup: 4,
    reported_by_committee: 5,
    floor_consideration: 6,
    passed_chamber: 7,
    conference_committee: 8,
    passed_both_chambers: 9,
    sent_to_president: 10,
    signed: 11,
  };

  const oldWeight = statusWeight[oldStatus] ?? 0;
  const newWeight = statusWeight[newStatus] ?? 0;
  void oldWeight;

  if (newWeight >= 10) return 'critical';
  if (newWeight >= 7) return 'high';
  if (newWeight >= 4) return 'medium';
  return 'low';
}

/**
 * Maps a current bill status string to a severity level.
 */
function classifyBillSeverity(
  status: string,
): 'low' | 'medium' | 'high' | 'critical' {
  switch (status) {
    case 'signed':
    case 'sent_to_president':
      return 'critical';
    case 'passed_both_chambers':
    case 'passed_chamber':
    case 'conference_committee':
      return 'high';
    case 'committee_markup':
    case 'reported_by_committee':
    case 'floor_consideration':
      return 'medium';
    default:
      return 'low';
  }
}

// ==================== BILL TEXT FETCHER ====================

/**
 * Fetches the full text or summary of a bill from Congress.gov.
 *
 * In production, this calls the Congress.gov API text endpoint:
 *   GET /v3/bill/{congress}/{type}/{number}/text
 *
 * @param billNumber - The bill number (e.g. "H.R. 1234").
 * @param congress   - The congressional session (e.g. 119).
 * @returns The bill summary text.
 *
 * @example
 * ```ts
 * const text = await fetchBillText('H.R. 3456', 119);
 * console.log(text.substring(0, 200));
 * ```
 */
export async function fetchBillText(
  billNumber: string,
  congress: number,
): Promise<string> {
  // In production:
  //   const [type, number] = parseBillNumber(billNumber);
  //   const url = `${CONGRESS_API_BASE}/bill/${congress}/${type}/${number}/text?api_key=${apiKey}`;
  //   const response = await fetch(url);
  //   const data = await response.json();
  //   return data.textVersions[0]?.text ?? '';
  void CONGRESS_API_BASE;

  const demo = DEMO_TRACKED_BILLS.find(
    (b) => b.billNumber === billNumber && b.congress === congress,
  );

  if (!demo) {
    return `[Bill text not available for ${billNumber} (${congress}th Congress)]`;
  }

  return demo.summaryText;
}

// ==================== IMPACT ASSESSMENT ====================

/**
 * Assesses the legislative impact of a tracked bill on the
 * Farther Prism financial planning platform.
 *
 * @param bill - The demo bill record to assess.
 * @returns A LegislativeImpact assessment.
 */
function assessLegislativeImpact(bill: DemoBill): LegislativeImpact {
  return {
    summary: bill.impactSummary,
    affectedTables: bill.affectedTables,
    effectiveDate: bill.projectedEffectiveDate,
    clientImpactEstimate: bill.estimatedClientImpact,
    urgency: classifyBillSeverity(bill.currentStatus),
    affectedWealthTiers: bill.affectedWealthTiers,
  };
}

// ==================== DEMO DATA ====================

/** Shape of a tracked bill in the demo dataset. */
interface DemoBill {
  billNumber: string;
  congress: number;
  title: string;
  description: string;
  sponsor: string;
  currentStatus: string;
  lastAction: string;
  lastActionDate: string;
  summaryText: string;
  impactSummary: string;
  affectedTables: TaxTableType[];
  projectedEffectiveDate: string;
  estimatedClientImpact: string;
  affectedWealthTiers: Array<'emerging' | 'mass_affluent' | 'hnw' | 'uhnw'>;
}

/**
 * Demo bills representing a realistic legislative monitoring scenario.
 * Includes a mix of statuses and affected planning areas.
 */
const DEMO_TRACKED_BILLS: DemoBill[] = [
  {
    billNumber: 'H.R. 3456',
    congress: 119,
    title: 'SECURE Act 3.0 — Retirement Savings Enhancement Act',
    description:
      'SECURE 3.0 expands automatic enrollment, increases catch-up limits for ' +
      'ages 64-67, and creates a new federal match for low-income savers. ' +
      'Would also modify RMD age to 77 beginning in 2030.',
    sponsor: 'Rep. Smith (R-NE)',
    currentStatus: 'committee_markup',
    lastAction: 'Ordered to be reported by House Ways and Means Committee',
    lastActionDate: '2026-02-15',
    summaryText:
      'The Retirement Savings Enhancement Act of 2026 (SECURE 3.0) amends the ' +
      'Internal Revenue Code to further expand access to retirement savings. ' +
      'Key provisions include: (1) mandatory auto-enrollment for plans with 5+ ' +
      'employees, (2) enhanced catch-up contributions of $12,000 for ages 64-67, ' +
      '(3) new Saver\'s Match replacing the Saver\'s Credit, (4) RMD beginning ' +
      'age increased to 77 starting in 2030.',
    impactSummary:
      'If enacted, SECURE 3.0 would significantly affect retirement planning ' +
      'projections. The RMD age increase to 77 would allow 2 additional years of ' +
      'tax-deferred growth. Enhanced catch-up limits benefit clients aged 64-67.',
    affectedTables: ['contribution_limits_401k', 'contribution_limits_ira', 'rmd_tables'],
    projectedEffectiveDate: '2027-01-01',
    estimatedClientImpact: '$15,000-$45,000 lifetime tax savings for typical HNW client',
    affectedWealthTiers: ['mass_affluent', 'hnw', 'uhnw'],
  },
  {
    billNumber: 'S. 892',
    congress: 119,
    title: 'SALT Cap Restoration and Fairness Act',
    description:
      'Raises the SALT deduction cap from $10,000 to $40,000 for joint filers ' +
      '($20,000 single). Phases out for AGI above $500,000.',
    sponsor: 'Sen. Johnson (D-NJ)',
    currentStatus: 'introduced',
    lastAction: 'Referred to Senate Finance Committee',
    lastActionDate: '2026-01-22',
    summaryText:
      'This bill amends the Internal Revenue Code to increase the limitation ' +
      'on the deduction for state and local taxes (SALT) from $10,000 to $40,000 ' +
      'for married individuals filing jointly ($20,000 for single filers). The ' +
      'increased cap phases out for taxpayers with AGI exceeding $500,000.',
    impactSummary:
      'SALT cap increase would primarily benefit clients in high-tax states (NY, NJ, ' +
      'CA, CT, IL). HNW clients with significant state/local tax burdens could see ' +
      'meaningful federal tax savings. Phase-out at $500K AGI limits UHNW benefit.',
    affectedTables: ['ordinary_income_brackets', 'state_income_tax'],
    projectedEffectiveDate: '2027-01-01',
    estimatedClientImpact: '$5,000-$12,000 annual tax savings for typical HNW client in high-tax state',
    affectedWealthTiers: ['hnw', 'uhnw'],
  },
  {
    billNumber: 'H.R. 7890',
    congress: 119,
    title: 'Capital Gains Modernization Act',
    description:
      'Increases the top long-term capital gains rate to 28% for taxpayers with ' +
      'income above $1,000,000. Eliminates preferential rates for carried interest.',
    sponsor: 'Rep. Davis (D-CA)',
    currentStatus: 'introduced',
    lastAction: 'Referred to House Ways and Means Committee',
    lastActionDate: '2026-02-01',
    summaryText:
      'The Capital Gains Modernization Act increases the top long-term capital gains ' +
      'rate from 20% to 28% for taxpayers with taxable income exceeding $1,000,000. ' +
      'The bill also eliminates the preferential tax treatment of carried interest, ' +
      'treating it as ordinary income for fund managers.',
    impactSummary:
      'If enacted, the 8-percentage-point increase in the top LTCG rate would ' +
      'significantly affect tax-loss harvesting strategies and realization timing ' +
      'for UHNW clients. Carried interest changes would impact clients in PE/VC.',
    affectedTables: ['capital_gains_brackets'],
    projectedEffectiveDate: '2028-01-01',
    estimatedClientImpact: '$50,000-$500,000+ annual tax impact for UHNW clients with significant capital gains',
    affectedWealthTiers: ['uhnw'],
  },
];
