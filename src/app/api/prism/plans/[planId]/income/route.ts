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
      return NextResponse.json(
        { error: 'Not found' },
        { status: 404 }
      );
    }

    const incomeSources = await prisma.incomeSource.findMany({
      where: { planId },
      include: { client: true },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json(incomeSources);
  } catch (error) {
    console.error('Error fetching income sources:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
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
      return NextResponse.json(
        { error: 'Not found' },
        { status: 404 }
      );
    }

    const { name, type, annualAmount, clientId } = body;

    if (!name || !type || annualAmount === undefined || !clientId) {
      return NextResponse.json(
        { error: 'Missing required fields: name, type, annualAmount, clientId' },
        { status: 400 }
      );
    }

    const incomeSource = await prisma.incomeSource.create({
      data: {
        ...body,
        planId,
      },
    });

    return NextResponse.json(incomeSource, { status: 201 });
  } catch (error) {
    console.error('Error creating income source:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
