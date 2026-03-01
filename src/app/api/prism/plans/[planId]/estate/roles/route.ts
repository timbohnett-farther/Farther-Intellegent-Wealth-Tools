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

    const roles = await prisma.estateRole.findMany({
      where: { planId },
      orderBy: { createdAt: 'asc' },
    });

    // Group by role type
    const byRoleType: Record<string, typeof roles> = {};
    for (const role of roles) {
      if (!byRoleType[role.roleType]) {
        byRoleType[role.roleType] = [];
      }
      byRoleType[role.roleType].push(role);
    }

    return NextResponse.json({
      roles,
      byRoleType,
    });
  } catch (error) {
    console.error('Error fetching estate roles:', error);
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

    const { roleType, personName } = body;

    if (!roleType || !personName) {
      return NextResponse.json(
        { error: 'Missing required fields: roleType, personName' },
        { status: 400 }
      );
    }

    const role = await prisma.estateRole.create({
      data: {
        ...body,
        planId,
      },
    });

    return NextResponse.json(role, { status: 201 });
  } catch (error) {
    console.error('Error creating estate role:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
