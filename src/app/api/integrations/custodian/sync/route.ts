import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prism/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { connectionId, firmId } = body;

    if (!connectionId && !firmId) {
      return NextResponse.json(
        { error: 'Missing required field: connectionId or firmId' },
        { status: 400 }
      );
    }

    // Find the connection(s) to sync
    const where: Record<string, unknown> = {};
    if (connectionId) {
      where.id = connectionId;
    }
    if (firmId) {
      where.firmId = firmId;
    }

    const connections = await prisma.custodianConnection.findMany({
      where,
    });

    if (connections.length === 0) {
      return NextResponse.json(
        { error: 'No custodian connections found' },
        { status: 404 }
      );
    }

    // Mark connections as syncing
    const updatedConnections = [];
    for (const connection of connections) {
      if (connection.status === 'disconnected') {
        continue;
      }

      const updated = await prisma.custodianConnection.update({
        where: { id: connection.id },
        data: {
          status: 'syncing',
          lastSyncAt: new Date(),
        },
      });

      updatedConnections.push(updated);

      // Record the sync in audit log
      await prisma.auditEntry.create({
        data: {
          firmId: connection.firmId,
          actorType: 'system',
          actorId: 'custodian-sync',
          actorName: `${connection.custodian} Sync`,
          action: 'UPDATE',
          resourceType: 'custodian_connection',
          resourceId: connection.id,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: `Sync triggered for ${updatedConnections.length} connection(s)`,
      connections: updatedConnections.map((c) => ({
        id: c.id,
        custodian: c.custodian,
        status: c.status,
      })),
    });
  } catch (error) {
    console.error('Error triggering custodian sync:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
