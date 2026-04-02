/**
 * Tax Engine Adapter — Phase 5A
 *
 * Wraps Phase 3 tax engine orchestrator for scenario calculations.
 * Transforms OrchestrationResult → TaxOutput (UI-friendly format).
 * Persists results and emits events.
 */

import { TaxInputSnapshot, TaxRulesPackage, TaxOutput } from '@/types/tax-engine';
import { runTaxCalculation, OrchestrationResult } from '@/lib/tax-engine/modules/orchestrator';
import { getIntermediate } from '@/lib/tax-engine/modules/module-interface';
import { ScenarioSnapshot } from './snapshot-builder';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

// ==================== TYPES ====================

export interface ScenarioCalculationResult {
  scenarioRunId: string;
  taxOutput: TaxOutput;
  warnings: string[];
  trace: any;
  computeTimeMs: number;
}

// ==================== TAX ENGINE ADAPTER ====================

/**
 * Calculate scenario using Phase 3 tax engine
 *
 * @param scenarioSnapshot - Scenario snapshot with overrides applied
 * @param scenarioId - Scenario ID for tracking
 * @returns ScenarioCalculationResult with tax output and metadata
 */
export async function calculateScenario(
  scenarioSnapshot: ScenarioSnapshot,
  scenarioId: string
): Promise<ScenarioCalculationResult> {
  const startTime = Date.now();

  try {
    // Step 1: Load active tax rules for the tax year
    const rules = await loadTaxRules(scenarioSnapshot.taxYear);

    // Step 2: Invoke Phase 3 orchestrator
    const orchestrationResult = await runTaxCalculation(scenarioSnapshot, rules);

    // Step 3: Transform OrchestrationResult → TaxOutput (UI-friendly)
    const taxOutput = transformToTaxOutput(
      orchestrationResult,
      scenarioSnapshot,
      rules.rulesVersion
    );

    // Step 4: Generate run ID
    const scenarioRunId = `run_${scenarioId}_${Date.now()}`;

    // Step 5: Persist calculation run to database
    await persistCalculationRun({
      runId: scenarioRunId,
      scenarioId,
      snapshotId: scenarioSnapshot.snapshotId,
      taxYear: scenarioSnapshot.taxYear,
      taxOutput,
      intermediates: orchestrationResult.context.intermediates,
      trace: orchestrationResult.context.traceSteps,
      warnings: orchestrationResult.context.warnings,
      unsupportedItems: orchestrationResult.context.unsupportedItems,
      executionOrder: orchestrationResult.executionOrder,
      computeTimeMs: orchestrationResult.totalComputeTimeMs,
    });

    // Step 6: Calculate total compute time
    const totalComputeTimeMs = Date.now() - startTime;

    // Step 7: Return result
    return {
      scenarioRunId,
      taxOutput,
      warnings: orchestrationResult.context.warnings.map((w) => w.message),
      trace: orchestrationResult.context.traceSteps,
      computeTimeMs: totalComputeTimeMs,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Tax calculation failed: ${message}`);
  }
}

// ==================== HELPER FUNCTIONS ====================

/**
 * Load active tax rules for a given tax year
 */
async function loadTaxRules(taxYear: number): Promise<TaxRulesPackage> {
  const rules = await prisma.taxRulesPackage.findFirst({
    where: {
      taxYear,
      isActive: true,
    },
  });

  if (!rules) {
    throw new Error(`No active tax rules found for tax year ${taxYear}`);
  }

  // Parse complete rules JSON
  const parsedRules = JSON.parse(rules.rulesJson as string);

  return {
    ...parsedRules,
    id: rules.id,
    rulesVersion: rules.rulesVersion,
    taxYear: rules.taxYear,
    jurisdiction: rules.jurisdiction,
    isActive: rules.isActive,
  } as TaxRulesPackage;
}

/**
 * Transform OrchestrationResult to UI-friendly TaxOutput format
 */
function transformToTaxOutput(
  result: OrchestrationResult,
  snapshot: TaxInputSnapshot,
  rulesVersion: string
): TaxOutput {
  const ctx = result.context;
  const intermediates = ctx.intermediates;

  // Extract key values from intermediates
  const agi = getIntermediate<number>(ctx, 'agi', 0);
  const taxableIncome = getIntermediate<number>(ctx, 'taxableIncome', 0);
  const ordinaryIncomeTax = getIntermediate<number>(ctx, 'ordinaryIncomeTax', 0);
  const capitalGainsTax = getIntermediate<number>(ctx, 'capitalGainsTax', 0);
  const niit = getIntermediate<number>(ctx, 'niit', 0);
  const totalTaxBeforeCredits = getIntermediate<number>(ctx, 'totalTaxBeforeCredits', 0);
  const totalCredits = getIntermediate<number>(ctx, 'totalCredits', 0);
  const taxAfterCredits = getIntermediate<number>(ctx, 'taxAfterCredits', 0);
  const totalPayments = getIntermediate<number>(ctx, 'totalPayments', 0);
  const refund = getIntermediate<number>(ctx, 'refund', 0);
  const taxDue = getIntermediate<number>(ctx, 'taxDue', 0);
  const totalIncome = getIntermediate<number>(ctx, 'totalIncome', 0);
  const adjustments = getIntermediate<number>(ctx, 'adjustments', 0);
  const standardDeduction = getIntermediate<number>(ctx, 'standardDeduction', 0);
  const itemizedDeduction = getIntermediate<number>(ctx, 'itemizedDeduction', 0);
  const deductionMethod = getIntermediate<string>(ctx, 'deductionMethod', 'standard');
  const qbiDeduction = getIntermediate<number>(ctx, 'qbiDeduction', 0);
  const ordinaryTaxableIncome = getIntermediate<number>(ctx, 'ordinaryTaxableIncome', 0);
  const preferentialIncome = getIntermediate<number>(ctx, 'preferentialIncome', 0);
  const childTaxCredit = getIntermediate<number>(ctx, 'childTaxCredit', 0);
  const otherCredits = getIntermediate<number>(ctx, 'otherCredits', 0);
  const federalTaxWithheld = getIntermediate<number>(ctx, 'federalTaxWithheld', 0);
  const estimatedTaxPayments = getIntermediate<number>(ctx, 'estimatedTaxPayments', 0);
  const marginalTaxRate = getIntermediate<number>(ctx, 'marginalTaxRate', 0);

  // Calculate effective tax rate
  const effectiveTaxRate =
    agi > 0 ? Math.round((totalTaxBeforeCredits / agi) * 10000) / 100 : 0;

  // Calculate refund or balance due
  const refundOrBalanceDue = taxDue > 0 ? -taxDue : refund;

  // Generate output hash
  const outputHash = generateOutputHash({
    agi,
    taxableIncome,
    totalTax: taxAfterCredits,
    refundOrBalanceDue,
  });

  return {
    runId: `run_temp_${Date.now()}`, // Will be replaced with actual runId
    snapshotId: snapshot.snapshotId,
    householdId: snapshot.householdId,
    taxYear: snapshot.taxYear,
    filingStatus: snapshot.filingStatus,
    rulesVersion,
    runType: 'scenario',

    summary: {
      agi,
      taxableIncome,
      ordinaryIncomePortion: ordinaryTaxableIncome,
      preferentialIncomePortion: preferentialIncome,
      ordinaryIncomeTax,
      preferentialIncomeTax: capitalGainsTax,
      niit,
      totalTax: taxAfterCredits,
      paymentsTotal: totalPayments,
      refundOrBalanceDue,
      effectiveTaxRate,
      marginalTaxRate,
    },

    incomeBreakdown: {
      totalIncome,
      adjustments,
      agi,
    },

    deductionBreakdown: {
      standardDeduction,
      itemizedDeduction,
      deductionMethod: deductionMethod as 'standard' | 'itemized',
      qualifiedBusinessIncomeDeduction: qbiDeduction,
    },

    taxCalculation: {
      ordinaryTaxableIncome,
      ordinaryIncomeTax,
      preferentialIncome,
      preferentialIncomeTax: capitalGainsTax,
      subtotal: totalTaxBeforeCredits,
      niit,
      amt: 0, // TODO: Extract from intermediates when AMT module is implemented
      total: taxAfterCredits,
    },

    credits: {
      childTaxCredit,
      otherCredits,
      total: totalCredits,
    },

    payments: {
      withheld: federalTaxWithheld,
      estimated: estimatedTaxPayments,
      otherPayments: 0,
      total: totalPayments,
    },

    warnings: ctx.warnings.map((w) => w.message),
    computeTimeMs: result.totalComputeTimeMs,
    outputHash,
    createdAt: new Date(),
  };
}

/**
 * Persist calculation run to database
 */
async function persistCalculationRun(params: {
  runId: string;
  scenarioId: string;
  snapshotId: string;
  taxYear: number;
  taxOutput: TaxOutput;
  intermediates: Record<string, any>;
  trace: any[];
  warnings: any[];
  unsupportedItems: any[];
  executionOrder: string[];
  computeTimeMs: number;
}): Promise<void> {
  // @ts-expect-error - TaxCalculationRun model added in Phase 5A migration
  await prisma.taxCalculationRun.create({
    data: {
      id: params.runId,
      scenarioId: params.scenarioId,
      snapshotId: params.snapshotId,
      taxYear: params.taxYear,
      runType: 'scenario',
      taxOutputJson: JSON.stringify(params.taxOutput),
      intermediatesJson: JSON.stringify(params.intermediates),
      traceJson: JSON.stringify(params.trace),
      warningsJson: JSON.stringify(params.warnings),
      unsupportedItemsJson: JSON.stringify(params.unsupportedItems),
      executionOrder: JSON.stringify(params.executionOrder),
      computeTimeMs: params.computeTimeMs,
    },
  });
}

/**
 * Generate deterministic output hash (SHA-256)
 */
function generateOutputHash(output: {
  agi: number;
  taxableIncome: number;
  totalTax: number;
  refundOrBalanceDue: number;
}): string {
  const canonical = `${output.agi}|${output.taxableIncome}|${output.totalTax}|${output.refundOrBalanceDue}`;
  return crypto.createHash('sha256').update(canonical).digest('hex');
}
