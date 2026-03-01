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

    const grants = await prisma.equityGrant.findMany({
      where: { planId },
      orderBy: { grantDate: 'desc' },
    });

    // Compute summary
    const totalCurrentValue = grants.reduce((s, g) => s + (g.currentValue || 0), 0);
    const totalUnrealizedGain = grants.reduce((s, g) => s + (g.unrealizedGain || 0), 0);

    return NextResponse.json({
      grants,
      summary: {
        totalGrants: grants.length,
        totalCurrentValue,
        totalUnrealizedGain,
      },
    });
  } catch (error) {
    console.error('Error fetching equity grants:', error);
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

    const { clientId, grantType, tickerSymbol, companyName, grantDate, sharesGranted, grantPrice, currentFMV } = body;

    if (!clientId || !grantType || !tickerSymbol || !companyName || !grantDate || sharesGranted === undefined || grantPrice === undefined || currentFMV === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: clientId, grantType, tickerSymbol, companyName, grantDate, sharesGranted, grantPrice, currentFMV' },
        { status: 400 }
      );
    }

    // Convert date fields
    body.grantDate = new Date(body.grantDate);
    if (body.expirationDate) body.expirationDate = new Date(body.expirationDate);
    if (body.offeringPeriodStart) body.offeringPeriodStart = new Date(body.offeringPeriodStart);
    if (body.offeringPeriodEnd) body.offeringPeriodEnd = new Date(body.offeringPeriodEnd);

    const grant = await prisma.equityGrant.create({
      data: {
        ...body,
        planId,
      },
    });

    return NextResponse.json(grant, { status: 201 });
  } catch (error) {
    console.error('Error creating equity grant:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
