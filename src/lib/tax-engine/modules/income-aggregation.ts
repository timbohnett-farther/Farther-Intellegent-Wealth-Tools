/**
 * Income Aggregation Module
 *
 * Aggregates all income sources to calculate gross income.
 * Separates ordinary income from preferential income.
 */

import type { TaxCalculationModule, CalculationContext } from './module-interface';
import {
  createTraceStep,
  setIntermediate,
  markModuleExecuted,
  getIntermediate,
} from './module-interface';

export const IncomeAggregationModule: TaxCalculationModule = {
  moduleName: 'income_aggregation',
  description: 'Aggregate all income sources and calculate gross income',
  dependencies: ['filing_status_resolver'],

  run(context: CalculationContext): CalculationContext {
    const { snapshot } = context;
    const stepNumber = context.traceSteps.length + 1;
    const inputs = snapshot.inputs as any;

    // Ordinary income sources
    const wages = inputs.wages || 0;
    const salaries = inputs.salaries || 0;
    const tips = inputs.tips || 0;
    const taxableInterest = inputs.taxableInterest || 0;
    const ordinaryDividends = inputs.ordinaryDividends || 0;
    const businessIncome = inputs.businessIncome || 0;
    const rentalIncome = inputs.rentalIncome || 0;
    const unemploymentIncome = inputs.unemploymentIncome || 0;
    const otherIncome = inputs.otherIncome || 0;

    // Retirement income
    const iraDistributionsTaxable = inputs.iraDistributionsTaxable || 0;
    const pensionIncomeTaxable = inputs.pensionIncomeTaxable || 0;
    const socialSecurityTotal = inputs.socialSecurityTotal || 0;

    // Preferential income (qualified dividends, capital gains)
    const qualifiedDividends = inputs.qualifiedDividends || 0;
    // Support both field conventions: capitalGainLossNet (summary) or longTermCapitalGains (detailed)
    const longTermCapitalGains = inputs.longTermCapitalGains || 0;
    const shortTermCapitalGains = inputs.shortTermCapitalGains || 0;
    const capitalGainLossNet = inputs.capitalGainLossNet || longTermCapitalGains;

    // Calculate totals
    const wagesTotal = wages + salaries + tips;

    const ordinaryIncomeGross =
      wagesTotal +
      taxableInterest +
      (ordinaryDividends - qualifiedDividends) + // Ordinary portion of dividends
      businessIncome +
      rentalIncome +
      unemploymentIncome +
      otherIncome +
      shortTermCapitalGains; // Short-term capital gains are taxed as ordinary income

    const retirementIncomeGross = iraDistributionsTaxable + pensionIncomeTaxable;

    // Preferential income (taxed at capital gains rates)
    const preferentialIncomeGross = qualifiedDividends + Math.max(0, capitalGainLossNet);

    // Gross income (before adjustments)
    const grossIncome =
      ordinaryIncomeGross + retirementIncomeGross + preferentialIncomeGross + socialSecurityTotal;

    // Provisional income for Social Security taxability calculation
    // Provisional = AGI + Tax-exempt interest + 50% of SS benefits
    const taxExemptInterest = inputs.taxExemptInterest || 0;
    const provisionalIncomeForSS =
      ordinaryIncomeGross +
      retirementIncomeGross +
      preferentialIncomeGross +
      taxExemptInterest +
      socialSecurityTotal * 0.5;

    // Store in intermediates
    context = setIntermediate(context, 'wagesTotal', wagesTotal);
    context = setIntermediate(context, 'ordinaryIncomeGross', ordinaryIncomeGross);
    context = setIntermediate(context, 'retirementIncomeGross', retirementIncomeGross);
    context = setIntermediate(context, 'preferentialIncomeGross', preferentialIncomeGross);
    context = setIntermediate(context, 'socialSecurityGross', socialSecurityTotal);
    context = setIntermediate(context, 'grossIncome', grossIncome);
    context = setIntermediate(context, 'provisionalIncomeForSS', provisionalIncomeForSS);
    context = setIntermediate(context, 'taxExemptInterest', taxExemptInterest);

    // Create trace step
    const traceStep = createTraceStep(
      'income_aggregation',
      stepNumber,
      `${context.rules.rulesVersion}:income_aggregation`,
      [
        { field: 'wages', value: wages },
        { field: 'salaries', value: salaries },
        { field: 'tips', value: tips },
        { field: 'taxableInterest', value: taxableInterest },
        { field: 'ordinaryDividends', value: ordinaryDividends },
        { field: 'qualifiedDividends', value: qualifiedDividends },
        { field: 'capitalGainLossNet', value: capitalGainLossNet },
        { field: 'businessIncome', value: businessIncome },
        { field: 'rentalIncome', value: rentalIncome },
        { field: 'iraDistributionsTaxable', value: iraDistributionsTaxable },
        { field: 'pensionIncomeTaxable', value: pensionIncomeTaxable },
        { field: 'socialSecurityTotal', value: socialSecurityTotal },
        { field: 'unemploymentIncome', value: unemploymentIncome },
        { field: 'otherIncome', value: otherIncome },
        { field: 'taxExemptInterest', value: taxExemptInterest },
      ],
      {
        wagesTotal,
        ordinaryIncomeGross,
        retirementIncomeGross,
        preferentialIncomeGross,
        socialSecurityGross: socialSecurityTotal,
        grossIncome,
        provisionalIncomeForSS,
      },
      [],
      ['filing_status_resolver'],
      [
        `Wages total: $${wagesTotal.toLocaleString()}`,
        `Ordinary income: $${ordinaryIncomeGross.toLocaleString()}`,
        `Preferential income: $${preferentialIncomeGross.toLocaleString()}`,
        `Gross income: $${grossIncome.toLocaleString()}`,
      ]
    );

    context = {
      ...context,
      traceSteps: [...context.traceSteps, traceStep],
    };

    // Mark module as executed
    context = markModuleExecuted(context, 'income_aggregation');

    return context;
  },
};
