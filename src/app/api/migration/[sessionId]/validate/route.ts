/**
 * POST /api/migration/[sessionId]/validate
 *
 * Run validation on all mapped data.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ValidationService } from "@/lib/migration/validation-service";

export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const { sessionId } = params;
    const body = await request.json();
    const { entityTypes } = body;

    // Validate session exists and is in MAPPING status
    const session = await prisma.migrationSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return NextResponse.json({ error: "Migration session not found" }, { status: 404 });
    }

    if (session.status !== "MAPPING" && session.status !== "VALIDATING") {
      return NextResponse.json(
        { error: `Session is not in MAPPING status (current: ${session.status})` },
        { status: 400 }
      );
    }

    // Update session status to VALIDATING
    await prisma.migrationSession.update({
      where: { id: sessionId },
      data: { status: "VALIDATING" },
    });

    // Create job ID for progress tracking
    const jobId = `validate-${sessionId}-${Date.now()}`;

    // Run validation asynchronously
    runValidation(sessionId, entityTypes || ["CONTACT", "HOUSEHOLD"]).catch((error) => {
      console.error(`Validation job ${jobId} failed:`, error);
    });

    return NextResponse.json({
      jobId,
      status: "QUEUED",
    });
  } catch (error) {
    console.error("Validation trigger error:", error);
    return NextResponse.json(
      {
        error: "Failed to start validation",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

async function runValidation(sessionId: string, entityTypes: string[]) {
  try {
    const results: any[] = [];

    for (const entityType of entityTypes) {
      const result = await ValidationService.validateSession(
        sessionId,
        entityType as "CONTACT" | "HOUSEHOLD"
      );
      results.push({ entityType, ...result });
    }

    // Calculate totals
    const totalErrors = results.reduce((sum, r) => sum + r.errorCount, 0);
    const totalWarnings = results.reduce((sum, r) => sum + r.warningCount, 0);
    const allValid = results.every((r) => r.valid);

    // Update session
    await prisma.migrationSession.update({
      where: { id: sessionId },
      data: {
        status: allValid ? "VALIDATED" : "MAPPING", // Return to MAPPING if errors found
        errorCount: totalErrors,
      },
    });
  } catch (error) {
    console.error("Validation execution error:", error);

    // Update session status to failed
    await prisma.migrationSession.update({
      where: { id: sessionId },
      data: { status: "FAILED" },
    });
  }
}
