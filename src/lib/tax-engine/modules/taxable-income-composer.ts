/**
 * Taxable Income Composer Module
 *
 * Calculates taxable income, the base for tax liability calculation.
 *
 * Formula: Taxable Income = AGI - Deductions - QBI Deduction
 *
 * Taxable income cannot be negative (carried forward as NOL in future years).
 */

import type { TaxCalculationModule, CalculationContext } from './module-interface';
import {
  createTraceStep,
  setIntermediate,
  markModuleExecuted,
  getIntermediate,
} from './module-interface';

export const TaxableIncomeComposerModule: TaxCalculationModule = {
  moduleName: 'taxable_income_composer',
  description: 'Calculate taxable income (AGI - deductions - QBI)',
  dependencies: ['agi_composer', 'deduction_chooser', 'qbi_deduction'],

  run(context: CalculationContext): CalculationContext {
    const { rules } = context;
    const stepNumber = context.traceSteps.length + 1;

    // Get AGI from agi_composer module
    const agi = getIntermediate<number>(context, 'agi', 0);

    // Get deductions from deduction_chooser module
    const totalDeduction = getIntermediate<number>(context, 'totalDeduction', 0);
    const deductionType = getIntermediate<string>(context, 'deductionType', 'standard');

    // Get QBI deduction from qbi_deduction module
    const qbiDeduction = getIntermediate<number>(context, 'qbiDeduction', 0);

    // Calculate taxable income
    const taxableIncome = Math.max(0, agi - totalDeduction - qbiDeduction);

    // Store in intermediates
    context = setIntermediate(context, 'taxableIncome', taxableIncome);

    // Create trace step
    const notes: string[] = [];
    notes.push(`AGI: $${agi.toLocaleString()}`);
    notes.push(`Deductions (${deductionType}): $${totalDeduction.toLocaleString()}`);

    if (qbiDeduction > 0) {
      notes.push(`QBI deduction: $${qbiDeduction.toLocaleString()}`);
    }

    notes.push(`Taxable income: $${taxableIncome.toLocaleString()}`);

    // Check if there's a potential NOL
    const calculatedTaxableIncome = agi - totalDeduction - qbiDeduction;
    if (calculatedTaxableIncome < 0) {
      const nolAmount = Math.abs(calculatedTaxableIncome);
      notes.push(
        `Note: Negative taxable income ($${nolAmount.toLocaleString()}) may result in Net Operating Loss (NOL) carryforward`
      );
    }

    const traceStep = createTraceStep(
      'taxable_income_composer',
      stepNumber,
      `${rules.rulesVersion}:taxable_income`,
      [
        { field: 'agi', value: agi },
        { field: 'totalDeduction', value: totalDeduction },
        { field: 'qbiDeduction', value: qbiDeduction },
      ],
      {
        taxableIncome,
        agi,
        totalDeduction,
        deductionType,
        qbiDeduction,
      },
      [],
      ['agi_composer', 'deduction_chooser', 'qbi_deduction'],
      notes
    );

    context = {
      ...context,
      traceSteps: [...context.traceSteps, traceStep],
    };

    // Mark module as executed
    context = markModuleExecuted(context, 'taxable_income_composer');

    return context;
  },
};
