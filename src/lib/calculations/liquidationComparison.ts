import { LoanConfig, TaxConfig, PortfolioConfig, LiquidationComparisonResult } from '../types';
import { getIRMAASurcharge } from '../data/irmaaTables';

export function calculateLiquidationComparison(
  loan: LoanConfig,
  tax: TaxConfig,
  portfolio: PortfolioConfig
): LiquidationComparisonResult {
  const { portfolioValue, loanAmount, termYears, boxRate, managerFee } = loan;
  const allInRate = boxRate + managerFee;

  const unrealizedGain = portfolioValue - portfolio.costBasis;
  const gainPct = portfolioValue > 0 ? unrealizedGain / portfolioValue : 0;

  const realizedGain = loanAmount * gainPct;
  const federalLTCGTax = realizedGain * tax.ltcgRate;
  const niitTax = realizedGain * tax.niitRate;
  const stateTax = realizedGain * tax.stateCGRate;
  const totalTax = federalLTCGTax + niitTax + stateTax;

  const netAfterTaxProceeds = loanAmount - totalTax;
  const totalTaxRate = tax.ltcgRate + tax.niitRate + tax.stateCGRate;

  const grossUpAmount = loanAmount / (1 - gainPct * totalTaxRate);
  const grossUpTax = grossUpAmount * gainPct * totalTaxRate;

  const currentAGI = tax.taxableIncome;
  const agiAfterSale = currentAGI + realizedGain;
  const irmaaSurcharge = getIRMAASurcharge(currentAGI, agiAfterSale, tax.filingStatus);

  // Total cost: selling
  const lostFutureGrowth =
    loanAmount * (Math.pow(1 + portfolio.expectedReturn, termYears) - 1);
  const sellTotal = totalTax + irmaaSurcharge + lostFutureGrowth;

  // Total cost: borrowing
  const totalBoxInterest = loanAmount * (Math.pow(1 + allInRate, termYears) - 1);
  const taxBenefit = totalBoxInterest * tax.blended1256Rate;
  const borrowTotal = totalBoxInterest - taxBenefit;

  return {
    unrealizedGain,
    realizedGain,
    federalLTCGTax,
    niitTax,
    stateTax,
    totalTax,
    netAfterTaxProceeds,
    grossUpAmount,
    grossUpTax,
    agiImpact: {
      currentAGI,
      agiAfterSale,
      irmaaSurcharge,
    },
    totalCostComparison: {
      sellTotal,
      borrowTotal,
      netAdvantage: sellTotal - borrowTotal,
    },
  };
}
