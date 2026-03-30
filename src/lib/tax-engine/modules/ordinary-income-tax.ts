/**
 * Ordinary Income Tax Module
 *
 * Calculates federal income tax on ordinary income using progressive tax brackets.
 * Applies the marginal tax rate system where different portions of income are taxed at different rates.
 *
 * Does NOT include:
 * - Capital gains tax (calculated separately at preferential rates)
 * - NIIT (calculated separately as a surtax)
 * - Credits (applied after total tax calculation)
 */

import type { TaxCalculationModule, CalculationContext } from './module-interface';
import {
  createTraceStep,
  setIntermediate,
  markModuleExecuted,
  getIntermediate,
} from './module-interface';
import { getOrdinaryBrackets } from '../rules/rules-registry';

export const OrdinaryIncomeTaxModule: TaxCalculationModule = {
  moduleName: 'ordinary_income_tax',
  description: 'Calculate federal income tax on ordinary income using progressive brackets',
  dependencies: ['filing_status_resolver', 'taxable_income_composer'],

  run(context: CalculationContext): CalculationContext {
    const { rules } = context;
    const stepNumber = context.traceSteps.length + 1;

    // Get taxable income and filing status
    const taxableIncome = getIntermediate<number>(context, 'taxableIncome', 0);
    const filingStatus = getIntermediate<string>(context, 'filingStatus', 'single');

    // Get preferential income (capital gains + qualified dividends) - taxed separately
    const preferentialIncomeGross = getIntermediate<number>(context, 'preferentialIncomeGross', 0);

    // Ordinary taxable income = total taxable income - preferential income (if positive)
    // This is the portion subject to ordinary rates
    const ordinaryTaxableIncome = Math.max(0, taxableIncome - Math.max(0, preferentialIncomeGross));

    // Get ordinary income tax brackets
    const brackets = getOrdinaryBrackets(rules, filingStatus as any);

    // Calculate tax using progressive brackets
    let ordinaryIncomeTax = 0;
    const bracketDetails: Array<{
      rate: number;
      lowerBound: number;
      upperBound: number | null;
      taxableAmount: number;
      taxOnBracket: number;
    }> = [];

    for (const bracket of brackets) {
      if (ordinaryTaxableIncome <= bracket.lowerBound) {
        // Income doesn't reach this bracket
        break;
      }

      const upperBound = bracket.upperBound || Infinity;
      const taxableInThisBracket = Math.min(ordinaryTaxableIncome, upperBound) - bracket.lowerBound;
      const taxOnThisBracket = taxableInThisBracket * bracket.rate;

      ordinaryIncomeTax += taxOnThisBracket;

      bracketDetails.push({
        rate: bracket.rate,
        lowerBound: bracket.lowerBound,
        upperBound: bracket.upperBound,
        taxableAmount: taxableInThisBracket,
        taxOnBracket: taxOnThisBracket,
      });

      if (ordinaryTaxableIncome <= upperBound) {
        // We've processed all the income
        break;
      }
    }

    // Round to 2 decimal places
    ordinaryIncomeTax = Math.round(ordinaryIncomeTax * 100) / 100;

    // Calculate effective and marginal rates
    const effectiveTaxRate =
      ordinaryTaxableIncome > 0 ? (ordinaryIncomeTax / ordinaryTaxableIncome) * 100 : 0;

    // Marginal rate is the rate of the last bracket used
    const marginalTaxRate =
      bracketDetails.length > 0 ? bracketDetails[bracketDetails.length - 1].rate * 100 : 0;

    // Store in intermediates
    context = setIntermediate(context, 'ordinaryIncomeTax', ordinaryIncomeTax);
    context = setIntermediate(context, 'ordinaryTaxableIncome', ordinaryTaxableIncome);
    context = setIntermediate(context, 'ordinaryTaxBrackets', bracketDetails);
    context = setIntermediate(context, 'effectiveTaxRate', effectiveTaxRate);
    context = setIntermediate(context, 'marginalTaxRate', marginalTaxRate);

    // Create trace step
    const notes: string[] = [];
    notes.push(`Total taxable income: $${taxableIncome.toLocaleString()}`);
    notes.push(`Preferential income (taxed separately): $${preferentialIncomeGross.toLocaleString()}`);
    notes.push(`Ordinary taxable income: $${ordinaryTaxableIncome.toLocaleString()}`);
    notes.push('');
    notes.push('Tax by bracket:');

    for (const detail of bracketDetails) {
      const upperDisplay = detail.upperBound ? `$${detail.upperBound.toLocaleString()}` : '∞';
      notes.push(
        `  ${(detail.rate * 100).toFixed(0)}% bracket ($${detail.lowerBound.toLocaleString()} - ${upperDisplay}): ` +
          `$${detail.taxableAmount.toLocaleString()} × ${(detail.rate * 100).toFixed(0)}% = $${detail.taxOnBracket.toLocaleString()}`
      );
    }

    notes.push('');
    notes.push(`Ordinary income tax: $${ordinaryIncomeTax.toLocaleString()}`);
    notes.push(`Effective rate: ${effectiveTaxRate.toFixed(2)}%`);
    notes.push(`Marginal rate: ${marginalTaxRate.toFixed(0)}%`);

    const traceStep = createTraceStep(
      'ordinary_income_tax',
      stepNumber,
      `${rules.rulesVersion}:ordinary_income_tax`,
      [
        { field: 'taxableIncome', value: taxableIncome },
        { field: 'preferentialIncomeGross', value: preferentialIncomeGross },
        { field: 'ordinaryTaxableIncome', value: ordinaryTaxableIncome },
      ],
      {
        ordinaryIncomeTax,
        ordinaryTaxableIncome,
        effectiveTaxRate,
        marginalTaxRate,
        bracketCount: bracketDetails.length,
      },
      [],
      ['filing_status_resolver', 'taxable_income_composer'],
      notes
    );

    context = {
      ...context,
      traceSteps: [...context.traceSteps, traceStep],
    };

    // Mark module as executed
    context = markModuleExecuted(context, 'ordinary_income_tax');

    return context;
  },
};
