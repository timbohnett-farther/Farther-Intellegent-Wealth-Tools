export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prism/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const clientId = searchParams.get('clientId');
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100);
    const offset = parseInt(searchParams.get('offset') ?? '0');

    const where: Record<string, unknown> = {};

    if (status) {
      where.status = status;
    }

    if (clientId) {
      where.OR = [
        { primaryClientId: clientId },
        { coClientId: clientId },
      ];
    }

    const plans = await prisma.plan.findMany({
      where,
      include: {
        primaryClient: true,
        coClient: true,
      },
      orderBy: { updatedAt: 'desc' },
      take: limit,
      skip: offset,
    });

    return NextResponse.json(plans);
  } catch (error) {
    console.error('Error fetching plans:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      householdId,
      firmId,
      advisorId,
      primaryClientId,
      wealthTier,
      startYear,
      endYear,
      baseYear,
    } = body;

    if (!householdId || !firmId || !advisorId || !primaryClientId || !wealthTier || !startYear || !endYear || !baseYear) {
      return NextResponse.json(
        { error: 'Missing required fields: householdId, firmId, advisorId, primaryClientId, wealthTier, startYear, endYear, baseYear' },
        { status: 400 }
      );
    }

    const plan = await prisma.plan.create({
      data: {
        householdId,
        firmId,
        advisorId,
        primaryClientId,
        coClientId: body.coClientId,
        name: body.name ?? 'Financial Plan',
        status: body.status ?? 'draft',
        planType: body.planType ?? 'comprehensive',
        wealthTier,
        startYear,
        endYear,
        baseYear,
        completionScore: body.completionScore ?? 0,
        sectionsComplete: body.sectionsComplete,
        planNotes: body.planNotes,
        lastReviewedAt: body.lastReviewedAt ? new Date(body.lastReviewedAt) : undefined,
        nextReviewAt: body.nextReviewAt ? new Date(body.nextReviewAt) : undefined,
        clientPortalEnabled: body.clientPortalEnabled ?? false,
        clientPortalToken: body.clientPortalToken,
        version: body.version ?? 1,
        parentPlanId: body.parentPlanId,
      },
      include: {
        primaryClient: true,
        coClient: true,
      },
    });

    // Auto-create default PlanAssumption record
    await prisma.planAssumption.create({
      data: {
        planId: plan.id,
      },
    });

    // Re-fetch plan with assumptions included
    const planWithAssumptions = await prisma.plan.findUnique({
      where: { id: plan.id },
      include: {
        primaryClient: true,
        coClient: true,
        assumptions: true,
      },
    });

    return NextResponse.json(planWithAssumptions, { status: 201 });
  } catch (error) {
    console.error('Error creating plan:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
