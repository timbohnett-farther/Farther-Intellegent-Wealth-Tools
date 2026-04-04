/**
 * POST /api/migration/upload/init
 *
 * Initialize a chunked file upload session.
 * Creates an UploadFile record and prepares directories for chunk storage.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  calculateTotalChunks,
  calculateUploadExpiration,
  ensureUploadDirectories,
  validateUploadRequest,
  CHUNK_SIZE,
} from "@/lib/upload/chunked-uploader";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, fileName, fileSize, mimeType, chunkSize } = body;

    // Validate required fields
    if (!sessionId || !fileName || !fileSize || !mimeType) {
      return NextResponse.json(
        { error: "Missing required fields: sessionId, fileName, fileSize, mimeType" },
        { status: 400 }
      );
    }

    // Validate session exists and is in UPLOADING status
    const session = await prisma.migrationSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return NextResponse.json({ error: "Migration session not found" }, { status: 404 });
    }

    if (session.status !== "UPLOADING") {
      return NextResponse.json(
        { error: `Session is not in UPLOADING status (current: ${session.status})` },
        { status: 400 }
      );
    }

    // Validate upload request
    const validation = validateUploadRequest(fileName, fileSize, mimeType);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // Calculate upload parameters
    const effectiveChunkSize = chunkSize || CHUNK_SIZE;
    const totalChunks = calculateTotalChunks(fileSize, effectiveChunkSize);
    const expiresAt = calculateUploadExpiration();

    // Create UploadFile record
    const uploadFile = await prisma.uploadFile.create({
      data: {
        sessionId,
        originalName: fileName,
        storedPath: "", // Will be set after assembly
        mimeType,
        sizeBytes: fileSize,
        uploadStatus: "UPLOADING",
        uploadProgress: 0,
        totalChunks,
        uploadedChunks: 0,
        chunkMetadata: JSON.stringify({ chunkSize: effectiveChunkSize }),
      },
    });

    // Ensure upload directories exist
    await ensureUploadDirectories(sessionId, uploadFile.id);

    return NextResponse.json({
      uploadId: uploadFile.id,
      totalChunks,
      chunkSize: effectiveChunkSize,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    console.error("Upload init error:", error);
    return NextResponse.json(
      { error: "Failed to initialize upload. Please try again." },
      { status: 500 }
    );
  }
}
