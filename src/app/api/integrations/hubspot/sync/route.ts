export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prism/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { planId } = body;

    // If a specific planId is provided, sync that plan; otherwise sync all plans
    if (planId) {
      const plan = await prisma.plan.findUnique({
        where: { id: planId },
        include: {
          primaryClient: true,
          coClient: true,
          household: true,
        },
      });

      if (!plan) {
        return NextResponse.json(
          { error: 'Plan not found' },
          { status: 404 }
        );
      }

      // Record the sync attempt in audit log
      await prisma.auditEntry.create({
        data: {
          firmId: plan.firmId,
          actorType: 'system',
          actorId: 'hubspot-sync',
          actorName: 'HubSpot Sync',
          action: 'EXPORT',
          resourceType: 'plan',
          resourceId: planId,
          planId,
          clientId: plan.primaryClientId,
        },
      });

      return NextResponse.json({
        success: true,
        message: `HubSpot sync triggered for plan ${planId}`,
        planId,
      });
    }

    // Sync all plans
    const plans = await prisma.plan.findMany({
      select: { id: true, firmId: true, primaryClientId: true },
    });

    // Record the bulk sync attempt
    if (plans.length > 0) {
      await prisma.auditEntry.create({
        data: {
          firmId: plans[0].firmId,
          actorType: 'system',
          actorId: 'hubspot-sync',
          actorName: 'HubSpot Sync',
          action: 'EXPORT',
          resourceType: 'plan',
          resourceId: null,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: `HubSpot sync triggered for ${plans.length} plans`,
      planCount: plans.length,
    });
  } catch (error) {
    console.error('Error triggering HubSpot sync:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
