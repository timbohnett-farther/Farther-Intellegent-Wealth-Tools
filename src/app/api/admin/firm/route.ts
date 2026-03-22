export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prism/db';

export async function GET(request: NextRequest) {
  try {
    const firm = await prisma.firm.findFirst({
      include: {
        _count: {
          select: {
            advisors: true,
            households: true,
            clients: true,
            plans: true,
          },
        },
      },
    });

    if (!firm) {
      return NextResponse.json(
        { error: 'Not found' },
        { status: 404 }
      );
    }

    // Aggregate plan metrics
    const planStats = await prisma.plan.aggregate({
      where: { firmId: firm.id },
      _avg: {
        completionScore: true,
      },
      _count: {
        id: true,
      },
    });

    // Count plans by status
    const plansByStatus = await prisma.plan.groupBy({
      by: ['status'],
      where: { firmId: firm.id },
      _count: {
        id: true,
      },
    });

    // Count active advisors
    const activeAdvisors = await prisma.advisor.count({
      where: { firmId: firm.id, isActive: true },
    });

    return NextResponse.json({
      ...firm,
      metrics: {
        activeAdvisors,
        avgCompletionScore: planStats._avg.completionScore || 0,
        totalPlans: planStats._count.id,
        plansByStatus: plansByStatus.reduce(
          (acc, item) => ({
            ...acc,
            [item.status]: item._count.id,
          }),
          {} as Record<string, number>
        ),
      },
    });
  } catch (error) {
    console.error('Error fetching firm overview:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
