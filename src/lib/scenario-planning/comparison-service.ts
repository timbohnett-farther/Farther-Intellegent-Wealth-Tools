/**
 * Scenario Comparison Service
 *
 * Handles comparing baseline and scenario tax calculations.
 * Generates side-by-side comparison views with deltas and interpretations.
 */

import { prisma } from '@/lib/prisma';
import type {
  CompareScenariosRequest,
  ScenarioComparison,
  ScenarioComparisonPayload,
  ComparisonSummaryCard,
  ComparisonRow,
  ComparisonFieldConfig,
  ComparisonConfig,
} from '@/types/scenario-planning';

// ==================== COMPARISON FIELD CONFIGURATION ====================

/**
 * Fields to compare between baseline and scenarios
 */
export const COMPARISON_FIELDS: ComparisonFieldConfig[] = [
  // Income
  { field: 'wages', label: 'Wages', format: 'currency', significance: (delta) => Math.abs(delta || 0) > 10000 ? 'high' : 'low' },
  { field: 'interestIncome', label: 'Interest Income', format: 'currency' },
  { field: 'dividendIncome', label: 'Dividend Income', format: 'currency' },
  { field: 'capitalGains', label: 'Capital Gains', format: 'currency', significance: (delta) => Math.abs(delta || 0) > 5000 ? 'high' : 'medium' },
  { field: 'businessIncome', label: 'Business Income', format: 'currency' },
  { field: 'rentalIncome', label: 'Rental Income', format: 'currency' },
  { field: 'iraDistributions', label: 'IRA Distributions', format: 'currency', significance: (delta) => Math.abs(delta || 0) > 10000 ? 'high' : 'medium' },
  { field: 'socialSecurity', label: 'Social Security', format: 'currency' },

  // Adjusted Gross Income
  { field: 'agi', label: 'Adjusted Gross Income (AGI)', format: 'currency', significance: (delta) => Math.abs(delta || 0) > 10000 ? 'high' : 'medium' },

  // Deductions
  { field: 'deductionMethod', label: 'Deduction Method', format: 'string', significance: () => 'high' },
  { field: 'standardDeduction', label: 'Standard Deduction', format: 'currency' },
  { field: 'itemizedDeductions', label: 'Itemized Deductions', format: 'currency' },
  { field: 'totalDeductions', label: 'Total Deductions', format: 'currency', significance: (delta) => Math.abs(delta || 0) > 5000 ? 'high' : 'medium' },

  // Taxable Income
  { field: 'taxableIncome', label: 'Taxable Income', format: 'currency', significance: (delta) => Math.abs(delta || 0) > 10000 ? 'high' : 'medium' },

  // Tax Calculations
  { field: 'ordinaryTax', label: 'Ordinary Tax', format: 'currency', significance: (delta) => Math.abs(delta || 0) > 1000 ? 'high' : 'medium' },
  { field: 'preferentialTax', label: 'Preferential Rate Tax', format: 'currency', significance: (delta) => Math.abs(delta || 0) > 1000 ? 'high' : 'medium' },
  { field: 'niit', label: 'Net Investment Income Tax (NIIT)', format: 'currency', significance: (delta) => Math.abs(delta || 0) > 500 ? 'high' : 'medium' },
  { field: 'totalTax', label: 'Total Tax', format: 'currency', significance: (delta) => Math.abs(delta || 0) > 1000 ? 'high' : 'medium' },

  // Payments
  { field: 'withholdingTotal', label: 'Total Withholding', format: 'currency' },
  { field: 'estimatedPaymentsTotal', label: 'Estimated Payments', format: 'currency' },
  { field: 'totalPayments', label: 'Total Payments', format: 'currency' },

  // Refund/Balance Due
  { field: 'refundOrBalanceDue', label: 'Refund / (Balance Due)', format: 'currency', significance: (delta) => Math.abs(delta || 0) > 1000 ? 'high' : 'medium' },

  // Rates
  { field: 'effectiveTaxRate', label: 'Effective Tax Rate', format: 'percentage', significance: (delta) => Math.abs(delta || 0) > 0.01 ? 'high' : 'medium' },
  { field: 'marginalTaxRate', label: 'Marginal Tax Rate', format: 'percentage', significance: (delta) => Math.abs(delta || 0) > 0.01 ? 'high' : 'medium' },
];

/**
 * Summary cards to show at top of comparison
 */
export const SUMMARY_CARDS = [
  'agi',
  'taxableIncome',
  'totalTax',
  'refundOrBalanceDue',
  'effectiveTaxRate',
];

// ==================== COMPARISON GENERATION ====================

/**
 * Compare scenarios
 *
 * Generates a comparison view between baseline and one or more scenarios
 *
 * @param request Comparison request
 * @param createdBy User ID
 * @returns Comparison payload
 */
