/**
 * Tax Rules Registry
 *
 * Central registry for loading, validating, and retrieving tax rules packages.
 * Rules packages are immutable once published.
 */

import type { TaxRulesPackage, FilingStatus } from '@/types';
import { prisma } from '@/lib/prisma';
import { FEDERAL_RULES_2025_V1, computeRulesChecksum } from './federal-2025-v1';

/**
 * In-memory cache of loaded rules packages
 */
const rulesCache = new Map<string, TaxRulesPackage>();

/**
 * Registry initialization status
 */
let isInitialized = false;

/**
 * Initialize rules registry
 * Loads all published rules packages into memory
 */
export async function initializeRulesRegistry(): Promise<void> {
  if (isInitialized) {
    return;
  }

  // Load 2025 federal rules
  rulesCache.set(FEDERAL_RULES_2025_V1.rulesVersion, FEDERAL_RULES_2025_V1);

  // Load additional rules from database (if any)
  const dbRules = await (prisma as any).taxRulesPackage.findMany({
    where: { isActive: true },
  });

  for (const dbRule of dbRules) {
    const parsed = JSON.parse(dbRule.rulesJson);
    rulesCache.set(parsed.rulesVersion, parsed);
  }

  isInitialized = true;
  console.log(`[RulesRegistry] Initialized with ${rulesCache.size} rules package(s)`);
}

/**
 * Get rules package by version
 */
export async function getRulesPackage(rulesVersion: string): Promise<TaxRulesPackage | null> {
  // Ensure registry is initialized
  if (!isInitialized) {
    await initializeRulesRegistry();
  }

  // Check cache first
  if (rulesCache.has(rulesVersion)) {
    return rulesCache.get(rulesVersion)!;
  }

  // Try loading from database
  const dbRule = await (prisma as any).taxRulesPackage.findUnique({
    where: { rulesVersion },
  });

  if (dbRule && dbRule.isActive) {
    const parsed = JSON.parse(dbRule.rulesJson);
    rulesCache.set(rulesVersion, parsed);
    return parsed;
  }

  return null;
}

/**
 * Get latest published rules for a tax year
 */
export async function getLatestRulesForYear(taxYear: number): Promise<TaxRulesPackage | null> {
  if (!isInitialized) {
    await initializeRulesRegistry();
  }

  // Find in cache
  for (const rules of rulesCache.values()) {
    if (rules.taxYear === taxYear && rules.isActive) {
      return rules;
    }
  }

  // Try database
  const dbRules = await (prisma as any).taxRulesPackage.findMany({
    where: {
      taxYear,
      isActive: true,
    },
    orderBy: {
      publishedAt: 'desc',
    },
    take: 1,
  });

  if (dbRules.length > 0) {
    const parsed = JSON.parse(dbRules[0].rulesJson);
    rulesCache.set(parsed.rulesVersion, parsed);
    return parsed;
  }

  return null;
}

/**
 * Publish a new rules package
 * This persists the rules to the database and makes it available
 */
export async function publishRulesPackage(
  rules: TaxRulesPackage,
  publishedBy: string
): Promise<void> {
  // Validate rules package
  validateRulesPackage(rules);

  // Compute checksum
  const checksum = computeRulesChecksum(rules);

  // Check if version already exists
  const existing = await (prisma as any).taxRulesPackage.findUnique({
    where: { rulesVersion: rules.rulesVersion },
  });

  if (existing) {
    throw new Error(`Rules package ${rules.rulesVersion} already exists (immutable)`);
  }

  // Persist to database
  await (prisma as any).taxRulesPackage.create({
    data: {
      rulesVersion: rules.rulesVersion,
      taxYear: rules.taxYear,
      jurisdiction: rules.jurisdiction,
      rulesJson: JSON.stringify(rules),
      checksum,
      publishedAt: new Date(),
      publishedBy,
      isActive: true,
    },
  });

  // Add to cache
  rulesCache.set(rules.rulesVersion, rules);

  console.log(`[RulesRegistry] Published rules package: ${rules.rulesVersion}`);
}

/**
 * Deprecate a rules package
 * Marks it as inactive but does not delete (immutable history)
 */
export async function deprecateRulesPackage(
  rulesVersion: string,
  reason: string
): Promise<void> {
  const existing = await (prisma as any).taxRulesPackage.findUnique({
    where: { rulesVersion },
  });

  if (!existing) {
    throw new Error(`Rules package ${rulesVersion} not found`);
  }

  if (!existing.isActive) {
    throw new Error(`Rules package ${rulesVersion} is already deprecated`);
  }

  // Mark as inactive
  await (prisma as any).taxRulesPackage.update({
    where: { rulesVersion },
    data: {
      isActive: false,
      // Store deprecation reason in metadata (would need to extend schema)
    },
  });

  // Remove from cache
  rulesCache.delete(rulesVersion);

  console.log(`[RulesRegistry] Deprecated rules package: ${rulesVersion} (${reason})`);
}

/**
 * Validate rules package structure
 */
