import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prism/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ planId: string; accountId: string }> }
) {
  try {
    const { planId, accountId } = await params;

    const account = await prisma.account.findFirst({
      where: { id: accountId, planId },
      include: {
        owner: true,
        coOwner: true,
        beneficiaryDesignations: true,
      },
    });

    if (!account) {
      return NextResponse.json(
        { error: 'Not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(account);
  } catch (error) {
    console.error('Error fetching account:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ planId: string; accountId: string }> }
) {
  try {
    const { planId, accountId } = await params;
    const body = await request.json();

    const existing = await prisma.account.findFirst({
      where: { id: accountId, planId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Not found' },
        { status: 404 }
      );
    }

    // Convert date strings to Date objects
    const dateFields = [
      'balanceAsOf', 'maturityDate', 'surrenderPeriodEnd', 'annuityStartDate',
      'lastAppraisalDate', 'originationDate', 'debtMaturityDate', 'lastSyncAt',
    ];
    for (const field of dateFields) {
      if (body[field]) {
        body[field] = new Date(body[field]);
      }
    }

    const account = await prisma.account.update({
      where: { id: accountId },
      data: body,
    });

    return NextResponse.json(account);
  } catch (error) {
    console.error('Error updating account:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ planId: string; accountId: string }> }
) {
  try {
    const { planId, accountId } = await params;

    const existing = await prisma.account.findFirst({
      where: { id: accountId, planId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Not found' },
        { status: 404 }
      );
    }

    await prisma.account.delete({
      where: { id: accountId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting account:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
