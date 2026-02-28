import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prism/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ planId: string; itemId: string }> }
) {
  try {
    const { planId, itemId } = await params;

    const incomeSource = await prisma.incomeSource.findFirst({
      where: { id: itemId, planId },
      include: { client: true },
    });

    if (!incomeSource) {
      return NextResponse.json(
        { error: 'Not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(incomeSource);
  } catch (error) {
    console.error('Error fetching income source:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ planId: string; itemId: string }> }
) {
  try {
    const { planId, itemId } = await params;
    const body = await request.json();

    const existing = await prisma.incomeSource.findFirst({
      where: { id: itemId, planId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Not found' },
        { status: 404 }
      );
    }

    const incomeSource = await prisma.incomeSource.update({
      where: { id: itemId },
      data: body,
    });

    return NextResponse.json(incomeSource);
  } catch (error) {
    console.error('Error updating income source:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ planId: string; itemId: string }> }
) {
  try {
    const { planId, itemId } = await params;

    const existing = await prisma.incomeSource.findFirst({
      where: { id: itemId, planId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Not found' },
        { status: 404 }
      );
    }

    await prisma.incomeSource.delete({
      where: { id: itemId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting income source:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
