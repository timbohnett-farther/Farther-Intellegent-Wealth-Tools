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

    const expenses = await prisma.expense.findMany({
      where: { planId },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json(expenses);
  } catch (error) {
    console.error('Error fetching expenses:', error);
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

    const { name, category, annualAmount } = body;

    if (!name || !category || annualAmount === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: name, category, annualAmount' },
        { status: 400 }
      );
    }

    const expense = await prisma.expense.create({
      data: {
        ...body,
        planId,
      },
    });

    return NextResponse.json(expense, { status: 201 });
  } catch (error) {
    console.error('Error creating expense:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
