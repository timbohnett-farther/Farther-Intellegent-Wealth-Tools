export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prism/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ planId: string; itemId: string }> }
) {
  try {
    const { planId, itemId } = await params;

    const expense = await prisma.expense.findFirst({
      where: { id: itemId, planId },
    });

    if (!expense) {
      return NextResponse.json(
        { error: 'Not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(expense);
  } catch (error) {
    console.error('Error fetching expense:', error);
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

    const existing = await prisma.expense.findFirst({
      where: { id: itemId, planId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Not found' },
        { status: 404 }
      );
    }

    const expense = await prisma.expense.update({
      where: { id: itemId },
      data: body,
    });

    return NextResponse.json(expense);
  } catch (error) {
    console.error('Error updating expense:', error);
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

    const existing = await prisma.expense.findFirst({
      where: { id: itemId, planId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Not found' },
        { status: 404 }
      );
    }

    await prisma.expense.delete({
      where: { id: itemId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting expense:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
