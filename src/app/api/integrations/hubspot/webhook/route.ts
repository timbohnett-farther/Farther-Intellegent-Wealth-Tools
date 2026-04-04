export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prism/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate the webhook payload
    if (!body || (!Array.isArray(body) && !body.eventType)) {
      return NextResponse.json(
        { error: 'Invalid webhook payload' },
        { status: 422 }
      );
    }

    // HubSpot sends events as an array
    const events = Array.isArray(body) ? body : [body];

    // Query firm once before loop (fix N+1 query)
    const firm = await prisma.firm.findFirst({ select: { id: true } });

    const processed: string[] = [];

    for (const event of events) {
      const { eventType, objectType, objectId, propertyName, propertyValue } = event;

      // Record each webhook event in the audit log
      if (firm) {
        await prisma.auditEntry.create({
          data: {
            firmId: firm.id,
            actorType: 'api',
            actorId: 'hubspot-webhook',
            actorName: 'HubSpot Webhook',
            action: 'UPDATE',
            resourceType: objectType || 'hubspot_event',
            resourceId: objectId?.toString() || null,
            afterState: JSON.stringify({
              eventType,
              objectType,
              objectId,
              propertyName,
              propertyValue,
            }),
          },
        });
      }

      processed.push(`${eventType}:${objectType}:${objectId}`);
    }

    return NextResponse.json({
      success: true,
      processed: processed.length,
      events: processed,
    });
  } catch (error) {
    console.error('Error processing HubSpot webhook:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
