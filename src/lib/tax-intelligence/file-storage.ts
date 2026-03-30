/**
 * File Storage Service — Phase 2 Sprint 1
 *
 * Handles file upload, storage, and retrieval for tax documents.
 * Uses local filesystem for development, can be swapped to S3 for production.
 *
 * Storage Structure:
 * /uploads/tax-documents/{householdId}/{taxYear}/{documentId}.pdf
 * /uploads/tax-documents/{householdId}/{taxYear}/{documentId}_thumb.jpg
 * /uploads/tax-documents/{householdId}/{taxYear}/{documentId}_page_{n}.jpg
 */

import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

// Storage configuration
const STORAGE_ROOT = process.env.UPLOAD_STORAGE_PATH || path.join(process.cwd(), 'uploads');
const TAX_DOCUMENTS_DIR = 'tax-documents';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/tiff'];

export interface StorageResult {
  success: boolean;
  fileUrl?: string;
  fileSize?: number;
  fileHash?: string;
  error?: string;
}

export interface FileMetadata {
  originalFilename: string;
  mimeType: string;
  fileSize: number;
  householdId: string;
  taxYear?: number;
  documentId: string;
}

/**
 * Calculate SHA-256 hash of file for duplicate detection
 */
export async function calculateFileHash(buffer: Buffer): Promise<string> {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Validate file before storage
 */
export function validateFile(file: File | Buffer, mimeType: string, fileSize: number): { valid: boolean; error?: string } {
  // Check file size
  if (fileSize > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size ${(fileSize / 1024 / 1024).toFixed(2)}MB exceeds maximum allowed size of ${MAX_FILE_SIZE / 1024 / 1024}MB`,
    };
  }

  // Check MIME type
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    return {
      valid: false,
      error: `File type ${mimeType} not allowed. Only PDF, JPEG, PNG, and TIFF files are accepted.`,
    };
  }

  return { valid: true };
}

/**
 * Store uploaded file to local filesystem
 */
export async function storeFile(
  fileBuffer: Buffer,
  metadata: FileMetadata
): Promise<StorageResult> {
  try {
    // Validate file
    const validation = validateFile(
      fileBuffer as any,
      metadata.mimeType,
      metadata.fileSize
    );

    if (!validation.valid) {
      return {
        success: false,
        error: validation.error,
      };
    }

    // Calculate file hash for duplicate detection
    const fileHash = await calculateFileHash(fileBuffer);

    // Build storage path
    const taxYear = metadata.taxYear || 'unknown';
    const storagePath = path.join(
      STORAGE_ROOT,
      TAX_DOCUMENTS_DIR,
      metadata.householdId,
      taxYear.toString(),
      `${metadata.documentId}${path.extname(metadata.originalFilename)}`
    );

    // Ensure directory exists
    await fs.mkdir(path.dirname(storagePath), { recursive: true });

    // Write file
    await fs.writeFile(storagePath, fileBuffer);

    // Build file URL (relative path for local, would be S3 URL in production)
    const fileUrl = `/uploads/${TAX_DOCUMENTS_DIR}/${metadata.householdId}/${taxYear}/${metadata.documentId}${path.extname(metadata.originalFilename)}`;

    return {
      success: true,
      fileUrl,
      fileSize: metadata.fileSize,
      fileHash,
    };
  } catch (error) {
    console.error('File storage error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown storage error',
    };
  }
}

/**
 * Check if file with given hash already exists for household
 */
export async function checkDuplicateByHash(
  householdId: string,
  fileHash: string
): Promise<{ isDuplicate: boolean; existingDocumentId?: string }> {
  // This would query the database for existing documents with this hash
  // For now, return false (no duplicate) - will be implemented with database integration
  return { isDuplicate: false };
}

/**
 * Delete file from storage
 */
export async function deleteFile(fileUrl: string): Promise<boolean> {
  try {
    const filePath = path.join(process.cwd(), fileUrl);
    await fs.unlink(filePath);
    return true;
  } catch (error) {
    console.error('File deletion error:', error);
    return false;
  }
}

/**
 * Get file from storage
 */
export async function getFile(fileUrl: string): Promise<Buffer | null> {
  try {
    const filePath = path.join(process.cwd(), fileUrl);
    return await fs.readFile(filePath);
  } catch (error) {
    console.error('File retrieval error:', error);
    return null;
  }
}

/**
 * Check if storage is properly configured
 */
export async function checkStorageHealth(): Promise<{ healthy: boolean; error?: string }> {
  try {
    const testDir = path.join(STORAGE_ROOT, 'health-check');
    await fs.mkdir(testDir, { recursive: true });
    await fs.rmdir(testDir);
    return { healthy: true };
  } catch (error) {
    return {
      healthy: false,
      error: error instanceof Error ? error.message : 'Storage health check failed',
    };
  }
}
