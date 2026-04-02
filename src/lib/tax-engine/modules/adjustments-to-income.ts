/**
 * Adjustments to Income Module
 *
 * Calculates above-the-line deductions (adjustments to income) that reduce gross income to AGI.
 * These deductions are available regardless of whether taxpayer itemizes.
 *
 * Common adjustments:
 * - Traditional IRA contributions
 * - Student loan interest
 * - HSA contributions
 * - Self-employed health insurance
 * - Self-employed retirement contributions
 * - Educator expenses
 * - Moving expenses (military only)
 * - Alimony paid (pre-2019 divorces)
 */

import type { TaxCalculationModule, CalculationContext } from './module-interface';
import {
  createTraceStep,
  setIntermediate,
  markModuleExecuted,
  getIntermediate,
  addWarning,
} from './module-interface';

export const AdjustmentsToIncomeModule: TaxCalculationModule = {
  moduleName: 'adjustments_to_income',
  description: 'Calculate above-the-line deductions (adjustments to income)',
  dependencies: ['filing_status_resolver', 'income_aggregation'],

  run(context: CalculationContext): CalculationContext {
    const { snapshot, rules } = context;
    const stepNumber = context.traceSteps.length + 1;
    const inputs = snapshot.inputs;

    // Get gross income from income_aggregation module
    const grossIncome = getIntermediate<number>(context, 'grossIncome', 0);
    const filingStatus = getIntermediate<string>(context, 'filingStatus', 'single');

    // Collect all adjustment amounts
    const adjustments: Record<string, number> = {};

    // Traditional IRA contributions (deductible portion)
    const iraContributionDeduction = inputs.iraContributionDeduction || 0;
    if (iraContributionDeduction > 0) {
      // Validate against IRA limits from rules
      const iraLimits = rules.retirementContributions?.traditionalIRA;
      if (iraLimits) {
        const maxContribution = iraLimits.totalWithCatchUp || iraLimits.limit || 7000;
        if (iraContributionDeduction > maxContribution) {
          context = addWarning(
            context,
            'IRA_CONTRIBUTION_EXCEEDS_LIMIT',
            'warning',
            `IRA contribution ($${iraContributionDeduction}) exceeds annual limit ($${maxContribution})`,
            'iraContributionDeduction',
            { provided: iraContributionDeduction, limit: maxContribution }
          );
          adjustments.iraContributionDeduction = maxContribution;
        } else {
          adjustments.iraContributionDeduction = iraContributionDeduction;
        }
      } else {
        adjustments.iraContributionDeduction = iraContributionDeduction;
      }
    }

    // Student loan interest (capped at $2,500)
    const studentLoanInterest = inputs.studentLoanInterest || 0;
    if (studentLoanInterest > 0) {
      const studentLoanInterestCap = 2500;
      if (studentLoanInterest > studentLoanInterestCap) {
        context = addWarning(
          context,
          'STUDENT_LOAN_INTEREST_CAPPED',
          'info',
          `Student loan interest capped at $${studentLoanInterestCap}`,
          'studentLoanInterest',
          { provided: studentLoanInterest, capped: studentLoanInterestCap }
        );
        adjustments.studentLoanInterest = studentLoanInterestCap;
      } else {
        adjustments.studentLoanInterest = studentLoanInterest;
      }
    }

    // HSA contributions (deductible portion)
    const hsaDeduction = inputs.hsaDeduction || 0;
    if (hsaDeduction > 0) {
      // Validate against HSA limits from rules
      const hsaLimits = rules.retirementContributions?.hsa;
      if (hsaLimits) {
        // Assume individual for now (would need household composition to determine family)
        const maxContribution = hsaLimits.individual + (hsaLimits.catchUpAmount || 0);
        if (hsaDeduction > maxContribution) {
          context = addWarning(
            context,
            'HSA_CONTRIBUTION_EXCEEDS_LIMIT',
            'warning',
            `HSA contribution ($${hsaDeduction}) exceeds individual limit ($${maxContribution})`,
            'hsaDeduction',
            { provided: hsaDeduction, limit: maxContribution }
          );
          adjustments.hsaDeduction = maxContribution;
        } else {
          adjustments.hsaDeduction = hsaDeduction;
        }
      } else {
        adjustments.hsaDeduction = hsaDeduction;
      }
    }

    // Self-employed health insurance - TODO: Add to TaxInputs interface
    // const selfEmployedHealthInsurance = inputs.selfEmployedHealthInsurance || 0;
    // if (selfEmployedHealthInsurance > 0) {
    //   adjustments.selfEmployedHealthInsurance = selfEmployedHealthInsurance;
    // }

    // Self-employed retirement (SEP, SIMPLE, qualified plans)
    const selfEmployedRetirement = inputs.selfEmployedSepSimple || 0;
    if (selfEmployedRetirement > 0) {
      adjustments.selfEmployedSepSimple = selfEmployedRetirement;
    }

    // Educator expenses (capped at $300 per person, $600 MFJ if both educators)
    const educatorExpenses = inputs.educatorExpenses || 0;
    if (educatorExpenses > 0) {
      const educatorExpensesCap = filingStatus === 'married_filing_jointly' ? 600 : 300;
      if (educatorExpenses > educatorExpensesCap) {
        context = addWarning(
          context,
          'EDUCATOR_EXPENSES_CAPPED',
          'info',
          `Educator expenses capped at $${educatorExpensesCap}`,
          'educatorExpenses',
          { provided: educatorExpenses, capped: educatorExpensesCap }
        );
        adjustments.educatorExpenses = educatorExpensesCap;
      } else {
        adjustments.educatorExpenses = educatorExpenses;
      }
    }

    // Alimony paid (only for divorces finalized before 2019)
    const alimonyPaid = inputs.alimonyPaid || 0;
    if (alimonyPaid > 0) {
      adjustments.alimonyPaid = alimonyPaid;
    }

    // Moving expenses (military only, post-TCJA)
    const movingExpensesArmedForces = inputs.movingExpensesArmedForces || 0;
    if (movingExpensesArmedForces > 0) {
      adjustments.movingExpensesArmedForces = movingExpensesArmedForces;
    }

    // Other adjustments (catch-all)
    const otherAdjustments = inputs.otherAdjustments || 0;
    if (otherAdjustments > 0) {
      adjustments.otherAdjustments = otherAdjustments;
    }

    // Calculate total adjustments
    const totalAdjustments = Object.values(adjustments).reduce((sum, amt) => sum + amt, 0);

    // Store in intermediates
    context = setIntermediate(context, 'adjustmentsToIncome', totalAdjustments);
    context = setIntermediate(context, 'adjustmentsBreakdown', adjustments);

    // Create trace step
    const inputsUsed = [];
    for (const [field, value] of Object.entries(adjustments)) {
      inputsUsed.push({ field, value });
    }

    const notes: string[] = [];
    if (totalAdjustments === 0) {
      notes.push('No adjustments to income');
    } else {
      notes.push(`Total adjustments: $${totalAdjustments.toLocaleString()}`);
      if (adjustments.iraContributionDeduction) {
        notes.push(`  - IRA contributions: $${adjustments.iraContributionDeduction.toLocaleString()}`);
      }
      if (adjustments.studentLoanInterest) {
        notes.push(`  - Student loan interest: $${adjustments.studentLoanInterest.toLocaleString()}`);
      }
      if (adjustments.hsaDeduction) {
        notes.push(`  - HSA contributions: $${adjustments.hsaDeduction.toLocaleString()}`);
      }
      if (adjustments.selfEmployedHealthInsurance) {
        notes.push(
          `  - Self-employed health insurance: $${adjustments.selfEmployedHealthInsurance.toLocaleString()}`
        );
      }
      if (adjustments.selfEmployedRetirement) {
        notes.push(`  - Self-employed retirement: $${adjustments.selfEmployedRetirement.toLocaleString()}`);
      }
    }

    const traceStep = createTraceStep(
      'adjustments_to_income',
      stepNumber,
      `${rules.rulesVersion}:adjustments`,
      [
        { field: 'grossIncome', value: grossIncome },
        ...inputsUsed,
      ],
      {
        totalAdjustments,
        adjustmentsBreakdown: adjustments,
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
    context = markModuleExecuted(context, 'adjustments_to_income');

    return context;
  },
};
