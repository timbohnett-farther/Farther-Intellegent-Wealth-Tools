export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prism/db';
import { projectCashFlows } from '@/lib/calc-engine/projections/cash-flow-engine';
import { runMonteCarlo } from '@/lib/calc-engine/monte-carlo/monte-carlo-engine';
import { calculateGoalFunding } from '@/lib/calc-engine/goals/goal-funding';
import { calculateRothConversion } from '@/lib/calc-engine/retirement/roth-conversion';
import { getDefaultTaxTables } from '@/lib/calc-engine/utils/tax-table-loader';
import { deriveAssetAllocation } from '@/lib/calc-engine/projections/account-growth';
import type {
  IncomeSourceData,
  ExpenseData,
  AccountData,
  GoalData,
  PlanAssumptions,
  FilingStatus,
  CashFlowInput,
  RothConversionInput,
} from '@/lib/calc-engine/types';

const CALC_ENGINE_VERSION = '1.0.0';

const defaultAssumptions: PlanAssumptions = {
  inflationRate: 0.025,
  equityReturn: 0.08,
  bondReturn: 0.04,
  cashReturn: 0.02,
  altReturn: 0.07,
  retirementSpendingPct: 0.80,
  healthcareInflation: 0.055,
  ssCola: 0.025,
  monteCarloRuns: 1000,
  successThreshold: 0.85,
  planningHorizonAge: 95,
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  const { planId } = await params;

  try {
    // ---------------------------------------------------------------
    // 1. Load plan from database with all related data
    // ---------------------------------------------------------------
    const plan = await prisma.plan.findUnique({
      where: { id: planId },
      include: {
        primaryClient: true,
        coClient: true,
        assumptions: true,
        incomeSources: {
          where: { isActive: true },
        },
        expenses: {
          where: { isActive: true },
        },
        accounts: {
          where: { isActive: true },
        },
        goals: {
          where: { isActive: true },
        },
      },
    });

    if (!plan) {
      return NextResponse.json(
        { error: `Plan not found: ${planId}` },
        { status: 404 }
      );
    }

    // ---------------------------------------------------------------
    // 2. Map DB records to calc engine types
    // ---------------------------------------------------------------

    // Map PlanAssumption DB fields to PlanAssumptions type
    const dbAssumptions = plan.assumptions;
    const assumptions: PlanAssumptions = {
      inflationRate: dbAssumptions?.inflationRate ?? defaultAssumptions.inflationRate,
      equityReturn: dbAssumptions?.equityReturn ?? defaultAssumptions.equityReturn,
      bondReturn: dbAssumptions?.bondReturn ?? defaultAssumptions.bondReturn,
      cashReturn: dbAssumptions?.cashReturn ?? defaultAssumptions.cashReturn,
      altReturn: defaultAssumptions.altReturn,
      retirementSpendingPct: defaultAssumptions.retirementSpendingPct,
      healthcareInflation: dbAssumptions?.healthcareInflation ?? defaultAssumptions.healthcareInflation,
      ssCola: dbAssumptions?.ssColaRate ?? defaultAssumptions.ssCola,
      monteCarloRuns: dbAssumptions?.monteCarloRuns ?? defaultAssumptions.monteCarloRuns,
      successThreshold: dbAssumptions?.successThreshold ?? defaultAssumptions.successThreshold,
      planningHorizonAge: defaultAssumptions.planningHorizonAge,
      equityStdDev: dbAssumptions?.mcEquityStdDev ?? 0.17,
      bondStdDev: dbAssumptions?.mcBondStdDev ?? 0.06,
      altStdDev: 0.12,
      correlationEquityBond: 0.2,
    };

    // Map income sources
    const incomeSources: IncomeSourceData[] = plan.incomeSources.map((inc) => ({
      id: inc.id,
      type: inc.type,
      annualAmount: inc.annualAmount ?? 0,
      growthRate: inc.growthRate ?? 0,
      startYear: inc.startYear ?? undefined,
      endYear: inc.endYear ?? undefined,
      inflationAdjusted: inc.isInflationAdjusted ?? false,
      ssClaimAge: inc.ssClaimAge ?? undefined,
      ssPia: inc.ssPia ?? undefined,
      clientId: inc.clientId,
      ownerType: inc.clientId === plan.primaryClientId ? 'client' : 'co_client',
    }));

    // Map expenses
    const expenses: ExpenseData[] = plan.expenses.map((exp) => ({
      id: exp.id,
      category: exp.category,
      annualAmount: exp.annualAmount ?? 0,
      growthRate: exp.growthRate ?? 0,
      startYear: exp.startYear ?? undefined,
      endYear: exp.endYear ?? undefined,
      inflationAdjusted: exp.isInflationAdjusted ?? true,
      retirementPct: exp.retirementFactor ?? undefined,
    }));

    // Map accounts
    const accounts: AccountData[] = plan.accounts.map((acc) => ({
      id: acc.id,
      accountType: acc.accountType,
      taxBucket: acc.taxBucket,
      currentBalance: acc.currentBalance ?? 0,
      costBasis: acc.costBasis ?? undefined,
      equityPct: acc.equityPct ?? undefined,
      bondPct: acc.bondPct ?? undefined,
      cashPct: acc.cashPct ?? undefined,
      altPct: acc.alternativePct ?? undefined,
      contributionAmount: undefined,
      contributionFrequency: undefined,
      interestRate: acc.interestRate ?? undefined,
      monthlyPayment: acc.monthlyPayment ?? undefined,
      remainingTerm: acc.remainingTermMonths ?? undefined,
      maturityDate: acc.maturityDate ? acc.maturityDate.toISOString() : undefined,
    }));

    // Map goals
    const goals: GoalData[] = plan.goals.map((goal) => ({
      id: goal.id,
      type: goal.type,
      name: goal.name,
      targetAmount: goal.targetAmount ?? 0,
      targetYear: goal.targetYear ?? plan.endYear,
      priority: goal.priority ?? 'wants',
      inflationAdjusted: goal.isInflationAdjusted ?? true,
      fundingAccountIds: goal.fundedAccounts ? tryParseJsonArray(goal.fundedAccounts) : undefined,
      legacyAmount: goal.legacyAmount ?? undefined,
    }));

    // Derive client info
    const primaryClient = plan.primaryClient;
    const coClient = plan.coClient;
    const clientBirthYear = primaryClient.dateOfBirth.getFullYear();
    const coBirthYear = coClient?.dateOfBirth?.getFullYear();
    const filingStatus: FilingStatus = (primaryClient.filingStatus as FilingStatus) || 'mfj';
    const stateCode = primaryClient.domicileState || primaryClient.state || 'NY';

    // Determine retirement year from goals or age-based defaults
    const retirementGoal = plan.goals.find((g) => g.type === 'retirement');
    const retirementAgeClient = retirementGoal?.retirementAgeClient ?? 65;
    const retirementYearClient = clientBirthYear + retirementAgeClient;
    const retirementAgeCo = retirementGoal?.retirementAgeCo;
    const retirementYearCo = coBirthYear && retirementAgeCo
      ? coBirthYear + retirementAgeCo
      : undefined;

    // ---------------------------------------------------------------
    // 3. Load tax tables
    // ---------------------------------------------------------------
    const taxTables = getDefaultTaxTables();

    // ---------------------------------------------------------------
    // 4. Run projectCashFlows()
    // ---------------------------------------------------------------
    const cashFlowInput: CashFlowInput = {
      startYear: plan.startYear,
      endYear: plan.endYear,
      clientBirthYear,
      coBirthYear,
      retirementYearClient,
      retirementYearCo,
      incomeSources,
      expenses,
      accounts,
      goals,
      assumptions,
      taxTables,
      filingStatus,
      stateCode,
    };

    const cashFlows = projectCashFlows(cashFlowInput);

    // ---------------------------------------------------------------
    // 5. Run runMonteCarlo()
    // ---------------------------------------------------------------
    const projectionYears = plan.endYear - plan.startYear;
    const assetAllocation = deriveAssetAllocation(accounts, assumptions);

    // Extract annual contributions and withdrawals from cash flows
    const annualContributions = cashFlows.map((cf) => cf.portfolioContributions);
    const annualWithdrawals = cashFlows.map((cf) => cf.portfolioWithdrawals);

    // Initial portfolio is the sum of all investable accounts
    const initialPortfolio = cashFlows.length > 0
      ? cashFlows[0].totalInvestablePortfolio
      : accounts.reduce((sum, a) => {
          if (['taxable', 'tax_deferred', 'tax_free'].includes(a.taxBucket)) {
            return sum + a.currentBalance;
          }
          return sum;
        }, 0);

    // Find legacy goal if any
    const legacyGoal = goals.find((g) => g.type === 'legacy' || g.type === 'estate');
    const legacyGoalAmount = legacyGoal?.legacyAmount ?? legacyGoal?.targetAmount ?? 0;

    const mcResult = runMonteCarlo({
      runs: assumptions.monteCarloRuns,
      years: projectionYears,
      startYear: plan.startYear,
      initialPortfolio,
      annualContributions,
      annualWithdrawals,
      assetAllocation,
      returns: {
        equityMean: assumptions.equityReturn,
        equityStdDev: assumptions.equityStdDev ?? 0.17,
        bondMean: assumptions.bondReturn,
        bondStdDev: assumptions.bondStdDev ?? 0.06,
        cashMean: assumptions.cashReturn,
        altMean: assumptions.altReturn,
        altStdDev: assumptions.altStdDev ?? 0.12,
        correlation_equity_bond: assumptions.correlationEquityBond ?? 0.2,
      },
      inflationMean: assumptions.inflationRate,
      inflationStdDev: 0.01,
      successThreshold: assumptions.successThreshold,
      legacyGoal: legacyGoalAmount,
    });

    // ---------------------------------------------------------------
    // 6. Run calculateGoalFunding()
    // ---------------------------------------------------------------
    const currentYear = plan.startYear;
    const goalFundingResults = calculateGoalFunding(
      goals,
      cashFlows,
      assumptions.inflationRate,
      currentYear
    );

    // ---------------------------------------------------------------
    // 7. Run calculateRothConversion() for the first 10 years
    // ---------------------------------------------------------------
    const rothConversionResults = [];
    const currentClientAge = plan.startYear - clientBirthYear;
    const standardDeduction = taxTables.standardDeductions[filingStatus] ?? 16100;

    for (let yearOffset = 0; yearOffset < Math.min(10, cashFlows.length); yearOffset++) {
      const cf = cashFlows[yearOffset];
      const yearAge = currentClientAge + yearOffset;
      const yearsToRetirement = Math.max(0, retirementYearClient - (plan.startYear + yearOffset));

      // Estimate current taxable income from this year's cash flow
      const currentTaxableIncome = cf.agi;

      // Sum traditional and Roth balances
      const traditionalBalance = cf.taxDeferredPortfolio;
      const rothBalance = cf.taxFreePortfolio;

      if (traditionalBalance <= 0) continue;

      const rothInput: RothConversionInput = {
        currentTaxableIncome,
        filingStatus,
        brackets: taxTables.ordinaryBrackets[filingStatus],
        cgBrackets: taxTables.capitalGainsBrackets[filingStatus] ?? taxTables.capitalGainsBrackets['single'],
        rothAccountBalance: rothBalance,
        traditionalBalance,
        yearsToRetirement,
        expectedRetirementRate: 0.22,
        assumedReturn: assumptions.equityReturn * 0.6 + assumptions.bondReturn * 0.4,
        irmaaBrackets: taxTables.irmaa,
        irmaaLookbackMagi: currentTaxableIncome,
        clientAge: yearAge,
        standardDeduction,
      };

      try {
        const rothResult = calculateRothConversion(rothInput);
        rothConversionResults.push(rothResult);
      } catch {
        // Skip this year if Roth conversion calculation fails
      }
    }

    // ---------------------------------------------------------------
    // 8. Build and store results
    // ---------------------------------------------------------------

    // Derive summary fields
    const probabilityOfSuccess = mcResult.probabilityOfSuccess;
    const lastCashFlow = cashFlows[cashFlows.length - 1];
    const projectedEstateValue = lastCashFlow ? lastCashFlow.netWorth : 0;

    // Compute retirement income: average total gross income during retirement years
    const retirementCashFlows = cashFlows.filter((cf) => cf.isRetired);
    const projectedRetirementIncome = retirementCashFlows.length > 0
      ? retirementCashFlows.reduce((sum, cf) => sum + cf.totalGrossIncome, 0) / retirementCashFlows.length
      : 0;

    // Compute tax summaries
    const totalTaxesLifetime = cashFlows.reduce((sum, cf) => sum + cf.totalTax, 0);
    const avgEffectiveTaxRate = cashFlows.length > 0
      ? cashFlows.reduce((sum, cf) => sum + cf.effectiveFedRate, 0) / cashFlows.length
      : 0;

    // Find peak tax year
    let peakTaxYear = plan.startYear;
    let peakTaxAmount = 0;
    for (const cf of cashFlows) {
      if (cf.totalTax > peakTaxAmount) {
        peakTaxAmount = cf.totalTax;
        peakTaxYear = cf.year;
      }
    }

    // Build annual data arrays for storage
    const annualIncome = cashFlows.map((cf) => ({ year: cf.year, amount: cf.totalGrossIncome }));
    const annualExpenses = cashFlows.map((cf) => ({ year: cf.year, amount: cf.totalExpenses }));
    const annualTaxes = cashFlows.map((cf) => ({ year: cf.year, amount: cf.totalTax }));
    const annualSavings = cashFlows.map((cf) => ({ year: cf.year, amount: cf.portfolioContributions }));
    const annualPortfolio = cashFlows.map((cf) => ({ year: cf.year, amount: cf.totalInvestablePortfolio }));
    const annualNetWorth = cashFlows.map((cf) => ({ year: cf.year, amount: cf.netWorth }));
    const annualRmd = cashFlows.map((cf) => ({ year: cf.year, amount: cf.rmdIncome }));
    const annualSsBenefit = cashFlows.map((cf) => ({
      year: cf.year,
      amount: cf.socialSecurityClientGross + cf.socialSecurityCoGross,
    }));
    const annualCashFlow = cashFlows.map((cf) => ({ year: cf.year, amount: cf.netCashFlow }));

    // Build goal results
    const goalResults = goalFundingResults.map((gf) => ({
      goalId: gf.goalId,
      name: gf.goalName,
      type: gf.goalType,
      targetAmount: gf.targetAmount,
      targetYear: gf.targetYear,
      fundedRatio: gf.fundedRatio,
      probability: gf.probabilityOfMeeting,
      status: gf.status,
    }));

    // Build the full result data object
    const fullResultData = {
      planId,
      probabilityOfSuccess: mcResult.probabilityOfSuccess,
      mcRuns: mcResult.runs,
      mcMedianTerminalValue: mcResult.medianTerminalValue,
      mcPercentiles: mcResult.percentiles,
      annualPercentileBands: mcResult.annualPercentileBands,
      annualIncome,
      annualExpenses,
      annualTaxes,
      annualPortfolio,
      annualNetWorth,
      annualRmd,
      annualCashFlow,
      annualFederalTax: cashFlows.map((cf) => ({ year: cf.year, amount: cf.federalTax })),
      annualStateTax: cashFlows.map((cf) => ({ year: cf.year, amount: cf.stateTax })),
      annualEffectiveRate: cashFlows.map((cf) => ({ year: cf.year, amount: cf.effectiveFedRate })),
      annualMarginalRate: [], // Marginal rate not tracked per-year in cash flow
      goalResults,
      totalTaxesLifetime,
      avgEffectiveTaxRate,
      projectedEstateValue,
      rothConversionOpportunities: rothConversionResults,
      cashFlows,
    };

    // Store in PlanResult using upsert — create new result each time
    const planResult = await prisma.planResult.create({
      data: {
        planId,
        calcEngineVersion: CALC_ENGINE_VERSION,
        probabilityOfSuccess: mcResult.probabilityOfSuccess,
        probabilityOfSuccessAdj: mcResult.probabilityOfSuccess_adj,
        mcRuns: mcResult.runs,
        mcMedianTerminalValue: mcResult.medianTerminalValue,
        mcP10TerminalValue: mcResult.percentiles.p10,
        mcP25TerminalValue: mcResult.percentiles.p25,
        mcP75TerminalValue: mcResult.percentiles.p75,
        mcP90TerminalValue: mcResult.percentiles.p90,
        annualIncome: JSON.stringify(annualIncome),
        annualExpenses: JSON.stringify(annualExpenses),
        annualTaxes: JSON.stringify(annualTaxes),
        annualSavings: JSON.stringify(annualSavings),
        annualPortfolio: JSON.stringify(annualPortfolio),
        annualNetWorth: JSON.stringify(annualNetWorth),
        annualRmd: JSON.stringify(annualRmd),
        annualSsBenefit: JSON.stringify(annualSsBenefit),
        annualCashFlow: JSON.stringify(annualCashFlow),
        goalResults: JSON.stringify(goalResults),
        totalTaxesLifetime,
        avgEffectiveTaxRate,
        peakTaxYear,
        peakTaxAmount,
        projectedEstateValue,
        resultData: JSON.stringify(fullResultData),
      },
    });

    // ---------------------------------------------------------------
    // 9. Return the full result as JSON
    // ---------------------------------------------------------------
    return NextResponse.json({
      id: planResult.id,
      planId,
      calculatedAt: planResult.calculatedAt,
      calcEngineVersion: CALC_ENGINE_VERSION,
      summary: {
        probabilityOfSuccess: mcResult.probabilityOfSuccess,
        probabilityOfSuccessAdj: mcResult.probabilityOfSuccess_adj,
        projectedRetirementIncome,
        projectedEstateValue,
        totalTaxesLifetime,
        avgEffectiveTaxRate,
        peakTaxYear,
        peakTaxAmount,
      },
      monteCarlo: {
        runs: mcResult.runs,
        medianTerminalValue: mcResult.medianTerminalValue,
        percentiles: mcResult.percentiles,
        averageTerminalValue: mcResult.averageTerminalValue,
        worstCase: mcResult.worstCase,
        bestCase: mcResult.bestCase,
        averageDepletionYear: mcResult.averageDepletionYear,
        annualPercentileBands: mcResult.annualPercentileBands,
      },
      goalResults,
      rothConversionOpportunities: rothConversionResults,
      cashFlows,
    });
  } catch (error) {
    console.error('Plan calculation error:', error);
    return NextResponse.json(
      { error: 'Plan calculation failed. Please try again.' },
      { status: 500 }
    );
  }
}

/**
 * Safely parse a JSON string as an array of strings.
 * Returns an empty array if parsing fails.
 */
function tryParseJsonArray(jsonStr: string): string[] {
  try {
    const parsed = JSON.parse(jsonStr);
    if (Array.isArray(parsed)) return parsed;
    return [];
  } catch {
    return [];
  }
}
