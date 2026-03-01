import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prism/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  try {
    const { planId } = await params;
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const plan = await prisma.plan.findUnique({
      where: { id: planId },
      select: { id: true },
    });

    if (!plan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    const where: Record<string, unknown> = { planId };
    if (status) {
      where.status = status;
    }

    const events = await prisma.lifeEvent.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    // Count by status
    const allEvents = await prisma.lifeEvent.findMany({
      where: { planId },
      select: { status: true },
    });

    const byStatus: Record<string, number> = {};
    for (const e of allEvents) {
      byStatus[e.status] = (byStatus[e.status] || 0) + 1;
    }

    return NextResponse.json({
      events,
      summary: {
        totalEvents: allEvents.length,
        byStatus,
      },
    });
  } catch (error) {
    console.error('Error fetching life events:', error);
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

    const { eventType, eventDate, submittedBy } = body;

    if (!eventType || !eventDate || !submittedBy) {
      return NextResponse.json(
        { error: 'Missing required fields: eventType, eventDate, submittedBy' },
        { status: 400 }
      );
    }

    // Convert dates
    body.eventDate = new Date(body.eventDate);
    if (body.reviewedAt) {
      body.reviewedAt = new Date(body.reviewedAt);
    }

    // If data is an object, stringify it for storage
    if (body.data && typeof body.data === 'object') {
      body.data = JSON.stringify(body.data);
    }

    const event = await prisma.lifeEvent.create({
      data: {
        ...body,
        planId,
      },
    });

    return NextResponse.json(event, { status: 201 });
  } catch (error) {
    console.error('Error creating life event:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
