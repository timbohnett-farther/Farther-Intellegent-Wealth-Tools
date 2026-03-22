/**
 * Farther Prism — CMS (Centers for Medicare & Medicaid Services) Scraper
 *
 * Monitors CMS publications for Medicare Part B premiums, IRMAA
 * bracket updates, and Part D surcharge changes. These affect
 * retirement healthcare cost projections in financial plans.
 *
 * This is a stub implementation returning realistic demo data.
 * In production, replace with actual fetch calls to CMS.gov
 * pages and press releases.
 */

import type {
  ChangeItem,
  SourceCheckResult,
  ScrapedIRMAAbracket,
} from '../types';

// ==================== CONSTANTS ====================

/** CMS Medicare premiums announcement page. */
const CMS_PREMIUMS_URL =
  'https://www.cms.gov/newsroom/fact-sheets/medicare-parts-b-premiums-and-deductibles';

/** CMS IRMAA tables page. */
const CMS_IRMAA_URL =
  'https://www.cms.gov/medicare/costs/medicare-premium-adjustment';

// ==================== MAIN SCRAPER ====================

/**
 * Runs the full CMS scraper pipeline.
 *
 * 1. Checks for Part B premium updates (announced annually, usually November).
 * 2. Checks for IRMAA bracket updates (tied to Part B announcement).
 * 3. Checks for Part D IRMAA surcharges.
 *
 * @returns A SourceCheckResult with any detected Medicare changes.
 *
 * @example
 * ```ts
 * const result = await runCMSScraper();
 * console.log(`CMS: ${result.changesFound.length} changes detected`);
 * ```
 */
export async function runCMSScraper(): Promise<SourceCheckResult> {
  const changes: ChangeItem[] = [];
  const errors: string[] = [];
  const targetYear = new Date().getFullYear() + 1;

  // --- Step 1: Check Part B premium ---
  try {
    const partB = await scrapePartBPremium(targetYear);
    if (partB !== null) {
      changes.push({
        type: 'numeric_adjustment',
        tableType: 'irmaa_part_b',
        source: `CMS Part B Premium Announcement — ${targetYear}`,
        effectiveDate: `${targetYear}-01-01`,
        description:
          `${targetYear} Medicare Part B standard monthly premium: $${partB.standardPremium.toFixed(2)}. ` +
          `Annual deductible: $${partB.annualDeductible.toFixed(2)}.`,
        newData: {
          year: targetYear,
          standardMonthlyPremium: partB.standardPremium,
          annualDeductible: partB.annualDeductible,
        },
        previousData: {
          year: targetYear - 1,
          standardMonthlyPremium: 174.70,
          annualDeductible: 240.0,
        },
        severity: 'medium',
        affectedTables: ['irmaa_part_b'],
        autoApprovable: true,
      });
    }
  } catch (err) {
    errors.push(`CMS Part B premium check failed: ${String(err)}`);
  }

  // --- Step 2: Check IRMAA Part B brackets ---
  try {
    const irmaaBrackets = await scrapeIRMAAbrackets(targetYear);
    if (irmaaBrackets.length > 0) {
      const partBBrackets = irmaaBrackets.filter((b) => b.part === 'B');
      const partDBrackets = irmaaBrackets.filter((b) => b.part === 'D');

      if (partBBrackets.length > 0) {
        changes.push({
          type: 'numeric_adjustment',
          tableType: 'irmaa_part_b',
          source: `CMS IRMAA Part B Brackets — ${targetYear}`,
          effectiveDate: `${targetYear}-01-01`,
          description:
            `${targetYear} IRMAA Part B brackets updated. ${partBBrackets.length} bracket tiers ` +
            `for single filers. Top tier (MAGI > $${(partBBrackets[partBBrackets.length - 1].magiMin).toLocaleString()}): ` +
            `$${partBBrackets[partBBrackets.length - 1].monthlyPremium.toFixed(2)}/mo.`,
          newData: {
            year: targetYear,
            brackets: partBBrackets.map((b) => ({
              filingStatus: b.filingStatus,
              magiMin: b.magiMin,
              magiMax: b.magiMax,
              monthlyPremium: b.monthlyPremium,
            })),
          },
          previousData: null,
          severity: 'medium',
          affectedTables: ['irmaa_part_b'],
          autoApprovable: true,
        });
      }

      if (partDBrackets.length > 0) {
        changes.push({
          type: 'numeric_adjustment',
          tableType: 'irmaa_part_d',
          source: `CMS IRMAA Part D Brackets — ${targetYear}`,
          effectiveDate: `${targetYear}-01-01`,
          description:
            `${targetYear} IRMAA Part D surcharge brackets updated. ${partDBrackets.length} tiers.`,
          newData: {
            year: targetYear,
            brackets: partDBrackets.map((b) => ({
              filingStatus: b.filingStatus,
              magiMin: b.magiMin,
              magiMax: b.magiMax,
              monthlyPremium: b.monthlyPremium,
            })),
          },
          previousData: null,
          severity: 'low',
          affectedTables: ['irmaa_part_d'],
          autoApprovable: true,
        });
      }
    }
  } catch (err) {
    errors.push(`CMS IRMAA bracket check failed: ${String(err)}`);
  }

  return {
    source: 'CMS.gov',
    lastChecked: new Date().toISOString(),
    changesFound: changes,
    errors,
  };
}

// ==================== INDIVIDUAL SCRAPERS ====================

/**
 * Scrapes IRMAA brackets for a given year from CMS publications.
 *
 * In production, this fetches the CMS IRMAA page and parses the
 * bracket tables. This stub returns demo data for 2027.
 *
 * @param year - The benefit year to check.
 * @returns Array of IRMAA brackets (both Part B and Part D).
 *
 * @example
 * ```ts
 * const brackets = await scrapeIRMAAbrackets(2027);
 * const partB = brackets.filter(b => b.part === 'B');
 * ```
 */
