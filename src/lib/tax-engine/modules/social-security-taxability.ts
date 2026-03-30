/**
 * Social Security Taxability Module
 *
 * Calculates the taxable portion of Social Security benefits based on provisional income.
 * Applies tiered thresholds (tier1, tier2) that vary by filing status.
 *
 * Rules:
 * - If provisional income <= tier1: 0% taxable
 * - If provisional income between tier1 and tier2: up to 50% taxable
 * - If provisional income > tier2: up to 85% taxable
 */

import type { TaxCalculationModule, CalculationContext } from './module-interface';
import {
  createTraceStep,
  setIntermediate,
  markModuleExecuted,
  getIntermediate,
  addWarning,
} from './module-interface';

export const SocialSecurityTaxabilityModule: TaxCalculationModule = {
  moduleName: 'social_security_taxability',
  description: 'Calculate taxable portion of Social Security benefits',
  dependencies: ['filing_status_resolver', 'income_aggregation'],

  run(context: CalculationContext): CalculationContext {
    const { snapshot, rules } = context;
    const stepNumber = context.traceSteps.length + 1;

    // Get provisional income from income_aggregation module
    const provisionalIncome = getIntermediate<number>(context, 'provisionalIncomeForSS', 0);
    const socialSecurityGross = getIntermediate<number>(context, 'socialSecurityGross', 0);
    const filingStatus = getIntermediate<string>(context, 'filingStatus', 'single');

    // If no Social Security income, skip calculation
    if (socialSecurityGross === 0) {
      context = setIntermediate(context, 'taxableSocialSecurity', 0);
      context = setIntermediate(context, 'socialSecurityTaxabilityPercentage', 0);

      const traceStep = createTraceStep(
        'social_security_taxability',
        stepNumber,
        `${rules.rulesVersion}:ss_taxability`,
        [
          { field: 'socialSecurityGross', value: socialSecurityGross },
          { field: 'provisionalIncome', value: provisionalIncome },
        ],
        {
          taxableSocialSecurity: 0,
          socialSecurityTaxabilityPercentage: 0,
        },
        [],
        ['filing_status_resolver', 'income_aggregation'],
        ['No Social Security income to tax']
      );

      context = {
        ...context,
        traceSteps: [...context.traceSteps, traceStep],
      };

      context = markModuleExecuted(context, 'social_security_taxability');
      return context;
    }

    // Get thresholds from rules
    const ssThresholds = rules.socialSecurityTaxability?.thresholds;
    if (!ssThresholds || !ssThresholds[filingStatus as keyof typeof ssThresholds]) {
      context = addWarning(
        context,
        'MISSING_SS_THRESHOLDS',
        'soft_fail',
        `Social Security taxability thresholds not found for filing status: ${filingStatus}`,
        'socialSecurityTaxability',
        { filingStatus, rulesVersion: rules.rulesVersion }
      );

      context = setIntermediate(context, 'taxableSocialSecurity', 0);
      context = setIntermediate(context, 'socialSecurityTaxabilityPercentage', 0);

      const traceStep = createTraceStep(
        'social_security_taxability',
        stepNumber,
        `${rules.rulesVersion}:ss_taxability`,
        [
          { field: 'socialSecurityGross', value: socialSecurityGross },
          { field: 'provisionalIncome', value: provisionalIncome },
          { field: 'filingStatus', value: filingStatus },
        ],
        {
          taxableSocialSecurity: 0,
          socialSecurityTaxabilityPercentage: 0,
        },
        [context.warnings[context.warnings.length - 1]],
        ['filing_status_resolver', 'income_aggregation']
      );

      context = {
        ...context,
        traceSteps: [...context.traceSteps, traceStep],
      };

      context = markModuleExecuted(context, 'social_security_taxability');
      return context;
    }

    const thresholds = ssThresholds[filingStatus as keyof typeof ssThresholds];
    const tier1 = thresholds.tier1;
    const tier2 = thresholds.tier2;

    let taxableSocialSecurity = 0;
    let taxabilityPercentage = 0;

    if (provisionalIncome <= tier1) {
      // No Social Security benefits are taxable
      taxableSocialSecurity = 0;
      taxabilityPercentage = 0;
    } else if (provisionalIncome > tier1 && provisionalIncome <= tier2) {
      // Up to 50% of Social Security benefits are taxable
      // Taxable amount is lesser of:
      // 1. 50% of Social Security benefits
      // 2. 50% of (provisional income - tier1)
      const option1 = socialSecurityGross * 0.5;
      const option2 = (provisionalIncome - tier1) * 0.5;
      taxableSocialSecurity = Math.min(option1, option2);
      taxabilityPercentage = (taxableSocialSecurity / socialSecurityGross) * 100;
    } else {
      // Up to 85% of Social Security benefits are taxable
      // Taxable amount is lesser of:
      // 1. 85% of Social Security benefits
      // 2. 85% of (provisional income - tier2) + smaller of:
      //    a. $4,500 (single) or $6,000 (MFJ) [tier2 - tier1 difference * 0.5]
      //    b. 50% of Social Security benefits

      const tier1Tier2Difference = tier2 - tier1;
      const baseAmount = tier1Tier2Difference * 0.5; // Max from tier1 to tier2 range

      const option1 = socialSecurityGross * 0.85;
      const smallerOf = Math.min(baseAmount, socialSecurityGross * 0.5);
      const option2 = (provisionalIncome - tier2) * 0.85 + smallerOf;

      taxableSocialSecurity = Math.min(option1, option2);
      taxabilityPercentage = (taxableSocialSecurity / socialSecurityGross) * 100;
    }

    // Round to 2 decimal places
    taxableSocialSecurity = Math.round(taxableSocialSecurity * 100) / 100;
    taxabilityPercentage = Math.round(taxabilityPercentage * 100) / 100;

    // Store in intermediates
    context = setIntermediate(context, 'taxableSocialSecurity', taxableSocialSecurity);
    context = setIntermediate(context, 'socialSecurityTaxabilityPercentage', taxabilityPercentage);

    // Create trace step
    const notes: string[] = [];
    if (provisionalIncome <= tier1) {
      notes.push('Provisional income below tier 1 threshold - no SS benefits taxable');
    } else if (provisionalIncome <= tier2) {
      notes.push('Provisional income between tier 1 and tier 2 - up to 50% SS benefits taxable');
    } else {
      notes.push('Provisional income above tier 2 - up to 85% SS benefits taxable');
    }
    notes.push(`${taxabilityPercentage.toFixed(1)}% of SS benefits are taxable`);

    const traceStep = createTraceStep(
      'social_security_taxability',
      stepNumber,
      `${rules.rulesVersion}:ss_taxability`,
      [
        { field: 'socialSecurityGross', value: socialSecurityGross },
        { field: 'provisionalIncome', value: provisionalIncome },
        { field: 'filingStatus', value: filingStatus },
        { field: 'tier1Threshold', value: tier1 },
        { field: 'tier2Threshold', value: tier2 },
      ],
      {
        taxableSocialSecurity,
        socialSecurityTaxabilityPercentage: taxabilityPercentage,
        tier1Used: tier1,
        tier2Used: tier2,
      },
      [],
      ['filing_status_resolver', 'income_aggregation'],
      notes
    );

    context = {
      ...context,
      traceSteps: [...context.traceSteps, traceStep],
    };

    // Mark module as executed
    context = markModuleExecuted(context, 'social_security_taxability');

    return context;
  },
};
