/**
 * Cloud Document Storage Service
 * S3/R2 compatible with local filesystem fallback for development.
 *
 * Strategy:
 * - Production: Use S3-compatible storage (R2, DigitalOcean Spaces, AWS S3)
 * - Development: Use local filesystem with uploads/ directory
 * - Metadata stored in intermediate Map (will use DocumentRecord model when created)
 * - SHA-256 hash for duplicate detection
 */

import { createHash, randomUUID } from 'crypto';
import { mkdir, writeFile, readFile, unlink, readdir } from 'fs/promises';
import { join, extname } from 'path';
import { existsSync } from 'fs';

// ==================== TYPES ====================

export interface DocumentUploadResult {
  documentId: string;
  storageUrl: string;
  fileHash: string;
  fileSize: number;
}

export interface DocumentMetadata {
  documentId: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  documentType: string;
  taxYear?: number;
  storageUrl: string;
  createdAt: Date;
  householdId?: string;
  clientId?: string;
  firmId: string;
  uploadedBy?: string;
  fileHash: string;
}

interface UploadDocumentParams {
  buffer: Buffer;
  fileName: string;
  mimeType: string;
  householdId?: string;
  clientId?: string;
  firmId: string;
  documentType: string;
  taxYear?: number;
  uploadedBy?: string;
}

// ==================== STORAGE CONFIG ====================

const S3_ENDPOINT = process.env.S3_ENDPOINT;
const S3_REGION = process.env.S3_REGION ?? 'auto';
const S3_ACCESS_KEY_ID = process.env.S3_ACCESS_KEY_ID;
const S3_SECRET_ACCESS_KEY = process.env.S3_SECRET_ACCESS_KEY;
const S3_BUCKET = process.env.S3_BUCKET;

const USE_S3 = Boolean(
  S3_ENDPOINT && S3_BUCKET && S3_ACCESS_KEY_ID && S3_SECRET_ACCESS_KEY
);

const LOCAL_UPLOAD_DIR = join(process.cwd(), 'uploads');

// In-memory metadata store (temporary — replace with Prisma DocumentRecord model later)
const documentStore = new Map<string, DocumentMetadata>();

// ==================== HELPERS ====================

function generateFileHash(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}

function buildStoragePath(params: {
  firmId: string;
  householdId?: string;
  documentType: string;
  taxYear?: number;
  fileName: string;
}): string {
  const { firmId, householdId, documentType, taxYear, fileName } = params;
  const uuid = randomUUID();
  const ext = extname(fileName);
  const baseName = fileName.replace(ext, '').replace(/[^a-zA-Z0-9-_]/g, '_');
  const finalName = `${uuid}_${baseName}${ext}`;

  const parts = [firmId];
  if (householdId) parts.push(householdId);
  parts.push(documentType);
  if (taxYear) parts.push(String(taxYear));
  parts.push(finalName);

  return parts.join('/');
}

async function ensureLocalDir(dir: string): Promise<void> {
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
}

// ==================== S3 OPERATIONS ====================

async function uploadToS3(
  path: string,
  buffer: Buffer,
  mimeType: string
): Promise<string> {
  if (!S3_ENDPOINT || !S3_BUCKET || !S3_ACCESS_KEY_ID || !S3_SECRET_ACCESS_KEY) {
    throw new Error('S3 credentials not configured');
  }

  // Build S3 PUT URL
  const url = `${S3_ENDPOINT}/${S3_BUCKET}/${path}`;

  // Simple fetch-based S3 upload (no AWS SDK dependency)
  const response = await fetchWithTimeout(url, {
    method: 'PUT',
    headers: {
      'Content-Type': mimeType,
      'Content-Length': String(buffer.length),
      // Note: For production, implement AWS Signature V4 signing
      // For Cloudflare R2, use API token auth
      Authorization: `Bearer ${S3_ACCESS_KEY_ID}`,
    },
    body: buffer as unknown as BodyInit,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`S3 upload failed: ${response.status} ${text}`);
  }

  return url;
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs = 30000
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeout);
  }
}

