/**
 * POST /api/migration/[sessionId]/rollback
 *
 * Rollback imported records or delete entire session.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { RollbackService } from "@/lib/migration/rollback-service";

export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const { sessionId } = params;
    const body = await request.json();
    const { action, entityType } = body;

    // Validate session exists
    const session = await prisma.migrationSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return NextResponse.json({ error: "Migration session not found" }, { status: 404 });
    }

    let result;

    switch (action) {
      case "rollback_all":
        result = await RollbackService.rollbackSession(sessionId);
        break;

      case "rollback_entity":
        if (!entityType) {
          return NextResponse.json(
            { error: "entityType required for rollback_entity action" },
            { status: 400 }
          );
        }
        result = await RollbackService.rollbackEntityType(sessionId, entityType);
        break;

      case "delete_session":
        result = await RollbackService.deleteSession(sessionId);
        break;

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}. Valid actions: rollback_all, rollback_entity, delete_session` },
          { status: 400 }
        );
    }

    if (!result.success) {
      return NextResponse.json(
        {
          error: "Rollback failed",
          details: result.errors.join(", "),
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      recordsReverted: result.recordsReverted,
      message: `Successfully ${action === "delete_session" ? "deleted session" : "rolled back"} ${result.recordsReverted} records`,
    });
  } catch (error) {
    console.error("Rollback error:", error);
    return NextResponse.json(
      {
        error: "Failed to rollback",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
