export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prism/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  try {
    const { planId } = await params;
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year');

    const plan = await prisma.plan.findUnique({
      where: { id: planId },
      select: { id: true },
    });

    if (!plan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    const where: Record<string, unknown> = { planId };
    if (year) {
      where.giftYear = parseInt(year, 10);
    }

    const gifts = await prisma.giftRecord.findMany({
      where,
      orderBy: [{ giftYear: 'desc' }, { createdAt: 'desc' }],
    });

    // Summary
    const totalGifted = gifts.reduce((s, g) => s + g.giftAmount, 0);
    const totalCgAvoided = gifts.reduce((s, g) => s + (g.cgTaxAvoided || 0), 0);
    const form709Count = gifts.filter((g) => g.form709Required).length;

    return NextResponse.json({
      gifts,
      summary: {
        totalGifts: gifts.length,
        totalGifted,
        totalCgAvoided,
        form709Count,
      },
    });
  } catch (error) {
    console.error('Error fetching gift records:', error);
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

    const { recipientName, giftYear, giftAmount, giftType } = body;

    if (!recipientName || !giftYear || giftAmount === undefined || !giftType) {
      return NextResponse.json(
        { error: 'Missing required fields: recipientName, giftYear, giftAmount, giftType' },
        { status: 400 }
      );
    }

    const gift = await prisma.giftRecord.create({
      data: {
        ...body,
        planId,
      },
    });

    return NextResponse.json(gift, { status: 201 });
  } catch (error) {
    console.error('Error creating gift record:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
