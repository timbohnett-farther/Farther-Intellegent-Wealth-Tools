import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prism/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ planId: string; strategyId: string }> }
) {
  try {
    const { planId, strategyId } = await params;

    const strategy = await prisma.charitableStrategy.findFirst({
      where: { id: strategyId, planId },
    });

    if (!strategy) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json(strategy);
  } catch (error) {
    console.error('Error fetching charitable strategy:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ planId: string; strategyId: string }> }
) {
  try {
    const { planId, strategyId } = await params;
    const body = await request.json();

    const existing = await prisma.charitableStrategy.findFirst({
      where: { id: strategyId, planId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const strategy = await prisma.charitableStrategy.update({
      where: { id: strategyId },
      data: body,
    });

    return NextResponse.json(strategy);
  } catch (error) {
    console.error('Error updating charitable strategy:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ planId: string; strategyId: string }> }
) {
  try {
    const { planId, strategyId } = await params;

    const existing = await prisma.charitableStrategy.findFirst({
      where: { id: strategyId, planId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    await prisma.charitableStrategy.delete({
      where: { id: strategyId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting charitable strategy:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
