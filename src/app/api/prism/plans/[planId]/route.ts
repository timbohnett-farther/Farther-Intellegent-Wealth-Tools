export const dynamic = 'force-dynamic';
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
      include: {
        primaryClient: true,
        coClient: true,
        household: true,
        advisor: true,
        assumptions: true,
        _count: {
          select: {
            incomeSources: true,
            expenses: true,
            accounts: true,
            goals: true,
          },
        },
      },
    });

    if (!plan) {
      return NextResponse.json(
        { error: 'Not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(plan);
  } catch (error) {
    console.error('Error fetching plan:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  try {
    const { planId } = await params;
    const body = await request.json();

    const existing = await prisma.plan.findUnique({
      where: { id: planId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Not found' },
        { status: 404 }
      );
    }

    if (body.lastReviewedAt) {
      body.lastReviewedAt = new Date(body.lastReviewedAt);
    }
    if (body.nextReviewAt) {
      body.nextReviewAt = new Date(body.nextReviewAt);
    }

    const plan = await prisma.plan.update({
      where: { id: planId },
      data: body,
    });

    return NextResponse.json(plan);
  } catch (error) {
    console.error('Error updating plan:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  try {
    const { planId } = await params;

    const existing = await prisma.plan.findUnique({
      where: { id: planId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Not found' },
        { status: 404 }
      );
    }

    const plan = await prisma.plan.update({
      where: { id: planId },
      data: { status: 'archived' },
    });

    return NextResponse.json(plan);
  } catch (error) {
    console.error('Error archiving plan:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
