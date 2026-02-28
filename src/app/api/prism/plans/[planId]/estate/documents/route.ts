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

    const documents = await prisma.estateDocument.findMany({
      where: { planId },
      include: { client: true },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json(documents);
  } catch (error) {
    console.error('Error fetching estate documents:', error);
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

    const { documentType, status, clientId } = body;

    if (!documentType || !status || !clientId) {
      return NextResponse.json(
        { error: 'Missing required fields: documentType, status, clientId' },
        { status: 400 }
      );
    }

    if (body.lastUpdated) {
      body.lastUpdated = new Date(body.lastUpdated);
    }

    const document = await prisma.estateDocument.create({
      data: {
        ...body,
        planId,
      },
    });

    return NextResponse.json(document, { status: 201 });
  } catch (error) {
    console.error('Error creating estate document:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
