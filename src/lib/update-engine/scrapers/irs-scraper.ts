/**
 * Farther Prism — IRS.gov Scraper
 *
 * Monitors IRS newsroom RSS feeds, Revenue Procedures, and monthly
 * AFR publications for changes to federal tax brackets, contribution
 * limits, standard deductions, and Applicable Federal Rates.
 *
 * This is a stub implementation returning realistic demo data.
 * In production, replace HTTP stubs with actual fetch calls to
 * IRS.gov endpoints and RSS feeds.
 */

import type {
  ChangeItem,
  SourceCheckResult,
  ScrapedAFRRates,
  ScrapedTaxBracket,
  IRSDocumentAnalysis,
  TaxTableType,
} from '../types';

// ==================== CONSTANTS ====================

/** IRS newsroom RSS feed URL for tax-related news releases. */
export const IRS_NEWSROOM_RSS_URL =
  'https://www.irs.gov/newsroom/rss/news-releases.xml';

/** IRS AFR page for monthly Applicable Federal Rates. */
const IRS_AFR_URL =
  'https://www.irs.gov/applicable-federal-rates';

/** IRS Revenue Procedures index page. */
const IRS_REV_PROC_URL =
  'https://www.irs.gov/irb';

/**
 * Keywords used to filter IRS newsroom items for relevance to
 * the tax tables tracked by the update engine.
 */
export const IRS_RELEVANT_KEYWORDS: readonly string[] = [
  'inflation adjustment',
  'cost-of-living',
  'revenue procedure',
  'tax rate',
  'standard deduction',
  'contribution limit',
  'estate tax exemption',
  'gift tax exclusion',
  'applicable federal rate',
  'AFR',
  'section 7520',
  'alternative minimum tax',
  'AMT',
  'required minimum distribution',
  'RMD',
  'health savings account',
  'HSA',
  '401(k)',
  'IRA',
  'IRMAA',
  'kiddie tax',
] as const;

// ==================== MAIN SCRAPER ====================

/**
 * Runs the full IRS scraper pipeline.
 *
 * 1. Checks the IRS newsroom RSS for relevant new items.
 * 2. Checks for new Revenue Procedures containing inflation adjustments.
 * 3. Checks for updated AFR rates.
 *
 * In production, each step would perform an HTTP fetch and parse
 * the response. This stub returns demo data simulating a typical
 * quarterly check that finds updated AFR rates.
 *
 * @returns A SourceCheckResult describing what was found.
 *
 * @example
 * ```ts
 * const result = await runIRSScraper();
 * console.log(`IRS: ${result.changesFound.length} changes detected`);
 * ```
 */
export async function runIRSScraper(): Promise<SourceCheckResult> {
  const changes: ChangeItem[] = [];
  const errors: string[] = [];

  // --- Step 1: Check IRS newsroom RSS ---
  try {
    // In production:
    //   const rss = await fetch(IRS_NEWSROOM_RSS_URL);
    //   const items = parseRSSFeed(await rss.text());
    //   const relevant = items.filter(item =>
    //     IRS_RELEVANT_KEYWORDS.some(kw => item.title.toLowerCase().includes(kw))
    //   );
    void IRS_NEWSROOM_RSS_URL;

    // Stub: simulate finding a Rev Proc for 2027 inflation adjustments
    const revProcAnalysis = extractInflationAdjustments(DEMO_REV_PROC_2027);
    if (revProcAnalysis.containsTaxTableChanges) {
      changes.push(...revProcAnalysis.extractedChanges);
    }
  } catch (err) {
    errors.push(`IRS newsroom RSS check failed: ${String(err)}`);
  }

  // --- Step 2: Check for new Revenue Procedures ---
  try {
    // In production:
    //   const page = await fetch(IRS_REV_PROC_URL);
    //   const revProcs = parseRevProcIndex(await page.text());
    //   for (const rp of revProcs) { ... }
    void IRS_REV_PROC_URL;

    // Stub: contribution limit updates for 2027
    changes.push(...buildContributionLimitChanges(2027));
  } catch (err) {
    errors.push(`IRS Rev Proc check failed: ${String(err)}`);
  }

  // --- Step 3: Check AFR rates ---
  try {
    const afr = await scrapeCurrentAFR();
    changes.push({
      type: 'numeric_adjustment',
      tableType: 'afr_rates',
      source: `IRS AFR — ${afr.effectiveMonth}`,
      effectiveDate: `${afr.effectiveMonth}-01`,
      description:
        `AFR rates for ${afr.effectiveMonth}: short ${afr.shortTermAnnual}%, ` +
        `mid ${afr.midTermAnnual}%, long ${afr.longTermAnnual}%, ` +
        `Sec 7520 ${afr.section7520Rate}%`,
      newData: {
        shortTermAnnual: afr.shortTermAnnual,
        midTermAnnual: afr.midTermAnnual,
        longTermAnnual: afr.longTermAnnual,
        section7520Rate: afr.section7520Rate,
      },
      previousData: {
        shortTermAnnual: 4.75,
        midTermAnnual: 4.30,
        longTermAnnual: 4.72,
        section7520Rate: 5.4,
      },
      severity: 'low',
      affectedTables: ['afr_rates'],
      autoApprovable: true,
    });
  } catch (err) {
    errors.push(`IRS AFR check failed: ${String(err)}`);
  }

  return {
    source: 'IRS.gov',
    lastChecked: new Date().toISOString(),
    changesFound: changes,
    errors,
  };
}

