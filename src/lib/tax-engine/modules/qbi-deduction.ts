/**
 * QBI (Qualified Business Income) Deduction Module
 *
 * Calculates the Section 199A deduction for qualified business income.
 * This is a 20% deduction for pass-through business income (S-corps, partnerships, sole proprietorships).
 *
 * Rules:
 * - Basic deduction: 20% of QBI
 * - Subject to limitations based on taxable income thresholds
 * - Phaseout for specified service trades or businesses (SSTB)
 * - W-2 wage and property limitations apply above threshold
 *
 * Simplified implementation focuses on:
 * - Basic 20% deduction
 * - Threshold-based limitations
 * - SSTB phaseout
 */

import type { TaxCalculationModule, CalculationContext } from './module-interface';
import {
  createTraceStep,
  setIntermediate,
  markModuleExecuted,
  getIntermediate,
  addWarning,
} from './module-interface';

export const QBIDeductionModule: TaxCalculationModule = {
  moduleName: 'qbi_deduction',
  description: 'Calculate Section 199A qualified business income deduction',
  dependencies: ['filing_status_resolver', 'agi_composer', 'deduction_chooser'],

  run(context: CalculationContext): CalculationContext {
    const { snapshot, rules } = context;
    const stepNumber = context.traceSteps.length + 1;
    const inputs = snapshot.inputs as any;

    // Get AGI and deductions from previous modules
    const agi = getIntermediate<number>(context, 'agi', 0);
    const totalDeduction = getIntermediate<number>(context, 'totalDeduction', 0);
    const filingStatus = getIntermediate<string>(context, 'filingStatus', 'single');

    // Taxable income before QBI deduction
    const taxableIncomeBeforeQBI = Math.max(0, agi - totalDeduction);

    // Get QBI-related inputs
    // Use K-1 QBI if available, otherwise use business income
    const k1QBI = inputs.k1Section199AQualifiedBusinessIncome || 0;
    const businessIncome = Math.max(0, inputs.businessIncomeLoss || 0);
    const qualifiedBusinessIncome = k1QBI || businessIncome;
    const isSpecifiedServiceBusiness = false; // TODO: Add to TaxInputs interface

    // If no QBI, skip calculation
    if (qualifiedBusinessIncome === 0) {
      context = setIntermediate(context, 'qbiDeduction', 0);

      const traceStep = createTraceStep(
        'qbi_deduction',
        stepNumber,
        `${rules.rulesVersion}:qbi`,
        [
          { field: 'qualifiedBusinessIncome', value: qualifiedBusinessIncome },
          { field: 'taxableIncomeBeforeQBI', value: taxableIncomeBeforeQBI },
        ],
        {
          qbiDeduction: 0,
        },
        [],
        ['filing_status_resolver', 'agi_composer', 'deduction_chooser'],
        ['No qualified business income — QBI deduction is $0']
      );

      context = {
        ...context,
        traceSteps: [...context.traceSteps, traceStep],
      };

      context = markModuleExecuted(context, 'qbi_deduction');
      return context;
    }

    // Get Section 199A rules
    const section199A = rules.section199A;
    if (!section199A) {
      context = addWarning(
        context,
        'MISSING_QBI_RULES',
        'soft_fail',
        'Section 199A rules not found in rules package',
        'qualifiedBusinessIncome',
        { rulesVersion: rules.rulesVersion }
      );

      context = setIntermediate(context, 'qbiDeduction', 0);

      const traceStep = createTraceStep(
        'qbi_deduction',
        stepNumber,
        `${rules.rulesVersion}:qbi`,
        [{ field: 'qualifiedBusinessIncome', value: qualifiedBusinessIncome }],
        { qbiDeduction: 0 },
        [context.warnings[context.warnings.length - 1]],
        ['filing_status_resolver', 'agi_composer', 'deduction_chooser']
      );

      context = {
        ...context,
        traceSteps: [...context.traceSteps, traceStep],
      };

      context = markModuleExecuted(context, 'qbi_deduction');
      return context;
    }

    const deductionRate = section199A.deductionRate || 0.2;
    const thresholds = section199A.thresholdAmount;

    const threshold = thresholds[filingStatus as keyof typeof thresholds] || 0;

    // Phaseout range depends on filing status
    let phaseout = 0;
    if (filingStatus === 'married_filing_jointly' || filingStatus === 'qualifying_surviving_spouse') {
      phaseout = section199A.phaseoutRangeMFJ || 100000;
    } else {
      phaseout = section199A.phaseoutRange || 50000;
    }

    // Basic QBI deduction (20% of QBI)
    const basicQBIDeduction = qualifiedBusinessIncome * deductionRate;

    let qbiDeduction = basicQBIDeduction;
    let limitationApplied = false;
    const notes: string[] = [];

    // Apply limitations based on taxable income
    if (taxableIncomeBeforeQBI <= threshold) {
      // Below threshold: full deduction allowed (no limitations)
      qbiDeduction = Math.min(basicQBIDeduction, taxableIncomeBeforeQBI * deductionRate);
      notes.push(
        `Taxable income ($${taxableIncomeBeforeQBI.toLocaleString()}) below threshold ($${threshold.toLocaleString()}) — full deduction allowed`
      );
    } else if (taxableIncomeBeforeQBI > threshold && taxableIncomeBeforeQBI <= threshold + phaseout) {
      // In phaseout range
      if (isSpecifiedServiceBusiness) {
        // SSTB: phaseout applies
        const phaseoutPercentage = (taxableIncomeBeforeQBI - threshold) / phaseout;
        qbiDeduction = basicQBIDeduction * (1 - phaseoutPercentage);
        limitationApplied = true;

        notes.push(
          `SSTB in phaseout range: ${(phaseoutPercentage * 100).toFixed(1)}% phaseout applied`
        );
        notes.push(
          `Deduction reduced from $${basicQBIDeduction.toLocaleString()} to $${qbiDeduction.toLocaleString()}`
        );

        context = addWarning(
          context,
          'QBI_SSTB_PHASEOUT',
          'info',
          'QBI deduction phased out for specified service trade or business (SSTB)',
          'qualifiedBusinessIncome',
          {
            taxableIncome: taxableIncomeBeforeQBI,
            threshold,
            phaseoutPercentage,
            basicDeduction: basicQBIDeduction,
            reducedDeduction: qbiDeduction,
          }
        );
      } else {
        // Non-SSTB: W-2 wage and property limitations apply (simplified)
        // For simplification, we'll allow the deduction but note that limitations may apply
        qbiDeduction = basicQBIDeduction;

        notes.push(
          'In phaseout range — W-2 wage and property limitations may apply (simplified calculation)'
        );

        context = addWarning(
          context,
          'QBI_WAGE_LIMITATION_SIMPLIFIED',
          'info',
          'QBI deduction may be limited by W-2 wages or property basis (simplified calculation used)',
          'qualifiedBusinessIncome',
          { taxableIncome: taxableIncomeBeforeQBI, threshold }
        );
      }
    } else {
      // Above threshold + phaseout
      if (isSpecifiedServiceBusiness) {
        // SSTB: no deduction allowed
        qbiDeduction = 0;
        limitationApplied = true;

        notes.push('SSTB above phaseout threshold — no QBI deduction allowed');

        context = addWarning(
          context,
          'QBI_SSTB_DISALLOWED',
          'warning',
          'QBI deduction disallowed for specified service trade or business (SSTB) above phaseout threshold',
          'qualifiedBusinessIncome',
          { taxableIncome: taxableIncomeBeforeQBI, threshold: threshold + phaseout }
        );
      } else {
        // Non-SSTB: W-2 wage and property limitations apply (simplified)
        qbiDeduction = basicQBIDeduction;

        notes.push('Above threshold — W-2 wage and property limitations apply (simplified calculation)');

        context = addWarning(
          context,
          'QBI_WAGE_LIMITATION_SIMPLIFIED',
          'info',
          'QBI deduction may be limited by W-2 wages or property basis (simplified calculation used)',
          'qualifiedBusinessIncome',
          { taxableIncome: taxableIncomeBeforeQBI }
        );
      }
    }

    // QBI deduction cannot exceed taxable income
    qbiDeduction = Math.min(qbiDeduction, taxableIncomeBeforeQBI);

    // Round to 2 decimal places
    qbiDeduction = Math.round(qbiDeduction * 100) / 100;

    // Store in intermediates
    context = setIntermediate(context, 'qbiDeduction', qbiDeduction);
    context = setIntermediate(context, 'qbiBasicDeduction', basicQBIDeduction);
    context = setIntermediate(context, 'qbiLimitationApplied', limitationApplied);

    // Add summary notes
    notes.unshift(`Qualified business income: $${qualifiedBusinessIncome.toLocaleString()}`);
    notes.unshift(`Basic QBI deduction (20%): $${basicQBIDeduction.toLocaleString()}`);
    notes.push(`Final QBI deduction: $${qbiDeduction.toLocaleString()}`);

    const traceStep = createTraceStep(
      'qbi_deduction',
      stepNumber,
      `${rules.rulesVersion}:qbi`,
      [
        { field: 'qualifiedBusinessIncome', value: qualifiedBusinessIncome },
        { field: 'taxableIncomeBeforeQBI', value: taxableIncomeBeforeQBI },
        { field: 'isSpecifiedServiceBusiness', value: isSpecifiedServiceBusiness },
        { field: 'threshold', value: threshold },
      ],
      {
        qbiDeduction,
        basicQBIDeduction,
        limitationApplied,
      },
      [],
      ['filing_status_resolver', 'agi_composer', 'deduction_chooser'],
      notes
    );

    context = {
      ...context,
      traceSteps: [...context.traceSteps, traceStep],
    };

    // Mark module as executed
    context = markModuleExecuted(context, 'qbi_deduction');

    return context;
  },
};