export async function scrapeIRMAAbrackets(
  year: number,
): Promise<ScrapedIRMAAbracket[]> {
  // In production:
  //   const page = await fetch(CMS_IRMAA_URL);
  //   const html = await page.text();
  //   return parseIRMAATable(html, year);
  void CMS_IRMAA_URL;

  if (year !== 2027) {
    return [];
  }

  return DEMO_IRMAA_BRACKETS_2027;
}

/**
 * Scrapes the standard Part B monthly premium for a given year.
 *
 * In production, this fetches the CMS premiums page and extracts
 * the standard premium amount. This stub returns demo data for 2027.
 *
 * @param year - The benefit year to check.
 * @returns Premium data, or null if not yet announced.
 *
 * @example
 * ```ts
 * const premium = await scrapePartBPremium(2027);
 * if (premium) console.log(`Part B: $${premium.standardPremium}/mo`);
 * ```
 */
export async function scrapePartBPremium(
  year: number,
): Promise<{ standardPremium: number; annualDeductible: number } | null> {
  // In production:
  //   const page = await fetch(CMS_PREMIUMS_URL);
  //   const html = await page.text();
  //   return parsePartBPremium(html, year);
  void CMS_PREMIUMS_URL;

  if (year === 2027) {
    return {
      standardPremium: 185.0,
      annualDeductible: 257.0,
    };
  }
  return null;
}

// ==================== DEMO DATA ====================

/**
 * Demo IRMAA brackets for 2027, based on 2025 MAGI (2-year lookback).
 * Brackets reflect ~2.5% inflation adjustment from 2026 values.
 */
const DEMO_IRMAA_BRACKETS_2027: ScrapedIRMAAbracket[] = [
  // Part B — Single filers
  { part: 'B', filingStatus: 'single', magiMin: 0, magiMax: 106000, monthlyPremium: 185.0, taxYear: 2027 },
  { part: 'B', filingStatus: 'single', magiMin: 106000, magiMax: 133000, monthlyPremium: 259.0, taxYear: 2027 },
  { part: 'B', filingStatus: 'single', magiMin: 133000, magiMax: 167000, monthlyPremium: 370.0, taxYear: 2027 },
  { part: 'B', filingStatus: 'single', magiMin: 167000, magiMax: 200000, monthlyPremium: 480.9, taxYear: 2027 },
  { part: 'B', filingStatus: 'single', magiMin: 200000, magiMax: 500000, monthlyPremium: 591.9, taxYear: 2027 },
  { part: 'B', filingStatus: 'single', magiMin: 500000, magiMax: null, monthlyPremium: 628.9, taxYear: 2027 },

  // Part B — Married filing jointly
  { part: 'B', filingStatus: 'married_filing_jointly', magiMin: 0, magiMax: 212000, monthlyPremium: 185.0, taxYear: 2027 },
  { part: 'B', filingStatus: 'married_filing_jointly', magiMin: 212000, magiMax: 266000, monthlyPremium: 259.0, taxYear: 2027 },
  { part: 'B', filingStatus: 'married_filing_jointly', magiMin: 266000, magiMax: 334000, monthlyPremium: 370.0, taxYear: 2027 },
  { part: 'B', filingStatus: 'married_filing_jointly', magiMin: 334000, magiMax: 400000, monthlyPremium: 480.9, taxYear: 2027 },
  { part: 'B', filingStatus: 'married_filing_jointly', magiMin: 400000, magiMax: 750000, monthlyPremium: 591.9, taxYear: 2027 },
  { part: 'B', filingStatus: 'married_filing_jointly', magiMin: 750000, magiMax: null, monthlyPremium: 628.9, taxYear: 2027 },

  // Part D — Single filers
  { part: 'D', filingStatus: 'single', magiMin: 0, magiMax: 106000, monthlyPremium: 0, taxYear: 2027 },
  { part: 'D', filingStatus: 'single', magiMin: 106000, magiMax: 133000, monthlyPremium: 13.7, taxYear: 2027 },
  { part: 'D', filingStatus: 'single', magiMin: 133000, magiMax: 167000, monthlyPremium: 35.3, taxYear: 2027 },
  { part: 'D', filingStatus: 'single', magiMin: 167000, magiMax: 200000, monthlyPremium: 57.0, taxYear: 2027 },
  { part: 'D', filingStatus: 'single', magiMin: 200000, magiMax: 500000, monthlyPremium: 78.6, taxYear: 2027 },
  { part: 'D', filingStatus: 'single', magiMin: 500000, magiMax: null, monthlyPremium: 85.8, taxYear: 2027 },

  // Part D — Married filing jointly
  { part: 'D', filingStatus: 'married_filing_jointly', magiMin: 0, magiMax: 212000, monthlyPremium: 0, taxYear: 2027 },
  { part: 'D', filingStatus: 'married_filing_jointly', magiMin: 212000, magiMax: 266000, monthlyPremium: 13.7, taxYear: 2027 },
  { part: 'D', filingStatus: 'married_filing_jointly', magiMin: 266000, magiMax: 334000, monthlyPremium: 35.3, taxYear: 2027 },
  { part: 'D', filingStatus: 'married_filing_jointly', magiMin: 334000, magiMax: 400000, monthlyPremium: 57.0, taxYear: 2027 },
  { part: 'D', filingStatus: 'married_filing_jointly', magiMin: 400000, magiMax: 750000, monthlyPremium: 78.6, taxYear: 2027 },
  { part: 'D', filingStatus: 'married_filing_jointly', magiMin: 750000, magiMax: null, monthlyPremium: 85.8, taxYear: 2027 },
];
