export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prism/db';
import { narratePlanSummaryEnhanced } from '@/lib/ai-engine/nlp/plan-narrator';
import type { PlanNarratorInput } from '@/lib/ai-engine/types';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  try {
    const { planId } = await params;

    // Fetch plan with related data
    const plan = await prisma.plan.findUnique({
      where: { id: planId },
      include: {
        primaryClient: true,
        coClient: true,
        goals: true,
        planResults: {
          orderBy: { calculatedAt: 'desc' },
          take: 2,
        },
        planAlerts: {
          where: { status: 'active' },
          orderBy: { severity: 'desc' },
          take: 5,
        },
        planInsights: {
          where: { dismissed: false },
          orderBy: { rank: 'asc' },
          take: 5,
        },
        accounts: true,
        incomeSources: true,
        expenses: true,
      },
    });

    if (!plan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    const latestResult = plan.planResults[0];
    const previousResult = plan.planResults[1];

    // Calculate totals from accounts
    const totalPortfolioValue = plan.accounts.reduce(
      (sum, a) => sum + (a.currentBalance ?? 0), 0
    );
    const annualIncome = plan.incomeSources.reduce(
      (sum, s) => sum + (s.annualAmount ?? 0), 0
    );
    const annualExpenses = plan.expenses.reduce(
      (sum, e) => sum + (e.annualAmount ?? 0), 0
    );

    // Build narrator input
    const input: PlanNarratorInput = {
      clientName: `${plan.primaryClient.firstName} ${plan.primaryClient.lastName}`,
      clientAge: plan.primaryClient.dateOfBirth
        ? Math.floor((Date.now() - new Date(plan.primaryClient.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
        : 0,
      spouseAge: plan.coClient?.dateOfBirth
        ? Math.floor((Date.now() - new Date(plan.coClient.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
        : null,
      retirementYear: plan.endYear,
      currentYear: new Date().getFullYear(),
      successRate: latestResult?.probabilityOfSuccess ?? 0,
      previousSuccessRate: previousResult?.probabilityOfSuccess ?? 0,
      totalPortfolioValue,
      annualIncome,
      annualExpenses,
      netWorth: totalPortfolioValue, // simplified
      topAlerts: plan.planAlerts.map(a => ({
        triggerId: a.triggerId,
        severity: a.severity as 'info' | 'low' | 'medium' | 'high' | 'critical',
        category: a.category as 'tax' | 'retirement' | 'estate' | 'insurance' | 'investment' | 'cash_flow' | 'social_security' | 'healthcare' | 'compliance' | 'opportunity',
        title: a.title,
        description: a.description,
        recommendedAction: a.recommendedAction,
        estimatedImpact: a.estimatedImpact ? parseFloat(a.estimatedImpact) : 0,
        deadline: a.deadline?.toISOString() ?? null,
        autoActionAvailable: a.autoActionAvailable,
      })),
      topInsights: plan.planInsights.map(i => ({
        id: i.id,
        rank: i.rank,
        category: i.category as 'tax' | 'retirement' | 'estate' | 'insurance' | 'investment' | 'cash_flow' | 'social_security' | 'healthcare' | 'compliance' | 'opportunity',
        type: i.type as 'alert' | 'opportunity' | 'anomaly' | 'recommendation' | 'informational',
        title: i.title,
        summary: i.summary,
        detail: i.detail ?? '',
        estimatedImpact: {
          type: (i.estimatedImpactType ?? 'savings') as 'savings' | 'gain' | 'risk_reduction' | 'cost_avoidance',
          amount: i.estimatedImpactAmt ?? 0,
          timeframe: i.estimatedTimeframe ?? 'annual',
        },
        actions: i.actions ? JSON.parse(i.actions) : [],
        aiGenerated: i.aiGenerated,
        dismissed: i.dismissed,
      })),
      goalsSummary: plan.goals.map(g => {
        const ratio = g.fundedRatio ?? 0;
        let status: 'on_track' | 'at_risk' | 'funded' | 'underfunded';
        if (ratio >= 1.0) status = 'funded';
        else if (g.onTrack === true) status = 'on_track';
        else if (ratio >= 0.5) status = 'at_risk';
        else status = 'underfunded';
        return { goalName: g.name, status, fundedRatio: ratio };
      }),
    };

    const narrative = await narratePlanSummaryEnhanced(input);

    return NextResponse.json(narrative);
  } catch (error) {
    console.error('Error generating narrative:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
