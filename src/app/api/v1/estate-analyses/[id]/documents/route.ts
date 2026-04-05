// =============================================================================
// Estate Analysis Documents API — Upload & Classify
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { processDocument } from '@/lib/document-processing/minimax-processor';
import { callAI, extractJSON } from '@/lib/ai/gateway';
import { getAnalysis, updateAnalysisStatus, documentsStore } from '../../stores';
import type { ClassificationResult } from '@/lib/estate-intelligence/types';

export const dynamic = 'force-dynamic';

// ── POST /api/v1/estate-analyses/[id]/documents ──────────────────────────────

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: analysisId } = params;

    // Verify analysis exists
    const analysis = getAnalysis(analysisId);
    if (!analysis) {
      return NextResponse.json(
        { success: false, data: null, error: 'Analysis not found', retryable: false },
        { status: 404 }
      );
    }

    // Parse multipart form data
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, data: null, error: 'No file provided', retryable: false },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    console.log(`[Estate Documents API] Processing ${file.name} (${buffer.length} bytes)`);

    // Update analysis status to CLASSIFYING
    updateAnalysisStatus(analysisId, 'CLASSIFYING');

    // Extract text using document processor
    const extractionResult = await processDocument({
      documentType: 'estate_trust', // Generic estate document
      fileBuffer: buffer,
      mimeType: file.type,
    });

    if (!extractionResult.success) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: 'Failed to extract document text',
          retryable: true,
        },
        { status: 500 }
      );
    }

    const extractedText = extractionResult.rawText;

    // Classify document using AI
    const classification = await classifyDocument(file.name, extractedText);

    // Store document
    const docId = `DOC-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const classifiedDoc = {
      id: docId,
      fileName: file.name,
      extractedText,
      ...classification,
    };

    const existingDocs = documentsStore.get(analysisId) || [];
    existingDocs.push(classifiedDoc);
    documentsStore.set(analysisId, existingDocs);

    console.log(`[Estate Documents API] Classified ${file.name} as ${classification.document_type}`);

    return NextResponse.json({
      success: true,
      data: classifiedDoc,
      error: null,
      retryable: false,
    });
  } catch (err) {
    console.error('[Estate Documents API] POST error:', err);
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: 'Failed to process document',
        retryable: true,
      },
      { status: 500 }
    );
  }
}

// ── GET /api/v1/estate-analyses/[id]/documents ───────────────────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: analysisId } = params;

    // Verify analysis exists
    const analysis = getAnalysis(analysisId);
    if (!analysis) {
      return NextResponse.json(
        { success: false, data: null, error: 'Analysis not found', retryable: false },
        { status: 404 }
      );
    }

    const documents = documentsStore.get(analysisId) || [];

    return NextResponse.json({
      success: true,
      data: {
        documents,
        count: documents.length,
      },
      error: null,
      retryable: false,
    });
  } catch (err) {
    console.error('[Estate Documents API] GET error:', err);
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: 'Failed to fetch documents',
        retryable: true,
      },
      { status: 500 }
    );
  }
}

// ── Document Classification ──────────────────────────────────────────────────

async function classifyDocument(fileName: string, extractedText: string): Promise<ClassificationResult> {
  const systemPrompt = `You are a trust and estate document classification specialist.
Analyze the provided document text and classify it precisely.

Return ONLY valid JSON with this exact structure:
{
  "document_type": "REVOCABLE_LIVING_TRUST" | "IRREVOCABLE_TRUST" | "LAST_WILL_AND_TESTAMENT" | etc.,
  "document_subtype": "RLT_JOINT" | "IRREV_LIFE_INSURANCE" | etc. or null,
  "metadata": {
    "grantors": ["John Doe"],
    "trustees": ["Jane Doe"],
    "beneficiaries": ["Child 1", "Child 2"],
    "execution_date": "2020-01-15",
    "governing_law": "CA",
    "attorney": "Smith & Associates",
    "trust_name": "Doe Family Trust"
  },
  "confidence": 0.95,
  "cross_references": ["Pour-Over Will", "Life Insurance Policy"],
  "red_flags": ["Missing successor trustee", "Outdated tax provisions"],
  "page_count": 25,
  "key_provisions_summary": "Brief summary of key provisions..."
}`;

  const userPrompt = `Classify this estate planning document:

FILENAME: ${fileName}

DOCUMENT TEXT (first 4000 chars):
${extractedText.substring(0, 4000)}

Provide classification result as JSON.`;

  const aiResponse = await callAI({
    systemPrompt,
    userPrompt,
    temperature: 0.1,
    maxTokens: 2048,
    jsonMode: true,
  });

  return extractJSON<ClassificationResult>(aiResponse.text);
}
