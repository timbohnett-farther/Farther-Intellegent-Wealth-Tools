export type FilingStatus = 'single' | 'mfj' | 'mfs' | 'hoh';
export type MarginType = 'reg_t' | 'portfolio_margin';
export type PortfolioComposition = 'equities' | 'etfs' | 'mixed';
export type LoanTerm = 0.5 | 1 | 2 | 3 | 5;

export interface LoanConfig {
  portfolioValue: number;
  loanAmount: number;
  termYears: LoanTerm;
  boxRate: number;
  managerFee: number;
  marginType: MarginType;
  portfolioComposition: PortfolioComposition;
}

export interface TaxConfig {
  filingStatus: FilingStatus;
  taxableIncome: number;
  state: string;
  ltcgRate: number;
  stcgRate: number;
  niitRate: number;
  stateCGRate: number;
  annualCGRealized: number;
  blended1256Rate: number;
}

export interface PortfolioConfig {
  costBasis: number;
  unrealizedGainPct: number;
  expectedReturn: number;
  volatility: number;
  initialMarginPct: number;
  maintenanceMarginPct: number;
}

export interface ComparisonRates {
  marginRate: number;
  sblocRate: number;
  helocRate: number;
}

export interface CalculatorInputs {
  loan: LoanConfig;
  tax: TaxConfig;
  portfolio: PortfolioConfig;
  comparison: ComparisonRates;
}

export interface LoanStructureResult {
  strikeWidth: number;
  multiplier: number;
  contracts: number;
  faceValue: number;
  netPremium: number;
  impliedInterestCost: number;
  annualizedRate: number;
  allInRate: number;
  actualProceeds: number;
  actualRepayment: number;
  interestPaid: number;
}

export interface CostComparisonResult {
  boxSpread: { totalInterest: number; annualRate: number };
  marginLoan: { totalInterest: number; annualRate: number };
  sbloc: { totalInterest: number; annualRate: number };
  heloc: { totalInterest: number; annualRate: number };
  savingsVsMargin: number;
  savingsVsSbloc: number;
  savingsVsHeloc: number;
  rateSensitivity: Array<{
    rate: number;
    boxInterest: number;
    savingsVsMargin: number;
    savingsVsSbloc: number;
    savingsVsHeloc: number;
  }>;
}

export interface TaxAnalysisResult {
  blended1256Rate: number;
  afterTaxRate: number;
  annualSchedule: Array<{
    year: number;
    accruedInterest: number;
    ltLoss: number;
    stLoss: number;
    gainsOffset: number;
    taxSavings: number;
    netCost: number;
  }>;
  totalTaxSavings: number;
  deductionType: 'full' | 'partial' | 'limited';
  carryforward: number;
  grandComparison: {
    boxSpread: { preTaxInterest: number; taxBenefit: number; afterTaxCost: number };
    marginLoan: { preTaxInterest: number; taxBenefit: number; afterTaxCost: number };
    sbloc: { preTaxInterest: number; taxBenefit: number; afterTaxCost: number };
    heloc: { preTaxInterest: number; taxBenefit: number; afterTaxCost: number };
  };
}

export interface StressTestResult {
  initialMarginPct: number;
  maintenanceMarginPct: number;
  maxBorrowable: number;
  marginCallPortfolioValue: number;
  declineToMarginCall: number;
  declineDollars: number;
  boxObligation: number;
  remainingPortfolio: number;
  scenarios: Array<{
    decline: number;
    portfolioValue: number;
    boxObligation: number;
    equity: number;
    equityPct: number;
    status: 'safe' | 'warning' | 'margin_call';
    excessEquity: number;
  }>;
  historicalEvents: Array<{
    name: string;
    decline: number;
    duration: string;
    wouldTrigger: boolean;
  }>;
  ltvSensitivity: Array<{
    ltv: number;
    loan: number;
    maxDecline: number;
  }>;
}

export interface OpportunityCostResult {
  scenarioSell: Array<{ year: number; portfolioValue: number; totalWealth: number }>;
  scenarioBorrow: Array<{ year: number; portfolioValue: number; totalWealth: number }>;
  scenarioMargin: Array<{ year: number; portfolioValue: number; totalWealth: number }>;
  breakEvenReturn: number;
  wealthDifference: number;
  missedDaysAnalysis: Array<{
    scenario: string;
    adjustedReturn: number;
    wealthIfSold: number;
    wealthIfBorrowed: number;
    opportunityCost: number;
  }>;
}

export interface LiquidationComparisonResult {
  unrealizedGain: number;
  realizedGain: number;
  federalLTCGTax: number;
  niitTax: number;
  stateTax: number;
  totalTax: number;
  netAfterTaxProceeds: number;
  grossUpAmount: number;
  grossUpTax: number;
  agiImpact: {
    currentAGI: number;
    agiAfterSale: number;
    irmaaSurcharge: number;
  };
  totalCostComparison: {
    sellTotal: number;
    borrowTotal: number;
    netAdvantage: number;
  };
}

export interface CashFlowScheduleResult {
  boxSpread: Array<{
    date: string;
    description: string;
    cashFlow: number;
    runningBalance: number;
  }>;
  marginLoan: Array<{
    month: number;
    payment: number;
    cumulativePaid: number;
  }>;
  sbloc: Array<{
    month: number;
    payment: number;
    cumulativePaid: number;
  }>;
  heloc: Array<{
    month: number;
    payment: number;
    cumulativePaid: number;
  }>;
  monthlyPaymentComparison: {
    box: number;
    margin: number;
    sbloc: number;
    heloc: number;
    monthlySavings: number;
    reinvestmentValue: number;
  };
}

export interface MonteCarloResult {
  probabilityOfMarginCall: number;
  averageTimeToMC: number;
  medianTerminalPortfolio: number;
  medianNetWealth: number;
  percentiles: {
    p5: number;
    p25: number;
    p50: number;
    p75: number;
    p95: number;
  };
  fanChartData: Array<{
    month: number;
    p5: number;
    p25: number;
    p50: number;
    p75: number;
    p95: number;
    marginCallLine: number;
  }>;
  probabilityPortfolioGrows: number;
}

export interface ExecutiveSummaryResult {
  annualInterestSavings: number;
  afterTaxCost: number;
  marginSafetyDecline: number;
  historicalStressResult: string;
  mcProbability: number;
  taxDeductionValue: number;
  opportunityCostOfSelling: number;
  monthlyCashFlowFreed: number;
  overallScore: number;
  recommendation: string;
  recommendationLevel: 'strongly_favorable' | 'favorable' | 'neutral' | 'caution';
}

export interface AllResults {
  loanStructure: LoanStructureResult;
  costComparison: CostComparisonResult;
  taxAnalysis: TaxAnalysisResult;
  stressTest: StressTestResult;
  opportunityCost: OpportunityCostResult;
  liquidationComparison: LiquidationComparisonResult;
  cashFlowSchedule: CashFlowScheduleResult;
  monteCarlo: MonteCarloResult;
  executiveSummary: ExecutiveSummaryResult;
}
