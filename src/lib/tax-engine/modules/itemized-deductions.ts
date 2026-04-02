/**
 * Itemized Deductions Module
 *
 * Calculates itemized deductions with all applicable limitations:
 * - Medical expenses (7.5% AGI floor)
 * - State and local taxes (SALT cap: $10,000)
 * - Mortgage interest (limitation on acquisition debt)
 * - Investment interest (net investment income limitation)
 * - Charitable contributions (percentage of AGI limits)
 * - Casualty and theft losses (suspended by TCJA)
 * - Other itemized deductions (suspended by TCJA)
 */

import type { TaxCalculationModule, CalculationContext } from './module-interface';
import {
  createTraceStep,
  setIntermediate,
  markModuleExecuted,
  getIntermediate,
  addWarning,
} from './module-interface';

export const ItemizedDeductionsModule: TaxCalculationModule = {
  moduleName: 'itemized_deductions',
  description: 'Calculate itemized deductions with limitations',
  dependencies: ['filing_status_resolver', 'agi_composer'],

  run(context: CalculationContext): CalculationContext {
    const { snapshot, rules } = context;
    const stepNumber = context.traceSteps.length + 1;
    const inputs = snapshot.inputs as any;

    // Get AGI from agi_composer module
    const agi = getIntermediate<number>(context, 'agi', 0);
    const filingStatus = getIntermediate<string>(context, 'filingStatus', 'single');

    // Get deduction limits from rules
    const deductionLimits = rules.deductionLimits as any;
    const saltCap = deductionLimits?.saltCap || 10000;
    const mortgageInterestCap = deductionLimits?.mortgageInterestCap || 750000;
    const charitableCashLimit = deductionLimits?.charitableCashLimit || 0.6;
    const charitablePropertyLimit = deductionLimits?.charitablePropertyLimit || 0.3;
    const medicalExpenseFloor = deductionLimits?.medicalExpenseFloor || 0.075;

    const itemizedBreakdown: Record<string, number> = {};

    // 1. Medical and Dental Expenses (Schedule A, Line 1-4)
    const medicalExpenses = inputs.medicalDentalExpenses || 0;
    if (medicalExpenses > 0) {
      const medicalFloor = agi * medicalExpenseFloor;
      const deductibleMedical = Math.max(0, medicalExpenses - medicalFloor);
      itemizedBreakdown.medicalDentalExpenses = deductibleMedical;

      if (deductibleMedical === 0 && medicalExpenses > 0) {
        context = addWarning(
          context,
          'MEDICAL_EXPENSES_BELOW_FLOOR',
          'info',
          `Medical expenses ($${medicalExpenses.toLocaleString()}) do not exceed ${(
            medicalExpenseFloor * 100
          ).toFixed(1)}% AGI floor ($${medicalFloor.toLocaleString()})`,
          'medicalDentalExpenses',
          { medicalExpenses, agiFloor: medicalFloor, floorPercentage: medicalExpenseFloor }
        );
      }
    }

    // 2. State and Local Taxes (SALT) - Schedule A, Line 5a-5e
    const stateLocalIncomeTaxes = inputs.stateLocalIncomeTaxes || 0;
    const realEstateTaxes = inputs.realEstateTaxes || 0;
    const personalPropertyTaxes = inputs.personalPropertyTaxes || 0;

    const saltTotal = stateLocalIncomeTaxes + realEstateTaxes + personalPropertyTaxes;
    const deductibleSalt = Math.min(saltTotal, saltCap);
    itemizedBreakdown.stateLocalTaxes = deductibleSalt;

    if (saltTotal > saltCap) {
      context = addWarning(
        context,
        'SALT_CAPPED',
        'info',
        `State and local taxes ($${saltTotal.toLocaleString()}) capped at $${saltCap.toLocaleString()}`,
        'stateLocalTaxes',
        { saltTotal, saltCap, excess: saltTotal - saltCap }
      );
    }

    // 3. Mortgage Interest (Schedule A, Line 8a-8e)
    const mortgageInterest = inputs.mortgageInterest || 0;
    if (mortgageInterest > 0) {
      // Simplified: assume all mortgage interest is deductible
      // In reality, need to check acquisition debt limits and home equity debt rules
      itemizedBreakdown.mortgageInterest = mortgageInterest;

      // Note: Full implementation would require:
      // - Acquisition debt amount
      // - Home equity debt amount
      // - Date mortgage was taken out (pre-2018 vs post-2018 rules differ)
      // - Fair market value of home
      // For now, we accept the input as-is with a note
    }

    // 4. Investment Interest (Schedule A, Line 9)
    const investmentInterest = inputs.investmentInterest || 0;
    if (investmentInterest > 0) {
      // Investment interest limited to net investment income
      const preferentialIncomeGross = getIntermediate<number>(context, 'preferentialIncomeGross', 0);
      const taxableInterest = inputs.taxableInterest || 0;
      const netInvestmentIncome = preferentialIncomeGross + taxableInterest;

      const deductibleInvestmentInterest = Math.min(investmentInterest, netInvestmentIncome);
      itemizedBreakdown.investmentInterest = deductibleInvestmentInterest;

      if (investmentInterest > netInvestmentIncome) {
        context = addWarning(
          context,
          'INVESTMENT_INTEREST_LIMITED',
          'info',
          `Investment interest ($${investmentInterest.toLocaleString()}) limited to net investment income ($${netInvestmentIncome.toLocaleString()})`,
          'investmentInterest',
          {
            investmentInterest,
            netInvestmentIncome,
            carryforward: investmentInterest - netInvestmentIncome,
          }
        );
      }
    }

    // 5. Charitable Contributions (Schedule A, Line 11-14)
    const charitableCash = inputs.charitableCashContributions || 0;
    const charitableNoncash = inputs.charitableNoncashContributions || 0;

    let deductibleCharitableCash = 0;
    let deductibleCharitableNoncash = 0;

    if (charitableCash > 0) {
      const cashLimit = agi * charitableCashLimit;
      deductibleCharitableCash = Math.min(charitableCash, cashLimit);

      if (charitableCash > cashLimit) {
        context = addWarning(
          context,
          'CHARITABLE_CASH_LIMITED',
          'info',
          `Charitable cash contributions ($${charitableCash.toLocaleString()}) limited to ${(
            charitableCashLimit * 100
          ).toFixed(0)}% AGI ($${cashLimit.toLocaleString()})`,
          'charitableCashContributions',
          { charitableCash, limit: cashLimit, carryforward: charitableCash - cashLimit }
        );
      }
    }

    if (charitableNoncash > 0) {
      const noncashLimit = agi * charitablePropertyLimit;
      deductibleCharitableNoncash = Math.min(charitableNoncash, noncashLimit);

      if (charitableNoncash > noncashLimit) {
        context = addWarning(
          context,
          'CHARITABLE_NONCASH_LIMITED',
          'info',
          `Charitable noncash contributions ($${charitableNoncash.toLocaleString()}) limited to ${(
            charitablePropertyLimit * 100
          ).toFixed(0)}% AGI ($${noncashLimit.toLocaleString()})`,
          'charitableNoncashContributions',
          { charitableNoncash, limit: noncashLimit, carryforward: charitableNoncash - noncashLimit }
        );
      }
    }

    const totalCharitable = deductibleCharitableCash + deductibleCharitableNoncash;
    if (totalCharitable > 0) {
      itemizedBreakdown.charitableContributions = totalCharitable;
    }

    // 6. Casualty and Theft Losses (suspended by TCJA for 2018-2025 except federally declared disasters)
    const casualtyLosses = inputs.casualtyTheftLosses || 0;
    if (casualtyLosses > 0) {
      context = addWarning(
        context,
        'CASUALTY_LOSSES_SUSPENDED',
        'warning',
        'Casualty and theft losses are suspended for tax years 2018-2025 (except federally declared disasters)',
        'casualtyTheftLosses',
        { casualtyLosses }
      );
      // Do not include in itemized deductions unless it's a federally declared disaster
      // For now, we exclude it
    }

    // 7. Other Itemized Deductions (suspended by TCJA for 2018-2025)
    const otherItemizedDeductions = inputs.otherItemizedDeductions || 0;
    if (otherItemizedDeductions > 0) {
      context = addWarning(
        context,
        'OTHER_ITEMIZED_SUSPENDED',
        'warning',
        'Miscellaneous itemized deductions subject to 2% floor are suspended for tax years 2018-2025',
        'otherItemizedDeductions',
        { otherItemizedDeductions }
      );
      // Do not include in itemized deductions
    }

    // Calculate total itemized deductions
    const totalItemizedDeductions = Object.values(itemizedBreakdown).reduce((sum, amt) => sum + amt, 0);

    // Store in intermediates
    context = setIntermediate(context, 'itemizedDeductions', totalItemizedDeductions);
    context = setIntermediate(context, 'itemizedDeductionsBreakdown', itemizedBreakdown);

    // Create trace step
    const notes: string[] = [];
    if (totalItemizedDeductions === 0) {
      notes.push('No itemized deductions');
    } else {
      notes.push(`Total itemized deductions: $${totalItemizedDeductions.toLocaleString()}`);
      if (itemizedBreakdown.medicalDentalExpenses) {
        notes.push(`  - Medical/dental: $${itemizedBreakdown.medicalDentalExpenses.toLocaleString()}`);
      }
      if (itemizedBreakdown.stateLocalTaxes) {
        notes.push(`  - SALT (capped): $${itemizedBreakdown.stateLocalTaxes.toLocaleString()}`);
      }
      if (itemizedBreakdown.mortgageInterest) {
        notes.push(`  - Mortgage interest: $${itemizedBreakdown.mortgageInterest.toLocaleString()}`);
      }
      if (itemizedBreakdown.investmentInterest) {
        notes.push(`  - Investment interest: $${itemizedBreakdown.investmentInterest.toLocaleString()}`);
      }
      if (itemizedBreakdown.charitableContributions) {
        notes.push(`  - Charitable: $${itemizedBreakdown.charitableContributions.toLocaleString()}`);
      }
    }

    const inputsUsed = [
      { field: 'agi', value: agi },
      { field: 'medicalDentalExpenses', value: medicalExpenses },
      { field: 'stateLocalIncomeTaxes', value: stateLocalIncomeTaxes },
      { field: 'realEstateTaxes', value: realEstateTaxes },
      { field: 'personalPropertyTaxes', value: personalPropertyTaxes },
      { field: 'mortgageInterest', value: mortgageInterest },
      { field: 'investmentInterest', value: investmentInterest },
      { field: 'charitableCashContributions', value: charitableCash },
      { field: 'charitableNoncashContributions', value: charitableNoncash },
    ];

    const traceStep = createTraceStep(
      'itemized_deductions',
      stepNumber,
      `${rules.rulesVersion}:itemized_deductions`,
      inputsUsed,
      {
        totalItemizedDeductions,
        itemizedDeductionsBreakdown: itemizedBreakdown,
        saltCap,
        medicalExpenseFloor,
      },
      [],
      ['filing_status_resolver', 'agi_composer'],
      notes
    );

    context = {
      ...context,
      traceSteps: [...context.traceSteps, traceStep],
    };

    // Mark module as executed
    context = markModuleExecuted(context, 'itemized_deductions');

    return context;
  },
};
