/**
 * POST /api/migration/parse
 *
 * Trigger a parsing job for an uploaded file.
 * Determines the appropriate parser based on session platform.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ParseService } from "@/lib/migration/parse-service";
import { parserRegistry } from "@/lib/migration/parsers"; // Import from index to ensure registration

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, uploadId } = body;

    // Validate required fields
    if (!sessionId || !uploadId) {
      return NextResponse.json(
        { error: "Missing required fields: sessionId, uploadId" },
        { status: 400 }
      );
    }

    // Fetch session and upload file
    const session = await prisma.migrationSession.findUnique({
      where: { id: sessionId },
      include: {
        files: {
          where: { id: uploadId },
        },
      },
    });

    if (!session) {
      return NextResponse.json({ error: "Migration session not found" }, { status: 404 });
    }

    if (session.files.length === 0) {
      return NextResponse.json({ error: "Upload file not found" }, { status: 404 });
    }

    const uploadFile = session.files[0];

    if (uploadFile.uploadStatus !== "COMPLETED") {
      return NextResponse.json(
        { error: `Upload is not completed (status: ${uploadFile.uploadStatus})` },
        { status: 400 }
      );
    }

    // Get parser for platform
    const parser = parserRegistry.getParser(
      session.platform as "REDTAIL" | "WEALTHBOX" | "COMMONWEALTH" | "SALESFORCE" | "ADVIZON"
    );

    if (!parser) {
      return NextResponse.json(
        { error: `No parser available for platform: ${session.platform}` },
        { status: 400 }
      );
    }

    // Validate file before parsing
    const validation = await parser.validateFile(uploadFile.storedPath);
    if (!validation.valid) {
      return NextResponse.json(
        { error: `File validation failed: ${validation.error}` },
        { status: 400 }
      );
    }

    // Start parse job
    const jobId = await ParseService.startParseJob(
      sessionId,
      uploadId,
      parser,
      uploadFile.storedPath
    );

    return NextResponse.json({
      jobId,
      status: "QUEUED",
      message: "Parse job started",
    });
  } catch (error) {
    console.error("Parse trigger error:", error);
    return NextResponse.json(
      {
        error: "Failed to start parse job. Please try again.",
      },
      { status: 500 }
    );
  }
}
