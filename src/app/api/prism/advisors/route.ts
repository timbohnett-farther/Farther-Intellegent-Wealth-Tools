import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prism/db';

export async function GET(request: NextRequest) {
  try {
    const advisors = await prisma.advisor.findMany({
      where: { isActive: true },
      include: {
        firm: true,
        _count: {
          select: {
            households: true,
            clients: true,
            plans: true,
          },
        },
      },
      orderBy: { lastName: 'asc' },
    });

    return NextResponse.json(advisors);
  } catch (error) {
    console.error('Error fetching advisors:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { firstName, lastName, email, authUserId, firmId } = body;

    if (!firstName || !lastName || !email || !authUserId || !firmId) {
      return NextResponse.json(
        { error: 'Missing required fields: firstName, lastName, email, authUserId, firmId' },
        { status: 400 }
      );
    }

    const advisor = await prisma.advisor.create({
      data: body,
      include: {
        firm: true,
      },
    });

    return NextResponse.json(advisor, { status: 201 });
  } catch (error) {
    console.error('Error creating advisor:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
