/**
 * Capital Gains Tax Module
 *
 * Calculates federal tax on long-term capital gains and qualified dividends at preferential rates.
 * These are taxed separately from ordinary income at 0%, 15%, or 20% depending on taxable income.
 *
 * Key rules:
 * - 0% rate if taxable income is below certain thresholds
 * - 15% rate for middle-income taxpayers
 * - 20% rate for high-income taxpayers
 * - Thresholds vary by filing status
 *
 * This module handles ONLY the preferential rate calculation.
 * Short-term capital gains are taxed as ordinary income (handled by ordinary-income-tax module).
 */

import type { TaxCalculationModule, CalculationContext } from './module-interface';
import {
  createTraceStep,
  setIntermediate,
  markModuleExecuted,
  getIntermediate,
} from './module-interface';
import { getCapitalGainBrackets } from '../rules/rules-registry';

export const CapitalGainsTaxModule: TaxCalculationModule = {
  moduleName: 'capital_gains_tax',
  description: 'Calculate federal tax on long-term capital gains and qualified dividends at preferential rates',
  dependencies: ['filing_status_resolver', 'taxable_income_composer', 'ordinary_income_tax'],

  run(context: CalculationContext): CalculationContext {
    const { rules } = context;
    const stepNumber = context.traceSteps.length + 1;

    // Get taxable income and filing status
    const taxableIncome = getIntermediate<number>(context, 'taxableIncome', 0);
    const filingStatus = getIntermediate<string>(context, 'filingStatus', 'single');

    // Get preferential income (long-term capital gains + qualified dividends)
    const preferentialIncomeGross = getIntermediate<number>(context, 'preferentialIncomeGross', 0);

    // If no preferential income, skip calculation
    if (preferentialIncomeGross === 0) {
      context = setIntermediate(context, 'capitalGainsTax', 0);
      context = setIntermediate(context, 'capitalGainsTaxableIncome', 0);

      const traceStep = createTraceStep(
        'capital_gains_tax',
        stepNumber,
        `${rules.rulesVersion}:capital_gains_tax`,
        [
          { field: 'preferentialIncomeGross', value: preferentialIncomeGross },
          { field: 'taxableIncome', value: taxableIncome },
        ],
        {
          capitalGainsTax: 0,
          capitalGainsTaxableIncome: 0,
        },
        [],
        ['filing_status_resolver', 'taxable_income_composer'],
        ['No preferential income (long-term capital gains or qualified dividends) — capital gains tax is $0']
      );

      context = {
        ...context,
        traceSteps: [...context.traceSteps, traceStep],
      };

      context = markModuleExecuted(context, 'capital_gains_tax');
      return context;
    }

    // Get ordinary taxable income (already calculated by ordinary-income-tax module)
    const ordinaryTaxableIncome = getIntermediate<number>(context, 'ordinaryTaxableIncome', 0);

    // Preferential income that is taxable
    // This is the portion of preferential income that fits within taxable income
    const capitalGainsTaxableIncome = Math.min(
      preferentialIncomeGross,
      Math.max(0, taxableIncome - ordinaryTaxableIncome)
    );

    // Get capital gains tax brackets (0%, 15%, 20%)
    const brackets = getCapitalGainBrackets(rules, filingStatus as any);

    // Calculate tax using preferential rates
    // Key insight: We need to "stack" preferential income on top of ordinary income
    // to determine which bracket(s) it falls into
    let capitalGainsTax = 0;
    const bracketDetails: Array<{
      rate: number;
      lowerBound: number;
      upperBound: number | null;
      taxableAmount: number;
      taxOnBracket: number;
    }> = [];

    // Starting point is where ordinary income ends
    let currentFloor = ordinaryTaxableIncome;
    let remainingCapGains = capitalGainsTaxableIncome;

    for (const bracket of brackets) {
      if (remainingCapGains <= 0) break;

      const bracketLowerBound = bracket.lowerBound;
      const bracketUpperBound = bracket.upperBound || Infinity;

      // How much of the preferential income falls into this bracket?
      if (currentFloor < bracketUpperBound) {
        // We have some cap gains in this bracket
        const spaceInBracket = bracketUpperBound - Math.max(currentFloor, bracketLowerBound);
        const amountInThisBracket = Math.min(remainingCapGains, spaceInBracket);
        const taxOnThisBracket = amountInThisBracket * bracket.rate;

        capitalGainsTax += taxOnThisBracket;
        remainingCapGains -= amountInThisBracket;
        currentFloor += amountInThisBracket;

        bracketDetails.push({
          rate: bracket.rate,
          lowerBound: bracket.lowerBound,
          upperBound: bracket.upperBound,
          taxableAmount: amountInThisBracket,
          taxOnBracket: taxOnThisBracket,
        });
      }
    }

    // Round to 2 decimal places
    capitalGainsTax = Math.round(capitalGainsTax * 100) / 100;

    // Calculate effective rate on capital gains
    const effectiveCapGainsRate =
      capitalGainsTaxableIncome > 0 ? (capitalGainsTax / capitalGainsTaxableIncome) * 100 : 0;

    // Marginal rate is the rate of the last bracket used
    const marginalCapGainsRate =
      bracketDetails.length > 0 ? bracketDetails[bracketDetails.length - 1].rate * 100 : 0;

    // Store in intermediates
    context = setIntermediate(context, 'capitalGainsTax', capitalGainsTax);
    context = setIntermediate(context, 'capitalGainsTaxableIncome', capitalGainsTaxableIncome);
    context = setIntermediate(context, 'capitalGainsBrackets', bracketDetails);
    context = setIntermediate(context, 'effectiveCapGainsRate', effectiveCapGainsRate);
    context = setIntermediate(context, 'marginalCapGainsRate', marginalCapGainsRate);

    // Create trace step
    const notes: string[] = [];
    notes.push(`Total taxable income: $${taxableIncome.toLocaleString()}`);
    notes.push(`Ordinary taxable income: $${ordinaryTaxableIncome.toLocaleString()}`);
    notes.push(`Preferential income (long-term cap gains + qualified dividends): $${preferentialIncomeGross.toLocaleString()}`);
    notes.push(`Taxable preferential income: $${capitalGainsTaxableIncome.toLocaleString()}`);
    notes.push('');
    notes.push('Tax by bracket (stacked on top of ordinary income):');

    for (const detail of bracketDetails) {
      const upperDisplay = detail.upperBound ? `$${detail.upperBound.toLocaleString()}` : '∞';
      notes.push(
        `  ${(detail.rate * 100).toFixed(0)}% bracket ($${detail.lowerBound.toLocaleString()} - ${upperDisplay}): ` +
          `$${detail.taxableAmount.toLocaleString()} × ${(detail.rate * 100).toFixed(0)}% = $${detail.taxOnBracket.toLocaleString()}`
      );
    }

    notes.push('');
    notes.push(`Capital gains tax: $${capitalGainsTax.toLocaleString()}`);
    notes.push(`Effective capital gains rate: ${effectiveCapGainsRate.toFixed(2)}%`);
    notes.push(`Marginal capital gains rate: ${marginalCapGainsRate.toFixed(0)}%`);

    const traceStep = createTraceStep(
      'capital_gains_tax',
      stepNumber,
      `${rules.rulesVersion}:capital_gains_tax`,
      [
        { field: 'taxableIncome', value: taxableIncome },
        { field: 'ordinaryTaxableIncome', value: ordinaryTaxableIncome },
        { field: 'preferentialIncomeGross', value: preferentialIncomeGross },
        { field: 'capitalGainsTaxableIncome', value: capitalGainsTaxableIncome },
      ],
      {
        capitalGainsTax,
        capitalGainsTaxableIncome,
        effectiveCapGainsRate,
        marginalCapGainsRate,
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
    context = markModuleExecuted(context, 'capital_gains_tax');

    return context;
  },
};
