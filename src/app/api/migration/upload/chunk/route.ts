/**
 * POST /api/migration/upload/chunk
 *
 * Upload an individual chunk of a file.
 * Verifies chunk integrity and tracks upload progress.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  saveChunk,
  verifyChunkIntegrity,
} from "@/lib/upload/chunked-uploader";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const uploadId = formData.get("uploadId") as string;
    const chunkIndexStr = formData.get("chunkIndex") as string;
    const checksum = formData.get("checksum") as string;
    const chunkFile = formData.get("chunk") as File;

    // Validate required fields
    if (!uploadId || !chunkIndexStr || !checksum || !chunkFile) {
      return NextResponse.json(
        { error: "Missing required fields: uploadId, chunkIndex, checksum, chunk" },
        { status: 400 }
      );
    }

    const chunkIndex = parseInt(chunkIndexStr, 10);
    if (isNaN(chunkIndex) || chunkIndex < 0) {
      return NextResponse.json({ error: "Invalid chunkIndex" }, { status: 400 });
    }

    // Fetch upload file record
    const uploadFile = await prisma.uploadFile.findUnique({
      where: { id: uploadId },
    });

    if (!uploadFile) {
      return NextResponse.json({ error: "Upload not found" }, { status: 404 });
    }

    if (uploadFile.uploadStatus === "COMPLETED") {
      return NextResponse.json({ error: "Upload already completed" }, { status: 400 });
    }

    if (uploadFile.uploadStatus === "FAILED") {
      return NextResponse.json({ error: "Upload has failed" }, { status: 400 });
    }

    // Validate chunk index is within bounds
    if (chunkIndex >= uploadFile.totalChunks) {
      return NextResponse.json(
        { error: `Chunk index ${chunkIndex} exceeds total chunks ${uploadFile.totalChunks}` },
        { status: 400 }
      );
    }

    // Convert File to Buffer
    const arrayBuffer = await chunkFile.arrayBuffer();
    const chunkData = Buffer.from(arrayBuffer);

    // Verify chunk integrity
    if (!verifyChunkIntegrity(chunkData, checksum)) {
      return NextResponse.json(
        { error: "Chunk integrity verification failed. Checksum mismatch." },
        { status: 400 }
      );
    }

    // Save chunk to temp storage
    await saveChunk(uploadId, chunkIndex, chunkData);

    // Update chunk metadata
    const chunkMetadata = JSON.parse(uploadFile.chunkMetadata || "{}");
    const receivedChunks = new Set(chunkMetadata.receivedChunks || []);
    receivedChunks.add(chunkIndex);

    const uploadedChunks = receivedChunks.size;
    const uploadProgress = (uploadedChunks / uploadFile.totalChunks) * 100;

    // Update upload file record
    await prisma.uploadFile.update({
      where: { id: uploadId },
      data: {
        uploadedChunks,
        uploadProgress,
        chunkMetadata: JSON.stringify({
          ...chunkMetadata,
          receivedChunks: Array.from(receivedChunks),
        }),
      },
    });

    // Determine next chunk index
    const nextChunkIndex = chunkIndex + 1 < uploadFile.totalChunks ? chunkIndex + 1 : undefined;

    return NextResponse.json({
      success: true,
      uploadProgress,
      uploadedChunks,
      totalChunks: uploadFile.totalChunks,
      nextChunkIndex,
    });
  } catch (error) {
    console.error("Chunk upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload chunk. Please try again." },
      { status: 500 }
    );
  }
}
