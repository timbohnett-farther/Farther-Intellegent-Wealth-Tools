/**
 * Farther Prism — SSA (Social Security Administration) Scraper
 *
 * Monitors the Social Security Administration for annual COLA
 * announcements, wage base changes, PIA bend point updates,
 * and Full Retirement Age adjustments.
 *
 * This is a stub implementation returning realistic demo data.
 * In production, replace with actual fetch calls to SSA.gov
 * pages and press releases.
 */

import type {
  ChangeItem,
  SourceCheckResult,
  ScrapedSSData,
} from '../types';

// ==================== CONSTANTS ====================

/** SSA COLA announcement page URL. */
const SSA_COLA_URL = 'https://www.ssa.gov/cola/';

/** SSA contribution and benefit base page URL. */
const SSA_WAGE_BASE_URL =
  'https://www.ssa.gov/oact/cola/cbb.html';

/** SSA PIA bend points page URL. */
const SSA_BEND_POINTS_URL =
  'https://www.ssa.gov/oact/cola/bendpoints.html';

/** SSA retirement age page URL. */
const SSA_FRA_URL =
  'https://www.ssa.gov/benefits/retirement/planner/agereduction.html';

// ==================== MAIN SCRAPER ====================

/**
 * Runs the full SSA scraper pipeline.
 *
 * 1. Checks for COLA announcement (typically announced in October).
 * 2. Checks for wage base updates (announced alongside COLA).
 * 3. Checks for bend point updates.
 * 4. Checks for FRA changes (rare — only from new legislation).
 *
 * @returns A SourceCheckResult with any detected Social Security changes.
 *
 * @example
 * ```ts
 * const result = await runSSAScraper();
 * console.log(`SSA: ${result.changesFound.length} changes detected`);
 * ```
 */
export async function runSSAScraper(): Promise<SourceCheckResult> {
  const changes: ChangeItem[] = [];
  const errors: string[] = [];
  const targetYear = new Date().getFullYear() + 1;

  // --- Step 1: Check COLA ---
  try {
    const cola = await scrapeSSCOLA(targetYear);
    if (cola) {
      changes.push({
        type: 'numeric_adjustment',
        tableType: 'ss_cola',
        source: `SSA COLA Announcement — ${targetYear}`,
        effectiveDate: `${targetYear}-01-01`,
        description:
          `${targetYear} Social Security COLA: ${(cola.colaPercentage * 100).toFixed(1)}%. ` +
          `Maximum monthly benefit at FRA: $${cola.maxMonthlyBenefitFRA.toLocaleString()}.`,
        newData: {
          year: cola.year,
          colaPercentage: cola.colaPercentage,
          maxMonthlyBenefitFRA: cola.maxMonthlyBenefitFRA,
        },
        previousData: {
          year: targetYear - 1,
          colaPercentage: 0.032,
          maxMonthlyBenefitFRA: 3822,
        },
        severity: 'medium',
        affectedTables: ['ss_cola'],
        autoApprovable: true,
      });
    }
  } catch (err) {
    errors.push(`SSA COLA check failed: ${String(err)}`);
  }

  // --- Step 2: Check wage base ---
  try {
    const wageBase = await scrapeSSWageBase(targetYear);
    if (wageBase !== null) {
      changes.push({
        type: 'numeric_adjustment',
        tableType: 'ss_wage_base',
        source: `SSA Wage Base Announcement — ${targetYear}`,
        effectiveDate: `${targetYear}-01-01`,
        description:
          `${targetYear} Social Security taxable wage base: $${wageBase.toLocaleString()}. ` +
          `Maximum employee OASDI tax: $${(wageBase * 0.062).toLocaleString()}.`,
        newData: {
          year: targetYear,
          wageBase,
          employeeRate: 0.062,
          employerRate: 0.062,
          maxEmployeeTax: wageBase * 0.062,
        },
        previousData: {
          year: targetYear - 1,
          wageBase: 168600,
          employeeRate: 0.062,
          employerRate: 0.062,
          maxEmployeeTax: 168600 * 0.062,
        },
        severity: 'medium',
        affectedTables: ['ss_wage_base'],
        autoApprovable: true,
      });
    }
  } catch (err) {
    errors.push(`SSA wage base check failed: ${String(err)}`);
  }

  // --- Step 3: Check bend points ---
  try {
    const bendPoints = await scrapeSSBendPoints(targetYear);
    if (bendPoints) {
      changes.push({
        type: 'numeric_adjustment',
        tableType: 'ss_bend_points',
        source: `SSA Bend Points — ${targetYear}`,
        effectiveDate: `${targetYear}-01-01`,
        description:
          `${targetYear} PIA bend points updated: first bend point $${bendPoints.bp1.toLocaleString()}, ` +
          `second bend point $${bendPoints.bp2.toLocaleString()}. ` +
          'PIA formula: 90% of first $' + bendPoints.bp1.toLocaleString() +
          ' + 32% up to $' + bendPoints.bp2.toLocaleString() + ' + 15% above.',
        newData: {
          year: targetYear,
          bendPoint1: bendPoints.bp1,
          bendPoint2: bendPoints.bp2,
          piaFormula: [
            { rate: 0.90, upTo: bendPoints.bp1 },
            { rate: 0.32, upTo: bendPoints.bp2 },
            { rate: 0.15, above: bendPoints.bp2 },
          ],
        },
        previousData: {
          year: targetYear - 1,
          bendPoint1: 1174,
          bendPoint2: 7078,
          piaFormula: [
            { rate: 0.90, upTo: 1174 },
            { rate: 0.32, upTo: 7078 },
            { rate: 0.15, above: 7078 },
          ],
        },
        severity: 'low',
        affectedTables: ['ss_bend_points'],
        autoApprovable: true,
      });
    }
  } catch (err) {
    errors.push(`SSA bend points check failed: ${String(err)}`);
  }

  return {
    source: 'SSA.gov',
    lastChecked: new Date().toISOString(),
    changesFound: changes,
    errors,
  };
}

