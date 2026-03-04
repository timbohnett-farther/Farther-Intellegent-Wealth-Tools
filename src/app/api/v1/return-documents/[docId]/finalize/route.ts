export const dynamic = 'force-dynamic';
// =============================================================================
// POST /api/v1/return-documents/:docId/finalize
// =============================================================================
// Finalize upload and enqueue extraction.
// Stage 1: Immediately sets status to EXTRACTED and generates stub extracted
// fields for common 1040 lines (wages, interest, dividends, AGI, taxable
// income, total tax).
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import type {
  ExtractedField,
  MoneyCents,
  TaxLineRef,
  ErrorEnvelope,
} from '@/lib/tax-planning/types';
import { store } from '@/lib/tax-planning/store';
import { parseAuthContext, hasPermission } from '@/lib/tax-planning/rbac';
import { auditService } from '@/lib/tax-planning/audit';

// ==================== Helpers ====================

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

function notFoundError(resource: string, id: string): NextResponse {
  const err: ErrorEnvelope = {
    error: {
      code: 'NOT_FOUND',
      message: `${resource} "${id}" not found.`,
      details: { resource, id },
      correlationId: crypto.randomUUID(),
    },
  };
  return NextResponse.json(err, { status: 404 });
}

type RouteParams = { params: Promise<{ docId: string }> };

// ==================== Stub Extracted Fields ====================

/** Generate deterministic stub extracted fields for a document. */
function generateStubFields(docId: string): ExtractedField[] {
  const stubLines: Array<{
    ref: TaxLineRef;
    valueCents: MoneyCents;
    page: number;
  }> = [
    { ref: 'f1040:l1z:wages' as TaxLineRef, valueCents: 9500000 as MoneyCents, page: 1 },           // $95,000
    { ref: 'f1040:l2b:taxable_interest' as TaxLineRef, valueCents: 275000 as MoneyCents, page: 1 },  // $2,750
    { ref: 'f1040:l3b:ordinary_dividends' as TaxLineRef, valueCents: 420000 as MoneyCents, page: 1 },// $4,200
    { ref: 'f1040:l11:agi' as TaxLineRef, valueCents: 10200000 as MoneyCents, page: 1 },             // $102,000
    { ref: 'f1040:l15:taxable_income' as TaxLineRef, valueCents: 8700000 as MoneyCents, page: 2 },   // $87,000
    { ref: 'f1040:l16:tax' as TaxLineRef, valueCents: 1305000 as MoneyCents, page: 2 },              // $13,050
  ];

  return stubLines.map((line) => ({
    field_id: crypto.randomUUID(),
    doc_id: docId,
    tax_line_ref: line.ref,
    value_cents: line.valueCents,
    confidence: 0.95,
    source_kind: 'PDF_TEXT' as const,
    page_num: line.page,
  }));
}

// ==================== POST ====================

export async function POST(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const { docId } = await params;

  // ---------- Auth ----------
  const auth = parseAuthContext(request.headers.get('authorization'));
  if (!auth) return authError('Missing or invalid Authorization header.');
  if (!hasPermission(auth.role, 'docs:write')) return forbiddenError('docs:write');

  // ---------- Fetch document ----------
  const doc = store.getDocument(docId);
  if (!doc) {
    return notFoundError('ReturnDocument', docId);
  }

  // Verify the document belongs to a household in the user's firm
  const household = store.getHousehold(doc.household_id);
  if (!household || household.firm_id !== auth.firmId) {
    return notFoundError('ReturnDocument', docId);
  }

  // ---------- Validate state ----------
  if (doc.ingest_status !== 'UPLOADED') {
    const err: ErrorEnvelope = {
      error: {
        code: 'INVALID_STATE',
        message: `Document is in "${doc.ingest_status}" state. Only UPLOADED documents can be finalized.`,
        details: { currentStatus: doc.ingest_status },
        correlationId: crypto.randomUUID(),
      },
    };
    return NextResponse.json(err, { status: 400 });
  }

  // ---------- Stage 1: Immediately extract ----------
  // In production, this would enqueue an async job for OCR/extraction.
  // For Stage 1, we immediately generate stub fields and mark as EXTRACTED.

  doc.ingest_status = 'EXTRACTED';
  doc.sha256 = `sha256_stub_${crypto.randomUUID().replace(/-/g, '')}`;
  store.upsertDocument(doc);

  // Generate and persist stub extracted fields
  const fields = generateStubFields(docId);
  for (const field of fields) {
    store.upsertExtractedField(field);
  }

  // ---------- Audit ----------
  auditService.emit({
    firmId: auth.firmId,
    userId: auth.userId,
    eventKey: 'doc.extraction.completed',
    ip: request.headers.get('x-forwarded-for') ?? '0.0.0.0',
    payload: {
      docId,
      householdId: doc.household_id,
      taxYear: doc.tax_year,
      fieldsExtracted: fields.length,
    },
  });

  return NextResponse.json({
    docId,
    status: doc.ingest_status,
    fieldsExtracted: fields.length,
    fields,
  });
}
