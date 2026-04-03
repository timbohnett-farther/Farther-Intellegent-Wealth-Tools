/**
 * POST /api/migration/[sessionId]/import
 *
 * Start HubSpot import job.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { activeImportJobs } from "@/lib/migration/import-jobs";
import { ImportService } from "@/lib/migration/import-service";

// In-memory job storage (replace with Redis for production)
// Moved to @/lib/migration/import-jobs

export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const { sessionId } = params;
    const body = await request.json();
    const { entityTypes, batchSize, skipErrors } = body;

    // Validate session exists and is validated
    const session = await prisma.migrationSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return NextResponse.json({ error: "Migration session not found" }, { status: 404 });
    }

    if (session.status !== "VALIDATED" && session.status !== "IMPORTING") {
      return NextResponse.json(
        { error: `Session must be validated before import (current: ${session.status})` },
        { status: 400 }
      );
    }

    // Count validated records
    const contactCount = await prisma.rawContact.count({
      where: { sessionId, mappingStatus: "VALIDATED" },
    });
    const householdCount = await prisma.rawHousehold.count({
      where: { sessionId, mappingStatus: "VALIDATED" },
    });

    const totalRecords = contactCount + householdCount;

    if (totalRecords === 0) {
      return NextResponse.json(
        { error: "No validated records to import" },
        { status: 400 }
      );
    }

    // Update session status to IMPORTING
    await prisma.migrationSession.update({
      where: { id: sessionId },
      data: { status: "IMPORTING" },
    });

    // Create job ID
    const jobId = `import-${sessionId}-${Date.now()}`;

    // Initialize job state
    activeImportJobs.set(jobId, {
      id: jobId,
      sessionId,
      status: "QUEUED",
      progress: 0,
      recordsImported: 0,
      recordsFailed: 0,
      totalRecords,
      startedAt: new Date(),
      errors: [],
    });

    // Start import asynchronously
    runImport(jobId, sessionId, entityTypes || ["CONTACT", "HOUSEHOLD"]).catch((error) => {
      console.error(`Import job ${jobId} failed:`, error);
    });

    return NextResponse.json({
      jobId,
      status: "QUEUED",
      estimatedRecords: totalRecords,
    });
  } catch (error) {
    console.error("Import trigger error:", error);
    return NextResponse.json(
      {
        error: "Failed to start import",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

async function runImport(jobId: string, sessionId: string, entityTypes: string[]) {
  const job = activeImportJobs.get(jobId);
  if (!job) return;

  try {
    job.status = "IMPORTING";

    for (const entityType of entityTypes) {
      const result = await ImportService.importToHubSpot(
        sessionId,
        entityType as "CONTACT" | "HOUSEHOLD",
        (progress) => {
          // Update job progress
          job.progress = progress.progress;
          job.recordsImported = progress.recordsImported;
          job.recordsFailed = progress.recordsFailed;
          job.errors = progress.errors;
        }
      );

      job.recordsImported += result.recordsImported;
      job.recordsFailed += result.recordsFailed;
      job.errors.push(...result.errors);
    }

    // Update session
    await prisma.migrationSession.update({
      where: { id: sessionId },
      data: {
        status: "COMPLETED",
        importedRecords: job.recordsImported,
        completedAt: new Date(),
      },
    });

    job.status = "COMPLETED";
    job.completedAt = new Date();
  } catch (error) {
    console.error("Import execution error:", error);

    // Update session status to failed
    await prisma.migrationSession.update({
      where: { id: sessionId },
      data: { status: "FAILED" },
    });

    job.status = "FAILED";
    job.errors.push({
      recordId: "session",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

