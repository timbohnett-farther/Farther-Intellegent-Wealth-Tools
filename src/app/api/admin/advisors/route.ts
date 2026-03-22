export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prism/db';

export async function GET(request: NextRequest) {
  try {
    const advisors = await prisma.advisor.findMany({
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