// ==================== AFR SCRAPER ====================

/**
 * Scrapes the current month's Applicable Federal Rates from IRS.gov.
 *
 * In production, this fetches the IRS AFR page and parses the table
 * for the most recent month's rates. This stub returns realistic
 * demo data.
 *
 * @returns The latest AFR rates.
 *
 * @example
 * ```ts
 * const afr = await scrapeCurrentAFR();
 * console.log(`Section 7520 rate: ${afr.section7520Rate}%`);
 * ```
 */
export async function scrapeCurrentAFR(): Promise<ScrapedAFRRates> {
  // In production:
  //   const page = await fetch(IRS_AFR_URL);
  //   const html = await page.text();
  //   return parseAFRTable(html);
  void IRS_AFR_URL;

  const now = new Date();
  const effectiveMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  return {
    effectiveMonth,
    shortTermAnnual: 4.67,
    midTermAnnual: 4.23,
    longTermAnnual: 4.68,
    section7520Rate: 5.2,
  };
}

// ==================== DOCUMENT ANALYSIS ====================

/**
 * Analyzes an IRS document (Revenue Procedure text) to extract
 * inflation-adjusted tax bracket and threshold changes.
 *
 * In production, this would parse the actual Rev Proc PDF or HTML
 * and use pattern matching to identify bracket tables. This stub
 * returns demo data representing a typical annual inflation adjustment.
 *
 * @param document - The text content of the IRS document.
 * @returns Analysis result with extracted changes.
 *
 * @example
 * ```ts
 * const analysis = extractInflationAdjustments(revProcText);
 * if (analysis.containsTaxTableChanges) {
 *   console.log(`Found ${analysis.extractedChanges.length} bracket changes`);
 * }
 * ```
 */
export function extractInflationAdjustments(
  document: string,
): IRSDocumentAnalysis {
  // In production:
  //   1. Parse the document for bracket tables
  //   2. Extract numeric values using regex patterns
  //   3. Compare against current stored values
  //   4. Build ChangeItems for any differences

  // Check if the document mentions inflation adjustments
  const hasInflationContent = IRS_RELEVANT_KEYWORDS.some((kw) =>
    document.toLowerCase().includes(kw.toLowerCase()),
  );

  if (!hasInflationContent) {
    return {
      containsTaxTableChanges: false,
      extractedChanges: [],
      summary: 'Document does not contain tax table changes.',
      severity: 'none',
    };
  }

  // Stub: extract bracket changes from the demo document
  const bracketChanges = buildBracketUpdateChanges(
    DEMO_2027_BRACKETS_SINGLE,
    2027,
  );

  return {
    containsTaxTableChanges: true,
    extractedChanges: bracketChanges,
    summary:
      'Rev Proc 2026-45: Annual inflation adjustments for tax year 2027. ' +
      'Ordinary income brackets, standard deduction, and AMT exemptions updated.',
    severity: 'medium',
  };
}

// ==================== CHANGE BUILDERS ====================

/**
 * Constructs ChangeItem records from extracted bracket data for a
 * given tax year.
 *
 * @param brackets - The scraped bracket data.
 * @param taxYear  - The tax year these brackets apply to.
 * @returns Array of ChangeItems, one per filing status.
 */
export function buildBracketUpdateChanges(
  brackets: ScrapedTaxBracket[],
  taxYear: number,
): ChangeItem[] {
  const changes: ChangeItem[] = [];

  // Group brackets by filing status
  const byFilingStatus = new Map<string, ScrapedTaxBracket[]>();
  for (const bracket of brackets) {
    const existing = byFilingStatus.get(bracket.filingStatus) ?? [];
    existing.push(bracket);
    byFilingStatus.set(bracket.filingStatus, existing);
  }

  const affectedTables: TaxTableType[] = [
    'ordinary_income_brackets',
    'standard_deductions',
    'amt_exemptions',
  ];

  for (const [filingStatus, statusBrackets] of byFilingStatus) {
    changes.push({
      type: 'numeric_adjustment',
      tableType: 'ordinary_income_brackets',
      source: `IRS Rev Proc 2026-45 — Tax Year ${taxYear}`,
      effectiveDate: `${taxYear}-01-01`,
      description:
        `${taxYear} ordinary income brackets updated for ${filingStatus.replace(/_/g, ' ')} filers. ` +
        `Brackets adjusted for inflation (~2.8% increase).`,
      newData: {
        filingStatus,
        taxYear,
        brackets: statusBrackets.map((b) => ({
          rate: b.rate,
          min: b.minIncome,
          max: b.maxIncome,
        })),
      },
      previousData: null,
      severity: 'medium',
      affectedTables,
      autoApprovable: true,
    });
  }

  return changes;
}

