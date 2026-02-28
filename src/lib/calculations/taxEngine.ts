import { LoanConfig, TaxConfig, ComparisonRates, TaxAnalysisResult } from '../types';

export function calculateTaxAnalysis(
  loan: LoanConfig,
  tax: TaxConfig,
  rates: ComparisonRates
): TaxAnalysisResult {
  const { loanAmount, termYears, boxRate, managerFee } = loan;
  const allInRate = boxRate + managerFee;
  const blended = tax.blended1256Rate;

  const afterTaxRate = allInRate * (1 - blended);
  const annualInterest = loanAmount * allInRate;

  const annualSchedule: TaxAnalysisResult['annualSchedule'] = [];
  let totalTaxSavings = 0;
  let totalCarryforward = 0;

  for (let year = 1; year <= termYears; year++) {
    const accruedInterest = annualInterest;
    const ltLoss = accruedInterest * 0.60;
    const stLoss = accruedInterest * 0.40;

    let gainsOffset: number;
    let taxSavings: number;

    if (tax.annualCGRealized >= accruedInterest) {
      gainsOffset = accruedInterest;
      taxSavings = accruedInterest * blended;
    } else if (tax.annualCGRealized + 3000 >= accruedInterest) {
      gainsOffset = tax.annualCGRealized;
      const excess = accruedInterest - tax.annualCGRealized;
      taxSavings = tax.annualCGRealized * blended + Math.min(3000, excess) * tax.stcgRate;
    } else {
      gainsOffset = tax.annualCGRealized;
      const excessLoss = accruedInterest - tax.annualCGRealized - 3000;
      taxSavings = tax.annualCGRealized * blended + 3000 * tax.stcgRate;
      totalCarryforward += excessLoss;
    }

    const netCost = accruedInterest - taxSavings;
    totalTaxSavings += taxSavings;

    annualSchedule.push({
      year,
      accruedInterest,
      ltLoss,
      stLoss,
      gainsOffset,
      taxSavings,
      netCost,
    });
  }

  let deductionType: TaxAnalysisResult['deductionType'];
  if (tax.annualCGRealized >= annualInterest) {
    deductionType = 'full';
  } else if (tax.annualCGRealized + 3000 >= annualInterest) {
    deductionType = 'partial';
  } else {
    deductionType = 'limited';
  }

  const totalBoxInterest = loanAmount * (Math.pow(1 + allInRate, termYears) - 1);
  const totalMarginInterest = loanAmount * rates.marginRate * termYears;
  const totalSblocInterest = loanAmount * rates.sblocRate * termYears;
  const totalHelocInterest = loanAmount * rates.helocRate * termYears;

  return {
    blended1256Rate: blended,
    afterTaxRate,
    annualSchedule,
    totalTaxSavings,
    deductionType,
    carryforward: totalCarryforward,
    grandComparison: {
      boxSpread: {
        preTaxInterest: totalBoxInterest,
        taxBenefit: totalTaxSavings,
        afterTaxCost: totalBoxInterest - totalTaxSavings,
      },
      marginLoan: {
        preTaxInterest: totalMarginInterest,
        taxBenefit: 0,
        afterTaxCost: totalMarginInterest,
      },
      sbloc: {
        preTaxInterest: totalSblocInterest,
        taxBenefit: 0,
        afterTaxCost: totalSblocInterest,
      },
      heloc: {
        preTaxInterest: totalHelocInterest,
        taxBenefit: 0,
        afterTaxCost: totalHelocInterest,
      },
    },
  };
}
