import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prism/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ planId: string; trustId: string }> }
) {
  try {
    const { planId, trustId } = await params;

    const trust = await prisma.trust.findFirst({
      where: { id: trustId, planId },
    });

    if (!trust) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json(trust);
  } catch (error) {
    console.error('Error fetching trust:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ planId: string; trustId: string }> }
) {
  try {
    const { planId, trustId } = await params;
    const body = await request.json();

    const existing = await prisma.trust.findFirst({
      where: { id: trustId, planId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (body.dateExecuted) {
      body.dateExecuted = new Date(body.dateExecuted);
    }

    const trust = await prisma.trust.update({
      where: { id: trustId },
      data: body,
    });

    return NextResponse.json(trust);
  } catch (error) {
    console.error('Error updating trust:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ planId: string; trustId: string }> }
) {
  try {
    const { planId, trustId } = await params;

    const existing = await prisma.trust.findFirst({
      where: { id: trustId, planId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    await prisma.trust.delete({
      where: { id: trustId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting trust:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
