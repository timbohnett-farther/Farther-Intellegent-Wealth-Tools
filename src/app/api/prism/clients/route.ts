export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prism/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const tier = searchParams.get('tier');
    const status = searchParams.get('status');

    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { firstName: { contains: search } },
        { lastName: { contains: search } },
        { email: { contains: search } },
      ];
    }

    if (tier) {
      where.wealthTier = tier;
    }

    if (status === 'active') {
      where.isActive = true;
    } else if (status === 'inactive') {
      where.isActive = false;
    }

    const clients = await prisma.client.findMany({
      where,
      include: {
        household: true,
        advisor: true,
      },
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json(clients);
  } catch (error) {
    console.error('Error fetching clients:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { firstName, lastName, dateOfBirth, householdId, firmId, advisorId } = body;

    if (!firstName || !lastName || !dateOfBirth || !householdId || !firmId || !advisorId) {
      return NextResponse.json(
        { error: 'Missing required fields: firstName, lastName, dateOfBirth, householdId, firmId, advisorId' },
        { status: 400 }
      );
    }

    const client = await prisma.client.create({
      data: {
        ...body,
        dateOfBirth: new Date(dateOfBirth),
      },
      include: {
        household: true,
        advisor: true,
      },
    });

    return NextResponse.json(client, { status: 201 });
  } catch (error) {
    console.error('Error creating client:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