// ==================== INDIVIDUAL SCRAPERS ====================

/**
 * Scrapes the SSA COLA announcement for a given year.
 *
 * In production, this fetches the SSA COLA page and parses the
 * announced percentage. This stub returns demo data for 2027.
 *
 * @param year - The benefit year to check (COLA applies to this year's benefits).
 * @returns Scraped SS data, or null if no announcement found.
 *
 * @example
 * ```ts
 * const cola = await scrapeSSCOLA(2027);
 * if (cola) console.log(`${cola.year} COLA: ${(cola.colaPercentage * 100).toFixed(1)}%`);
 * ```
 */
export async function scrapeSSCOLA(year: number): Promise<ScrapedSSData | null> {
  // In production:
  //   const page = await fetch(SSA_COLA_URL);
  //   const html = await page.text();
  //   return parseCOLAAnnouncement(html, year);
  void SSA_COLA_URL;

  if (year !== 2027) {
    return null;
  }

  return {
    year: 2027,
    colaPercentage: 0.025,
    wageBase: 174900,
    bendPoint1: 1226,
    bendPoint2: 7391,
    fullRetirementAgeMonths: 804, // 67 years, 0 months
    maxMonthlyBenefitFRA: 3917,
  };
}

/**
 * Scrapes the SSA wage base (contribution and benefit base) for a given year.
 *
 * In production, this fetches the SSA contribution and benefit base page.
 * This stub returns demo data for 2027.
 *
 * @param year - The calendar year to check.
 * @returns The wage base amount, or null if not yet announced.
 *
 * @example
 * ```ts
 * const wageBase = await scrapeSSWageBase(2027);
 * if (wageBase) console.log(`2027 wage base: $${wageBase.toLocaleString()}`);
 * ```
 */
export async function scrapeSSWageBase(year: number): Promise<number | null> {
  // In production:
  //   const page = await fetch(SSA_WAGE_BASE_URL);
  //   const html = await page.text();
  //   return parseWageBaseTable(html, year);
  void SSA_WAGE_BASE_URL;

  if (year === 2027) {
    return 174900;
  }
  return null;
}

/**
 * Scrapes the SSA PIA bend points for a given year.
 *
 * In production, this fetches the SSA bend points page.
 * This stub returns demo data for 2027.
 *
 * @param year - The calendar year for which bend points apply.
 * @returns The two bend points, or null if not yet announced.
 *
 * @example
 * ```ts
 * const bp = await scrapeSSBendPoints(2027);
 * if (bp) console.log(`Bend points: $${bp.bp1} / $${bp.bp2}`);
 * ```
 */
export async function scrapeSSBendPoints(
  year: number,
): Promise<{ bp1: number; bp2: number } | null> {
  // In production:
  //   const page = await fetch(SSA_BEND_POINTS_URL);
  //   const html = await page.text();
  //   return parseBendPointsTable(html, year);
  void SSA_BEND_POINTS_URL;
  void SSA_FRA_URL;

  if (year === 2027) {
    return { bp1: 1226, bp2: 7391 };
  }
  return null;
}
