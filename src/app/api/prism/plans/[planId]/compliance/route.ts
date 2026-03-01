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

    const documents = await prisma.regBIDocumentation.findMany({
      where: { planId },
      orderBy: { documentationDate: 'desc' },
    });

    return NextResponse.json(documents);
  } catch (error) {
    console.error('Error fetching Reg BI documentation:', error);
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
      select: { id: true, advisorId: true, primaryClientId: true },
    });

    if (!plan) {
      return NextResponse.json(
        { error: 'Not found' },
        { status: 404 }
      );
    }

    const { clientProfile, recommendations } = body;

    if (!clientProfile || !recommendations) {
      return NextResponse.json(
        { error: 'Missing required fields: clientProfile, recommendations' },
        { status: 400 }
      );
    }

    if (body.documentationDate) {
      body.documentationDate = new Date(body.documentationDate);
    } else {
      body.documentationDate = new Date();
    }

    if (body.clientAcknowledgedAt) {
      body.clientAcknowledgedAt = new Date(body.clientAcknowledgedAt);
    }

    const document = await prisma.regBIDocumentation.create({
      data: {
        ...body,
        planId,
        advisorId: body.advisorId || plan.advisorId,
        clientId: body.clientId || plan.primaryClientId,
      },
    });

    return NextResponse.json(document, { status: 201 });
  } catch (error) {
    console.error('Error creating Reg BI documentation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