export async function compareScenarios(
  request: CompareScenariosRequest,
  createdBy: string
): Promise<ScenarioComparison> {
  // Fetch baseline scenario
  const baselineScenario = await prisma.planningScenario.findUnique({
    where: { id: request.baselineScenarioId },
  });

  if (!baselineScenario) {
    throw new Error(`Baseline scenario ${request.baselineScenarioId} not found`);
  }

  // Fetch comparison scenarios
  const comparisonScenarios = await prisma.planningScenario.findMany({
    where: {
      id: { in: request.comparisonScenarioIds },
    },
  });

  if (comparisonScenarios.length !== request.comparisonScenarioIds.length) {
    throw new Error('One or more comparison scenarios not found');
  }

  // Load tax calculation outputs for baseline and scenarios
  // Note: This would integrate with Phase 3 tax calculation system
  const baselineOutput = await loadTaxOutput(baselineScenario.baselineRunId);
  const comparisonOutputs = await Promise.all(
    comparisonScenarios.map(s => loadTaxOutput(s.scenarioRunId))
  );

  // Generate comparison payload
  const comparisonPayload = generateComparisonPayload({
    baselineRunId: baselineScenario.baselineRunId,
    baselineOutput,
    comparisonRunIds: comparisonScenarios.map(s => s.scenarioRunId),
    comparisonOutputs,
    householdId: request.householdId,
    taxYear: request.taxYear,
  });

  // Save comparison
  const comparison = await prisma.scenarioComparison.create({
    data: {
      householdId: request.householdId,
      taxYear: request.taxYear,
      baselineScenarioId: request.baselineScenarioId,
      comparisonScenarioIds: JSON.stringify(request.comparisonScenarioIds),
      comparisonPayloadJson: JSON.stringify(comparisonPayload),
      interpretationNotes: JSON.stringify(comparisonPayload.interpretationNotes),
      warnings: JSON.stringify(comparisonPayload.warnings),
      createdBy,
    },
  });

  return parseScenarioComparison(comparison);
}

/**
 * Generate comparison payload
 */
function generateComparisonPayload(params: {
  baselineRunId: string;
  baselineOutput: any;
  comparisonRunIds: string[];
  comparisonOutputs: any[];
  householdId: string;
  taxYear: number;
}): ScenarioComparisonPayload {
  const { baselineRunId, baselineOutput, comparisonRunIds, comparisonOutputs, householdId, taxYear } = params;

  // Generate summary cards
  const summaryCards: ComparisonSummaryCard[] = SUMMARY_CARDS.map(field => {
    const fieldConfig = COMPARISON_FIELDS.find(f => f.field === field);

    return {
      label: fieldConfig?.label || field,
      baselineValue: extractFieldValue(baselineOutput, field),
      comparisonValues: comparisonOutputs.map((output, index) => ({
        runId: comparisonRunIds[index],
        value: extractFieldValue(output, field),
        delta: calculateDelta(
          extractFieldValue(baselineOutput, field),
          extractFieldValue(output, field)
        ),
      })),
    };
  });

  // Generate row comparisons
  const rowComparisons: ComparisonRow[] = COMPARISON_FIELDS.map(fieldConfig => {
    const baselineValue = extractFieldValue(baselineOutput, fieldConfig.field);

    const comparisonValues = comparisonOutputs.map((output, index) => {
      const value = extractFieldValue(output, fieldConfig.field);
      const delta = calculateDelta(baselineValue, value);

      return {
        runId: comparisonRunIds[index],
        value,
        delta,
      };
    });

    // Determine significance
    const maxDelta = Math.max(...comparisonValues.map(cv => Math.abs(cv.delta || 0)));
    const significance = fieldConfig.significance
      ? fieldConfig.significance(maxDelta)
      : (maxDelta > 0 ? 'medium' : 'low');

    return {
      field: fieldConfig.field,
      label: fieldConfig.label,
      baselineValue,
      comparisonValues,
      significance,
    };
  });

  // Generate interpretation notes
  const interpretationNotes = generateInterpretationNotes(rowComparisons);

  // Generate warnings
  const warnings = generateWarnings(rowComparisons);

  return {
    comparisonId: `comp_${Date.now()}`,
    householdId,
    taxYear,
    baselineRunId,
    comparisonRunIds,
    summaryCards,
    rowComparisons,
    interpretationNotes,
    warnings,
  };
}

/**
 * Extract field value from tax output
 */
function extractFieldValue(output: any, field: string): any {
  if (!output) return null;

  // Handle nested paths
  const parts = field.split('.');
  let value = output;

  for (const part of parts) {
    if (value === null || value === undefined) return null;
    value = value[part];
  }

  return value !== undefined ? value : null;
}

/**
 * Calculate delta between baseline and comparison
 */
function calculateDelta(baselineValue: any, comparisonValue: any): number | null {
  if (typeof baselineValue !== 'number' || typeof comparisonValue !== 'number') {
    return null;
  }

  return comparisonValue - baselineValue;
}

/**
 * Generate interpretation notes from comparison
 */
