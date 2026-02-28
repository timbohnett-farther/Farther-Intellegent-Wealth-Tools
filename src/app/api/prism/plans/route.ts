import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prism/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const clientId = searchParams.get('clientId');

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
        ...body,
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
