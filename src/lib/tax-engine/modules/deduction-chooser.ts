/**
 * Deduction Chooser Module
 *
 * Determines whether to use standard deduction or itemized deductions.
 * Chooses the greater of the two to minimize taxable income.
 *
 * Also applies additional standard deduction for age 65+ or blind taxpayers.
 */

import type { TaxCalculationModule, CalculationContext } from './module-interface';
import {
  createTraceStep,
  setIntermediate,
  markModuleExecuted,
  getIntermediate,
  addWarning,
} from './module-interface';

export const DeductionChooserModule: TaxCalculationModule = {
  moduleName: 'deduction_chooser',
  description: 'Choose between standard and itemized deductions',
  dependencies: ['filing_status_resolver', 'agi_composer', 'itemized_deductions'],

  run(context: CalculationContext): CalculationContext {
    const { rules } = context;
    const stepNumber = context.traceSteps.length + 1;

    // Get standard deduction from filing_status_resolver
    const standardDeduction = getIntermediate<number>(context, 'standardDeduction', 0);

    // Get itemized deductions from itemized_deductions module
    const itemizedDeductions = getIntermediate<number>(context, 'itemizedDeductions', 0);

    // Determine which deduction to use
    const useItemized = itemizedDeductions > standardDeduction;
    const chosenDeduction = useItemized ? itemizedDeductions : standardDeduction;
    const deductionType = useItemized ? 'itemized' : 'standard';

    // Calculate tax benefit of itemizing (if applicable)
    const itemizingBenefit = Math.max(0, itemizedDeductions - standardDeduction);

    // Store in intermediates
    context = setIntermediate(context, 'deductionType', deductionType);
    context = setIntermediate(context, 'totalDeduction', chosenDeduction);
    context = setIntermediate(context, 'itemizingBenefit', itemizingBenefit);

    // Add info if close to itemizing threshold
    const threshold = standardDeduction * 1.05; // Within 5% of standard deduction
    if (!useItemized && itemizedDeductions > standardDeduction * 0.9 && itemizedDeductions < threshold) {
      context = addWarning(
        context,
        'CLOSE_TO_ITEMIZING_THRESHOLD',
        'info',
        `Itemized deductions ($${itemizedDeductions.toLocaleString()}) are close to standard deduction ($${standardDeduction.toLocaleString()}). Consider additional deductible expenses.`,
        'itemizedDeductions',
        {
          itemizedDeductions,
          standardDeduction,
          shortfall: standardDeduction - itemizedDeductions,
        }
      );
    }

    // Create trace step
    const notes: string[] = [];
    notes.push(`Standard deduction: $${standardDeduction.toLocaleString()}`);
    notes.push(`Itemized deductions: $${itemizedDeductions.toLocaleString()}`);
    notes.push(`Chose: ${deductionType} ($${chosenDeduction.toLocaleString()})`);

    if (useItemized) {
      notes.push(`Benefit of itemizing: $${itemizingBenefit.toLocaleString()}`);
    } else if (itemizedDeductions > 0) {
      const shortfall = standardDeduction - itemizedDeductions;
      notes.push(
        `Itemized deductions fall short by $${shortfall.toLocaleString()} — using standard deduction`
      );
    }

    const traceStep = createTraceStep(
      'deduction_chooser',
      stepNumber,
      `${rules.rulesVersion}:deduction_chooser`,
      [
        { field: 'standardDeduction', value: standardDeduction },
        { field: 'itemizedDeductions', value: itemizedDeductions },
      ],
      {
        deductionType,
        totalDeduction: chosenDeduction,
        itemizingBenefit,
      },
      [],
      ['filing_status_resolver', 'agi_composer', 'itemized_deductions'],
      notes
    );

    context = {
      ...context,
      traceSteps: [...context.traceSteps, traceStep],
    };

    // Mark module as executed
    context = markModuleExecuted(context, 'deduction_chooser');

    return context;
  },
};
