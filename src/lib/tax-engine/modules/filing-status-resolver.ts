/**
 * Filing Status Resolver Module
 *
 * Resolves filing status and determines standard deduction amount.
 * This is the first module in the calculation pipeline.
 */

import type { TaxCalculationModule, CalculationContext } from './module-interface';
import {
  createTraceStep,
  setIntermediate,
  markModuleExecuted,
  addWarning,
} from './module-interface';
import { getStandardDeduction } from '../rules/rules-registry';

export const FilingStatusResolverModule: TaxCalculationModule = {
  moduleName: 'filing_status_resolver',
  description: 'Resolve filing status and calculate standard deduction',
  dependencies: [],

  run(context: CalculationContext): CalculationContext {
    const { snapshot, rules } = context;
    const stepNumber = context.traceSteps.length + 1;

    // Get filing status from snapshot
    const filingStatus = snapshot.filingStatus;

    // Validate filing status (accepts both uppercase abbreviations and lowercase full names)
    const validStatuses = [
      'SINGLE',
      'single',
      'MFJ',
      'married_filing_jointly',
      'MFS',
      'married_filing_separately',
      'HOH',
      'head_of_household',
      'QSS',
      'qualifying_surviving_spouse',
    ];
    if (!validStatuses.includes(filingStatus)) {
      context = addWarning(
        context,
        'INVALID_FILING_STATUS',
        'hard_fail',
        `Invalid filing status: ${filingStatus}`,
        'filingStatus',
        { providedValue: filingStatus, validValues: validStatuses }
      );
      return context;
    }

    // Map to normalized filing status
    const normalizedFilingStatus = normalizeFilingStatus(filingStatus);

    // Determine age 65+ or blind status
    const taxpayers = snapshot.taxpayers || [];
    const primaryTaxpayer = taxpayers.find((t) => t.role === 'primary');
    const spouseTaxpayer = taxpayers.find((t) => t.role === 'spouse');

    const primaryAge65OrBlind =
      (primaryTaxpayer?.age && primaryTaxpayer.age >= 65) || primaryTaxpayer?.isBlind || false;
    const spouseAge65OrBlind =
      (spouseTaxpayer?.age && spouseTaxpayer.age >= 65) || spouseTaxpayer?.isBlind || false;

    // Calculate standard deduction
    const standardDeduction = getStandardDeduction(rules, normalizedFilingStatus, {
      primary: primaryAge65OrBlind,
      spouse: spouseAge65OrBlind,
    });

    // Store in intermediates
    context = setIntermediate(context, 'filingStatus', normalizedFilingStatus);
    context = setIntermediate(context, 'standardDeduction', standardDeduction);
    context = setIntermediate(context, 'primaryAge65OrBlind', primaryAge65OrBlind);
    context = setIntermediate(context, 'spouseAge65OrBlind', spouseAge65OrBlind);

    // Create trace step
    const traceStep = createTraceStep(
      'filing_status_resolver',
      stepNumber,
      `${rules.rulesVersion}:filing_status`,
      [
        { field: 'filingStatus', value: filingStatus },
        { field: 'primaryAge', value: primaryTaxpayer?.age || null },
        { field: 'spouseAge', value: spouseTaxpayer?.age || null },
      ],
      {
        resolvedFilingStatus: normalizedFilingStatus,
        standardDeduction,
        primaryAge65OrBlind,
        spouseAge65OrBlind,
      },
      [],
      [],
      primaryAge65OrBlind || spouseAge65OrBlind
        ? ['Additional standard deduction applied for age 65+ or blind']
        : []
    );

    context = {
      ...context,
      traceSteps: [...context.traceSteps, traceStep],
    };

    // Mark module as executed
    context = markModuleExecuted(context, 'filing_status_resolver');

    return context;
  },
};

/**
 * Normalize filing status to standard format
 */
function normalizeFilingStatus(filingStatus: string): any {
  const normalized = filingStatus.toLowerCase().replace(/[\s-]/g, '_');

  const mappings: Record<string, string> = {
    single: 'single',
    mfj: 'married_filing_jointly',
    married_filing_jointly: 'married_filing_jointly',
    mfs: 'married_filing_separately',
    married_filing_separately: 'married_filing_separately',
    hoh: 'head_of_household',
    head_of_household: 'head_of_household',
    qss: 'qualifying_surviving_spouse',
    qualifying_surviving_spouse: 'qualifying_surviving_spouse',
  };

  return mappings[normalized] || 'single';
}
