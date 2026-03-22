import { LoanConfig, PortfolioConfig, StressTestResult } from '../types';
import { HISTORICAL_DRAWDOWNS } from '../data/historicalDrawdowns';

export function calculateStressTest(
  loan: LoanConfig,
  portfolio: PortfolioConfig
): StressTestResult {
  const { portfolioValue, loanAmount, termYears, boxRate, managerFee, marginType, portfolioComposition } = loan;
  const allInRate = boxRate + managerFee;

  let initialMarginPct: number;
  let maintenanceMarginPct: number;

  if (marginType === 'portfolio_margin') {
    initialMarginPct = 0.85;
    maintenanceMarginPct = 0.15;
  } else {
    switch (portfolioComposition) {
      case 'equities':
        initialMarginPct = 0.50;
        maintenanceMarginPct = 0.35;
        break;
      case 'etfs':
        initialMarginPct = 0.40;
        maintenanceMarginPct = 0.30;
        break;
      default:
        initialMarginPct = 0.50;
        maintenanceMarginPct = 0.30;
    }
  }

  const boxObligation = loanAmount * (1 + allInRate * termYears);
  const remainingPortfolio = portfolioValue - loanAmount;

  const maxBorrowable = portfolioValue * initialMarginPct - (loanAmount * allInRate * termYears);

  const marginCallPortfolioValue = boxObligation / (1 - maintenanceMarginPct);
  const declineToMarginCall = 1 - (marginCallPortfolioValue / remainingPortfolio);
  const declineDollars = remainingPortfolio - marginCallPortfolioValue;

  const declines = [0.10, 0.20, 0.30, 0.40, 0.50, 0.60, 0.70, 0.80];
  const scenarios = declines.map(decline => {
    const stressedPortfolio = remainingPortfolio * (1 - decline);
    const equity = stressedPortfolio - boxObligation;
    const equityPct = stressedPortfolio > 0 ? equity / stressedPortfolio : 0;
    const excessEquity = equity - stressedPortfolio * maintenanceMarginPct;

    let status: 'safe' | 'warning' | 'margin_call';
    if (equityPct > (1 - maintenanceMarginPct) * 1.2) {
      status = 'safe';
    } else if (equityPct > (1 - maintenanceMarginPct)) {
      status = 'warning';
    } else {
      status = 'margin_call';
    }

    return {
      decline,
      portfolioValue: stressedPortfolio,
      boxObligation,
      equity,
      equityPct,
      status,
      excessEquity,
    };
  });

  const historicalEvents = HISTORICAL_DRAWDOWNS.map(event => {
    const stressedValue = remainingPortfolio * (1 - event.decline);
    return {
      name: event.name,
      decline: event.decline,
      duration: event.duration,
      wouldTrigger: stressedValue < marginCallPortfolioValue,
    };
  });

  const ltvSensitivity: StressTestResult['ltvSensitivity'] = [];
  for (let ltv = 0.05; ltv <= 0.50; ltv += 0.05) {
    const testLoan = portfolioValue * ltv;
    const testRemaining = portfolioValue - testLoan;
    const testObligation = testLoan * (1 + allInRate * termYears);
    const testMCThreshold = testObligation / (1 - maintenanceMarginPct);
    const testMaxDecline = 1 - (testMCThreshold / testRemaining);

    ltvSensitivity.push({
      ltv,
      loan: testLoan,
      maxDecline: Math.max(0, testMaxDecline),
    });
  }

  return {
    initialMarginPct,
    maintenanceMarginPct,
    maxBorrowable: Math.max(0, maxBorrowable),
    marginCallPortfolioValue,
    declineToMarginCall: Math.max(0, declineToMarginCall),
    declineDollars: Math.max(0, declineDollars),
    boxObligation,
    remainingPortfolio,
    scenarios,
    historicalEvents,
    ltvSensitivity,
  };
}
