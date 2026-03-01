import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prism/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  try {
    const { planId } = await params;

    const plan = await prisma.plan.findUnique({
      where: { id: planId },
      select: { id: true },
    });

    if (!plan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    const strategies = await prisma.charitableStrategy.findMany({
      where: { planId },
      orderBy: { createdAt: 'desc' },
    });

    const totalAnnualGiving = strategies.reduce((s, st) => s + (st.annualAmount || 0), 0);
    const totalTaxSavings = strategies.reduce((s, st) => s + (st.taxSavings || 0), 0);

    return NextResponse.json({
      strategies,
      summary: {
        totalStrategies: strategies.length,
        totalAnnualGiving,
        totalTaxSavings,
      },
    });
  } catch (error) {
    console.error('Error fetching charitable strategies:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  try {
    const { planId } = await params;
    const body = await request.json();

    const plan = await prisma.plan.findUnique({
      where: { id: planId },
      select: { id: true },
    });

    if (!plan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    const { strategyType, name } = body;

    if (!strategyType || !name) {
      return NextResponse.json(
        { error: 'Missing required fields: strategyType, name' },
        { status: 400 }
      );
    }

    const strategy = await prisma.charitableStrategy.create({
      data: {
        ...body,
        planId,
      },
    });

    return NextResponse.json(strategy, { status: 201 });
  } catch (error) {
    console.error('Error creating charitable strategy:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
