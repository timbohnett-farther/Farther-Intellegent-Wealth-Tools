export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prism/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const { clientId } = await params;

    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { householdId: true },
    });

    if (!client) {
      return NextResponse.json(
        { error: 'Not found' },
        { status: 404 }
      );
    }

    const dependents = await prisma.dependent.findMany({
      where: { householdId: client.householdId },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json(dependents);
  } catch (error) {
    console.error('Error fetching dependents:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const { clientId } = await params;
    const body = await request.json();

    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { householdId: true },
    });

    if (!client) {
      return NextResponse.json(
        { error: 'Not found' },
        { status: 404 }
      );
    }

    const { firstName, relationship, dateOfBirth } = body;

    if (!firstName || !relationship || !dateOfBirth) {
      return NextResponse.json(
        { error: 'Missing required fields: firstName, relationship, dateOfBirth' },
        { status: 400 }
      );
    }

    const dependent = await prisma.dependent.create({
      data: {
        ...body,
        householdId: client.householdId,
        dateOfBirth: new Date(dateOfBirth),
      },
    });

    return NextResponse.json(dependent, { status: 201 });
  } catch (error) {
    console.error('Error creating dependent:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
