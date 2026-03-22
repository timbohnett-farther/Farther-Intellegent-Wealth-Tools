import {
  CostComparisonResult,
  TaxAnalysisResult,
  StressTestResult,
  OpportunityCostResult,
  MonteCarloResult,
  CashFlowScheduleResult,
  LoanConfig,
  ExecutiveSummaryResult,
} from '../types';

export function calculateExecutiveSummary(
  loan: LoanConfig,
  costComparison: CostComparisonResult,
  taxAnalysis: TaxAnalysisResult,
  stressTest: StressTestResult,
  opportunityCost: OpportunityCostResult,
  monteCarlo: MonteCarloResult,
  cashFlow: CashFlowScheduleResult
): ExecutiveSummaryResult {
  const { termYears } = loan;

  const annualInterestSavings = costComparison.savingsVsMargin / termYears;
  const afterTaxCost = taxAnalysis.afterTaxRate;
  const marginSafetyDecline = stressTest.declineToMarginCall * 100;

  const historicalSurvived = stressTest.historicalEvents.filter(e => !e.wouldTrigger).length;
  const historicalTotal = stressTest.historicalEvents.length;
  const historicalStressResult = `${historicalSurvived} of ${historicalTotal}`;

  const mcProbability = monteCarlo.probabilityOfMarginCall;
  const taxDeductionValue = taxAnalysis.totalTaxSavings / termYears;
  const opportunityCostOfSelling = opportunityCost.wealthDifference;
  const monthlyCashFlowFreed = cashFlow.monthlyPaymentComparison.monthlySavings;

  // Scoring (0-100)
  const rateSavingsScore = Math.min(100, Math.max(0, (annualInterestSavings / (loan.loanAmount * 0.05)) * 100));

  let marginSafetyScore: number;
  if (marginSafetyDecline >= 60) marginSafetyScore = 100;
  else if (marginSafetyDecline >= 50) marginSafetyScore = 80;
  else if (marginSafetyDecline >= 40) marginSafetyScore = 60;
  else if (marginSafetyDecline >= 30) marginSafetyScore = 40;
  else marginSafetyScore = 20;

  const taxEfficiencyScore = Math.min(100, (taxDeductionValue / (loan.loanAmount * 0.02)) * 100);

  const oppCostScore = opportunityCostOfSelling > 0 ? Math.min(100, (opportunityCostOfSelling / loan.loanAmount) * 100) : 20;

  let complexityScore: number;
  if (mcProbability < 2) complexityScore = 90;
  else if (mcProbability < 5) complexityScore = 70;
  else if (mcProbability < 10) complexityScore = 50;
  else complexityScore = 30;

  const overallScore =
    rateSavingsScore * 0.25 +
    marginSafetyScore * 0.30 +
    taxEfficiencyScore * 0.20 +
    oppCostScore * 0.15 +
    complexityScore * 0.10;

  let recommendation: string;
  let recommendationLevel: ExecutiveSummaryResult['recommendationLevel'];

  if (overallScore >= 80) {
    recommendation = 'Strongly Favorable — Box spread lending is well-suited for this scenario';
    recommendationLevel = 'strongly_favorable';
  } else if (overallScore >= 60) {
    recommendation = 'Favorable — Box spread lending offers meaningful advantages';
    recommendationLevel = 'favorable';
  } else if (overallScore >= 40) {
    recommendation = 'Neutral — Benefits exist but require careful consideration';
    recommendationLevel = 'neutral';
  } else {
    recommendation = 'Caution — Traditional alternatives may be more appropriate';
    recommendationLevel = 'caution';
  }

  return {
    annualInterestSavings,
    afterTaxCost,
    marginSafetyDecline,
    historicalStressResult,
    mcProbability,
    taxDeductionValue,
    opportunityCostOfSelling,
    monthlyCashFlowFreed,
    overallScore,
    recommendation,
    recommendationLevel,
  };
}
