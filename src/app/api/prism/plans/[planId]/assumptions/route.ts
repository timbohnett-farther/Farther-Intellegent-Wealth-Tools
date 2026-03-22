export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prism/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  try {
    const { planId } = await params;

    const assumptions = await prisma.planAssumption.findUnique({
      where: { planId },
    });

    if (!assumptions) {
      return NextResponse.json(
        { error: 'Not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(assumptions);
  } catch (error) {
    console.error('Error fetching plan assumptions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  try {
    const { planId } = await params;
    const body = await request.json();

    const existing = await prisma.planAssumption.findUnique({
      where: { planId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Not found' },
        { status: 404 }
      );
    }

    // Remove fields that should not be overwritten
    const { id: _id, planId: _planId, createdAt: _createdAt, updatedAt: _updatedAt, ...updateData } = body;

    const assumptions = await prisma.planAssumption.update({
      where: { planId },
      data: updateData,
    });

    return NextResponse.json(assumptions);
  } catch (error) {
    console.error('Error updating plan assumptions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
