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
    const inputs = snapshot.inputs;

    // Ordinary income sources
    const wages = inputs.wages || 0;
    const salaries = inputs.salaries || 0;
    const tips = inputs.tips || 0;
    const taxableInterest = inputs.taxableInterest || 0;
    const ordinaryDividends = inputs.ordinaryDividends || 0;
    const businessIncomeLoss = inputs.businessIncomeLoss || 0;
    const scheduleE = inputs.scheduleE || 0;
    const unemploymentCompensation = inputs.unemploymentCompensation || 0;
    const otherIncome = inputs.otherIncome || 0;

    // Retirement income
    const iraDistributionsTaxable = inputs.iraDistributionsTaxable || 0;
    const pensionsAnnuitiesTaxable = inputs.pensionsAnnuitiesTaxable || 0;
    const socialSecurityBenefits = inputs.socialSecurityBenefits || 0;

    // Preferential income (qualified dividends, capital gains)
    const qualifiedDividends = inputs.qualifiedDividends || 0;
    const capitalGainLoss = inputs.capitalGainLoss || 0;

    // Calculate totals
    const wagesTotal = wages + salaries + tips;

    const ordinaryIncomeGross =
      wagesTotal +
      taxableInterest +
      (ordinaryDividends - qualifiedDividends) + // Ordinary portion of dividends
      businessIncomeLoss +
      scheduleE +
      unemploymentCompensation +
      otherIncome;

    const retirementIncomeGross = iraDistributionsTaxable + pensionsAnnuitiesTaxable;

    // Preferential income (taxed at capital gains rates)
    const preferentialIncomeGross = qualifiedDividends + Math.max(0, capitalGainLoss);

    // Gross income (before adjustments)
    const grossIncome =
      ordinaryIncomeGross + retirementIncomeGross + preferentialIncomeGross + socialSecurityBenefits;

    // Provisional income for Social Security taxability calculation
    // Provisional = AGI + Tax-exempt interest + 50% of SS benefits
    const taxExemptInterest = inputs.taxExemptInterest || 0;
    const provisionalIncomeForSS =
      ordinaryIncomeGross +
      retirementIncomeGross +
      preferentialIncomeGross +
      taxExemptInterest +
      socialSecurityBenefits * 0.5;

    // Store in intermediates
    context = setIntermediate(context, 'wagesTotal', wagesTotal);
    context = setIntermediate(context, 'ordinaryIncomeGross', ordinaryIncomeGross);
    context = setIntermediate(context, 'retirementIncomeGross', retirementIncomeGross);
    context = setIntermediate(context, 'preferentialIncomeGross', preferentialIncomeGross);
    context = setIntermediate(context, 'socialSecurityGross', socialSecurityBenefits);
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
        { field: 'capitalGainLoss', value: capitalGainLoss },
        { field: 'businessIncomeLoss', value: businessIncomeLoss },
        { field: 'scheduleE', value: scheduleE },
        { field: 'iraDistributionsTaxable', value: iraDistributionsTaxable },
        { field: 'pensionsAnnuitiesTaxable', value: pensionsAnnuitiesTaxable },
        { field: 'socialSecurityBenefits', value: socialSecurityBenefits },
        { field: 'unemploymentCompensation', value: unemploymentCompensation },
        { field: 'otherIncome', value: otherIncome },
        { field: 'taxExemptInterest', value: taxExemptInterest },
      ],
      {
        wagesTotal,
        ordinaryIncomeGross,
        retirementIncomeGross,
        preferentialIncomeGross,
        socialSecurityGross: socialSecurityBenefits,
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
