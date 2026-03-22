import { LoanConfig, TaxConfig, PortfolioConfig, ComparisonRates, OpportunityCostResult } from '../types';
import { MISSED_MARKET_DAYS } from '../data/historicalDrawdowns';

export function calculateOpportunityCost(
  loan: LoanConfig,
  tax: TaxConfig,
  portfolio: PortfolioConfig,
  rates: ComparisonRates
): OpportunityCostResult {
  const { portfolioValue, loanAmount, termYears, boxRate, managerFee } = loan;
  const allInRate = boxRate + managerFee;
  const { expectedReturn } = portfolio;

  const unrealizedGainPct = portfolio.unrealizedGainPct;
  const totalTaxRate = tax.ltcgRate + tax.niitRate + tax.stateCGRate;
  const taxOnSale = loanAmount * unrealizedGainPct * totalTaxRate;

  const projectionYears = Math.ceil(termYears) + 10;

  // Scenario A: Sell assets
  const remainingPortfolioA = portfolioValue - loanAmount;
  const scenarioSell: OpportunityCostResult['scenarioSell'] = [];
  for (let year = 0; year <= projectionYears; year++) {
    const pv = remainingPortfolioA * Math.pow(1 + expectedReturn, year);
    scenarioSell.push({
      year,
      portfolioValue: pv,
      totalWealth: pv + (loanAmount - taxOnSale),
    });
  }

  // Scenario B: Borrow via box spread
  const remainingPortfolioB = portfolioValue - loanAmount;
  const scenarioBorrow: OpportunityCostResult['scenarioBorrow'] = [];
  for (let year = 0; year <= projectionYears; year++) {
    const pv = remainingPortfolioB * Math.pow(1 + expectedReturn, year);
    let totalWealth: number;
    if (year <= termYears) {
      const accruedObligation = loanAmount * (1 + allInRate * year);
      totalWealth = pv - accruedObligation + loanAmount;
    } else {
      const boxRepayment = loanAmount * (1 + allInRate * termYears);
      const totalInterest = boxRepayment - loanAmount;
      const taxSavings = totalInterest * tax.blended1256Rate;
      totalWealth = pv - boxRepayment + loanAmount + taxSavings;
    }
    scenarioBorrow.push({ year, portfolioValue: pv, totalWealth });
  }

  // Scenario C: Borrow via margin loan
  const scenarioMargin: OpportunityCostResult['scenarioMargin'] = [];
  for (let year = 0; year <= projectionYears; year++) {
    const pv = portfolioValue * Math.pow(1 + expectedReturn, year);
    const cumulativeInterest = loanAmount * rates.marginRate * Math.min(year, termYears);
    const totalWealth = pv - loanAmount - cumulativeInterest;
    scenarioMargin.push({ year, portfolioValue: pv, totalWealth });
  }

  // Break-even return
  const boxRepayment = loanAmount * (1 + allInRate * termYears);
  const breakEvenReturn = Math.pow((boxRepayment + taxOnSale) / loanAmount, 1 / termYears) - 1;

  const termIdx = Math.ceil(termYears);
  const wealthDifference = scenarioBorrow[termIdx]?.totalWealth - scenarioSell[termIdx]?.totalWealth;

  // Missed market days analysis
  const missedDaysAnalysis = MISSED_MARKET_DAYS.map(md => {
    const wealthIfSold = (portfolioValue - loanAmount - taxOnSale) * Math.pow(1 + md.adjustedReturn, termYears);
    const portfolioBorrowed = (portfolioValue - loanAmount) * Math.pow(1 + md.adjustedReturn, termYears);
    const boxCost = boxRepayment - loanAmount;
    const taxSavings = boxCost * tax.blended1256Rate;
    const wealthIfBorrowed = portfolioBorrowed - boxRepayment + loanAmount + taxSavings;
    return {
      scenario: md.scenario,
      adjustedReturn: md.adjustedReturn,
      wealthIfSold,
      wealthIfBorrowed,
      opportunityCost: wealthIfBorrowed - wealthIfSold,
    };
  });

  return {
    scenarioSell,
    scenarioBorrow,
    scenarioMargin,
    breakEvenReturn,
    wealthDifference,
    missedDaysAnalysis,
  };
}