function generateInterpretationNotes(rowComparisons: ComparisonRow[]): string[] {
  const notes: string[] = [];

  // Find significant changes
  const significantChanges = rowComparisons.filter(row => row.significance === 'high');

  for (const change of significantChanges) {
    const firstComparison = change.comparisonValues[0];
    if (!firstComparison || firstComparison.delta === null) continue;

    const delta = firstComparison.delta;
    const direction = delta > 0 ? 'increases' : 'decreases';
    const absValue = Math.abs(delta);

    if (change.field === 'totalTax') {
      notes.push(
        `Total tax ${direction} by $${absValue.toLocaleString()} (${((delta / (change.baselineValue as number || 1)) * 100).toFixed(1)}%)`
      );
    } else if (change.field === 'agi') {
      notes.push(
        `AGI ${direction} by $${absValue.toLocaleString()}`
      );
    } else if (change.field === 'refundOrBalanceDue') {
      const baseline = change.baselineValue as number || 0;
      const comparison = baseline + delta;

      if (baseline >= 0 && comparison < 0) {
        notes.push(`Scenario changes from refund to balance due`);
      } else if (baseline < 0 && comparison >= 0) {
        notes.push(`Scenario changes from balance due to refund`);
      }
    } else if (change.field === 'deductionMethod') {
      if (change.baselineValue !== firstComparison.value) {
        notes.push(`Deduction method changes from ${change.baselineValue} to ${firstComparison.value}`);
      }
    }
  }

  return notes;
}

/**
 * Generate warnings from comparison
 */
function generateWarnings(rowComparisons: ComparisonRow[]): string[] {
  const warnings: string[] = [];

  // Check for IRMAA threshold crossings
  const agi = rowComparisons.find(r => r.field === 'agi');
  if (agi && agi.comparisonValues[0]?.delta) {
    const agiValue = (agi.baselineValue as number || 0) + agi.comparisonValues[0].delta;

    // IRMAA thresholds for 2025 (married filing jointly)
    const irmaThresholds = [206000, 258000, 322000, 386000, 750000];

    for (const threshold of irmaThresholds) {
      if (agiValue > threshold && (agi.baselineValue as number || 0) <= threshold) {
        warnings.push(`Scenario crosses IRMAA threshold at $${threshold.toLocaleString()}`);
      }
    }
  }

  // Check for marginal rate changes
  const marginalRate = rowComparisons.find(r => r.field === 'marginalTaxRate');
  if (marginalRate && marginalRate.comparisonValues[0]?.delta) {
    const delta = marginalRate.comparisonValues[0].delta;
    if (Math.abs(delta) >= 0.01) {
      warnings.push(`Marginal tax rate changes by ${(delta * 100).toFixed(1)}%`);
    }
  }

  return warnings;
}

/**
 * Load tax output from calculation run
 *
 * Note: This is a placeholder. Would integrate with Phase 3 tax calculation system.
 */
async function loadTaxOutput(runId: string): Promise<any> {
  // TODO: Integrate with Phase 3 calculation run system
  // For now, return mock data
  return {
    wages: 150000,
    interestIncome: 500,
    dividendIncome: 2000,
    capitalGains: 5000,
    iraDistributions: 0,
    agi: 157500,
    deductionMethod: 'standard',
    standardDeduction: 29200,
    itemizedDeductions: 0,
    totalDeductions: 29200,
    taxableIncome: 128300,
    ordinaryTax: 20500,
    preferentialTax: 750,
    niit: 380,
    totalTax: 21630,
    withholdingTotal: 22000,
    estimatedPaymentsTotal: 0,
    totalPayments: 22000,
    refundOrBalanceDue: 370,
    effectiveTaxRate: 0.1374,
    marginalTaxRate: 0.22,
  };
}

/**
 * Parse Prisma comparison to ScenarioComparison type
 */
function parseScenarioComparison(comparison: any): ScenarioComparison {
  return {
    id: comparison.id,
    householdId: comparison.householdId,
    taxYear: comparison.taxYear,
    baselineScenarioId: comparison.baselineScenarioId,
    comparisonScenarioIds: JSON.parse(comparison.comparisonScenarioIds),
    comparisonPayload: JSON.parse(comparison.comparisonPayloadJson),
    interpretationNotes: comparison.interpretationNotes ? JSON.parse(comparison.interpretationNotes) : undefined,
    warnings: comparison.warnings ? JSON.parse(comparison.warnings) : undefined,
    createdBy: comparison.createdBy,
    createdAt: comparison.createdAt,
  };
}

/**
 * Get comparison by ID
 */
export async function getComparison(comparisonId: string): Promise<ScenarioComparison | null> {
  const comparison = await prisma.scenarioComparison.findUnique({
    where: { id: comparisonId },
  });

  if (!comparison) return null;

  return parseScenarioComparison(comparison);
}

/**
 * List comparisons for household
 */
export async function listComparisons(householdId: string, taxYear?: number): Promise<ScenarioComparison[]> {
  const where: any = { householdId };
  if (taxYear) where.taxYear = taxYear;

  const comparisons = await prisma.scenarioComparison.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });

  return comparisons.map(parseScenarioComparison);
}
