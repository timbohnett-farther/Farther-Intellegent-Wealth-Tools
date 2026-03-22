export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prism/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ planId: string; grantId: string }> }
) {
  try {
    const { planId, grantId } = await params;

    const grant = await prisma.equityGrant.findFirst({
      where: { id: grantId, planId },
    });

    if (!grant) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json(grant);
  } catch (error) {
    console.error('Error fetching equity grant:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ planId: string; grantId: string }> }
) {
  try {
    const { planId, grantId } = await params;
    const body = await request.json();

    const existing = await prisma.equityGrant.findFirst({
      where: { id: grantId, planId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Convert date fields
    if (body.grantDate) body.grantDate = new Date(body.grantDate);
    if (body.expirationDate) body.expirationDate = new Date(body.expirationDate);
    if (body.offeringPeriodStart) body.offeringPeriodStart = new Date(body.offeringPeriodStart);
    if (body.offeringPeriodEnd) body.offeringPeriodEnd = new Date(body.offeringPeriodEnd);

    const grant = await prisma.equityGrant.update({
      where: { id: grantId },
      data: body,
    });

    return NextResponse.json(grant);
  } catch (error) {
    console.error('Error updating equity grant:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ planId: string; grantId: string }> }
) {
  try {
    const { planId, grantId } = await params;

    const existing = await prisma.equityGrant.findFirst({
      where: { id: grantId, planId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    await prisma.equityGrant.delete({
      where: { id: grantId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting equity grant:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
