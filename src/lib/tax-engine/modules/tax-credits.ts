/**
 * Tax Credits Module
 *
 * Applies federal tax credits to reduce tax liability.
 * Credits are applied after calculating total tax and can be:
 * - Non-refundable: Can only reduce tax to $0 (cannot create a refund)
 * - Refundable: Can create a refund if they exceed tax liability
 *
 * Common credits:
 * - Child Tax Credit (partially refundable)
 * - Child and Dependent Care Credit (non-refundable)
 * - Earned Income Tax Credit (EITC) - refundable
 * - Education credits (American Opportunity, Lifetime Learning)
 * - Retirement Savings Contribution Credit (Saver's Credit)
 * - Foreign Tax Credit
 *
 * This is a simplified implementation focusing on:
 * - Child Tax Credit
 * - EITC
 * - Education credits
 */

import type { TaxCalculationModule, CalculationContext } from './module-interface';
import {
  createTraceStep,
  setIntermediate,
  markModuleExecuted,
  getIntermediate,
  addWarning,
} from './module-interface';

export const TaxCreditsModule: TaxCalculationModule = {
  moduleName: 'tax_credits',
  description: 'Apply federal tax credits (refundable and non-refundable)',
  dependencies: ['total_tax_composer', 'agi_composer'],

  run(context: CalculationContext): CalculationContext {
    const { snapshot, rules } = context;
    const stepNumber = context.traceSteps.length + 1;
    const inputs = snapshot.inputs as any;

    // Get tax liability and AGI
    const totalTaxBeforeCredits = getIntermediate<number>(context, 'totalTaxBeforeCredits', 0);
    const agi = getIntermediate<number>(context, 'agi', 0);
    const filingStatus = getIntermediate<string>(context, 'filingStatus', 'single');

    // Get credit inputs from snapshot
    const childTaxCreditAmount = inputs.childTaxCredit || 0;
    const childDependentCareCredit = inputs.childDependentCareCredit || inputs.childAndDependentCareCredit || 0;
    // EITC calculation - use provided EITC or calculate if needed
    const earnedIncomeTaxCredit = inputs.earnedIncomeTaxCredit || 0;
    const educationCredits = inputs.educationCredits || 0;
    const foreignTaxCredit = inputs.foreignTaxCredit || 0;
    const otherCredits = inputs.otherCredits || 0;

    // Non-refundable credits (can only reduce tax to $0)
    const nonRefundableCredits =
      childDependentCareCredit + educationCredits + foreignTaxCredit + otherCredits;

    // Partially refundable credits (Child Tax Credit)
    // CTC is non-refundable up to tax liability, then partially refundable via ACTC
    const childTaxCreditNonRefundable = Math.min(childTaxCreditAmount, totalTaxBeforeCredits);
    const childTaxCreditRefundable = Math.max(0, childTaxCreditAmount - childTaxCreditNonRefundable);

    // Fully refundable credits (EITC)
    const refundableCredits = earnedIncomeTaxCredit + childTaxCreditRefundable;

    // Apply non-refundable credits first (cannot reduce tax below $0)
    let taxAfterNonRefundableCredits = totalTaxBeforeCredits;

    // Apply child tax credit (non-refundable portion)
    taxAfterNonRefundableCredits = Math.max(
      0,
      taxAfterNonRefundableCredits - childTaxCreditNonRefundable
    );

    // Apply other non-refundable credits
    const otherNonRefundableApplied = Math.min(
      nonRefundableCredits,
      taxAfterNonRefundableCredits
    );
    taxAfterNonRefundableCredits = Math.max(0, taxAfterNonRefundableCredits - otherNonRefundableApplied);

    // Total non-refundable credits actually applied
    const totalNonRefundableCreditsApplied =
      childTaxCreditNonRefundable + otherNonRefundableApplied;

    // Calculate excess non-refundable credits (couldn't be used)
    const excessNonRefundableCredits =
      childTaxCreditNonRefundable +
      nonRefundableCredits -
      totalNonRefundableCreditsApplied;

    // Apply refundable credits (can reduce tax below $0, creating a refund)
    const taxAfterAllCredits = taxAfterNonRefundableCredits - refundableCredits;

    // Total credits applied
    const totalCreditsApplied = totalNonRefundableCreditsApplied + refundableCredits;

    // Store in intermediates
    context = setIntermediate(context, 'childTaxCredit', childTaxCreditAmount);
    context = setIntermediate(context, 'childTaxCreditNonRefundable', childTaxCreditNonRefundable);
    context = setIntermediate(context, 'childTaxCreditRefundable', childTaxCreditRefundable);
    context = setIntermediate(context, 'nonRefundableCredits', nonRefundableCredits);
    context = setIntermediate(context, 'refundableCredits', refundableCredits);
    context = setIntermediate(context, 'totalNonRefundableCreditsApplied', totalNonRefundableCreditsApplied);
    context = setIntermediate(context, 'excessNonRefundableCredits', excessNonRefundableCredits);
    context = setIntermediate(context, 'totalCreditsApplied', totalCreditsApplied);
    context = setIntermediate(context, 'taxAfterCredits', taxAfterAllCredits);

    // Create trace step
    const notes: string[] = [];
    notes.push(`Total tax before credits: $${totalTaxBeforeCredits.toLocaleString()}`);
    notes.push('');

    if (childTaxCreditAmount > 0) {
      notes.push('Child Tax Credit:');
      notes.push(`  Total credit: $${childTaxCreditAmount.toLocaleString()}`);
      notes.push(`  Non-refundable portion: $${childTaxCreditNonRefundable.toLocaleString()}`);
      notes.push(`  Refundable portion (ACTC): $${childTaxCreditRefundable.toLocaleString()}`);
    }

    if (nonRefundableCredits > 0) {
      notes.push('');
      notes.push('Other non-refundable credits:');
      if (childDependentCareCredit > 0)
        notes.push(`  Child & Dependent Care: $${childDependentCareCredit.toLocaleString()}`);
      if (educationCredits > 0)
        notes.push(`  Education credits: $${educationCredits.toLocaleString()}`);
      if (foreignTaxCredit > 0)
        notes.push(`  Foreign tax credit: $${foreignTaxCredit.toLocaleString()}`);
      if (otherCredits > 0) notes.push(`  Other credits: $${otherCredits.toLocaleString()}`);
      notes.push(`  Total: $${nonRefundableCredits.toLocaleString()}`);
      notes.push(`  Applied: $${otherNonRefundableApplied.toLocaleString()}`);
    }

    if (refundableCredits > 0) {
      notes.push('');
      notes.push('Refundable credits:');
      if (earnedIncomeTaxCredit > 0)
        notes.push(`  Earned Income Tax Credit: $${earnedIncomeTaxCredit.toLocaleString()}`);
      if (childTaxCreditRefundable > 0)
        notes.push(
          `  Additional Child Tax Credit: $${childTaxCreditRefundable.toLocaleString()}`
        );
      notes.push(`  Total refundable: $${refundableCredits.toLocaleString()}`);
    }

    notes.push('');
    notes.push(
      `Total credits applied: $${totalCreditsApplied.toLocaleString()} (non-refundable: $${totalNonRefundableCreditsApplied.toLocaleString()}, refundable: $${refundableCredits.toLocaleString()})`
    );

    if (excessNonRefundableCredits > 0) {
      notes.push(
        `Excess non-refundable credits (not used): $${excessNonRefundableCredits.toLocaleString()}`
      );

      context = addWarning(
        context,
        'EXCESS_NON_REFUNDABLE_CREDITS',
        'info',
        `Non-refundable credits of $${excessNonRefundableCredits.toLocaleString()} could not be applied (tax already at $0)`,
        'credits',
        { excessAmount: excessNonRefundableCredits }
      );
    }

    notes.push('');
    if (taxAfterAllCredits >= 0) {
      notes.push(`Tax after credits: $${taxAfterAllCredits.toLocaleString()}`);
    } else {
      notes.push(`Refund from credits: $${Math.abs(taxAfterAllCredits).toLocaleString()}`);
    }

    const traceStep = createTraceStep(
      'tax_credits',
      stepNumber,
      `${rules.rulesVersion}:tax_credits`,
      [
        { field: 'totalTaxBeforeCredits', value: totalTaxBeforeCredits },
        { field: 'childTaxCredit', value: childTaxCreditAmount },
        { field: 'nonRefundableCredits', value: nonRefundableCredits },
        { field: 'refundableCredits', value: refundableCredits },
      ],
      {
        totalCreditsApplied,
        totalNonRefundableCreditsApplied,
        refundableCredits,
        excessNonRefundableCredits,
        taxAfterCredits: taxAfterAllCredits,
      },
      context.warnings.slice(-1), // Include warning if any
      ['total_tax_composer', 'agi_composer'],
      notes
    );

    context = {
      ...context,
      traceSteps: [...context.traceSteps, traceStep],
    };

    // Mark module as executed
    context = markModuleExecuted(context, 'tax_credits');

    return context;
  },
};
