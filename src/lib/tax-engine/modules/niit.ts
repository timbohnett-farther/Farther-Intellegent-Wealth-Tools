/**
 * Net Investment Income Tax (NIIT) Module
 *
 * Calculates the 3.8% Medicare surtax on net investment income for high earners.
 * This applies to the lesser of:
 * 1. Net investment income, OR
 * 2. The amount by which modified AGI exceeds the threshold
 *
 * Key rules:
 * - 3.8% tax rate
 * - Thresholds: $200K (single), $250K (MFJ), $125K (MFS), $200K (HOH/QSS)
 * - Net investment income includes: interest, dividends, capital gains, rents, royalties
 * - Does NOT include: wages, self-employment income, Social Security, distributions from qualified retirement plans
 *
 * This is a surtax in addition to regular income tax and capital gains tax.
 */

import type { TaxCalculationModule, CalculationContext } from './module-interface';
import {
  createTraceStep,
  setIntermediate,
  markModuleExecuted,
  getIntermediate,
} from './module-interface';

export const NIITModule: TaxCalculationModule = {
  moduleName: 'niit',
  description: 'Calculate 3.8% Net Investment Income Tax surtax for high earners',
  dependencies: ['filing_status_resolver', 'agi_composer', 'capital_gains_tax'],

  run(context: CalculationContext): CalculationContext {
    const { snapshot, rules } = context;
    const stepNumber = context.traceSteps.length + 1;
    const inputs = snapshot.inputs;

    // Get AGI and filing status
    const agi = getIntermediate<number>(context, 'agi', 0);
    const filingStatus = getIntermediate<string>(context, 'filingStatus', 'single');

    // Get NIIT rules
    const niitRules = rules.niit;
    if (!niitRules) {
      // NIIT doesn't apply (rules not found)
      context = setIntermediate(context, 'niit', 0);
      context = setIntermediate(context, 'niitBase', 0);

      const traceStep = createTraceStep(
        'niit',
        stepNumber,
        `${rules.rulesVersion}:niit`,
        [{ field: 'agi', value: agi }],
        { niit: 0, niitBase: 0 },
        [],
        ['filing_status_resolver', 'agi_composer', 'capital_gains_tax'],
        ['NIIT rules not found in rules package — NIIT is $0']
      );

      context = {
        ...context,
        traceSteps: [...context.traceSteps, traceStep],
      };

      context = markModuleExecuted(context, 'niit');
      return context;
    }

    const niitRate = niitRules.rate || 0.038;
    const thresholds = niitRules.thresholds;
    const threshold = thresholds[filingStatus as keyof typeof thresholds] || 0;

    // Calculate modified AGI (for most taxpayers, this is just AGI)
    // In practice, MAGI for NIIT can include foreign earned income exclusion,
    // but we'll simplify to AGI for now
    const modifiedAGI = agi;

    // Calculate net investment income
    // This includes: interest, dividends, capital gains, rents, royalties, passive income
    const taxableInterest = inputs.taxableInterest || 0;
    const ordinaryDividends = inputs.ordinaryDividends || 0;
    const shortTermCapitalGains = inputs.shortTermCapitalGains || 0;
    const longTermCapitalGains = inputs.longTermCapitalGains || 0;
    const rentalIncome = inputs.rentalIncome || 0;
    const royaltyIncome = inputs.royaltyIncome || 0;

    // Net investment income = sum of investment income sources
    const netInvestmentIncome =
      taxableInterest +
      ordinaryDividends +
      shortTermCapitalGains +
      longTermCapitalGains +
      rentalIncome +
      royaltyIncome;

    // NIIT applies to the LESSER of:
    // 1. Net investment income
    // 2. The amount by which MAGI exceeds the threshold
    const excessMAGI = Math.max(0, modifiedAGI - threshold);
    const niitBase = Math.min(netInvestmentIncome, excessMAGI);

    // Calculate NIIT
    const niit = niitBase * niitRate;

    // Round to 2 decimal places
    const niitRounded = Math.round(niit * 100) / 100;

    // Store in intermediates
    context = setIntermediate(context, 'niit', niitRounded);
    context = setIntermediate(context, 'niitBase', niitBase);
    context = setIntermediate(context, 'netInvestmentIncome', netInvestmentIncome);
    context = setIntermediate(context, 'modifiedAGI', modifiedAGI);

    // Create trace step
    const notes: string[] = [];
    notes.push(`Modified AGI: $${modifiedAGI.toLocaleString()}`);
    notes.push(`NIIT threshold for ${filingStatus}: $${threshold.toLocaleString()}`);
    notes.push('');

    if (modifiedAGI <= threshold) {
      notes.push(`Modified AGI does not exceed threshold — NIIT does not apply`);
      notes.push(`NIIT: $0`);
    } else {
      notes.push('Net investment income components:');
      if (taxableInterest > 0) notes.push(`  Taxable interest: $${taxableInterest.toLocaleString()}`);
      if (ordinaryDividends > 0) notes.push(`  Ordinary dividends: $${ordinaryDividends.toLocaleString()}`);
      if (shortTermCapitalGains > 0)
        notes.push(`  Short-term capital gains: $${shortTermCapitalGains.toLocaleString()}`);
      if (longTermCapitalGains > 0)
        notes.push(`  Long-term capital gains: $${longTermCapitalGains.toLocaleString()}`);
      if (rentalIncome > 0) notes.push(`  Rental income: $${rentalIncome.toLocaleString()}`);
      if (royaltyIncome > 0) notes.push(`  Royalty income: $${royaltyIncome.toLocaleString()}`);

      notes.push('');
      notes.push(`Total net investment income: $${netInvestmentIncome.toLocaleString()}`);
      notes.push(`Modified AGI in excess of threshold: $${excessMAGI.toLocaleString()}`);
      notes.push('');
      notes.push(`NIIT base (lesser of the two above): $${niitBase.toLocaleString()}`);
      notes.push(`NIIT rate: ${(niitRate * 100).toFixed(1)}%`);
      notes.push(`NIIT: $${niitRounded.toLocaleString()}`);
    }

    const traceStep = createTraceStep(
      'niit',
      stepNumber,
      `${rules.rulesVersion}:niit`,
      [
        { field: 'modifiedAGI', value: modifiedAGI },
        { field: 'threshold', value: threshold },
        { field: 'netInvestmentIncome', value: netInvestmentIncome },
        { field: 'excessMAGI', value: excessMAGI },
      ],
      {
        niit: niitRounded,
        niitBase,
        netInvestmentIncome,
        excessMAGI,
      },
      [],
      ['filing_status_resolver', 'agi_composer', 'capital_gains_tax'],
      notes
    );

    context = {
      ...context,
      traceSteps: [...context.traceSteps, traceStep],
    };

    // Mark module as executed
    context = markModuleExecuted(context, 'niit');

    return context;
  },
};
