/**
 * Total Tax Composer Module
 *
 * Composes final total tax liability by summing all tax components:
 * - Ordinary income tax (progressive brackets)
 * - Capital gains tax (preferential rates)
 * - Net Investment Income Tax (3.8% surtax)
 *
 * This module does NOT include:
 * - Tax credits (applied in a separate module)
 * - Alternative Minimum Tax (calculated separately)
 * - State taxes (calculated separately)
 *
 * This is the total federal tax BEFORE credits.
 */

import type { TaxCalculationModule, CalculationContext } from './module-interface';
import {
  createTraceStep,
  setIntermediate,
  markModuleExecuted,
  getIntermediate,
} from './module-interface';

export const TotalTaxComposerModule: TaxCalculationModule = {
  moduleName: 'total_tax_composer',
  description: 'Compose final total federal tax liability by summing all tax components',
  dependencies: ['ordinary_income_tax', 'capital_gains_tax', 'niit'],

  run(context: CalculationContext): CalculationContext {
    const { rules } = context;
    const stepNumber = context.traceSteps.length + 1;

    // Get tax components from previous modules
    const ordinaryIncomeTax = getIntermediate<number>(context, 'ordinaryIncomeTax', 0);
    const capitalGainsTax = getIntermediate<number>(context, 'capitalGainsTax', 0);
    const niit = getIntermediate<number>(context, 'niit', 0);

    // Get supporting data for notes
    const taxableIncome = getIntermediate<number>(context, 'taxableIncome', 0);
    const agi = getIntermediate<number>(context, 'agi', 0);

    // Calculate total tax (before credits)
    const totalTaxBeforeCredits = ordinaryIncomeTax + capitalGainsTax + niit;

    // Round to 2 decimal places
    const totalTax = Math.round(totalTaxBeforeCredits * 100) / 100;

    // Calculate effective tax rate (total tax / AGI)
    const effectiveTaxRate = agi > 0 ? (totalTax / agi) * 100 : 0;

    // Store in intermediates
    context = setIntermediate(context, 'totalTaxBeforeCredits', totalTax);
    context = setIntermediate(context, 'effectiveTaxRateTotal', effectiveTaxRate);

    // Create trace step
    const notes: string[] = [];
    notes.push(`AGI: $${agi.toLocaleString()}`);
    notes.push(`Taxable income: $${taxableIncome.toLocaleString()}`);
    notes.push('');
    notes.push('Tax components:');
    notes.push(`  Ordinary income tax: $${ordinaryIncomeTax.toLocaleString()}`);
    notes.push(`  Capital gains tax: $${capitalGainsTax.toLocaleString()}`);
    notes.push(`  Net Investment Income Tax (NIIT): $${niit.toLocaleString()}`);
    notes.push('');
    notes.push(`Total federal tax (before credits): $${totalTax.toLocaleString()}`);
    notes.push(`Effective tax rate: ${effectiveTaxRate.toFixed(2)}%`);
    notes.push('');
    notes.push('Note: This does not include tax credits, AMT, or state taxes');

    const traceStep = createTraceStep(
      'total_tax_composer',
      stepNumber,
      `${rules.rulesVersion}:total_tax_composer`,
      [
        { field: 'ordinaryIncomeTax', value: ordinaryIncomeTax },
        { field: 'capitalGainsTax', value: capitalGainsTax },
        { field: 'niit', value: niit },
      ],
      {
        totalTaxBeforeCredits: totalTax,
        effectiveTaxRateTotal: effectiveTaxRate,
      },
      [],
      ['ordinary_income_tax', 'capital_gains_tax', 'niit'],
      notes
    );

    context = {
      ...context,
      traceSteps: [...context.traceSteps, traceStep],
    };

    // Mark module as executed
    context = markModuleExecuted(context, 'total_tax_composer');

    return context;
  },
};
