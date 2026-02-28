import { LoanConfig, ComparisonRates, PortfolioConfig, CashFlowScheduleResult } from '../types';

export function calculateCashFlowSchedule(
  loan: LoanConfig,
  rates: ComparisonRates,
  portfolio: PortfolioConfig
): CashFlowScheduleResult {
  const { loanAmount, termYears, boxRate, managerFee } = loan;
  const allInRate = boxRate + managerFee;
  const totalMonths = Math.round(termYears * 12);

  // Box spread cash flow (balloon)
  const obligation = loanAmount * (1 + allInRate * termYears);
  const boxSpread: CashFlowScheduleResult['boxSpread'] = [
    { date: 'Initiation', description: 'Receive net premium', cashFlow: loanAmount, runningBalance: loanAmount },
    { date: 'Initiation', description: 'Withdraw loan amount', cashFlow: -loanAmount, runningBalance: 0 },
  ];

  for (let year = 1; year <= Math.ceil(termYears); year++) {
    boxSpread.push({
      date: `Year ${year} EOY`,
      description: 'MTM loss recognized for tax',
      cashFlow: 0,
      runningBalance: 0,
    });
  }

  boxSpread.push({
    date: 'Expiration',
    description: 'Box spread settlement',
    cashFlow: -obligation,
    runningBalance: -(obligation - loanAmount),
  });

  // Margin loan cash flow
  const marginMonthly = loanAmount * rates.marginRate / 12;
  const marginLoan: CashFlowScheduleResult['marginLoan'] = [];
  for (let m = 1; m <= totalMonths; m++) {
    marginLoan.push({
      month: m,
      payment: marginMonthly,
      cumulativePaid: marginMonthly * m,
    });
  }

  // SBLOC cash flow
  const sblocMonthly = loanAmount * rates.sblocRate / 12;
  const sbloc: CashFlowScheduleResult['sbloc'] = [];
  for (let m = 1; m <= totalMonths; m++) {
    sbloc.push({
      month: m,
      payment: sblocMonthly,
      cumulativePaid: sblocMonthly * m,
    });
  }

  // HELOC cash flow
  const helocMonthly = loanAmount * rates.helocRate / 12;
  const heloc: CashFlowScheduleResult['heloc'] = [];
  for (let m = 1; m <= totalMonths; m++) {
    heloc.push({
      month: m,
      payment: helocMonthly,
      cumulativePaid: helocMonthly * m,
    });
  }

  // Monthly savings reinvestment value (FV of annuity)
  const monthlySavings = marginMonthly; // savings vs margin (box pays $0/month)
  const monthlyReturn = portfolio.expectedReturn / 12;
  const reinvestmentValue = totalMonths > 0
    ? monthlySavings * ((Math.pow(1 + monthlyReturn, totalMonths) - 1) / monthlyReturn)
    : 0;

  return {
    boxSpread,
    marginLoan,
    sbloc,
    heloc,
    monthlyPaymentComparison: {
      box: 0,
      margin: marginMonthly,
      sbloc: sblocMonthly,
      heloc: helocMonthly,
      monthlySavings,
      reinvestmentValue,
    },
  };
}
