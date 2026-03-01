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
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    const trusts = await prisma.trust.findMany({
      where: { planId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ trusts });
  } catch (error) {
    console.error('Error fetching trusts:', error);
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

    const { name, trustType } = body;

    if (!name || !trustType) {
      return NextResponse.json(
        { error: 'Missing required fields: name, trustType' },
        { status: 400 }
      );
    }

    // Convert date fields
    if (body.dateExecuted) {
      body.dateExecuted = new Date(body.dateExecuted);
    }

    const trust = await prisma.trust.create({
      data: {
        ...body,
        planId,
      },
    });

    return NextResponse.json(trust, { status: 201 });
  } catch (error) {
    console.error('Error creating trust:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
