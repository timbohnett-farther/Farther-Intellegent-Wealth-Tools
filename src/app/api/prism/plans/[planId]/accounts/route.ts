import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prism/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  try {
    const { planId } = await params;
    const { searchParams } = new URL(request.url);
    const bucket = searchParams.get('bucket');

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

    const where: Record<string, unknown> = { planId };

    if (bucket) {
      where.taxBucket = bucket;
    }

    const accounts = await prisma.account.findMany({
      where,
      include: {
        owner: true,
        coOwner: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // Calculate summary
    const allAccounts = await prisma.account.findMany({
      where: { planId },
    });

    const totalAssets = allAccounts
      .filter((a) => !a.isLiability)
      .reduce((sum, a) => sum + a.currentBalance, 0);

    const totalLiabilities = allAccounts
      .filter((a) => a.isLiability)
      .reduce((sum, a) => sum + Math.abs(a.currentBalance), 0);

    const netWorth = totalAssets - totalLiabilities;

    // Group by tax bucket
    const byTaxBucket: Record<string, number> = {};
    for (const account of allAccounts) {
      if (!account.isLiability) {
        byTaxBucket[account.taxBucket] = (byTaxBucket[account.taxBucket] || 0) + account.currentBalance;
      }
    }

    return NextResponse.json({
      accounts,
      summary: {
        totalAssets,
        totalLiabilities,
        netWorth,
        byTaxBucket,
      },
    });
  } catch (error) {
    console.error('Error fetching accounts:', error);
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

    const { name, accountType, registration, taxBucket, currentBalance, clientId } = body;

    if (!name || !accountType || !registration || !taxBucket || currentBalance === undefined || !clientId) {
      return NextResponse.json(
        { error: 'Missing required fields: name, accountType, registration, taxBucket, currentBalance, clientId' },
        { status: 400 }
      );
    }

    if (body.balanceAsOf) {
      body.balanceAsOf = new Date(body.balanceAsOf);
    }
    if (body.maturityDate) {
      body.maturityDate = new Date(body.maturityDate);
    }
    if (body.surrenderPeriodEnd) {
      body.surrenderPeriodEnd = new Date(body.surrenderPeriodEnd);
    }
    if (body.annuityStartDate) {
      body.annuityStartDate = new Date(body.annuityStartDate);
    }
    if (body.lastAppraisalDate) {
      body.lastAppraisalDate = new Date(body.lastAppraisalDate);
    }
    if (body.originationDate) {
      body.originationDate = new Date(body.originationDate);
    }
    if (body.debtMaturityDate) {
      body.debtMaturityDate = new Date(body.debtMaturityDate);
    }
    if (body.lastSyncAt) {
      body.lastSyncAt = new Date(body.lastSyncAt);
    }

    const account = await prisma.account.create({
      data: {
        ...body,
        planId,
      },
    });

    return NextResponse.json(account, { status: 201 });
  } catch (error) {
    console.error('Error creating account:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
