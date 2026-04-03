/**
 * Chunked File Upload Utilities
 *
 * Supports uploading large files (up to 1GB) in chunks with:
 * - Automatic chunk splitting (default 5MB chunks)
 * - Progress tracking
 * - Resume capability on network interruption
 * - Integrity verification with checksums
 */

import * as crypto from "crypto";
import * as fs from "fs/promises";
import * as path from "path";

export const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB default chunk size
export const MAX_FILE_SIZE = 1024 * 1024 * 1024; // 1GB max file size
export const UPLOAD_DIR = process.env.UPLOAD_DIR || "uploads";
export const TEMP_DIR = path.join(UPLOAD_DIR, "temp");

/**
 * Calculate MD5 checksum for data integrity verification
 */
export function calculateChecksum(data: Buffer): string {
  return crypto.createHash("md5").update(data).digest("hex");
}

/**
 * Calculate total number of chunks needed for a file
 */
export function calculateTotalChunks(fileSize: number, chunkSize: number = CHUNK_SIZE): number {
  return Math.ceil(fileSize / chunkSize);
}

/**
 * Get upload directory path for a session
 */
export function getSessionUploadDir(sessionId: string): string {
  return path.join(UPLOAD_DIR, sessionId);
}

/**
 * Get temp directory path for chunk assembly
 */
export function getTempChunkDir(uploadId: string): string {
  return path.join(TEMP_DIR, uploadId);
}

/**
 * Ensure upload directories exist
 */
export async function ensureUploadDirectories(sessionId: string, uploadId: string): Promise<void> {
  const sessionDir = getSessionUploadDir(sessionId);
  const tempChunkDir = getTempChunkDir(uploadId);

  await fs.mkdir(sessionDir, { recursive: true });
  await fs.mkdir(tempChunkDir, { recursive: true });
}

/**
 * Save uploaded chunk to temp storage
 */
export async function saveChunk(
  uploadId: string,
  chunkIndex: number,
  chunkData: Buffer
): Promise<string> {
  const tempDir = getTempChunkDir(uploadId);
  const chunkPath = path.join(tempDir, `chunk-${chunkIndex.toString().padStart(6, "0")}`);

  await fs.writeFile(chunkPath, chunkData);
  return chunkPath;
}

/**
 * Verify chunk integrity using checksum
 */
export function verifyChunkIntegrity(chunkData: Buffer, expectedChecksum: string): boolean {
  const actualChecksum = calculateChecksum(chunkData);
  return actualChecksum === expectedChecksum;
}

/**
 * Assemble chunks into final file
 */
export async function assembleChunks(
  uploadId: string,
  sessionId: string,
  originalName: string,
  totalChunks: number
): Promise<{ filePath: string; sizeBytes: number }> {
  const tempDir = getTempChunkDir(uploadId);
  const sessionDir = getSessionUploadDir(sessionId);

  // Generate unique filename to prevent collisions
  const timestamp = Date.now();
  const sanitizedName = originalName.replace(/[^a-zA-Z0-9.-]/g, "_");
  const finalFilename = `${uploadId}-${timestamp}-${sanitizedName}`;
  const finalPath = path.join(sessionDir, finalFilename);

  // Create write stream for final file
  const writeStream = await fs.open(finalPath, "w");

  let totalBytes = 0;

  try {
    // Read and write chunks in order
    for (let i = 0; i < totalChunks; i++) {
      const chunkPath = path.join(tempDir, `chunk-${i.toString().padStart(6, "0")}`);
      const chunkData = await fs.readFile(chunkPath);

      await writeStream.write(chunkData);
      totalBytes += chunkData.length;
    }

    return { filePath: finalPath, sizeBytes: totalBytes };
  } finally {
    await writeStream.close();
  }
}

/**
 * Clean up temp chunk files after assembly
 */
export async function cleanupTempChunks(uploadId: string): Promise<void> {
  const tempDir = getTempChunkDir(uploadId);

  try {
    await fs.rm(tempDir, { recursive: true, force: true });
  } catch (error) {
    console.error(`Failed to cleanup temp chunks for ${uploadId}:`, error);
    // Don't throw - cleanup failure shouldn't block upload completion
  }
}

/**
 * Validate file upload request
 */
export interface UploadValidation {
  valid: boolean;
  error?: string;
}

export function validateUploadRequest(
  fileName: string,
  fileSize: number,
  mimeType: string
): UploadValidation {
  // Check file size
  if (fileSize > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size exceeds maximum allowed size of ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
    };
  }

  if (fileSize <= 0) {
    return {
      valid: false,
      error: "File size must be greater than 0",
    };
  }

  // Check file extension (allow common CRM export formats)
  const allowedExtensions = [".json", ".csv", ".zip", ".bak", ".xml", ".xlsx", ".xls"];
  const ext = path.extname(fileName).toLowerCase();

  if (!allowedExtensions.includes(ext)) {
    return {
      valid: false,
      error: `File type not allowed. Allowed types: ${allowedExtensions.join(", ")}`,
    };
  }

  // Validate MIME type (basic check)
  const allowedMimeTypes = [
    "application/json",
    "text/csv",
    "application/zip",
    "application/x-zip-compressed",
    "application/octet-stream",
    "application/xml",
    "text/xml",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ];

  if (!allowedMimeTypes.includes(mimeType)) {
    return {
      valid: false,
      error: `MIME type not allowed: ${mimeType}`,
    };
  }

  return { valid: true };
}

/**
 * Calculate upload expiration time (2 hours from now)
 */
export function calculateUploadExpiration(): Date {
  const expiration = new Date();
  expiration.setHours(expiration.getHours() + 2);
  return expiration;
}