function validateRulesPackage(rules: TaxRulesPackage): void {
  const errors: string[] = [];

  // Required fields
  if (!rules.rulesVersion) errors.push('rulesVersion is required');
  if (!rules.taxYear) errors.push('taxYear is required');
  if (!rules.jurisdiction) errors.push('jurisdiction is required');

  // Validate brackets
  for (const filingStatus of Object.keys(rules.ordinaryBrackets)) {
    const brackets = (rules.ordinaryBrackets as any)[filingStatus as FilingStatus];
    if (!Array.isArray(brackets) || brackets.length === 0) {
      errors.push(`ordinaryBrackets.${filingStatus} must be a non-empty array`);
    }

    // Validate bracket order
    for (let i = 0; i < brackets.length - 1; i++) {
      if ((brackets[i] as any).upperBound && (brackets[i + 1] as any).lowerBound !== (brackets[i] as any).upperBound) {
        errors.push(
          `ordinaryBrackets.${filingStatus}: bracket ${i} upper bound must match bracket ${i + 1} lower bound`
        );
      }
    }

    // Last bracket must have null upper bound
    if ((brackets[brackets.length - 1] as any).upperBound !== null) {
      errors.push(`ordinaryBrackets.${filingStatus}: last bracket must have null upper bound`);
    }
  }

  // Validate standard deductions
  for (const filingStatus of Object.keys(rules.standardDeduction)) {
    const amount = rules.standardDeduction[filingStatus as FilingStatus];
    if (typeof amount !== 'number' || amount <= 0) {
      errors.push(`standardDeduction.${filingStatus} must be a positive number`);
    }
  }

  // Validate NIIT thresholds
  if (!rules.niit || typeof rules.niit.rate !== 'number') {
    errors.push('niit.rate is required and must be a number');
  }

  if (errors.length > 0) {
    throw new Error(`Rules package validation failed:\n${errors.join('\n')}`);
  }
}

/**
 * Get ordinary tax brackets for filing status
 */
export function getOrdinaryBrackets(
  rules: TaxRulesPackage,
  filingStatus: FilingStatus
): Array<{ lowerBound: number; upperBound: number | null; rate: number }> {
  const brackets = (rules.ordinaryBrackets as any)[filingStatus];

  if (!brackets) {
    throw new Error(`No ordinary brackets found for filing status: ${filingStatus}`);
  }

  return brackets as any;
}

/**
 * Get capital gains brackets for filing status
 */
export function getCapitalGainBrackets(
  rules: TaxRulesPackage,
  filingStatus: FilingStatus
): Array<{ lowerBound: number; upperBound: number | null; rate: number }> {
  const brackets = (rules.capitalGainBrackets as any)[filingStatus];

  if (!brackets) {
    throw new Error(`No capital gain brackets found for filing status: ${filingStatus}`);
  }

  return brackets as any;
}

/**
 * Get standard deduction for filing status
 */
export function getStandardDeduction(
  rules: TaxRulesPackage,
  filingStatus: FilingStatus,
  age65OrBlind?: { primary: boolean; spouse?: boolean }
): number {
  let deduction = rules.standardDeduction[filingStatus];

  if (!deduction) {
    throw new Error(`No standard deduction found for filing status: ${filingStatus}`);
  }

  // Add additional deduction for age 65+ or blind
  if (age65OrBlind && rules.additionalStandardDeduction) {
    const additional = rules.additionalStandardDeduction.age65OrBlind[filingStatus];

    if (age65OrBlind.primary) {
      deduction += additional;
    }

    if (age65OrBlind.spouse) {
      deduction += additional;
    }
  }

  return deduction;
}

/**
 * Get NIIT threshold for filing status
 */
export function getNIITThreshold(rules: TaxRulesPackage, filingStatus: FilingStatus): number {
  const threshold = rules.niit.thresholds[filingStatus];

  if (threshold === undefined) {
    throw new Error(`No NIIT threshold found for filing status: ${filingStatus}`);
  }

  return threshold;
}

/**
 * Get Social Security taxability thresholds
 */
export function getSocialSecurityThresholds(
  rules: TaxRulesPackage,
  filingStatus: FilingStatus
): { tier1: number; tier2: number } {
  const thresholds = rules.socialSecurityTaxability.thresholds[filingStatus];

  if (!thresholds) {
    throw new Error(`No Social Security thresholds found for filing status: ${filingStatus}`);
  }

  return thresholds;
}

/**
 * Get marginal tax rate for given taxable income
 */
export function getMarginalTaxRate(
  rules: TaxRulesPackage,
  filingStatus: FilingStatus,
  taxableIncome: number
): number {
  const brackets = getOrdinaryBrackets(rules, filingStatus);

  for (const bracket of brackets) {
    if (taxableIncome >= bracket.lowerBound) {
      if (bracket.upperBound === null || taxableIncome < bracket.upperBound) {
        return bracket.rate;
      }
    }
  }

  // Default to highest bracket
  return brackets[brackets.length - 1].rate;
}

/**
 * List all available rules packages
 */
export async function listAllRulesPackages(): Promise<
  Array<{
    rulesVersion: string;
    taxYear: number;
    jurisdiction: string;
    isActive: boolean;
    publishedAt: Date;
  }>
> {
  if (!isInitialized) {
    await initializeRulesRegistry();
  }

  const dbRules = await (prisma as any).taxRulesPackage.findMany({
    select: {
      rulesVersion: true,
      taxYear: true,
      jurisdiction: true,
      isActive: true,
      publishedAt: true,
    },
    orderBy: [{ taxYear: 'desc' }, { publishedAt: 'desc' }],
  });

  return dbRules;
}
