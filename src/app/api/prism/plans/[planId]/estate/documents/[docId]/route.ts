import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prism/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ planId: string; docId: string }> }
) {
  try {
    const { planId, docId } = await params;

    const document = await prisma.estateDocument.findFirst({
      where: { id: docId, planId },
      include: { client: true },
    });

    if (!document) {
      return NextResponse.json(
        { error: 'Not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(document);
  } catch (error) {
    console.error('Error fetching estate document:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ planId: string; docId: string }> }
) {
  try {
    const { planId, docId } = await params;
    const body = await request.json();

    const existing = await prisma.estateDocument.findFirst({
      where: { id: docId, planId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Not found' },
        { status: 404 }
      );
    }

    if (body.lastUpdated) {
      body.lastUpdated = new Date(body.lastUpdated);
    }

    const document = await prisma.estateDocument.update({
      where: { id: docId },
      data: body,
    });

    return NextResponse.json(document);
  } catch (error) {
    console.error('Error updating estate document:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ planId: string; docId: string }> }
) {
  try {
    const { planId, docId } = await params;

    const existing = await prisma.estateDocument.findFirst({
      where: { id: docId, planId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Not found' },
        { status: 404 }
      );
    }

    await prisma.estateDocument.delete({
      where: { id: docId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting estate document:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
