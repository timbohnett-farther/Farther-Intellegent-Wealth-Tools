import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prism/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  const { planId } = await params;

  try {
    // ---------------------------------------------------------------
    // 1. Load the latest PlanResult for the given planId
    // ---------------------------------------------------------------
    const planResult = await prisma.planResult.findFirst({
      where: { planId },
      orderBy: { calculatedAt: 'desc' },
    });

    if (!planResult) {
      return NextResponse.json(
        {
          error: 'No results found for this plan',
          message: `Plan ${planId} has not been calculated yet. POST to /api/prism/plans/${planId}/calculate to generate results.`,
        },
        { status: 404 }
      );
    }

    // ---------------------------------------------------------------
    // 2. Parse JSON fields
    // ---------------------------------------------------------------
    const annualIncome = safeJsonParse(planResult.annualIncome);
    const annualExpenses = safeJsonParse(planResult.annualExpenses);
    const annualTaxes = safeJsonParse(planResult.annualTaxes);
    const annualSavings = safeJsonParse(planResult.annualSavings);
    const annualPortfolio = safeJsonParse(planResult.annualPortfolio);
    const annualNetWorth = safeJsonParse(planResult.annualNetWorth);
    const annualRmd = safeJsonParse(planResult.annualRmd);
    const annualSsBenefit = safeJsonParse(planResult.annualSsBenefit);
    const annualCashFlow = safeJsonParse(planResult.annualCashFlow);
    const goalResults = safeJsonParse(planResult.goalResults);

    // ---------------------------------------------------------------
    // 3. Return the full structured result
    // ---------------------------------------------------------------
    // Parse the full result data blob if available
    const resultData = safeJsonParse(planResult.resultData);

    return NextResponse.json({
      id: planResult.id,
      planId: planResult.planId,
      scenarioId: planResult.scenarioId,
      calculatedAt: planResult.calculatedAt,
      calcEngineVersion: planResult.calcEngineVersion,
      resultData,
      summary: {
        probabilityOfSuccess: planResult.probabilityOfSuccess,
        probabilityOfSuccessAdj: planResult.probabilityOfSuccessAdj,
        projectedEstateValue: planResult.projectedEstateValue,
        totalTaxesLifetime: planResult.totalTaxesLifetime,
        avgEffectiveTaxRate: planResult.avgEffectiveTaxRate,
        peakTaxYear: planResult.peakTaxYear,
        peakTaxAmount: planResult.peakTaxAmount,
        projectedEstateTaxDue: planResult.projectedEstateTaxDue,
      },
      monteCarlo: {
        runs: planResult.mcRuns,
        medianTerminalValue: planResult.mcMedianTerminalValue,
        percentiles: {
          p10: planResult.mcP10TerminalValue,
          p25: planResult.mcP25TerminalValue,
          p50: planResult.mcMedianTerminalValue,
          p75: planResult.mcP75TerminalValue,
          p90: planResult.mcP90TerminalValue,
        },
      },
      projections: {
        annualIncome,
        annualExpenses,
        annualTaxes,
        annualSavings,
        annualPortfolio,
        annualNetWorth,
        annualRmd,
        annualSsBenefit,
        annualCashFlow,
      },
      goalResults,
    });
  } catch (error) {
    console.error('Error fetching plan results:', error);
    const message = error instanceof Error ? error.message : 'Unknown error fetching plan results';
    return NextResponse.json(
      { error: 'Failed to fetch plan results', details: message },
      { status: 500 }
    );
  }
}

/**
 * Safely parse a JSON string. Returns null if the input is null/undefined
 * or if parsing fails.
 */
function safeJsonParse(jsonStr: string | null | undefined): unknown {
  if (!jsonStr) return null;
  try {
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}
