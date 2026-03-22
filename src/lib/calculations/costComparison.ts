import { LoanConfig, ComparisonRates, CostComparisonResult } from '../types';

export function calculateCostComparison(
  loan: LoanConfig,
  rates: ComparisonRates
): CostComparisonResult {
  const { loanAmount, termYears, boxRate, managerFee } = loan;
  const allInRate = boxRate + managerFee;

  const boxInterest = loanAmount * (Math.pow(1 + allInRate, termYears) - 1);
  const marginInterest = loanAmount * rates.marginRate * termYears;
  const sblocInterest = loanAmount * rates.sblocRate * termYears;
  const helocInterest = loanAmount * rates.helocRate * termYears;

  const rateSensitivity: CostComparisonResult['rateSensitivity'] = [];
  const baseRate = boxRate;
  for (let delta = -2.0; delta <= 2.0; delta += 0.25) {
    const testRate = baseRate + delta / 100;
    if (testRate < 0) continue;
    const testAllIn = testRate + managerFee;
    const testInterest = loanAmount * testAllIn * termYears;
    rateSensitivity.push({
      rate: testAllIn,
      boxInterest: testInterest,
      savingsVsMargin: marginInterest - testInterest,
      savingsVsSbloc: sblocInterest - testInterest,
      savingsVsHeloc: helocInterest - testInterest,
    });
  }

  return {
    boxSpread: { totalInterest: boxInterest, annualRate: allInRate },
    marginLoan: { totalInterest: marginInterest, annualRate: rates.marginRate },
    sbloc: { totalInterest: sblocInterest, annualRate: rates.sblocRate },
    heloc: { totalInterest: helocInterest, annualRate: rates.helocRate },
    savingsVsMargin: marginInterest - boxInterest,
    savingsVsSbloc: sblocInterest - boxInterest,
    savingsVsHeloc: helocInterest - boxInterest,
    rateSensitivity,
  };
}
