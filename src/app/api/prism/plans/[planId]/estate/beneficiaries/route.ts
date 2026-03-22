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

    const beneficiaries = await prisma.beneficiaryDesignation.findMany({
      where: { planId },
      include: { account: true },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json(beneficiaries);
  } catch (error) {
    console.error('Error fetching beneficiary designations:', error);
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

    const { accountId, beneficiaryName, beneficiaryType, designationType, percentage } = body;

    if (!accountId || !beneficiaryName || !beneficiaryType || !designationType || percentage === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: accountId, beneficiaryName, beneficiaryType, designationType, percentage' },
        { status: 400 }
      );
    }

    const beneficiary = await prisma.beneficiaryDesignation.create({
      data: {
        ...body,
        planId,
      },
    });

    return NextResponse.json(beneficiary, { status: 201 });
  } catch (error) {
    console.error('Error creating beneficiary designation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
