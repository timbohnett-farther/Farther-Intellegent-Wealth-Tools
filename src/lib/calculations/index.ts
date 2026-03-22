import { CalculatorInputs, AllResults } from '../types';
import { calculateLoanStructure } from './loanPricing';
import { calculateCostComparison } from './costComparison';
import { calculateTaxAnalysis } from './taxEngine';
import { calculateStressTest } from './stressTest';
import { calculateOpportunityCost } from './opportunityCost';
import { calculateLiquidationComparison } from './liquidationComparison';
import { calculateCashFlowSchedule } from './cashFlow';
import { runMonteCarlo } from './monteCarlo';
import { calculateExecutiveSummary } from './executiveSummary';

export function calculateAll(inputs: CalculatorInputs): AllResults {
  const loanStructure = calculateLoanStructure(inputs.loan);
  const costComparison = calculateCostComparison(inputs.loan, inputs.comparison);
  const taxAnalysis = calculateTaxAnalysis(inputs.loan, inputs.tax, inputs.comparison);
  const stressTest = calculateStressTest(inputs.loan, inputs.portfolio);
  const opportunityCost = calculateOpportunityCost(inputs.loan, inputs.tax, inputs.portfolio, inputs.comparison);
  const liquidationComparison = calculateLiquidationComparison(inputs.loan, inputs.tax, inputs.portfolio);
  const cashFlowSchedule = calculateCashFlowSchedule(inputs.loan, inputs.comparison, inputs.portfolio);
  const monteCarlo = runMonteCarlo(inputs.loan, inputs.portfolio, 5000);
  const executiveSummary = calculateExecutiveSummary(
    inputs.loan,
    costComparison,
    taxAnalysis,
    stressTest,
    opportunityCost,
    monteCarlo,
    cashFlowSchedule
  );

  return {
    loanStructure,
    costComparison,
    taxAnalysis,
    stressTest,
    opportunityCost,
    liquidationComparison,
    cashFlowSchedule,
    monteCarlo,
    executiveSummary,
  };
}