async function deleteFromS3(path: string): Promise<boolean> {
  if (!S3_ENDPOINT || !S3_BUCKET) {
    throw new Error('S3 credentials not configured');
  }

  const url = `${S3_ENDPOINT}/${S3_BUCKET}/${path}`;

  const response = await fetchWithTimeout(url, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${S3_ACCESS_KEY_ID}`,
    },
  });

  return response.ok;
}

// ==================== LOCAL FILESYSTEM OPERATIONS ====================

async function uploadToLocal(path: string, buffer: Buffer): Promise<string> {
  await ensureLocalDir(LOCAL_UPLOAD_DIR);

  const fullPath = join(LOCAL_UPLOAD_DIR, path);
  const dir = fullPath.substring(0, fullPath.lastIndexOf('/'));
  await ensureLocalDir(dir);

  await writeFile(fullPath, buffer);
  return `/uploads/${path}`; // Return web-accessible path
}

async function deleteFromLocal(path: string): Promise<boolean> {
  try {
    const fullPath = join(LOCAL_UPLOAD_DIR, path);
    await unlink(fullPath);
    return true;
  } catch (err) {
    console.error('[deleteFromLocal]', err);
    return false;
  }
}

async function listLocalFiles(prefix: string): Promise<string[]> {
  try {
    const dir = join(LOCAL_UPLOAD_DIR, prefix);
    if (!existsSync(dir)) {
      return [];
    }
    const files = await readdir(dir, { recursive: true });
    return files.filter((f) => !f.endsWith('/'));
  } catch (err) {
    console.error('[listLocalFiles]', err);
    return [];
  }
}

// ==================== PUBLIC API ====================

/**
 * Upload document to cloud storage or local filesystem
 */
export async function uploadDocument(
  params: UploadDocumentParams
): Promise<DocumentUploadResult> {
  const {
    buffer,
    fileName,
    mimeType,
    householdId,
    clientId,
    firmId,
    documentType,
    taxYear,
    uploadedBy,
  } = params;

  // Generate hash for duplicate detection
  const fileHash = generateFileHash(buffer);

  // Check for duplicate (same hash + firmId)
  const existingDocs = Array.from(documentStore.values()).filter(
    (doc) => doc.fileHash === fileHash && doc.firmId === firmId
  );

  if (existingDocs.length > 0) {
    console.log(
      `[uploadDocument] Duplicate detected: ${fileHash} (returning existing)`
    );
    const existing = existingDocs[0];
    return {
      documentId: existing.documentId,
      storageUrl: existing.storageUrl,
      fileHash: existing.fileHash,
      fileSize: existing.fileSize,
    };
  }

  // Build storage path
  const storagePath = buildStoragePath({
    firmId,
    householdId,
    documentType,
    taxYear,
    fileName,
  });

  // Upload to S3 or local
  let storageUrl: string;
  if (USE_S3) {
    storageUrl = await uploadToS3(storagePath, buffer, mimeType);
  } else {
    storageUrl = await uploadToLocal(storagePath, buffer);
  }

  // Store metadata
  const documentId = randomUUID();
  const metadata: DocumentMetadata = {
    documentId,
    fileName,
    mimeType,
    fileSize: buffer.length,
    documentType,
    taxYear,
    storageUrl,
    createdAt: new Date(),
    householdId,
    clientId,
    firmId,
    uploadedBy,
    fileHash,
  };

  documentStore.set(documentId, metadata);

  console.log(`[uploadDocument] Uploaded ${fileName} → ${storageUrl}`);

  return {
    documentId,
    storageUrl,
    fileHash,
    fileSize: buffer.length,
  };
}

/**
 * Get document URL (or signed URL for S3)
 */
export async function getDocumentUrl(
  documentId: string
): Promise<string | null> {
  const metadata = documentStore.get(documentId);
  if (!metadata) {
    return null;
  }

  // For S3, generate signed URL (7-day expiry)
  if (USE_S3 && metadata.storageUrl.startsWith(S3_ENDPOINT!)) {
    // TODO: Implement presigned URL generation
    // For now, return direct URL (requires bucket to be public-read)
    return metadata.storageUrl;
  }

  return metadata.storageUrl;
}

/**
 * Delete document from storage
 */
export async function deleteDocument(documentId: string): Promise<boolean> {
  const metadata = documentStore.get(documentId);
  if (!metadata) {
    return false;
  }

  let deleted = false;
  if (USE_S3 && metadata.storageUrl.startsWith(S3_ENDPOINT!)) {
    const path = metadata.storageUrl.replace(`${S3_ENDPOINT}/${S3_BUCKET}/`, '');
    deleted = await deleteFromS3(path);
  } else {
    const path = metadata.storageUrl.replace('/uploads/', '');
    deleted = await deleteFromLocal(path);
  }

  if (deleted) {
    documentStore.delete(documentId);
  }

  return deleted;
}

/**
 * List documents by household, client, or type
 */
export async function listDocuments(params: {
  householdId?: string;
  clientId?: string;
  documentType?: string;
  firmId: string;
}): Promise<DocumentMetadata[]> {
  const { householdId, clientId, documentType, firmId } = params;

  let results = Array.from(documentStore.values()).filter(
    (doc) => doc.firmId === firmId
  );

  if (householdId) {
    results = results.filter((doc) => doc.householdId === householdId);
  }

  if (clientId) {
    results = results.filter((doc) => doc.clientId === clientId);
  }

  if (documentType) {
    results = results.filter((doc) => doc.documentType === documentType);
  }

  return results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

/**
 * Get all documents for a firm (admin view)
 */
export async function listAllDocuments(firmId: string): Promise<DocumentMetadata[]> {
  return Array.from(documentStore.values())
    .filter((doc) => doc.firmId === firmId)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

// ==================== DEVELOPMENT HELPERS ====================

/**
 * Get document count by type (for debugging)
 */
export function getDocumentStats(firmId: string): Record<string, number> {
  const docs = Array.from(documentStore.values()).filter(
    (doc) => doc.firmId === firmId
  );

  const stats: Record<string, number> = {};
  for (const doc of docs) {
    stats[doc.documentType] = (stats[doc.documentType] || 0) + 1;
  }

  return stats;
}
