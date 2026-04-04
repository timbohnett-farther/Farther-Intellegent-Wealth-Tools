/**
 * POST /api/migration/[sessionId]/duplicates
 *
 * Run duplicate detection and merge duplicates.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DuplicateDetectionService } from "@/lib/migration/duplicate-detection";

export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const { sessionId } = params;
    const body = await request.json();
    const { entityTypes } = body;

    // Validate session exists
    const session = await prisma.migrationSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return NextResponse.json({ error: "Migration session not found" }, { status: 404 });
    }

    const results: any[] = [];

    // Run duplicate detection for each entity type
    for (const entityType of entityTypes || ["CONTACT", "HOUSEHOLD"]) {
      const result = await DuplicateDetectionService.mergeDuplicates(
        sessionId,
        entityType as "CONTACT" | "HOUSEHOLD"
      );

      results.push({
        entityType,
        ...result,
      });
    }

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error) {
    console.error("Duplicate detection error:", error);
    return NextResponse.json(
      {
        error: "Failed to run duplicate detection. Please try again.",
      },
      { status: 500 }
    );
  }
}
