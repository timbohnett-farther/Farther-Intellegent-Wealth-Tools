/**
 * Final Tax Module
 *
 * Calculates the final tax liability or refund by:
 * 1. Taking tax after credits
 * 2. Subtracting payments and withholding
 * 3. Determining if taxpayer owes tax or receives a refund
 *
 * This is the final step in the tax calculation pipeline.
 */

import type { TaxCalculationModule, CalculationContext } from './module-interface';
import {
  createTraceStep,
  setIntermediate,
  markModuleExecuted,
  getIntermediate,
  addWarning,
} from './module-interface';

export const FinalTaxModule: TaxCalculationModule = {
  moduleName: 'final_tax',
  description: 'Calculate final tax due or refund after credits and payments',
  dependencies: ['tax_credits'],

  run(context: CalculationContext): CalculationContext {
    const { snapshot, rules } = context;
    const stepNumber = context.traceSteps.length + 1;
    const inputs = snapshot.inputs as any;

    // Get tax after credits
    const taxAfterCredits = getIntermediate<number>(context, 'taxAfterCredits', 0);

    // Get payments and withholding
    const federalTaxWithheld = inputs.federalIncomeTaxWithheld || 0;
    const estimatedTaxPayments = inputs.estimatedTaxPayments || 0;
    const excessSocialSecurityWithheld = inputs.excessSocialSecurityWithheld || 0;

    // Total payments
    const totalPayments = federalTaxWithheld + estimatedTaxPayments + excessSocialSecurityWithheld;

    // Calculate final tax due or refund
    // Positive = tax due, Negative = refund
    const taxDueOrRefund = taxAfterCredits - totalPayments;

    // Determine if taxpayer owes or gets refund
    const taxDue = Math.max(0, taxDueOrRefund);
    const refund = Math.max(0, -taxDueOrRefund);

    // Check for underpayment penalty (simplified)
    let underpaymentPenalty = 0;
    const agi = getIntermediate<number>(context, 'agi', 0);
    const totalTaxBeforeCredits = getIntermediate<number>(context, 'totalTaxBeforeCredits', 0);

    // Simplified penalty: If tax due > $1000 AND withholding < 90% of tax liability
    if (taxDue > 1000 && totalPayments < totalTaxBeforeCredits * 0.9) {
      // Estimate penalty at 3% of underpayment (simplified)
      const underpayment = totalTaxBeforeCredits * 0.9 - totalPayments;
      underpaymentPenalty = Math.round(underpayment * 0.03 * 100) / 100;

      context = addWarning(
        context,
        'UNDERPAYMENT_PENALTY',
        'warning',
        `Potential underpayment penalty of $${underpaymentPenalty.toLocaleString()} (simplified estimate)`,
        'payments',
        {
          taxDue,
          totalPayments,
          requiredPayment: totalTaxBeforeCredits * 0.9,
          estimatedPenalty: underpaymentPenalty,
        }
      );
    }

    // Add penalty to tax due if applicable
    const totalAmountDue = taxDue + underpaymentPenalty;

    // Store in intermediates
    context = setIntermediate(context, 'federalTaxWithheld', federalTaxWithheld);
    context = setIntermediate(context, 'estimatedTaxPayments', estimatedTaxPayments);
    context = setIntermediate(context, 'totalPayments', totalPayments);
    context = setIntermediate(context, 'taxDue', taxDue);
    context = setIntermediate(context, 'refund', refund);
    context = setIntermediate(context, 'underpaymentPenalty', underpaymentPenalty);
    context = setIntermediate(context, 'totalAmountDue', totalAmountDue);

    // Create trace step
    const notes: string[] = [];
    notes.push(`Tax after credits: $${taxAfterCredits.toLocaleString()}`);
    notes.push('');
    notes.push('Payments and withholding:');
    if (federalTaxWithheld > 0)
      notes.push(`  Federal tax withheld: $${federalTaxWithheld.toLocaleString()}`);
    if (estimatedTaxPayments > 0)
      notes.push(`  Estimated tax payments: $${estimatedTaxPayments.toLocaleString()}`);
    if (excessSocialSecurityWithheld > 0)
      notes.push(
        `  Excess Social Security withheld: $${excessSocialSecurityWithheld.toLocaleString()}`
      );
    notes.push(`  Total payments: $${totalPayments.toLocaleString()}`);
    notes.push('');

    if (refund > 0) {
      notes.push(`✓ REFUND: $${refund.toLocaleString()}`);
      notes.push('Taxpayer will receive a refund');
    } else if (taxDue > 0) {
      notes.push(`TAX DUE: $${taxDue.toLocaleString()}`);
      if (underpaymentPenalty > 0) {
        notes.push(`Underpayment penalty: $${underpaymentPenalty.toLocaleString()}`);
        notes.push(`TOTAL AMOUNT DUE: $${totalAmountDue.toLocaleString()}`);
      }
      notes.push('Taxpayer owes additional tax');
    } else {
      notes.push('✓ Tax fully paid — no refund, no amount due');
    }

    const traceStep = createTraceStep(
      'final_tax',
      stepNumber,
      `${rules.rulesVersion}:final_tax`,
      [
        { field: 'taxAfterCredits', value: taxAfterCredits },
        { field: 'federalTaxWithheld', value: federalTaxWithheld },
        { field: 'estimatedTaxPayments', value: estimatedTaxPayments },
        { field: 'totalPayments', value: totalPayments },
      ],
      {
        taxDue,
        refund,
        underpaymentPenalty,
        totalAmountDue,
      },
      underpaymentPenalty > 0 ? context.warnings.slice(-1) : [],
      ['tax_credits'],
      notes
    );

    context = {
      ...context,
      traceSteps: [...context.traceSteps, traceStep],
    };

    // Mark module as executed
    context = markModuleExecuted(context, 'final_tax');

    return context;
  },
};
