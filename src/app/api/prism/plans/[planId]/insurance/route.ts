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

    const policies = await prisma.insurancePolicy.findMany({
      where: { planId },
      include: { insuredClient: true },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json(policies);
  } catch (error) {
    console.error('Error fetching insurance policies:', error);
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

    const { type, insuredClientId } = body;

    if (!type || !insuredClientId) {
      return NextResponse.json(
        { error: 'Missing required fields: type, insuredClientId' },
        { status: 400 }
      );
    }

    if (body.issueDate) {
      body.issueDate = new Date(body.issueDate);
    }
    if (body.expiryDate) {
      body.expiryDate = new Date(body.expiryDate);
    }

    const policy = await prisma.insurancePolicy.create({
      data: {
        ...body,
        planId,
      },
    });

    return NextResponse.json(policy, { status: 201 });
  } catch (error) {
    console.error('Error creating insurance policy:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
