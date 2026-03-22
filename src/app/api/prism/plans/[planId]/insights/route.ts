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
    const category = searchParams.get('category');
    const severity = searchParams.get('severity');
    const dismissed = searchParams.get('dismissed');

    const where: Record<string, unknown> = { planId };

    if (category) {
      where.category = category;
    }

    if (severity) {
      where.type = severity;
    }

    if (dismissed !== null && dismissed !== undefined) {
      where.dismissed = dismissed === 'true';
    }

    const insights = await prisma.planInsight.findMany({
      where,
      orderBy: [
        { rank: 'asc' },
        { createdAt: 'desc' },
      ],
    });

    return NextResponse.json(insights);
  } catch (error) {
    console.error('Error fetching insights:', error);
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

    const { rank, category, type, title, summary } = body;

    if (rank === undefined || !category || !type || !title || !summary) {
      return NextResponse.json(
        { error: 'Missing required fields: rank, category, type, title, summary' },
        { status: 400 }
      );
    }

    const insight = await prisma.planInsight.create({
      data: {
        ...body,
        planId,
      },
    });

    return NextResponse.json(insight, { status: 201 });
  } catch (error) {
    console.error('Error creating insight:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
