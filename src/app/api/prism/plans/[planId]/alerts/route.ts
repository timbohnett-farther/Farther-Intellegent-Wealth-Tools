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
      select: { id: true },
    });

    if (!plan) {
      return NextResponse.json(
        { error: 'Not found' },
        { status: 404 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const severity = searchParams.get('severity');
    const status = searchParams.get('status');

    const where: Record<string, unknown> = { planId };

    if (severity) {
      where.severity = severity;
    }

    if (status) {
      where.status = status;
    }

    const alerts = await prisma.planAlert.findMany({
      where,
      orderBy: [
        { createdAt: 'desc' },
      ],
    });

    return NextResponse.json(alerts);
  } catch (error) {
    console.error('Error fetching alerts:', error);
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

    const { triggerId, severity, category, title, description, recommendedAction } = body;

    if (!triggerId || !severity || !category || !title || !description || !recommendedAction) {
      return NextResponse.json(
        { error: 'Missing required fields: triggerId, severity, category, title, description, recommendedAction' },
        { status: 400 }
      );
    }

    if (body.deadline) {
      body.deadline = new Date(body.deadline);
    }

    const alert = await prisma.planAlert.create({
      data: {
        ...body,
        planId,
      },
    });

    return NextResponse.json(alert, { status: 201 });
  } catch (error) {
    console.error('Error creating alert:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
