/**
 * AGI Composer Module
 *
 * Computes Adjusted Gross Income (AGI) by subtracting adjustments from gross income.
 * AGI is a critical milestone in the tax calculation pipeline used for:
 * - Determining eligibility for deductions and credits
 * - Calculating phaseouts
 * - Baseline for many tax computations
 *
 * Formula: AGI = Gross Income - Adjustments to Income
 */

import type { TaxCalculationModule, CalculationContext } from './module-interface';
import {
  createTraceStep,
  setIntermediate,
  markModuleExecuted,
  getIntermediate,
} from './module-interface';

export const AGIComposerModule: TaxCalculationModule = {
  moduleName: 'agi_composer',
  description: 'Calculate Adjusted Gross Income (AGI)',
  dependencies: ['income_aggregation', 'adjustments_to_income'],

  run(context: CalculationContext): CalculationContext {
    const { rules } = context;
    const stepNumber = context.traceSteps.length + 1;

    // Get gross income from income_aggregation module
    const grossIncome = getIntermediate<number>(context, 'grossIncome', 0);

    // Get adjustments from adjustments_to_income module
    const adjustmentsToIncome = getIntermediate<number>(context, 'adjustmentsToIncome', 0);
    const adjustmentsBreakdown = getIntermediate<Record<string, number>>(context, 'adjustmentsBreakdown', {});

    // Calculate AGI
    const agi = Math.max(0, grossIncome - adjustmentsToIncome);

    // Store in intermediates
    context = setIntermediate(context, 'agi', agi);

    // Create trace step
    const notes: string[] = [];
    notes.push(`Gross income: $${grossIncome.toLocaleString()}`);
    if (adjustmentsToIncome > 0) {
      notes.push(`Adjustments: $${adjustmentsToIncome.toLocaleString()}`);
      const adjustmentTypes = Object.keys(adjustmentsBreakdown);
      if (adjustmentTypes.length > 0) {
        notes.push(`  (${adjustmentTypes.length} adjustment type${adjustmentTypes.length > 1 ? 's' : ''})`);
      }
    } else {
      notes.push('No adjustments to income');
    }
    notes.push(`AGI: $${agi.toLocaleString()}`);

    const traceStep = createTraceStep(
      'agi_composer',
      stepNumber,
      `${rules.rulesVersion}:agi`,
      [
        { field: 'grossIncome', value: grossIncome },
        { field: 'adjustmentsToIncome', value: adjustmentsToIncome },
      ],
      {
        agi,
        grossIncome,
        adjustmentsToIncome,
      },
      [],
      ['income_aggregation', 'adjustments_to_income'],
      notes
    );

    context = {
      ...context,
      traceSteps: [...context.traceSteps, traceStep],
    };

    // Mark module as executed
    context = markModuleExecuted(context, 'agi_composer');

    return context;
  },
};
