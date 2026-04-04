export const dynamic = 'force-dynamic';
// =============================================================================
// GET  /api/v1/documents - List/filter documents
// POST /api/v1/documents - Upload document (multipart form)
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

// ==================== Types ====================

interface DocumentRecord {
  documentId: string;
  fileName: string;
  fileSize: number;
  documentType?: string;
  taxYear?: number;
  householdId?: string;
  clientId?: string;
  firmId?: string;
  storageUrl: string;
  uploadedAt: string;
}

interface GetDocumentsResponse {
  success: boolean;
  data: {
    documents: DocumentRecord[];
    totalCount: number;
  } | null;
  error: string | null;
  retryable: boolean;
}

interface UploadDocumentResponse {
  success: boolean;
  data: {
    documentId: string;
    fileName: string;
    fileSize: number;
    storageUrl: string;
  } | null;
  error: string | null;
  retryable: boolean;
}

// ==================== Helpers ====================

function getErrorResponse(
  error: string,
  retryable: boolean,
  status: number
): NextResponse<GetDocumentsResponse> {
  return NextResponse.json(
    { success: false, data: null, error, retryable },
    { status }
  );
}

function uploadErrorResponse(
  error: string,
  retryable: boolean,
  status: number
): NextResponse<UploadDocumentResponse> {
  return NextResponse.json(
    { success: false, data: null, error, retryable },
    { status }
  );
}

// ==================== GET ====================

export async function GET(req: NextRequest): Promise<NextResponse<GetDocumentsResponse>> {
  try {
    // ---------- Parse query params ----------
    const { searchParams } = new URL(req.url);
    const householdId = searchParams.get('householdId') || undefined;
    const clientId = searchParams.get('clientId') || undefined;
    const firmId = searchParams.get('firmId') || undefined;
    const type = searchParams.get('type') || undefined;

    // Log filter params
    console.log('[GET /api/v1/documents]', {
      householdId,
      clientId,
      firmId,
      type,
    });

    // ---------- Return empty array for now ----------
    // Document storage models may not be migrated yet
    // TODO: Replace with actual Prisma query when document model is available
    return NextResponse.json({
      success: true,
      data: {
        documents: [],
        totalCount: 0,
      },
      error: null,
      retryable: false,
    });

  } catch (err) {
    console.error('[GET /api/v1/documents]', err);
    return NextResponse.json({
      success: false,
      data: null,
      error: 'Failed to fetch documents',
      retryable: true,
    }, { status: 500 });
  }
}

// ==================== POST ====================

export async function POST(req: NextRequest): Promise<NextResponse<UploadDocumentResponse>> {
  try {
    // ---------- Parse multipart form data ----------
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const householdId = formData.get('householdId') as string | null;
    const clientId = formData.get('clientId') as string | null;
    const firmId = formData.get('firmId') as string | null;
    const documentType = formData.get('documentType') as string | null;
    const taxYear = formData.get('taxYear') as string | null;

    // ---------- Validate ----------
    if (!file) {
      return uploadErrorResponse('file is required', false, 400);
    }

    if (!firmId) {
      return uploadErrorResponse('firmId is required', false, 400);
    }

    if (!householdId && !clientId) {
      return uploadErrorResponse('householdId or clientId is required', false, 400);
    }

    // ---------- Convert file to Buffer ----------
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // ---------- Create storage path ----------
    const documentId = crypto.randomUUID();
    const uploadDir = join(process.cwd(), 'uploads', firmId, householdId || clientId || 'unassigned');
    const fileName = file.name;
    const filePath = join(uploadDir, `${documentId}_${fileName}`);

    // Create directory if it doesn't exist
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    // Write file to disk
    await writeFile(filePath, buffer);

    // ---------- Build response ----------
    const storageUrl = `/uploads/${firmId}/${householdId || clientId || 'unassigned'}/${documentId}_${fileName}`;

    console.log('[POST /api/v1/documents]', {
      documentId,
      fileName,
      fileSize: buffer.length,
      householdId,
      clientId,
      firmId,
      documentType,
      taxYear: taxYear ? parseInt(taxYear, 10) : undefined,
      storageUrl,
    });

    return NextResponse.json({
      success: true,
      data: {
        documentId,
        fileName,
        fileSize: buffer.length,
        storageUrl,
      },
      error: null,
      retryable: false,
    });

  } catch (err) {
    console.error('[POST /api/v1/documents]', err);
    const message = err instanceof Error ? err.message : 'Upload failed';
    return uploadErrorResponse(message, true, 500);
  }
}
