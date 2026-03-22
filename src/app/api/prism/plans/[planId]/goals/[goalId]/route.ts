export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prism/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ planId: string; goalId: string }> }
) {
  try {
    const { planId, goalId } = await params;

    const goal = await prisma.goal.findFirst({
      where: { id: goalId, planId },
    });

    if (!goal) {
      return NextResponse.json(
        { error: 'Not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(goal);
  } catch (error) {
    console.error('Error fetching goal:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ planId: string; goalId: string }> }
) {
  try {
    const { planId, goalId } = await params;
    const body = await request.json();

    const existing = await prisma.goal.findFirst({
      where: { id: goalId, planId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Not found' },
        { status: 404 }
      );
    }

    const goal = await prisma.goal.update({
      where: { id: goalId },
      data: body,
    });

    return NextResponse.json(goal);
  } catch (error) {
    console.error('Error updating goal:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ planId: string; goalId: string }> }
) {
  try {
    const { planId, goalId } = await params;

    const existing = await prisma.goal.findFirst({
      where: { id: goalId, planId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Not found' },
        { status: 404 }
      );
    }

    await prisma.goal.delete({
      where: { id: goalId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting goal:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
