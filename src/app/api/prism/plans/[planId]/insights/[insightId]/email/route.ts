export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prism/db';
import { composeClientEmailEnhanced } from '@/lib/ai-engine/nlp/email-composer';
import type { PlanInsight, AdvisorInfo, ClientInfo } from '@/lib/ai-engine/types';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ planId: string; insightId: string }> }
) {
  try {
    const { planId, insightId } = await params;

    // Fetch insight
    const insight = await prisma.planInsight.findFirst({
      where: { id: insightId, planId },
    });

    if (!insight) {
      return NextResponse.json({ error: 'Insight not found' }, { status: 404 });
    }

    // Fetch plan with advisor and client
    const plan = await prisma.plan.findUnique({
      where: { id: planId },
      include: {
        advisor: { include: { firm: true } },
        primaryClient: true,
      },
    });

    if (!plan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    // Build typed inputs
    const advisorInfo: AdvisorInfo = {
      name: `${plan.advisor.firstName} ${plan.advisor.lastName}`,
      title: plan.advisor.title ?? 'Financial Advisor',
      email: plan.advisor.email,
      phone: plan.advisor.phone ?? '',
      firmName: plan.advisor.firm.name,
    };

    const clientInfo: ClientInfo = {
      firstName: plan.primaryClient.firstName,
      lastName: plan.primaryClient.lastName,
      email: plan.primaryClient.email ?? '',
      preferredName: plan.primaryClient.preferredName ?? null,
    };

    const insightInput: PlanInsight = {
      id: insight.id,
      rank: insight.rank,
      category: insight.category as PlanInsight['category'],
      type: insight.type as PlanInsight['type'],
      title: insight.title,
      summary: insight.summary,
      detail: insight.detail ?? '',
      estimatedImpact: {
        type: (insight.estimatedImpactType ?? 'savings') as 'savings' | 'gain' | 'risk_reduction' | 'cost_avoidance',
        amount: insight.estimatedImpactAmt ?? 0,
        timeframe: insight.estimatedTimeframe ?? 'annual',
      },
      actions: insight.actions ? JSON.parse(insight.actions) : [],
      aiGenerated: insight.aiGenerated,
      dismissed: insight.dismissed,
    };

    // Generate email
    const draftEmail = await composeClientEmailEnhanced(insightInput, advisorInfo, clientInfo);

    // Save to EmailDraft table
    const saved = await prisma.emailDraft.create({
      data: {
        planId,
        insightId,
        toEmail: draftEmail.to,
        toName: `${clientInfo.firstName} ${clientInfo.lastName}`,
        fromEmail: draftEmail.from,
        fromName: advisorInfo.name,
        subject: draftEmail.subject,
        body: draftEmail.body,
        generatedBy: 'ai',
      },
    });

    return NextResponse.json(saved);
  } catch (error) {
    console.error('Error generating email draft:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
