// =============================================================================
// POST /api/v1/return-documents  - Create document + return presigned upload URL
// =============================================================================
// Stage 1: Returns a fake S3 presigned URL. In production, this would generate
// a real presigned URL via the AWS SDK.
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import type {
  ReturnDocument,
  UploadInitRequest,
  UploadInitResponse,
  ErrorEnvelope,
  TaxYear,
} from '@/lib/tax-planning/types';
import { store } from '@/lib/tax-planning/store';
import { parseAuthContext, hasPermission } from '@/lib/tax-planning/rbac';
import { auditService } from '@/lib/tax-planning/audit';

// ==================== Helpers ====================

const VALID_DOC_TYPES = ['FORM1040_PDF', 'IRS_RETURN_TRANSCRIPT_PDF', 'OTHER'] as const;

function authError(message: string): NextResponse {
  const err: ErrorEnvelope = {
    error: {
      code: 'UNAUTHORIZED',
      message,
      details: {},
      correlationId: crypto.randomUUID(),
    },
  };
  return NextResponse.json(err, { status: 401 });
}

function forbiddenError(permission: string): NextResponse {
  const err: ErrorEnvelope = {
    error: {
      code: 'FORBIDDEN',
      message: `You do not have the "${permission}" permission.`,
      details: { requiredPermission: permission },
      correlationId: crypto.randomUUID(),
    },
  };
  return NextResponse.json(err, { status: 403 });
}

// ==================== POST ====================

export async function POST(request: NextRequest): Promise<NextResponse> {
  // ---------- Auth ----------
  const auth = parseAuthContext(request.headers.get('authorization'));
  if (!auth) return authError('Missing or invalid Authorization header.');
  if (!hasPermission(auth.role, 'docs:write')) return forbiddenError('docs:write');

  // ---------- Parse body ----------
  let body: UploadInitRequest;
  try {
    body = await request.json();
  } catch {
    const err: ErrorEnvelope = {
      error: {
        code: 'INVALID_JSON',
        message: 'Request body must be valid JSON.',
        details: {},
        correlationId: crypto.randomUUID(),
      },
    };
    return NextResponse.json(err, { status: 400 });
  }

  // ---------- Validate ----------
  const errors: Record<string, string> = {};

  if (!body.householdId || typeof body.householdId !== 'string') {
    errors.householdId = 'householdId is required.';
  } else {
    const hh = store.getHousehold(body.householdId);
    if (!hh || hh.firm_id !== auth.firmId) {
      errors.householdId = 'Household not found or access denied.';
    }
  }

  if (!body.taxYear || typeof body.taxYear !== 'number' || body.taxYear < 2000 || body.taxYear > 2100) {
    errors.taxYear = 'taxYear is required and must be a valid year (2000-2100).';
  }

  if (!body.docType || !VALID_DOC_TYPES.includes(body.docType as typeof VALID_DOC_TYPES[number])) {
    errors.docType = `docType must be one of: ${VALID_DOC_TYPES.join(', ')}.`;
  }

  if (!body.filename || typeof body.filename !== 'string') {
    errors.filename = 'filename is required.';
  }

  if (Object.keys(errors).length > 0) {
    const err: ErrorEnvelope = {
      error: {
        code: 'VALIDATION_ERROR',
        message: 'One or more fields failed validation.',
        details: errors,
        correlationId: crypto.randomUUID(),
      },
    };
    return NextResponse.json(err, { status: 400 });
  }

  // ---------- Create document record ----------
  const docId = crypto.randomUUID();
  const now = new Date().toISOString();

  const doc: ReturnDocument = {
    doc_id: docId,
    household_id: body.householdId,
    tax_year: body.taxYear as TaxYear,
    doc_type: body.docType,
    storage_uri: `s3://farther-tax-docs/${auth.firmId}/${body.householdId}/${body.taxYear}/${docId}.pdf`,
    sha256: '', // Will be set on finalize
    ingested_at: now,
    ingest_status: 'UPLOADED',
    original_filename: body.filename,
  };

  store.upsertDocument(doc);

  // ---------- Audit ----------
  auditService.emit({
    firmId: auth.firmId,
    userId: auth.userId,
    eventKey: 'doc.upload',
    ip: request.headers.get('x-forwarded-for') ?? '0.0.0.0',
    payload: {
      docId,
      householdId: body.householdId,
      taxYear: body.taxYear,
      docType: body.docType,
      filename: body.filename,
    },
  });

  // ---------- Generate stub presigned URL ----------
  const uploadUrl = `https://farther-tax-docs.s3.us-east-1.amazonaws.com/${auth.firmId}/${body.householdId}/${body.taxYear}/${docId}.pdf?X-Amz-Signature=stub_signature_${crypto.randomUUID()}&X-Amz-Expires=3600`;

  const response: UploadInitResponse = {
    uploadUrl,
    docId,
  };

  return NextResponse.json(response, { status: 201 });
}
