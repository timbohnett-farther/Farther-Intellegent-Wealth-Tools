import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prism/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ planId: string; policyId: string }> }
) {
  try {
    const { planId, policyId } = await params;

    const policy = await prisma.insurancePolicy.findFirst({
      where: { id: policyId, planId },
      include: { insuredClient: true },
    });

    if (!policy) {
      return NextResponse.json(
        { error: 'Not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(policy);
  } catch (error) {
    console.error('Error fetching insurance policy:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ planId: string; policyId: string }> }
) {
  try {
    const { planId, policyId } = await params;
    const body = await request.json();

    const existing = await prisma.insurancePolicy.findFirst({
      where: { id: policyId, planId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Not found' },
        { status: 404 }
      );
    }

    if (body.issueDate) {
      body.issueDate = new Date(body.issueDate);
    }
    if (body.expiryDate) {
      body.expiryDate = new Date(body.expiryDate);
    }

    const policy = await prisma.insurancePolicy.update({
      where: { id: policyId },
      data: body,
    });

    return NextResponse.json(policy);
  } catch (error) {
    console.error('Error updating insurance policy:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ planId: string; policyId: string }> }
) {
  try {
    const { planId, policyId } = await params;

    const existing = await prisma.insurancePolicy.findFirst({
      where: { id: policyId, planId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Not found' },
        { status: 404 }
      );
    }

    await prisma.insurancePolicy.delete({
      where: { id: policyId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting insurance policy:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
