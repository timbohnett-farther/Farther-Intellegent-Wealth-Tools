export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prism/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ planId: string; insightId: string }> }
) {
  try {
    const { planId, insightId } = await params;

    const insight = await prisma.planInsight.findFirst({
      where: { id: insightId, planId },
    });

    if (!insight) {
      return NextResponse.json(
        { error: 'Not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(insight);
  } catch (error) {
    console.error('Error fetching insight:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ planId: string; insightId: string }> }
) {
  try {
    const { planId, insightId } = await params;
    const body = await request.json();

    const existing = await prisma.planInsight.findFirst({
      where: { id: insightId, planId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Not found' },
        { status: 404 }
      );
    }

    // Handle dismissal
    if (body.dismissed === true && !existing.dismissed) {
      body.dismissedAt = new Date();
    }

    const insight = await prisma.planInsight.update({
      where: { id: insightId },
      data: body,
    });

    return NextResponse.json(insight);
  } catch (error) {
    console.error('Error updating insight:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ planId: string; insightId: string }> }
) {
  try {
    const { planId, insightId } = await params;

    const existing = await prisma.planInsight.findFirst({
      where: { id: insightId, planId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Not found' },
        { status: 404 }
      );
    }

    await prisma.planInsight.delete({
      where: { id: insightId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting insight:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
