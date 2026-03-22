export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prism/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ planId: string; scenarioId: string }> }
) {
  try {
    const { planId, scenarioId } = await params;

    const scenario = await prisma.scenario.findFirst({
      where: { id: scenarioId, planId },
      include: { planResults: true },
    });

    if (!scenario) {
      return NextResponse.json(
        { error: 'Not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(scenario);
  } catch (error) {
    console.error('Error fetching scenario:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ planId: string; scenarioId: string }> }
) {
  try {
    const { planId, scenarioId } = await params;
    const body = await request.json();

    const existing = await prisma.scenario.findFirst({
      where: { id: scenarioId, planId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Not found' },
        { status: 404 }
      );
    }

    const scenario = await prisma.scenario.update({
      where: { id: scenarioId },
      data: body,
    });

    return NextResponse.json(scenario);
  } catch (error) {
    console.error('Error updating scenario:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ planId: string; scenarioId: string }> }
) {
  try {
    const { planId, scenarioId } = await params;

    const existing = await prisma.scenario.findFirst({
      where: { id: scenarioId, planId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Not found' },
        { status: 404 }
      );
    }

    await prisma.scenario.delete({
      where: { id: scenarioId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting scenario:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
