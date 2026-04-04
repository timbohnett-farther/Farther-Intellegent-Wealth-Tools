/**
 * POST /api/migration/upload/complete
 *
 * Complete a chunked upload by assembling chunks into final file.
 * Triggers parsing job after successful assembly.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  assembleChunks,
  cleanupTempChunks,
} from "@/lib/upload/chunked-uploader";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { uploadId } = body;

    // Validate required fields
    if (!uploadId) {
      return NextResponse.json({ error: "Missing required field: uploadId" }, { status: 400 });
    }

    // Fetch upload file record
    const uploadFile = await prisma.uploadFile.findUnique({
      where: { id: uploadId },
      include: { session: true },
    });

    if (!uploadFile) {
      return NextResponse.json({ error: "Upload not found" }, { status: 404 });
    }

    if (uploadFile.uploadStatus === "COMPLETED") {
      return NextResponse.json(
        {
          success: true,
          filePath: uploadFile.storedPath,
          sizeBytes: uploadFile.sizeBytes,
          message: "Upload already completed",
        },
        { status: 200 }
      );
    }

    // Verify all chunks have been uploaded
    if (uploadFile.uploadedChunks < uploadFile.totalChunks) {
      return NextResponse.json(
        {
          error: `Not all chunks uploaded. Received ${uploadFile.uploadedChunks} of ${uploadFile.totalChunks}`,
        },
        { status: 400 }
      );
    }

    // Assemble chunks into final file
    const { filePath, sizeBytes } = await assembleChunks(
      uploadId,
      uploadFile.sessionId,
      uploadFile.originalName,
      uploadFile.totalChunks
    );

    // Verify final file size matches expected
    if (sizeBytes !== uploadFile.sizeBytes) {
      // Update status to FAILED
      await prisma.uploadFile.update({
        where: { id: uploadId },
        data: { uploadStatus: "FAILED" },
      });

      return NextResponse.json(
        {
          error: `File size mismatch. Expected ${uploadFile.sizeBytes} bytes, got ${sizeBytes} bytes`,
        },
        { status: 500 }
      );
    }

    // Update upload file record with final path
    await prisma.uploadFile.update({
      where: { id: uploadId },
      data: {
        uploadStatus: "COMPLETED",
        uploadProgress: 100,
        storedPath: filePath,
      },
    });

    // Update migration session status to PARSING
    await prisma.migrationSession.update({
      where: { id: uploadFile.sessionId },
      data: { status: "PARSING" },
    });

    // Clean up temp chunks
    await cleanupTempChunks(uploadId);

    // TODO: Trigger parsing job (will be implemented in next phase)
    // await triggerParsingJob(uploadFile.sessionId, uploadId);

    return NextResponse.json({
      success: true,
      filePath,
      sizeBytes,
    });
  } catch (error) {
    console.error("Upload complete error:", error);

    // Try to update status to FAILED
    try {
      const body = await request.json();
      const { uploadId } = body;
      if (uploadId) {
        await prisma.uploadFile.update({
          where: { id: uploadId },
          data: { uploadStatus: "FAILED" },
        });
      }
    } catch {
      // Ignore errors in error handler
    }

    return NextResponse.json(
      {
        error: "Failed to complete upload. Please try again.",
      },
      { status: 500 }
    );
  }
}
