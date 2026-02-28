import { LoanConfig, PortfolioConfig, MonteCarloResult } from '../types';

function normalRandom(): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

export function runMonteCarlo(
  loan: LoanConfig,
  portfolio: PortfolioConfig,
  simulations: number = 10000
): MonteCarloResult {
  const { portfolioValue, loanAmount, termYears, boxRate, managerFee } = loan;
  const allInRate = boxRate + managerFee;
  const { expectedReturn, volatility } = portfolio;

  let maintenanceMarginPct: number;
  if (loan.marginType === 'portfolio_margin') {
    maintenanceMarginPct = 0.15;
  } else {
    maintenanceMarginPct = loan.portfolioComposition === 'equities' ? 0.35 : 0.30;
  }

  const totalMonths = Math.round(termYears * 12);
  const drift = (expectedReturn - 0.5 * volatility * volatility) / 12;
  const volMonthly = volatility / Math.sqrt(12);
  const initialPortfolio = portfolioValue - loanAmount;

  let marginCallCount = 0;
  let marginCallMonthSum = 0;
  const terminalValues: number[] = [];

  // For fan chart percentiles, collect values at each month
  const monthlyValues: number[][] = Array.from({ length: totalMonths + 1 }, () => []);

  for (let s = 0; s < simulations; s++) {
    let portfolio_s = initialPortfolio;
    let marginCalled = false;

    monthlyValues[0].push(portfolio_s);

    for (let m = 1; m <= totalMonths; m++) {
      const z = normalRandom();
      const monthlyReturn = drift + volMonthly * z;
      portfolio_s = portfolio_s * Math.exp(monthlyReturn);

      const currentObligation = loanAmount * (1 + allInRate * (m / 12));
      const equity = portfolio_s - currentObligation;
      const equityPct = portfolio_s > 0 ? equity / portfolio_s : 0;

      if (equityPct < (1 - maintenanceMarginPct)) {
        marginCallCount++;
        marginCallMonthSum += m;
        marginCalled = true;
        // Fill remaining months with the margin call value
        for (let r = m; r <= totalMonths; r++) {
          monthlyValues[r].push(portfolio_s);
        }
        break;
      }

      monthlyValues[m].push(portfolio_s);
    }

    if (!marginCalled) {
      terminalValues.push(portfolio_s);
    }
  }

  const probabilityOfMarginCall = (marginCallCount / simulations) * 100;
  const averageTimeToMC = marginCallCount > 0 ? marginCallMonthSum / marginCallCount : 0;

  terminalValues.sort((a, b) => a - b);
  const percentile = (arr: number[], p: number) => {
    if (arr.length === 0) return 0;
    const idx = Math.floor(arr.length * p);
    return arr[Math.min(idx, arr.length - 1)];
  };

  const medianTerminalPortfolio = percentile(terminalValues, 0.5);
  const boxRepayment = loanAmount * (1 + allInRate * termYears);
  const medianNetWealth = medianTerminalPortfolio - boxRepayment + loanAmount;

  const probabilityPortfolioGrows = terminalValues.filter(v => v > initialPortfolio).length / Math.max(terminalValues.length, 1) * 100;

  // Fan chart data (sampled at monthly intervals)
  const fanInterval = Math.max(1, Math.floor(totalMonths / 60)); // sample ~60 points max
  const fanChartData: MonteCarloResult['fanChartData'] = [];

  for (let m = 0; m <= totalMonths; m += fanInterval) {
    const values = monthlyValues[m];
    if (!values || values.length === 0) continue;
    values.sort((a, b) => a - b);
    const obligation = loanAmount * (1 + allInRate * (m / 12));
    const mcLine = obligation / (1 - maintenanceMarginPct);

    fanChartData.push({
      month: m,
      p5: percentile(values, 0.05),
      p25: percentile(values, 0.25),
      p50: percentile(values, 0.50),
      p75: percentile(values, 0.75),
      p95: percentile(values, 0.95),
      marginCallLine: mcLine,
    });
  }

  // Ensure the last month is always included
  if (totalMonths % fanInterval !== 0 && monthlyValues[totalMonths]?.length > 0) {
    const values = monthlyValues[totalMonths];
    values.sort((a, b) => a - b);
    const obligation = loanAmount * (1 + allInRate * termYears);
    const mcLine = obligation / (1 - maintenanceMarginPct);
    fanChartData.push({
      month: totalMonths,
      p5: percentile(values, 0.05),
      p25: percentile(values, 0.25),
      p50: percentile(values, 0.50),
      p75: percentile(values, 0.75),
      p95: percentile(values, 0.95),
      marginCallLine: mcLine,
    });
  }

  return {
    probabilityOfMarginCall,
    averageTimeToMC,
    medianTerminalPortfolio,
    medianNetWealth,
    percentiles: {
      p5: percentile(terminalValues, 0.05),
      p25: percentile(terminalValues, 0.25),
      p50: percentile(terminalValues, 0.50),
      p75: percentile(terminalValues, 0.75),
      p95: percentile(terminalValues, 0.95),
    },
    fanChartData,
    probabilityPortfolioGrows,
  };
}
