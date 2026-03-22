export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prism/db';

export async function GET(request: NextRequest) {
  try {
    const households = await prisma.household.findMany({
      include: {
        advisor: true,
        clients: true,
        _count: {
          select: {
            clients: true,
            dependents: true,
            plans: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json(households);
  } catch (error) {
    console.error('Error fetching households:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { name, firmId, advisorId } = body;

    if (!name || !firmId || !advisorId) {
      return NextResponse.json(
        { error: 'Missing required fields: name, firmId, advisorId' },
        { status: 400 }
      );
    }

    const household = await prisma.household.create({
      data: body,
      include: {
        advisor: true,
      },
    });

    return NextResponse.json(household, { status: 201 });
  } catch (error) {
    console.error('Error creating household:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