/**
 * Builds ChangeItems for annual contribution limit updates.
 *
 * @param taxYear - The tax year for the new limits.
 * @returns Array of ChangeItems for 401(k), IRA, and HSA limits.
 */
function buildContributionLimitChanges(taxYear: number): ChangeItem[] {
  return [
    {
      type: 'numeric_adjustment',
      tableType: 'contribution_limits_401k',
      source: `IRS Notice ${taxYear - 1}-XX — ${taxYear} Limits`,
      effectiveDate: `${taxYear}-01-01`,
      description: `${taxYear} 401(k) elective deferral limit increased to $24,000. Catch-up (50+) remains $7,500. SECURE 2.0 super catch-up (60-63) is $11,250.`,
      newData: {
        limit: 24000,
        catchUp: 7500,
        superCatchUp: 11250,
        totalWithCatchUp: 31500,
        totalWithSuperCatchUp: 35250,
      },
      previousData: {
        limit: 23500,
        catchUp: 7500,
        superCatchUp: 11250,
        totalWithCatchUp: 31000,
        totalWithSuperCatchUp: 34750,
      },
      severity: 'medium',
      affectedTables: ['contribution_limits_401k'],
      autoApprovable: true,
    },
    {
      type: 'numeric_adjustment',
      tableType: 'contribution_limits_ira',
      source: `IRS Notice ${taxYear - 1}-XX — ${taxYear} Limits`,
      effectiveDate: `${taxYear}-01-01`,
      description: `${taxYear} IRA contribution limit remains $7,000. Catch-up (50+) remains $1,000.`,
      newData: {
        limit: 7000,
        catchUp: 1000,
        totalWithCatchUp: 8000,
      },
      previousData: {
        limit: 7000,
        catchUp: 1000,
        totalWithCatchUp: 8000,
      },
      severity: 'low',
      affectedTables: ['contribution_limits_ira'],
      autoApprovable: true,
    },
    {
      type: 'numeric_adjustment',
      tableType: 'contribution_limits_hsa',
      source: `IRS Rev Proc ${taxYear - 1}-XX — ${taxYear} HSA Limits`,
      effectiveDate: `${taxYear}-01-01`,
      description: `${taxYear} HSA limits: individual $4,300, family $8,550. Catch-up (55+) remains $1,000.`,
      newData: {
        individual: 4300,
        family: 8550,
        catchUp: 1000,
      },
      previousData: {
        individual: 4150,
        family: 8300,
        catchUp: 1000,
      },
      severity: 'low',
      affectedTables: ['contribution_limits_hsa'],
      autoApprovable: true,
    },
  ];
}

// ==================== DEMO DATA ====================

/**
 * Simulated text content of IRS Rev Proc 2026-45 announcing
 * inflation adjustments for tax year 2027.
 */
const DEMO_REV_PROC_2027 =
  'Revenue Procedure 2026-45: This revenue procedure sets forth inflation adjustment ' +
  'items for tax year 2027. The tax rate tables, standard deduction amounts, and ' +
  'certain other tax items are adjusted for cost-of-living increases. ' +
  'The applicable federal rate for determining the present value of an annuity ' +
  'and similar instruments is also updated.';

/**
 * Demo 2027 ordinary income brackets for single filers,
 * reflecting ~2.8% inflation adjustment from 2026 values.
 */
const DEMO_2027_BRACKETS_SINGLE: ScrapedTaxBracket[] = [
  { filingStatus: 'single', rate: 0.10, minIncome: 0, maxIncome: 11925, taxYear: 2027 },
  { filingStatus: 'single', rate: 0.12, minIncome: 11925, maxIncome: 48475, taxYear: 2027 },
  { filingStatus: 'single', rate: 0.22, minIncome: 48475, maxIncome: 103350, taxYear: 2027 },
  { filingStatus: 'single', rate: 0.24, minIncome: 103350, maxIncome: 197300, taxYear: 2027 },
  { filingStatus: 'single', rate: 0.32, minIncome: 197300, maxIncome: 250525, taxYear: 2027 },
  { filingStatus: 'single', rate: 0.35, minIncome: 250525, maxIncome: 626350, taxYear: 2027 },
  { filingStatus: 'single', rate: 0.37, minIncome: 626350, maxIncome: null, taxYear: 2027 },
];
