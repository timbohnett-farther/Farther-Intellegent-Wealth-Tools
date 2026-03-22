export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prism/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ planId: string; alertId: string }> }
) {
  try {
    const { planId, alertId } = await params;

    const alert = await prisma.planAlert.findFirst({
      where: { id: alertId, planId },
    });

    if (!alert) {
      return NextResponse.json(
        { error: 'Not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(alert);
  } catch (error) {
    console.error('Error fetching alert:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ planId: string; alertId: string }> }
) {
  try {
    const { planId, alertId } = await params;
    const body = await request.json();

    const existing = await prisma.planAlert.findFirst({
      where: { id: alertId, planId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Not found' },
        { status: 404 }
      );
    }

    // Handle status transitions
    if (body.status === 'dismissed' && existing.status !== 'dismissed') {
      body.dismissedAt = new Date();
    }

    if (body.status === 'resolved' && existing.status !== 'resolved') {
      body.resolvedAt = new Date();
    }

    if (body.status === 'snoozed' && body.snoozedUntil) {
      body.snoozedUntil = new Date(body.snoozedUntil);
    }

    if (body.deadline) {
      body.deadline = new Date(body.deadline);
    }

    const alert = await prisma.planAlert.update({
      where: { id: alertId },
      data: body,
    });

    return NextResponse.json(alert);
  } catch (error) {
    console.error('Error updating alert:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ planId: string; alertId: string }> }
) {
  try {
    const { planId, alertId } = await params;

    const existing = await prisma.planAlert.findFirst({
      where: { id: alertId, planId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Not found' },
        { status: 404 }
      );
    }

    await prisma.planAlert.delete({
      where: { id: alertId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting alert:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
